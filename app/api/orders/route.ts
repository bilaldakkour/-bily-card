import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'
import mongoose from 'mongoose'
import { connectDB } from '@/lib/db/mongodb'
import Order from '@/lib/models/Order'
import User from '@/lib/models/User'
import Wallet from '@/lib/models/Wallet'
import WalletTransaction from '@/lib/models/WalletTransaction'
import { extractToken, verifyToken } from '@/lib/auth/jwt'
import { getEffectivePriceForProduct } from '@/lib/pricing/engine'
import { getCatalogProductBySlug, getCatalogProducts } from '@/lib/data/catalogProducts'
import { generateOrderId } from '@/lib/utils/helpers'
import {
  getProviderApiConfig,
  providerHeaders,
  type ProviderApiConfig,
  type ProviderSlot,
} from '@/lib/providers/providerConfig'
import {
  normalizeProductProviderMode,
  type ProductProviderMode,
} from '@/lib/products/providerMode'
import { sendAdminNotification } from '@/lib/services/adminNotificationService'
import { isTestModeEnabled, logTestMode } from '@/lib/utils/testMode'
import { createTestModeOrder, getTestModeOrders, getTestModeUser } from '@/lib/utils/testModeStore'

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

interface NotificationUserProfile {
  displayName?: string
  username?: string
  email?: string
}

function toPositiveNumber(value: unknown): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return 0
  return parsed
}

function resolveNotificationUserName(
  profile: NotificationUserProfile | null | undefined,
  fallbackUsername?: string | null
) {
  const displayName = String(profile?.displayName || '').trim()
  if (displayName) return displayName

  const username = String(profile?.username || fallbackUsername || '').trim()
  if (username) return username

  const email = String(profile?.email || '').trim()
  if (email) return email

  return 'Unknown user'
}

function getProductProviderMode(
  catalogProduct: Awaited<ReturnType<typeof getCatalogProductBySlug>>,
  productId: string
): ProductProviderMode {
  const fallback = catalogProduct
    ? String(catalogProduct.id || '').startsWith('manual-')
      ? 'manual'
      : 'primary'
    : isLikelyProviderBackedProduct(productId)
      ? 'primary'
      : 'manual'

  return normalizeProductProviderMode(catalogProduct?.providerMode, fallback)
}

function getProviderSlotForMode(mode: ProductProviderMode): ProviderSlot | null {
  if (mode === 'manual') return null
  return mode === 'secondary' ? 'secondary' : 'primary'
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

function isPackageOptionOutOfStock(option?: string) {
  return /out of stock/i.test(String(option || ''))
}

function resolveCatalogPackageOption(
  product: Awaited<ReturnType<typeof getCatalogProductBySlug>>,
  selectedOption: string
) {
  const packageField = product?.inputFields?.find(
    (field) => field.type === 'select' && field.name === 'package'
  )

  const options = Array.isArray(packageField?.options) ? packageField.options.map((option) => String(option)) : []
  if (!options.length) return null

  const requested = String(selectedOption || '').trim()
  if (!requested) return null

  const exact = options.find((option) => option.trim() === requested)
  if (exact) return exact

  const requestedLabel = extractOptionName(requested)
  if (!requestedLabel) return null

  return (
    options.find((option) => extractOptionName(option).toLowerCase() === requestedLabel.toLowerCase()) || null
  )
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

function buildOrderResponse(order: any, productImage?: string) {
  return {
    _id: String(order._id),
    orderId: String(order.orderId || ''),
    productName: String(order.productName || ''),
    productSlug: String(order.productSlug || ''),
    productImage: String(productImage || ''),
    playerId: String(order.playerId || ''),
    quantity: Number(order.quantity || 1),
    price: Number(order.price || 0),
    total: Number(order.total || 0),
    walletBalanceBefore: Number(order.walletBalanceBefore || 0),
    walletBalanceAfter: Number(order.walletBalanceAfter || 0),
    status: String(order.status || 'pending'),
    providerStatus: String(order.providerStatus || ''),
    selectedPackageOption: String(order.selectedPackageOption || ''),
    notes: String(order.notes || ''),
    failureReason: String(order.failureReason || ''),
    createdAt: order.createdAt,
  }
}

type ProductImageLookup = {
  bySlug: Map<string, string>
  byName: Map<string, string>
}

function buildProductImageLookup(products: Awaited<ReturnType<typeof getCatalogProducts>>): ProductImageLookup {
  const bySlug = new Map<string, string>()
  const byName = new Map<string, string>()

  for (const product of products) {
    const slug = String(product.slug || '').trim().toLowerCase()
    const name = String(product.name || '').trim().toLowerCase()
    const image = String(product.image || '').trim()

    if (slug && image && !bySlug.has(slug)) {
      bySlug.set(slug, image)
    }

    if (name && image && !byName.has(name)) {
      byName.set(name, image)
    }
  }

  return { bySlug, byName }
}

function resolveOrderProductImage(order: any, lookup: ProductImageLookup) {
  const slug = String(order.productSlug || '').trim().toLowerCase()
  const name = String(order.productName || '').trim().toLowerCase()

  return lookup.bySlug.get(slug) || lookup.byName.get(name) || ''
}

async function fetchProviderProducts(
  config: ProviderApiConfig,
  search?: string
): Promise<ProviderProduct[]> {
  const response = await axios.get(`${config.base}/products/`, {
    headers: providerHeaders(config),
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
  providerConfig: ProviderApiConfig
}): Promise<ProviderProduct | null> {
  // For package products, require selected package matching first for all products.
  // If no safe match is found, we return null instead of risking wrong fulfillment.
  if (order.packageOption) {
    const preferredName = extractOptionName(order.packageOption)
    if (!preferredName) return null

    try {
      const searched = await fetchProviderProducts(order.providerConfig, preferredName)
      const matched = findMatchingProviderProduct(searched, preferredName)
      if (matched?.id) return matched
    } catch (error) {
      console.error('Provider package search failed:', error)
    }

    try {
      const allProducts = await fetchProviderProducts(order.providerConfig)
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
    const searched = await fetchProviderProducts(order.providerConfig, preferredName)
    const exact = searched.find((item) => normalizeText(item.name) === normalizedPreferred)
    if (exact?.id) return exact

    const includes = searched.find((item) => normalizeText(item.name).includes(normalizedPreferred))
    if (includes?.id) return includes
  } catch (error) {
    console.error('Provider search failed:', error)
  }

  try {
    const allProducts = await fetchProviderProducts(order.providerConfig)
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
  providerConfig: ProviderApiConfig
  providerProductId: number
  playerId: string
  quantity: number
  clientOrderId: string
}) {
  const response = await axios.post(
    `${params.providerConfig.base}/orders/create/`,
    {
      product: params.providerProductId,
      account_id: params.playerId,
      quantity: params.quantity,
      client_order_id: params.clientOrderId,
    },
    {
      headers: providerHeaders(params.providerConfig),
      timeout: 20000,
    }
  )

  return response.data
}

async function fetchProviderOrderStatus(order: {
  providerConfig: ProviderApiConfig
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

  const response = await axios.get(`${order.providerConfig.base}/orders/status/`, {
    headers: providerHeaders(order.providerConfig),
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

    if (isTestModeEnabled()) {
      logTestMode('orders/list requested', { userId: user.userId })

      const catalogProducts = await getCatalogProducts()
      const imageLookup = buildProductImageLookup(catalogProducts)

      const orders = getTestModeOrders().map((order) =>
        buildOrderResponse(order, resolveOrderProductImage(order, imageLookup))
      )

      return NextResponse.json({
        success: true,
        data: orders,
        testMode: true,
      })
    }

    await connectDB()

    const orderDocs = await Order.find({ userId: user.userId })
      .sort({ createdAt: -1 })
      .lean()

    for (const order of orderDocs) {
      const hasProviderReference = Boolean(
        order.providerOrderId ||
          order.providerResponse?.transaction_id ||
          order.providerResponse?.order_id
      )
      const needsSync = ['pending', 'processing'].includes(String(order.status || '').toLowerCase())
      const providerSlot =
        order.providerSlot === 'secondary'
          ? 'secondary'
          : order.providerSlot === 'manual'
            ? 'manual'
            : 'primary'

      if (!hasProviderReference || !needsSync || providerSlot === 'manual') continue

      const providerConfig = getProviderApiConfig(providerSlot)
      if (!providerConfig.enabled) continue

      try {
        const statusPayload = await fetchProviderOrderStatus({
          providerConfig,
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

    const catalogProducts = await getCatalogProducts()
    const imageLookup = buildProductImageLookup(catalogProducts)

    const orders = orderDocs.map((order) => {
      const image = resolveOrderProductImage(order, imageLookup)
      return buildOrderResponse(order, image)
    })

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
    let packageOption = typeof body.packageOption === 'string' ? body.packageOption.trim() : ''

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

    const matchedCatalogPackage = resolveCatalogPackageOption(catalogProduct, packageOption)
    const expectsPackageSelection = Boolean(
      catalogProduct?.inputFields?.some((field) => field.type === 'select' && field.name === 'package')
    )

    if (expectsPackageSelection) {
      if (!matchedCatalogPackage) {
        return NextResponse.json(
          { success: false, message: 'Please choose a valid package' },
          { status: 400 }
        )
      }

      if (isPackageOptionOutOfStock(matchedCatalogPackage)) {
        return NextResponse.json(
          { success: false, message: 'This package is currently out of stock' },
          { status: 400 }
        )
      }

      packageOption = matchedCatalogPackage
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

    const productProviderMode = getProductProviderMode(catalogProduct, productId)
    const providerSlot = getProviderSlotForMode(productProviderMode)
    const providerConfig = providerSlot ? getProviderApiConfig(providerSlot) : null

    if (isTestModeEnabled()) {
      const mockUser = getTestModeUser()

      if (Number(mockUser.walletBalance?.usd || 0) < effectiveTotal) {
        return NextResponse.json(
          { success: false, message: 'Insufficient wallet balance' },
          { status: 400 }
        )
      }

      logTestMode('orders/create payload', {
        userId: user.userId,
        productId,
        slug,
        name,
        playerId: cleanPlayerId,
        quantity,
        total,
        effectiveTotal,
        packageOption,
      })

      logTestMode('orders/package-mapping', {
        productId,
        slug,
        catalogProductName: catalogProduct?.name || null,
        packageOption: packageOption || null,
        mode: packageOption ? 'package' : countRules ? 'count' : 'single',
        quantity,
      })

      const result = createTestModeOrder({
        productId,
        slug,
        name,
        playerId: cleanPlayerId,
        quantity,
        total: effectiveTotal,
        packageOption: packageOption || undefined,
      })

      return NextResponse.json({
        success: true,
        orderId: result.order.orderId,
        providerStatus: result.order.providerStatus,
        message: 'Test mode order created successfully',
        data: {
          order: buildOrderResponse(result.order, String(catalogProduct?.image || '')),
        },
        testMode: true,
      })
    }

    await connectDB()

    const orderUserProfile = (await User.findById(user.userId)
      .select('displayName username email')
      .lean()) as NotificationUserProfile | null

    let resolvedProviderProduct: ProviderProduct | null = null

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
            selectedPackageOption: packageOption || undefined,
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
            providerSlot: providerSlot || 'manual',
            providerStatus: providerSlot ? 'pending' : 'local_only',
            notes: providerSlot ? 'Order created locally' : 'Order created locally for manual processing',
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

    if (providerSlot && providerConfig?.enabled) {
      try {
        const providerProduct =
          resolvedProviderProduct ||
          (await resolveProviderProduct({
            productId,
            name,
            packageOption,
            providerConfig,
          }))

        if (providerProduct?.id) {
          const providerResult = await createProviderOrder({
            providerConfig,
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
          order.providerMatchedProductName = String(providerProduct.name || '')
          order.providerMatchMode = packageOption ? 'package-option' : 'product-id-or-name'
          order.providerOrderId = providerOrderId || undefined
          order.providerSlot = providerSlot
          order.providerStatus = providerStatus
          order.providerUnitCost = providerUnitCost
          order.providerTotalCost = providerTotalCost
          order.grossProfit = grossProfit
          order.providerResponse = providerResult
          order.status = mapProviderStatusToLocal(providerStatus)
          order.notes = `Submitted to ${providerConfig.label}`
        } else {
          order.providerSlot = providerSlot
          order.providerStatus = 'local_only'
          order.providerMatchMode = packageOption ? 'package-option-no-match' : 'unresolved'
          order.notes = `${providerConfig.label} product not found, kept for local/manual processing`
        }
      } catch (error: any) {
        order.providerSlot = providerSlot
        order.providerStatus = 'submit_failed'
        order.providerMatchMode = packageOption ? 'package-option-submit-failed' : 'submit-failed'
        order.notes = `${providerConfig.label} submission failed, kept for local/manual processing`
        order.failureReason =
          error?.response?.data?.error ||
          error?.response?.data?.message ||
          error?.message ||
          'Provider submission failed'
      }
    } else if (providerSlot && !providerConfig?.enabled) {
      order.providerSlot = providerSlot
      order.providerStatus = 'local_only'
      order.notes = `${providerSlot === 'secondary' ? 'Secondary' : 'Primary'} API is not configured, kept for local/manual processing`
    } else {
      order.providerSlot = 'manual'
      order.providerStatus = 'local_only'
      order.notes = 'Product is set to manual mode, kept for local/manual processing'
    }

    await order.save()

    await sendAdminNotification({
      title: 'New Order - Bily Card',
      lines: [
        `Customer: ${resolveNotificationUserName(orderUserProfile, user.username)}`,
        `Order ID: ${orderId}`,
        `Product: ${name}`,
        packageOption ? `Package: ${packageOption}` : null,
        `Player ID: ${cleanPlayerId}`,
        `Quantity: ${quantity}`,
        `Total: $${effectiveTotal.toFixed(2)}`,
        `Provider Mode: ${productProviderMode}`,
        providerSlot ? `Provider Slot: ${providerSlot}` : 'Provider Slot: manual',
      ],
    })

    return NextResponse.json({
      success: true,
      orderId,
      providerStatus: order.providerStatus,
      message: 'Order created successfully',
      data: {
        order: buildOrderResponse(order, String(catalogProduct?.image || '')),
      },
    })
  } catch (error) {
    console.error('Order creation error:', error)

    return NextResponse.json(
      { success: false, message: 'Failed to create order' },
      { status: 500 }
    )
  }
}
