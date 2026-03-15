export const PRODUCT_PROVIDER_MODES = ['primary', 'manual', 'secondary'] as const;

export type ProductProviderMode = (typeof PRODUCT_PROVIDER_MODES)[number];

export function normalizeProductProviderMode(
  value: unknown,
  fallback: ProductProviderMode = 'primary'
): ProductProviderMode {
  const normalized = String(value || '').trim().toLowerCase();

  if (normalized === 'manual' || normalized === 'secondary') {
    return normalized;
  }

  if (normalized === 'primary') {
    return 'primary';
  }

  return fallback;
}
