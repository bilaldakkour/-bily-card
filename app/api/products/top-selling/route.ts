import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Order from '@/lib/models/Order';

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
