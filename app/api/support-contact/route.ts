import { NextResponse } from 'next/server'
import { getSupportContactSettings, getWhatsappUrl } from '@/lib/supportContact'

export async function GET() {
  const supportContact = await getSupportContactSettings()

  return NextResponse.json({
    success: true,
    data: {
      ...supportContact,
      whatsappUrl: getWhatsappUrl(supportContact),
    },
  })
}
