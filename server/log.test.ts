import { describe, expect, it } from 'vitest'
import { redactQueryCredentials } from './log'

const JWT = 'eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJ1c2VyXzEifQ.c2lnbmF0dXJl'

describe('redactQueryCredentials', () => {
  it('redacts the SSO token from a hono request line', () => {
    const line = redactQueryCredentials(`<-- GET /auth/callback?token=${JWT}&state=abc-123`)
    expect(line).toBe('<-- GET /auth/callback?token=[REDACTED]&state=abc-123')
    expect(line).not.toContain(JWT)
  })

  it('redacts a credential in first position and every other credential param', () => {
    expect(redactQueryCredentials('GET /cb?code=xyz&access_token=abc 200 3ms')).toBe(
      'GET /cb?code=[REDACTED]&access_token=[REDACTED] 200 3ms',
    )
  })

  it('leaves ordinary request lines alone', () => {
    const line = '--> GET /api/plugins?limit=20&sort=downloads 200 12ms'
    expect(redactQueryCredentials(line)).toBe(line)
  })
})
