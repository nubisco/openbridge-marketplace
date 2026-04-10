import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { serveStatic } from 'hono/bun'
import { sql, initDb } from './db'
import { crawl } from './crawler'
import {
  generateOtp,
  hashValue,
  signToken,
  verifyToken,
  verifyPlatformToken,
  sendOtpEmail,
  rateLimit,
  OTP_TTL_MS,
} from './auth'
import type {
  PluginListResponse,
  PluginDetailResponse,
  Review,
  ReviewReply,
  Question,
  QuestionAnswer,
} from '../shared/types'

const app = new Hono()
const PORT = Number(process.env.PORT ?? 3000)
const ADMIN_SECRET = process.env.ADMIN_SECRET

app.use('*', logger())
app.use('/api/*', cors())

// Always return JSON for unhandled errors so the client can parse them
app.onError((err, c) => {
  console.error('[server error]', err)
  return c.json({ error: 'internal_error', message: 'An unexpected error occurred.' }, 500)
})

// ── Auth middleware helper ─────────────────────────────────────────────────────

async function requireAuth(c: { req: { header: (k: string) => string | undefined } }) {
  const auth = c.req.header('Authorization') ?? ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  if (!token) return null
  // Try platform RS256 JWT first (when PLATFORM_ISSUER is configured)
  const platformPayload = await verifyPlatformToken(token)
  if (platformPayload) return platformPayload
  // Fall back to local HS256 session token
  try {
    return await verifyToken(token)
  } catch {
    return null
  }
}

// ── Validation helpers ────────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const DIGIT6_RE = /^\d{6}$/

function isValidEmail(v: unknown): v is string {
  return typeof v === 'string' && v.length <= 254 && EMAIL_RE.test(v)
}
function isValidOtpCode(v: unknown): v is string {
  return typeof v === 'string' && DIGIT6_RE.test(v)
}
function isValidVote(v: unknown): v is 1 | -1 {
  return v === 1 || v === -1
}
function str(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t.length > 0 && t.length <= max ? t : null
}

// ── Plugin list ────────────────────────────────────────────────────────────────

app.get('/api/plugins', async (c) => {
  const ip = c.req.header('x-forwarded-for') ?? 'unknown'
  if (!rateLimit(`list:${ip}`, 60, 60_000)) {
    return c.json({ error: 'rate_limited' }, 429)
  }

  const q = c.req.query('q') ?? ''
  const sort = c.req.query('sort') ?? 'downloads'
  const page = Math.max(1, Number(c.req.query('page') ?? 1))
  const limit = Math.min(100, Math.max(1, Number(c.req.query('limit') ?? 24)))
  const offset = (page - 1) * limit

  const orderBy =
    sort === 'updated'
      ? sql`last_published_at DESC NULLS LAST`
      : sort === 'votes'
        ? sql`(thumb_up - thumb_down) DESC`
        : sql`weekly_downloads DESC`

  const search = q ? sql`AND (p.name ILIKE ${'%' + q + '%'} OR p.description ILIKE ${'%' + q + '%'})` : sql``

  const [plugins, [{ count }]] = await Promise.all([
    sql<
      {
        name: string
        display_name: string
        description: string | null
        version: string
        author: string | null
        homepage: string | null
        repository_url: string | null
        npm_url: string
        weekly_downloads: number
        github_stars: number | null
        github_sponsors_url: string | null
        verified: boolean
        deprecated: boolean
        last_published_at: string
        thumb_up: number
        thumb_down: number
      }[]
    >`
      SELECT
        p.name, p.display_name, p.description, p.version, p.author,
        p.homepage, p.repository_url, p.npm_url,
        p.weekly_downloads, p.github_stars, p.github_sponsors_url,
        p.verified, p.deprecated, p.last_published_at,
        COUNT(CASE WHEN r.vote = 1 THEN 1 END)::int AS thumb_up,
        COUNT(CASE WHEN r.vote = -1 THEN 1 END)::int AS thumb_down
      FROM plugins p
      LEFT JOIN reviews r ON r.plugin_name = p.name
      WHERE NOT p.deprecated ${search}
      GROUP BY p.name
      ORDER BY ${orderBy}
      LIMIT ${limit} OFFSET ${offset}
    `,
    sql<{ count: number }[]>`
      SELECT COUNT(*)::int AS count FROM plugins p WHERE NOT p.deprecated ${search}
    `,
  ])

  return c.json({ plugins, total: count, page, limit } satisfies PluginListResponse)
})

// ── Plugin detail ──────────────────────────────────────────────────────────────

app.get('/api/plugins/:name{.+}', async (c) => {
  const ip = c.req.header('x-forwarded-for') ?? 'unknown'
  if (!rateLimit(`detail:${ip}`, 60, 60_000)) {
    return c.json({ error: 'rate_limited' }, 429)
  }

  const name = c.req.param('name')

  const [[plugin], rawReviews, questions] = await Promise.all([
    sql`
      SELECT p.*,
        COUNT(CASE WHEN r.vote = 1 THEN 1 END)::int AS thumb_up,
        COUNT(CASE WHEN r.vote = -1 THEN 1 END)::int AS thumb_down
      FROM plugins p
      LEFT JOIN reviews r ON r.plugin_name = p.name
      WHERE p.name = ${name}
      GROUP BY p.name
    `,
    sql<(Review & { replies?: ReviewReply[] })[]>`
      SELECT id, plugin_name, author_display, vote, body, helpful_count, created_at, updated_at
      FROM reviews
      WHERE plugin_name = ${name}
      ORDER BY helpful_count DESC, created_at DESC
      LIMIT 50
    `,
    sql<(Question & { answers?: QuestionAnswer[] })[]>`
      SELECT id, plugin_name, author_display, body, created_at
      FROM questions
      WHERE plugin_name = ${name}
      ORDER BY created_at DESC
      LIMIT 100
    `,
  ])

  if (!plugin) return c.json({ error: 'Not found' }, 404)

  // Fetch replies and answers in parallel
  const reviewIds = rawReviews.map((r) => r.id)
  const questionIds = questions.map((q) => q.id)

  const [replies, answers] = await Promise.all([
    reviewIds.length
      ? sql<ReviewReply[]>`
          SELECT id, review_id, author_display, body, created_at
          FROM review_replies
          WHERE review_id = ANY(${sql.array(reviewIds)})
          ORDER BY created_at ASC
        `
      : ([] as ReviewReply[]),
    questionIds.length
      ? sql<QuestionAnswer[]>`
          SELECT id, question_id, author_display, body, is_accepted, created_at
          FROM question_answers
          WHERE question_id = ANY(${sql.array(questionIds)})
          ORDER BY is_accepted DESC, created_at ASC
        `
      : ([] as QuestionAnswer[]),
  ])

  const reviews: Review[] = rawReviews.map((r) => ({
    ...r,
    replies: replies.filter((rp) => rp.review_id === r.id),
  }))

  const questionsWithAnswers: Question[] = questions.map((q) => ({
    ...q,
    answers: answers.filter((a) => a.question_id === q.id),
  }))

  return c.json({ plugin, reviews, questions: questionsWithAnswers } satisfies PluginDetailResponse)
})

// ── Auth: OTP request ─────────────────────────────────────────────────────────

app.post('/api/auth/otp/request', async (c) => {
  const ip = c.req.header('x-forwarded-for') ?? 'unknown'

  // Rate limit: 5 per minute per IP, 10 per hour per IP
  if (!rateLimit(`otp-req:ip:${ip}`, 5, 60_000) || !rateLimit(`otp-req:ip-hour:${ip}`, 10, 3_600_000)) {
    return c.json({ error: 'rate_limited', message: 'Too many requests. Please wait before trying again.' }, 429)
  }

  const body = await c.req.json().catch(() => null)
  if (!isValidEmail(body?.email)) return c.json({ error: 'invalid_email' }, 400)

  const email = body.email as string
  const emailHash = hashValue(email)

  // Rate limit: 3 OTPs per hour per email hash
  if (!rateLimit(`otp-req:email:${emailHash}`, 3, 3_600_000)) {
    return c.json({ error: 'rate_limited', message: 'Too many codes sent to this address. Please wait.' }, 429)
  }

  try {
    const code = generateOtp()
    const hashedCode = hashValue(code)
    const expiresAt = new Date(Date.now() + OTP_TTL_MS)

    await sql`
      INSERT INTO otp_codes (email_hash, hashed_code, expires_at, attempts)
      VALUES (${emailHash}, ${hashedCode}, ${expiresAt}, 0)
      ON CONFLICT (email_hash) DO UPDATE
        SET hashed_code = EXCLUDED.hashed_code,
            expires_at  = EXCLUDED.expires_at,
            attempts    = 0
    `

    try {
      await sendOtpEmail(email, code)
    } catch (err) {
      console.error('[OTP] Email delivery failed:', err)
      // Return success anyway — prevents email enumeration
    }

    return c.json({ ok: true })
  } catch (err) {
    console.error('[OTP request] Unexpected error:', err)
    return c.json({ error: 'internal_error', message: 'Failed to send code. Please try again.' }, 500)
  }
})

// ── Auth: OTP verify ──────────────────────────────────────────────────────────

app.post('/api/auth/otp/verify', async (c) => {
  const ip = c.req.header('x-forwarded-for') ?? 'unknown'
  if (!rateLimit(`otp-verify:${ip}`, 10, 60_000)) {
    return c.json({ error: 'rate_limited' }, 429)
  }

  const body = await c.req.json().catch(() => null)
  if (!isValidEmail(body?.email)) return c.json({ error: 'invalid_input' }, 400)
  if (!isValidOtpCode(body?.code)) return c.json({ error: 'invalid_input' }, 400)
  const displayRaw = str(body?.display, 64)
  if (!displayRaw) return c.json({ error: 'display_name_required' }, 400)

  const email = body.email as string
  const code = body.code as string
  const display = displayRaw
  const emailHash = hashValue(email)
  const hashedCode = hashValue(code)

  const [row] = await sql<{ hashed_code: string; expires_at: string; attempts: number }[]>`
    SELECT hashed_code, expires_at, attempts FROM otp_codes WHERE email_hash = ${emailHash}
  `

  if (!row) return c.json({ error: 'invalid_code' }, 401)
  if (new Date(row.expires_at) < new Date()) {
    await sql`DELETE FROM otp_codes WHERE email_hash = ${emailHash}`
    return c.json({ error: 'code_expired' }, 401)
  }
  if (row.attempts >= 5) {
    return c.json({ error: 'too_many_attempts', message: 'Too many failed attempts. Request a new code.' }, 423)
  }

  if (row.hashed_code !== hashedCode) {
    await sql`UPDATE otp_codes SET attempts = attempts + 1 WHERE email_hash = ${emailHash}`
    return c.json({ error: 'invalid_code' }, 401)
  }

  // Valid — clean up and issue token
  await sql`DELETE FROM otp_codes WHERE email_hash = ${emailHash}`
  const token = await signToken({ sub: emailHash, display: display.trim().slice(0, 64) })

  return c.json({ token, display: display.trim().slice(0, 64) })
})

// ── Reviews ────────────────────────────────────────────────────────────────────

app.post('/api/plugins/:name{.+}/reviews', async (c) => {
  const ip = c.req.header('x-forwarded-for') ?? 'unknown'
  if (!rateLimit(`review:${ip}`, 10, 60_000)) return c.json({ error: 'rate_limited' }, 429)

  const user = await requireAuth(c)
  if (!user) return c.json({ error: 'unauthorized' }, 401)

  const name = c.req.param('name')
  const body = await c.req.json().catch(() => null)
  if (!isValidVote(body?.vote)) return c.json({ error: 'invalid_vote' }, 400)
  const reviewBody = typeof body?.body === 'string' ? body.body.trim().slice(0, 2000) || null : null

  const vote = body.vote as 1 | -1

  const [review] = await sql<Review[]>`
    INSERT INTO reviews (plugin_name, author_email_hash, author_display, vote, body)
    VALUES (${name}, ${user.sub}, ${user.display}, ${vote}, ${reviewBody ?? null})
    ON CONFLICT (plugin_name, author_email_hash) DO UPDATE
      SET vote       = EXCLUDED.vote,
          body       = EXCLUDED.body,
          updated_at = NOW()
    RETURNING id, plugin_name, author_display, vote, body, helpful_count, created_at, updated_at
  `

  return c.json({ ...review, replies: [] }, 201)
})

// POST /api/reviews/:id/replies — reply to a review (requires auth)
app.post('/api/reviews/:id/replies', async (c) => {
  const ip = c.req.header('x-forwarded-for') ?? 'unknown'
  if (!rateLimit(`reply:${ip}`, 10, 60_000)) return c.json({ error: 'rate_limited' }, 429)

  const user = await requireAuth(c)
  if (!user) return c.json({ error: 'unauthorized' }, 401)

  const reviewId = c.req.param('id')
  const body = await c.req.json().catch(() => null)
  const replyBody = str(body?.body, 1000)
  if (!replyBody) return c.json({ error: 'invalid_input' }, 400)

  const [reply] = await sql<ReviewReply[]>`
    INSERT INTO review_replies (review_id, author_email_hash, author_display, body)
    VALUES (${reviewId}, ${user.sub}, ${user.display}, ${replyBody})
    RETURNING id, review_id, author_display, body, created_at
  `
  return c.json(reply, 201)
})

// POST /api/reviews/:id/helpful — mark helpful (rate-limited, no auth required)
app.post('/api/reviews/:id/helpful', async (c) => {
  const ip = c.req.header('x-forwarded-for') ?? 'unknown'
  if (!rateLimit(`helpful:${ip}`, 5, 60_000)) return c.json({ error: 'rate_limited' }, 429)

  const { id } = c.req.param()
  await sql`UPDATE reviews SET helpful_count = helpful_count + 1 WHERE id = ${id}`
  return c.json({ ok: true })
})

// ── Q & A ─────────────────────────────────────────────────────────────────────

app.post('/api/plugins/:name{.+}/questions', async (c) => {
  const ip = c.req.header('x-forwarded-for') ?? 'unknown'
  if (!rateLimit(`question:${ip}`, 5, 60_000)) return c.json({ error: 'rate_limited' }, 429)

  const user = await requireAuth(c)
  if (!user) return c.json({ error: 'unauthorized' }, 401)

  const name = c.req.param('name')
  const body = await c.req.json().catch(() => null)
  const questionBody = str(body?.body, 1000)
  if (!questionBody) return c.json({ error: 'invalid_input' }, 400)

  const [q] = await sql<Question[]>`
    INSERT INTO questions (plugin_name, author_email_hash, author_display, body)
    VALUES (${name}, ${user.sub}, ${user.display}, ${questionBody})
    RETURNING id, plugin_name, author_display, body, created_at
  `
  return c.json({ ...q, answers: [] }, 201)
})

// POST /api/questions/:id/answers — answer a question (requires auth)
app.post('/api/questions/:id/answers', async (c) => {
  const ip = c.req.header('x-forwarded-for') ?? 'unknown'
  if (!rateLimit(`answer:${ip}`, 10, 60_000)) return c.json({ error: 'rate_limited' }, 429)

  const user = await requireAuth(c)
  if (!user) return c.json({ error: 'unauthorized' }, 401)

  const questionId = c.req.param('id')
  const body = await c.req.json().catch(() => null)
  const answerBody = str(body?.body, 2000)
  if (!answerBody) return c.json({ error: 'invalid_input' }, 400)

  const [answer] = await sql<QuestionAnswer[]>`
    INSERT INTO question_answers (question_id, author_email_hash, author_display, body)
    VALUES (${questionId}, ${user.sub}, ${user.display}, ${answerBody})
    RETURNING id, question_id, author_display, body, is_accepted, created_at
  `
  return c.json(answer, 201)
})

// ── Admin ──────────────────────────────────────────────────────────────────────

app.post('/api/admin/sync', async (c) => {
  if (c.req.header('X-Admin-Secret') !== ADMIN_SECRET) return c.json({ error: 'Forbidden' }, 403)
  crawl().catch(console.error)
  return c.json({ ok: true, message: 'Crawl started' })
})

// ── Stats (public) ─────────────────────────────────────────────────────────────

app.get('/api/stats', async (c) => {
  const ip = c.req.header('x-forwarded-for') ?? 'unknown'
  if (!rateLimit(`stats:${ip}`, 30, 60_000)) return c.json({ error: 'rate_limited' }, 429)

  const [stats] = await sql<{ plugin_count: number; review_count: number; last_sync: string | null }[]>`
    SELECT
      (SELECT COUNT(*)::int FROM plugins WHERE NOT deprecated) AS plugin_count,
      (SELECT COUNT(*)::int FROM reviews) AS review_count,
      (SELECT MAX(synced_at) FROM plugins)::text AS last_sync
  `
  return c.json(stats)
})

// ── Static / SPA ──────────────────────────────────────────────────────────────

app.use('*', serveStatic({ root: './dist' }))
app.get('*', serveStatic({ path: './dist/index.html' }))

// ── Boot ──────────────────────────────────────────────────────────────────────

await initDb()
console.log(`Marketplace server running on :${PORT}`)

const [{ count }] = await sql<{ count: number }[]>`SELECT COUNT(*)::int AS count FROM plugins`
if (count === 0) {
  console.log('DB empty — running initial crawl...')
  crawl().catch(console.error)
}
setInterval(() => crawl().catch(console.error), 6 * 60 * 60 * 1000)

export default { port: PORT, fetch: app.fetch }
