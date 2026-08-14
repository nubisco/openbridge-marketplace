// Log redaction for request lines.
//
// Hono's logger() prints the request path including the query string. The
// platform SSO redirect lands the browser on /auth/callback?token=<RS256 JWT>,
// so logging that line verbatim writes a live credential into stdout and from
// there into the container logs. Redact credential-bearing query parameters
// before anything is written.

/** Query parameters whose value must never reach a log line. */
const CREDENTIAL_PARAMS = ['token', 'access_token', 'id_token', 'refresh_token', 'code']

const CREDENTIAL_PATTERN = new RegExp(`([?&](?:${CREDENTIAL_PARAMS.join('|')})=)[^&\\s]+`, 'gi')

/** Replaces the value of every credential query parameter with [REDACTED]. */
export function redactQueryCredentials(line: string): string {
  return line.replace(CREDENTIAL_PATTERN, '$1[REDACTED]')
}
