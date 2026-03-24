type HomePromoCacheEntry = {
  slides: string[]
  expiresAt: number
}

const HOME_PROMO_TTL_MS = 60 * 1000
let cache: HomePromoCacheEntry | null = null

export function readHomePromoCache() {
  if (!cache) return null
  if (Date.now() > cache.expiresAt) {
    cache = null
    return null
  }
  return [...cache.slides]
}

export function writeHomePromoCache(slides: string[]) {
  cache = {
    slides: [...slides],
    expiresAt: Date.now() + HOME_PROMO_TTL_MS,
  }
}

export function clearHomePromoCache() {
  cache = null
}
