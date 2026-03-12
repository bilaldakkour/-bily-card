import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { connectDB } from '@/lib/db/mongodb'
import SystemSettings from '@/lib/models/SystemSettings'
import { getActivePaymentMethods } from '@/lib/wallet/paymentMethods'
import { JWTPayload } from '@/lib/types'

async function handler(req: NextRequest, user: JWTPayload): Promise<NextResponse> {
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
