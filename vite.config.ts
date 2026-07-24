import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'

const MANIFEST_PATH = '/site.webmanifest'

/** Short content hash of a buffer, used as the ?v= cache-busting token. */
function contentHash(data: string | Buffer): string {
  return createHash('sha256').update(data).digest('hex').slice(0, 8)
}

/**
 * Reads public/site.webmanifest and appends a content-hash query to each icon
 * src so the icons referenced *inside* the manifest bust their own cache too.
 * Returns null if there is no manifest. The returned hash is derived from the
 * rewritten content, so it also changes when only an icon (not the manifest
 * text) changes, which keeps the manifest <link> in index.html in sync.
 */
function buildManifest(publicDir: string): { content: string; hash: string } | null {
  const src = `${publicDir}${MANIFEST_PATH}`
  if (!existsSync(src)) return null
  const manifest = JSON.parse(readFileSync(src, 'utf8'))
  if (Array.isArray(manifest.icons)) {
    for (const icon of manifest.icons) {
      if (typeof icon.src !== 'string' || icon.src.includes('?')) continue
      const iconPath = `${publicDir}${icon.src}`
      if (!existsSync(iconPath)) continue
      icon.src = `${icon.src}?v=${contentHash(readFileSync(iconPath))}`
    }
  }
  const content = `${JSON.stringify(manifest, null, 2)}\n`
  return { content, hash: contentHash(content) }
}

/**
 * Appends a content-hash query (?v=<hash>) to root-relative asset references in
 * index.html (favicons, manifest, ...) and rewrites the icon srcs inside
 * site.webmanifest. Assets in public/ are copied verbatim without Vite's usual
 * filename hashing, so browsers (notably Safari) aggressively cache them and miss
 * updates. Keying the query to the file's bytes means the URL changes only when
 * the file does, busting the cache automatically on every change.
 */
function publicAssetCacheBust(): Plugin {
  const publicDir = fileURLToPath(new URL('./public', import.meta.url))
  let outDir = 'dist'
  return {
    name: 'public-asset-cache-bust',
    configResolved(config) {
      outDir = config.build.outDir
    },
    transformIndexHtml(html) {
      return html.replace(
        /((?:href|src)=")(\/[^"?#]+\.(?:ico|png|svg|webmanifest))(")/g,
        (match, prefix: string, assetPath: string, suffix: string) => {
          // The manifest's token comes from its rewritten content (icons included),
          // not the raw file, so an icon-only change still busts the <link>.
          if (assetPath === MANIFEST_PATH) {
            const manifest = buildManifest(publicDir)
            return manifest ? `${prefix}${assetPath}?v=${manifest.hash}${suffix}` : match
          }
          const filePath = `${publicDir}${assetPath}`
          if (!existsSync(filePath)) return match
          return `${prefix}${assetPath}?v=${contentHash(readFileSync(filePath))}${suffix}`
        },
      )
    },
    // Serve the rewritten manifest in dev so icon URLs match the built output.
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if ((req.url ?? '').split('?')[0] !== MANIFEST_PATH) return next()
        const manifest = buildManifest(publicDir)
        if (!manifest) return next()
        res.setHeader('Content-Type', 'application/manifest+json')
        res.end(manifest.content)
      })
    },
    // Overwrite the verbatim-copied manifest with the rewritten one. closeBundle
    // runs after Vite has copied publicDir, so this wins deterministically.
    closeBundle() {
      const manifest = buildManifest(publicDir)
      if (!manifest) return
      const dest = fileURLToPath(new URL(`./${outDir}${MANIFEST_PATH}`, import.meta.url))
      if (existsSync(fileURLToPath(new URL(`./${outDir}`, import.meta.url)))) {
        writeFileSync(dest, manifest.content)
      }
    },
  }
}

export default defineConfig({
  plugins: [vue(), publicAssetCacheBust()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    port: 5175,
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})
