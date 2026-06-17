// Thin wrapper around the @nubisco/analytics tracker script (window.nba.*).
// Loads the official tracker from VITE_ANALYTICS_URL with data-app set so every
// event is tagged with app_id="openbridge-marketplace". The tracker
// auto-instruments pageviews (including SPA navigation), engagement, scroll
// depth, outbound clicks, and Web Vitals — no need to call trackPageView from
// the router.

const APP_ID = 'openbridge-marketplace'

interface Nba {
  track: (name: string, props?: Record<string, unknown>) => void
  identify: (userId: string, opts?: { appId?: string }) => void
  reset: () => void
}

declare global {
  interface Window {
    nba?: Nba
  }
}

let initialized = false

export async function initAnalytics(): Promise<void> {
  if (initialized) return
  const base = (import.meta.env.VITE_ANALYTICS_URL as string | undefined)?.replace(/\/$/, '')
  if (!base || !import.meta.env.PROD) return
  initialized = true

  await new Promise<void>((resolve) => {
    const script = document.createElement('script')
    script.src = `${base}/script.js`
    script.defer = true
    script.dataset.app = APP_ID
    script.addEventListener('load', () => resolve(), { once: true })
    script.addEventListener('error', () => resolve(), { once: true })
    document.head.appendChild(script)
  })
}

export function trackEvent(name: string, props?: Record<string, unknown>): void {
  window.nba?.track(name, props)
}
