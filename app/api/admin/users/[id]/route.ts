import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/auth/middleware';
import { connectDB } from '@/lib/db/mongodb';
import User from '@/lib/models/User';
import Wallet from '@/lib/models/Wallet';
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

    const targetUser = await User.findById(params.id);

    if (!targetUser) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    const hasWalletAdjustment = body.walletAdjustment !== undefined && body.walletAdjustment !== null;
    if (hasWalletAdjustment) {
      const walletAdjustment = Number(body.walletAdjustment);
      if (!Number.isFinite(walletAdjustment) || walletAdjustment === 0) {
        return NextResponse.json(
          { success: false, message: 'Invalid wallet adjustment amount' },
          { status: 400 }
        );
      }

      const currency = body.currency === 'LBP' ? 'LBP' : 'USD';
      const notes = String(body.walletNotes || 'Admin adjustment').slice(0, 500);

      await walletService.addBalance(
        params.id,
        walletAdjustment,
        currency,
        notes,
        user.userId
      );

      await logAdminAction({
        adminUserId: user.userId,
        action: walletAdjustment > 0 ? 'wallet_adjustment_add' : 'wallet_adjustment_deduct',
        targetType: 'user',
        targetId: params.id,
        details: {
          amount: walletAdjustment,
          currency,
          notes,
        },
      });
    }

    if (body.isBlocked !== undefined) {
      targetUser.isBlocked = body.isBlocked;
    }

    if (body.displayName) {
      targetUser.displayName = body.displayName;
    }

    if (body.pricingPercent !== undefined) {
      const parsed = Number(body.pricingPercent);
      if (Number.isFinite(parsed)) {
        targetUser.pricingPercent = Math.max(-100, Math.min(1000, parsed));
      }
    }

    await targetUser.save();

    if (body.isBlocked !== undefined || body.displayName || body.pricingPercent !== undefined) {
      await logAdminAction({
        adminUserId: user.userId,
        action: 'user_profile_update',
        targetType: 'user',
        targetId: params.id,
        details: {
          isBlocked: body.isBlocked,
          displayName: body.displayName,
          pricingPercent: body.pricingPercent,
        },
      });
    }

    const wallet = await Wallet.findOne({ userId: params.id });

    return NextResponse.json(
      {
        success: true,
        message: 'User updated successfully',
        data: {
          user: targetUser,
          wallet,
        },
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

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAdminAuth(req, (r, u) => handler(r, u, { params }));
}
