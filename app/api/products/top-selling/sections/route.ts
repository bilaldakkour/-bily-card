import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Order from '@/lib/models/Order';
import { bilycardProducts } from '@/lib/data/bilycardProducts';
import { classifyCatalogProduct } from '@/lib/data/catalogTaxonomy';

type AggregatedRow = {
  slug: string;
  name: string;
  sold: number;
  orders: number;
  revenue: number;
};

export async function GET() {
  try {
    await connectDB();

    const rows = await Order.aggregate([
      { $match: { status: 'completed' } },
      {
        $group: {
          _id: {
            slug: { $ifNull: ['$productSlug', ''] },
            name: { $ifNull: ['$productName', ''] },
          },
          sold: { $sum: { $ifNull: ['$quantity', 1] } },
          orders: { $sum: 1 },
          revenue: { $sum: { $ifNull: ['$total', 0] } },
        },
      },
      { $sort: { sold: -1, orders: -1, revenue: -1 } },
      { $limit: 100 },
    ]);

    const bySlug = new Map(bilycardProducts.map((p) => [String(p.slug).toLowerCase(), p]));
    const byName = new Map(bilycardProducts.map((p) => [String(p.name).toLowerCase(), p]));

    const normalized: AggregatedRow[] = (rows || []).map((row: any) => ({
      slug: String(row?._id?.slug || '').trim().toLowerCase(),
      name: String(row?._id?.name || '').trim(),
      sold: Number(row?.sold || 0),
      orders: Number(row?.orders || 0),
      revenue: Number(row?.revenue || 0),
    }));

    const products: AggregatedRow[] = [];
    const packages: AggregatedRow[] = [];
    const cards: AggregatedRow[] = [];

    for (const item of normalized) {
      const matchedProduct = bySlug.get(item.slug) || byName.get(String(item.name).toLowerCase());
      if (!matchedProduct) continue;

      const classification = classifyCatalogProduct(matchedProduct);

      if (classification.offerType === 'cards' || classification.category === 'cards') {
        cards.push(item);
      } else if (classification.offerType === 'packages') {
        packages.push(item);
      } else {
        products.push(item);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        products: products.slice(0, 10),
        packages: packages.slice(0, 10),
        cards: cards.slice(0, 10),
      },
    });
  } catch (error) {
    console.error('Top selling sections fetch error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch top-selling sections' },
      { status: 500 }
    );
  }
}
