/**
 * npm registry crawler
 *
 * Fetches all packages matching homebridge-* and openbridge-* from the npm
 * registry search API, enriches them with download stats and full metadata,
 * then upserts into the local database.
 *
 * Run standalone:  bun server/crawler.ts
 * Or triggered via POST /api/admin/sync (requires ADMIN_SECRET header)
 */
import { sql } from './db'
import type { NpmSearchResult, NpmSearchObject, NpmPackageDetail } from '../shared/types'

const NPM_SEARCH = 'https://registry.npmjs.org/-/v1/search'
const NPM_REGISTRY = 'https://registry.npmjs.org'
const NPM_DOWNLOADS = 'https://api.npmjs.org/downloads'
const PAGE_SIZE = 250
const PREFIXES = ['homebridge-', 'openbridge-']

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchWithRetry(url: string, init?: RequestInit, retries = 5, baseDelayMs = 5_000): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(url, init)
    if (res.status !== 429) return res

    if (attempt === retries) return res // let caller handle final 429

    const retryAfter = Number(res.headers.get('retry-after') ?? 0)
    const delay = retryAfter > 0 ? retryAfter * 1000 : baseDelayMs * 2 ** attempt
    console.log(`  429 rate limited — retrying in ${Math.round(delay / 1000)}s (attempt ${attempt + 1}/${retries})`)
    await sleep(delay)
  }
  throw new Error('unreachable')
}

async function fetchSearchPage(text: string, from: number): Promise<NpmSearchResult> {
  const url = `${NPM_SEARCH}?text=${encodeURIComponent(text)}&size=${PAGE_SIZE}&from=${from}`
  const res = await fetchWithRetry(url)
  if (!res.ok) throw new Error(`npm search failed: ${res.status}`)
  return res.json() as Promise<NpmSearchResult>
}

async function fetchPackageDetail(name: string): Promise<NpmPackageDetail | null> {
  try {
    const res = await fetchWithRetry(`${NPM_REGISTRY}/${encodeURIComponent(name)}`)
    if (!res.ok) return null
    return res.json() as Promise<NpmPackageDetail>
  } catch {
    return null
  }
}

async function fetchWeeklyDownloads(name: string): Promise<number> {
  try {
    const res = await fetchWithRetry(`${NPM_DOWNLOADS}/point/last-week/${encodeURIComponent(name)}`)
    if (!res.ok) return 0
    const data = (await res.json()) as { downloads?: number }
    return data.downloads ?? 0
  } catch {
    return 0
  }
}

function parseAuthor(author: NpmPackageDetail['author']): string | null {
  if (!author) return null
  if (typeof author === 'string') return author
  return author.name ?? null
}

// ── GitHub data ────────────────────────────────────────────────────────────────

const GITHUB_TOKEN = process.env.GITHUB_TOKEN

function extractGithubRepo(repoUrl: string | null): string | null {
  if (!repoUrl) return null
  const m = repoUrl.match(/github\.com\/([^/]+)\/([^/#?]+?)(?:\.git)?(?:[/?#].*)?$/)
  return m ? `${m[1]}/${m[2]}` : null
}

async function fetchGithubStars(repo: string): Promise<number | null> {
  try {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'openbridge-marketplace',
    }
    if (GITHUB_TOKEN) headers['Authorization'] = `Bearer ${GITHUB_TOKEN}`

    const res = await fetchWithRetry(`https://api.github.com/repos/${repo}`, { headers })
    if (!res.ok) return null
    const data = (await res.json()) as { stargazers_count?: number }
    return data.stargazers_count ?? null
  } catch {
    return null
  }
}

const EXCLUDE_TIME_KEYS = new Set(['created', 'modified', 'unpublished'])

// Core packages that declare homebridge-plugin/openbridge-plugin keywords but are not plugins.
const EXCLUDED_PACKAGES = new Set(['homebridge', 'openbridge', 'homebridge-ui', 'homebridge-cli', 'homebridge-server'])

function parseVersionHistory(time: NpmPackageDetail['time']): { version: string; date: string }[] {
  return Object.entries(time)
    .filter(([k]) => !EXCLUDE_TIME_KEYS.has(k))
    .sort(([, a], [, b]) => new Date(b).getTime() - new Date(a).getTime()) // newest first
    .slice(0, 50) // cap at 50 entries to keep JSONB size bounded
    .map(([version, date]) => ({ version, date }))
}

function parseRepoUrl(repo: NpmPackageDetail['repository']): string | null {
  if (!repo) return null
  const raw = typeof repo === 'string' ? repo : repo.url
  // normalize git+https://... → https://...
  return raw.replace(/^git\+/, '').replace(/\.git$/, '') || null
}

let crawlInProgress = false

export async function crawl(onProgress?: (msg: string) => void) {
  if (crawlInProgress) {
    console.log('Crawl already in progress — skipping')
    return 0
  }
  crawlInProgress = true
  try {
    return await doCrawl(onProgress)
  } finally {
    crawlInProgress = false
  }
}

async function doCrawl(onProgress?: (msg: string) => void) {
  const log = (msg: string) => {
    console.log(msg)
    onProgress?.(msg)
  }

  // Collect all unique package names across both prefixes
  // Only include packages that declare themselves as homebridge/openbridge plugins via keywords.
  // This mirrors the homebridge convention: plugins must list "homebridge-plugin" as a keyword.
  const VALID_KEYWORDS = new Set(['homebridge-plugin', 'openbridge-plugin'])
  const isValidPlugin = (obj: NpmSearchObject): boolean => {
    if (EXCLUDED_PACKAGES.has(obj.package.name)) return false
    const kws = obj.package.keywords ?? []
    return kws.some((k) => VALID_KEYWORDS.has(k))
  }

  const seen = new Set<string>()
  const objects: NpmSearchObject[] = []

  for (const prefix of PREFIXES) {
    log(`Searching npm for "${prefix}"...`)
    let from = 0
    let total = Infinity

    while (from < total) {
      const page = await fetchSearchPage(prefix, from)
      total = page.total

      for (const obj of page.objects) {
        if (!seen.has(obj.package.name) && isValidPlugin(obj)) {
          seen.add(obj.package.name)
          objects.push(obj)
        }
      }

      from += PAGE_SIZE
      log(`  ${prefix}: fetched ${Math.min(from, total)}/${total}`)
    }
  }

  log(`Total unique packages: ${objects.length}. Enriching...`)

  let synced = 0
  for (const obj of objects) {
    const pkg = obj.package
    const [detail, weeklyDownloads] = await Promise.all([fetchPackageDetail(pkg.name), fetchWeeklyDownloads(pkg.name)])

    // GitHub data: derive sponsors URL from repo owner; fetch stars if token available
    const repoUrl = parseRepoUrl(detail?.repository ?? null)
    const githubRepo = extractGithubRepo(repoUrl)
    const githubSponsorsUrl = githubRepo ? `https://github.com/sponsors/${githubRepo.split('/')[0]}` : null
    const githubStars = githubRepo ? await fetchGithubStars(githubRepo) : null

    const latest = detail?.['dist-tags']?.latest ?? pkg.version
    const manifest = detail?.versions?.[latest]
    const lastPublishedAt = detail?.time?.[latest] ?? pkg.date

    const versionHistory = detail?.time ? parseVersionHistory(detail.time) : []
    const readme = detail?.readme ? detail.readme.slice(0, 65_536) : null // cap at 64KB

    await sql`
      INSERT INTO plugins (
        name, display_name, description, version, author, homepage,
        repository_url, npm_url, keywords, engines, versions, readme,
        weekly_downloads, github_stars, github_sponsors_url,
        deprecated, last_published_at, synced_at
      ) VALUES (
        ${pkg.name},
        ${pkg.name.replace(/^(@[\w-]+\/)?(homebridge|openbridge)-/, '').replace(/-/g, ' ')},
        ${pkg.description ?? null},
        ${latest},
        ${parseAuthor(detail?.author ?? manifest?.author ?? null)},
        ${detail?.homepage ?? pkg.links.homepage ?? null},
        ${repoUrl},
        ${pkg.links.npm},
        ${JSON.stringify(detail?.keywords ?? pkg.keywords ?? [])},
        ${JSON.stringify(manifest?.engines ?? {})},
        ${JSON.stringify(versionHistory)},
        ${readme},
        ${weeklyDownloads},
        ${githubStars},
        ${githubSponsorsUrl},
        ${false},
        ${lastPublishedAt ?? null},
        NOW()
      )
      ON CONFLICT (name) DO UPDATE SET
        display_name          = EXCLUDED.display_name,
        description           = EXCLUDED.description,
        version               = EXCLUDED.version,
        author                = EXCLUDED.author,
        homepage              = EXCLUDED.homepage,
        repository_url        = EXCLUDED.repository_url,
        keywords              = EXCLUDED.keywords,
        engines               = EXCLUDED.engines,
        versions              = EXCLUDED.versions,
        readme                = EXCLUDED.readme,
        weekly_downloads      = EXCLUDED.weekly_downloads,
        github_stars          = EXCLUDED.github_stars,
        github_sponsors_url   = EXCLUDED.github_sponsors_url,
        deprecated            = EXCLUDED.deprecated,
        last_published_at     = EXCLUDED.last_published_at,
        synced_at             = NOW()
    `

    synced++
    if (synced % 50 === 0) {
      log(`  Synced ${synced}/${objects.length}`)
      await sleep(1_000) // brief pause every 50 packages to avoid rate limits
    }
  }

  // Remove any previously-synced packages that are now excluded
  const excluded = [...EXCLUDED_PACKAGES]
  await sql`DELETE FROM plugins WHERE name = ANY(${excluded})`

  log(`Crawl complete. Synced ${synced} plugins.`)
  return synced
}

// Run directly
if (import.meta.main) {
  const { initDb } = await import('./db')
  await initDb()
  await crawl(console.log)
  process.exit(0)
}
