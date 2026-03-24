import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { connectDB } from '@/lib/db/mongodb';
import DepositRequest from '@/lib/models/DepositRequest';
import User from '@/lib/models/User';
import { JWTPayload } from '@/lib/types';
import { handleError } from '@/lib/utils/errors';
import SystemSettings from '@/lib/models/SystemSettings';
import { sendAdminNotification } from '@/lib/services/adminNotificationService';
import { getActivePaymentMethods } from '@/lib/wallet/paymentMethods';
import { enforceRateLimit } from '@/lib/utils/rateLimit';
import { isTestModeEnabled, logTestMode } from '@/lib/utils/testMode';
import { createTestModeDeposit, getTestModePaymentMethods } from '@/lib/utils/testModeStore';

interface NotificationUserProfile {
  displayName?: string;
  username?: string;
  email?: string;
}

function resolveNotificationUserName(
  profile: NotificationUserProfile | null | undefined,
  fallbackUsername?: string | null
) {
  const displayName = String(profile?.displayName || '').trim();
  if (displayName) return displayName;

  const username = String(profile?.username || fallbackUsername || '').trim();
  if (username) return username;

  const email = String(profile?.email || '').trim();
  if (email) return email;

  return 'Unknown user';
}

async function handler(
  req: NextRequest,
  user: JWTPayload
): Promise<NextResponse> {
  try {
    const limitResponse = await enforceRateLimit(
      req,
      `wallet-deposit-request:${String(user.userId)}`,
      5,
      15 * 60 * 1000
    );
    if (limitResponse) return limitResponse;

    const body = await req.json();

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

    const currency = 'USD';

    const paymentMethods = isTestModeEnabled()
      ? getTestModePaymentMethods()
      : getActivePaymentMethods((await SystemSettings.findOne({}).lean() as any)?.paymentMethods);
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

    if (proofImage && !proofImage.startsWith('data:image/')) {
      return NextResponse.json(
        { success: false, message: 'Invalid receipt image format' },
        { status: 400 }
      );
    }

    // Keep payloads manageable when storing base64 data URL proofs.
    if (proofImage && proofImage.length > 1_200_000) {
      return NextResponse.json(
        { success: false, message: 'Receipt image is too large' },
        { status: 400 }
      );
    }

    if (isTestModeEnabled()) {
      logTestMode('wallet/deposit-request payload', {
        userId: user.userId,
        amount,
        currency,
        paymentMethodKey: selectedMethod.key,
        proofProvided: Boolean(proofImage),
      })

      const result = createTestModeDeposit({
        amount,
        currency,
        paymentMethodKey: selectedMethod.key,
        paymentMethodName: selectedMethod.name,
        paymentAddress: selectedMethod.address,
        proofImage: proofImage || undefined,
      })

      return NextResponse.json(
        {
          success: true,
          message: 'Test mode deposit applied instantly.',
          data: result.depositRequest,
          testMode: true,
        },
        { status: 201 }
      );
    }

    await connectDB();

    const depositUserProfile = (await User.findById(user.userId)
      .select('displayName username email')
      .lean()) as NotificationUserProfile | null;

    const depositRequest = new DepositRequest({
      userId: user.userId,
      username: user.username || '',
      amount,
      currency,
      paymentMethodKey: selectedMethod.key,
      paymentMethodName: selectedMethod.name,
      paymentAddress: selectedMethod.address,
      proofImage: proofImage || undefined,
      status: 'pending',
    });

    await depositRequest.save();

    await sendAdminNotification({
      title: 'New Deposit Request - Bily Card',
      lines: [
        `Customer: ${resolveNotificationUserName(depositUserProfile, user.username)}`,
        `Amount: $${amount.toFixed(2)}`,
        `Method: ${selectedMethod.name}`,
        `Address: ${selectedMethod.address || '-'}`,
        `Receipt Provided: ${proofImage ? 'Yes' : 'No'}`,
        `Deposit ID: ${String(depositRequest._id)}`,
      ],
    });

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
