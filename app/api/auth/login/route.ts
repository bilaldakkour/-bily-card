import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import User from '@/lib/models/User';
import { LoginSchema } from '@/lib/utils/validation';
import { generateToken } from '@/lib/auth/jwt';
import { handleError } from '@/lib/utils/errors';
import { enforceRateLimit } from '@/lib/utils/rateLimit';

export async function POST(req: NextRequest) {
  try {
    const limitResponse = await enforceRateLimit(req, 'auth-login', 10, 15 * 60 * 1000);
    if (limitResponse) return limitResponse;

    await connectDB();
    const body = await req.json();

    const { email, username, password } = LoginSchema.parse(body);
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

    // Generate token
    const token = generateToken({
      userId: user._id.toString(),
      username: user.username || user.displayName || user.email,
      role: user.role,
    });

    return NextResponse.json(
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
  } catch (error: any) {
    const { statusCode, message } = handleError(error);
    return NextResponse.json(
      { success: false, message },
      { status: statusCode }
    );
  }
}
