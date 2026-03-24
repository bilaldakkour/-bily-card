'use client'

import { useEffect } from 'react'
import type { ProductListItem } from '@/lib/data'
import { setDisplayProductsSnapshot } from '@/lib/search/displayProductsStore'

interface SearchCatalogHydratorProps {
  products: ProductListItem[]
}

export default function SearchCatalogHydrator({ products }: SearchCatalogHydratorProps) {
  useEffect(() => {
    setDisplayProductsSnapshot(products)
  }, [products])

  return null
}
