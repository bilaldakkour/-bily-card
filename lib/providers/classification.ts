import { detectProviderInputRequirements } from '@/lib/providers/inputRequirements'

type CatalogItem = {
  slug: string
  name: string
  category?: string
}

type ProviderProductLike = {
  providerProductId: string
  displayName?: string
  providerProductName?: string
  category?: string
  cost?: number
  stockStatus?: string
  deliveryType?: string
  metadata?: any
}

export type ProductClassificationResult = {
  classification:
    | 'matched_to_existing'
    | 'new_unique_products'
    | 'ambiguous_candidates'
    | 'invalid_or_unusable'
  confidence: number
  suggestedInternalSlug?: string
  reasons: string[]
  requirements: ReturnType<typeof detectProviderInputRequirements>
}

function normalizeText(value: unknown) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokenize(value: string) {
  return normalizeText(value)
    .split(' ')
    .map((token) => token.trim())
    .filter((token) => token.length > 1)
}

function jaccard(a: string[], b: string[]) {
  const sa = new Set(a)
  const sb = new Set(b)
  if (!sa.size || !sb.size) return 0
  let intersection = 0
  for (const token of sa) if (sb.has(token)) intersection += 1
  const union = new Set([...sa, ...sb]).size
  return union > 0 ? intersection / union : 0
}

function sanitizeSlugPart(value: string) {
  return normalizeText(value)
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
}

export function buildUniqueSlugBase(params: {
  providerName: string
  providerProductId: string
}) {
  const base = sanitizeSlugPart(params.providerName) || 'provider-product'
  const idPart = sanitizeSlugPart(params.providerProductId) || 'id'
  return `${base}-${idPart}`.slice(0, 95)
}

export function classifyProviderProduct(input: {
  product: ProviderProductLike
  catalogProducts: CatalogItem[]
  existingMappedSlugByProviderProductId?: Map<string, string>
}) : ProductClassificationResult {
  const name =
    String(input.product.displayName || input.product.providerProductName || '').trim()
  const category = String(input.product.category || '').trim().toLowerCase()
  const providerProductId = String(input.product.providerProductId || '').trim()
  const stockStatus = String(input.product.stockStatus || '').toLowerCase()
  const cost = Number(input.product.cost || 0)
  const requirements = detectProviderInputRequirements({
    params: input.product.metadata?.params ?? null,
    qtyValues: input.product.metadata?.qty_values ?? null,
  })

  const reasons: string[] = []
  if (!providerProductId) reasons.push('missing_provider_product_id')
  if (!name) reasons.push('missing_product_name')
  if (!(cost > 0)) reasons.push('invalid_cost')
  if (requirements.requiresExtraInput) reasons.push('requires_extra_input')
  if (stockStatus === 'out_of_stock' || stockStatus === 'paused') reasons.push('not_available')

  if (reasons.some((r) => ['missing_provider_product_id', 'missing_product_name', 'invalid_cost'].includes(r))) {
    return {
      classification: 'invalid_or_unusable',
      confidence: 0,
      reasons,
      requirements,
    }
  }

  const mappedSlug = input.existingMappedSlugByProviderProductId?.get(providerProductId.toLowerCase())
  if (mappedSlug) {
    return {
      classification: 'matched_to_existing',
      confidence: 1,
      suggestedInternalSlug: mappedSlug,
      reasons: ['existing_mapping_found'],
      requirements,
    }
  }

  const normalizedName = normalizeText(name)
  const nameTokens = tokenize(name)
  let best:
    | {
        slug: string
        score: number
        reason: string
      }
    | undefined

  for (const item of input.catalogProducts) {
    const candidateName = normalizeText(item.name)
    if (!candidateName) continue
    const categoryMatch =
      category && String(item.category || '').toLowerCase() === category ? 0.15 : 0
    let score = 0
    let reason = ''

    if (candidateName === normalizedName) {
      score = 0.9 + categoryMatch
      reason = categoryMatch ? 'exact_name_with_category' : 'exact_name'
    } else if (candidateName.includes(normalizedName) || normalizedName.includes(candidateName)) {
      score = 0.74 + categoryMatch
      reason = categoryMatch ? 'contains_name_with_category' : 'contains_name'
    } else {
      const tokenScore = jaccard(nameTokens, tokenize(candidateName))
      if (tokenScore >= 0.8) {
        score = 0.7 + tokenScore * 0.2 + categoryMatch
        reason = categoryMatch ? 'high_token_similarity_with_category' : 'high_token_similarity'
      }
    }

    if (!best || score > best.score) {
      best = { slug: String(item.slug || '').toLowerCase(), score, reason }
    }
  }

  if (best && best.score >= 0.88) {
    return {
      classification: 'matched_to_existing',
      confidence: Number(best.score.toFixed(2)),
      suggestedInternalSlug: best.slug,
      reasons: [best.reason],
      requirements,
    }
  }

  if (best && best.score >= 0.68) {
    return {
      classification: 'ambiguous_candidates',
      confidence: Number(best.score.toFixed(2)),
      suggestedInternalSlug: best.slug,
      reasons: [best.reason, 'manual_review_needed'],
      requirements,
    }
  }

  if (requirements.requiresExtraInput || stockStatus === 'out_of_stock' || stockStatus === 'paused') {
    return {
      classification: 'invalid_or_unusable',
      confidence: 0.5,
      reasons: reasons.length ? reasons : ['not_sellable_now'],
      requirements,
    }
  }

  return {
    classification: 'new_unique_products',
    confidence: 0.86,
    reasons: ['no_strong_match_found'],
    requirements,
  }
}
