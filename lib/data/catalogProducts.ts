import { bilycardProducts } from '@/lib/data/bilycardProducts';
import {
  findGroupedProductBySlug,
  groupCatalogProducts,
  type CatalogDisplayProduct,
} from '@/lib/data/catalogGrouping';
import { isCatalogHiddenFromListings } from '@/lib/data/catalogCuration';
import { enrichProductDescriptions } from '@/lib/data/productDescriptions';
import type {
  Product,
  ProductListItem,
  ProductProviderLink,
  ProductRoutingMode,
} from '@/lib/data/products';
import { connectDB } from '@/lib/db/mongodb';
import CustomProduct from '@/lib/models/CustomProduct';
import ProductOverride from '@/lib/models/ProductOverride';
import {
  normalizeProductProviderMode,
  type ProductProviderMode,
} from '@/lib/products/providerMode';
import { resolveProductAvailability, resolveStockFields } from '@/lib/products/stock';
import { isTestModeEnabled, logTestMode } from '@/lib/utils/testMode';

type CatalogProduct = Product;

type LeanCustomProduct = {
  _id?: unknown;
  name: string;
  slug: string;
  shortDescription: string;
  fullDescription: string;
  price: number;
  category: string;
  image: string;
  mode: 'single' | 'package' | 'count';
  packageOptions?: Array<{ label: string; price: number; inStock: boolean }>;
  countMin?: number;
  countMax?: number;
  active: boolean;
  featured?: boolean;
  bestSeller?: boolean;
  stockQuantity?: number;
  stockStatus?: 'in_stock' | 'out_of_stock' | 'limited';
  saleEnabled?: boolean;
  platform?: string;
  deliveryTime?: string;
  tags?: string[];
  providerMode?: ProductProviderMode;
  routingMode?: ProductRoutingMode;
  providerLinks?: ProductProviderLink[];
};

type LeanProductOverride = {
  slug: string;
  active?: boolean;
  name?: string;
  category?: string;
  image?: string;
  shortDescription?: string;
  fullDescription?: string;
  price?: number;
  platform?: string;
  deliveryTime?: string;
  stockQuantity?: number;
  stockStatus?: 'in_stock' | 'out_of_stock' | 'limited';
  saleEnabled?: boolean;
  tags?: string[];
  featured?: boolean;
  bestSeller?: boolean;
  providerMode?: ProductProviderMode;
  routingMode?: ProductRoutingMode;
  providerLinks?: ProductProviderLink[];
};

const DEFAULT_PRODUCT_IMAGE = '/favicon.png';
const CATALOG_CACHE_TTL_MS = process.env.NODE_ENV === 'development' ? 0 : 15_000;

let cachedCatalogProducts: CatalogProduct[] | null = null;
let cachedCatalogProductsExpiresAt = 0;
let cachedDisplayProducts: CatalogDisplayProduct[] | null = null;
let cachedDisplayProductsExpiresAt = 0;
let catalogProductsPromise: Promise<CatalogProduct[]> | null = null;
let catalogDisplayPromise: Promise<CatalogDisplayProduct[]> | null = null;

export function invalidateCatalogProductsCache() {
  cachedCatalogProducts = null;
  cachedCatalogProductsExpiresAt = 0;
  cachedDisplayProducts = null;
  cachedDisplayProductsExpiresAt = 0;
  catalogProductsPromise = null;
  catalogDisplayPromise = null;
}

function isCacheFresh(expiresAt: number) {
  return CATALOG_CACHE_TTL_MS > 0 && expiresAt > Date.now();
}

function rememberCatalogProducts(products: CatalogProduct[]) {
  if (CATALOG_CACHE_TTL_MS <= 0) {
    return products;
  }

  cachedCatalogProducts = products;
  cachedCatalogProductsExpiresAt = Date.now() + CATALOG_CACHE_TTL_MS;
  cachedDisplayProducts = null;
  cachedDisplayProductsExpiresAt = 0;
  return products;
}

function rememberDisplayProducts(products: CatalogDisplayProduct[]) {
  if (CATALOG_CACHE_TTL_MS <= 0) {
    return products;
  }

  cachedDisplayProducts = products;
  cachedDisplayProductsExpiresAt = Date.now() + CATALOG_CACHE_TTL_MS;
  return products;
}

function normalizeProductImage(image: unknown): string {
  const value = String(image || '').trim();
  return value || DEFAULT_PRODUCT_IMAGE;
}

function normalizeProviderLinks(value: unknown): ProductProviderLink[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const rows: ProductProviderLink[] = [];
  for (const raw of value as Array<Record<string, unknown>>) {
    const providerCode = String(raw?.providerCode || '').trim().toLowerCase();
    const providerProductId = String(raw?.providerProductId || '').trim();
    if (!providerCode || !providerProductId) continue;
    const dedupe = `${providerCode}|${providerProductId.toLowerCase()}`;
    if (seen.has(dedupe)) continue;
    seen.add(dedupe);
    rows.push({
      providerCode,
      providerProductId,
      providerProductName: String(raw?.providerProductName || '').trim() || undefined,
      enabled: raw?.enabled !== false,
      priority: Number.isFinite(Number(raw?.priority)) ? Number(raw?.priority) : 100,
      priceSource: String(raw?.priceSource || '').toLowerCase() === 'manual' ? 'manual' : 'provider',
      manualCost: Number.isFinite(Number(raw?.manualCost)) ? Number(raw?.manualCost) : undefined,
      lastKnownCost: Number.isFinite(Number(raw?.lastKnownCost)) ? Number(raw?.lastKnownCost) : undefined,
      providerAvailability:
        String(raw?.providerAvailability || '').toLowerCase() === 'available'
          ? 'available'
          : String(raw?.providerAvailability || '').toLowerCase() === 'unavailable'
            ? 'unavailable'
            : 'unknown',
      fallbackEnabled: raw?.fallbackEnabled !== false,
      lastSyncAt: raw?.lastSyncAt ? String(raw.lastSyncAt) : undefined,
    });
  }
  return rows;
}

function toPackageOptionText(option: { label: string; price: number; inStock: boolean }) {
  const suffix = option.inStock ? '' : ' (Out of stock)';
  return `${option.label} - $${Number(option.price || 0).toFixed(2)}${suffix}`;
}

function toCatalogProduct(product: LeanCustomProduct): CatalogProduct {
  const mode = product.mode || 'single';
  const safePackages = Array.isArray(product.packageOptions) ? product.packageOptions : [];
  const resolvedAvailability = resolveProductAvailability({
    stockQuantityValue: product.stockQuantity,
    legacyStatusValue: product.stockStatus,
    saleEnabledValue: product.saleEnabled,
  });

  const inputFields: CatalogProduct['inputFields'] = [
    {
      name: 'playerId',
      label: 'Player ID',
      type: 'text',
      required: true,
      placeholder: 'Enter details',
    },
  ];

  if (mode === 'package' && safePackages.length > 0) {
    inputFields.push({
      name: 'package',
      label: 'Choose Package',
      type: 'select',
      required: true,
      options: safePackages.map(toPackageOptionText),
    });
  }

  if (mode === 'count') {
    inputFields.push({
      name: 'count',
      label: 'Count',
      type: 'number',
      required: true,
      placeholder: 'Enter quantity',
      validation: {
        min: Math.max(1, Number(product.countMin || 1)),
        ...(Number.isFinite(Number(product.countMax)) && Number(product.countMax) > 0
          ? { max: Number(product.countMax) }
          : {}),
      },
    });
  }

  return {
    id: `manual-${String(product._id || product.slug)}`,
    slug: product.slug,
    name: product.name,
    shortDescription: product.shortDescription,
    fullDescription: product.fullDescription,
    price: Number(product.price || 0),
    category: product.category,
    image: normalizeProductImage(product.image),
    featured: Boolean(product.featured),
    bestSeller: Boolean(product.bestSeller),
    inputFields,
    stockQuantity: resolvedAvailability.stockQuantity,
    stockStatus: resolvedAvailability.stockStatus,
    saleEnabled: resolvedAvailability.saleEnabled,
    platform: product.platform || 'BilyCard',
    deliveryTime: product.deliveryTime || 'Instant',
    tags: Array.isArray(product.tags) ? product.tags : [],
    providerMode: normalizeProductProviderMode(product.providerMode, 'manual'),
    routingMode: product.routingMode === 'priority' ? 'priority' : 'cheapest',
    providerLinks: normalizeProviderLinks(product.providerLinks),
  };
}

function applyOverride(
  product: CatalogProduct,
  override?: LeanProductOverride | null
): CatalogProduct {
  if (!override) {
    return {
      ...product,
      image: normalizeProductImage(product.image),
    };
  }

  const next: CatalogProduct = { ...product };

  if (typeof override.name === 'string' && override.name.trim()) {
    next.name = override.name.trim();
  }

  if (typeof override.category === 'string' && override.category.trim()) {
    next.category = override.category.trim().toLowerCase();
  }

  if (typeof override.image === 'string') {
    next.image = normalizeProductImage(override.image);
  }

  if (typeof override.shortDescription === 'string' && override.shortDescription.trim()) {
    next.shortDescription = override.shortDescription.trim();
  }

  if (typeof override.fullDescription === 'string' && override.fullDescription.trim()) {
    next.fullDescription = override.fullDescription.trim();
  }

  if (Number.isFinite(Number(override.price)) && Number(override.price) >= 0) {
    next.price = Number(override.price);
  }

  if (typeof override.platform === 'string' && override.platform.trim()) {
    next.platform = override.platform.trim();
  }

  if (typeof override.deliveryTime === 'string' && override.deliveryTime.trim()) {
    next.deliveryTime = override.deliveryTime.trim();
  }

  if (
    typeof override.stockQuantity !== 'undefined' ||
    override.stockStatus === 'in_stock' ||
    override.stockStatus === 'out_of_stock' ||
    override.stockStatus === 'limited'
  ) {
    const resolvedStock = resolveStockFields(override.stockQuantity, override.stockStatus ?? next.stockStatus);
    next.stockQuantity = resolvedStock.stockQuantity;
    next.stockStatus = resolvedStock.stockStatus;
  }

  if (typeof override.saleEnabled === 'boolean') {
    next.saleEnabled = override.saleEnabled;
  }

  if (Array.isArray(override.tags)) {
    next.tags = override.tags.filter(Boolean);
  }

  if (typeof override.featured === 'boolean') {
    next.featured = override.featured;
  }

  if (typeof override.bestSeller === 'boolean') {
    next.bestSeller = override.bestSeller;
  }

  if (typeof override.providerMode === 'string' && override.providerMode.trim()) {
    next.providerMode = normalizeProductProviderMode(override.providerMode, next.providerMode || 'primary');
  } else if (!next.providerMode) {
    next.providerMode = 'primary';
  }

  if (typeof override.routingMode === 'string') {
    next.routingMode = override.routingMode === 'priority' ? 'priority' : 'cheapest';
  }

  if (Array.isArray(override.providerLinks)) {
    next.providerLinks = normalizeProviderLinks(override.providerLinks);
  }

  next.image = normalizeProductImage(next.image);
  const resolvedAvailability = resolveProductAvailability({
    stockQuantityValue: next.stockQuantity,
    legacyStatusValue: next.stockStatus,
    saleEnabledValue: next.saleEnabled,
  });
  next.stockQuantity = resolvedAvailability.stockQuantity;
  next.stockStatus = resolvedAvailability.stockStatus;
  next.saleEnabled = resolvedAvailability.saleEnabled;

  return next;
}

export async function getCatalogProducts(): Promise<CatalogProduct[]> {
  if (isCacheFresh(cachedCatalogProductsExpiresAt) && cachedCatalogProducts) {
    return cachedCatalogProducts;
  }

  if (catalogProductsPromise) {
    return catalogProductsPromise;
  }

  catalogProductsPromise = (async () => {
    if (isTestModeEnabled()) {
      logTestMode('catalog/products using bundled catalog only')
      return rememberCatalogProducts(
        bilycardProducts
          .filter((product) => !isCatalogHiddenFromListings(product))
          .map((product) => enrichProductDescriptions(product))
      );
    }

    await connectDB();

    const customProducts = (await CustomProduct.find({ active: true })
      .sort({ createdAt: -1 })
      .lean()) as LeanCustomProduct[];
    const customSlugSet = new Set(
      customProducts.map((product) => String(product.slug || '').trim().toLowerCase()).filter(Boolean)
    );

    const overrides = (await ProductOverride.find({}).lean()) as LeanProductOverride[];
    const overrideMap = new Map<string, LeanProductOverride>();
    const hiddenSlugs = new Set<string>();

    for (const row of overrides) {
      const slug = String(row?.slug || '').trim().toLowerCase();
      if (!slug) continue;
      if (customSlugSet.has(slug)) continue;

      if (row.active === false) {
        hiddenSlugs.add(slug);
        continue;
      }

      overrideMap.set(slug, row);
    }

    const map = new Map<string, CatalogProduct>();

    for (const product of bilycardProducts) {
      const slug = String(product.slug).toLowerCase();
      if (hiddenSlugs.has(slug)) continue;
      map.set(
        slug,
        enrichProductDescriptions(
          applyOverride(
            {
              ...product,
              ...resolveProductAvailability({
                stockQuantityValue: (product as CatalogProduct).stockQuantity,
                legacyStatusValue: product.stockStatus,
                saleEnabledValue: (product as CatalogProduct).saleEnabled,
              }),
              providerMode: normalizeProductProviderMode(product.providerMode, 'primary'),
            },
            overrideMap.get(slug)
          )
        )
      );
    }

    for (const product of customProducts) {
      const slug = String(product.slug).toLowerCase();
      if (hiddenSlugs.has(slug)) continue;
      map.set(
        slug,
        enrichProductDescriptions(toCatalogProduct(product))
      );
    }

    return rememberCatalogProducts(Array.from(map.values()));
  })();

  try {
    return await catalogProductsPromise;
  } finally {
    catalogProductsPromise = null;
  }
}

export async function getCatalogProductBySlug(slug: string): Promise<CatalogProduct | undefined> {
  const normalized = String(slug || '').trim().toLowerCase();
  if (!normalized) return undefined;
  const products = await getCatalogProducts();
  return products.find((product) => String(product.slug).toLowerCase() === normalized);
}

export async function getCatalogBestSellingProducts(): Promise<CatalogProduct[]> {
  const products = await getCatalogProducts();
  return products.filter((product) => Boolean(product.bestSeller));
}

export async function getCatalogDisplayProducts(): Promise<CatalogDisplayProduct[]> {
  if (isCacheFresh(cachedDisplayProductsExpiresAt) && cachedDisplayProducts) {
    return cachedDisplayProducts;
  }

  if (catalogDisplayPromise) {
    return catalogDisplayPromise;
  }

  catalogDisplayPromise = (async () => {
    const products = await getCatalogProducts();
    return rememberDisplayProducts(
      groupCatalogProducts(products.filter((product) => !isCatalogHiddenFromListings(product)))
    );
  })();

  try {
    return await catalogDisplayPromise;
  } finally {
    catalogDisplayPromise = null;
  }
}

export async function getCatalogDisplayProductBySlug(
  slug: string
): Promise<CatalogDisplayProduct | undefined> {
  const products = await getCatalogProducts();
  return findGroupedProductBySlug(products, slug);
}

export async function getCatalogDisplayBestSellingProducts(): Promise<CatalogDisplayProduct[]> {
  const products = await getCatalogDisplayProducts();
  return products.filter((product) => Boolean(product.bestSeller));
}

export function toProductListItem(product: CatalogDisplayProduct | Product): ProductListItem {
  const hasPackageOptions = Boolean(
    product.inputFields?.some((field) => field.type === 'select' && field.name === 'package') ||
      product.groupChildren?.some((child) =>
        child.inputFields?.some((field) => field.type === 'select' && field.name === 'package')
      )
  );

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    shortDescription: product.shortDescription,
    price: Number(product.price || 0),
    startingPrice:
      typeof product.startingPrice === 'number' ? Number(product.startingPrice) : undefined,
    category: product.category,
    image: product.image,
    featured: Boolean(product.featured),
    bestSeller: Boolean(product.bestSeller),
    stockQuantity: Number(product.stockQuantity || 0),
    stockStatus: product.stockStatus,
    saleEnabled: product.saleEnabled !== false,
    platform: product.platform,
    deliveryTime: product.deliveryTime,
    groupKey: product.groupKey,
    groupSlug: product.groupSlug,
    childCount: typeof product.childCount === 'number' ? product.childCount : undefined,
    childSlugs: Array.isArray(product.childSlugs) ? [...product.childSlugs] : undefined,
    hasPackageOptions,
    groupChildren: Array.isArray(product.groupChildren)
      ? product.groupChildren.map((child) => ({
          slug: child.slug,
          name: child.name,
        }))
      : undefined,
    isGroupedParent: Boolean(product.isGroupedParent),
  };
}
