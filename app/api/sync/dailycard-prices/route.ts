import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db/mongodb'
import Product from '@/lib/models/Product'

export const dynamic = 'force-dynamic'

const PROVIDER_BASE =
  process.env.DAILYCARD_API_BASE ||
  process.env.PROVIDER_API_URL ||
  'https://dailycard.shop/UAPI/api-keys'

const PROVIDER_KEY = process.env.DAILYCARD_API_KEY || process.env.PROVIDER_API_KEY || ''
const PROVIDER_SECRET = process.env.DAILYCARD_API_SECRET || process.env.PROVIDER_API_SECRET || ''
const PAGE_SIZE = 100
const REQUEST_TIMEOUT_MS = 15000

type ProviderProduct = Record<string, unknown>

type SyncStats = {
  scanned: number
  updated: number
  skipped: number
  warnings: number
  providerProductsFetched: number
}

function providerEnabled() {
  return Boolean(PROVIDER_KEY && PROVIDER_SECRET)
}

function providerHeaders() {
  return {
    'Content-Type': 'application/json',
    'X-API-Key': PROVIDER_KEY,
    'X-API-Secret': PROVIDER_SECRET,
  }
}

function normalizeId(value: unknown) {
  return String(value || '').trim().toLowerCase()
}

function extractRows(payload: any): ProviderProduct[] {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.results)) return payload.results
  if (Array.isArray(payload?.data)) return payload.data
  if (Array.isArray(payload?.products)) return payload.products
  if (Array.isArray(payload?.items)) return payload.items
  return []
}

function hasNextPage(payload: any, page: number, rowCount: number): boolean {
  if (payload?.next) return true

  const total = Number(payload?.count ?? payload?.total ?? payload?.total_count)
  if (Number.isFinite(total) && total > 0) {
    return page * PAGE_SIZE < total
  }

  return rowCount === PAGE_SIZE
}

function extractProviderProductId(row: ProviderProduct): string {
  const candidates = [
    row?.id,
    row?.product_id,
    row?.provider_product_id,
    row?.productId,
    row?.sku,
  ]

  for (const candidate of candidates) {
    const normalized = normalizeId(candidate)
    if (normalized) return normalized
  }

  return ''
}

function extractProviderName(row: ProviderProduct): string {
  const candidates = [row?.name, row?.title, row?.product_name]

  for (const candidate of candidates) {
    const text = String(candidate || '').trim()
    if (text) return text
  }

  return ''
}

function extractProviderPrice(row: ProviderProduct): number | null {
  const candidates = [
    row?.price,
    row?.selling_price,
    row?.final_price,
    row?.amount,
    row?.cost,
    row?.unit_price,
    (row as any)?.data?.price,
    (row as any)?.data?.cost,
    (row as any)?.data?.unit_price,
  ]

  for (const candidate of candidates) {
    const value = Number(candidate)
    if (Number.isFinite(value) && value > 0) {
      return value
    }
  }

  return null
}

async function fetchProviderPage(page: number): Promise<any> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const query = new URLSearchParams({
      page: String(page),
      page_size: String(PAGE_SIZE),
    })

    const response = await fetch(`${PROVIDER_BASE}/products/?${query.toString()}`, {
      method: 'GET',
      headers: providerHeaders(),
      cache: 'no-store',
      signal: controller.signal,
    })

    if (!response.ok) {
      const error = new Error(`Provider request failed with status ${response.status}`) as Error & {
        status?: number
      }
      error.status = response.status
      throw error
    }

    return response.json()
  } finally {
    clearTimeout(timeout)
  }
}

async function fetchAllProviderProducts(): Promise<ProviderProduct[]> {
  const allRows: ProviderProduct[] = []
  let page = 1

  while (true) {
    try {
      const payload = await fetchProviderPage(page)
      const pageRows = extractRows(payload)

      if (!pageRows.length) break

      allRows.push(...pageRows)

      if (!hasNextPage(payload, page, pageRows.length)) {
        break
      }

      page += 1
    } catch (error: any) {
      const details = error?.status || error?.code || error?.message || error
      console.warn(`DailyCard pagination stopped at page=${page}:`, details)
      break
    }
  }

  return allRows
}

function computeOldMargin(costPrice: unknown, sellingPrice: unknown, profitMargin: unknown): number {
  const cost = Number(costPrice)
  const selling = Number(sellingPrice)
  const explicitMargin = Number(profitMargin)

  if (Number.isFinite(selling) && Number.isFinite(cost)) {
    return selling - cost
  }

  if (Number.isFinite(explicitMargin)) {
    return explicitMargin
  }

  return 0
}

async function runSync() {
  const stats: SyncStats = {
    scanned: 0,
    updated: 0,
    skipped: 0,
    warnings: 0,
    providerProductsFetched: 0,
  }

  if (!providerEnabled()) {
    console.warn('DailyCard credentials are missing. Price sync skipped.')
    stats.warnings += 1
    return {
      success: true,
      message: 'DailyCard credentials are missing. Sync skipped safely.',
      data: stats,
    }
  }

  await connectDB()

  const providerRows = await fetchAllProviderProducts()
  stats.providerProductsFetched = providerRows.length

  if (!providerRows.length) {
    console.warn('DailyCard returned no products or was unavailable. No local prices were updated.')
  }

  const providerMap = new Map<string, ProviderProduct>()
  for (const row of providerRows) {
    const providerProductId = extractProviderProductId(row)
    if (!providerProductId) continue
    if (!providerMap.has(providerProductId)) {
      providerMap.set(providerProductId, row)
    }
  }

  const localProducts = await Product.find({
    providerProductId: { $exists: true, $ne: '' },
  })
    .select('_id providerProductId costPrice sellingPrice profitMargin')
    .lean()

  stats.scanned = localProducts.length

  for (const localProduct of localProducts) {
    const providerProductId = normalizeId(localProduct.providerProductId)

    if (!providerProductId) {
      stats.skipped += 1
      continue
    }

    const providerRow = providerMap.get(providerProductId)
    if (!providerRow) {
      stats.warnings += 1
      stats.skipped += 1
      console.warn(`Provider product not found for providerProductId=${providerProductId}`)
      continue
    }

    try {
      const newCostPrice = extractProviderPrice(providerRow)

      if (!newCostPrice || !Number.isFinite(newCostPrice) || newCostPrice <= 0) {
        stats.warnings += 1
        stats.skipped += 1
        console.warn(`Invalid provider price for providerProductId=${providerProductId}`)
        continue
      }

      const oldMargin = computeOldMargin(
        localProduct.costPrice,
        localProduct.sellingPrice,
        localProduct.profitMargin
      )

      const nextSellingPrice = Number((newCostPrice + oldMargin).toFixed(6))
      const nextProfitMargin = Number((nextSellingPrice - newCostPrice).toFixed(6))

      await Product.updateOne(
        { _id: localProduct._id },
        {
          $set: {
            costPrice: newCostPrice,
            sellingPrice: nextSellingPrice,
            profitMargin: nextProfitMargin,
            lastSyncedAt: new Date(),
            providerRawName: extractProviderName(providerRow),
            providerRawPrice: newCostPrice,
          },
        }
      )

      stats.updated += 1
    } catch (error: any) {
      stats.warnings += 1
      stats.skipped += 1
      const details = error?.response?.status || error?.code || error?.message || error
      console.warn(`Failed to sync providerProductId=${providerProductId}:`, details)
    }
  }

  return {
    success: true,
    message: 'DailyCard price sync completed',
    data: stats,
  }
}

export async function POST() {
  try {
    const result = await runSync()
    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error('DailyCard price sync failed:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Unexpected failure while syncing DailyCard prices',
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return POST()
}
