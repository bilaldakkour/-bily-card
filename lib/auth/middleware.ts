import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, extractToken } from './jwt';
import { connectDB } from '@/lib/db/mongodb';
import User from '@/lib/models/User';
import { JWTPayload } from '../types';

export async function withAuth(
  request: NextRequest,
  handler: (req: NextRequest, user: JWTPayload) => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    const token = extractToken(
      request.headers.get('authorization') || request.headers.get('Authorization')
    );

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = verifyToken(token);

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }

    await connectDB();
    const dbUser = (await User.findById(user.userId)
      .select('isBlocked')
      .lean()) as { isBlocked?: boolean } | null;

    if (!dbUser || dbUser.isBlocked) {
      return NextResponse.json(
        { success: false, message: 'Account is inactive' },
        { status: 403 }
      );
    }

    return handler(request, user);
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function withAdminAuth(
  request: NextRequest,
  handler: (req: NextRequest, user: JWTPayload) => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    const token = extractToken(
      request.headers.get('authorization') || request.headers.get('Authorization')
    );

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = verifyToken(token);

    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      );
    }

    await connectDB();
    const adminUser = (await User.findById(user.userId)
      .select('role isBlocked')
      .lean()) as { role?: string; isBlocked?: boolean } | null;

    if (!adminUser || adminUser.role !== 'admin' || adminUser.isBlocked) {
      return NextResponse.json(
        { success: false, message: 'Admin account is inactive' },
        { status: 403 }
      );
    }

    return handler(request, user);
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}