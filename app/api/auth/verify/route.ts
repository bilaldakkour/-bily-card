import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import User from '@/lib/models/User';
import Otp from '@/lib/models/Otp';
import { enforceRateLimit } from '@/lib/utils/rateLimit';
import bcrypt from 'bcryptjs';
import { isTestModeEnabled, logTestMode } from '@/lib/utils/testMode';

export async function POST(req: NextRequest) {
  try {
    const limitResponse = await enforceRateLimit(req, 'auth-verify', 8, 10 * 60 * 1000);
    if (limitResponse) return limitResponse;

    const { email, code } = await req.json();
    const normalizedEmail = String(email || '').toLowerCase().trim();
    const normalizedCode = String(code || '').trim();

    if (!normalizedEmail || !normalizedCode) {
      return NextResponse.json({ message: 'Email and code are required' }, { status: 400 });
    }

    if (isTestModeEnabled()) {
      logTestMode('auth/verify payload', {
        email: normalizedEmail,
        codeLength: normalizedCode.length,
      });

      return NextResponse.json({
        message: 'Test mode verification accepted.',
        testMode: true,
      });
    }

    await connectDB();

    const activeOtps = await Otp.find({
      email: normalizedEmail,
      used: false,
      expiresAt: { $gt: new Date() },
    })
      .sort({ createdAt: -1 })
      .limit(5);

    let otpRecord: any = null;
    for (const candidate of activeOtps) {
      const stored = String(candidate.otp || '');
      let isMatch = false;

      if (stored.startsWith('$2')) {
        isMatch = await bcrypt.compare(normalizedCode, stored);
      } else {
        // Backward compatibility for old plain OTP rows.
        isMatch = stored === normalizedCode;
      }

      if (isMatch) {
        otpRecord = candidate;
        break;
      }
    }

    if (!otpRecord) {
      return NextResponse.json({ message: 'Invalid verification code' }, { status: 400 });
    }

    const consumedOtp = await Otp.findOneAndUpdate(
      {
        _id: otpRecord._id,
        used: false,
      },
      { $set: { used: true } },
      { new: true }
    );

    if (!consumedOtp) {
      return NextResponse.json({ message: 'Verification code already used' }, { status: 400 });
    }

    // Find user
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 400 });
    }

    // Update user
    user.isVerified = true;
    await user.save();

    return NextResponse.json({ message: 'Email verified successfully' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'An error occurred. Please try again.' }, { status: 500 });
  }
}
