import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/auth/middleware'
import { connectDB } from '@/lib/db/mongodb'
import { getCatalogProducts } from '@/lib/data/catalogProducts'
import ProductProviderMapping from '@/lib/models/ProductProviderMapping'

function bySlug(rows: Array<any>) {
  const map = new Map<string, Array<any>>()
  for (const row of rows) {
    const slug = String(row?.internalSlug || '').trim().toLowerCase()
    if (!slug) continue
    if (!map.has(slug)) map.set(slug, [])
    map.get(slug)!.push(row)
  }
  return map
}

export async function GET(req: NextRequest) {
  return withAdminAuth(req, async () => {
    try {
      await connectDB()
      const catalogProducts = await getCatalogProducts()
      const importantProducts = catalogProducts.filter(
        (p) => p.providerMode !== 'manual' && (p.featured || p.bestSeller || p.saleEnabled !== false)
      )

      const rows = await ProductProviderMapping.find({})
        .sort({ internalSlug: 1, providerSlot: 1, priority: 1 })
        .lean()
      const grouped = bySlug(rows as any[])

      const missingAnyMapping: string[] = []
      const missingSecondaryMapping: string[] = []
      const inactiveOnly: string[] = []
      const duplicateCandidates: Array<{ internalSlug: string; providerSlot: string; providerProductId: string; count: number }> = []
      const orphanMappings: string[] = []

      const catalogSlugSet = new Set(catalogProducts.map((p) => String(p.slug || '').trim().toLowerCase()))

      for (const product of importantProducts) {
        const slug = String(product.slug || '').trim().toLowerCase()
        const linked = grouped.get(slug) || []
        const activeRows = linked.filter((row) => row?.active !== false)
        if (!linked.length) {
          missingAnyMapping.push(slug)
          continue
        }
        if (!activeRows.length) {
          inactiveOnly.push(slug)
          continue
        }

        const hasPrimary = activeRows.some((row) => String(row?.providerSlot) === 'primary')
        const hasSecondary = activeRows.some((row) => String(row?.providerSlot) === 'secondary')
        if (hasPrimary && !hasSecondary) {
          missingSecondaryMapping.push(slug)
        }
      }

      const dedupe = new Map<string, number>()
      for (const row of rows as any[]) {
        const slug = String(row?.internalSlug || '').trim().toLowerCase()
        if (slug && !catalogSlugSet.has(slug)) {
          orphanMappings.push(slug)
        }
        const key = `${slug}|${String(row?.providerSlot || '').toLowerCase()}|${String(row?.providerProductId || '').trim().toLowerCase()}`
        dedupe.set(key, (dedupe.get(key) || 0) + 1)
      }
      for (const [key, count] of dedupe.entries()) {
        if (count <= 1) continue
        const [internalSlug, providerSlot, providerProductId] = key.split('|')
        duplicateCandidates.push({ internalSlug, providerSlot, providerProductId, count })
      }

      return NextResponse.json({
        success: true,
        data: {
          totals: {
            catalogProducts: catalogProducts.length,
            importantProducts: importantProducts.length,
            mappingRows: rows.length,
            mappedDistinctSlugs: grouped.size,
          },
          health: {
            missingAnyMapping,
            missingSecondaryMapping,
            inactiveOnly,
            duplicateCandidates,
            orphanMappings: Array.from(new Set(orphanMappings)),
          },
        },
      })
    } catch (error) {
      console.error('Admin provider mapping audit error:', error)
      return NextResponse.json(
        { success: false, message: 'Failed to audit provider mappings' },
        { status: 500 }
      )
    }
  })
}

