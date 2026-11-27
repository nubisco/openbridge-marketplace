import postgres from 'postgres'
import { schema } from './schema'

export const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) throw new Error('DATABASE_URL is required')

export const sql = postgres(DATABASE_URL, { max: 10, onnotice: () => {} })

// ── Schema ─────────────────────────────────────────────────────────────────────
// The statements live in ./schema so tests can apply them to a throwaway database.

export async function initDb() {
  await sql.unsafe(schema)

  // Backfill github_sponsors_url for plugins that have a GitHub repository_url but no sponsor URL yet.
  // Derives the sponsor page from the repo owner (e.g. github.com/owner/repo → github.com/sponsors/owner).
  await sql`
    UPDATE plugins
    SET github_sponsors_url = 'https://github.com/sponsors/' ||
        split_part(
          substring(repository_url FROM 'github\.com/([^/?#]+)'),
          '/',
          1
        )
    WHERE github_sponsors_url IS NULL
      AND repository_url LIKE '%github.com/%'
  `
}
