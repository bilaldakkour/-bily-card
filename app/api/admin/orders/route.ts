import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/auth/middleware';
import { invalidateCatalogProductsCache } from '@/lib/data/catalogProducts';
import { connectDB } from '@/lib/db/mongodb';
import { resolveProviderOrderSync } from '@/lib/orders/providerSync';
import { refundOrderAndRestoreStock } from '@/lib/orders/refundRecovery';
import Order from '@/lib/models/Order';
import { JWTPayload } from '@/lib/types';

async function handler(
  req: NextRequest,
  user: JWTPayload
): Promise<NextResponse> {
  try {
    await connectDB();

    const syncCandidates = await Order.find({
      status: { $in: ['pending', 'processing'] },
    })
      .select(
        '_id orderId userId status providerStatus providerSlot providerOrderId providerResponse total quantity productSlug currency notes failureReason'
      )
      .lean();

    let shouldInvalidateCatalogCache = false;

    for (const order of syncCandidates) {
      try {
        const providerSync = await resolveProviderOrderSync(order as any);
        if (!providerSync) continue;

        const { mappedStatus, providerStatus, statusPayload } = providerSync;

        if (mappedStatus === 'refunded' && order.status !== 'refunded') {
          const refundAmount = Number(order.total || 0);

          if (refundAmount > 0) {
            const refundResult = await refundOrderAndRestoreStock({
              orderId: String(order._id),
              refundAmount,
              currency: order.currency === 'LBP' ? 'LBP' : 'USD',
              nextStatus: 'refunded',
              refundNote: 'Refund: Provider cancelled order',
              providerStatus,
              providerResponse: statusPayload,
              notes: 'Auto refunded after provider cancellation',
              failureReason:
                providerStatus === 'cancelled'
                  ? 'Provider cancelled order and refunded balance at source'
                  : String(order.failureReason || ''),
            });

            if (refundResult.stockRestored) {
              shouldInvalidateCatalogCache = true;
            }
          }

          continue;
        }

        if (mappedStatus !== order.status || providerStatus !== order.providerStatus) {
          await Order.updateOne(
            { _id: order._id },
            {
              $set: {
                status: mappedStatus,
                providerStatus,
                providerResponse: statusPayload,
                notes:
                  mappedStatus === 'refunded'
                    ? 'Auto refunded after provider cancellation'
                    : order.notes,
                failureReason:
                  providerStatus === 'cancelled'
                    ? 'Provider cancelled order and refunded balance at source'
                    : order.failureReason,
              },
            }
          );
        }
      } catch (syncError) {
        console.error('Admin provider status sync failed:', order.orderId, syncError);
      }
    }

    if (shouldInvalidateCatalogCache) {
      invalidateCatalogProductsCache();
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const statusFilter = searchParams.get('status');

    const filter: any = {};
    if (statusFilter && statusFilter !== 'all') {
      filter.status = statusFilter;
    }

    const skip = (page - 1) * limit;

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'displayName email')
      .lean();

    const normalizedOrders = orders.map((order: any) => {
      const quantity = Number(order.quantity || 1);
      const total = Number(order.total || 0);
      const baseUnitPrice = Number(order.baseUnitPrice || 0);
      const providerTotalCost = Number(
        order.providerTotalCost || (baseUnitPrice > 0 ? baseUnitPrice * quantity : 0)
      );
      const grossProfit = Number(
        order.grossProfit ?? (total - providerTotalCost)
      );

      return {
        ...order,
        quantity,
        total,
        baseUnitPrice,
        providerTotalCost,
        grossProfit,
      };
    });

    const total = await Order.countDocuments(filter);

    // Calculate stats
    const stats = {
      total: await Order.countDocuments(),
      completed: await Order.countDocuments({ status: 'completed' }),
      failed: await Order.countDocuments({ status: 'failed' }),
      pending: await Order.countDocuments({ status: 'pending' }),
      processing: await Order.countDocuments({ status: 'processing' }),
    };

    return NextResponse.json(
      {
        success: true,
        data: normalizedOrders,
        stats,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Admin orders fetch error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return withAdminAuth(req, handler);
}
