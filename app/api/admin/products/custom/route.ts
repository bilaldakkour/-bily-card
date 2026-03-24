import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/auth/middleware';
import { connectDB } from '@/lib/db/mongodb';
import { JWTPayload } from '@/lib/types';
import { invalidateCatalogProductsCache } from '@/lib/data/catalogProducts';
import CustomProduct from '@/lib/models/CustomProduct';
import ProductOverride from '@/lib/models/ProductOverride';
import { normalizeProductProviderMode } from '@/lib/products/providerMode';
import { normalizeSaleEnabled, resolveStockFields } from '@/lib/products/stock';
import type { ProductProviderLink, ProductRoutingMode } from '@/lib/data/products';

function slugify(input: string) {
  return String(input || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function parseMode(value: unknown): 'single' | 'package' | 'count' {
  const mode = String(value || 'single').toLowerCase();
  if (mode === 'package' || mode === 'count') return mode;
  return 'single';
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

    const rows = await CustomProduct.find({}).sort({ createdAt: -1 }).lean();

    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    console.error('Custom products GET error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch custom products' },
      { status: 500 }
    );
  }
}

async function postHandler(req: NextRequest, _user: JWTPayload): Promise<NextResponse> {
  try {
    await connectDB();

    const body = await req.json();
    const name = String(body.name || '').trim();
    const slug = slugify(body.slug || body.name || '');
    const category = String(body.category || '').trim().toLowerCase();
    const image = String(body.image || '').trim();
    const shortDescription = String(body.shortDescription || '').trim();
    const fullDescription = String(body.fullDescription || '').trim();
    const price = Number(body.price || 0);
    const costPriceInput = parseOptionalCostPriceInput(body.costPrice);
    const mode = parseMode(body.mode);
    const saleEnabled = normalizeSaleEnabled(body.saleEnabled);

    if (!name || !slug || !category || !image || !shortDescription || !fullDescription) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
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

    const stockQuantityInput = parseStockQuantityInput(body.stockQuantity);
    if (!stockQuantityInput.valid) {
      return NextResponse.json(
        { success: false, message: 'Invalid stock quantity' },
        { status: 400 }
      );
    }

    const packageOptionsRaw = Array.isArray(body.packageOptions) ? body.packageOptions : [];
    const packageOptions = packageOptionsRaw
      .map((row: any) => ({
        label: String(row?.label || '').trim(),
        price: Number(row?.price || 0),
        inStock: row?.inStock !== false,
      }))
      .filter((row: any) => row.label && Number.isFinite(row.price) && row.price >= 0);

    if (mode === 'package' && packageOptions.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Package products require at least one package option' },
        { status: 400 }
      );
    }

    const countMin = Number(body.countMin || 1);
    const countMax = Number(body.countMax || 0);

    if (mode === 'count' && (!Number.isFinite(countMin) || countMin < 1)) {
      return NextResponse.json(
        { success: false, message: 'Count products require valid countMin' },
        { status: 400 }
      );
    }

    if (mode === 'count' && Number.isFinite(countMax) && countMax > 0 && countMax < countMin) {
      return NextResponse.json(
        { success: false, message: 'countMax must be greater than or equal to countMin' },
        { status: 400 }
      );
    }

    const tags = String(body.tags || '')
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
    const existing = await CustomProduct.findOne({ slug })
      .select('stockQuantity stockStatus')
      .lean();
    const resolvedStock = resolveStockFields(
      typeof stockQuantityInput.value === 'number'
        ? stockQuantityInput.value
        : existing?.stockQuantity,
      body.stockStatus ?? existing?.stockStatus
    );
    const hasCostPriceField = Object.prototype.hasOwnProperty.call(body, 'costPrice');
    const providerLinks = normalizeProviderLinksInput(body?.providerLinks);
    const routingMode = normalizeRoutingModeInput(body?.routingMode);
    const updateOperations: Record<string, any> = {
      $set: {
        name,
        slug,
        category,
        image,
        shortDescription,
        fullDescription,
        price,
        mode,
        packageOptions,
        countMin: mode === 'count' ? Math.max(1, countMin) : undefined,
        countMax:
          mode === 'count' && Number.isFinite(countMax) && countMax > 0
            ? countMax
            : undefined,
        active: body.active !== false,
        featured: body.featured === true,
        bestSeller: body.bestSeller === true,
        stockQuantity: resolvedStock.stockQuantity,
        stockStatus: resolvedStock.stockStatus,
        saleEnabled,
        platform: String(body.platform || 'BilyCard').trim() || 'BilyCard',
        deliveryTime: String(body.deliveryTime || 'Instant').trim() || 'Instant',
        tags,
        providerMode: normalizeProductProviderMode(body.providerMode, 'manual'),
        routingMode,
        providerLinks,
      },
    };

    if (costPriceInput.provided) {
      updateOperations.$set.costPrice = costPriceInput.value;
    } else if (hasCostPriceField) {
      updateOperations.$unset = { costPrice: '' };
    }

    const doc = await CustomProduct.findOneAndUpdate(
      { slug },
      updateOperations,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();

    await ProductOverride.deleteOne({ slug });

    invalidateCatalogProductsCache();

    return NextResponse.json({
      success: true,
      message: 'Custom product saved successfully',
      data: doc,
    });
  } catch (error: any) {
    console.error('Custom products POST error:', error);

    if (String(error?.code || '') === '11000') {
      return NextResponse.json(
        { success: false, message: 'Slug already exists' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: 'Failed to save custom product' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return withAdminAuth(req, getHandler);
}

export async function POST(req: NextRequest) {
  return withAdminAuth(req, postHandler);
}
