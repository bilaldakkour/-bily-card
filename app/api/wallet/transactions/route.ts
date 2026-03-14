import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { connectDB } from '@/lib/db/mongodb';
import WalletTransaction from '@/lib/models/WalletTransaction';
import { JWTPayload } from '@/lib/types';
import { handleError } from '@/lib/utils/errors';
import { isTestModeEnabled, logTestMode } from '@/lib/utils/testMode';
import { getTestModeTransactions } from '@/lib/utils/testModeStore';

async function handler(req: NextRequest, user: JWTPayload) {
  try {
    if (isTestModeEnabled()) {
      logTestMode('wallet/transactions requested', { userId: user.userId })
      return NextResponse.json(
        { success: true, transactions: getTestModeTransactions(), testMode: true },
        { status: 200 }
      );
    }

    await connectDB();
    const txns = await WalletTransaction.find({ userId: user.userId }).sort({ createdAt: -1 });

    return NextResponse.json({ success: true, transactions: txns }, { status: 200 });
  } catch (error: any) {
    const { statusCode, message } = handleError(error);
    return NextResponse.json({ success: false, message }, { status: statusCode });
  }
}

export async function GET(req: NextRequest) {
  return withAuth(req, handler);
}
