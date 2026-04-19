import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { serveStatic } from 'hono/bun'
import { sql, initDb } from './db'
import { crawl } from './crawler'
import { verifyPlatformToken, rateLimit } from './auth'
import type {
  PluginListResponse,
  PluginDetailResponse,
  RankingMetaResponse,
  Review,
  ReviewReply,
  Question,
  QuestionAnswer,
} from '../shared/types'

const app = new Hono()
const PORT = Number(process.env.PORT ?? 3000)
const ADMIN_SECRET = process.env.ADMIN_SECRET
const RANKING_WEIGHTS = {
  downloads: 0.45,
  reviews: 0.35,
  freshness: 0.2,
} as const

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
  return verifyPlatformToken(token)
}

// ── Validation helpers ────────────────────────────────────────────────────────
function isValidVote(v: unknown): v is 1 | -1 {
  return v === 1 || v === -1
}
function str(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t.length > 0 && t.length <= max ? t : null
}

app.get('/api/auth/platform/config', (c) => {
  const issuer = process.env.PLATFORM_ISSUER?.trim() ?? ''
  const appId = process.env.PLATFORM_APP_ID?.trim() || 'marketplace'

  return c.json({
    enabled: issuer.length > 0,
    issuer: issuer || null,
    appId,
  })
})

app.get('/api/meta/ranking', (c) => {
  return c.json({
    default_sort: 'best',
    supported_sorts: ['best', 'downloads', 'rating', 'updated'],
    signals: {
      review_score:
        'Wilson lower bound over thumb-up/thumb-down votes, so a few early votes do not outweigh a stronger long-term signal.',
      download_score:
        'Log-scaled weekly download volume to reflect adoption without letting the largest packages dominate completely.',
      freshness_score: 'Decay-based recency score from the latest published version date.',
      ranking_score:
        'Weighted combination of download, review, and freshness scores, with additional text-match boosts when a search query is present.',
    },
    weights: RANKING_WEIGHTS,
  } satisfies RankingMetaResponse)
})

// ── Plugin list ────────────────────────────────────────────────────────────────

app.get('/api/plugins', async (c) => {
  const ip = c.req.header('x-forwarded-for') ?? 'unknown'
  if (!rateLimit(`list:${ip}`, 60, 60_000)) {
    return c.json({ error: 'rate_limited' }, 429)
  }

  const q = c.req.query('q') ?? ''
  const sort = c.req.query('sort') ?? 'best'
  const page = Math.max(1, Number(c.req.query('page') ?? 1))
  const limit = Math.min(100, Math.max(1, Number(c.req.query('limit') ?? 24)))
  const offset = (page - 1) * limit
  const normalizedSort =
    sort === 'downloads' || sort === 'updated' || sort === 'rating' || sort === 'votes' ? sort : 'best'
  const query = q.trim()
  const queryContains = `%${query}%`
  const queryPrefix = `${query}%`

  const orderBy =
    normalizedSort === 'updated'
      ? sql`last_published_at DESC NULLS LAST, ranking_score DESC, weekly_downloads DESC`
      : normalizedSort === 'rating' || normalizedSort === 'votes'
        ? sql`review_score DESC, thumb_up DESC, weekly_downloads DESC, last_published_at DESC NULLS LAST`
        : normalizedSort === 'downloads'
          ? sql`weekly_downloads DESC, review_score DESC, last_published_at DESC NULLS LAST`
          : query
            ? sql`text_score DESC, ranking_score DESC, weekly_downloads DESC, last_published_at DESC NULLS LAST`
            : sql`ranking_score DESC, weekly_downloads DESC, last_published_at DESC NULLS LAST`

  const search = query ? sql`AND (p.name ILIKE ${queryContains} OR p.description ILIKE ${queryContains})` : sql``

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
        review_score: number
        download_score: number
        freshness_score: number
        ranking_score: number
      }[]
    >`
      WITH plugin_metrics AS (
        SELECT
          p.name, p.display_name, p.description, p.version, p.author,
          p.homepage, p.repository_url, p.npm_url,
          p.weekly_downloads, p.github_stars, p.github_sponsors_url,
          p.verified, p.deprecated, p.last_published_at,
          COUNT(CASE WHEN r.vote = 1 THEN 1 END)::int AS thumb_up,
          COUNT(CASE WHEN r.vote = -1 THEN 1 END)::int AS thumb_down,
          COUNT(r.id)::int AS review_count,
          CASE
            WHEN COUNT(r.id) = 0 THEN 0::float8
            ELSE (
              (
                ((COUNT(CASE WHEN r.vote = 1 THEN 1 END)::float8 / COUNT(r.id)::float8) + (1.96 * 1.96) / (2 * COUNT(r.id)::float8))
                - 1.96 * sqrt(
                  (
                    (
                      (COUNT(CASE WHEN r.vote = 1 THEN 1 END)::float8 / COUNT(r.id)::float8)
                      * (1 - (COUNT(CASE WHEN r.vote = 1 THEN 1 END)::float8 / COUNT(r.id)::float8))
                    )
                    + (1.96 * 1.96) / (4 * COUNT(r.id)::float8)
                  ) / COUNT(r.id)::float8
                )
              ) / (1 + (1.96 * 1.96) / COUNT(r.id)::float8)
            )
          END AS review_score,
          LEAST(1.0, LN((GREATEST(p.weekly_downloads, 0) + 1)::numeric) / LN(100001::numeric))::float8 AS download_score,
          CASE
            WHEN p.last_published_at IS NULL THEN 0::float8
            ELSE EXP(-GREATEST(0, EXTRACT(EPOCH FROM (NOW() - p.last_published_at)) / 86400) / 180.0)::float8
          END AS freshness_score,
          CASE
            WHEN ${query} = '' THEN 0::float8
            WHEN LOWER(p.name) = LOWER(${query}) THEN 3.0
            WHEN LOWER(p.name) LIKE LOWER(${queryPrefix}) THEN 1.75
            WHEN LOWER(p.name) LIKE LOWER(${queryContains}) THEN 1.1
            WHEN LOWER(COALESCE(p.description, '')) LIKE LOWER(${queryContains}) THEN 0.4
            ELSE 0::float8
          END AS text_score
        FROM plugins p
        LEFT JOIN reviews r ON r.plugin_name = p.name
        WHERE NOT p.deprecated ${search}
        GROUP BY p.name
      ),
      ranked AS (
        SELECT
          *,
          (
            (${RANKING_WEIGHTS.downloads} * download_score) +
            (${RANKING_WEIGHTS.reviews} * review_score) +
            (${RANKING_WEIGHTS.freshness} * freshness_score) +
            text_score
          )::float8 AS ranking_score
        FROM plugin_metrics
      )
      SELECT
        name, display_name, description, version, author,
        homepage, repository_url, npm_url,
        weekly_downloads, github_stars, github_sponsors_url,
        verified, deprecated, last_published_at,
        thumb_up, thumb_down, review_score, download_score, freshness_score, ranking_score
      FROM ranked
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
        COUNT(CASE WHEN r.vote = -1 THEN 1 END)::int AS thumb_down,
        CASE
          WHEN COUNT(r.id) = 0 THEN 0::float8
          ELSE (
            (
              ((COUNT(CASE WHEN r.vote = 1 THEN 1 END)::float8 / COUNT(r.id)::float8) + (1.96 * 1.96) / (2 * COUNT(r.id)::float8))
              - 1.96 * sqrt(
                (
                  (
                    (COUNT(CASE WHEN r.vote = 1 THEN 1 END)::float8 / COUNT(r.id)::float8)
                    * (1 - (COUNT(CASE WHEN r.vote = 1 THEN 1 END)::float8 / COUNT(r.id)::float8))
                  )
                  + (1.96 * 1.96) / (4 * COUNT(r.id)::float8)
                ) / COUNT(r.id)::float8
              )
            ) / (1 + (1.96 * 1.96) / COUNT(r.id)::float8)
          )
        END AS review_score,
        LEAST(1.0, LN((GREATEST(p.weekly_downloads, 0) + 1)::numeric) / LN(100001::numeric))::float8 AS download_score,
        CASE
          WHEN p.last_published_at IS NULL THEN 0::float8
          ELSE EXP(-GREATEST(0, EXTRACT(EPOCH FROM (NOW() - p.last_published_at)) / 86400) / 180.0)::float8
        END AS freshness_score,
        (
          (${RANKING_WEIGHTS.downloads} * LEAST(1.0, LN((GREATEST(p.weekly_downloads, 0) + 1)::numeric) / LN(100001::numeric))::float8) +
          (${RANKING_WEIGHTS.reviews} * CASE
            WHEN COUNT(r.id) = 0 THEN 0::float8
            ELSE (
              (
                ((COUNT(CASE WHEN r.vote = 1 THEN 1 END)::float8 / COUNT(r.id)::float8) + (1.96 * 1.96) / (2 * COUNT(r.id)::float8))
                - 1.96 * sqrt(
                  (
                    (
                      (COUNT(CASE WHEN r.vote = 1 THEN 1 END)::float8 / COUNT(r.id)::float8)
                      * (1 - (COUNT(CASE WHEN r.vote = 1 THEN 1 END)::float8 / COUNT(r.id)::float8))
                    )
                    + (1.96 * 1.96) / (4 * COUNT(r.id)::float8)
                  ) / COUNT(r.id)::float8
                )
              ) / (1 + (1.96 * 1.96) / COUNT(r.id)::float8)
            )
          END) +
          (${RANKING_WEIGHTS.freshness} * CASE
            WHEN p.last_published_at IS NULL THEN 0::float8
            ELSE EXP(-GREATEST(0, EXTRACT(EPOCH FROM (NOW() - p.last_published_at)) / 86400) / 180.0)::float8
          END)
        )::float8 AS ranking_score
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
