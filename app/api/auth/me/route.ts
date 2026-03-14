import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { connectDB } from '@/lib/db/mongodb'
import User from '@/lib/models/User'
import Wallet from '@/lib/models/Wallet'
import { JWTPayload } from '@/lib/types'
import { isTestModeEnabled, logTestMode } from '@/lib/utils/testMode'
import { getTestModeUser, updateTestModeAvatar } from '@/lib/utils/testModeStore'

async function handler(
  req: NextRequest,
  user: JWTPayload
): Promise<NextResponse> {
  try {
    if (isTestModeEnabled()) {
      const mockUser = getTestModeUser()
      logTestMode('auth/me requested', { userId: user.userId })
      return NextResponse.json(
        {
          success: true,
          data: mockUser,
        },
        { status: 200 }
      )
    }

    await connectDB()

    const currentUser = await User.findById(user.userId)

    if (!currentUser) {
      return NextResponse.json(
        { success: false, message: 'Invalid token: user no longer exists' },
        { status: 401 }
      )
    }

    const wallet = await Wallet.findOne({ userId: user.userId })

    const displayName =
      currentUser.displayName ||
      currentUser.username ||
      currentUser.name ||
      (currentUser.email ? currentUser.email.split('@')[0] : 'User')

    return NextResponse.json(
      {
        success: true,
        data: {
          id: currentUser._id,
          email: currentUser.email,
          displayName,
          username: currentUser.username || displayName,
          name: currentUser.name || displayName,
          avatar: currentUser.avatar || '',
          role: currentUser.role,
          isVerified: currentUser.isVerified,
          walletBalance: wallet
            ? { usd: wallet.balance_usd, lbp: wallet.balance_lbp }
            : { usd: 0, lbp: 0 },
        },
      },
      { status: 200 }
    )
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  return withAuth(req, handler)
}

async function patchHandler(
  req: NextRequest,
  user: JWTPayload
): Promise<NextResponse> {
  try {
    const body = await req.json()
    const avatar = typeof body?.avatar === 'string' ? body.avatar.trim() : ''

    if (avatar && !avatar.startsWith('data:image/')) {
      return NextResponse.json(
        { success: false, message: 'Invalid avatar format' },
        { status: 400 }
      )
    }

    if (avatar && avatar.length > 500_000) {
      return NextResponse.json(
        { success: false, message: 'Avatar image is too large' },
        { status: 413 }
      )
    }

    if (isTestModeEnabled()) {
      const mockUser = updateTestModeAvatar(avatar || '')
      logTestMode('auth/me avatar updated', {
        userId: user.userId,
        avatarLength: avatar.length,
      })

      return NextResponse.json(
        {
          success: true,
          data: {
            avatar: mockUser.avatar || '',
          },
        },
        { status: 200 }
      )
    }

    await connectDB()

    const currentUser = await User.findById(user.userId)

    if (!currentUser) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      )
    }

    currentUser.avatar = avatar || ''
    await currentUser.save()

    return NextResponse.json(
      {
        success: true,
        data: {
          avatar: currentUser.avatar || '',
        },
      },
      { status: 200 }
    )
  } catch {
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(req: NextRequest) {
  return withAuth(req, patchHandler)
}
