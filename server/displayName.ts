/**
 * What to call a plugin in the UI.
 *
 * A package may say so itself, and the @nubisco plugins do, via an `openbridge`
 * block in package.json. Preferring that is the whole point: it is the author's
 * own name for the thing.
 *
 * Failing that, derive one from the package name, which is where the old
 * behaviour stopped. Stripping the scope and prefix and swapping hyphens for
 * spaces turned "@nubisco/openbridge-camera-platform" into "camera platform",
 * lower-case and looking like a mistake next to properly named entries. Title
 * casing it costs nothing and reads as deliberate.
 */
export function displayNameFor(name: string, manifest?: { openbridge?: { displayName?: string } } | null): string {
  const declared = manifest?.openbridge?.displayName
  if (typeof declared === 'string' && declared.trim()) return declared.trim()

  return name
    .replace(/^(@[\w-]+\/)?(homebridge|openbridge)-/, '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (ch) => ch.toUpperCase())
}
