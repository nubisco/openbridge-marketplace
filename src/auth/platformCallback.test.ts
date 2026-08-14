import { afterEach, describe, expect, it } from 'vitest'
import { capturePlatformCallbackToken, stripCredentialParams, takePlatformCallbackToken } from './platformCallback'

const JWT = 'eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJ1c2VyXzEifQ.c2lnbmF0dXJl'
const ORIGIN = 'https://marketplace.openbridge.nubisco.io'

/**
 * Minimal window stand-in: just the pieces platformCallback touches, so the
 * test runs in the default node environment without pulling in a DOM.
 */
function fakeWindow(href: string) {
  const win = {
    location: { href },
    history: {
      state: { scroll: 0 },
      replaceState(state: unknown, _title: string, url: string) {
        win.history.state = state as { scroll: number }
        win.location.href = new URL(url, ORIGIN).toString()
      },
    },
  }
  return win
}

function withWindow(href: string) {
  const win = fakeWindow(href)
  ;(globalThis as unknown as { window: unknown }).window = win
  return win
}

afterEach(() => {
  delete (globalThis as unknown as { window?: unknown }).window
  takePlatformCallbackToken()
})

describe('stripCredentialParams', () => {
  it('removes the token and keeps the rest of the query', () => {
    const { token, url } = stripCredentialParams(`${ORIGIN}/auth/callback?token=${JWT}&state=abc-123`)
    expect(token).toBe(JWT)
    expect(url).toBe('/auth/callback?state=abc-123')
    expect(url).not.toContain(JWT)
  })

  it('removes other credential-shaped parameters too', () => {
    const { url } = stripCredentialParams(`${ORIGIN}/auth/callback?access_token=a&id_token=b&code=c&state=abc`)
    expect(url).toBe('/auth/callback?state=abc')
  })

  it('leaves a URL without credentials untouched', () => {
    const { token, url } = stripCredentialParams(`${ORIGIN}/plugins/foo?tab=reviews#top`)
    expect(token).toBe('')
    expect(url).toBe('/plugins/foo?tab=reviews#top')
  })
})

describe('capturePlatformCallbackToken', () => {
  it('erases the token from the address bar and hands it over in memory', () => {
    const win = withWindow(`${ORIGIN}/auth/callback?token=${JWT}&state=abc-123`)

    capturePlatformCallbackToken()

    // The address bar, which is what reaches history, the Referer header and
    // any analytics read of location.href, no longer carries the token.
    expect(win.location.href).toBe(`${ORIGIN}/auth/callback?state=abc-123`)
    expect(win.location.href).not.toContain(JWT)
    expect(takePlatformCallbackToken()).toBe(JWT)
  })

  it('replaces the current history entry rather than pushing a new one', () => {
    const win = withWindow(`${ORIGIN}/auth/callback?token=${JWT}&state=abc-123`)
    const before = win.history.state

    capturePlatformCallbackToken()

    expect(win.history.state).toEqual(before)
  })

  it('hands the token over only once', () => {
    withWindow(`${ORIGIN}/auth/callback?token=${JWT}&state=abc-123`)

    capturePlatformCallbackToken()

    expect(takePlatformCallbackToken()).toBe(JWT)
    expect(takePlatformCallbackToken()).toBe('')
  })

  it('does not touch the URL when there is no token', () => {
    const win = withWindow(`${ORIGIN}/auth/callback?error=domain_not_allowed&state=abc-123`)

    capturePlatformCallbackToken()

    expect(win.location.href).toBe(`${ORIGIN}/auth/callback?error=domain_not_allowed&state=abc-123`)
    expect(takePlatformCallbackToken()).toBe('')
  })
})
