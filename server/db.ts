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

  -- OTP codes: hashed_code prevents plaintext storage; attempts tracks brute force
  CREATE TABLE IF NOT EXISTS otp_codes (
    email_hash    TEXT PRIMARY KEY,
    hashed_code   TEXT NOT NULL,
    expires_at    TIMESTAMPTZ NOT NULL,
    attempts      INTEGER NOT NULL DEFAULT 0
  );

  -- Reviews: thumbs up (1) or thumbs down (-1) with an optional comment
  CREATE TABLE IF NOT EXISTS reviews (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plugin_name       TEXT NOT NULL REFERENCES plugins(name) ON DELETE CASCADE,
    author_email_hash TEXT NOT NULL,
    author_display    TEXT NOT NULL CHECK (char_length(author_display) <= 64),
    vote              SMALLINT NOT NULL CHECK (vote IN (-1, 1)),
    body              TEXT CHECK (char_length(body) <= 2000),
    helpful_count     INTEGER NOT NULL DEFAULT 0,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (plugin_name, author_email_hash)
  );

  -- Migrate old rating column if it exists (one-time, idempotent)
  ALTER TABLE reviews ADD COLUMN IF NOT EXISTS vote SMALLINT CHECK (vote IN (-1, 1));
  DO $$
  BEGIN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'reviews' AND column_name = 'rating'
    ) THEN
      UPDATE reviews SET vote = CASE WHEN rating >= 3 THEN 1 ELSE -1 END WHERE vote IS NULL AND rating IS NOT NULL;
      ALTER TABLE reviews ALTER COLUMN vote SET NOT NULL;
      ALTER TABLE reviews DROP COLUMN rating;
      ALTER TABLE reviews DROP COLUMN IF EXISTS title;
      ALTER TABLE reviews DROP COLUMN IF EXISTS openbridge_version;
    END IF;
  END;
  $$;

  CREATE INDEX IF NOT EXISTS idx_reviews_plugin ON reviews (plugin_name);

  -- Review replies (anyone can respond to a review)
  CREATE TABLE IF NOT EXISTS review_replies (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id         UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    author_email_hash TEXT NOT NULL,
    author_display    TEXT NOT NULL CHECK (char_length(author_display) <= 64),
    body              TEXT NOT NULL CHECK (char_length(body) <= 1000),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_review_replies_review ON review_replies (review_id);

  -- Q&A questions
  CREATE TABLE IF NOT EXISTS questions (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plugin_name       TEXT NOT NULL REFERENCES plugins(name) ON DELETE CASCADE,
    author_email_hash TEXT NOT NULL,
    author_display    TEXT NOT NULL CHECK (char_length(author_display) <= 64),
    body              TEXT NOT NULL CHECK (char_length(body) <= 1000),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_questions_plugin ON questions (plugin_name);

  -- Q&A answers (anyone can answer)
  CREATE TABLE IF NOT EXISTS question_answers (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id       UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    author_email_hash TEXT NOT NULL,
    author_display    TEXT NOT NULL CHECK (char_length(author_display) <= 64),
    body              TEXT NOT NULL CHECK (char_length(body) <= 2000),
    is_accepted       BOOLEAN NOT NULL DEFAULT FALSE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_question_answers_question ON question_answers (question_id);
  CREATE INDEX IF NOT EXISTS idx_plugins_downloads ON plugins (weekly_downloads DESC);
  CREATE INDEX IF NOT EXISTS idx_plugins_synced ON plugins (synced_at);
`

export async function initDb() {
  await sql.unsafe(schema)
}
