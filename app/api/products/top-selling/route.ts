import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Order from '@/lib/models/Order';
import { isTestModeEnabled, logTestMode } from '@/lib/utils/testMode';
import { getCatalogBestSellingProducts } from '@/lib/data/catalogProducts';
import { getTestModeOrders } from '@/lib/utils/testModeStore';

export async function GET() {
  try {
    if (isTestModeEnabled()) {
      const mockOrders = getTestModeOrders().filter((order) => order.status === 'completed');
      const aggregateMap = new Map<string, { slug: string; name: string; sold: number; orders: number; revenue: number }>();

      for (const order of mockOrders) {
        const key = `${String(order.productSlug || '').trim().toLowerCase()}::${String(order.productName || '').trim()}`;
        const existing =
          aggregateMap.get(key) || {
            slug: String(order.productSlug || '').trim().toLowerCase(),
            name: String(order.productName || '').trim(),
            sold: 0,
            orders: 0,
            revenue: 0,
          };

        existing.sold += Number(order.quantity || 0);
        existing.orders += 1;
        existing.revenue += Number(order.total || 0);
        aggregateMap.set(key, existing);
      }

      let data = Array.from(aggregateMap.values())
        .sort((a, b) => b.sold - a.sold || b.orders - a.orders || b.revenue - a.revenue)
        .slice(0, 10);

      if (!data.length) {
        const bestSelling = await getCatalogBestSellingProducts();
        data = bestSelling.slice(0, 10).map((product) => ({
          slug: String(product.slug || '').trim().toLowerCase(),
          name: String(product.name || '').trim(),
          sold: 0,
          orders: 0,
          revenue: 0,
        }));
      }

      logTestMode('products/top-selling requested', { items: data.length });
      return NextResponse.json({ success: true, data, testMode: true });
    }

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
      { $limit: 10 },
    ]);

    const data = (rows || []).map((row: any) => ({
      slug: String(row?._id?.slug || '').trim().toLowerCase(),
      name: String(row?._id?.name || '').trim(),
      sold: Number(row?.sold || 0),
      orders: Number(row?.orders || 0),
      revenue: Number(row?.revenue || 0),
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Top selling fetch error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch top selling products' },
      { status: 500 }
    );
  }
}
