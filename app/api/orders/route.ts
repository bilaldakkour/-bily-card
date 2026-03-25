import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'
import { randomUUID } from 'crypto'
import mongoose from 'mongoose'
import { connectDB } from '@/lib/db/mongodb'
import CustomProduct from '@/lib/models/CustomProduct'
import Order from '@/lib/models/Order'
import ProductOverride from '@/lib/models/ProductOverride'
import User from '@/lib/models/User'
import Wallet from '@/lib/models/Wallet'
import WalletTransaction from '@/lib/models/WalletTransaction'
import BlockedPlayerId from '@/lib/models/BlockedPlayerId'
import { extractToken, verifyToken } from '@/lib/auth/jwt'
import { AUTH_COOKIE_NAME } from '@/lib/auth/cookies'
import { isEmailReverificationRequired } from '@/lib/auth/reverification'
import { restoreManagedStockBySlug } from '@/lib/orders/managedStock'
import {
  mapProviderStatusToLocal,
  resolveProviderOrderSync,
} from '@/lib/orders/providerSync'
import { refundOrderAndRestoreStock } from '@/lib/orders/refundRecovery'
import {
  calculateManualCountTotalRounded,
  calculateManualInternalCostTotal,
  calculateManualInternalCostUnitPrice,
  calculateManualInternalProfitTotal,
  isManualCountProduct,
} from '@/lib/pricing/manualCount'
import { getEffectivePriceForProduct } from '@/lib/pricing/engine'
import {
  getCatalogProductBySlug,
  getCatalogProducts,
  invalidateCatalogProductsCache,
} from '@/lib/data/catalogProducts'
import { generateOrderId } from '@/lib/utils/helpers'
import {
  providerHeaders,
  type ProviderApiConfig,
  type ProviderSlot,
} from '@/lib/providers/providerConfig'
import { createRoutedOrder } from '@/lib/orders/providerRoutingService'
import {
  normalizeProductProviderMode,
  type ProductProviderMode,
} from '@/lib/products/providerMode'
import { isProductAvailable } from '@/lib/products/stock'
import type { ProductProviderLink } from '@/lib/data/products'
import { sendAdminNotification } from '@/lib/services/adminNotificationService'
import { enforceRateLimit } from '@/lib/utils/rateLimit'
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

type ProviderSubmissionError = Error & {
  providerBalanceIssue?: boolean
  providerMessage?: string
  providerPayload?: unknown
}

type ManagedStockTarget =
  | {
      kind: 'custom'
      slug: string
    }
  | {
      kind: 'override'
      slug: string
    }

type ManagedStockReservation =
  | {
      status: 'reserved'
      target: ManagedStockTarget
      remainingQuantity: number
    }
  | {
      status: 'insufficient'
      target: ManagedStockTarget
    }
  | {
      status: 'not_managed'
    }

async function ensureActiveSessionUser(userId: string) {
  const authUser = (await User.findById(userId)
    .select('email role isBlocked isVerified lastEmailVerificationAt forceEmailReauth')
    .lean()) as {
      email?: string
      role?: string
      isBlocked?: boolean
      isVerified?: boolean
      lastEmailVerificationAt?: Date | string | null
      forceEmailReauth?: boolean | null
    } | null

  if (!authUser || authUser.isBlocked) {
    return NextResponse.json(
      { success: false, message: 'Account is inactive' },
      { status: 403 }
    )
  }

  if (authUser.role !== 'admin' && !authUser.isVerified) {
    return NextResponse.json(
      { success: false, message: 'Please verify your email first' },
      { status: 403 }
    )
  }

  if (
    isEmailReverificationRequired({
      role: authUser.role,
      isVerified: authUser.isVerified,
      lastEmailVerificationAt: authUser.lastEmailVerificationAt,
      forceEmailReauth: authUser.forceEmailReauth,
    })
  ) {
    return NextResponse.json(
      {
        success: false,
        requiresVerification: true,
        verificationType: 'reauth',
        message: 'Email verification expired. Please sign in again and verify your email.',
        data: {
          email: authUser.email || '',
        },
      },
      { status: 403 }
    )
  }

  return null
}

const PROVIDER_SUPPORT_MESSAGE_AR = 'الرجاء المتابعة مع BilyCard Support.'
const PROVIDER_SUPPORT_MESSAGE_EN = 'Please follow up with BilyCard Support.'
const PROVIDER_SUPPORT_MESSAGES = [PROVIDER_SUPPORT_MESSAGE_AR, PROVIDER_SUPPORT_MESSAGE_EN]

function resolveRequestLanguage(request: NextRequest): 'ar' | 'en' {
  const custom = String(request.headers.get('x-bilycard-language') || '')
    .trim()
    .toLowerCase()
  if (custom.startsWith('ar')) return 'ar'
  if (custom.startsWith('en')) return 'en'

  const acceptLanguage = String(request.headers.get('accept-language') || '').toLowerCase()
  return acceptLanguage.includes('ar') ? 'ar' : 'en'
}

function getProviderSupportMessage(language: 'ar' | 'en') {
  return language === 'ar' ? PROVIDER_SUPPORT_MESSAGE_AR : PROVIDER_SUPPORT_MESSAGE_EN
}

function toPositiveNumber(value: unknown): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return 0
  return parsed
}

function normalizePlayerIdForBlock(value: unknown) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
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

async function getExplicitManualCustomCostPrice(slug: string): Promise<number | null> {
  const normalizedSlug = String(slug || '').trim().toLowerCase()
  if (!normalizedSlug) return null

  const manualProduct = (await CustomProduct.findOne({
    slug: normalizedSlug,
    active: true,
  })
    .select('costPrice')
    .lean()) as { costPrice?: number } | null

  const costPrice = Number(manualProduct?.costPrice)
  if (!Number.isFinite(costPrice) || costPrice < 0) {
    return null
  }

  return costPrice
}

function normalizeVariantKey(value: unknown) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9 ]+/g, '')
    .trim()
}

function resolveVariantKeyFromPackageOption(option?: string) {
  const raw = String(option || '').trim()
  if (!raw) return '__default__'
  const [pipeLeft] = raw.split('|')
  const [dashLeft] = String(pipeLeft || raw).split(' - ')
  return normalizeVariantKey(dashLeft || pipeLeft || raw) || '__default__'
}

function normalizeProviderLinks(value: unknown): ProductProviderLink[] {
  if (!Array.isArray(value)) return []
  const rows: ProductProviderLink[] = []
  const seen = new Set<string>()
  for (const raw of value as Array<Record<string, unknown>>) {
    const providerCode = String(raw?.providerCode || '').trim().toLowerCase()
    const providerProductId = String(raw?.providerProductId || '').trim()
    if (!providerCode || !providerProductId) continue
    const dedupe = `${providerCode}|${providerProductId.toLowerCase()}`
    if (seen.has(dedupe)) continue
    seen.add(dedupe)
    rows.push({
      providerCode,
      providerProductId,
      providerProductName: String(raw?.providerProductName || '').trim() || undefined,
      enabled: raw?.enabled !== false,
      executionEnabled: raw?.executionEnabled !== false,
      priceSyncEnabled: raw?.priceSyncEnabled !== false,
      priority: Number.isFinite(Number(raw?.priority)) ? Number(raw?.priority) : 100,
      priceSource: String(raw?.priceSource || '').toLowerCase() === 'manual' ? 'manual' : 'provider',
      manualCost: Number.isFinite(Number(raw?.manualCost)) ? Number(raw?.manualCost) : undefined,
      lastKnownCost: Number.isFinite(Number(raw?.lastKnownCost)) ? Number(raw?.lastKnownCost) : undefined,
      lastCost: Number.isFinite(Number(raw?.lastCost)) ? Number(raw?.lastCost) : undefined,
      providerAvailability:
        String(raw?.providerAvailability || '').toLowerCase() === 'available'
          ? 'available'
          : String(raw?.providerAvailability || '').toLowerCase() === 'unavailable'
            ? 'unavailable'
            : 'unknown',
      healthStatus:
        String(raw?.healthStatus || '').toLowerCase() === 'healthy'
          ? 'healthy'
          : String(raw?.healthStatus || '').toLowerCase() === 'degraded'
            ? 'degraded'
            : String(raw?.healthStatus || '').toLowerCase() === 'unhealthy'
              ? 'unhealthy'
              : 'unknown',
      fallbackEnabled: raw?.fallbackEnabled !== false,
      lastError: String(raw?.lastError || '').trim() || undefined,
      variantKey: String(raw?.variantKey || '').trim().toLowerCase() || undefined,
      lastSyncAt: raw?.lastSyncAt ? String(raw.lastSyncAt) : undefined,
    })
  }
  return rows
}

async function getScopedProviderLinksForOrder(input: {
  slug: string
  packageOption?: string
  fallbackLinks?: ProductProviderLink[]
}) {
  const normalizedSlug = String(input.slug || '').trim().toLowerCase()
  if (!normalizedSlug) return Array.isArray(input.fallbackLinks) ? input.fallbackLinks : []

  const custom = (await CustomProduct.findOne({ slug: normalizedSlug, active: true })
    .select('providerLinks packageOptions.providerLinks packageOptions.key packageOptions.label')
    .lean()) as
    | {
        providerLinks?: ProductProviderLink[]
        packageOptions?: Array<{ key?: string; label?: string; providerLinks?: ProductProviderLink[] }>
      }
    | null

  if (!custom) return Array.isArray(input.fallbackLinks) ? input.fallbackLinks : []

  const variantKey = resolveVariantKeyFromPackageOption(input.packageOption)
  const packageRows = Array.isArray(custom.packageOptions) ? custom.packageOptions : []
  const matchedVariant = packageRows.find((pkg) => {
    const key = normalizeVariantKey(pkg?.key || pkg?.label || '')
    return key && key === variantKey
  })
  const variantLinks = normalizeProviderLinks(matchedVariant?.providerLinks)
  if (variantLinks.length > 0) return variantLinks

  const productLinks = normalizeProviderLinks(custom.providerLinks)
  if (variantKey === '__default__') {
    return productLinks
  }

  const scoped = productLinks.filter((link) => normalizeVariantKey(link.variantKey || '') === variantKey)
  if (scoped.length > 0) return scoped
  return productLinks
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

function flattenProviderPayload(value: unknown, depth = 0): string[] {
  if (depth > 3 || value == null) return []

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    const text = String(value).trim()
    return text ? [text] : []
  }

  if (Array.isArray(value)) {
    return value.flatMap((entry) => flattenProviderPayload(entry, depth + 1))
  }

  if (typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).flatMap((entry) =>
      flattenProviderPayload(entry, depth + 1)
    )
  }

  return []
}

function extractProviderMessage(source: unknown) {
  return flattenProviderPayload(source)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function isProviderBalanceIssue(source: unknown) {
  const haystack = extractProviderMessage(source).toLowerCase()
  if (!haystack) return false

  return [
    'insufficient balance',
    'insufficient funds',
    'insufficient credit',
    'not enough balance',
    'not enough funds',
    'no enough balance',
    'not sufficient balance',
    'low balance',
    'low credit',
    'credit is not enough',
    'balance is not enough',
    'balance too low',
    'wallet balance is low',
    'out of balance',
    'no balance',
    'رصيد',
    'الرصيد',
    'غير كاف',
    'غير متوفر',
  ].some((token) => haystack.includes(token))
}

function createProviderSubmissionError(source: unknown, fallback = 'Provider submission failed') {
  const providerMessage = extractProviderMessage(source) || fallback
  const error = new Error(providerMessage) as ProviderSubmissionError

  error.providerBalanceIssue = isProviderBalanceIssue(source)
  error.providerMessage = providerMessage
  error.providerPayload = source

  return error
}

function getWalletBalanceField(currency?: string) {
  return currency === 'LBP' ? 'balance_lbp' : 'balance_usd'
}

function buildManagedStockUpdatePipeline(quantityDelta: number) {
  const safeDelta = Math.max(0, Math.floor(Math.abs(Number(quantityDelta) || 0)))

  if (safeDelta === 0) {
    return [
      {
        $set: {
          stockQuantity: '$stockQuantity',
        },
      },
      {
        $set: {
          stockStatus: {
            $cond: [{ $gt: ['$stockQuantity', 0] }, 'in_stock', 'out_of_stock'],
          },
        },
      },
    ]
  }

  const quantityExpression =
    quantityDelta >= 0
      ? { $add: ['$stockQuantity', safeDelta] }
      : { $subtract: ['$stockQuantity', safeDelta] }

  return [
    {
      $set: {
        stockQuantity: quantityExpression,
      },
    },
    {
      $set: {
        stockStatus: {
          $cond: [{ $gt: ['$stockQuantity', 0] }, 'in_stock', 'out_of_stock'],
        },
      },
    },
  ]
}

async function reserveManagedStock(params: {
  slug: string
  quantity: number
  session: mongoose.ClientSession
}): Promise<ManagedStockReservation> {
  const normalizedSlug = String(params.slug || '').trim().toLowerCase()
  const requestedQuantity = Math.max(0, Math.floor(Number(params.quantity) || 0))

  if (!normalizedSlug || requestedQuantity <= 0) {
    return { status: 'not_managed' }
  }

  const customProduct = await CustomProduct.findOneAndUpdate(
    {
      slug: normalizedSlug,
      active: true,
      saleEnabled: { $ne: false },
      stockQuantity: { $gte: requestedQuantity },
    },
    buildManagedStockUpdatePipeline(-requestedQuantity),
    {
      new: true,
      session: params.session,
    }
  )
    .select('slug stockQuantity')
    .lean()

  if (customProduct) {
    return {
      status: 'reserved',
      target: {
        kind: 'custom',
        slug: normalizedSlug,
      },
      remainingQuantity: Math.max(0, Number(customProduct.stockQuantity || 0)),
    }
  }

  const customExists = await CustomProduct.exists({
    slug: normalizedSlug,
    active: true,
  }).session(params.session)

  if (customExists) {
    return {
      status: 'insufficient',
      target: {
        kind: 'custom',
        slug: normalizedSlug,
      },
    }
  }

  const overrideProduct = await ProductOverride.findOneAndUpdate(
    {
      slug: normalizedSlug,
      active: { $ne: false },
      saleEnabled: { $ne: false },
      stockQuantity: {
        $exists: true,
        $gte: requestedQuantity,
      },
    },
    buildManagedStockUpdatePipeline(-requestedQuantity),
    {
      new: true,
      session: params.session,
    }
  )
    .select('slug stockQuantity')
    .lean()

  if (overrideProduct) {
    return {
      status: 'reserved',
      target: {
        kind: 'override',
        slug: normalizedSlug,
      },
      remainingQuantity: Math.max(0, Number(overrideProduct.stockQuantity || 0)),
    }
  }

  const overrideExists = await ProductOverride.exists({
    slug: normalizedSlug,
    active: { $ne: false },
    stockQuantity: { $exists: true },
  }).session(params.session)

  if (overrideExists) {
    return {
      status: 'insufficient',
      target: {
        kind: 'override',
        slug: normalizedSlug,
      },
    }
  }

  return { status: 'not_managed' }
}

async function refundOrderForProviderBalanceIssue(params: {
  order: any
  userId: string
  refundAmount: number
  message: string
  providerPayload?: unknown
  providerStatusOverride?: string
}) {
  const session = await mongoose.startSession()

  try {
    session.startTransaction()

    const balanceField = getWalletBalanceField(params.order.currency)
    const balanceBefore = Number(params.order.walletBalanceAfter || 0)

    const updatedWallet = await Wallet.findOneAndUpdate(
      { userId: params.userId },
      {
        $inc: { [balanceField]: params.refundAmount },
        $set: { lastUpdated: new Date() },
      },
      { new: true, session }
    )

    if (!updatedWallet) {
      throw new Error('Wallet refund failed')
    }

    const balanceAfter = Number((updatedWallet as any)?.[balanceField] || 0)

    params.order.status = 'refunded'
    params.order.providerStatus = String(params.providerStatusOverride || 'provider_balance_unavailable')
    params.order.notes = params.message
    params.order.failureReason = params.message
    params.order.walletBalanceAfter = balanceAfter
    params.order.providerResponse = params.providerPayload || params.order.providerResponse

    await params.order.save({ session })

    await WalletTransaction.create(
      [
        {
          userId: params.userId,
          type: 'refund',
          amount: params.refundAmount,
          currency: params.order.currency === 'LBP' ? 'LBP' : 'USD',
          balanceBefore,
          balanceAfter,
          orderId: params.order._id,
          notes: `Refund: ${params.message}`,
        },
      ],
      { session }
    )

    await session.commitTransaction()
    return balanceAfter
  } catch (error) {
    await session.abortTransaction()
    throw error
  } finally {
    session.endSession()
  }
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
  const rawStatus = String(order.status || 'pending')
  const preservedSupportMessage = [order.failureReason, order.notes]
    .map((value) => String(value || '').trim())
    .find((value) => PROVIDER_SUPPORT_MESSAGES.includes(value))
  const customerMessage =
    preservedSupportMessage ||
    (rawStatus === 'failed' || rawStatus === 'rejected'
      ? 'We could not complete this order.'
      : rawStatus === 'refunded'
        ? 'This order was refunded.'
        : rawStatus === 'completed'
          ? 'Order completed successfully.'
          : 'Your order is being processed.')

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
    status: rawStatus,
    providerStatus: '',
    selectedPackageOption: String(order.selectedPackageOption || ''),
    notes: customerMessage,
    failureReason:
      rawStatus === 'failed' || rawStatus === 'rejected' || preservedSupportMessage ? customerMessage : '',
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
  try {
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

    const payload = response.data
    const providerStatus = String(
      payload?.status || payload?.order_status || payload?.data?.status || payload?.details?.status || ''
    ).toLowerCase()

    const hasExplicitFailure =
      payload?.success === false ||
      payload?.ok === false ||
      Boolean(payload?.error) ||
      Boolean(payload?.errors) ||
      ['failed', 'error', 'rejected', 'cancelled'].includes(providerStatus) ||
      (isProviderBalanceIssue(payload) && providerStatus !== 'completed')

    if (hasExplicitFailure) {
      throw createProviderSubmissionError(payload)
    }

    return payload
  } catch (error: any) {
    if (error?.providerPayload) throw error

    throw createProviderSubmissionError(
      error?.response?.data || error?.message || error,
      'Provider submission failed'
    )
  }
}

async function sendTelegramMessage(orderId: string, orderData: OrderRequest) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID || process.env.TELEGRAM_ADMIN_CHAT_ID

  if (!botToken || !chatId) {
    console.warn('Telegram credentials not configured: TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID/TELEGRAM_ADMIN_CHAT_ID are required')
    return false
  }

  const message = `ًں›’ New Order - Bily Card

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
    const token =
      extractToken(request.headers.get('authorization')) ||
      request.cookies.get(AUTH_COOKIE_NAME)?.value ||
      null

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
    const inactiveUserResponse = await ensureActiveSessionUser(user.userId)
    if (inactiveUserResponse) {
      return inactiveUserResponse
    }

    const orderDocs = await Order.find({ userId: user.userId })
      .sort({ createdAt: -1 })
      .lean()

    for (const order of orderDocs) {
      try {
        const providerSync = await resolveProviderOrderSync(order as any)
        if (!providerSync) continue

        const { mappedStatus, providerStatus, statusPayload } = providerSync

        if (mappedStatus === 'refunded' && order.status !== 'refunded') {
          const refundAmount = Number(order.total || 0)
          if (refundAmount > 0) {
            const refundResult = await refundOrderAndRestoreStock({
              orderId: String(order._id),
              refundAmount,
              currency: order.currency === 'LBP' ? 'LBP' : 'USD',
              nextStatus: 'refunded',
              refundNote: 'Refund: Provider cancelled order',
              providerStatus,
              providerResponse: statusPayload,
              notes: 'Auto refunded after provider cancellation',
              failureReason:
                providerStatus === 'cancelled'
                  ? 'Provider cancelled order and refunded balance at source'
                  : String(order.failureReason || ''),
            })

            if (refundResult.stockRestored) {
              invalidateCatalogProductsCache()
            }

            order.status = refundResult.order.status
            order.providerStatus = refundResult.order.providerStatus
            order.providerResponse = refundResult.order.providerResponse
            order.notes = refundResult.order.notes
            order.failureReason = refundResult.order.failureReason
            order.walletBalanceAfter = refundResult.order.walletBalanceAfter
          }

          continue
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
    const requestLanguage = resolveRequestLanguage(request)
    const providerSupportMessage = getProviderSupportMessage(requestLanguage)
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
    const managedStockSlug = String(catalogProduct?.slug || normalizedSlug || '').trim().toLowerCase()
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

    if (
      catalogProduct &&
      !isProductAvailable({
        stockQuantityValue: catalogProduct.stockQuantity,
        legacyStatusValue: catalogProduct.stockStatus,
        saleEnabledValue: catalogProduct.saleEnabled,
      })
    ) {
      return NextResponse.json(
        { success: false, message: 'This product is currently out of stock' },
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
    const routingRequestUuid = randomUUID()

    const token =
      extractToken(request.headers.get('authorization')) ||
      request.cookies.get(AUTH_COOKIE_NAME)?.value ||
      null
    const user = token ? verifyToken(token) : null

    if (!user?.userId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const limitResponse = await enforceRateLimit(
      request,
      `orders-create:${String(user.userId)}`,
      8,
      60 * 1000
    )
    if (limitResponse) {
      return limitResponse
    }

    const blockCheckSlug = String(managedStockSlug || normalizedSlug || '').trim().toLowerCase()
    const normalizedPlayerId = normalizePlayerIdForBlock(cleanPlayerId)
    if (blockCheckSlug && normalizedPlayerId) {
      await connectDB()
      const blocked = await BlockedPlayerId.findOne({
        productSlug: blockCheckSlug,
        playerId: normalizedPlayerId,
        active: true,
      })
        .select('productSlug playerId')
        .lean()

      if (blocked) {
        return NextResponse.json(
          { success: false, message: 'ID blocked' },
          { status: 403 }
        )
      }
    }

    const usesManualCountPricing = isManualCountProduct(catalogProduct)
    const pricing = await getEffectivePriceForProduct({
      slug,
      fallbackPrice: price,
      packageOption: packageOption || undefined,
      userId: user.userId,
    })

    const baseUnitPrice = Number(pricing.basePrice || 0)
    const effectiveUnitPrice = Number(pricing.effectivePrice || 0)
    const manualInternalPercent = usesManualCountPricing
      ? Number(pricing.productPercent || 0)
      : 0
    const effectiveTotal = usesManualCountPricing
      ? calculateManualCountTotalRounded(quantity, effectiveUnitPrice, 6)
      : Number((effectiveUnitPrice * quantity).toFixed(6))
    const estimatedProviderTotalCost = usesManualCountPricing
      ? calculateManualInternalCostTotal(effectiveTotal, manualInternalPercent, 6)
      : Number((baseUnitPrice * quantity).toFixed(6))
    const estimatedBaseUnitPrice = usesManualCountPricing
      ? calculateManualInternalCostUnitPrice(effectiveUnitPrice, manualInternalPercent, 12)
      : baseUnitPrice
    const estimatedGrossProfit = usesManualCountPricing
      ? calculateManualInternalProfitTotal(effectiveTotal, manualInternalPercent, 6)
      : Number((effectiveTotal - estimatedProviderTotalCost).toFixed(6))

    if (!Number.isFinite(effectiveTotal) || effectiveTotal <= 0) {
      return NextResponse.json(
        { success: false, message: 'Invalid order total' },
        { status: 400 }
      )
    }

    const productProviderMode = getProductProviderMode(catalogProduct, productId)
    const preferredProviderSlot = getProviderSlotForMode(productProviderMode)

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
    const inactiveUserResponse = await ensureActiveSessionUser(user.userId)
    if (inactiveUserResponse) {
      return inactiveUserResponse
    }

    const explicitManualCostUnitPrice =
      productProviderMode === 'manual'
        ? await getExplicitManualCustomCostPrice(managedStockSlug)
        : null
    const hasExplicitManualCostUnitPrice =
      typeof explicitManualCostUnitPrice === 'number' &&
      Number.isFinite(explicitManualCostUnitPrice) &&
      explicitManualCostUnitPrice >= 0
    const resolvedProviderTotalCost = hasExplicitManualCostUnitPrice
      ? calculateManualCountTotalRounded(quantity, explicitManualCostUnitPrice, 6)
      : estimatedProviderTotalCost
    const resolvedBaseUnitPrice = hasExplicitManualCostUnitPrice
      ? Number(explicitManualCostUnitPrice.toFixed(12))
      : estimatedBaseUnitPrice
    const resolvedGrossProfit = Number((effectiveTotal - resolvedProviderTotalCost).toFixed(6))

    const orderUserProfile = (await User.findById(user.userId)
      .select('displayName username email')
      .lean()) as NotificationUserProfile | null

    let reservedManagedStock: ManagedStockTarget | null = null
    let shouldInvalidateCatalogCache = false

    const session = await mongoose.startSession()
    let order: any = null

    try {
      session.startTransaction()

      const stockReservation = await reserveManagedStock({
        slug: managedStockSlug,
        quantity,
        session,
      })

      if (stockReservation.status === 'insufficient') {
        await session.abortTransaction()
        return NextResponse.json(
          { success: false, message: 'This product is currently out of stock' },
          { status: 400 }
        )
      }

      if (stockReservation.status === 'reserved') {
        reservedManagedStock = stockReservation.target
        shouldInvalidateCatalogCache = true
      }

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
            baseUnitPrice: resolvedBaseUnitPrice,
            providerUnitCost: resolvedBaseUnitPrice,
            providerTotalCost: resolvedProviderTotalCost,
            grossProfit: resolvedGrossProfit,
            total: effectiveTotal,
            walletBalanceBefore,
            walletBalanceAfter,
            currency: 'USD',
            status: 'pending',
            providerSlot: preferredProviderSlot || 'manual',
            providerStatus: preferredProviderSlot ? 'pending' : 'local_only',
            routingRequestUuid,
            notes: preferredProviderSlot
              ? 'Order created locally'
              : 'Order created locally for manual processing',
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

    if (preferredProviderSlot) {
      const routed = await createRoutedOrder({
        productSlug: slug,
        productId,
        productName: name,
        packageOption: packageOption || undefined,
        providerMode: productProviderMode,
        providerLinks: await getScopedProviderLinksForOrder({
          slug,
          packageOption: packageOption || undefined,
          fallbackLinks: Array.isArray(catalogProduct?.providerLinks) ? catalogProduct?.providerLinks : [],
        }),
        routingMode: catalogProduct?.routingMode === 'priority' ? 'priority' : 'cheapest',
        orderId,
        playerId: cleanPlayerId,
        quantity,
        sellTotal: effectiveTotal,
        fallbackUnitCost: baseUnitPrice,
        routingRequestUuid,
      })

      if (routed.kind === 'submitted') {
        order.providerProductId = routed.providerProductId
        order.selectedProviderCode = routed.providerAdapterKey
        order.selectedProviderId = routed.providerAdapterKey
        order.providerMatchedProductName = routed.providerMatchedProductName
        order.providerMatchMode = routed.providerMatchMode
        order.providerOrderId = routed.providerOrderId || undefined
        order.providerSlot = routed.providerSlot
        order.providerStatus = routed.providerStatus
        order.providerUnitCost = routed.providerUnitCost
        order.providerEffectiveCost = routed.providerEffectiveTotalCost
        order.providerTotalCost = routed.providerTotalCost
        order.grossProfit = routed.grossProfit
        order.providerAttempts = routed.attempts.map((attempt) => ({
          providerId: attempt.providerAdapterKey,
          providerCode: attempt.providerAdapterKey,
          providerProductId: attempt.providerProductId,
          status: attempt.outcome,
          message: attempt.reason || '',
          attemptedAt: new Date(),
          rawCost: Number(attempt.unitCost || 0),
          effectiveCost: Number(attempt.effectiveUnitCost || attempt.unitCost || 0),
        }))
        order.providerResponse = {
          ...(typeof routed.providerResponse === 'object' && routed.providerResponse
            ? (routed.providerResponse as Record<string, unknown>)
            : {}),
          _providerAdapter: routed.providerAdapterKey,
          _routingAttempts: routed.attempts,
        }
        order.status = mapProviderStatusToLocal(routed.providerStatus, routed.providerAdapterKey)
        order.notes = routed.fallbackUsed
          ? 'Order submitted with automatic fallback routing'
          : 'Order submitted successfully'
      } else if (routed.kind === 'already_submitted') {
        order.providerSlot = routed.existing.providerSlot
        order.providerOrderId = routed.existing.providerOrderId || undefined
        order.providerStatus = routed.existing.providerStatus || 'pending'
        order.notes = 'Order already submitted previously'
        order.providerResponse = {
          ...(typeof order.providerResponse === 'object' && order.providerResponse
            ? (order.providerResponse as Record<string, unknown>)
            : {}),
          _providerAdapter: routed.existing.providerAdapterKey,
          _routingAttempts: routed.attempts,
          _routingMeta: {
            deduplicatedByRoutingUuid: true,
            routingRequestUuid,
          },
        }
        order.providerAttempts = routed.attempts.map((attempt) => ({
          providerId: attempt.providerAdapterKey,
          providerCode: attempt.providerAdapterKey,
          providerProductId: attempt.providerProductId,
          status: attempt.outcome,
          message: attempt.reason || '',
          attemptedAt: new Date(),
          rawCost: Number(attempt.unitCost || 0),
          effectiveCost: Number(attempt.effectiveUnitCost || attempt.unitCost || 0),
        }))
      } else if (routed.kind === 'provider_balance_unavailable') {
        await refundOrderForProviderBalanceIssue({
          order,
          userId: user.userId,
          refundAmount: effectiveTotal,
          message: providerSupportMessage,
          providerPayload: routed.providerPayload,
        })

        if (reservedManagedStock) {
          const restored = await restoreManagedStockBySlug({
            slug: reservedManagedStock.slug,
            quantity,
          })

          if (restored) {
            invalidateCatalogProductsCache()
            shouldInvalidateCatalogCache = false
          }
        }

        await sendAdminNotification({
          title: 'Provider Balance Issue - Bily Card',
          lines: [
            `Customer: ${resolveNotificationUserName(orderUserProfile, user.username)}`,
            `Order ID: ${orderId}`,
            `Product: ${name}`,
            packageOption ? `Package: ${packageOption}` : null,
            `Player ID: ${cleanPlayerId}`,
            `Quantity: ${quantity}`,
            `Refunded: $${effectiveTotal.toFixed(2)}`,
            'Action: Order was stopped before fulfillment because provider balance was unavailable.',
          ],
        })

        return NextResponse.json(
          {
            success: false,
            orderId,
            providerStatus: 'provider_balance_unavailable',
            message: providerSupportMessage,
          },
          { status: 503 }
        )
      } else if (routed.kind === 'blocked_no_profit') {
        await refundOrderForProviderBalanceIssue({
          order,
          userId: user.userId,
          refundAmount: effectiveTotal,
          message: 'Order blocked (no profit)',
          providerStatusOverride: 'blocked_no_profit',
          providerPayload: {
            _routingAttempts: routed.attempts,
            _routingReason: 'blocked_no_profit',
          },
        })

        if (reservedManagedStock) {
          const restored = await restoreManagedStockBySlug({
            slug: reservedManagedStock.slug,
            quantity,
          })

          if (restored) {
            invalidateCatalogProductsCache()
            shouldInvalidateCatalogCache = false
          }
        }

        return NextResponse.json(
          {
            success: false,
            orderId,
            providerStatus: 'blocked_no_profit',
            message: 'Order blocked (no profit)',
          },
          { status: 409 }
        )
      } else if (routed.kind === 'submit_failed') {
        order.providerSlot = preferredProviderSlot
        order.providerStatus = 'submit_failed'
        order.providerMatchMode = packageOption ? 'package-option-submit-failed' : 'submit-failed'
        order.notes = 'Order submission failed, kept for local/manual processing'
        order.failureReason = routed.message || 'Provider submission failed'
        order.providerResponse = {
          _routingAttempts: routed.attempts,
        }
        order.providerAttempts = routed.attempts.map((attempt) => ({
          providerId: attempt.providerAdapterKey,
          providerCode: attempt.providerAdapterKey,
          providerProductId: attempt.providerProductId,
          status: attempt.outcome,
          message: attempt.reason || '',
          attemptedAt: new Date(),
          rawCost: Number(attempt.unitCost || 0),
          effectiveCost: Number(attempt.effectiveUnitCost || attempt.unitCost || 0),
        }))
      } else {
        order.providerSlot = preferredProviderSlot
        order.providerStatus = 'local_only'
        order.providerMatchMode = packageOption ? 'package-option-no-match' : 'unresolved'
        order.notes = 'No provider mapping available, kept for local/manual processing'
        order.providerResponse = {
          _routingAttempts: routed.attempts,
          _routingReason: routed.reason,
        }
        order.providerAttempts = routed.attempts.map((attempt) => ({
          providerId: attempt.providerAdapterKey,
          providerCode: attempt.providerAdapterKey,
          providerProductId: attempt.providerProductId,
          status: attempt.outcome,
          message: attempt.reason || '',
          attemptedAt: new Date(),
          rawCost: Number(attempt.unitCost || 0),
          effectiveCost: Number(attempt.effectiveUnitCost || attempt.unitCost || 0),
        }))
      }
    } else {
      order.providerSlot = 'manual'
      order.providerStatus = 'local_only'
      order.notes = 'Product is set to manual mode, kept for local/manual processing'
    }

    await order.save()

    if (shouldInvalidateCatalogCache) {
      invalidateCatalogProductsCache()
    }

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
        preferredProviderSlot ? `Provider Slot: ${preferredProviderSlot}` : 'Provider Slot: manual',
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


