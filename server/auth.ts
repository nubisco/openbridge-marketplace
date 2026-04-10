import { SignJWT, jwtVerify } from 'jose'
import { createHash, randomInt } from 'crypto'

// ── Constants ──────────────────────────────────────────────────────────────────

const JWT_SECRET_RAW = process.env.JWT_SECRET
if (!JWT_SECRET_RAW) throw new Error('JWT_SECRET is required')

const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_RAW)
const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM_EMAIL = process.env.FROM_EMAIL ?? 'Openbridge Marketplace <noreply@marketplace.openbridge.nubisco.io>'

export const OTP_TTL_MS = 10 * 60 * 1000 // 10 minutes
export const TOKEN_TTL = '24h'
const MAX_OTP_LENGTH = 6

// ── OTP helpers ────────────────────────────────────────────────────────────────

export function generateOtp(): string {
  return String(randomInt(0, 1_000_000)).padStart(MAX_OTP_LENGTH, '0')
}

export function hashValue(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

// ── JWT helpers ────────────────────────────────────────────────────────────────

export interface AuthPayload {
  sub: string // email hash — never plain email
  display: string
}

export async function signToken(payload: AuthPayload): Promise<string> {
  return new SignJWT({ display: payload.display })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(TOKEN_TTL)
    .sign(JWT_SECRET)
}

export async function verifyToken(token: string): Promise<AuthPayload> {
  const { payload } = await jwtVerify(token, JWT_SECRET)
  if (typeof payload.sub !== 'string' || typeof payload.display !== 'string') {
    throw new Error('invalid token payload')
  }
  return { sub: payload.sub, display: payload.display as string }
}

// ── Email delivery ─────────────────────────────────────────────────────────────

export async function sendOtpEmail(to: string, code: string): Promise<void> {
  if (!RESEND_API_KEY) {
    // Development fallback: log to console
    console.log(`[OTP] ${to} → ${code}`)
    return
  }
  const body = {
    from: FROM_EMAIL,
    to: [to],
    subject: 'Your Openbridge Marketplace sign-in code',
    html: `
      <p>Your sign-in code for Openbridge Marketplace is:</p>
      <h2 style="letter-spacing:0.15em;font-family:monospace">${code}</h2>
      <p>This code expires in 10 minutes. If you did not request this, you can safely ignore this email.</p>
    `,
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Resend delivery failed: ${err}`)
  }
}

// ── In-memory rate limiter ─────────────────────────────────────────────────────
// Suitable for single-instance NAS deployment. Replace with Redis/KV for multi-instance.

const buckets = new Map<string, number[]>()

/** Returns true if the request is allowed, false if limit exceeded. */
export function rateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now()
  const timestamps = (buckets.get(key) ?? []).filter((t) => now - t < windowMs)
  if (timestamps.length >= maxRequests) return false
  timestamps.push(now)
  buckets.set(key, timestamps)
  return true
}

// Clean up stale buckets every 5 minutes to prevent memory growth
setInterval(
  () => {
    const now = Date.now()
    for (const [key, timestamps] of buckets) {
      const fresh = timestamps.filter((t) => now - t < 60 * 60 * 1000)
      if (fresh.length === 0) buckets.delete(key)
      else buckets.set(key, fresh)
    }
  },
  5 * 60 * 1000,
)

// ── Platform JWT verification (inline — no external deps) ────────────────────

function _b64urlDecode(s: string): ArrayBuffer {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/')
  const pad = (4 - (b64.length % 4)) % 4
  return Uint8Array.from(atob(b64 + '='.repeat(pad)), (c) => c.charCodeAt(0)).buffer as ArrayBuffer
}

let _jwksCache: { keys: Array<JsonWebKey & { kid: string }> } | null = null
let _jwksCacheAt = 0
const _JWKS_TTL_MS = 5 * 60 * 1000

async function _fetchJwks(issuer: string): Promise<{ keys: Array<JsonWebKey & { kid: string }> } | null> {
  const now = Date.now()
  if (_jwksCache && now - _jwksCacheAt < _JWKS_TTL_MS) return _jwksCache
  try {
    const res = await fetch(`${issuer}/.well-known/jwks.json`)
    if (!res.ok) return null
    _jwksCache = (await res.json()) as { keys: Array<JsonWebKey & { kid: string }> }
    _jwksCacheAt = now
    return _jwksCache
  } catch {
    return null
  }
}

async function _verifyPlatformJwt(
  token: string,
  issuer: string,
): Promise<{ email: string; sub: string; exp: number; iss: string } | null> {
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [h, p, s] = parts as [string, string, string]
  const header = JSON.parse(new TextDecoder().decode(new Uint8Array(_b64urlDecode(h)))) as {
    alg: string
    kid?: string
  }
  if (header.alg !== 'RS256' || !header.kid) return null
  const jwks = await _fetchJwks(issuer)
  if (!jwks) return null
  const jwk = jwks.keys.find((k) => k.kid === header.kid)
  if (!jwk) return null
  let key: CryptoKey
  try {
    key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify'])
  } catch {
    return null
  }
  const valid = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    key,
    _b64urlDecode(s),
    new TextEncoder().encode(`${h}.${p}`),
  )
  if (!valid) return null
  const claims = JSON.parse(new TextDecoder().decode(new Uint8Array(_b64urlDecode(p)))) as {
    email: string
    sub: string
    exp: number
    iss: string
  }
  if (claims.exp < Math.floor(Date.now() / 1000) || claims.iss !== issuer) return null
  return claims
}

/**
 * Verify a Nubisco Platform JWT and return an AuthPayload compatible with the
 * existing local auth format.
 * - sub: SHA-256 hash of the user's email (never exposed)
 * - display: username portion of the email
 */
export async function verifyPlatformToken(token: string): Promise<AuthPayload | null> {
  const issuer = process.env.PLATFORM_ISSUER
  if (!issuer) return null
  const claims = await _verifyPlatformJwt(token, issuer)
  if (!claims) return null
  const email = claims.email.toLowerCase().trim()
  return {
    sub: hashValue(email),
    display: email.split('@')[0],
  }
}
