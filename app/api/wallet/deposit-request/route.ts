import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { connectDB } from '@/lib/db/mongodb';
import DepositRequest from '@/lib/models/DepositRequest';
import { JWTPayload } from '@/lib/types';
import { handleError } from '@/lib/utils/errors';
import SystemSettings from '@/lib/models/SystemSettings';
import { getActivePaymentMethods } from '@/lib/wallet/paymentMethods';

async function handler(
  req: NextRequest,
  user: JWTPayload
): Promise<NextResponse> {
  try {
    const body = await req.json();
    await connectDB();

    const amount = Number(body?.amount || 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { success: false, message: 'Invalid deposit amount' },
        { status: 400 }
      );
    }

    if (amount > 100000) {
      return NextResponse.json(
        { success: false, message: 'Deposit amount exceeds allowed limit' },
        { status: 400 }
      );
    }

    const currency = body?.currency === 'LBP' ? 'LBP' : 'USD';

    const settings = await SystemSettings.findOne({}).lean();
    const paymentMethods = getActivePaymentMethods((settings as any)?.paymentMethods);
    const paymentMethodKey = String(body?.paymentMethodKey || '').trim().toLowerCase();
    const selectedMethod = paymentMethods.find((method) => method.key === paymentMethodKey);

    if (!selectedMethod) {
      return NextResponse.json(
        { success: false, message: 'Invalid payment method' },
        { status: 400 }
      );
    }

    if (amount < Number(selectedMethod.minAmount || 0)) {
      return NextResponse.json(
        {
          success: false,
          message: `Minimum amount for ${selectedMethod.name} is $${Number(
            selectedMethod.minAmount || 0
          ).toFixed(2)}`,
        },
        { status: 400 }
      );
    }

    const proofImage = String(body?.proofImage || '').trim();
    if (!proofImage) {
      return NextResponse.json(
        { success: false, message: 'Receipt image is required' },
        { status: 400 }
      );
    }

    if (!proofImage.startsWith('data:image/')) {
      return NextResponse.json(
        { success: false, message: 'Invalid receipt image format' },
        { status: 400 }
      );
    }

    // Keep payloads manageable when storing base64 data URL proofs.
    if (proofImage.length > 1_200_000) {
      return NextResponse.json(
        { success: false, message: 'Receipt image is too large' },
        { status: 400 }
      );
    }

    const depositRequest = new DepositRequest({
      userId: user.userId,
      username: user.username || '',
      amount,
      currency,
      paymentMethodKey: selectedMethod.key,
      paymentMethodName: selectedMethod.name,
      paymentAddress: selectedMethod.address,
      proofImage,
      status: 'pending',
    });

    await depositRequest.save();

    return NextResponse.json(
      {
        success: true,
        message: 'Deposit request created. Awaiting admin approval.',
        data: depositRequest,
      },
      { status: 201 }
    );
  } catch (error: any) {
    const { statusCode, message } = handleError(error);
    return NextResponse.json(
      { success: false, message },
      { status: statusCode }
    );
  }
}

export async function POST(req: NextRequest) {
  return withAuth(req, handler);
}
