import type { Sql, TransactionSql } from 'postgres'
import type { Review } from '../shared/types'

// Who wrote a post is the Accord account (the token's sub), never the email
// address. An address can change, and the next holder of an old address is a
// different person.
//
// Rows written before author_sub existed carry only author_email_hash. When a
// signed-in person writes, any such row with their current email hash and no
// author_sub is claimed for their sub. After that only author_sub decides
// ownership and the hash is ignored, so a later holder of the same address
// cannot take the row over. A row is never re-claimed: every claim requires
// author_sub IS NULL.

export interface Author {
  sub: string
  emailHash: string
  display: string
}

type Db = Sql | TransactionSql

/**
 * Claim this person's unclaimed legacy rows in every table that records an
 * author. A legacy review is skipped when the person already has a claimed
 * review for the same plugin, because one person keeps one review per plugin.
 */
export async function claimLegacyAuthorship(db: Db, author: Author): Promise<void> {
  await db`
    UPDATE reviews r
    SET author_sub = ${author.sub}
    WHERE r.author_sub IS NULL
      AND r.author_email_hash = ${author.emailHash}
      AND NOT EXISTS (
        SELECT 1 FROM reviews mine
        WHERE mine.plugin_name = r.plugin_name AND mine.author_sub = ${author.sub}
      )
  `
  await db`
    UPDATE review_replies SET author_sub = ${author.sub}
    WHERE author_sub IS NULL AND author_email_hash = ${author.emailHash}
  `
  await db`
    UPDATE questions SET author_sub = ${author.sub}
    WHERE author_sub IS NULL AND author_email_hash = ${author.emailHash}
  `
  await db`
    UPDATE question_answers SET author_sub = ${author.sub}
    WHERE author_sub IS NULL AND author_email_hash = ${author.emailHash}
  `
}

/**
 * Post or edit this person's review of a plugin. Legacy rows are claimed first,
 * so an unclaimed review written under their current address is edited rather
 * than duplicated. The review is then matched on author_sub alone.
 */
export async function upsertReview(
  sql: Sql,
  author: Author,
  input: { pluginName: string; vote: 1 | -1; body: string | null },
): Promise<Omit<Review, 'replies'>> {
  return sql.begin(async (tx) => {
    await claimLegacyAuthorship(tx, author)
    const [review] = await tx<Omit<Review, 'replies'>[]>`
      INSERT INTO reviews (plugin_name, author_sub, author_email_hash, author_display, vote, body)
      VALUES (${input.pluginName}, ${author.sub}, ${author.emailHash}, ${author.display}, ${input.vote}, ${input.body})
      ON CONFLICT (plugin_name, author_sub) WHERE author_sub IS NOT NULL DO UPDATE
        SET vote       = EXCLUDED.vote,
            body       = EXCLUDED.body,
            updated_at = NOW()
      RETURNING id, plugin_name, author_display, vote, body, helpful_count, created_at, updated_at
    `
    return review as Omit<Review, 'replies'>
  })
}
