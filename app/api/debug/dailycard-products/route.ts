import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'
import { connectDB } from '@/lib/db/mongodb'
import Product from '@/lib/models/Product'
import { withAdminAuth } from '@/lib/auth/middleware'
import { JWTPayload } from '@/lib/types'

export const dynamic = 'force-dynamic'
const DEBUG_ENDPOINTS_ENABLED =
  process.env.NODE_ENV !== 'production' || process.env.ENABLE_DEBUG_ENDPOINTS === 'true'

const API_BASE =
  process.env.DAILYCARD_API_BASE ||
  process.env.PROVIDER_API_URL ||
  'https://dailycard.shop/UAPI/api-keys'

const API_KEY =
  process.env.DAILYCARD_API_KEY ||
  process.env.PROVIDER_API_KEY ||
  ''

const API_SECRET =
  process.env.DAILYCARD_API_SECRET ||
  process.env.PROVIDER_API_SECRET ||
  ''

const CORE_KEYWORDS = [
  'pubg',
  'free',
  'fire',
  'tiktok',
  'steam',
  'google',
  'play',
  'itunes',
  'roblox',
  'valorant',
  'mobile',
  'legends',
]

const STOP_WORDS = new Set([
  'card',
  'cards',
  'gift',
  'topup',
  'top',
  'up',
  'code',
  'codes',
  'voucher',
  'global',
  'usd',
  'us',
  'eu',
  'ksa',
  'saudi',
  'digital',
  'pin',
])

type SimplifiedDailyProduct = {
  id: string
  name: string
  price: number | null
}

function normalizeText(value: unknown): string {
  return String(value || '')
    .toLowerCase()
    .replace(/[,_\-\/]+/g, ' ')
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function toTokens(value: string): string[] {
  const raw = normalizeText(value)
  if (!raw) return []

  return raw
    .split(' ')
    .map((token) => token.trim())
    .filter((token) => token.length > 1)
    .filter((token) => !STOP_WORDS.has(token))
}

function jaccardSimilarity(aTokens: string[], bTokens: string[]): number {
  if (!aTokens.length || !bTokens.length) return 0

  const aSet = new Set(aTokens)
  const bSet = new Set(bTokens)

  let intersection = 0
  for (const token of aSet) {
    if (bSet.has(token)) intersection += 1
  }

  const union = new Set([...aSet, ...bSet]).size
  return union > 0 ? intersection / union : 0
}

function coreKeywordBoost(localNorm: string, providerNorm: string): number {
  let boost = 0
  for (const keyword of CORE_KEYWORDS) {
    const inLocal = localNorm.includes(keyword)
    const inProvider = providerNorm.includes(keyword)
    if (inLocal && inProvider) boost += 0.12
  }
  return boost
}

function scoreMatch(localName: string, providerName: string): number {
  const localNorm = normalizeText(localName)
  const providerNorm = normalizeText(providerName)

  if (!localNorm || !providerNorm) return 0
  if (localNorm === providerNorm) return 1

  const containsBoost =
    localNorm.includes(providerNorm) || providerNorm.includes(localNorm) ? 0.25 : 0

  const tokenScore = jaccardSimilarity(toTokens(localNorm), toTokens(providerNorm))
  const keywordBoost = coreKeywordBoost(localNorm, providerNorm)
  return Math.min(1, tokenScore + containsBoost + keywordBoost)
}

function extractId(row: any): string {
  return String(row?.id ?? row?.product_id ?? row?.provider_product_id ?? row?.sku ?? '').trim()
}

function extractName(row: any): string {
  return String(row?.name ?? row?.title ?? row?.product_name ?? '').trim()
}

function extractPrice(row: any): number | null {
  const candidates = [
    row?.price,
    row?.selling_price,
    row?.final_price,
    row?.amount,
    row?.cost,
    row?.unit_price,
  ]

  for (const candidate of candidates) {
    const value = Number(candidate)
    if (Number.isFinite(value) && value > 0) return value
  }

  return null
}

function simplifyDailyProducts(rows: any[]): SimplifiedDailyProduct[] {
  return rows
    .map((row) => ({
      id: extractId(row),
      name: extractName(row),
      price: extractPrice(row),
    }))
    .filter((item) => Boolean(item.id) && Boolean(item.name))
}

async function fetchDailyCardProducts() {
  const res = await axios.get(`${API_BASE}/products/`, {
    headers: {
      'X-API-Key': API_KEY,
      'X-API-Secret': API_SECRET,
    },
    params: {
      page: 1,
      page_size: 100,
    },
    timeout: 20000,
  })

  const payload = res.data
  const rows =
    payload?.results ||
    payload?.data ||
    payload?.products ||
    payload?.items ||
    payload

  return simplifyDailyProducts(rows)
}

async function getHandler(
  _req: NextRequest,
  _user: JWTPayload
) {
  try {
    const simplified = await fetchDailyCardProducts()

    return NextResponse.json({
      success: true,
      count: simplified.length,
      data: simplified,
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: 'DailyCard request failed',
        error: error?.response?.data || error?.message,
      },
      { status: 500 }
    )
  }
}

async function postHandler(
  req: NextRequest,
  _user: JWTPayload
) {
  try {
    await connectDB()
    const dailyProducts = await fetchDailyCardProducts()

    if (!dailyProducts.length) {
      console.warn('No DailyCard products returned for linking')
      return NextResponse.json({
        success: true,
        message: 'No provider products to match',
        data: {
          scanned: 0,
          linked: 0,
          unchanged: 0,
          unclear: 0,
          syncTriggered: false,
        },
      })
    }

    const localProducts = await Product.find({})
      .select('_id productName gameName providerProductId')
      .lean()

    let linked = 0
    let unchanged = 0
    let unclear = 0

    for (const localProduct of localProducts) {
      const localName = String(localProduct?.productName || localProduct?.gameName || '').trim()
      if (!localName) {
        unchanged += 1
        continue
      }

      let best: SimplifiedDailyProduct | null = null
      let bestScore = 0

      for (const providerProduct of dailyProducts) {
        const score = scoreMatch(localName, providerProduct.name)
        if (score > bestScore) {
          bestScore = score
          best = providerProduct
        }
      }

      if (!best || bestScore < 0.5) {
        unclear += 1
        continue
      }

      const currentProviderId = String(localProduct.providerProductId || '').trim()
      if (currentProviderId === best.id) {
        unchanged += 1
        continue
      }

      await Product.updateOne(
        { _id: localProduct._id },
        {
          $set: {
            providerProductId: best.id,
          },
        }
      )

      linked += 1
    }

    let syncTriggered = false
    let syncStatus: number | null = null

    try {
      const syncRes = await fetch(new URL('/api/sync/dailycard-prices', req.url), {
        method: 'POST',
        cache: 'no-store',
      })
      syncTriggered = syncRes.ok
      syncStatus = syncRes.status
      if (!syncRes.ok) {
        console.warn('Price sync route returned non-OK status:', syncRes.status)
      }
    } catch (syncError: any) {
      console.warn('Failed to call price sync route after linking:', syncError?.message || syncError)
    }

    return NextResponse.json({
      success: true,
      message: 'Local products linking completed',
      data: {
        scanned: localProducts.length,
        linked,
        unchanged,
        unclear,
        syncTriggered,
        syncStatus,
      },
    })
  } catch (error: any) {
    console.warn('DailyCard linking process failed:', error?.message || error)
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to link local products with DailyCard',
      },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  if (!DEBUG_ENDPOINTS_ENABLED) {
    return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 })
  }
  return withAdminAuth(req, getHandler)
}

export async function POST(req: NextRequest) {
  if (!DEBUG_ENDPOINTS_ENABLED) {
    return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 })
  }
  return withAdminAuth(req, postHandler)
}