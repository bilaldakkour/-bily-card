import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/auth/middleware'
import { connectDB } from '@/lib/db/mongodb'
import SystemSettings from '@/lib/models/SystemSettings'
import { sanitizePaymentMethods } from '@/lib/wallet/paymentMethods'
import { JWTPayload } from '@/lib/types'

async function handleGet(req: NextRequest, user: JWTPayload): Promise<NextResponse> {
  await connectDB()

  const settings = await SystemSettings.findOne({}).lean()
  const paymentMethods = sanitizePaymentMethods((settings as any)?.paymentMethods)

  return NextResponse.json({
    success: true,
    data: paymentMethods,
  })
}

async function handlePut(req: NextRequest, user: JWTPayload): Promise<NextResponse> {
  await connectDB()

  const body = await req.json()
  const paymentMethods = sanitizePaymentMethods(body?.paymentMethods)

  const settings = await SystemSettings.findOneAndUpdate(
    {},
    {
      $set: {
        paymentMethods,
      },
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    }
  ).lean()

  return NextResponse.json({
    success: true,
    message: 'Payment methods updated successfully',
    data: sanitizePaymentMethods((settings as any)?.paymentMethods),
  })
}

export async function GET(req: NextRequest) {
  return withAdminAuth(req, handleGet)
}

export async function PUT(req: NextRequest) {
  return withAdminAuth(req, handlePut)
}
