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

async function fetchSearchPage(text: string, from: number): Promise<NpmSearchResult> {
  const url = `${NPM_SEARCH}?text=${encodeURIComponent(text)}&size=${PAGE_SIZE}&from=${from}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`npm search failed: ${res.status}`)
  return res.json() as Promise<NpmSearchResult>
}

async function fetchPackageDetail(name: string): Promise<NpmPackageDetail | null> {
  try {
    const res = await fetch(`${NPM_REGISTRY}/${encodeURIComponent(name)}`)
    if (!res.ok) return null
    return res.json() as Promise<NpmPackageDetail>
  } catch {
    return null
  }
}

async function fetchWeeklyDownloads(name: string): Promise<number> {
  try {
    const res = await fetch(`${NPM_DOWNLOADS}/point/last-week/${encodeURIComponent(name)}`)
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

function parseRepoUrl(repo: NpmPackageDetail['repository']): string | null {
  if (!repo) return null
  const raw = typeof repo === 'string' ? repo : repo.url
  // normalize git+https://... → https://...
  return raw.replace(/^git\+/, '').replace(/\.git$/, '') || null
}

export async function crawl(onProgress?: (msg: string) => void) {
  const log = (msg: string) => {
    console.log(msg)
    onProgress?.(msg)
  }

  // Collect all unique package names across both prefixes
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
        if (!seen.has(obj.package.name)) {
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

    const latest = detail?.['dist-tags']?.latest ?? pkg.version
    const manifest = detail?.versions?.[latest]
    const lastPublishedAt = detail?.time?.[latest] ?? pkg.date

    await sql`
      INSERT INTO plugins (
        name, display_name, description, version, author, homepage,
        repository_url, npm_url, keywords, engines,
        weekly_downloads, deprecated, last_published_at, synced_at
      ) VALUES (
        ${pkg.name},
        ${pkg.name.replace(/^(homebridge|openbridge)-/, '').replace(/-/g, ' ')},
        ${pkg.description ?? null},
        ${latest},
        ${parseAuthor(detail?.author ?? manifest?.author ?? null)},
        ${detail?.homepage ?? pkg.links.homepage ?? null},
        ${parseRepoUrl(detail?.repository ?? manifest?.repository ?? null)},
        ${pkg.links.npm},
        ${JSON.stringify(detail?.keywords ?? pkg.keywords ?? [])},
        ${JSON.stringify(manifest?.engines ?? {})},
        ${weeklyDownloads},
        ${detail?.['dist-tags']?.latest === undefined ? false : false},
        ${lastPublishedAt ?? null},
        NOW()
      )
      ON CONFLICT (name) DO UPDATE SET
        display_name       = EXCLUDED.display_name,
        description        = EXCLUDED.description,
        version            = EXCLUDED.version,
        author             = EXCLUDED.author,
        homepage           = EXCLUDED.homepage,
        repository_url     = EXCLUDED.repository_url,
        keywords           = EXCLUDED.keywords,
        engines            = EXCLUDED.engines,
        weekly_downloads   = EXCLUDED.weekly_downloads,
        deprecated         = EXCLUDED.deprecated,
        last_published_at  = EXCLUDED.last_published_at,
        synced_at          = NOW()
    `

    synced++
    if (synced % 50 === 0) log(`  Synced ${synced}/${objects.length}`)
  }

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
