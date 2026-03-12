import { bilycardProducts } from '@/lib/data/bilycardProducts';
import type { Product } from '@/lib/data/products';
import { connectDB } from '@/lib/db/mongodb';
import CustomProduct from '@/lib/models/CustomProduct';

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

export async function getCatalogProducts(): Promise<CatalogProduct[]> {
  await connectDB();

  const customProducts = (await CustomProduct.find({ active: true })
    .sort({ createdAt: -1 })
    .lean()) as LeanCustomProduct[];

  const map = new Map<string, CatalogProduct>();

  for (const product of bilycardProducts) {
    map.set(String(product.slug).toLowerCase(), product);
  }

  for (const product of customProducts) {
    map.set(String(product.slug).toLowerCase(), toCatalogProduct(product));
  }

  return Array.from(map.values());
}

export async function getCatalogProductBySlug(slug: string): Promise<CatalogProduct | undefined> {
  const normalized = String(slug || '').trim().toLowerCase();
  if (!normalized) return undefined;

  await connectDB();

  const custom = (await CustomProduct.findOne({
    slug: normalized,
    active: true,
  }).lean()) as LeanCustomProduct | null;

  if (custom) {
    return toCatalogProduct(custom);
  }

  return bilycardProducts.find((product) => String(product.slug).toLowerCase() === normalized);
}

export async function getCatalogBestSellingProducts(): Promise<CatalogProduct[]> {
  const products = await getCatalogProducts();
  return products.filter((product) => Boolean(product.bestSeller));
}
