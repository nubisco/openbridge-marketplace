import { describe, it, expect } from 'vitest'
import { displayNameFor } from './displayName'

describe('displayNameFor', () => {
  it("prefers the package's own declared name", () => {
    // The author's name for the thing beats anything derived from the npm name.
    expect(
      displayNameFor('@nubisco/openbridge-camera-platform', { openbridge: { displayName: 'Camera Platform' } }),
    ).toBe('Camera Platform')
  })

  it('title-cases a derived name instead of leaving it lower case', () => {
    // This is the bug: "camera platform" sat lower case next to properly
    // named entries and read as a mistake.
    expect(displayNameFor('@nubisco/openbridge-camera-platform')).toBe('Camera Platform')
    expect(displayNameFor('homebridge-camera-ffmpeg')).toBe('Camera Ffmpeg')
  })

  it('strips scope and prefix', () => {
    expect(displayNameFor('@nubisco/openbridge-wiz-local-platform')).toBe('Wiz Local Platform')
  })

  it('leaves a name with no recognised prefix alone apart from casing', () => {
    expect(displayNameFor('some-other-plugin')).toBe('Some Other Plugin')
  })

  it('ignores a declared name that is blank', () => {
    expect(displayNameFor('homebridge-thing', { openbridge: { displayName: '   ' } })).toBe('Thing')
  })

  it('survives a missing manifest', () => {
    expect(displayNameFor('homebridge-thing', null)).toBe('Thing')
    expect(displayNameFor('homebridge-thing', undefined)).toBe('Thing')
  })
})
