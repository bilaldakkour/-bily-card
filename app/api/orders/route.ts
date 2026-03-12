import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'
import mongoose from 'mongoose'
import { connectDB } from '@/lib/db/mongodb'
import Order from '@/lib/models/Order'
import Wallet from '@/lib/models/Wallet'
import WalletTransaction from '@/lib/models/WalletTransaction'
import { extractToken, verifyToken } from '@/lib/auth/jwt'
import { getEffectivePriceForProduct } from '@/lib/pricing/engine'
import { getCatalogProductBySlug, getCatalogProducts } from '@/lib/data/catalogProducts'
import { generateOrderId } from '@/lib/utils/helpers'

interface OrderRequest {
  productId: string
  slug?: string
  name: string
  price: number
  playerId: string
  quantity: number
  total: number
  packageOption?: string
}

interface ProviderProduct {
  id: number
  name: string
  available?: boolean
  price?: string | number
}

function toPositiveNumber(value: unknown): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return 0
  return parsed
}

const PROVIDER_BASE =
  process.env.DAILYCARD_API_BASE ||
  process.env.PROVIDER_API_URL ||
  'https://dailycard.shop/UAPI/api-keys'

const PROVIDER_KEY = process.env.DAILYCARD_API_KEY || process.env.PROVIDER_API_KEY || ''
const PROVIDER_SECRET = process.env.DAILYCARD_API_SECRET || process.env.PROVIDER_API_SECRET || ''

function providerHeaders() {
  return {
    'Content-Type': 'application/json',
    'X-API-Key': PROVIDER_KEY,
    'X-API-Secret': PROVIDER_SECRET,
  }
}

function providerEnabled() {
  return Boolean(PROVIDER_KEY && PROVIDER_SECRET)
}

function normalizeText(value: string) {
  return String(value || '')
    .toLowerCase()
    .replace(/[,_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractOptionName(option?: string) {
  if (!option) return ''
  const [left] = option.split(' - ')
  return left?.trim() || option.trim()
}

function extractNumberTokens(value: string): string[] {
  const matches = String(value || '').match(/\d+(?:\.\d+)?/g)
  if (!matches) return []
  return matches.map((token) => token.trim()).filter(Boolean)
}

function matchesPackageCandidate(preferred: string, candidateName: string): boolean {
  const normalizedPreferred = normalizeText(preferred)
  const normalizedCandidate = normalizeText(candidateName)

  if (!normalizedPreferred || !normalizedCandidate) return false

  if (normalizedPreferred === normalizedCandidate) return true

  const preferredNumbers = extractNumberTokens(normalizedPreferred)
  const candidateNumbers = extractNumberTokens(normalizedCandidate)

  // If package text contains numeric identifiers (e.g. 60/325/660),
  // require exact numeric token match to avoid mapping 660 -> 60.
  if (preferredNumbers.length > 0) {
    const allNumbersMatch = preferredNumbers.every((token) => candidateNumbers.includes(token))
    if (!allNumbersMatch) return false
  }

  return normalizedCandidate.includes(normalizedPreferred) || normalizedPreferred.includes(normalizedCandidate)
}

function findMatchingProviderProduct(
  products: ProviderProduct[],
  preferredName: string
): ProviderProduct | null {
  for (const item of products) {
    if (!item?.id) continue
    if (matchesPackageCandidate(preferredName, String(item.name || ''))) {
      return item
    }
  }

  return null
}

function mapProviderStatusToLocal(status?: string) {
  const value = String(status || '').toLowerCase()
  if (value === 'completed') return 'completed'
  if (value === 'cancelled') return 'refunded'
  if (value === 'pending') return 'pending'
  return 'pending'
}

function isLikelyProviderBackedProduct(productId: string) {
  const normalized = String(productId || '').trim().toLowerCase();
  if (!normalized) return false;
  if (/^\d+$/.test(normalized)) return true;
  return normalized.startsWith('pkg-');
}

function getProductCountRules(product: Awaited<ReturnType<typeof getCatalogProductBySlug>>) {
  const countField = product?.inputFields?.find(
    (field) => field.type === 'number' && field.name === 'count'
  )

  if (!countField) return null

  const rawMin = Number(countField.validation?.min)
  const rawMax = Number(countField.validation?.max)

  const min = Number.isFinite(rawMin) && rawMin > 0 ? rawMin : 1
  const hasValidMax = Number.isFinite(rawMax) && rawMax >= min

  return {
    min,
    max: hasValidMax ? rawMax : null,
  }
}

async function fetchProviderProducts(search?: string): Promise<ProviderProduct[]> {
  const response = await axios.get(`${PROVIDER_BASE}/products/`, {
    headers: providerHeaders(),
    params: {
      page: 1,
      page_size: 5000,
      ...(search ? { search } : {}),
    },
    timeout: 20000,
  })

  const payload = response.data
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.results)) return payload.results
  if (Array.isArray(payload?.data)) return payload.data
  if (Array.isArray(payload?.products)) return payload.products
  if (Array.isArray(payload?.items)) return payload.items
  return []
}

async function resolveProviderProduct(order: {
  productId: string
  name: string
  packageOption?: string
}): Promise<ProviderProduct | null> {
  // For package products, require selected package matching first for all products.
  // If no safe match is found, we return null instead of risking wrong fulfillment.
  if (order.packageOption) {
    const preferredName = extractOptionName(order.packageOption)
    if (!preferredName) return null

    try {
      const searched = await fetchProviderProducts(preferredName)
      const matched = findMatchingProviderProduct(searched, preferredName)
      if (matched?.id) return matched
    } catch (error) {
      console.error('Provider package search failed:', error)
    }

    try {
      const allProducts = await fetchProviderProducts()
      const matched = findMatchingProviderProduct(allProducts, preferredName)
      if (matched?.id) return matched
    } catch (error) {
      console.error('Provider package full scan failed:', error)
    }

    return null
  }

  const pkgMatch = String(order.productId || '').trim().toLowerCase().match(/^pkg-(\d+)$/)
  if (pkgMatch?.[1]) {
    return {
      id: Number(pkgMatch[1]),
      name: order.name,
    }
  }

  const direct = Number(order.productId)
  if (Number.isFinite(direct) && direct > 0) {
    return {
      id: direct,
      name: order.name,
    }
  }

  const preferredName = extractOptionName(order.packageOption) || order.name
  const normalizedPreferred = normalizeText(preferredName)

  try {
    const searched = await fetchProviderProducts(preferredName)
    const exact = searched.find((item) => normalizeText(item.name) === normalizedPreferred)
    if (exact?.id) return exact

    const includes = searched.find((item) => normalizeText(item.name).includes(normalizedPreferred))
    if (includes?.id) return includes
  } catch (error) {
    console.error('Provider search failed:', error)
  }

  try {
    const allProducts = await fetchProviderProducts()
    const exact = allProducts.find((item) => normalizeText(item.name) === normalizedPreferred)
    if (exact?.id) return exact

    const startsWith = allProducts.find((item) => normalizeText(item.name).startsWith(normalizedPreferred))
    if (startsWith?.id) return startsWith
  } catch (error) {
    console.error('Provider full product scan failed:', error)
  }

  return null
}

function extractProviderUnitCost(
  providerResult: Record<string, any> | null | undefined,
  fallbackUnitCost: number
): number {
  const candidates = [
    providerResult?.unit_price,
    providerResult?.price,
    providerResult?.cost,
    providerResult?.data?.unit_price,
    providerResult?.data?.price,
    providerResult?.data?.cost,
    providerResult?.details?.unit_price,
    providerResult?.details?.price,
    providerResult?.details?.cost,
  ]

  for (const candidate of candidates) {
    const value = toPositiveNumber(candidate)
    if (value > 0) return value
  }

  return toPositiveNumber(fallbackUnitCost)
}

async function createProviderOrder(params: {
  providerProductId: number
  playerId: string
  quantity: number
  clientOrderId: string
}) {
  const response = await axios.post(
    `${PROVIDER_BASE}/orders/create/`,
    {
      product: params.providerProductId,
      account_id: params.playerId,
      quantity: params.quantity,
      client_order_id: params.clientOrderId,
    },
    {
      headers: providerHeaders(),
      timeout: 20000,
    }
  )

  return response.data
}

async function fetchProviderOrderStatus(order: {
  orderId: string
  providerOrderId?: string
  providerResponse?: Record<string, unknown>
}) {
  const query: Record<string, string> = {
    client_order_id: order.orderId,
  }

  const transactionId = String(order.providerResponse?.transaction_id || '')
  if (transactionId) query.transaction_id = transactionId

  if (order.providerOrderId) query.order_id = String(order.providerOrderId)

  const response = await axios.get(`${PROVIDER_BASE}/orders/status/`, {
    headers: providerHeaders(),
    params: query,
    timeout: 15000,
  })

  return response.data
}

async function sendTelegramMessage(orderId: string, orderData: OrderRequest) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID || process.env.TELEGRAM_ADMIN_CHAT_ID

  if (!botToken || !chatId) {
    console.warn('Telegram credentials not configured: TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID/TELEGRAM_ADMIN_CHAT_ID are required')
    return false
  }

  const message = `🛒 New Order - Bily Card

Order ID: ${orderId}
Product: ${orderData.name}
Player ID: ${orderData.playerId}
Quantity: ${orderData.quantity}
Total: $${orderData.total.toFixed(2)}`

  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`
    const response = await axios.post(
      url,
      {
        chat_id: chatId,
        text: message,
      },
      {
        timeout: 15000,
        headers: { 'Content-Type': 'application/json' },
      }
    )

    const data = response.data

    if (!data?.ok) {
      console.error('Telegram API error:', data)
      return false
    }

    return true
  } catch (error: any) {
    const code = error?.code || error?.cause?.code
    if (code === 'ECONNABORTED' || code === 'UND_ERR_CONNECT_TIMEOUT') {
      console.warn('Telegram timeout: message was not sent, order flow continues safely')
      return false
    }

    console.error('Failed to send Telegram message:', error?.response?.data || error?.message || error)
    return false
  }
}

export async function GET(request: NextRequest) {
  try {
    const token = extractToken(request.headers.get('authorization'))

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const user = verifyToken(token)

    if (!user?.userId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    await connectDB()

    const orderDocs = await Order.find({ userId: user.userId })
      .sort({ createdAt: -1 })
      .lean()

    if (providerEnabled()) {
      for (const order of orderDocs) {
        const hasProviderReference = Boolean(
          order.providerOrderId ||
            order.providerResponse?.transaction_id ||
            order.providerResponse?.order_id
        )
        const needsSync = ['pending', 'processing'].includes(String(order.status || '').toLowerCase())

        if (!hasProviderReference || !needsSync) continue

        try {
          const statusPayload = await fetchProviderOrderStatus({
            orderId: String(order.orderId),
            providerOrderId: order.providerOrderId,
            providerResponse: order.providerResponse,
          })

          const providerStatus = String(
            statusPayload?.status ||
              statusPayload?.order_status ||
              statusPayload?.data?.status ||
              statusPayload?.details?.status ||
              order.providerStatus ||
              'pending'
          ).toLowerCase()

          const mappedStatus = mapProviderStatusToLocal(providerStatus)

          if (mappedStatus === 'refunded' && order.status !== 'refunded') {
            const refundAmount = Number(order.total || 0)
            if (refundAmount > 0) {
              await Wallet.updateOne(
                { userId: order.userId },
                {
                  $inc: { balance_usd: refundAmount },
                  $set: { lastUpdated: new Date() },
                }
              )
            }
          }

          if (mappedStatus !== order.status || providerStatus !== order.providerStatus) {
            await Order.updateOne(
              { _id: order._id },
              {
                $set: {
                  status: mappedStatus,
                  providerStatus,
                  providerResponse: statusPayload,
                  notes:
                    mappedStatus === 'refunded'
                      ? 'Auto refunded after provider cancellation'
                      : order.notes,
                  failureReason:
                    providerStatus === 'cancelled'
                      ? 'Provider cancelled order and refunded balance at source'
                      : order.failureReason,
                },
              }
            )

            order.status = mappedStatus
            order.providerStatus = providerStatus
            order.providerResponse = statusPayload
          }
        } catch (error) {
          console.error('Provider status sync failed:', order.orderId, error)
        }
      }
    }

    const orders = orderDocs.map((order) => ({
      _id: String(order._id),
      orderId: order.orderId,
      productName: order.productName,
      playerId: order.playerId,
      quantity: order.quantity,
      price: order.price,
      total: order.total,
      walletBalanceBefore: Number(order.walletBalanceBefore || 0),
      walletBalanceAfter: Number(order.walletBalanceAfter || 0),
      status: order.status,
      providerStatus: order.providerStatus,
      createdAt: order.createdAt,
    }))

    return NextResponse.json({
      success: true,
      data: orders,
    })
  } catch (error) {
    console.error('Orders fetch error:', error)

    return NextResponse.json(
      { success: false, message: 'Failed to fetch orders' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<OrderRequest>

    const productId = typeof body.productId === 'string' ? body.productId.trim() : ''
    const slug = typeof body.slug === 'string' ? body.slug.trim() : ''
    const providedName = typeof body.name === 'string' ? body.name.trim() : ''
    const cleanPlayerId = typeof body.playerId === 'string' ? body.playerId.trim() : ''
    const packageOption = typeof body.packageOption === 'string' ? body.packageOption.trim() : ''

    if (!productId || !cleanPlayerId) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      )
    }

    const providedPrice = Number(body.price)
    const quantity = Number(body.quantity)
    const total = Number(body.total)

    const normalizedSlug = String(slug || '').trim().toLowerCase()
    const catalogBySlug = normalizedSlug ? await getCatalogProductBySlug(normalizedSlug) : undefined
    let catalogById: Awaited<ReturnType<typeof getCatalogProductBySlug>> | undefined

    if (!catalogBySlug) {
      const catalogProducts = await getCatalogProducts()
      catalogById = catalogProducts.find((item) => {
        const itemId = String(item.id || '').trim().toLowerCase()
        const itemSlug = String(item.slug || '').trim().toLowerCase()
        const wanted = String(productId || '').trim().toLowerCase()
        return itemId === wanted || itemSlug === wanted
      })
    }

    const catalogProduct = catalogBySlug || catalogById
    const name = providedName || String(catalogProduct?.name || '').trim()
    const price = Number.isFinite(providedPrice) && providedPrice > 0
      ? providedPrice
      : Number(catalogProduct?.price || 0)

    if (!name) {
      return NextResponse.json(
        { success: false, message: 'Product name is required' },
        { status: 400 }
      )
    }

    if (!Number.isFinite(price) || !Number.isFinite(quantity)) {
      return NextResponse.json(
        { success: false, message: 'Invalid numeric fields' },
        { status: 400 }
      )
    }

    if (price <= 0 || price > 1_000_000) {
      return NextResponse.json(
        { success: false, message: 'Price is out of allowed range' },
        { status: 400 }
      )
    }

    const countRules = getProductCountRules(catalogProduct)
    const minQuantity = countRules?.min ?? 1
    const maxQuantity = countRules?.max ?? 1000

    if (!Number.isInteger(quantity) || quantity < minQuantity || quantity > maxQuantity) {
      const message = countRules?.max
        ? `Quantity must be an integer between ${minQuantity} and ${maxQuantity}`
        : `Quantity must be an integer greater than or equal to ${minQuantity}`

      return NextResponse.json(
        { success: false, message },
        { status: 400 }
      )
    }

    if (total <= 0 || total > 1_000_000) {
      return NextResponse.json(
        { success: false, message: 'Total is out of allowed range' },
        { status: 400 }
      )
    }

    if (cleanPlayerId.length < 3 || cleanPlayerId.length > 64) {
      return NextResponse.json(
        { success: false, message: 'Player ID must be between 3 and 64 characters' },
        { status: 400 }
      )
    }

    if (name.length > 200 || packageOption.length > 200) {
      return NextResponse.json(
        { success: false, message: 'One or more fields exceed allowed length' },
        { status: 400 }
      )
    }

    const orderId = generateOrderId()

    const token = extractToken(request.headers.get('authorization'))
    const user = token ? verifyToken(token) : null

    if (!user?.userId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    await connectDB()

    let resolvedProviderProduct: ProviderProduct | null = null

    const pricing = await getEffectivePriceForProduct({
      slug,
      fallbackPrice: price,
      userId: user.userId,
    })

    const baseUnitPrice = Number(pricing.basePrice || 0)
    const effectiveUnitPrice = Number(pricing.effectivePrice || 0)
    const effectiveTotal = Number(
      (effectiveUnitPrice * quantity).toFixed(6)
    )
    const estimatedProviderTotalCost = Number((baseUnitPrice * quantity).toFixed(6))
    const estimatedGrossProfit = Number(
      (effectiveTotal - estimatedProviderTotalCost).toFixed(6)
    )

    if (!Number.isFinite(effectiveTotal) || effectiveTotal <= 0) {
      return NextResponse.json(
        { success: false, message: 'Invalid order total' },
        { status: 400 }
      )
    }

    const session = await mongoose.startSession()
    let order: any = null

    try {
      session.startTransaction()

      const updatedWallet = await Wallet.findOneAndUpdate(
        {
          userId: user.userId,
          balance_usd: { $gte: effectiveTotal },
        },
        {
          $inc: { balance_usd: -effectiveTotal },
          $set: { lastUpdated: new Date() },
        },
        { new: true, session }
      )

      if (!updatedWallet) {
        await session.abortTransaction()
        return NextResponse.json(
          { success: false, message: 'Insufficient wallet balance' },
          { status: 400 }
        )
      }

      const walletBalanceAfter = Number(updatedWallet.balance_usd || 0)
      const walletBalanceBefore = Number((walletBalanceAfter + effectiveTotal).toFixed(6))

      const createdOrders = await Order.create(
        [
          {
            orderId,
            userId: user.userId,
            productId,
            productName: name,
            productSlug: slug || undefined,
            playerId: cleanPlayerId,
            quantity,
            price: effectiveUnitPrice,
            baseUnitPrice,
            providerUnitCost: baseUnitPrice,
            providerTotalCost: estimatedProviderTotalCost,
            grossProfit: estimatedGrossProfit,
            total: effectiveTotal,
            walletBalanceBefore,
            walletBalanceAfter,
            currency: 'USD',
            status: 'pending',
            providerStatus: 'pending',
            notes: 'Order created locally',
          },
        ],
        { session }
      )

      order = createdOrders[0]

      await WalletTransaction.create(
        [
          {
            userId: user.userId,
            type: 'purchase',
            amount: effectiveTotal,
            currency: 'USD',
            balanceBefore: walletBalanceBefore,
            balanceAfter: walletBalanceAfter,
            orderId: order._id,
            notes: `Purchase: ${name}`,
          },
        ],
        { session }
      )

      await session.commitTransaction()
    } catch (transactionError) {
      await session.abortTransaction()
      throw transactionError
    } finally {
      session.endSession()
    }

    if (providerEnabled()) {
      try {
        const providerProduct =
          resolvedProviderProduct ||
          (await resolveProviderProduct({
            productId,
            name,
            packageOption,
          }))

        if (providerProduct?.id) {
          const providerResult = await createProviderOrder({
            providerProductId: Number(providerProduct.id),
            playerId: cleanPlayerId,
            quantity,
            clientOrderId: orderId,
          })

          const providerStatus = String(
            providerResult?.status ||
              providerResult?.order_status ||
              providerResult?.data?.status ||
              'pending'
          ).toLowerCase()

          const providerOrderId = String(
            providerResult?.order_id || providerResult?.id || providerResult?.data?.order_id || ''
          )

          const providerUnitCost = extractProviderUnitCost(
            providerResult,
            toPositiveNumber(providerProduct.price) || baseUnitPrice
          )
          const providerTotalCost = Number((providerUnitCost * quantity).toFixed(6))
          const grossProfit = Number((effectiveTotal - providerTotalCost).toFixed(6))

          order.providerProductId = String(providerProduct.id)
          order.providerOrderId = providerOrderId || undefined
          order.providerStatus = providerStatus
          order.providerUnitCost = providerUnitCost
          order.providerTotalCost = providerTotalCost
          order.grossProfit = grossProfit
          order.providerResponse = providerResult
          order.status = mapProviderStatusToLocal(providerStatus)
          order.notes = 'Submitted to DailyCard provider'
        } else {
          order.providerStatus = 'local_only'
          order.notes = 'Product not found at provider, kept for local/manual processing'
        }
      } catch (error: any) {
        order.providerStatus = 'submit_failed'
        order.notes = 'Provider submission failed, kept for local/manual processing'
        order.failureReason =
          error?.response?.data?.error ||
          error?.response?.data?.message ||
          error?.message ||
          'Provider submission failed'
      }
    } else {
      order.providerStatus = 'local_only'
      order.notes = 'Provider credentials missing, kept for local/manual processing'
    }

    await order.save()

    void sendTelegramMessage(orderId, {
      productId,
      slug,
      name,
      price,
      playerId: cleanPlayerId,
      quantity,
      total: effectiveTotal,
      packageOption,
    })

    return NextResponse.json({
      success: true,
      orderId,
      providerStatus: order.providerStatus,
      message: 'Order created successfully',
    })
  } catch (error) {
    console.error('Order creation error:', error)

    return NextResponse.json(
      { success: false, message: 'Failed to create order' },
      { status: 500 }
    )
  }
}