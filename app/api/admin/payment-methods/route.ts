import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/auth/middleware'
import { connectDB } from '@/lib/db/mongodb'
import SystemSettings from '@/lib/models/SystemSettings'
import { sanitizeSupportContact } from '@/lib/supportContactConfig'
import { sanitizePaymentMethods } from '@/lib/wallet/paymentMethods'
import { JWTPayload } from '@/lib/types'

async function handleGet(req: NextRequest, user: JWTPayload): Promise<NextResponse> {
  await connectDB()

  const settings = await SystemSettings.findOne({}).lean()
  const paymentMethods = sanitizePaymentMethods((settings as any)?.paymentMethods)
  const supportContact = sanitizeSupportContact((settings as any)?.supportContact)

  return NextResponse.json({
    success: true,
    data: {
      paymentMethods,
      supportContact,
    },
  })
}

async function handlePut(req: NextRequest, user: JWTPayload): Promise<NextResponse> {
  await connectDB()

  const body = await req.json()
  const paymentMethods = sanitizePaymentMethods(body?.paymentMethods)
  const supportContact = sanitizeSupportContact(body?.supportContact)

  const settings = await SystemSettings.findOneAndUpdate(
    {},
    {
      $set: {
        paymentMethods,
        supportContact,
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
    data: {
      paymentMethods: sanitizePaymentMethods((settings as any)?.paymentMethods),
      supportContact: sanitizeSupportContact((settings as any)?.supportContact),
    },
  })
}

export async function GET(req: NextRequest) {
  return withAdminAuth(req, handleGet)
}

export async function PUT(req: NextRequest) {
  return withAdminAuth(req, handlePut)
}
