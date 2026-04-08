import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { serveStatic } from 'hono/bun'
import { sql, initDb } from './db'
import { crawl } from './crawler'
import type { PluginListResponse, PluginDetailResponse } from '../shared/types'

const app = new Hono()
const PORT = Number(process.env.PORT ?? 3000)
const ADMIN_SECRET = process.env.ADMIN_SECRET

app.use('*', logger())
app.use('/api/*', cors())

// ── Plugin list ────────────────────────────────────────────────────────────────
// Used by running openbridge instances: GET /api/plugins
// Supports: q (search), sort (downloads|rating|updated), page, limit

app.get('/api/plugins', async (c) => {
  const q = c.req.query('q') ?? ''
  const sort = c.req.query('sort') ?? 'downloads'
  const page = Math.max(1, Number(c.req.query('page') ?? 1))
  const limit = Math.min(100, Math.max(1, Number(c.req.query('limit') ?? 24)))
  const offset = (page - 1) * limit

  const orderBy =
    sort === 'rating' ? sql`rating_avg DESC NULLS LAST`
    : sort === 'updated' ? sql`last_published_at DESC NULLS LAST`
    : sql`weekly_downloads DESC`

  const search = q ? sql`AND (name ILIKE ${'%' + q + '%'} OR description ILIKE ${'%' + q + '%'})` : sql``

  const [plugins, [{ count }]] = await Promise.all([
    sql<{ name: string; display_name: string; description: string | null; version: string; author: string | null; weekly_downloads: number; verified: boolean; deprecated: boolean; last_published_at: string; rating_avg: number | null; rating_count: number }[]>`
      SELECT
        p.name, p.display_name, p.description, p.version, p.author,
        p.weekly_downloads, p.verified, p.deprecated, p.last_published_at,
        ROUND(AVG(r.rating)::numeric, 1) AS rating_avg,
        COUNT(r.id)::int AS rating_count
      FROM plugins p
      LEFT JOIN reviews r ON r.plugin_name = p.name
      WHERE NOT p.deprecated ${search}
      GROUP BY p.name
      ORDER BY ${orderBy}
      LIMIT ${limit} OFFSET ${offset}
    `,
    sql<{ count: number }[]>`
      SELECT COUNT(*)::int AS count FROM plugins WHERE NOT deprecated ${search}
    `,
  ])

  return c.json({ plugins, total: count, page, limit } satisfies PluginListResponse)
})

// ── Plugin detail ──────────────────────────────────────────────────────────────

app.get('/api/plugins/:name{.+}', async (c) => {
  const name = c.req.param('name')

  const [[plugin], reviews] = await Promise.all([
    sql`
      SELECT p.*,
        ROUND(AVG(r.rating)::numeric, 1) AS rating_avg,
        COUNT(r.id)::int AS rating_count
      FROM plugins p
      LEFT JOIN reviews r ON r.plugin_name = p.name
      WHERE p.name = ${name}
      GROUP BY p.name
    `,
    sql`
      SELECT id, plugin_name, author_display, rating, title, body,
             openbridge_version, helpful_count, created_at, updated_at
      FROM reviews
      WHERE plugin_name = ${name}
      ORDER BY helpful_count DESC, created_at DESC
      LIMIT 50
    `,
  ])

  if (!plugin) return c.json({ error: 'Not found' }, 404)
  return c.json({ plugin, reviews } satisfies PluginDetailResponse)
})

// ── Reviews ────────────────────────────────────────────────────────────────────

// POST /api/auth/otp/request  — send review auth OTP
app.post('/api/auth/otp/request', async (c) => {
  // TODO: validate email, generate code, store in otp_codes, send via Resend
  return c.json({ error: 'not_implemented' }, 501)
})

// POST /api/auth/otp/verify  — verify OTP, return a short-lived signed token
app.post('/api/auth/otp/verify', async (c) => {
  // TODO: validate code, return JWT valid for 24h (reviewer token)
  return c.json({ error: 'not_implemented' }, 501)
})

// POST /api/plugins/:name/reviews  — submit a review (requires reviewer JWT)
app.post('/api/plugins/:name{.+}/reviews', async (c) => {
  // TODO: validate JWT, insert review (upsert on email hash + plugin_name)
  return c.json({ error: 'not_implemented' }, 501)
})

// POST /api/reviews/:id/helpful  — mark a review as helpful
app.post('/api/reviews/:id/helpful', async (c) => {
  const { id } = c.req.param()
  await sql`UPDATE reviews SET helpful_count = helpful_count + 1 WHERE id = ${id}`
  return c.json({ ok: true })
})

// ── Admin ──────────────────────────────────────────────────────────────────────

// POST /api/admin/sync  — trigger a full npm crawl
app.post('/api/admin/sync', async (c) => {
  if (c.req.header('X-Admin-Secret') !== ADMIN_SECRET) return c.json({ error: 'Forbidden' }, 403)

  // Fire and forget — return immediately, crawl in background
  crawl().catch(console.error)
  return c.json({ ok: true, message: 'Crawl started' })
})

// ── Stats (public) ─────────────────────────────────────────────────────────────

app.get('/api/stats', async (c) => {
  const [[stats]] = await Promise.all([
    sql<{ plugin_count: number; review_count: number; last_sync: string | null }[]>`
      SELECT
        (SELECT COUNT(*)::int FROM plugins WHERE NOT deprecated) AS plugin_count,
        (SELECT COUNT(*)::int FROM reviews) AS review_count,
        (SELECT MAX(synced_at) FROM plugins)::text AS last_sync
    `,
  ])
  return c.json(stats)
})

// ── Static / SPA ──────────────────────────────────────────────────────────────

app.use('*', serveStatic({ root: './dist' }))
app.get('*', serveStatic({ path: './dist/index.html' }))

// ── Boot ──────────────────────────────────────────────────────────────────────

await initDb()
console.log(`Marketplace server running on :${PORT}`)

export default { port: PORT, fetch: app.fetch }
