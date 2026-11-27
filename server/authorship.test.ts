import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { PGLiteSocketServer } from '@electric-sql/pglite-socket'
import postgres, { type Sql } from 'postgres'
import type { AddressInfo } from 'net'
import { schema } from './schema'
import { hashValue } from './auth'
import { claimLegacyAuthorship, upsertReview, type Author } from './authorship'

// A real Postgres (PGlite, in process) so the partial unique indexes and the
// ON CONFLICT target are exercised exactly as production runs them.

let db: PGlite
let server: PGLiteSocketServer
let sql: Sql

const PLUGIN = 'openbridge-test-platform'

function person(sub: string, email: string, display = 'someone'): Author {
  return { sub, emailHash: hashValue(email), display }
}

async function reviewsOf(plugin = PLUGIN) {
  return sql<{ id: string; author_sub: string | null; author_email_hash: string; vote: number; body: string | null }[]>`
    SELECT id, author_sub, author_email_hash, vote, body FROM reviews WHERE plugin_name = ${plugin} ORDER BY created_at
  `
}

async function insertLegacyReview(email: string, vote: 1 | -1, body: string, plugin = PLUGIN) {
  const [row] = await sql<{ id: string }[]>`
    INSERT INTO reviews (plugin_name, author_email_hash, author_display, vote, body)
    VALUES (${plugin}, ${hashValue(email)}, 'legacy', ${vote}, ${body})
    RETURNING id
  `
  return row!.id
}

beforeAll(async () => {
  db = await PGlite.create()
  server = new PGLiteSocketServer({ db, port: 0, host: '127.0.0.1' })
  await server.start()
  const { port } = (server as unknown as { server: { address(): AddressInfo } }).server.address()
  sql = postgres({ host: '127.0.0.1', port, max: 1, onnotice: () => {} })

  // Start from the shape production has today: reviews unique per email hash,
  // with no author_sub anywhere. Then apply the current schema, twice, the way
  // a restart would.
  await sql.unsafe(`
    CREATE TABLE plugins (
      name TEXT PRIMARY KEY, display_name TEXT NOT NULL, version TEXT NOT NULL, npm_url TEXT NOT NULL,
      weekly_downloads INTEGER NOT NULL DEFAULT 0, synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE reviews (
      id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      plugin_name       TEXT NOT NULL REFERENCES plugins(name) ON DELETE CASCADE,
      author_email_hash TEXT NOT NULL,
      author_display    TEXT NOT NULL CHECK (char_length(author_display) <= 64),
      vote              SMALLINT NOT NULL CHECK (vote IN (-1, 1)),
      body              TEXT CHECK (char_length(body) <= 2000),
      helpful_count     INTEGER NOT NULL DEFAULT 0,
      created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (plugin_name, author_email_hash)
    );
  `)
  await sql.unsafe(schema)
  await sql.unsafe(schema)
  await sql`INSERT INTO plugins (name, display_name, version, npm_url) VALUES (${PLUGIN}, 'Test', '1.0.0', 'https://npmjs.com')`
})

afterAll(async () => {
  await sql?.end()
  await server?.stop()
  await db?.close()
})

beforeEach(async () => {
  await sql`DELETE FROM question_answers`
  await sql`DELETE FROM questions`
  await sql`DELETE FROM review_replies`
  await sql`DELETE FROM reviews`
})

describe('schema upgrade', () => {
  it('drops the old one-review-per-email-hash constraint', async () => {
    const constraints = await sql`
      SELECT conname FROM pg_constraint WHERE conrelid = 'reviews'::regclass AND contype = 'u'
    `
    expect(constraints).toHaveLength(0)
  })

  it('still allows only one unclaimed review per email hash and plugin', async () => {
    await insertLegacyReview('ana@example.com', 1, 'first')
    await expect(insertLegacyReview('ana@example.com', -1, 'second')).rejects.toThrow(/uq_reviews_plugin_legacy_hash/)
  })
})

describe('review authorship', () => {
  it('a person who changed their email still edits the same review and cannot post a second', async () => {
    const legacyId = await insertLegacyReview('ana@old.example', 1, 'written before sub was stored')

    // First write after the deploy, still on the old address: the row is claimed and edited.
    const before = person('acct-ana', 'ana@old.example')
    const claimed = await upsertReview(sql, before, { pluginName: PLUGIN, vote: -1, body: 'edited' })
    expect(claimed.id).toBe(legacyId)

    // Same account, new address: the hash no longer matches, the sub does.
    const after = person('acct-ana', 'ana@new.example')
    const edited = await upsertReview(sql, after, { pluginName: PLUGIN, vote: 1, body: 'edited again' })
    expect(edited.id).toBe(legacyId)

    const rows = await reviewsOf()
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ id: legacyId, author_sub: 'acct-ana', vote: 1, body: 'edited again' })
  })

  it('a review posted after the deploy stays with its account across an email change', async () => {
    const first = await upsertReview(sql, person('acct-ben', 'ben@old.example'), {
      pluginName: PLUGIN,
      vote: 1,
      body: 'new',
    })
    const second = await upsertReview(sql, person('acct-ben', 'ben@new.example'), {
      pluginName: PLUGIN,
      vote: -1,
      body: 'changed my mind',
    })
    expect(second.id).toBe(first.id)
    expect(await reviewsOf()).toHaveLength(1)
  })

  it('the next holder of an old address cannot take over a review that already has a sub', async () => {
    const legacyId = await insertLegacyReview('shared@example.com', 1, 'by the first holder')
    await upsertReview(sql, person('acct-first', 'shared@example.com'), {
      pluginName: PLUGIN,
      vote: 1,
      body: 'by the first holder',
    })

    // The first holder moves to another address, and a different account now has this one.
    const newcomer = person('acct-second', 'shared@example.com')
    await claimLegacyAuthorship(sql, newcomer)
    const theirs = await upsertReview(sql, newcomer, { pluginName: PLUGIN, vote: -1, body: 'by the second holder' })

    expect(theirs.id).not.toBe(legacyId)
    const rows = await reviewsOf()
    expect(rows).toHaveLength(2)
    expect(rows.find((r) => r.id === legacyId)).toMatchObject({
      author_sub: 'acct-first',
      vote: 1,
      body: 'by the first holder',
    })
    expect(rows.find((r) => r.id === theirs.id)).toMatchObject({ author_sub: 'acct-second', vote: -1 })
  })

  it('a legacy review is not claimed onto an account that already reviewed the plugin', async () => {
    const mine = await upsertReview(sql, person('acct-cy', 'cy@new.example'), {
      pluginName: PLUGIN,
      vote: 1,
      body: null,
    })
    const legacyId = await insertLegacyReview('cy@new.example', -1, 'an older row under the same address')

    const again = await upsertReview(sql, person('acct-cy', 'cy@new.example'), {
      pluginName: PLUGIN,
      vote: -1,
      body: 'edit',
    })
    expect(again.id).toBe(mine.id)
    const legacy = (await reviewsOf()).find((r) => r.id === legacyId)
    expect(legacy?.author_sub).toBeNull()
  })
})

describe('claiming replies, questions and answers', () => {
  it('claims unclaimed rows by email hash and never overwrites an existing sub', async () => {
    const reviewId = await insertLegacyReview('someone@example.com', 1, 'host review')
    const hash = hashValue('dee@example.com')
    await sql`INSERT INTO review_replies (review_id, author_email_hash, author_display, body) VALUES (${reviewId}, ${hash}, 'dee', 'legacy reply')`
    await sql`INSERT INTO review_replies (review_id, author_sub, author_email_hash, author_display, body) VALUES (${reviewId}, 'acct-earlier', ${hash}, 'dee', 'claimed reply')`
    const [q] = await sql<{ id: string }[]>`
      INSERT INTO questions (plugin_name, author_email_hash, author_display, body) VALUES (${PLUGIN}, ${hash}, 'dee', 'legacy question') RETURNING id
    `
    await sql`INSERT INTO question_answers (question_id, author_email_hash, author_display, body) VALUES (${q!.id}, ${hash}, 'dee', 'legacy answer')`

    await claimLegacyAuthorship(sql, person('acct-dee', 'dee@example.com'))

    const replies = await sql<
      { body: string; author_sub: string }[]
    >`SELECT body, author_sub FROM review_replies ORDER BY body`
    expect(replies).toEqual([
      { body: 'claimed reply', author_sub: 'acct-earlier' },
      { body: 'legacy reply', author_sub: 'acct-dee' },
    ])
    const [question] = await sql`SELECT author_sub FROM questions`
    const [answer] = await sql`SELECT author_sub FROM question_answers`
    expect(question!.author_sub).toBe('acct-dee')
    expect(answer!.author_sub).toBe('acct-dee')
  })
})
