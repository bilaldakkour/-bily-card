export function buildPublicCacheHeaders(maxAgeSeconds = 30, staleWhileRevalidateSeconds = 120) {
  return {
    'Cache-Control': `public, max-age=${maxAgeSeconds}, s-maxage=${maxAgeSeconds}, stale-while-revalidate=${staleWhileRevalidateSeconds}`,
  }
}
