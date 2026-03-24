import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/auth/middleware'
import {
  buildProviderProductsCsv,
  getProviderProductsForViewer,
} from '@/lib/providers/adminProductViewer'

async function getHandler(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const q = String(searchParams.get('q') || '').trim()
    const page = Number(searchParams.get('page') || 1)
    const limit = Number(searchParams.get('limit') || 200)
    const format = String(searchParams.get('format') || '').trim().toLowerCase()

    const result = await getProviderProductsForViewer({
      providerKey: 'go4card',
      q,
      page,
      limit,
    })

    if (format === 'csv') {
      const csv = buildProviderProductsCsv(result.rows)
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="go4card-products.csv"`,
          'Cache-Control': 'no-store',
        },
      })
    }

    return NextResponse.json({ success: true, data: result.rows, meta: result.meta })
  } catch (error) {
    console.error('Go4Card products viewer error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to load Go4Card products' },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  return withAdminAuth(req, () => getHandler(req))
}
