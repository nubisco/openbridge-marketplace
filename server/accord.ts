import type { Sql } from 'postgres'

// What Accord saying a person may no longer use the marketplace does here.
//
// The marketplace keeps no session of its own: every write carries the Accord
// token itself, which lives up to an hour. So disabling someone means refusing
// every token Accord issued them before the disable, and their reviews, replies,
// questions and answers stay exactly as they are.
//
// Accord signs each webhook delivery's raw body with the marketplace's webhook
// secret and sends `X-Nubisco-Signature: sha256=<hex>`
// (accord/src/entitlement/lib/webhook.ts).
//
// - `membership.removed` and `user.deactivated` disable the account: a row in
//   accord_disabled, dated by the later of Accord's signed send time and this
//   clock, refuses every token issued up to a minute after it.
// - `membership.added`, which Accord sends on a re-add and on a reactivation,
//   re-enables the account.
// - A token issued more than a minute after the disable also re-enables it,
//   because Accord only issues tokens to active members. That covers a lost
//   membership.added. An older token never does.
// The minute absorbs the skew between Accord's clock (iat) and this one.

/** A delivery older or newer than this is refused, so one cannot be replayed later. */
const MAX_SKEW_MS = 5 * 60 * 1000

/** How far Accord's clock and this one may disagree, when a token's iat is compared. */
export const CLOCK_SKEW_MS = 60_000

/**
 * Constant-time comparison. A fast `===` on a signature leaks how many leading
 * bytes were right, which is enough to forge one byte at a time.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

async function hmacSha256Hex(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body))
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, '0')).join('')
}

export async function signatureMatches(secret: string, rawBody: string, header: string | undefined): Promise<boolean> {
  if (!header?.startsWith('sha256=')) return false
  const given = header.slice('sha256='.length)
  if (!/^[0-9a-f]{64}$/i.test(given)) return false
  return timingSafeEqual(given.toLowerCase(), await hmacSha256Hex(secret, rawBody))
}

export type DeliveryResult =
  | { status: 200; body: { ok: true; handled: boolean } }
  | { status: 400 | 401; body: { error: string } }

/** Checks and acts on one delivery. `raw` is the exact body Accord signed. */
export async function handleAccordDelivery(
  sql: Sql,
  secret: string,
  raw: string,
  signature: string | undefined,
  now = Date.now(),
): Promise<DeliveryResult> {
  if (!(await signatureMatches(secret, raw, signature))) return { status: 401, body: { error: 'bad signature' } }

  let delivery: { event?: unknown; timestamp?: unknown; data?: { user_id?: unknown } }
  try {
    delivery = JSON.parse(raw)
  } catch {
    return { status: 400, body: { error: 'malformed delivery' } }
  }
  const sent = typeof delivery.timestamp === 'string' ? Date.parse(delivery.timestamp) : NaN
  if (!Number.isFinite(sent) || Math.abs(now - sent) > MAX_SKEW_MS) {
    return { status: 401, body: { error: 'stale delivery' } }
  }
  const sub = delivery.data?.user_id
  if (typeof sub !== 'string' || !sub) return { status: 200, body: { ok: true, handled: false } }

  switch (delivery.event) {
    case 'membership.removed':
    case 'user.deactivated':
      await disableAccount(sql, sub, Math.max(sent, now))
      return { status: 200, body: { ok: true, handled: true } }
    case 'membership.added':
      return { status: 200, body: { ok: true, handled: await enableAccount(sql, sub) } }
    default:
      // Answered 200 so a new event type is not treated as a failed delivery.
      return { status: 200, body: { ok: true, handled: false } }
  }
}

/**
 * Disables an Accord account here. Safe to run twice: a later disable moves the
 * cut-off forward, never back. Nothing the person wrote is touched.
 */
export async function disableAccount(sql: Sql, sub: string, at: number): Promise<void> {
  const when = new Date(at)
  await sql`
    INSERT INTO accord_disabled (sub, disabled_at, tokens_before)
    VALUES (${sub}, ${when}, ${when})
    ON CONFLICT (sub) DO UPDATE SET
      disabled_at = COALESCE(accord_disabled.disabled_at, EXCLUDED.disabled_at),
      tokens_before = GREATEST(accord_disabled.tokens_before, EXCLUDED.tokens_before)
  `
}

/**
 * Re-enables an account Accord disabled. Tokens issued before the disable stay
 * refused: the person's next sign-in gives them a new one.
 */
export async function enableAccount(sql: Sql, sub: string): Promise<boolean> {
  const rows = await sql`
    UPDATE accord_disabled SET disabled_at = NULL WHERE sub = ${sub} AND disabled_at IS NOT NULL RETURNING sub
  `
  return rows.length > 0
}

/**
 * Whether a verified Accord token may be used. Most people have no row and pass
 * on one indexed read. With a row, only a token issued more than the skew margin
 * after the cut-off is accepted, and it re-enables the account if it was still
 * disabled.
 */
export async function admitToken(sql: Sql, sub: string, iat: unknown): Promise<boolean> {
  const [row] = await sql<{ disabled_at: Date | null; tokens_before: Date }[]>`
    SELECT disabled_at, tokens_before FROM accord_disabled WHERE sub = ${sub}
  `
  if (!row) return true
  if (typeof iat !== 'number' || !Number.isFinite(iat)) return false
  if (iat * 1000 <= row.tokens_before.getTime() + CLOCK_SKEW_MS) return false
  if (row.disabled_at) await enableAccount(sql, sub)
  return true
}
