import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import User from '@/lib/models/User';
import Wallet from '@/lib/models/Wallet';
import { RegisterSchema } from '@/lib/utils/validation';
import { sendOtpEmail } from '@/lib/email';
import { enforceRateLimit } from '@/lib/utils/rateLimit';
import { sendAdminNotification } from '@/lib/services/adminNotificationService';
import { issueEmailVerificationOtp } from '@/lib/auth/emailVerification';
import { ZodError } from 'zod';
import { isTestModeEnabled, logTestMode } from '@/lib/utils/testMode';

function buildBaseUsername(email: string): string {
  const localPart = String(email.split('@')[0] || '')
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 24);

  return localPart.length >= 3 ? localPart : 'user';
}

async function generateUniqueUsername(email: string): Promise<string> {
  const base = buildBaseUsername(email);
  let candidate = base;
  let attempt = 0;

  while (await User.exists({ username: candidate })) {
    attempt += 1;
    candidate = `${base}${attempt}`.slice(0, 50);
  }

  return candidate;
}

export async function POST(req: NextRequest) {
  try {
    const limitResponse = await enforceRateLimit(req, 'auth-register', 5, 15 * 60 * 1000);
    if (limitResponse) return limitResponse;

    const body = await req.json();
    const rawName = String(body?.name || body?.displayName || '').trim();
    const rawPhoneNumber = String(body?.phoneNumber || '').trim();

    if (!rawPhoneNumber) {
      return NextResponse.json({ message: 'Phone number is required' }, { status: 400 });
    }

    const { name, email, password, phoneNumber } = RegisterSchema.parse({
      name: rawName,
      email: body?.email,
      password: body?.password,
      phoneNumber: rawPhoneNumber,
    });
    const normalizedEmail = String(email || '').toLowerCase().trim();
    const normalizedPhoneNumber = String(phoneNumber || '')
      .replace(/\D/g, '')
      .trim();

    if (isTestModeEnabled()) {
      logTestMode('auth/register payload', {
        email: normalizedEmail,
        name,
        phoneNumber: normalizedPhoneNumber,
        passwordLength: String(password || '').length,
      });

      return NextResponse.json({
        message: 'Test mode registration completed. Use the login form immediately with any password.',
        testMode: true,
      });
    }

    await connectDB();

    if (normalizedPhoneNumber.length < 7 || normalizedPhoneNumber.length > 20) {
      return NextResponse.json({ message: 'Phone number is invalid' }, { status: 400 });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      if (existingUser.isVerified) {
        return NextResponse.json({ message: 'User already exists' }, { status: 400 });
      }

      const conflictingPhone = await User.findOne({
        phoneNumber: normalizedPhoneNumber,
        _id: { $ne: existingUser._id },
      });

      if (conflictingPhone) {
        return NextResponse.json({ message: 'Phone number already in use' }, { status: 400 });
      }

      existingUser.displayName = name;
      existingUser.phoneNumber = normalizedPhoneNumber;
      existingUser.password = password;
      existingUser.isVerified = false;
      await existingUser.save();

      const otp = await issueEmailVerificationOtp(normalizedEmail);
      await sendOtpEmail(normalizedEmail, otp);

      return NextResponse.json({
        message: 'Your account is pending verification. We sent a new code to your email.',
      });
    }

    const existingPhone = await User.findOne({ phoneNumber: normalizedPhoneNumber });
    if (existingPhone) {
      return NextResponse.json({ message: 'Phone number already in use' }, { status: 400 });
    }

    const username = await generateUniqueUsername(normalizedEmail);

    // Create user (not verified yet)
    const user = new User({
      email: normalizedEmail,
      username,
      password,
      displayName: name,
      phoneNumber: normalizedPhoneNumber,
      role: 'customer',
      isVerified: false,
    });

    await user.save();

    // Create wallet
    const wallet = new Wallet({
      userId: user._id,
      balance_usd: 0,
    });

    await wallet.save();

    // Send OTP email
    const otp = await issueEmailVerificationOtp(normalizedEmail);
    await sendOtpEmail(normalizedEmail, otp);

    await sendAdminNotification({
      title: 'New User Registration - Bily Card',
      lines: [
        `Name: ${name}`,
        `Email: ${normalizedEmail}`,
        `Phone: ${normalizedPhoneNumber}`,
        `User ID: ${String(user._id)}`,
      ],
    });

    return NextResponse.json({ message: 'User registered successfully. Please check your email for verification.' });
  } catch (error) {
    if (error instanceof ZodError) {
      const issue = error.issues?.[0];
      return NextResponse.json(
        { message: issue?.message || 'Invalid registration data' },
        { status: 400 }
      );
    }

    console.error('Registration error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
