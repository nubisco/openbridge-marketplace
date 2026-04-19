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
  thumb_up: number
  thumb_down: number
  review_score: number
  download_score: number
  freshness_score: number
  ranking_score: number
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
  | 'thumb_up'
  | 'thumb_down'
  | 'review_score'
  | 'download_score'
  | 'freshness_score'
  | 'ranking_score'
>

// ── Q&A ───────────────────────────────────────────────────────────────────────

export interface QuestionAnswer {
  id: string
  question_id: string
  author_display: string
  body: string
  is_accepted: boolean
  created_at: string
}

export interface Question {
  id: string
  plugin_name: string
  author_display: string
  body: string
  created_at: string
  answers: QuestionAnswer[]
}

// ── Review ─────────────────────────────────────────────────────────────────────

export interface ReviewReply {
  id: string
  review_id: string
  author_display: string
  body: string
  created_at: string
}

export interface Review {
  id: string
  plugin_name: string
  author_display: string
  vote: 1 | -1 // thumbs up (1) or thumbs down (-1)
  body: string | null
  helpful_count: number
  created_at: string
  updated_at: string
  replies: ReviewReply[]
}

// ── API response shapes ────────────────────────────────────────────────────────

export interface PluginListResponse {
  plugins: PluginSummary[]
  total: number
  page: number
  limit: number
}

export interface RankingMetaResponse {
  default_sort: 'best'
  supported_sorts: Array<'best' | 'downloads' | 'rating' | 'updated'>
  signals: {
    review_score: string
    download_score: string
    freshness_score: string
    ranking_score: string
  }
  weights: {
    downloads: number
    reviews: number
    freshness: number
  }
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
