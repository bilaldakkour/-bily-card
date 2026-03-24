import { NextResponse } from 'next/server'
import { getSupportContactSettings, getWhatsappUrl } from '@/lib/supportContact'

export async function GET() {
  const supportContact = await getSupportContactSettings()

  return NextResponse.json(
    {
      success: true,
      data: {
        ...supportContact,
        whatsappUrl: getWhatsappUrl(supportContact),
      },
    },
    {
      headers: {
        'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=600',
      },
    }
  )
}
