import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import User from '@/lib/models/User';
import { LoginSchema } from '@/lib/utils/validation';
import { generateToken } from '@/lib/auth/jwt';
import { AUTH_COOKIE_NAME, getAuthCookieOptions } from '@/lib/auth/cookies'
import { issueEmailVerificationOtp } from '@/lib/auth/emailVerification';
import { isEmailReverificationRequired } from '@/lib/auth/reverification';
import { sendOtpEmail } from '@/lib/email';
import { handleError } from '@/lib/utils/errors';
import { enforceRateLimit } from '@/lib/utils/rateLimit';
import { isTestModeEnabled, logTestMode } from '@/lib/utils/testMode';
import { getTestModeUser } from '@/lib/utils/testModeStore';

export async function POST(req: NextRequest) {
  try {
    const limitResponse = await enforceRateLimit(req, 'auth-login', 10, 15 * 60 * 1000);
    if (limitResponse) return limitResponse;

    const body = await req.json();
    const { email, username, password } = LoginSchema.parse(body);

    if (isTestModeEnabled()) {
      const mockUser = getTestModeUser()
      logTestMode('auth/login payload', {
        email,
        username,
        passwordLength: String(password || '').length,
      })

      const token = generateToken({
        userId: mockUser.id,
        username: mockUser.username,
        role: mockUser.role,
      })

      const response = NextResponse.json(
        {
          success: true,
          token,
          data: {
            user: {
              id: mockUser.id,
              email: mockUser.email,
              username: mockUser.username,
              displayName: mockUser.displayName,
              role: mockUser.role,
            },
            testMode: true,
          },
        },
        { status: 200 }
      );
      response.cookies.set(AUTH_COOKIE_NAME, token, getAuthCookieOptions())
      return response
    }

    await connectDB();
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const normalizedUsername = String(username || '').trim();

    const loginQuery = normalizedEmail
      ? { email: normalizedEmail }
      : { username: normalizedUsername };

    // Find user by email or username.
    const user = await User.findOne(loginQuery).select('+password');

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, message: 'Invalid email or password' },
        { status: 401 }
      );
    }

    if (user.isBlocked) {
      return NextResponse.json(
        { success: false, message: 'Account is blocked' },
        { status: 403 }
      );
    }

    if (!user.isVerified) {
      return NextResponse.json(
        {
          success: false,
          requiresVerification: true,
          verificationType: 'signup',
          message: 'Please verify your email before signing in.',
          data: {
            email: user.email,
          },
        },
        { status: 403 }
      );
    }

    if (
      isEmailReverificationRequired({
        role: user.role,
        isVerified: user.isVerified,
        lastEmailVerificationAt: user.lastEmailVerificationAt,
        forceEmailReauth: user.forceEmailReauth,
      })
    ) {
      const otp = await issueEmailVerificationOtp(user.email)
      await sendOtpEmail(user.email, otp)

      return NextResponse.json(
        {
          success: false,
          requiresVerification: true,
          verificationType: 'reauth',
          message: 'For your security, please verify your email again before signing in.',
          data: {
            email: user.email,
          },
        },
        { status: 403 }
      )
    }

    // Generate token
    const token = generateToken({
      userId: user._id.toString(),
      username: user.username || user.displayName || user.email,
      role: user.role,
    });

    const response = NextResponse.json(
      {
        success: true,
        token,
        data: {
          user: {
            id: user._id,
            email: user.email,
            username: user.username,
            displayName: user.displayName,
            role: user.role,
          },
        },
      },
      { status: 200 }
    );
    response.cookies.set(AUTH_COOKIE_NAME, token, getAuthCookieOptions())
    return response
  } catch (error: any) {
    const { statusCode, message } = handleError(error);
    return NextResponse.json(
      { success: false, message },
      { status: statusCode }
    );
  }
}
