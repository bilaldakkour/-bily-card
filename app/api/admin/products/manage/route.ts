import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/auth/middleware';
import { connectDB } from '@/lib/db/mongodb';
import { JWTPayload } from '@/lib/types';
import {
  getCatalogProducts,
  invalidateCatalogProductsCache,
} from '@/lib/data/catalogProducts';
import CustomProduct from '@/lib/models/CustomProduct';
import ProductOverride from '@/lib/models/ProductOverride';
import { normalizeProductProviderMode } from '@/lib/products/providerMode';
import { normalizeSaleEnabled, resolveStockFields } from '@/lib/products/stock';
import { logAdminAction } from '@/lib/services/auditLogService';
import type { ProductProviderLink, ProductRoutingMode } from '@/lib/data/products';

function parseMode(value: unknown): 'single' | 'package' | 'count' {
  const mode = String(value || 'single').toLowerCase();
  if (mode === 'package' || mode === 'count') return mode;
  return 'single';
}

function deriveCatalogMode(product: {
  inputFields?: Array<{ name?: string; type?: string; validation?: { min?: number; max?: number } }>;
}) {
  const inputFields = Array.isArray(product.inputFields) ? product.inputFields : [];
  const hasPackage = inputFields.some((field) => field?.name === 'package' && field?.type === 'select');
  if (hasPackage) return { mode: 'package' as const };
  const countField = inputFields.find((field) => field?.name === 'count' && field?.type === 'number');
  if (countField) {
    return {
      mode: 'count' as const,
      countMin: Number(countField.validation?.min || 1),
      countMax: Number.isFinite(Number(countField.validation?.max))
        ? Number(countField.validation?.max)
        : undefined,
    };
  }

  return { mode: 'single' as const };
}

function parseStockQuantityInput(value: unknown) {
  if (typeof value === 'undefined' || value === null || String(value).trim() === '') {
    return { provided: false as const, valid: true as const, value: undefined };
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return { provided: true as const, valid: false as const, value: undefined };
  }

  return { provided: true as const, valid: true as const, value: Math.floor(parsed) };
}

function parseOptionalCostPriceInput(value: unknown) {
  if (typeof value === 'undefined' || value === null || String(value).trim() === '') {
    return { provided: false as const, valid: true as const, value: undefined };
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return { provided: true as const, valid: false as const, value: undefined };
  }

  return { provided: true as const, valid: true as const, value: parsed };
}

function normalizeProviderLinksInput(value: unknown): ProductProviderLink[] {
  if (!Array.isArray(value)) return [];
  const rows: ProductProviderLink[] = [];
  const seen = new Set<string>();
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

function normalizeRoutingModeInput(value: unknown): ProductRoutingMode {
  return String(value || '').toLowerCase() === 'priority' ? 'priority' : 'cheapest';
}

async function getHandler(_req: NextRequest, _user: JWTPayload): Promise<NextResponse> {
  try {
    await connectDB();

    const products = await getCatalogProducts();
    const customRows = await CustomProduct.find({ active: true })
      .select('slug mode packageOptions countMin countMax saleEnabled stockQuantity stockStatus costPrice routingMode providerLinks')
      .lean();
    const customMap = new Map(
      customRows.map((row) => [String((row as any).slug || '').toLowerCase(), row as any])
    );
    const customSlugSet = new Set(customMap.keys());

    const data = products.map((product) => {
      const slug = String(product.slug || '').toLowerCase();
      const customRow = customMap.get(slug) as
        | {
            mode?: 'single' | 'package' | 'count';
            packageOptions?: Array<{ label?: string; price?: number; inStock?: boolean }>;
            countMin?: number;
            countMax?: number;
            saleEnabled?: boolean;
            stockQuantity?: number;
            stockStatus?: string;
            costPrice?: number;
          }
        | undefined;
      const derivedMode = deriveCatalogMode(product);
      const mode = customRow?.mode || derivedMode.mode;
      const countMin =
        typeof customRow?.countMin === 'number'
          ? customRow.countMin
          : 'countMin' in derivedMode
            ? derivedMode.countMin
            : undefined;
      const countMax =
        typeof customRow?.countMax === 'number'
          ? customRow.countMax
          : 'countMax' in derivedMode
            ? derivedMode.countMax
            : undefined;

      return {
        id: product.id,
        slug,
        name: product.name,
        category: product.category,
        image: product.image,
        shortDescription: product.shortDescription,
        fullDescription: product.fullDescription,
        price: Number(product.price || 0),
        costPrice:
          typeof customRow?.costPrice === 'number' && Number.isFinite(customRow.costPrice)
            ? Number(customRow.costPrice)
            : undefined,
        platform: product.platform,
        deliveryTime: product.deliveryTime,
        stockQuantity: Number(customRow?.stockQuantity ?? product.stockQuantity ?? 0),
        stockStatus: product.stockStatus,
        saleEnabled: customRow?.saleEnabled !== false && product.saleEnabled !== false,
        tags: Array.isArray(product.tags) ? product.tags : [],
        featured: Boolean(product.featured),
        bestSeller: Boolean(product.bestSeller),
        providerMode: normalizeProductProviderMode(product.providerMode, customSlugSet.has(slug) ? 'manual' : 'primary'),
        routingMode: product.routingMode === 'priority' ? 'priority' : 'cheapest',
        providerLinks: Array.isArray(product.providerLinks) ? product.providerLinks : [],
        source: customSlugSet.has(slug) ? 'custom' : 'provider',
        mode,
        packageOptions: Array.isArray(customRow?.packageOptions) ? customRow.packageOptions : [],
        countMin,
        countMax,
      };
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Admin manage products GET error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to load products' },
      { status: 500 }
    );
  }
}

async function putHandler(req: NextRequest, user: JWTPayload): Promise<NextResponse> {
  try {
    await connectDB();
    const body = await req.json();
    const hasCostPriceField = Object.prototype.hasOwnProperty.call(body ?? {}, 'costPrice');

    const slug = String(body?.slug || '').trim().toLowerCase();
    if (!slug) {
      return NextResponse.json({ success: false, message: 'Missing slug' }, { status: 400 });
    }

    const name = String(body?.name || '').trim();
    const category = String(body?.category || '').trim().toLowerCase();
    const image = String(body?.image || '').trim();
    const shortDescription = String(body?.shortDescription || '').trim();
    const fullDescription = String(body?.fullDescription || '').trim();
    const platform = String(body?.platform || '').trim();
    const deliveryTime = String(body?.deliveryTime || '').trim();
    const price = Number(body?.price || 0);
    const costPriceInput = parseOptionalCostPriceInput(body?.costPrice);
    const saleEnabled = normalizeSaleEnabled(body?.saleEnabled);

    if (!name || !category || !shortDescription || !fullDescription) {
      return NextResponse.json(
        { success: false, message: 'Name, category, and descriptions are required' },
        { status: 400 }
      );
    }

    if (!Number.isFinite(price) || price < 0) {
      return NextResponse.json(
        { success: false, message: 'Invalid price' },
        { status: 400 }
      );
    }

    if (!costPriceInput.valid) {
      return NextResponse.json(
        { success: false, message: 'Invalid purchase cost' },
        { status: 400 }
      );
    }

    const stockQuantityInput = parseStockQuantityInput(body?.stockQuantity);
    if (!stockQuantityInput.valid) {
      return NextResponse.json(
        { success: false, message: 'Invalid stock quantity' },
        { status: 400 }
      );
    }

    const tags = String(body?.tags || '')
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
    const custom = await CustomProduct.findOne({ slug });
    const currentCatalogProduct = custom
      ? null
      : (await getCatalogProducts()).find(
          (product) => String(product.slug || '').trim().toLowerCase() === slug
        );
    const resolvedStock = resolveStockFields(
      typeof stockQuantityInput.value === 'number'
        ? stockQuantityInput.value
        : custom?.stockQuantity ?? currentCatalogProduct?.stockQuantity,
      body?.stockStatus ?? custom?.stockStatus ?? currentCatalogProduct?.stockStatus
    );
    const mode = parseMode(body?.mode ?? custom?.mode);
    const packageOptionsRaw = Array.isArray(body?.packageOptions) ? body.packageOptions : [];
    const packageOptions = packageOptionsRaw
      .map((row: any) => ({
        label: String(row?.label || '').trim(),
        price: Number(row?.price || 0),
        inStock: row?.inStock !== false,
      }))
      .filter((row: any) => row.label && Number.isFinite(row.price) && row.price >= 0);
    const countMin = Number(body?.countMin || custom?.countMin || 1);
    const countMax = Number(body?.countMax || custom?.countMax || 0);

    if (custom && mode === 'package' && packageOptions.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Package products require at least one package option' },
        { status: 400 }
      );
    }

    if (custom && mode === 'count' && (!Number.isFinite(countMin) || countMin < 1)) {
      return NextResponse.json(
        { success: false, message: 'Count products require a valid minimum count' },
        { status: 400 }
      );
    }

    if (custom && mode === 'count' && Number.isFinite(countMax) && countMax > 0 && countMax < countMin) {
      return NextResponse.json(
        { success: false, message: 'Count max must be greater than or equal to count min' },
        { status: 400 }
      );
    }

    const patch = {
      name,
      category,
      image,
      shortDescription,
      fullDescription,
      price,
      costPrice: costPriceInput.value,
      platform,
      deliveryTime,
      stockQuantity: resolvedStock.stockQuantity,
      stockStatus: resolvedStock.stockStatus,
      saleEnabled,
      tags,
      featured: body?.featured === true,
      bestSeller: body?.bestSeller === true,
      active: true,
    };

    const providerMode = normalizeProductProviderMode(body?.providerMode, custom ? 'manual' : 'primary');
    const routingMode = normalizeRoutingModeInput(body?.routingMode);
    const providerLinks = normalizeProviderLinksInput(body?.providerLinks);

    if (custom) {
      custom.name = patch.name;
      custom.category = patch.category;
      custom.image = patch.image;
      custom.shortDescription = patch.shortDescription;
      custom.fullDescription = patch.fullDescription;
      custom.price = patch.price;
      if (costPriceInput.provided) {
        custom.costPrice = costPriceInput.value;
      } else if (hasCostPriceField) {
        custom.costPrice = undefined;
      }
      custom.platform = patch.platform || 'BilyCard';
      custom.deliveryTime = patch.deliveryTime || 'Instant';
      custom.stockQuantity = patch.stockQuantity;
      custom.stockStatus = patch.stockStatus;
      custom.saleEnabled = patch.saleEnabled;
      custom.tags = patch.tags;
      custom.featured = patch.featured;
      custom.bestSeller = patch.bestSeller;
      custom.providerMode = normalizeProductProviderMode(providerMode, 'manual');
      custom.routingMode = routingMode;
      custom.providerLinks = providerLinks as any;
      custom.active = true;
      custom.mode = mode;
      custom.packageOptions = mode === 'package' ? packageOptions : [];
      custom.countMin = mode === 'count' ? Math.max(1, countMin) : undefined;
      custom.countMax =
        mode === 'count' && Number.isFinite(countMax) && countMax > 0
          ? Math.max(Math.max(1, countMin), countMax)
          : undefined;
      await custom.save();
      await ProductOverride.deleteOne({ slug });
    } else {
      await ProductOverride.findOneAndUpdate(
        { slug },
        {
          $set: {
            slug,
            active: true,
            name: patch.name,
            category: patch.category,
            image: patch.image,
            shortDescription: patch.shortDescription,
            fullDescription: patch.fullDescription,
            price: patch.price,
            platform: patch.platform,
            deliveryTime: patch.deliveryTime,
            stockQuantity: patch.stockQuantity,
            stockStatus: patch.stockStatus,
            saleEnabled: patch.saleEnabled,
            tags: patch.tags,
            featured: patch.featured,
            bestSeller: patch.bestSeller,
            providerMode,
            routingMode,
            providerLinks,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    invalidateCatalogProductsCache();

    await logAdminAction({
      adminUserId: String(user.userId),
      action: 'product_updated',
      targetType: 'system',
      targetId: slug,
      details: {
        slug,
        source: custom ? 'custom' : 'provider',
        fields: [
          'name',
          'category',
          'image',
          'shortDescription',
          'fullDescription',
          'price',
          'costPrice',
          'stockQuantity',
          'saleEnabled',
          'providerMode',
          'routingMode',
          'providerLinks',
        ],
      },
    });

    return NextResponse.json({ success: true, message: 'Product updated successfully' });
  } catch (error) {
    console.error('Admin manage products PUT error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update product' },
      { status: 500 }
    );
  }
}

async function deleteHandler(req: NextRequest, user: JWTPayload): Promise<NextResponse> {
  try {
    await connectDB();
    const body = await req.json();
    const slug = String(body?.slug || '').trim().toLowerCase();

    if (!slug) {
      return NextResponse.json({ success: false, message: 'Missing slug' }, { status: 400 });
    }

    const custom = await CustomProduct.findOne({ slug });

    if (custom) {
      await CustomProduct.deleteOne({ slug });
    } else {
      await ProductOverride.findOneAndUpdate(
        { slug },
        { $set: { slug, active: false } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    invalidateCatalogProductsCache();

    await logAdminAction({
      adminUserId: String(user.userId),
      action: 'product_deleted',
      targetType: 'system',
      targetId: slug,
      details: {
        slug,
        mode: custom ? 'hard-delete-custom' : 'soft-delete-provider',
      },
    });

    return NextResponse.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Admin manage products DELETE error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete product' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return withAdminAuth(req, getHandler);
}

export async function PUT(req: NextRequest) {
  return withAdminAuth(req, putHandler);
}

export async function DELETE(req: NextRequest) {
  return withAdminAuth(req, deleteHandler);
}
