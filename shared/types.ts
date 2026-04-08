// ── Plugin ─────────────────────────────────────────────────────────────────────

export interface PluginVersion {
  version: string
  date: string // ISO timestamp
}

export interface Plugin {
  name: string // npm package name, e.g. "homebridge-z2m"
  display_name: string // human-friendly name from npm keywords or parsed
  description: string | null
  version: string // latest published version
  author: string | null // npm author.name
  homepage: string | null
  repository_url: string | null
  npm_url: string // https://www.npmjs.com/package/{name}
  keywords: string[]
  engines: Record<string, string> // e.g. { homebridge: ">=1.0.0" }
  versions: PluginVersion[] // version history from npm
  readme: string | null // raw README markdown
  weekly_downloads: number
  total_downloads: number
  github_stars: number | null
  github_sponsors_url: string | null
  verified: boolean // manually verified by marketplace admins
  deprecated: boolean
  last_published_at: string // ISO timestamp
  synced_at: string // when we last fetched from npm
  // aggregated from reviews table
  rating_avg: number | null // 1–5
  rating_count: number
}

export type PluginSummary = Pick<
  Plugin,
  | 'name'
  | 'display_name'
  | 'description'
  | 'version'
  | 'author'
  | 'homepage'
  | 'repository_url'
  | 'npm_url'
  | 'weekly_downloads'
  | 'github_stars'
  | 'github_sponsors_url'
  | 'verified'
  | 'deprecated'
  | 'last_published_at'
  | 'rating_avg'
  | 'rating_count'
>

// ── Q&A ───────────────────────────────────────────────────────────────────────

export interface Question {
  id: string
  plugin_name: string
  author_display: string
  body: string
  created_at: string
}

// ── Review ─────────────────────────────────────────────────────────────────────

export interface Review {
  id: string
  plugin_name: string
  author_email: string // hashed before storage
  author_display: string // user-provided display name
  rating: number // 1–5
  title: string | null
  body: string | null
  openbridge_version: string | null // self-reported version of their instance
  helpful_count: number
  created_at: string
  updated_at: string
}

// ── API response shapes ────────────────────────────────────────────────────────

export interface PluginListResponse {
  plugins: PluginSummary[]
  total: number
  page: number
  limit: number
}

export interface PluginDetailResponse {
  plugin: Plugin
  reviews: Review[]
  questions: Question[]
}

// ── npm registry types (for crawler) ──────────────────────────────────────────

export interface NpmSearchResult {
  objects: NpmSearchObject[]
  total: number
}

export interface NpmSearchObject {
  package: {
    name: string
    version: string
    description: string
    keywords?: string[]
    date: string
    links: { npm: string; homepage?: string; repository?: string }
    author?: { name: string; email?: string }
    publisher?: { username: string; email: string }
  }
  score: { final: number; detail: { quality: number; popularity: number; maintenance: number } }
  searchScore: number
}

export interface NpmPackageDetail {
  name: string
  description?: string
  readme?: string
  'dist-tags': { latest: string }
  versions: Record<string, NpmVersionManifest>
  time: Record<string, string>
  repository?: { url: string }
  homepage?: string
  keywords?: string[]
  author?: { name: string; email?: string } | string
  bugs?: { url: string }
}

export interface NpmVersionManifest {
  name: string
  version: string
  description?: string
  keywords?: string[]
  homepage?: string
  repository?: { url: string } | string
  author?: { name: string; email?: string } | string
  engines?: Record<string, string>
}
