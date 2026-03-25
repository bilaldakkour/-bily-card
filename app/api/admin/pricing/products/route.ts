import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/auth/middleware';
import { connectDB } from '@/lib/db/mongodb';
import { JWTPayload } from '@/lib/types';
import ProductPricing from '@/lib/models/ProductPricing';
import CustomProduct from '@/lib/models/CustomProduct';
import { getCatalogProducts } from '@/lib/data/catalogProducts';
import { clampPercent } from '@/lib/pricing/engine';
import type { ProductProviderLink } from '@/lib/data/products';

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

    const rules = await ProductPricing.find({}).select('productSlug percentage').lean();
    const ruleMap: Record<string, number> = {};

    for (const row of rules) {
      if (!row.productSlug) continue;
      ruleMap[String(row.productSlug).toLowerCase()] = Number(row.percentage || 0);
    }

    const [catalogProducts, customRows] = await Promise.all([
      getCatalogProducts(),
      CustomProduct.find({ active: true })
        .select('slug providerMode tags providerLinks mode')
        .lean(),
    ]);
    const customMap = new Map(
      (customRows as any[]).map((row) => [String(row?.slug || '').trim().toLowerCase(), row])
    );

    const data = catalogProducts
      .filter((product: any) => {
        const slug = String(product?.slug || '').trim().toLowerCase();
        const custom = customMap.get(slug) as any | undefined;
        if (!custom) return true;
        return !isGo4CardImportedCustom(custom);
      })
      .map((product: any) => ({
      id: String(product.id || `manual-${String((product as any)._id || product.slug || '')}`),
      slug: String(product.slug || '').toLowerCase(),
      name: String(product.name || ''),
      category: String(product.category || ''),
      basePrice: Number(product.price || 0),
      productPercent: Number(ruleMap[String(product.slug || '').toLowerCase()] || 0),
      stockQuantity: Number(product.stockQuantity || 0),
      stockStatus: (product as any).stockStatus,
      saleEnabled: (product as any).saleEnabled !== false,
      providerMode: (product as any).providerMode || 'manual',
      isCountProduct: Boolean(
        String((customMap.get(String(product.slug || '').toLowerCase()) as any)?.mode || '').toLowerCase() ===
          'count' ||
          product.inputFields?.some((field: any) => field.type === 'number' && field.name === 'count')
      ),
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Admin product pricing fetch error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch product pricing rules' },
      { status: 500 }
    );
  }
}

async function patchHandler(req: NextRequest, user: JWTPayload): Promise<NextResponse> {
  try {
    const body = await req.json();
    const slug = String(body.slug || '').trim().toLowerCase();
    const percent = clampPercent(Number(body.percent || 0));

    if (!slug) {
      return NextResponse.json(
        { success: false, message: 'Missing slug' },
        { status: 400 }
      );
    }

    await connectDB();

    await ProductPricing.findOneAndUpdate(
      { productSlug: slug },
      {
        $set: {
          productSlug: slug,
          percentage: percent,
          updatedBy: user.userId,
        },
      },
      { upsert: true }
    );

    return NextResponse.json({ success: true, message: 'Product pricing updated' });
  } catch (error) {
    console.error('Admin product pricing update error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update product pricing rule' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return withAdminAuth(req, getHandler);
}

export async function PATCH(req: NextRequest) {
  return withAdminAuth(req, patchHandler);
}
