import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import walletService from '@/lib/services/walletService';
import { JWTPayload } from '@/lib/types';
import { handleError } from '@/lib/utils/errors';

async function handler(
  req: NextRequest,
  user: JWTPayload
): Promise<NextResponse> {
  try {
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
