'use client'

import { Heart } from 'lucide-react'
import { useFavorites } from '@/hooks/useFavorites'

type FavoriteButtonProps = {
  slug: string
  className?: string
}

export default function FavoriteButton({ slug, className = '' }: FavoriteButtonProps) {
  const { isFavorite, toggleFavorite } = useFavorites()
  const active = isFavorite(slug)

  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        toggleFavorite(slug)
      }}
      aria-label={active ? 'Remove from favorites' : 'Add to favorites'}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full border backdrop-blur transition ${
        active
          ? 'border-pink-300/60 bg-pink-500/30 text-pink-100'
          : 'border-white/25 bg-black/35 text-white hover:border-pink-300/50 hover:bg-pink-500/20'
      } ${className}`}
    >
      <Heart className={`h-4 w-4 ${active ? 'fill-current' : ''}`} />
    </button>
  )
}
