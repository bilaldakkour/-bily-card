import { bilycardProducts } from '@/lib/data/bilycardProducts'
import type { ProductProviderLink } from '@/lib/data/products'
import CustomProduct from '@/lib/models/CustomProduct'
import { getDailycardRowsShared } from '@/lib/providers/dailycardRowsShared'

type MatchConfidence = 'exact' | 'probable' | 'unresolved'
type MatchAction = 'mapped' | 'review' | 'unresolved'
type AutoMapMode = 'dry_run' | 'apply'

type DailycardCatalogRow = {
  providerProductId: string
  providerProductName: string
  variantLabel: string
  category: string
  cost: number
  currency: string
}

type TargetVariantRow = {
  slug: string
  productName: string
  category: string
  variantLabel: string
  variantKey: string
}

export type DailycardAutoMapReportRow = {
  productName: string
  slug: string
  packageLabel: string
  suggestedProviderProductId: string
  suggestedDailyCardName: string
  confidence: MatchConfidence
  confidenceScore: number
  action: MatchAction
  reason: string
}

export type DailycardAutoMapResult = {
  mode: AutoMapMode
  targets: string[]
  providerRowsCount: number
  scannedVariants: number
  mappedCount: number
  reviewCount: number
  unresolvedCount: number
  appliedCount: number
  report: DailycardAutoMapReportRow[]
}

const DEFAULT_TARGETS = ['uc-pubg', 'free-fire-jewel', 'tiktok']
const NOISE_WORDS = new Set(['code', 'package', 'packages', 'top', 'up', 'topup', 'recharge', 'card'])

function toSafeNumber(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function normalizeVariantKey(value: unknown) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9 ]+/g, '')
    .trim()
}

function normalizeName(value: unknown) {
  return String(value || '')
    .toLowerCase()
    .replace(/luod/g, 'ludo')
    .replace(/jewels/g, 'jewel')
    .replace(/top[\s-]*up/g, 'topup')
    .replace(/[^a-z0-9\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeVariantLabel(value: unknown) {
  return String(value || '')
    .toLowerCase()
    .replace(/\bpubg\b/g, ' ')
    .replace(/\buc\b/g, ' ')
    .replace(/jewels/g, 'jewel')
    .replace(/[^a-z0-9\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokenize(value: unknown) {
  return normalizeName(value)
    .split(' ')
    .map((token) => token.trim())
    .filter((token) => token.length > 1 && !NOISE_WORDS.has(token))
}

function extractQuantity(text: unknown) {
  const matches = String(text || '').match(/\d+/g)
  if (!matches || !matches.length) return null
  return Number(matches[0])
}

function jaccard(a: string[], b: string[]) {
  if (!a.length || !b.length) return 0
  const setA = new Set(a)
  const setB = new Set(b)
  let intersection = 0
  for (const token of setA) {
    if (setB.has(token)) intersection += 1
  }
  const union = new Set([...setA, ...setB]).size
  return union > 0 ? intersection / union : 0
}

function detectFamily(value: unknown) {
  const text = normalizeName(value)
  if (text.includes('pubg') || text.includes('uc')) return 'pubg'
  if (text.includes('free fire') || text.includes('freefire')) return 'freefire'
  if (text.includes('tiktok')) return 'tiktok'
  if (text.includes('yalla') || text.includes('ludo')) return 'yalla_ludo'
  if (text.includes('clash')) return 'clash'
  return ''
}

function parsePackageLineOption(option: string) {
  const raw = String(option || '').trim()
  const out = /\(out of stock\)/i.test(raw)
  const priceMatch = raw.match(/\$([0-9]+(?:\.[0-9]+)?)/)
  const price = priceMatch ? Number(priceMatch[1]) : 0
  const label = raw.replace(/\s*-\s*\$[0-9]+(?:\.[0-9]+)?(\s*\(Out of stock\))?/i, '').trim()
  return {
    label: label || raw,
    price: Number.isFinite(price) ? price : 0,
    inStock: !out,
  }
}

function getPackageOptionsFromCatalogProduct(product: any) {
  const inputFields = Array.isArray(product?.inputFields) ? product.inputFields : []
  const packageField = inputFields.find((field: any) => field?.name === 'package' && field?.type === 'select')
  const options = Array.isArray(packageField?.options) ? packageField.options : []
  return options
    .map((row: any) => parsePackageLineOption(String(row || '')))
    .filter((row: any) => row.label)
}

function buildTargetVariants(products: any[]) {
  const rows: TargetVariantRow[] = []
  for (const product of products) {
    const slug = String(product?.slug || '').trim().toLowerCase()
    if (!slug) continue
    const productName = String(product?.name || '').trim()
    const category = String(product?.category || '').trim()
    const packages = getPackageOptionsFromCatalogProduct(product)
    if (packages.length > 0) {
      for (const pkg of packages) {
        rows.push({
          slug,
          productName,
          category,
          variantLabel: pkg.label,
          variantKey: normalizeVariantKey(pkg.label),
        })
      }
      continue
    }
    rows.push({
      slug,
      productName,
      category,
      variantLabel: productName,
      variantKey: normalizeVariantKey(productName),
    })
  }
  return rows
}

async function getDailycardCatalogRows() {
  const rows = await getDailycardRowsShared()
  return rows.map((row) => ({
    providerProductId: String(row?.providerProductId || '').trim(),
    providerProductName: String(row?.providerProductName || row?.displayName || '').trim(),
    variantLabel: String((row?.metadata as any)?.variantLabel || '').trim(),
    category: String(row?.category || '').trim(),
    cost: toSafeNumber(row?.cost),
    currency: String(row?.currency || 'USD').trim() || 'USD',
  }))
}

function scoreCandidate(target: TargetVariantRow, candidate: DailycardCatalogRow) {
  const targetProductTokens = tokenize(target.productName)
  const candidateProductTokens = tokenize(candidate.providerProductName)
  const productScore = jaccard(targetProductTokens, candidateProductTokens)

  const targetVariantNormalized = normalizeVariantLabel(target.variantLabel)
  const candidateVariantSource = candidate.variantLabel || candidate.providerProductName
  const candidateVariantNormalized = normalizeVariantLabel(candidateVariantSource)
  const variantScore =
    targetVariantNormalized && candidateVariantNormalized
      ? jaccard(tokenize(targetVariantNormalized), tokenize(candidateVariantNormalized))
      : 0

  const targetQty = extractQuantity(target.variantLabel)
  const candidateQty = extractQuantity(candidateVariantSource)
  const quantityScore =
    targetQty == null ? 0.4 : candidateQty != null && targetQty === candidateQty ? 1 : 0
  const familyTarget = detectFamily(target.productName)
  const familyCandidate = detectFamily(candidate.providerProductName)
  const familyScore = familyTarget && familyCandidate && familyTarget === familyCandidate ? 1 : 0
  const total = Number(
    (productScore * 0.35 + variantScore * 0.35 + quantityScore * 0.2 + familyScore * 0.1).toFixed(4)
  )

  const exactVariant = targetVariantNormalized && targetVariantNormalized === candidateVariantNormalized
  const exactProduct = normalizeName(target.productName) === normalizeName(candidate.providerProductName)
  const exactByQuantityAndFamily = familyScore === 1 && quantityScore === 1 && variantScore >= 0.72

  let confidence: MatchConfidence = 'unresolved'
  let reason = 'low_confidence'
  if ((exactProduct && exactVariant) || exactByQuantityAndFamily || total >= 0.93) {
    confidence = 'exact'
    reason = exactProduct && exactVariant ? 'normalized_exact_product_variant' : 'strong_family_quantity_match'
  } else if ((familyScore === 1 && quantityScore === 1 && total >= 0.7) || total >= 0.82) {
    confidence = 'probable'
    reason = quantityScore === 1 ? 'probable_with_clear_quantity' : 'probable_name_similarity'
  }

  let action: MatchAction = 'unresolved'
  if (confidence === 'exact') action = 'mapped'
  else if (confidence === 'probable' && quantityScore === 1) action = 'mapped'
  else if (confidence === 'probable') action = 'review'

  return {
    confidence,
    reason,
    action,
    score: total,
    familyScore,
    quantityScore,
    variantScore,
    productScore,
  }
}

function pickTargets(catalogProducts: any[], requestedTargets: string[]) {
  const rows = Array.isArray(catalogProducts) ? catalogProducts : []
  const bySlug = new Map(rows.map((row) => [String(row?.slug || '').toLowerCase(), row]))
  const picked: any[] = []
  const addBySlug = (slug: string) => {
    const row = bySlug.get(slug)
    if (!row) return
    if (picked.some((item) => String(item?.slug || '').toLowerCase() === slug)) return
    picked.push(row)
  }

  for (const rawTarget of requestedTargets) {
    const target = normalizeName(rawTarget)
    if (!target) continue
    if (target === 'uc pubg' || target === 'uc-pubg') {
      addBySlug('uc-pubg')
      continue
    }
    if (target === 'free fire jewel' || target === 'free-fire-jewel') {
      addBySlug('free-fire-jewel')
      continue
    }
    if (target === 'tiktok') {
      addBySlug('tiktok-coins')
      continue
    }

    const fallback = rows.find((product) => {
      const slug = normalizeName(product?.slug || '')
      const name = normalizeName(product?.name || '')
      return slug === target || name === target || slug.includes(target) || name.includes(target)
    })
    if (fallback) {
      const slug = String(fallback?.slug || '').toLowerCase()
      if (!picked.some((item) => String(item?.slug || '').toLowerCase() === slug)) picked.push(fallback)
    }
  }

  return picked
}

function mergeProviderLink(
  links: ProductProviderLink[],
  next: ProductProviderLink
) {
  const key = normalizeVariantKey(next.variantKey || '')
  const idx = links.findIndex((row) => {
    const rowVariant = normalizeVariantKey(row.variantKey || '')
    return row.providerCode === 'dailycard' && rowVariant === key
  })
  if (idx >= 0) {
    links[idx] = {
      ...links[idx],
      ...next,
    }
    return
  }
  links.push(next)
}

async function applyMappings(input: {
  report: DailycardAutoMapReportRow[]
  targetProducts: any[]
}) {
  const bySlug = new Map<string, DailycardAutoMapReportRow[]>()
  for (const row of input.report) {
    if (row.action !== 'mapped') continue
    if (!row.suggestedProviderProductId) continue
    if (!bySlug.has(row.slug)) bySlug.set(row.slug, [])
    bySlug.get(row.slug)!.push(row)
  }

  let updatedCount = 0

  for (const [slug, mappings] of bySlug.entries()) {
    const product = input.targetProducts.find((row) => String(row?.slug || '').toLowerCase() === slug)
    if (!product) continue

    const packageOptions = getPackageOptionsFromCatalogProduct(product).map((pkg: { label: string; price: number; inStock: boolean }) => ({
      key: normalizeVariantKey(pkg.label),
      label: pkg.label,
      price: toSafeNumber(pkg.price),
      inStock: pkg.inStock !== false,
    }))
    const isPackage = packageOptions.length > 0

    const existing = await CustomProduct.findOne({ slug, active: true })
    if (!existing) {
      await CustomProduct.create({
        name: String(product?.name || slug),
        slug,
        shortDescription: String(product?.shortDescription || product?.name || slug),
        fullDescription: String(product?.fullDescription || product?.shortDescription || product?.name || slug),
        price: toSafeNumber(product?.price),
        category: String(product?.category || 'games'),
        image: String(product?.image || '/favicon.png'),
        mode: isPackage ? 'package' : 'single',
        packageOptions: isPackage ? packageOptions : [],
        active: true,
        featured: Boolean(product?.featured),
        bestSeller: Boolean(product?.bestSeller),
        stockQuantity: Number(product?.stockQuantity || 0),
        stockStatus: String(product?.stockStatus || 'out_of_stock'),
        saleEnabled: product?.saleEnabled !== false,
        platform: String(product?.platform || 'BilyCard'),
        deliveryTime: String(product?.deliveryTime || 'Instant'),
        tags: Array.isArray(product?.tags) ? product.tags : [],
        providerMode: 'primary',
        routingMode: 'cheapest',
        providerLinks: [],
      })
    }

    const doc = await CustomProduct.findOne({ slug, active: true })
    if (!doc) continue

    const currentLinks = Array.isArray(doc.providerLinks) ? [...doc.providerLinks] : []
    for (const row of mappings) {
      const variantKey = normalizeVariantKey(row.packageLabel || row.productName)
      mergeProviderLink(currentLinks as ProductProviderLink[], {
        providerCode: 'dailycard',
        providerProductId: row.suggestedProviderProductId,
        providerProductName: row.suggestedDailyCardName,
        enabled: true,
        executionEnabled: true,
        priceSyncEnabled: true,
        fallbackEnabled: true,
        priceSource: 'provider',
        variantKey: variantKey || undefined,
      })
    }

    doc.providerMode = 'primary'
    doc.routingMode = 'cheapest'
    doc.providerLinks = currentLinks as any
    await doc.save()
    updatedCount += 1
  }

  return updatedCount
}

export async function runDailycardAutoMapping(input?: {
  mode?: AutoMapMode
  targets?: string[]
}) {
  const mode: AutoMapMode = input?.mode === 'apply' ? 'apply' : 'dry_run'
  const targets = Array.isArray(input?.targets) && input?.targets.length ? input.targets : DEFAULT_TARGETS

  const catalogPromise = (async () => {
    try {
      const mod = await import('@/lib/data/catalogProducts')
      return await mod.getCatalogProducts()
    } catch {
      return bilycardProducts as any[]
    }
  })()

  const [catalogProducts, dailycardRows] = await Promise.all([catalogPromise, getDailycardCatalogRows()])
  console.log('AutoMapper DailyCard rows:', dailycardRows.length)

  const targetProducts = pickTargets(catalogProducts, targets)
  const targetVariants = buildTargetVariants(targetProducts)

  const report: DailycardAutoMapReportRow[] = []
  const usedIdsBySlug = new Map<string, Set<string>>()

  for (const variant of targetVariants) {
    const slug = variant.slug
    const family = detectFamily(`${variant.productName} ${variant.variantLabel}`)
    const scopedCandidates =
      family
        ? dailycardRows.filter((row) => detectFamily(row.providerProductName) === family)
        : dailycardRows
    const scored = (scopedCandidates.length ? scopedCandidates : dailycardRows)
      .map((candidate) => ({
        candidate,
        score: scoreCandidate(variant, candidate),
      }))
      .sort((a, b) => b.score.score - a.score.score)

    const top = scored[0]
    const second = scored[1]
    if (!top) {
      report.push({
        productName: variant.productName,
        slug: variant.slug,
        packageLabel: variant.variantLabel,
        suggestedProviderProductId: '',
        suggestedDailyCardName: '',
        confidence: 'unresolved',
        confidenceScore: 0,
        action: 'unresolved',
        reason: 'no_provider_candidates',
      })
      continue
    }

    let action = top.score.action
    let reason = top.score.reason
    if (second && top.score.score - second.score.score < 0.05 && action === 'mapped') {
      action = 'review'
      reason = 'ambiguous_top_candidates'
    }

    if (!usedIdsBySlug.has(slug)) usedIdsBySlug.set(slug, new Set())
    const usedIds = usedIdsBySlug.get(slug)!
    if (usedIds.has(top.candidate.providerProductId) && action === 'mapped') {
      action = 'review'
      reason = 'duplicate_provider_id_for_same_product'
    }
    if (action === 'mapped') {
      usedIds.add(top.candidate.providerProductId)
    }
    console.log('MATCH:', {
      internal: variant.variantLabel,
      provider: top.candidate.variantLabel || top.candidate.providerProductName,
      providerId: top.candidate.providerProductId,
      price: top.candidate.cost,
    })

    report.push({
      productName: variant.productName,
      slug: variant.slug,
      packageLabel: variant.variantLabel,
      suggestedProviderProductId: top.candidate.providerProductId,
      suggestedDailyCardName: top.candidate.providerProductName,
      confidence: top.score.confidence,
      confidenceScore: top.score.score,
      action,
      reason,
    })
  }

  const mappedCount = report.filter((row) => row.action === 'mapped').length
  const reviewCount = report.filter((row) => row.action === 'review').length
  const unresolvedCount = report.filter((row) => row.action === 'unresolved').length

  let appliedCount = 0
  if (mode === 'apply' && mappedCount > 0) {
    appliedCount = await applyMappings({
      report,
      targetProducts,
    })
  }

  return {
    mode,
    targets,
    providerRowsCount: dailycardRows.length,
    scannedVariants: targetVariants.length,
    mappedCount,
    reviewCount,
    unresolvedCount,
    appliedCount,
    report,
  } satisfies DailycardAutoMapResult
}
