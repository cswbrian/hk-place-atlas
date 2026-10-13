declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
    dataLayer?: unknown[]
  }
}

export function trackPageview(path: string): void {
  const id = document.querySelector('meta[name="ga-measurement-id"]')?.getAttribute('content')?.trim()
  if (!id || typeof window.gtag !== 'function') return
  window.gtag('config', id, { page_path: path })
}

export type TrackParams = Record<string, string | number | boolean | undefined>

export function trackEvent(name: string, params?: TrackParams): void {
  if (typeof window.gtag !== 'function') return
  window.gtag('event', name, params)
}
