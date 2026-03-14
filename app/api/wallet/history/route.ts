import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import walletService from '@/lib/services/walletService';
import { JWTPayload } from '@/lib/types';
import { handleError } from '@/lib/utils/errors';
import { isTestModeEnabled, logTestMode } from '@/lib/utils/testMode';
import { getTestModeTransactions } from '@/lib/utils/testModeStore';

async function handler(
  req: NextRequest,
  user: JWTPayload
): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (isTestModeEnabled()) {
      const transactions = getTestModeTransactions().slice(offset, offset + limit)
      logTestMode('wallet/history requested', { userId: user.userId, limit, offset })

      return NextResponse.json(
        {
          success: true,
          data: {
            transactions,
            total: getTestModeTransactions().length,
            pagination: {
              limit,
              offset,
              totalPages: Math.ceil(getTestModeTransactions().length / limit),
            },
          },
          testMode: true,
        },
        { status: 200 }
      );
    }

    const { transactions, total } = await walletService.getTransactionHistory(
      user.userId,
      limit,
      offset
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          transactions,
          total,
          pagination: {
            limit,
            offset,
            totalPages: Math.ceil(total / limit),
          },
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

export async function GET(req: NextRequest) {
  return withAuth(req, handler);
}
