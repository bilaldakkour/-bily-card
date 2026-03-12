import { NextRequest, NextResponse } from 'next/server';
import { sendDailyReportNotifications } from '@/lib/services/dailyReportService';

function isAuthorized(req: NextRequest): boolean {
  const expected = process.env.CRON_SECRET || '';
  if (!expected) return false;

  const headerSecret = req.headers.get('x-cron-secret') || '';
  const url = new URL(req.url);
  const querySecret = url.searchParams.get('secret') || '';

  return headerSecret === expected || querySecret === expected;
}

export async function POST(req: NextRequest) {
  try {
    if (!isAuthorized(req)) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized cron request' },
        { status: 401 }
      );
    }

    const result = await sendDailyReportNotifications();

    return NextResponse.json(
      {
        success: true,
        message: 'Daily report executed',
        data: result,
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error?.message || 'Failed to execute daily report',
      },
      { status: 500 }
    );
  }
}
