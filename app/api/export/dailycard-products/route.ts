import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { withAdminAuth } from '@/lib/auth/middleware'
import { getDailycardRowsShared } from '@/lib/providers/dailycardRowsShared'
import type { UnifiedInternalProduct } from '@/lib/providers/types'
import Product from '@/lib/models/Product'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type ExportRow = {
  providerProductId: string
  productName: string
  variantLabel: string
  category: string
  price: number
  currency: string
  provider: 'dailycard'
  productId: string
  slug: string
}

function normalizeText(value: unknown) {
  return String(value || '').trim()
}

function toPositiveNumber(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
}

function extractVariantLabel(row: UnifiedInternalProduct) {
  // DailyCard rows are already variant/package-level in most cases.
  const fromMeta = normalizeText((row?.metadata as any)?.variantLabel || (row?.metadata as any)?.packageLabel)
  if (fromMeta) return fromMeta
  return normalizeText(row?.providerProductName || row?.displayName)
}

async function getHandler(_req: NextRequest) {
  try {
    const providerRows = await getDailycardRowsShared()
    if (!providerRows.length) {
      return NextResponse.json(
        {
          success: false,
          message: 'No DailyCard products available from provider adapter',
        },
        { status: 503 }
      )
    }

    const providerIds = Array.from(
      new Set(providerRows.map((row) => normalizeText(row.providerProductId)).filter(Boolean))
    )

    const localRows = await Product.find({ providerProductId: { $in: providerIds } })
      .select('_id providerProductId slug productName')
      .lean()

    const localByProviderId = new Map<
      string,
      { productId: string; slug: string; localName: string }
    >()
    for (const row of localRows as Array<{ _id?: unknown; providerProductId?: string; slug?: string; productName?: string }>) {
      const providerProductId = normalizeText(row?.providerProductId).toLowerCase()
      if (!providerProductId || localByProviderId.has(providerProductId)) continue
      localByProviderId.set(providerProductId, {
        productId: normalizeText(row?._id),
        slug: normalizeText(row?.slug),
        localName: normalizeText(row?.productName),
      })
    }

    const exportRows: ExportRow[] = providerRows.map((row) => {
      const providerProductId = normalizeText(row.providerProductId)
      const local = localByProviderId.get(providerProductId.toLowerCase())
      const providerName = normalizeText(row.providerProductName || row.displayName)
      return {
        providerProductId,
        productName: providerName,
        variantLabel: extractVariantLabel(row),
        category: normalizeText(row.category),
        price: toPositiveNumber(row.cost),
        currency: normalizeText(row.currency || 'USD') || 'USD',
        provider: 'dailycard',
        productId: local?.productId || '',
        slug: local?.slug || '',
      }
    })

    const withoutProviderIdCount = exportRows.filter((row) => !row.providerProductId).length
    const productsCount = new Set(exportRows.map((row) => row.providerProductId).filter(Boolean)).size
    const variantsCount = exportRows.length

    console.log('[export.dailycard-products] productsCount=', productsCount)
    console.log('[export.dailycard-products] variantsCount=', variantsCount)
    console.log('[export.dailycard-products] withoutProviderIdCount=', withoutProviderIdCount)

    const worksheet = XLSX.utils.json_to_sheet(exportRows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'DailyCard Products')
    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' })

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="dailycard_products.xlsx"',
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('Export DailyCard products failed:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to export DailyCard products' },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  return withAdminAuth(req, async () => getHandler(req))
}
