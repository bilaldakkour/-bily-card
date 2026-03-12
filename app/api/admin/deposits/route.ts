import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/auth/middleware';
import { connectDB } from '@/lib/db/mongodb';
import DepositRequest from '@/lib/models/DepositRequest';
import User from '@/lib/models/User';
import { JWTPayload } from '@/lib/types';
import { handleError } from '@/lib/utils/errors';

async function handler(
  req: NextRequest,
  user: JWTPayload
): Promise<NextResponse> {
  try {
    await connectDB();

    const status = String(req.nextUrl.searchParams.get('status') || '').toLowerCase();
    const query: Record<string, any> = {};
    if (status === 'pending' || status === 'approved' || status === 'rejected') {
      query.status = status;
    }

    const rawLimit = Number(req.nextUrl.searchParams.get('limit') || 50);
    const limit = Number.isFinite(rawLimit)
      ? Math.max(1, Math.min(200, Math.floor(rawLimit)))
      : 50;

    const includeProofImage = status === 'pending';
    const selectFields = includeProofImage
      ? 'userId username amount currency paymentMethodKey paymentMethodName paymentAddress proofImage status createdAt updatedAt rejectionReason'
      : 'userId username amount currency paymentMethodKey paymentMethodName paymentAddress status createdAt updatedAt rejectionReason';

    const depositRequests = await DepositRequest.find(query)
      .select(selectFields)
      .populate('userId', 'displayName email')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const formattedRequests = depositRequests.map((request) => ({
      // Keep response stable even if related user was deleted from DB.
      userRef: request.userId as any,
      _id: request._id,
      userId: (request.userId as any)?._id || null,
      username: (request.userId as any)?.displayName || request.username || 'Unknown',
      email: (request.userId as any)?.email || 'Unknown',
      amount: request.amount,
      currency: request.currency,
      paymentMethodKey: request.paymentMethodKey,
      paymentMethodName: request.paymentMethodName,
      paymentAddress: request.paymentAddress,
      proofImage: includeProofImage ? request.proofImage : undefined,
      hasProofImage: Boolean(request.proofImage),
      status: request.status,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
      rejectionReason: request.rejectionReason,
    })).map(({ userRef, ...rest }) => rest);

    return NextResponse.json(
      {
        success: true,
        deposits: formattedRequests,
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
  return withAdminAuth(req, handler);
}