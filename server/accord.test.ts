import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { createHmac } from 'crypto'
import { PGlite } from '@electric-sql/pglite'
import { PGLiteSocketServer } from '@electric-sql/pglite-socket'
import postgres, { type Sql } from 'postgres'
import type { AddressInfo } from 'net'
import { schema } from './schema'
import { CLOCK_SKEW_MS, admitToken, handleAccordDelivery } from './accord'

// Accord's person events on a real Postgres (PGlite, in process). A removal or a
// deactivation refuses every token Accord issued before it and keeps what the
// person wrote. membership.added, or a token issued more than a minute after
// the disable, lets them back in.

const SECRET = 'test-webhook-secret'

let db: PGlite
let server: PGLiteSocketServer
let sql: Sql

/** Signed exactly the way Accord signs (accord/src/entitlement/lib/webhook.ts). */
function deliver(
  event: string,
  data: Record<string, unknown>,
  options: { secret?: string; timestamp?: string; now?: number } = {},
) {
  const raw = JSON.stringify({ event, timestamp: options.timestamp ?? new Date().toISOString(), data })
  const signature = createHmac('sha256', options.secret ?? SECRET)
    .update(raw)
    .digest('hex')
  return handleAccordDelivery(sql, SECRET, raw, `sha256=${signature}`, options.now)
}

const nowSeconds = () => Math.floor(Date.now() / 1000)

async function row(sub = 'sub-alice') {
  const [r] = await sql<{ disabled_at: Date | null; tokens_before: Date }[]>`
    SELECT disabled_at, tokens_before FROM accord_disabled WHERE sub = ${sub}
  `
  return r
}

beforeAll(async () => {
  db = await PGlite.create()
  server = new PGLiteSocketServer({ db, port: 0, host: '127.0.0.1' })
  await server.start()
  const { port } = (server as unknown as { server: { address(): AddressInfo } }).server.address()
  sql = postgres({ host: '127.0.0.1', port, max: 1, onnotice: () => {} })
  // Applied twice, the way a restart would.
  await sql.unsafe(schema)
  await sql.unsafe(schema)
})

afterAll(async () => {
  await sql.end()
  await server.stop()
  await db.close()
})

beforeEach(async () => {
  await sql`DELETE FROM accord_disabled`
})

describe.each(['user.deactivated', 'membership.removed'])('%s', (event) => {
  it('refuses every token issued before it, and leaves others alone', async () => {
    const issuedBefore = nowSeconds() - 5
    expect(await admitToken(sql, 'sub-alice', issuedBefore)).toBe(true)

    expect(await deliver(event, { user_id: 'sub-alice', app_id: 'uuid' })).toEqual({
      status: 200,
      body: { ok: true, handled: true },
    })
    expect(await admitToken(sql, 'sub-alice', issuedBefore)).toBe(false)
    expect(await admitToken(sql, 'sub-bob', issuedBefore)).toBe(true)
  })

  it('is undone by membership.added, and an old token stays refused', async () => {
    const issuedBefore = nowSeconds() - 5
    await deliver(event, { user_id: 'sub-alice' })
    expect(await deliver('membership.added', { user_id: 'sub-alice', role: 'member' })).toEqual({
      status: 200,
      body: { ok: true, handled: true },
    })
    expect((await row())!.disabled_at).toBeNull()
    expect(await admitToken(sql, 'sub-alice', issuedBefore)).toBe(false)
  })

  it('never moves the cut-off back when it arrives twice', async () => {
    const now = Date.now()
    await deliver(event, { user_id: 'sub-alice' }, { now })
    await deliver(event, { user_id: 'sub-alice' }, { now: now - 1000, timestamp: new Date(now - 1000).toISOString() })
    expect((await row())!.tokens_before.getTime()).toBe(now)
  })
})

describe('a token after Accord disabled the account', () => {
  it('needs to be issued more than a minute after the disable, and then re-enables it', async () => {
    const at = nowSeconds() * 1000
    await deliver('user.deactivated', { user_id: 'sub-alice' }, { now: at, timestamp: new Date(at).toISOString() })
    expect(CLOCK_SKEW_MS).toBe(60_000)
    // Exactly at the margin: refused, and still disabled.
    expect(await admitToken(sql, 'sub-alice', at / 1000 + 60)).toBe(false)
    expect((await row())!.disabled_at).not.toBeNull()
    // One second past it: admitted, and re-enabled.
    expect(await admitToken(sql, 'sub-alice', at / 1000 + 61)).toBe(true)
    expect((await row())!.disabled_at).toBeNull()
  })

  it('refuses a token issued before the disable, and one with no iat', async () => {
    await deliver('user.deactivated', { user_id: 'sub-alice' })
    expect(await admitToken(sql, 'sub-alice', nowSeconds() - 3600)).toBe(false)
    expect(await admitToken(sql, 'sub-alice', undefined)).toBe(false)
  })

  it('dates the disable by the signed send time when it is ahead of this clock', async () => {
    const now = Date.now()
    await deliver(
      'user.deactivated',
      { user_id: 'sub-alice' },
      { now, timestamp: new Date(now + 60_000).toISOString() },
    )
    expect((await row())!.tokens_before.getTime()).toBe(now + 60_000)
  })
})

describe('the delivery itself', () => {
  it('refuses another secret and changes nothing', async () => {
    const result = await deliver('user.deactivated', { user_id: 'sub-alice' }, { secret: 'wrong' })
    expect(result.status).toBe(401)
    expect(await row()).toBeUndefined()
  })

  it('refuses a stale delivery', async () => {
    const old = new Date(Date.now() - 3600_000).toISOString()
    const result = await deliver('user.deactivated', { user_id: 'sub-alice' }, { timestamp: old })
    expect(result.status).toBe(401)
    expect(await row()).toBeUndefined()
  })

  it('answers 200 to an event it does not act on', async () => {
    expect(await deliver('user.updated', { user_id: 'sub-alice' })).toEqual({
      status: 200,
      body: { ok: true, handled: false },
    })
  })
})
