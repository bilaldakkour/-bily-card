const DEFAULT_HOME_PROMO_SLIDES = [
  '/games/pubg.jpg',
  '/games/playstation.jpg',
  '/games/free-fire.jpg',
  '/games/steam.jpg',
  '/games/tiktok.jpg',
]

const MAX_HOME_PROMO_SLIDES = 8
const MAX_HOME_PROMO_IMAGE_DATA_URL_LENGTH = 350_000

function isSafeLocalImagePath(value: string): boolean {
  return /^\/[a-zA-Z0-9/_\-.]+$/.test(value)
}

function isSafeImageDataUrl(value: string): boolean {
  if (!/^data:image\/(png|jpe?g|webp);base64,/i.test(value)) return false
  if (!value.includes(';base64,')) return false
  return value.length <= MAX_HOME_PROMO_IMAGE_DATA_URL_LENGTH
}

export function sanitizeHomePromoSlides(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []

  const normalized: string[] = []

  for (const item of raw) {
    const value = String(item || '').trim()
    if (!value) continue

    if (isSafeLocalImagePath(value) || isSafeImageDataUrl(value)) {
      normalized.push(value)
    }

    if (normalized.length >= MAX_HOME_PROMO_SLIDES) break
  }

  return normalized
}

export function getDefaultHomePromoSlides(): string[] {
  return [...DEFAULT_HOME_PROMO_SLIDES]
}

export function resolveHomePromoSlides(raw: unknown, useDefaultFallback = true): string[] {
  const customSlides = sanitizeHomePromoSlides(raw)
  if (customSlides.length > 0) return customSlides
  if (!useDefaultFallback) return []
  return getDefaultHomePromoSlides()
}

export const homePromoLimits = {
  maxSlides: MAX_HOME_PROMO_SLIDES,
  maxImageDataUrlLength: MAX_HOME_PROMO_IMAGE_DATA_URL_LENGTH,
}
