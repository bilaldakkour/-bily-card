import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { invalidateCatalogProductsCache } from '@/lib/data/catalogProducts';
import { connectDB } from '@/lib/db/mongodb';
import { resolveProviderOrderSync } from '@/lib/orders/providerSync';
import { refundOrderAndRestoreStock } from '@/lib/orders/refundRecovery';
import Order from '@/lib/models/Order';
import { JWTPayload } from '@/lib/types';
import { handleError } from '@/lib/utils/errors';

function buildSafeOrderResponse(order: any) {
  const status = String(order.status || 'pending')
  const customerMessage =
    status === 'failed' || status === 'rejected'
      ? 'We could not complete this order.'
      : status === 'refunded'
        ? 'This order was refunded.'
        : status === 'completed'
          ? 'Order completed successfully.'
          : 'Your order is being processed.'

  return {
    _id: String(order._id),
    orderId: String(order.orderId || ''),
    productName: String(order.productName || ''),
    productSlug: String(order.productSlug || ''),
    playerId: String(order.playerId || ''),
    quantity: Number(order.quantity || 1),
    price: Number(order.price || 0),
    total: Number(order.total || 0),
    status,
    providerStatus: '',
    selectedPackageOption: String(order.selectedPackageOption || ''),
    notes: customerMessage,
    failureReason:
      status === 'failed' || status === 'rejected' || status === 'refunded'
        ? customerMessage
        : '',
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  }
}

async function handler(
  req: NextRequest,
  user: JWTPayload,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    await connectDB();

    const order = await Order.findOne({
      _id: params.id,
      userId: user.userId,
    });

    if (!order) {
      return NextResponse.json(
        { success: false, message: 'Order not found' },
        { status: 404 }
      );
    }

    const providerSync = await resolveProviderOrderSync(order.toObject());
    if (providerSync) {
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
            invalidateCatalogProductsCache();
          }

          return NextResponse.json(
            {
              success: true,
              data: buildSafeOrderResponse(refundResult.order),
            },
            { status: 200 }
          );
        }
      } else if (mappedStatus !== order.status || providerStatus !== order.providerStatus) {
        order.status = mappedStatus;
        order.providerStatus = providerStatus;
        order.providerResponse = statusPayload;

        if (providerStatus === 'cancelled') {
          order.failureReason = 'Provider cancelled order and refunded balance at source';
        }

        await order.save();
      }
    }

    return NextResponse.json(
      {
        success: true,
        data: buildSafeOrderResponse(order),
      },
      { status: 200 }
    );
  } catch (error: any) {
    const { statusCode, message } = handleError(error);
    return NextResponse.json(
      { success: false, message },
      { status: statusCode }
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(req, (r, u) => handler(r, u, { params }));
}
