import type { ProductListItem } from '@/lib/data'
import { getCatalogDisplayProducts, toProductListItem } from '@/lib/data/catalogProducts'
import { normalizeCategory } from '@/lib/data/catalogNormalization'
import { unstable_cache } from 'next/cache'

const getCachedSearchDisplayProducts = unstable_cache(
  async (): Promise<ProductListItem[]> => {
    const catalogProducts = await getCatalogDisplayProducts().catch(() => [])
    if (!Array.isArray(catalogProducts)) return []

    return catalogProducts.map((product) => ({
      ...toProductListItem(product),
      category: normalizeCategory(product),
    }))
  },
  ['search-display-products-v1'],
  { revalidate: 120 }
)

export async function getSearchDisplayProducts(): Promise<ProductListItem[]> {
  return getCachedSearchDisplayProducts()
}
