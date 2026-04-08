import postgres from 'postgres'

export const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) throw new Error('DATABASE_URL is required')

export const sql = postgres(DATABASE_URL, { max: 10, onnotice: () => {} })

// ── Schema ─────────────────────────────────────────────────────────────────────

const schema = /* sql */ `
  CREATE TABLE IF NOT EXISTS plugins (
    name                TEXT PRIMARY KEY,
    display_name        TEXT NOT NULL,
    description         TEXT,
    version             TEXT NOT NULL,
    author              TEXT,
    homepage            TEXT,
    repository_url      TEXT,
    npm_url             TEXT NOT NULL,
    keywords            JSONB NOT NULL DEFAULT '[]',
    engines             JSONB NOT NULL DEFAULT '{}',
    versions            JSONB NOT NULL DEFAULT '[]',
    readme              TEXT,
    weekly_downloads    INTEGER NOT NULL DEFAULT 0,
    total_downloads     INTEGER NOT NULL DEFAULT 0,
    verified            BOOLEAN NOT NULL DEFAULT FALSE,
    deprecated          BOOLEAN NOT NULL DEFAULT FALSE,
    last_published_at   TIMESTAMPTZ,
    synced_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  ALTER TABLE plugins ADD COLUMN IF NOT EXISTS versions JSONB NOT NULL DEFAULT '[]';
  ALTER TABLE plugins ADD COLUMN IF NOT EXISTS readme TEXT;
  ALTER TABLE plugins ADD COLUMN IF NOT EXISTS github_stars INTEGER;
  ALTER TABLE plugins ADD COLUMN IF NOT EXISTS github_sponsors_url TEXT;

  CREATE TABLE IF NOT EXISTS reviews (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plugin_name           TEXT NOT NULL REFERENCES plugins(name) ON DELETE CASCADE,
    author_email_hash     TEXT NOT NULL,
    author_display        TEXT NOT NULL,
    rating                INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    title                 TEXT,
    body                  TEXT,
    openbridge_version    TEXT,
    helpful_count         INTEGER NOT NULL DEFAULT 0,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (plugin_name, author_email_hash)
  );

  CREATE INDEX IF NOT EXISTS idx_reviews_plugin ON reviews (plugin_name);
  CREATE INDEX IF NOT EXISTS idx_plugins_downloads ON plugins (weekly_downloads DESC);
  CREATE INDEX IF NOT EXISTS idx_plugins_synced ON plugins (synced_at);

  -- OTP codes for reviewer auth
  CREATE TABLE IF NOT EXISTS otp_codes (
    email       TEXT PRIMARY KEY,
    code        TEXT NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL
  );

  CREATE TABLE IF NOT EXISTS questions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plugin_name     TEXT NOT NULL REFERENCES plugins(name) ON DELETE CASCADE,
    author_email_hash TEXT NOT NULL,
    author_display  TEXT NOT NULL,
    body            TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_questions_plugin ON questions (plugin_name);
`

export async function initDb() {
  await sql.unsafe(schema)
}
