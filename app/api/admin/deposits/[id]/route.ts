import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/auth/middleware';
import { connectDB } from '@/lib/db/mongodb';
import DepositRequest from '@/lib/models/DepositRequest';
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

    const depositRequest = await DepositRequest.findById(params.id);

    if (!depositRequest) {
      return NextResponse.json(
        { success: false, message: 'Deposit request not found' },
        { status: 404 }
      );
    }

    if (!['approve', 'reject'].includes(String(body.action || ''))) {
      return NextResponse.json(
        { success: false, message: 'Invalid action' },
        { status: 400 }
      );
    }

    if (depositRequest.status !== 'pending') {
      return NextResponse.json(
        {
          success: false,
          message: `This deposit is already ${depositRequest.status}`,
        },
        { status: 400 }
      );
    }

    if (body.action === 'approve') {
      let targetUserId: string | null = null;

      if (depositRequest.userId) {
        const directUser = (await User.findById(depositRequest.userId)
          .select('_id')
          .lean()) as { _id?: unknown } | null;
        if (directUser?._id) {
          targetUserId = String(directUser._id);
        }
      }

      if (!targetUserId) {
        return NextResponse.json(
          {
            success: false,
            message: 'Cannot approve deposit: original user account is missing. Manual review required.',
          },
          { status: 400 }
        );
      }

      // Add funds to wallet
      await walletService.addBalance(
        targetUserId,
        depositRequest.amount,
        depositRequest.currency as 'USD' | 'LBP',
        `Deposit approved: $${depositRequest.amount}`,
        user.userId
      );

      depositRequest.status = 'approved';
      depositRequest.approvedBy = user.userId as any;
      await depositRequest.save();

      await logAdminAction({
        adminUserId: user.userId,
        action: 'deposit_approve',
        targetType: 'deposit',
        targetId: String(depositRequest._id),
        details: {
          userId: targetUserId,
          amount: depositRequest.amount,
          currency: depositRequest.currency,
        },
      });

      return NextResponse.json(
        {
          success: true,
          message: 'Deposit approved and funds added',
          data: depositRequest,
        },
        { status: 200 }
      );
    } else if (body.action === 'reject') {
      const reason = String(body.reason || '').trim();
      if (!reason) {
        return NextResponse.json(
          { success: false, message: 'Rejection reason is required' },
          { status: 400 }
        );
      }

      if (reason.length > 500) {
        return NextResponse.json(
          { success: false, message: 'Rejection reason is too long' },
          { status: 400 }
        );
      }

      depositRequest.status = 'rejected';
      depositRequest.rejectionReason = reason;
      depositRequest.approvedBy = user.userId as any;
      await depositRequest.save();

      await logAdminAction({
        adminUserId: user.userId,
        action: 'deposit_reject',
        targetType: 'deposit',
        targetId: String(depositRequest._id),
        details: {
          reason,
          amount: depositRequest.amount,
          currency: depositRequest.currency,
        },
      });

      return NextResponse.json(
        {
          success: true,
          message: 'Deposit rejected',
          data: depositRequest,
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
