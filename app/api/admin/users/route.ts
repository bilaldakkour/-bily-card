import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/auth/middleware'
import User from '@/lib/models/User'
import Wallet from '@/lib/models/Wallet'
import dbConnect from '@/lib/mongodb'
import { JWTPayload } from '@/lib/types'

async function handler(
  req: NextRequest,
  user: JWTPayload
): Promise<NextResponse> {
  await dbConnect()

  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') || ''
    const limit = parseInt(searchParams.get('limit') || '50')
    const page = parseInt(searchParams.get('page') || '1')
    const skip = (page - 1) * limit

    let query: any = {}

    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { displayName: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } },
        { phoneNumber: { $regex: search, $options: 'i' } }
      ]
    }

    const users = await User.find(query)
      .select('-password') // Exclude password
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()

    const userIds = users.map((u: any) => String(u._id))
    const wallets = await Wallet.find({ userId: { $in: userIds } })
      .select('userId balance_usd balance_lbp')
      .lean()

    const walletMap = new Map(
      wallets.map((w: any) => [
        String(w.userId),
        {
          usd: Number(w.balance_usd || 0),
          lbp: Number(w.balance_lbp || 0),
        },
      ])
    )

    const enrichedUsers = users.map((u: any) => ({
      ...u,
      walletBalance: walletMap.get(String(u._id)) || { usd: 0, lbp: 0 },
    }))

    const total = await User.countDocuments(query)

    return NextResponse.json({
      success: true,
      data: enrichedUsers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  return withAdminAuth(req, handler)
}