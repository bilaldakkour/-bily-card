import { NextRequest, NextResponse } from 'next/server'

function isAuthorized(req: NextRequest): boolean {
  const expected = process.env.CRON_SECRET || ''
  if (!expected) return false

  const headerSecret = req.headers.get('x-cron-secret') || ''
  const url = new URL(req.url)
  const querySecret = url.searchParams.get('secret') || ''

  return headerSecret === expected || querySecret === expected
}

async function runSync(req: NextRequest) {
  const syncUrl = new URL('/api/sync/dailycard-prices', req.url)

  const response = await fetch(syncUrl, {
    method: 'POST',
    cache: 'no-store',
  })

  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    return NextResponse.json(
      {
        success: false,
        message: payload?.message || 'DailyCard sync failed',
        data: payload?.data,
      },
      { status: response.status }
    )
  }

  return NextResponse.json(
    {
      success: true,
      message: 'DailyCard cron sync executed',
      data: payload?.data || null,
    },
    { status: 200 }
  )
}

export async function POST(req: NextRequest) {
  try {
    if (!isAuthorized(req)) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized cron request' },
        { status: 401 }
      )
    }

    return await runSync(req)
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error?.message || 'Failed to execute DailyCard cron sync',
      },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  return POST(req)
}
