import { bilycardProducts } from '@/lib/data/bilycardProducts';
import { getCatalogProductBySlug } from '@/lib/data/catalogProducts';
import CustomProduct from '@/lib/models/CustomProduct';
import ProductPricing from '@/lib/models/ProductPricing';
import ProviderRegistry from '@/lib/models/ProviderRegistry';
import User from '@/lib/models/User';
import UserProductDiscount from '@/lib/models/UserProductDiscount';
import { isManualCountProduct } from '@/lib/pricing/manualCount';
import { isTestModeEnabled, logTestMode } from '@/lib/utils/testMode';
import { getEnabledProviderAdapters } from '@/lib/providers/registry';
import type { ProviderAdapter } from '@/lib/providers/types';

export const clampPercent = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  if (value < -100) return -100;
  if (value > 1000) return 1000;
  return value;
};

export const applyPricingPercent = (
  basePrice: number,
  profitMarginPercent: number,
  userPercent: number
): number => {
  const margin = clampPercent(profitMarginPercent);
  const discount = clampPercent(userPercent);
  const sellBeforeDiscount = Number(basePrice) * (1 + margin / 100);
  const final = sellBeforeDiscount * (1 - discount / 100);
  return Number(Math.max(0, final).toFixed(6));
};

type RoundingRule =
  | 'none'
  | 'ceil_0_01'
  | 'round_0_01'
  | 'ceil_0_1'
  | 'round_0_1'
  | 'ceil_1'
  | 'round_1';

type ProviderLinkLike = {
  providerCode?: string;
  providerProductId?: string;
  enabled?: boolean;
  executionEnabled?: boolean;
  priceSyncEnabled?: boolean;
  priceSource?: 'provider' | 'manual';
  manualCost?: number;
  lastKnownCost?: number;
  lastCost?: number;
  healthStatus?: 'unknown' | 'healthy' | 'degraded' | 'unhealthy';
  providerAvailability?: 'unknown' | 'available' | 'unavailable';
  lastSyncAt?: Date | string;
};

function normalizeVariantKey(value: unknown) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9 ]+/g, '')
    .trim();
}

function resolveVariantKeyFromPackageOption(option?: string) {
  const raw = String(option || '').trim();
  if (!raw) return '__default__';
  const [pipeLeft] = raw.split('|');
  const [dashLeft] = String(pipeLeft || raw).split(' - ');
  return normalizeVariantKey(dashLeft || pipeLeft || raw) || '__default__';
}

function toMs(value: unknown) {
  const date = value ? new Date(value as any) : null;
  const ms = date ? date.getTime() : NaN;
  return Number.isFinite(ms) ? ms : null;
}

function applyRounding(value: number, roundingRule?: string) {
  const v = Number(value || 0);
  if (!Number.isFinite(v) || v <= 0) return 0;
  const rule = String(roundingRule || 'none').toLowerCase() as RoundingRule;
  if (rule === 'ceil_0_01') return Number((Math.ceil(v * 100) / 100).toFixed(6));
  if (rule === 'round_0_01') return Number((Math.round(v * 100) / 100).toFixed(6));
  if (rule === 'ceil_0_1') return Number((Math.ceil(v * 10) / 10).toFixed(6));
  if (rule === 'round_0_1') return Number((Math.round(v * 10) / 10).toFixed(6));
  if (rule === 'ceil_1') return Number(Math.ceil(v).toFixed(6));
  if (rule === 'round_1') return Number(Math.round(v).toFixed(6));
  return Number(v.toFixed(6));
}

function getGlobalDefaultMarginPercent() {
  const envMargin = Number(process.env.DEFAULT_PROFIT_MARGIN_PERCENT || '0');
  if (Number.isFinite(envMargin) && envMargin >= 0) return envMargin;
  return 0;
}

function normalizeLinkCost(link: ProviderLinkLike) {
  if (String(link.priceSource || 'provider').toLowerCase() === 'manual') {
    const manual = Number(link.manualCost);
    return Number.isFinite(manual) && manual > 0 ? manual : null;
  }

  const lastCost = Number(link.lastCost);
  if (Number.isFinite(lastCost) && lastCost > 0) return lastCost;

  const lastKnown = Number(link.lastKnownCost);
  if (Number.isFinite(lastKnown) && lastKnown > 0) return lastKnown;

  return null;
}

function isLinkCostFresh(link: ProviderLinkLike) {
  if (String(link.priceSource || 'provider').toLowerCase() === 'manual') return true;
  const maxAgeMinutesRaw = Number(process.env.PROVIDER_LAST_COST_MAX_AGE_MINUTES || '1440');
  const maxAgeMinutes = Number.isFinite(maxAgeMinutesRaw) && maxAgeMinutesRaw > 0 ? maxAgeMinutesRaw : 1440;
  const syncMs = toMs(link.lastSyncAt);
  if (!syncMs) return false;
  return Date.now() - syncMs <= maxAgeMinutes * 60 * 1000;
}

async function resolveCheapestProviderCost(input: {
  productSlug: string;
  packageOption?: string;
}) {
  const row = (await CustomProduct.findOne({ slug: input.productSlug, active: true })
    .select(
      'providerLinks packageOptions providerMode profitMarginPercent roundingRule routingMode'
    )
    .lean()) as
    | {
        providerLinks?: Array<ProviderLinkLike & { variantKey?: string }>;
        packageOptions?: Array<{
          key?: string;
          label?: string;
          profitMarginPercent?: number;
          manualBaseCost?: number;
          roundingRule?: string;
          providerLinks?: Array<ProviderLinkLike>;
        }>;
        providerMode?: string;
        profitMarginPercent?: number;
        roundingRule?: string;
      }
    | null;

  if (!row) return null;
  if (String(row.providerMode || '').toLowerCase() === 'manual') return null;

  const variantKey = resolveVariantKeyFromPackageOption(input.packageOption);
  const packageRows = Array.isArray(row.packageOptions) ? row.packageOptions : [];
  const matchedVariant = packageRows.find((pkg) => {
    const key = normalizeVariantKey(pkg?.key || pkg?.label || '');
    return key && key === variantKey;
  });

  const variantLinks = Array.isArray(matchedVariant?.providerLinks) ? matchedVariant?.providerLinks : [];
  const productLinks = Array.isArray(row.providerLinks) ? row.providerLinks : [];
  const scopedProductLinks = productLinks.filter((link) => {
    const key = normalizeVariantKey((link as any)?.variantKey || '');
    if (!key) return variantKey === '__default__';
    return key === variantKey;
  });
  const mergedLinks = (variantLinks.length > 0 ? variantLinks : scopedProductLinks.length > 0 ? scopedProductLinks : productLinks) as ProviderLinkLike[];
  if (!mergedLinks.length) return null;

  const providerKeys = Array.from(
    new Set(mergedLinks.map((link) => String(link.providerCode || '').trim().toLowerCase()).filter(Boolean))
  );
  if (!providerKeys.length) return null;

  const registryRows = await ProviderRegistry.find({ providerKey: { $in: providerKeys }, enabled: true })
    .select('providerKey enabled routing')
    .lean();
  const registryMap = new Map<string, any>();
  for (const rr of registryRows as any[]) {
    registryMap.set(String(rr?.providerKey || '').trim().toLowerCase(), rr);
  }

  const adapterByKey = new Map<string, ProviderAdapter>();
  const enabledAdapters = getEnabledProviderAdapters();
  for (const adapter of enabledAdapters) {
    const key = String(adapter?.key || '').trim().toLowerCase();
    if (!key || adapterByKey.has(key)) continue;
    adapterByKey.set(key, adapter);
  }

  const candidates = (
    await Promise.all(
      mergedLinks.map(async (link) => {
      const providerCode = String(link.providerCode || '').trim().toLowerCase();
      if (!providerCode) return null;
      if (link.enabled === false) return null;
      if (link.executionEnabled === false) return null;
      if (String(link.providerAvailability || '').toLowerCase() === 'unavailable') return null;
      if (String(link.healthStatus || '').toLowerCase() === 'unhealthy') return null;
      const provider = registryMap.get(providerCode);
      if (!provider || provider.enabled === false || provider?.routing?.allowOrderCreation === false) return null;
      const storedCost = normalizeLinkCost(link);
      const storedCostIsFresh = isLinkCostFresh(link);

      let providerQuote: Awaited<ReturnType<ProviderAdapter['resolveProductQuote']>> | null = null;
      const adapter = adapterByKey.get(providerCode);
      if (adapter && String(link.priceSource || 'provider').toLowerCase() !== 'manual') {
        try {
          providerQuote = await adapter.resolveProductQuote({
            providerProductId: String((link as any)?.providerProductId || '').trim() || undefined,
            preferredName: String((link as any)?.providerProductName || '').trim() || undefined,
            packageOption:
              String(input.packageOption || '').trim() ||
              String(matchedVariant?.label || '').trim() ||
              undefined,
          });
        } catch {
          providerQuote = null;
        }
      }

      const quotedUnitCost = Number((providerQuote as any)?.unitCost || 0);
      const quotedCost = Number((providerQuote as any)?.cost || 0);
      const resolvedCost =
        (Number.isFinite(quotedUnitCost) && quotedUnitCost > 0 ? quotedUnitCost : 0) ||
        (Number.isFinite(quotedCost) && quotedCost > 0 ? quotedCost : 0) ||
        (storedCostIsFresh && Number.isFinite(Number(storedCost)) && Number(storedCost) > 0
          ? Number(storedCost)
          : 0);
      if (!(resolvedCost > 0)) return null;

      console.log('PRICE DEBUG:', {
        providerProductId: String((link as any)?.providerProductId || '').trim(),
        variantKey,
        cost: resolvedCost,
        providerQuote,
      });

      return {
        providerCode,
        cost: resolvedCost,
      };
    })
    )
  ).filter(Boolean) as Array<{ providerCode: string; cost: number }>;

  if (!candidates.length) return null;

  candidates.sort((a, b) => a.cost - b.cost);

  return {
    cheapestProviderCode: candidates[0].providerCode,
    cheapestCost: Number(candidates[0].cost.toFixed(6)),
    variantMarginPercent:
      Number.isFinite(Number(matchedVariant?.profitMarginPercent)) &&
      Number(matchedVariant?.profitMarginPercent) >= 0
        ? Number(matchedVariant?.profitMarginPercent)
        : undefined,
    variantManualBaseCost:
      Number.isFinite(Number(matchedVariant?.manualBaseCost)) &&
      Number(matchedVariant?.manualBaseCost) > 0
        ? Number(matchedVariant?.manualBaseCost)
        : undefined,
    variantRoundingRule: String(matchedVariant?.roundingRule || '').trim() || undefined,
    productMarginPercent:
      Number.isFinite(Number(row.profitMarginPercent)) && Number(row.profitMarginPercent) >= 0
        ? Number(row.profitMarginPercent)
        : undefined,
    productRoundingRule: String(row.roundingRule || '').trim() || undefined,
  };
}

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

export async function getUserProductDiscountMap(
  userId?: string | null
): Promise<Record<string, number>> {
  if (isTestModeEnabled()) {
    return {};
  }

  if (!userId) return {};

  const rows = await UserProductDiscount.find({
    userId: String(userId),
    isActive: true,
  })
    .select('productSlug discountPercent')
    .lean();

  const map: Record<string, number> = {};
  for (const row of rows as Array<{ productSlug?: string; discountPercent?: number }>) {
    const slug = String(row?.productSlug || '').trim().toLowerCase();
    if (!slug) continue;
    map[slug] = Number(row?.discountPercent || 0);
  }

  return map;
}

export async function getEffectivePricingContext(userId?: string | null) {
  const [productMap, userPercent, userProductDiscountMap] = await Promise.all([
    getProductPricingMap(),
    getUserPricingPercent(userId || null),
    getUserProductDiscountMap(userId || null),
  ]);

  return { productMap, userPercent, userProductDiscountMap };
}

export async function getEffectivePriceForProduct(input: {
  slug?: string;
  fallbackPrice?: number;
  packageOption?: string;
  userId?: string | null;
}) {
  const slug = String(input.slug || '').trim().toLowerCase();
  const product = slug ? await getCatalogProductBySlug(slug) : undefined;
  const fallback = Number(input.fallbackPrice);
  const hasFallback = Number.isFinite(fallback) && fallback > 0;
  const basePrice = hasFallback ? fallback : Number(product?.price ?? 0);

  const [productMap, userPercent, userProductDiscountMap] = await Promise.all([
    getProductPricingMap(),
    getUserPricingPercent(input.userId || null),
    getUserProductDiscountMap(input.userId || null),
  ]);

  if (product && isManualCountProduct(product)) {
    const productPercent = slug ? Number(productMap[slug] || 0) : 0;
    return {
      basePrice,
      productPercent,
      userPercent: 0,
      sellBeforeDiscount: basePrice,
      effectivePrice: basePrice,
      cheapestProviderCode: null,
    };
  }

  const providerCost = slug
    ? await resolveCheapestProviderCost({
        productSlug: slug,
        packageOption: input.packageOption,
      })
    : null;
  const productPercentFromRules = slug ? Number(productMap[slug] || 0) : 0;
  const productPercent =
    typeof providerCost?.variantMarginPercent === 'number'
      ? providerCost.variantMarginPercent
      : typeof providerCost?.productMarginPercent === 'number'
        ? providerCost.productMarginPercent
        : Number.isFinite(productPercentFromRules)
          ? productPercentFromRules
          : getGlobalDefaultMarginPercent();
  const baseCost = Number(providerCost?.variantManualBaseCost || providerCost?.cheapestCost || 0);
  const resolvedBasePrice =
    Number.isFinite(baseCost) && baseCost > 0
      ? baseCost
      : basePrice;
  const effectiveUserPercent = slug
    ? Number(userProductDiscountMap[slug] ?? userPercent)
    : Number(userPercent || 0);
  const sellBeforeDiscount = Number(
    (resolvedBasePrice * (1 + clampPercent(productPercent) / 100)).toFixed(6)
  );
  const effectivePrice = applyRounding(
    sellBeforeDiscount * (1 - clampPercent(effectiveUserPercent) / 100),
    providerCost?.variantRoundingRule || providerCost?.productRoundingRule || 'none'
  );

  return {
    basePrice: resolvedBasePrice,
    productPercent,
    userPercent: effectiveUserPercent,
    sellBeforeDiscount,
    effectivePrice,
    cheapestProviderCode: providerCost?.cheapestProviderCode || null,
    cheapestCost:
      typeof providerCost?.cheapestCost === 'number' ? providerCost.cheapestCost : null,
  };
}

export function applyPricingMapToProducts(
  products: typeof bilycardProducts,
  productMap: Record<string, number>,
  userPercent: number,
  userProductDiscountMap?: Record<string, number>
) {
  return products.map((product) => {
    if (isManualCountProduct(product)) {
      return {
        ...product,
        price: Number(product.price || 0),
        startingPrice:
          typeof product.startingPrice === 'number' ? Number(product.startingPrice || 0) : product.startingPrice,
      };
    }

    const productPercent = Number(productMap[product.slug.toLowerCase()] || 0);
    const effectiveUserPercent = Number(
      userProductDiscountMap?.[product.slug.toLowerCase()] ?? userPercent
    );
    const nextPrice = applyPricingPercent(product.price, productPercent, effectiveUserPercent);

    return {
      ...product,
      price: nextPrice,
      startingPrice:
        typeof product.startingPrice === 'number'
          ? applyPricingPercent(
              product.startingPrice,
              productPercent,
              effectiveUserPercent
            )
          : product.startingPrice,
    };
  });
}
