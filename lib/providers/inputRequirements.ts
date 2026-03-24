type QtyRequirement =
  | { mode: 'single'; fixed: 1 }
  | { mode: 'list'; values: number[] }
  | { mode: 'range'; min: number; max: number }

export type ProviderInputRequirements = {
  requiresExtraInput: boolean
  requiredFields: string[]
  supportsPlayerIdOnly: boolean
  quantityRule: QtyRequirement
}

function toNumber(value: unknown) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 0
  return parsed
}

function parseQtyValues(qtyValues: unknown): QtyRequirement {
  // If provider does not expose explicit quantity rules, keep routing permissive
  // and let provider-side validation decide instead of blocking locally.
  if (qtyValues == null) return { mode: 'range', min: 1, max: 1_000_000_000 }

  if (Array.isArray(qtyValues)) {
    const values = qtyValues
      .map((v) => Math.floor(toNumber(v)))
      .filter((v) => Number.isFinite(v) && v > 0)
    return values.length ? { mode: 'list', values } : { mode: 'range', min: 1, max: 1_000_000_000 }
  }

  if (typeof qtyValues === 'object') {
    const safe = qtyValues as Record<string, unknown>
    const min = Math.floor(toNumber(safe.min ?? safe.from ?? safe.start ?? 1))
    const max = Math.floor(toNumber(safe.max ?? safe.to ?? safe.end ?? min))
    if (min > 0 && max >= min) return { mode: 'range', min, max }
  }

  return { mode: 'range', min: 1, max: 1_000_000_000 }
}

function normalizeRequiredFields(params: unknown): string[] {
  if (!params) return []
  const raw =
    Array.isArray(params)
      ? params
      : typeof params === 'object'
        ? Object.keys(params as Record<string, unknown>)
        : String(params).split(',')

  return raw
    .map((v) => String(v || '').trim())
    .filter(Boolean)
}

export function detectProviderInputRequirements(params: {
  params: unknown
  qtyValues: unknown
}) : ProviderInputRequirements {
  const requiredFields = normalizeRequiredFields(params.params)
  const normalized = requiredFields.map((field) => field.toLowerCase())
  const playerIdAliases = new Set(['playerid', 'player_id', 'account_id', 'userid', 'user_id'])
  const extraFields = normalized.filter((field) => !playerIdAliases.has(field))

  return {
    requiresExtraInput: extraFields.length > 0,
    requiredFields,
    supportsPlayerIdOnly: extraFields.length === 0,
    quantityRule: parseQtyValues(params.qtyValues),
  }
}

export function isQuantityAllowedByRequirement(quantity: number, requirement: QtyRequirement) {
  const qty = Math.floor(Number(quantity || 0))
  if (!Number.isFinite(qty) || qty <= 0) return false

  if (requirement.mode === 'single') return qty === 1
  if (requirement.mode === 'list') return requirement.values.includes(qty)
  return qty >= requirement.min && qty <= requirement.max
}
