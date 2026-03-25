import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/auth/middleware';
import { connectDB } from '@/lib/db/mongodb';
import { JWTPayload } from '@/lib/types';
import { getCatalogProducts, invalidateCatalogProductsCache } from '@/lib/data/catalogProducts';
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
      executionEnabled: raw?.executionEnabled !== false,
      priceSyncEnabled: raw?.priceSyncEnabled !== false,
      priority: Number.isFinite(Number(raw?.priority)) ? Number(raw?.priority) : 100,
      priceSource: String(raw?.priceSource || '').toLowerCase() === 'manual' ? 'manual' : 'provider',
      manualCost: Number.isFinite(Number(raw?.manualCost)) ? Number(raw?.manualCost) : undefined,
      lastKnownCost: Number.isFinite(Number(raw?.lastKnownCost)) ? Number(raw?.lastKnownCost) : undefined,
      lastCost: Number.isFinite(Number(raw?.lastCost)) ? Number(raw?.lastCost) : undefined,
      providerAvailability:
        String(raw?.providerAvailability || '').toLowerCase() === 'available'
          ? 'available'
          : String(raw?.providerAvailability || '').toLowerCase() === 'unavailable'
            ? 'unavailable'
            : 'unknown',
      healthStatus:
        String(raw?.healthStatus || '').toLowerCase() === 'healthy'
          ? 'healthy'
          : String(raw?.healthStatus || '').toLowerCase() === 'degraded'
            ? 'degraded'
            : String(raw?.healthStatus || '').toLowerCase() === 'unhealthy'
              ? 'unhealthy'
              : 'unknown',
      fallbackEnabled: raw?.fallbackEnabled !== false,
      lastError: String(raw?.lastError || '').trim() || undefined,
      variantKey: String(raw?.variantKey || '').trim().toLowerCase() || undefined,
      lastSyncAt: raw?.lastSyncAt ? String(raw.lastSyncAt) : undefined,
    });
  }
  return rows;
}

function normalizeRoutingModeInput(value: unknown): ProductRoutingMode {
  return String(value || '').toLowerCase() === 'priority' ? 'priority' : 'cheapest';
}

function normalizeVariantKey(value: unknown) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9 ]+/g, '')
    .trim();
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

function derivePackageOptionsFromCatalog(product: {
  inputFields?: Array<{ name?: string; type?: string; options?: string[] }>;
}) {
  const field = (Array.isArray(product.inputFields) ? product.inputFields : []).find(
    (row) => row?.name === 'package' && row?.type === 'select'
  );
  const options = Array.isArray(field?.options) ? field.options : [];
  return options
    .map((option) => {
      const text = String(option || '').trim();
      if (!text) return null;
      const outOfStock = /out of stock/i.test(text);
      const priceMatch = text.match(/\$\s*([0-9]+(?:\.[0-9]+)?)/);
      const price = priceMatch ? Number(priceMatch[1]) : 0;
      const label = text.replace(/\s*-\s*\$[0-9]+(?:\.[0-9]+)?(\s*\(Out of stock\))?/i, '').trim();
      if (!label) return null;
      return {
        key: normalizeVariantKey(label),
        label,
        price: Number.isFinite(price) && price >= 0 ? price : 0,
        inStock: !outOfStock,
      };
    })
    .filter(Boolean);
}

function buildUcPubgDefaultProviderLinks(input: {
  slug: string;
  catalogProductId?: string;
  packageOptions?: Array<{ key?: string; label?: string; price?: number }>;
  existingLinks?: ProductProviderLink[];
}) {
  if (String(input.slug || '').trim().toLowerCase() !== 'uc-pubg') {
    return Array.isArray(input.existingLinks) ? input.existingLinks : [];
  }

  const existing = Array.isArray(input.existingLinks) ? input.existingLinks : [];
  if (existing.length > 0) return existing;

  const providerProductId = String(input.catalogProductId || '').trim();
  if (!providerProductId) return existing;

  const stamp = new Date().toISOString();
  return (Array.isArray(input.packageOptions) ? input.packageOptions : [])
    .map((pkg) => {
      const key = normalizeVariantKey(pkg?.key || pkg?.label || '');
      if (!key) return null;
      const cost = Number(pkg?.price || 0);
      return {
        providerCode: 'dailycard',
        providerProductId,
        providerProductName: String(pkg?.label || '').trim() || undefined,
        enabled: true,
        executionEnabled: true,
        priceSyncEnabled: true,
        fallbackEnabled: true,
        priority: 100,
        priceSource: 'provider' as const,
        lastKnownCost: Number.isFinite(cost) && cost > 0 ? cost : undefined,
        lastCost: Number.isFinite(cost) && cost > 0 ? cost : undefined,
        providerAvailability: 'available' as const,
        healthStatus: 'healthy' as const,
        variantKey: key,
        lastSyncAt: stamp,
      } satisfies ProductProviderLink;
    })
    .filter(Boolean) as ProductProviderLink[];
}

function isGo4CardImportedCustom(row: {
  providerMode?: string;
  tags?: string[];
  providerLinks?: ProductProviderLink[];
}) {
  const tags = Array.isArray(row?.tags)
    ? row.tags.map((tag) => String(tag || '').trim().toLowerCase())
    : [];
  if (tags.includes('secondary-provider') || tags.includes('go4card-imported')) return true;
  if (String(row?.providerMode || '').trim().toLowerCase() === 'secondary') return true;
  const links = Array.isArray(row?.providerLinks) ? row.providerLinks : [];
  if (!links.length) return false;
  return links.every((link) => String(link?.providerCode || '').trim().toLowerCase() === 'go4card');
}

async function getHandler(_req: NextRequest, _user: JWTPayload): Promise<NextResponse> {
  try {
    await connectDB();
    const catalogProducts = await getCatalogProducts();
    const customRows = await CustomProduct.find({ active: true })
        .select(
        'slug name category image shortDescription fullDescription price costPrice platform deliveryTime stockQuantity stockStatus saleEnabled tags featured bestSeller providerMode profitMarginPercent roundingRule routingMode providerLinks mode packageOptions countMin countMax'
      )
      .lean();
    const customMap = new Map(
      customRows.map((row: any) => [String(row?.slug || '').trim().toLowerCase(), row])
    );

    const data = catalogProducts
      .filter((product) => {
        const slug = String(product.slug || '').trim().toLowerCase();
        const custom = customMap.get(slug) as any | undefined;
        if (!custom) return true;
        return !isGo4CardImportedCustom(custom);
      })
      .map((product: any) => {
      const slug = String(product?.slug || '').trim().toLowerCase();
      const custom = customMap.get(slug) as any | undefined;
      const derivedMode = deriveCatalogMode(product);
      const derivedPackageOptions = derivePackageOptionsFromCatalog(product) as Array<{
        key?: string;
        label: string;
        price: number;
        inStock: boolean;
      }>;
      const customPackageOptions = Array.isArray(custom?.packageOptions)
        ? custom.packageOptions
            .map((row: any) => {
              const label = String(row?.label || '').trim();
              if (!label) return null;
              const price = Number(row?.price || 0);
              return {
                key: normalizeVariantKey(row?.key || label),
                label,
                price: Number.isFinite(price) && price >= 0 ? price : 0,
                inStock: row?.inStock !== false,
              };
            })
            .filter(Boolean)
        : [];
      const resolvedPackageOptions = customPackageOptions.length
        ? customPackageOptions
        : derivedPackageOptions;
      const resolvedProviderLinks = buildUcPubgDefaultProviderLinks({
        slug,
        catalogProductId: String(product?.id || '').trim(),
        packageOptions: resolvedPackageOptions,
        existingLinks: Array.isArray(custom?.providerLinks)
          ? custom.providerLinks
          : Array.isArray(product?.providerLinks)
            ? product.providerLinks
            : [],
      });

      return {
        id: String(product?.id || `manual-${String(custom?._id || slug || '')}`),
        slug,
        name: String(product?.name || custom?.name || ''),
        category: String(product?.category || custom?.category || ''),
        image: String(product?.image || custom?.image || '/favicon.png'),
        shortDescription: String(product?.shortDescription || custom?.shortDescription || ''),
        fullDescription: String(product?.fullDescription || custom?.fullDescription || ''),
        price: Number(product?.price ?? custom?.price ?? 0),
        costPrice:
          typeof custom?.costPrice === 'number' && Number.isFinite(custom.costPrice)
            ? Number(custom.costPrice)
            : undefined,
        platform: String(product?.platform || custom?.platform || 'BilyCard'),
        deliveryTime: String(product?.deliveryTime || custom?.deliveryTime || 'Instant'),
        stockQuantity: Number(custom?.stockQuantity ?? product?.stockQuantity ?? 0),
        stockStatus: String(custom?.stockStatus || product?.stockStatus || 'out_of_stock'),
        saleEnabled: custom?.saleEnabled !== false && product?.saleEnabled !== false,
        tags: Array.isArray(custom?.tags)
          ? custom.tags
          : Array.isArray(product?.tags)
            ? product.tags
            : [],
        featured: Boolean(product?.featured ?? custom?.featured),
        bestSeller: Boolean(product?.bestSeller ?? custom?.bestSeller),
        providerMode: normalizeProductProviderMode(product?.providerMode, custom ? 'manual' : 'primary'),
        profitMarginPercent:
          Number.isFinite(Number(custom?.profitMarginPercent))
            ? Number(custom.profitMarginPercent)
            : undefined,
        roundingRule:
          String(custom?.roundingRule || '').trim() || 'none',
        routingMode:
          String(custom?.routingMode || product?.routingMode || '').toLowerCase() === 'priority'
            ? 'priority'
            : 'cheapest',
        providerLinks: resolvedProviderLinks,
        source: 'custom',
        mode: custom?.mode || derivedMode.mode,
        packageOptions: resolvedPackageOptions,
        countMin:
          typeof custom?.countMin === 'number'
            ? custom.countMin
            : 'countMin' in derivedMode
              ? derivedMode.countMin
              : undefined,
        countMax:
          typeof custom?.countMax === 'number'
            ? custom.countMax
            : 'countMax' in derivedMode
              ? derivedMode.countMax
              : undefined,
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
    const resolvedStock = resolveStockFields(
      typeof stockQuantityInput.value === 'number'
        ? stockQuantityInput.value
        : custom?.stockQuantity,
      body?.stockStatus ?? custom?.stockStatus
    );
    const mode = parseMode(body?.mode ?? custom?.mode);
    const packageOptionsRaw = Array.isArray(body?.packageOptions) ? body.packageOptions : [];
    const packageOptions: Array<{ key?: string; label: string; price: number; inStock: boolean }> = packageOptionsRaw
      .map((row: any) => ({
        key: normalizeVariantKey(row?.key || row?.label || ''),
        label: String(row?.label || '').trim(),
        price: Number(row?.price || 0),
        inStock: row?.inStock !== false,
      }))
      .filter((row: any) => row.label && Number.isFinite(row.price) && row.price >= 0);
    const countMin = Number(body?.countMin || custom?.countMin || 1);
    const countMax = Number(body?.countMax || custom?.countMax || 0);
    const profitMarginPercent = Number(body?.profitMarginPercent);
    const normalizedProfitMarginPercent =
      Number.isFinite(profitMarginPercent) && profitMarginPercent >= 0 ? profitMarginPercent : undefined;
    const roundingRuleRaw = String(body?.roundingRule || '').trim().toLowerCase();
    const roundingRule = [
      'none',
      'ceil_0_01',
      'round_0_01',
      'ceil_0_1',
      'round_0_1',
      'ceil_1',
      'round_1',
    ].includes(roundingRuleRaw)
      ? roundingRuleRaw
      : 'none';

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

    const providerMode = normalizeProductProviderMode(body?.providerMode, 'manual');
    const routingMode = normalizeRoutingModeInput(body?.routingMode);
    const providerLinks = normalizeProviderLinksInput(body?.providerLinks);
    const packageOptionsWithLinks =
      mode === 'package'
        ? packageOptions.map((pkg: { key?: string; label: string; price: number; inStock: boolean }) => {
            const variantKey = normalizeVariantKey(pkg.key || pkg.label || '');
            const scopedLinks = providerLinks.filter(
              (link) => normalizeVariantKey(link.variantKey || '') === variantKey
            );
            return {
              ...pkg,
              key: variantKey,
              providerLinks: scopedLinks,
            };
          })
        : [];
    const updateSet: Record<string, unknown> = {
      name: patch.name,
      slug,
      category: patch.category,
      image: patch.image || '/favicon.png',
      shortDescription: patch.shortDescription,
      fullDescription: patch.fullDescription,
      price: patch.price,
      platform: patch.platform || 'BilyCard',
      deliveryTime: patch.deliveryTime || 'Instant',
      stockQuantity: patch.stockQuantity,
      stockStatus: patch.stockStatus,
      saleEnabled: patch.saleEnabled,
      tags: patch.tags,
      featured: patch.featured,
      bestSeller: patch.bestSeller,
      providerMode: normalizeProductProviderMode(providerMode, 'manual'),
      profitMarginPercent: normalizedProfitMarginPercent,
      roundingRule,
      routingMode,
      providerLinks,
      active: true,
      mode,
      packageOptions: packageOptionsWithLinks,
      countMin: mode === 'count' ? Math.max(1, countMin) : undefined,
      countMax:
        mode === 'count' && Number.isFinite(countMax) && countMax > 0
          ? Math.max(Math.max(1, countMin), countMax)
          : undefined,
    };
    if (costPriceInput.provided) {
      updateSet.costPrice = costPriceInput.value;
    }
    const updateDoc: Record<string, unknown> = { $set: updateSet };
    if (!costPriceInput.provided && hasCostPriceField) {
      updateDoc.$unset = { costPrice: '' };
    }

    await CustomProduct.findOneAndUpdate({ slug }, updateDoc, {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    });
    await ProductOverride.deleteOne({ slug });

    invalidateCatalogProductsCache();

    await logAdminAction({
      adminUserId: String(user.userId),
      action: 'product_updated',
      targetType: 'system',
      targetId: slug,
      details: {
        slug,
        source: 'custom',
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
