import { bilycardProducts } from '@/lib/data/bilycardProducts';
import { getCatalogProductBySlug } from '@/lib/data/catalogProducts';
import ProductPricing from '@/lib/models/ProductPricing';
import User from '@/lib/models/User';
import { isTestModeEnabled, logTestMode } from '@/lib/utils/testMode';

export const clampPercent = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  if (value < -100) return -100;
  if (value > 1000) return 1000;
  return value;
};

export const applyPricingPercent = (
  basePrice: number,
  productPercent: number,
  userPercent: number
): number => {
  const totalPercent = clampPercent(productPercent) + clampPercent(userPercent);
  const raw = Number(basePrice) * (1 + totalPercent / 100);
  return Number(Math.max(0, raw).toFixed(6));
};

export async function getProductPricingMap(): Promise<Record<string, number>> {
  if (isTestModeEnabled()) {
    logTestMode('pricing/product-map bypassed')
    return {};
  }

  const rows = await ProductPricing.find({}).select('productSlug percentage').lean();
  const map: Record<string, number> = {};

  for (const row of rows) {
    if (!row.productSlug) continue;
    map[String(row.productSlug).toLowerCase()] = Number(row.percentage || 0);
  }

  return map;
}

export async function getUserPricingPercent(userId?: string | null): Promise<number> {
  if (isTestModeEnabled()) {
    logTestMode('pricing/user-percent bypassed', { userId: userId || null })
    return 0;
  }

  if (!userId) return 0;

  const user = (await User.findById(userId)
    .select('pricingPercent')
    .lean()) as { pricingPercent?: number } | null;
  return Number(user?.pricingPercent || 0);
}

export async function getEffectivePricingContext(userId?: string | null) {
  const [productMap, userPercent] = await Promise.all([
    getProductPricingMap(),
    getUserPricingPercent(userId || null),
  ]);

  return { productMap, userPercent };
}

export async function getEffectivePriceForProduct(input: {
  slug?: string;
  fallbackPrice?: number;
  userId?: string | null;
}) {
  const slug = String(input.slug || '').trim().toLowerCase();
  const product = slug ? await getCatalogProductBySlug(slug) : undefined;
  const fallback = Number(input.fallbackPrice);
  const hasFallback = Number.isFinite(fallback) && fallback > 0;
  const basePrice = hasFallback ? fallback : Number(product?.price ?? 0);

  const [productMap, userPercent] = await Promise.all([
    getProductPricingMap(),
    getUserPricingPercent(input.userId || null),
  ]);

  const productPercent = slug ? Number(productMap[slug] || 0) : 0;
  const effectivePrice = applyPricingPercent(basePrice, productPercent, userPercent);

  return {
    basePrice,
    productPercent,
    userPercent,
    effectivePrice,
  };
}

export function applyPricingMapToProducts(
  products: typeof bilycardProducts,
  productMap: Record<string, number>,
  userPercent: number
) {
  return products.map((product) => {
    const productPercent = Number(productMap[product.slug.toLowerCase()] || 0);
    const nextPrice = applyPricingPercent(product.price, productPercent, userPercent);

    return {
      ...product,
      price: nextPrice,
      startingPrice:
        typeof product.startingPrice === 'number'
          ? applyPricingPercent(product.startingPrice, productPercent, userPercent)
          : product.startingPrice,
    };
  });
}
