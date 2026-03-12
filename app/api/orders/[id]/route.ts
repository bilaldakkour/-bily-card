import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { connectDB } from '@/lib/db/mongodb';
import Order from '@/lib/models/Order';
import { JWTPayload } from '@/lib/types';
import { handleError } from '@/lib/utils/errors';

async function handler(
  req: NextRequest,
  user: JWTPayload,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    await connectDB();

    const order = await Order.findOne({
      _id: params.id,
      userId: user.userId,
    });

    if (!order) {
      return NextResponse.json(
        { success: false, message: 'Order not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: order,
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

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(req, (r, u) => handler(r, u, { params }));
}
