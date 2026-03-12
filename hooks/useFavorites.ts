'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

const FAVORITES_KEY = 'bilycard_favorites'
const FAVORITES_EVENT = 'bilycard-favorites-changed'

function normalizeSlug(value: unknown): string {
  return String(value || '').trim().toLowerCase()
}

function readFavorites(): string[] {
  if (typeof window === 'undefined') return []

  try {
    const raw = localStorage.getItem(FAVORITES_KEY)
    if (!raw) return []

    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    return Array.from(new Set(parsed.map(normalizeSlug).filter(Boolean)))
  } catch {
    return []
  }
}

function saveFavorites(slugs: string[]) {
  if (typeof window === 'undefined') return

  const normalized = Array.from(new Set(slugs.map(normalizeSlug).filter(Boolean)))
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(normalized))
  window.dispatchEvent(new Event(FAVORITES_EVENT))
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([])

  useEffect(() => {
    const sync = () => {
      setFavorites(readFavorites())
    }

    sync()

    window.addEventListener('storage', sync)
    window.addEventListener(FAVORITES_EVENT, sync)

    return () => {
      window.removeEventListener('storage', sync)
      window.removeEventListener(FAVORITES_EVENT, sync)
    }
  }, [])

  const favoritesSet = useMemo(() => new Set(favorites), [favorites])

  const isFavorite = useCallback(
    (slug: string) => favoritesSet.has(normalizeSlug(slug)),
    [favoritesSet]
  )

  const toggleFavorite = useCallback((slug: string) => {
    const normalized = normalizeSlug(slug)
    if (!normalized) return

    const current = readFavorites()
    const exists = current.includes(normalized)

    if (exists) {
      const next = current.filter((item) => item !== normalized)
      saveFavorites(next)
      setFavorites(next)
      return
    }

    const next = [...current, normalized]
    saveFavorites(next)
    setFavorites(next)
  }, [])

  return {
    favorites,
    isFavorite,
    toggleFavorite,
  }
}
