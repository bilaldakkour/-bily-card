import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/auth/middleware';
import { connectDB } from '@/lib/db/mongodb';
import Order from '@/lib/models/Order';
import User from '@/lib/models/User';
import walletService from '@/lib/services/walletService';
import { logAdminAction } from '@/lib/services/auditLogService';
import { JWTPayload } from '@/lib/types';
import { handleError } from '@/lib/utils/errors';

async function handler(
  req: NextRequest,
  user: JWTPayload,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const body = await req.json();
    await connectDB();

    const order = await Order.findById(params.id);

    if (!order) {
      return NextResponse.json(
        { success: false, message: 'Order not found' },
        { status: 404 }
      );
    }

    // Handle approve/reject actions
    if (body.action === 'approve') {
      if (order.status !== 'pending' && order.status !== 'processing') {
        return NextResponse.json(
          { success: false, message: 'Order cannot be approved' },
          { status: 400 }
        );
      }

      order.status = 'completed';
      await order.save();

      await logAdminAction({
        adminUserId: user.userId,
        action: 'order_approve',
        targetType: 'order',
        targetId: String(order._id),
        details: {
          orderId: order.orderId,
        },
      });

      return NextResponse.json(
        {
          success: true,
          message: 'Order approved successfully',
          data: order,
        },
        { status: 200 }
      );
    } else if (body.action === 'reject') {
      if (order.status === 'completed') {
        return NextResponse.json(
          { success: false, message: 'Completed orders cannot be rejected' },
          { status: 400 }
        );
      }

      if (order.status === 'rejected') {
        return NextResponse.json(
          { success: false, message: 'Order is already rejected' },
          { status: 400 }
        );
      }

      if (!order.userId) {
        return NextResponse.json(
          {
            success: false,
            message: 'Cannot reject order: related user account is missing',
          },
          { status: 400 }
        );
      }

      const existingUser = (await User.findById(order.userId)
        .select('_id')
        .lean()) as { _id?: unknown } | null;
      if (!existingUser?._id) {
        return NextResponse.json(
          {
            success: false,
            message: 'Cannot reject order: related user account no longer exists',
          },
          { status: 400 }
        );
      }

      const refundAmount = Number(order.price || order.total || 0);
      if (!Number.isFinite(refundAmount) || refundAmount <= 0) {
        return NextResponse.json(
          {
            success: false,
            message: 'Cannot reject order: invalid refund amount',
          },
          { status: 400 }
        );
      }

      const refundCurrency = order.currency === 'LBP' ? 'LBP' : 'USD';

      // Refund the wallet
      await walletService.addBalance(
        String(existingUser._id),
        refundAmount,
        refundCurrency,
        `Refund for rejected order ${order.orderId}`,
        user.userId
      );

      order.status = 'rejected';
      await order.save();

      await logAdminAction({
        adminUserId: user.userId,
        action: 'order_reject',
        targetType: 'order',
        targetId: String(order._id),
        details: {
          orderId: order.orderId,
          refundAmount,
          refundCurrency,
        },
      });

      return NextResponse.json(
        {
          success: true,
          message: 'Order rejected and wallet refunded',
          data: order,
        },
        { status: 200 }
      );
    }

    // Legacy status update (if needed)
    if (body.status) {
      const allowedStatuses = ['pending', 'processing', 'completed', 'failed', 'refunded', 'rejected'];
      if (!allowedStatuses.includes(String(body.status))) {
        return NextResponse.json(
          { success: false, message: 'Invalid status value' },
          { status: 400 }
        );
      }
      order.status = body.status;
    }

    if (body.notes) {
      const notes = String(body.notes).trim();
      if (notes.length > 500) {
        return NextResponse.json(
          { success: false, message: 'Notes are too long' },
          { status: 400 }
        );
      }
      order.notes = notes;
    }

    if (body.status || body.notes) {
      await order.save();

      await logAdminAction({
        adminUserId: user.userId,
        action: 'order_manual_update',
        targetType: 'order',
        targetId: String(order._id),
        details: {
          status: body.status,
          notes: body.notes,
        },
      });

      return NextResponse.json(
        {
          success: true,
          message: 'Order updated successfully',
          data: order,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { success: false, message: 'Invalid action' },
      { status: 400 }
    );
  } catch (error: any) {
    const { statusCode, message } = handleError(error);
    return NextResponse.json(
      { success: false, message },
      { status: statusCode }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAdminAuth(req, (r, u) => handler(r, u, { params }));
}
