export type LegacyStockStatus = 'in_stock' | 'out_of_stock' | 'limited';

const FALLBACK_IN_STOCK_QUANTITY = 1;

export function normalizeSaleEnabled(value: unknown): boolean {
  if (typeof value === 'boolean') return value;

  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return true;

  if (['false', '0', 'off', 'closed', 'disabled', 'no'].includes(normalized)) {
    return false;
  }

  return true;
}

export function getLegacyStockStatus(value: unknown): LegacyStockStatus | null {
  const normalized = String(value || '').trim().toLowerCase();

  if (
    normalized === 'in_stock' ||
    normalized === 'out_of_stock' ||
    normalized === 'limited'
  ) {
    return normalized;
  }

  return null;
}

export function normalizeStockQuantity(value: unknown): number | null {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  if (parsed <= 0) {
    return 0;
  }

  return Math.floor(parsed);
}

export function deriveStockQuantity(
  stockQuantityValue: unknown,
  legacyStatusValue?: unknown
): number {
  const normalized = normalizeStockQuantity(stockQuantityValue);

  if (normalized !== null) {
    return normalized;
  }

  const legacyStatus = getLegacyStockStatus(legacyStatusValue);
  return legacyStatus === 'out_of_stock' ? 0 : FALLBACK_IN_STOCK_QUANTITY;
}

export function stockStatusFromQuantity(stockQuantityValue: unknown): LegacyStockStatus {
  return deriveStockQuantity(stockQuantityValue) > 0 ? 'in_stock' : 'out_of_stock';
}

export function resolveStockFields(
  stockQuantityValue: unknown,
  legacyStatusValue?: unknown
) {
  const stockQuantity = deriveStockQuantity(stockQuantityValue, legacyStatusValue);

  return {
    stockQuantity,
    stockStatus: stockStatusFromQuantity(stockQuantity),
  };
}

export function isStockAvailable(stockQuantityValue: unknown): boolean {
  return deriveStockQuantity(stockQuantityValue) > 0;
}

export function resolveProductAvailability(params: {
  stockQuantityValue: unknown;
  legacyStatusValue?: unknown;
  saleEnabledValue?: unknown;
}) {
  const stockQuantity = deriveStockQuantity(params.stockQuantityValue, params.legacyStatusValue);
  const saleEnabled = normalizeSaleEnabled(params.saleEnabledValue);
  const isAvailable = saleEnabled && stockQuantity > 0;

  return {
    stockQuantity,
    stockStatus: isAvailable ? stockStatusFromQuantity(stockQuantity) : 'out_of_stock',
    saleEnabled,
    isAvailable,
  };
}

export function isProductAvailable(params: {
  stockQuantityValue: unknown;
  legacyStatusValue?: unknown;
  saleEnabledValue?: unknown;
}): boolean {
  return resolveProductAvailability(params).isAvailable;
}
