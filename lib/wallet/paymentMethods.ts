export type PaymentMethodConfig = {
  key: string
  name: string
  address: string
  logoUrl: string
  minAmount: number
  feePercent: number
  active: boolean
}

export const DEFAULT_PAYMENT_METHODS: PaymentMethodConfig[] = [
  {
    key: 'whish-money',
    name: 'Whish Money',
    address: '',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/67/Whish_Money_logo.png/240px-Whish_Money_logo.png',
    minAmount: 4,
    feePercent: 1,
    active: true,
  },
  {
    key: 'omt-wallet',
    name: 'OMT Wallet',
    address: '',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/OMT_logo.png/240px-OMT_logo.png',
    minAmount: 4,
    feePercent: 0,
    active: true,
  },
  {
    key: 'usdt-trc20',
    name: 'USDT (TRC20)',
    address: '',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/Tether_%28USDT%29_logo.svg/240px-Tether_%28USDT%29_logo.svg.png',
    minAmount: 10,
    feePercent: 0,
    active: true,
  },
  {
    key: 'usdt-bep20',
    name: 'USDT (BEP20)',
    address: '',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/Tether_%28USDT%29_logo.svg/240px-Tether_%28USDT%29_logo.svg.png',
    minAmount: 10,
    feePercent: 0,
    active: true,
  },
]

function normalizeString(value: unknown) {
  return String(value || '').trim()
}

export function sanitizePaymentMethods(input: unknown): PaymentMethodConfig[] {
  if (!Array.isArray(input)) {
    return DEFAULT_PAYMENT_METHODS
  }

  const map = new Map<string, PaymentMethodConfig>()

  for (const row of input as any[]) {
    const key = normalizeString(row?.key).toLowerCase()
    if (!key) continue

    map.set(key, {
      key,
      name: normalizeString(row?.name) || key,
      address: normalizeString(row?.address),
      logoUrl: normalizeString(row?.logoUrl),
      minAmount: Math.max(0, Number(row?.minAmount) || 0),
      feePercent: Math.max(0, Number(row?.feePercent) || 0),
      active: Boolean(row?.active),
    })
  }

  // Keep default ordering, but allow custom overrides.
  const merged = DEFAULT_PAYMENT_METHODS.map((base) => {
    const override = map.get(base.key)
    return override
      ? {
          ...base,
          ...override,
        }
      : base
  })

  // Add any extra custom methods that are not in defaults.
  for (const [key, item] of map.entries()) {
    if (!merged.some((row) => row.key === key)) {
      merged.push(item)
    }
  }

  return merged
}

export function getActivePaymentMethods(input: unknown): PaymentMethodConfig[] {
  return sanitizePaymentMethods(input).filter((method) => method.active)
}
