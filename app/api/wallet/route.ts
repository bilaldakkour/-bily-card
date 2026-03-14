import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import walletService from '@/lib/services/walletService';
import { JWTPayload } from '@/lib/types';
import { handleError } from '@/lib/utils/errors';
import { isTestModeEnabled, logTestMode } from '@/lib/utils/testMode';
import { getTestModeUser } from '@/lib/utils/testModeStore';

async function handler(
  req: NextRequest,
  user: JWTPayload
): Promise<NextResponse> {
  try {
    if (isTestModeEnabled()) {
      const mockUser = getTestModeUser()
      logTestMode('wallet requested', { userId: user.userId })
      return NextResponse.json(
        {
          success: true,
          data: {
            balance_usd: Number(mockUser.walletBalance?.usd || 0),
            balance_lbp: Number(mockUser.walletBalance?.lbp || 0),
          },
          testMode: true,
        },
        { status: 200 }
      );
    }

    const wallet = await walletService.getWallet(user.userId);

    return NextResponse.json(
      {
        success: true,
        data: wallet,
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

export async function GET(req: NextRequest) {
  return withAuth(req, handler);
}
