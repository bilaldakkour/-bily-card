import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/auth/middleware'
import { connectDB } from '@/lib/db/mongodb'
import SystemSettings from '@/lib/models/SystemSettings'
import { sanitizeSupportContact } from '@/lib/supportContactConfig'
import { sanitizePaymentMethods } from '@/lib/wallet/paymentMethods'
import { JWTPayload } from '@/lib/types'

function sanitizeAdminNotifications(raw: any) {
  return {
    telegramBotToken: String(raw?.telegramBotToken || ''),
    telegramChatId: String(raw?.telegramChatId || ''),
    whatsappAccessToken: String(raw?.whatsappAccessToken || ''),
    whatsappPhoneNumberId: String(raw?.whatsappPhoneNumberId || ''),
    whatsappAdminNumber: String(raw?.whatsappAdminNumber || ''),
  }
}

async function handleGet(req: NextRequest, user: JWTPayload): Promise<NextResponse> {
  await connectDB()

  const settings = await SystemSettings.findOne({}).lean()
  const paymentMethods = sanitizePaymentMethods((settings as any)?.paymentMethods)
  const supportContact = sanitizeSupportContact((settings as any)?.supportContact)
  const adminNotifications = sanitizeAdminNotifications(settings)

  return NextResponse.json({
    success: true,
    data: {
      paymentMethods,
      supportContact,
      adminNotifications,
    },
  })
}

async function handlePut(req: NextRequest, user: JWTPayload): Promise<NextResponse> {
  await connectDB()

  const body = await req.json()
  const paymentMethods = sanitizePaymentMethods(body?.paymentMethods)
  const supportContact = sanitizeSupportContact(body?.supportContact)
  const adminNotifications = sanitizeAdminNotifications(body?.adminNotifications)

  const settings = await SystemSettings.findOneAndUpdate(
    {},
    {
      $set: {
        paymentMethods,
        supportContact,
        ...adminNotifications,
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
      adminNotifications: sanitizeAdminNotifications(settings),
    },
  })
}

export async function GET(req: NextRequest) {
  return withAdminAuth(req, handleGet)
}

export async function PUT(req: NextRequest) {
  return withAdminAuth(req, handlePut)
}
