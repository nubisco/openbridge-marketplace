function getSessionId(): string {
  const key = 'nba_sid'
  let id = sessionStorage.getItem(key)
  if (!id) {
    id = crypto.randomUUID()
    sessionStorage.setItem(key, id)
  }
  return id
}

const analyticsEndpoint = import.meta.env.VITE_ANALYTICS_ENDPOINT as string | undefined

function sendEvent(payload: {
  url: string
  referrer?: string
  screenWidth?: number
  sessionId: string
  eventType: string
  eventName: string
  props?: Record<string, string>
}): void {
  if (!analyticsEndpoint) return
  if (navigator.doNotTrack === '1') return

  fetch(analyticsEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {
    // analytics must never break the page
  })
}

export function trackPageView(path: string): void {
  sendEvent({
    url: window.location.origin + path,
    referrer: document.referrer || undefined,
    screenWidth: window.screen.width,
    sessionId: getSessionId(),
    eventType: 'pageview',
    eventName: 'pageview',
  })
}

export function trackEvent(name: string, props?: Record<string, string>): void {
  sendEvent({
    url: window.location.href,
    sessionId: getSessionId(),
    eventType: 'custom',
    eventName: name,
    props,
  })
}
