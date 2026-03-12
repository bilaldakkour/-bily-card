import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/auth/middleware';
import { JWTPayload } from '@/lib/types';
import { handleError } from '@/lib/utils/errors';
import {
  buildDailyReportData,
  sendDailyReportNotifications,
} from '@/lib/services/dailyReportService';

async function getHandler(
  req: NextRequest,
  user: JWTPayload
): Promise<NextResponse> {
  try {
    const report = await buildDailyReportData();

    return NextResponse.json(
      {
        success: true,
        data: report,
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

async function postHandler(
  req: NextRequest,
  user: JWTPayload
): Promise<NextResponse> {
  try {
    const result = await sendDailyReportNotifications();

    return NextResponse.json(
      {
        success: true,
        message: 'Daily report sent',
        data: result,
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
  return withAdminAuth(req, getHandler);
}

export async function POST(req: NextRequest) {
  return withAdminAuth(req, postHandler);
}
