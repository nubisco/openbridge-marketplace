// The schema, kept apart from the connection so tests can apply it to a
// throwaway database. It runs on every start, so every statement here must be
// idempotent and additive.

export const schema = /* sql */ `
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
    deprecated          BOOLEAN NOT NULL DEFAULT FALSE,
    last_published_at   TIMESTAMPTZ,
    synced_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  ALTER TABLE plugins ADD COLUMN IF NOT EXISTS versions JSONB NOT NULL DEFAULT '[]';
  ALTER TABLE plugins ADD COLUMN IF NOT EXISTS readme TEXT;
  ALTER TABLE plugins ADD COLUMN IF NOT EXISTS github_stars INTEGER;
  ALTER TABLE plugins ADD COLUMN IF NOT EXISTS github_sponsors_url TEXT;

  -- The marketplace does not verify or endorse plugins, so this flag had no
  -- writer and no reader: it was FALSE on every row.
  ALTER TABLE plugins DROP COLUMN IF EXISTS verified;

  -- Local OTP auth was replaced by Nubisco Platform SSO; the table only ever
  -- held codes with a 5-minute TTL, so there is nothing to preserve.
  DROP TABLE IF EXISTS otp_codes;

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
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
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

  -- Authorship follows the Accord account (the token's sub), not the email
  -- address, so a person who changes their address keeps their posts. Rows
  -- written before this have only author_email_hash. The first time their
  -- author signs in and writes, the row is claimed: author_sub is set, and from
  -- then on only author_sub decides whose it is. See server/authorship.ts.
  ALTER TABLE reviews          ADD COLUMN IF NOT EXISTS author_sub TEXT;
  ALTER TABLE review_replies   ADD COLUMN IF NOT EXISTS author_sub TEXT;
  ALTER TABLE questions        ADD COLUMN IF NOT EXISTS author_sub TEXT;
  ALTER TABLE question_answers ADD COLUMN IF NOT EXISTS author_sub TEXT;

  -- One review per person per plugin. It used to be one per email hash, which
  -- let a person who changed address post a second review, and would have let
  -- the next holder of the old address collide with a claimed row. Now it is
  -- one per account, and one per email hash only among rows nobody has
  -- claimed yet.
  -- The old constraint is found by its columns, not by its generated name.
  DO $$
  DECLARE c RECORD;
  BEGIN
    FOR c IN
      SELECT con.conname
      FROM pg_constraint con
      WHERE con.conrelid = 'reviews'::regclass
        AND con.contype = 'u'
        AND (
          SELECT array_agg(att.attname::text ORDER BY att.attname)
          FROM pg_attribute att
          WHERE att.attrelid = con.conrelid AND att.attnum = ANY (con.conkey)
        ) = ARRAY['author_email_hash', 'plugin_name']
    LOOP
      EXECUTE format('ALTER TABLE reviews DROP CONSTRAINT %I', c.conname);
    END LOOP;
  END;
  $$;
  CREATE UNIQUE INDEX IF NOT EXISTS uq_reviews_plugin_author_sub
    ON reviews (plugin_name, author_sub) WHERE author_sub IS NOT NULL;
  CREATE UNIQUE INDEX IF NOT EXISTS uq_reviews_plugin_legacy_hash
    ON reviews (plugin_name, author_email_hash) WHERE author_sub IS NULL;

  -- The claim looks unclaimed rows up by email hash.
  CREATE INDEX IF NOT EXISTS idx_reviews_unclaimed          ON reviews (author_email_hash) WHERE author_sub IS NULL;
  CREATE INDEX IF NOT EXISTS idx_review_replies_unclaimed   ON review_replies (author_email_hash) WHERE author_sub IS NULL;
  CREATE INDEX IF NOT EXISTS idx_questions_unclaimed        ON questions (author_email_hash) WHERE author_sub IS NULL;
  CREATE INDEX IF NOT EXISTS idx_question_answers_unclaimed ON question_answers (author_email_hash) WHERE author_sub IS NULL;
  CREATE INDEX IF NOT EXISTS idx_plugins_downloads ON plugins (weekly_downloads DESC);
  CREATE INDEX IF NOT EXISTS idx_plugins_synced ON plugins (synced_at);
`
