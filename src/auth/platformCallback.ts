// Consumes the platform SSO access token out of the /auth/callback URL and
// removes it from the address bar before anything else can observe it.
//
// Nubisco Platform hands the token back as a query parameter
// (/auth/callback?token=<RS256 JWT>&state=<uuid>). A live credential in the
// query string leaks into browser history, the Referer header of every request
// the page makes afterwards, server access logs, and any analytics payload
// built from location.href. We cannot change the delivery from here (the
// platform owns the redirect), so we consume the token synchronously at module
// load and rewrite the entry with history.replaceState, which overwrites the
// current history entry rather than adding one.
//
// IMPORTANT: this module must stay the FIRST import in main.ts. ES modules
// evaluate in import order, so being first is what guarantees the token is gone
// from the URL before the analytics tracker is loaded and before vue-router
// snapshots the initial location.

/**
 * Query parameters that may carry a credential. `token` is what the platform
 * sends today, the rest are listed so a future flow cannot quietly reintroduce
 * the leak.
 */
const CREDENTIAL_PARAMS = ['token', 'access_token', 'id_token', 'refresh_token', 'code'] as const

/**
 * Pure helper: pulls the token out of an absolute URL and returns the URL with
 * every credential parameter removed, as a path suitable for replaceState.
 * Non-credential parameters (state, error, ...) are preserved.
 */
export function stripCredentialParams(href: string): { token: string; url: string } {
  const parsed = new URL(href)

  // The platform can now deliver the token in the fragment instead, opt-in per
  // app via platform_apps.token_delivery. A fragment is never sent to a server,
  // so it closes what this module cannot reach on its own: the platform's 302
  // Location header, the follow-up request line, and every proxy and access log
  // between them.
  //
  // Both shapes are read so this can ship before the flag is flipped and keep
  // working if it is flipped back. The fragment wins when both are present.
  const fragment = new URLSearchParams(parsed.hash.startsWith('#') ? parsed.hash.slice(1) : parsed.hash)
  const token = fragment.get('token') || (parsed.searchParams.get('token') ?? '')

  for (const param of CREDENTIAL_PARAMS) {
    parsed.searchParams.delete(param)
    fragment.delete(param)
  }
  // Only rewrite the fragment when it actually held parameters, so a plain
  // anchor such as #installation survives untouched.
  if (parsed.hash.includes('=')) {
    const rest = fragment.toString()
    parsed.hash = rest ? `#${rest}` : ''
  }

  return { token, url: `${parsed.pathname}${parsed.search}${parsed.hash}` }
}

let capturedToken = ''

/**
 * Reads and erases the token from the current URL. Runs once on module load.
 * A no-op when there is no token, so ordinary page loads keep their URL byte
 * for byte.
 */
export function capturePlatformCallbackToken(): void {
  if (typeof window === 'undefined') return

  const { token, url } = stripCredentialParams(window.location.href)
  if (!token) return

  capturedToken = token
  window.history.replaceState(window.history.state, '', url)
}

/**
 * Returns the captured token and forgets it, so it lives in exactly one place
 * at a time. Returns '' when there was no token to capture.
 */
export function takePlatformCallbackToken(): string {
  const token = capturedToken
  capturedToken = ''
  return token
}

capturePlatformCallbackToken()
