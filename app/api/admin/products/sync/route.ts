import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/auth/middleware';
import { connectDB } from '@/lib/db/mongodb';
import CustomProduct from '@/lib/models/CustomProduct';
import ProductProviderMapping from '@/lib/models/ProductProviderMapping';
import ProviderProductReview from '@/lib/models/ProviderProductReview';
import ProviderRegistry from '@/lib/models/ProviderRegistry';
import { getCatalogProducts } from '@/lib/data/catalogProducts';
import { getEnabledProviderAdapters } from '@/lib/providers/registry';
import { classifyProviderProduct, buildUniqueSlugBase } from '@/lib/providers/classification';
import { JWTPayload } from '@/lib/types';
import { handleError } from '@/lib/utils/errors';

let syncInFlightUntil = 0
const ENABLE_PROVIDER_OWNED_PRODUCT_WRITES =
  String(process.env.ENABLE_PROVIDER_OWNED_PRODUCT_WRITES || 'false').trim().toLowerCase() ===
  'true';

function normalizeText(value: unknown) {
  return String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function deriveStockNumber(status: string) {
  if (status === 'out_of_stock' || status === 'paused') return 0;
  if (status === 'low_stock') return 5;
  return 100;
}

async function handler(
  req: NextRequest,
  user: JWTPayload
): Promise<NextResponse> {
  try {
    if (Date.now() < syncInFlightUntil) {
      return NextResponse.json(
        { success: false, message: 'Sync already running, please retry shortly' },
        { status: 429 }
      )
    }
    syncInFlightUntil = Date.now() + 20_000

    const startedAt = Date.now();
    const body = await req.json().catch(() => ({}));
    const mode = String(body?.mode || 'all').trim().toLowerCase();
    const providerSlot = String(body?.providerSlot || '').trim().toLowerCase();

    await connectDB();
    const catalogProducts = await getCatalogProducts();
    const catalogItems = catalogProducts.map((product) => ({
      slug: String(product.slug || '').trim().toLowerCase(),
      name: String(product.name || '').trim(),
      category: String(product.category || '').trim().toLowerCase(),
    }))
    const byId = new Map(
      catalogProducts.map((product) => [String(product.id || '').trim().toLowerCase(), product])
    );
    const byName = new Map(
      catalogProducts.map((product) => [normalizeText(product.name), product])
    );
    const registryRows = await ProviderRegistry.find({
      enabled: true,
      'routing.allowSync': { $ne: false },
    })
      .select('providerKey')
      .lean();
    const enabledProviderKeys = new Set(
      (registryRows as any[]).map((row) => String(row?.providerKey || '').trim().toLowerCase())
    );

    const adapters = getEnabledProviderAdapters().filter((adapter) => {
      if (providerSlot && adapter.slot !== providerSlot) return false;
      return enabledProviderKeys.has(String(adapter.key || '').trim().toLowerCase());
    });

    if (!adapters.length) {
      return NextResponse.json(
        { success: false, message: 'No enabled provider configured' },
        { status: 400 }
      );
    }

    let syncedCount = 0;
    let updatedCount = 0;
    let mappedCount = 0;
    let classifiedMatched = 0;
    let classifiedUnique = 0;
    let classifiedAmbiguous = 0;
    let classifiedInvalid = 0;
    let createdUniqueProducts = 0;
    let preventedDuplicates = 0;
    let syncErrors = 0;
    const syncErrorSamples: Array<{ slot: string; providerProductId: string; message: string }> = [];

    const existingMappings = await ProductProviderMapping.find({})
      .select('internalSlug providerSlot providerProductId')
      .lean();
    const existingMappedSlugByProviderProductId = new Map<string, string>();
    for (const row of existingMappings as any[]) {
      if (String(row?.providerSlot || '') !== 'secondary') continue;
      const productId = String(row?.providerProductId || '').trim().toLowerCase();
      const slug = String(row?.internalSlug || '').trim().toLowerCase();
      if (productId && slug) existingMappedSlugByProviderProductId.set(productId, slug);
    }

    const existingCatalogSlugSet = new Set(catalogItems.map((item) => item.slug));

    for (const adapter of adapters) {
      if (adapter.key === 'go4card') {
        try {
          if (adapter.testConnection) {
            const probe = await adapter.testConnection()
            if (!probe.ok && !probe.profileOk) {
              throw new Error(probe.message || 'Provider preflight failed')
            }
            if (probe.productsSlow) {
              console.warn('Go4Card sync preflight: profile OK, products probe slow')
            }
          }
        } catch (preflightError) {
          console.error('Go4Card sync preflight failed:', preflightError)
          throw preflightError
        }
      }

      const providerProducts = await adapter.fetchProducts();
      const seenProviderIds = new Set<string>();

      for (const prod of providerProducts) {
        const providerProductId = String(prod.providerProductId || '').trim();
        if (!providerProductId) continue;
        if (seenProviderIds.has(providerProductId)) continue;
        seenProviderIds.add(providerProductId);
        try {

        const cost = Number(prod.cost || 0);
        const productName = String(prod.displayName || prod.providerProductName || '').trim();
        const classification = classifyProviderProduct({
          product: {
            providerProductId,
            displayName: productName,
            providerProductName: String(prod.providerProductName || ''),
            category: String(prod.category || ''),
            cost,
            stockStatus: String(prod.stockStatus || ''),
            deliveryType: String(prod.deliveryType || ''),
            metadata: prod.metadata || {},
          },
          catalogProducts: catalogItems,
          existingMappedSlugByProviderProductId:
            adapter.slot === 'secondary' ? existingMappedSlugByProviderProductId : undefined,
        });

        if (classification.classification === 'matched_to_existing') classifiedMatched++;
        if (classification.classification === 'new_unique_products') classifiedUnique++;
        if (classification.classification === 'ambiguous_candidates') classifiedAmbiguous++;
        if (classification.classification === 'invalid_or_unusable') classifiedInvalid++;

        await ProviderProductReview.findOneAndUpdate(
          { providerSlot: adapter.slot, adapterKey: adapter.key, providerProductId },
          {
            $set: {
              providerSlot: adapter.slot,
              adapterKey: adapter.key,
              providerProductId,
              providerProductName: productName || providerProductId,
              providerCategory: String(prod.category || '').trim().toLowerCase(),
              classification: classification.classification,
              suggestedInternalSlug: classification.suggestedInternalSlug || undefined,
              confidence: classification.confidence,
              reasons: classification.reasons,
              requirements: classification.requirements,
              rawSnapshot: {
                stockStatus: prod.stockStatus,
                cost,
                metadata: prod.metadata || {},
              },
            },
            $setOnInsert: {
              reviewStatus: 'pending_review',
            },
          },
          { upsert: true }
        );

        let matchedCatalogProduct =
          classification.suggestedInternalSlug
            ? catalogProducts.find((p) => String(p.slug || '').toLowerCase() === classification.suggestedInternalSlug)
            : null;

        if (!matchedCatalogProduct) {
          matchedCatalogProduct =
            byId.get(providerProductId.toLowerCase()) ||
            byId.get(`pkg-${providerProductId.toLowerCase()}`) ||
            byName.get(normalizeText(prod.displayName)) ||
            byName.get(normalizeText(prod.providerProductName));
        }

        if (
          ENABLE_PROVIDER_OWNED_PRODUCT_WRITES &&
          adapter.slot === 'secondary' &&
          classification.classification === 'new_unique_products'
        ) {
          const baseSlug = buildUniqueSlugBase({
            providerName: productName || providerProductId,
            providerProductId,
          });
          let nextSlug = baseSlug;
          let counter = 1;
          while (existingCatalogSlugSet.has(nextSlug)) {
            preventedDuplicates++;
            counter += 1;
            nextSlug = `${baseSlug}-${counter}`.slice(0, 95);
          }

          const requirements = classification.requirements
          const qualityOk =
            Boolean(productName) &&
            Boolean(providerProductId) &&
            Boolean(prod.category) &&
            Number.isFinite(cost) &&
            cost > 0 &&
            !requirements.requiresExtraInput;

          if (qualityOk) {
            const qtyRule = requirements.quantityRule
            const isPackage = qtyRule.mode === 'list' && qtyRule.values.length > 0
            const isCount = qtyRule.mode === 'range'
            const mode = isPackage ? 'package' : isCount ? 'count' : 'single'
            const price = Number((cost * 1.2).toFixed(6))
            const packageOptions = isPackage
              ? qtyRule.values.map((value) => ({
                  label: `${value}`,
                  price: Number((cost * Number(value) * 1.2).toFixed(6)),
                  inStock: prod.stockStatus !== 'out_of_stock',
                }))
              : []

            await CustomProduct.findOneAndUpdate(
              { slug: nextSlug },
              {
                $setOnInsert: {
                  name: productName,
                  slug: nextSlug,
                  shortDescription: productName,
                  fullDescription: productName,
                  price,
                  costPrice: cost,
                  category: String(prod.category || 'general').toLowerCase(),
                  image: String(prod.image || '/placeholder.png'),
                  mode,
                  packageOptions,
                  countMin: isCount ? qtyRule.min : undefined,
                  countMax: isCount ? qtyRule.max : undefined,
                  active: prod.stockStatus !== 'out_of_stock',
                  featured: false,
                  bestSeller: false,
                  stockQuantity: deriveStockNumber(prod.stockStatus),
                  stockStatus: prod.stockStatus === 'out_of_stock' ? 'out_of_stock' : 'in_stock',
                  saleEnabled: prod.stockStatus !== 'out_of_stock',
                  platform: 'BilyCard',
                  deliveryTime: 'Instant',
                  tags: ['secondary-provider'],
                  providerMode: 'secondary',
                },
              },
              { upsert: true }
            )

            existingCatalogSlugSet.add(nextSlug)
            createdUniqueProducts++
            matchedCatalogProduct = {
              slug: nextSlug,
              id: `manual-${nextSlug}`,
            } as any
          }
        }

        if (mode !== 'mappings_only' && ENABLE_PROVIDER_OWNED_PRODUCT_WRITES) {
          // Legacy provider-owned catalog writes are intentionally disabled by default.
          // Keep this gate for emergency rollback only.
        }

        const canAutoMap =
          classification.classification === 'matched_to_existing' ||
          classification.classification === 'new_unique_products'

        if (matchedCatalogProduct?.slug && canAutoMap) {
          const slugValue = String(matchedCatalogProduct.slug || '').toLowerCase()
          const activeRows = await ProductProviderMapping.countDocuments({
            internalSlug: slugValue,
            active: true,
          })
          const sourceType =
            activeRows >= 2 ? 'multi_source' : activeRows === 1 ? 'single_source' : 'unmapped'

          await ProductProviderMapping.findOneAndUpdate(
            {
              internalSlug: slugValue,
              providerSlot: adapter.slot,
              providerProductId,
            },
            {
              $set: {
                internalSlug: slugValue,
                providerSlot: adapter.slot,
                providerProductId,
                providerProductName: String(
                  prod.providerProductName || prod.displayName || ''
                ),
                active:
                  classification.classification !== 'invalid_or_unusable' &&
                  String(prod.stockStatus || '').toLowerCase() !== 'out_of_stock',
                fallbackEnabled: classification.classification !== 'invalid_or_unusable',
                ...(mode !== 'stock_only'
                  ? { lastSyncedCost: Number.isFinite(cost) && cost >= 0 ? cost : 0 }
                  : {}),
                ...(mode !== 'costs_only'
                  ? { stockStatus: prod.stockStatus || 'unknown' }
                  : {}),
                deliveryType: prod.deliveryType || 'instant',
                currency: prod.currency || 'USD',
                metadata: {
                  ...(prod.metadata || {}),
                  ...(mode !== 'stock_only'
                    ? { providerRawPrice: Number.isFinite(cost) && cost >= 0 ? cost : 0 }
                    : {}),
                  sourceType,
                  classification: classification.classification,
                  classificationConfidence: classification.confidence,
                  classificationReasons: classification.reasons,
                },
                updatedBy: user.userId,
              },
              $setOnInsert: {
                priority: adapter.slot === 'primary' ? 100 : 200,
              },
            },
            { upsert: true }
          );
          mappedCount++;
        }
        } catch (productSyncError: any) {
          syncErrors += 1
          const message = String(productSyncError?.message || 'product_sync_failed')
          if (syncErrorSamples.length < 20) {
            syncErrorSamples.push({
              slot: adapter.slot,
              providerProductId,
              message,
            })
          }
          console.error('Provider product sync item failed', {
            slot: adapter.slot,
            adapter: adapter.key,
            providerProductId,
            message,
            code: productSyncError?.code,
          })
          continue
        }
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Products synced successfully',
        data: {
          mode,
          synced: syncedCount,
          updated: updatedCount,
          mapped: mappedCount,
          classifiedMatched,
          classifiedUnique,
          classifiedAmbiguous,
          classifiedInvalid,
          createdUniqueProducts,
          preventedDuplicates,
          syncErrors,
          syncErrorSamples,
          providers: adapters.map((adapter) => `${adapter.slot}:${adapter.key}`),
          durationMs: Date.now() - startedAt,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Admin products sync fatal error:', {
      message: error?.message,
      code: error?.code,
      stack: error?.stack,
    })
    const { statusCode, message } = handleError(error);
    return NextResponse.json(
      { success: false, message },
      { status: statusCode }
    );
  } finally {
    syncInFlightUntil = 0
  }
}

export async function POST(req: NextRequest) {
  return withAdminAuth(req, handler);
}
