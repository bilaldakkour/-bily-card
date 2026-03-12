import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/auth/middleware'
import WalletTransaction from '@/lib/models/WalletTransaction'
import dbConnect from '@/lib/mongodb'
import { JWTPayload } from '@/lib/types'

async function handler(
  req: NextRequest,
  user: JWTPayload
): Promise<NextResponse> {
  await dbConnect()

  try {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type')
    const limit = parseInt(searchParams.get('limit') || '50')
    const page = parseInt(searchParams.get('page') || '1')
    const skip = (page - 1) * limit

    let query: any = {}

    if (type && type !== 'all') {
      query.type = type
    }

    const transactions = await WalletTransaction.find(query)
      .populate('userId', 'email displayName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()

    const total = await WalletTransaction.countDocuments(query)

    return NextResponse.json({
      success: true,
      data: transactions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching transactions:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch transactions' },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  return withAdminAuth(req, handler)
}