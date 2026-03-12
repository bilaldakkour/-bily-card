import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/auth/middleware';
import { connectDB } from '@/lib/db/mongodb';
import { JWTPayload } from '@/lib/types';
import { getCatalogProducts } from '@/lib/data/catalogProducts';
import ProductPricing from '@/lib/models/ProductPricing';
import { clampPercent } from '@/lib/pricing/engine';

async function getHandler(_req: NextRequest, _user: JWTPayload): Promise<NextResponse> {
  try {
    await connectDB();

    const rules = await ProductPricing.find({}).select('productSlug percentage').lean();
    const ruleMap: Record<string, number> = {};

    for (const row of rules) {
      if (!row.productSlug) continue;
      ruleMap[String(row.productSlug).toLowerCase()] = Number(row.percentage || 0);
    }

    const catalogProducts = await getCatalogProducts();

    const data = catalogProducts.map((product) => ({
      id: product.id,
      slug: product.slug,
      name: product.name,
      category: product.category,
      basePrice: product.price,
      productPercent: Number(ruleMap[product.slug.toLowerCase()] || 0),
      stockStatus: product.stockStatus,
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
