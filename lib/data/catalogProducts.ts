import { bilycardProducts } from '@/lib/data/bilycardProducts';
import {
  findGroupedProductBySlug,
  groupCatalogProducts,
  type CatalogDisplayProduct,
} from '@/lib/data/catalogGrouping';
import { isCatalogHiddenFromListings } from '@/lib/data/catalogCuration';
import { enrichProductDescriptions } from '@/lib/data/productDescriptions';
import type { Product } from '@/lib/data/products';
import { connectDB } from '@/lib/db/mongodb';
import CustomProduct from '@/lib/models/CustomProduct';
import ProductOverride from '@/lib/models/ProductOverride';
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
  stockStatus?: 'in_stock' | 'out_of_stock' | 'limited';
  platform?: string;
  deliveryTime?: string;
  tags?: string[];
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
  stockStatus?: 'in_stock' | 'out_of_stock' | 'limited';
  tags?: string[];
  featured?: boolean;
  bestSeller?: boolean;
};

function toPackageOptionText(option: { label: string; price: number; inStock: boolean }) {
  const suffix = option.inStock ? '' : ' (Out of stock)';
  return `${option.label} - $${Number(option.price || 0).toFixed(2)}${suffix}`;
}

function toCatalogProduct(product: LeanCustomProduct): CatalogProduct {
  const mode = product.mode || 'single';
  const safePackages = Array.isArray(product.packageOptions) ? product.packageOptions : [];

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
    image: product.image,
    featured: Boolean(product.featured),
    bestSeller: Boolean(product.bestSeller),
    inputFields,
    stockStatus: product.stockStatus || 'in_stock',
    platform: product.platform || 'BilyCard',
    deliveryTime: product.deliveryTime || 'Instant',
    tags: Array.isArray(product.tags) ? product.tags : [],
  };
}

function applyOverride(
  product: CatalogProduct,
  override?: LeanProductOverride | null
): CatalogProduct {
  if (!override) return product;

  const next: CatalogProduct = { ...product };

  if (typeof override.name === 'string' && override.name.trim()) {
    next.name = override.name.trim();
  }

  if (typeof override.category === 'string' && override.category.trim()) {
    next.category = override.category.trim().toLowerCase();
  }

  if (typeof override.image === 'string' && override.image.trim()) {
    next.image = override.image.trim();
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
    override.stockStatus === 'in_stock' ||
    override.stockStatus === 'out_of_stock' ||
    override.stockStatus === 'limited'
  ) {
    next.stockStatus = override.stockStatus;
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

  return next;
}

export async function getCatalogProducts(): Promise<CatalogProduct[]> {
  if (isTestModeEnabled()) {
    logTestMode('catalog/products using bundled catalog only')
    return bilycardProducts
      .filter((product) => !isCatalogHiddenFromListings(product))
      .map((product) => enrichProductDescriptions(product))
  }

  await connectDB();

  const customProducts = (await CustomProduct.find({ active: true })
    .sort({ createdAt: -1 })
    .lean()) as LeanCustomProduct[];

  const overrides = (await ProductOverride.find({}).lean()) as LeanProductOverride[];
  const overrideMap = new Map<string, LeanProductOverride>();
  const hiddenSlugs = new Set<string>();

  for (const row of overrides) {
    const slug = String(row?.slug || '').trim().toLowerCase();
    if (!slug) continue;

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
    map.set(slug, enrichProductDescriptions(applyOverride(product, overrideMap.get(slug))));
  }

  for (const product of customProducts) {
    const slug = String(product.slug).toLowerCase();
    if (hiddenSlugs.has(slug)) continue;
    map.set(
      slug,
      enrichProductDescriptions(applyOverride(toCatalogProduct(product), overrideMap.get(slug)))
    );
  }

  return Array.from(map.values());
}

export async function getCatalogProductBySlug(slug: string): Promise<CatalogProduct | undefined> {
  const normalized = String(slug || '').trim().toLowerCase();
  if (!normalized) return undefined;

  if (isTestModeEnabled()) {
    const product = bilycardProducts.find((item) => String(item.slug).toLowerCase() === normalized);
    return product ? enrichProductDescriptions(product) : undefined;
  }

  await connectDB();

  const override = (await ProductOverride.findOne({ slug: normalized }).lean()) as
    | LeanProductOverride
    | null;

  if (override?.active === false) {
    return undefined;
  }

  const custom = (await CustomProduct.findOne({
    slug: normalized,
    active: true,
  }).lean()) as LeanCustomProduct | null;

  if (custom) {
    return enrichProductDescriptions(applyOverride(toCatalogProduct(custom), override));
  }

  const base = bilycardProducts.find((product) => String(product.slug).toLowerCase() === normalized);
  if (!base) return undefined;

  return enrichProductDescriptions(applyOverride(base, override));
}

export async function getCatalogBestSellingProducts(): Promise<CatalogProduct[]> {
  const products = await getCatalogProducts();
  return products.filter((product) => Boolean(product.bestSeller));
}

export async function getCatalogDisplayProducts(): Promise<CatalogDisplayProduct[]> {
  const products = await getCatalogProducts();
  return groupCatalogProducts(products.filter((product) => !isCatalogHiddenFromListings(product)));
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
