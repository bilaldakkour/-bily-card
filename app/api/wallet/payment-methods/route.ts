import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { connectDB } from '@/lib/db/mongodb'
import SystemSettings from '@/lib/models/SystemSettings'
import { getActivePaymentMethods } from '@/lib/wallet/paymentMethods'
import { JWTPayload } from '@/lib/types'
import { isTestModeEnabled, logTestMode } from '@/lib/utils/testMode'
import { getTestModePaymentMethods } from '@/lib/utils/testModeStore'

async function handler(req: NextRequest, user: JWTPayload): Promise<NextResponse> {
  if (isTestModeEnabled()) {
    logTestMode('wallet/payment-methods requested', { userId: user.userId })
    return NextResponse.json({
      success: true,
      data: getTestModePaymentMethods(),
      testMode: true,
    })
  }

  await connectDB()

  const settings = await SystemSettings.findOne({}).lean()
  const methods = getActivePaymentMethods((settings as any)?.paymentMethods)

  return NextResponse.json({
    success: true,
    data: methods,
  })
}

export async function GET(req: NextRequest) {
  return withAuth(req, handler)
}
