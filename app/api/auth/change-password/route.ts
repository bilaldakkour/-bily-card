import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import User from '@/lib/models/User'
import { JWTPayload } from '@/lib/types'
import { enforceRateLimit } from '@/lib/utils/rateLimit'
import { isTestModeEnabled, logTestMode } from '@/lib/utils/testMode'

async function handler(req: NextRequest, user: JWTPayload): Promise<NextResponse> {
  try {
    const limitResponse = await enforceRateLimit(req, 'auth-change-password', 5, 15 * 60 * 1000)
    if (limitResponse) {
      return limitResponse
    }

    const body = await req.json()
    const currentPassword = String(body?.currentPassword || '')
    const newPassword = String(body?.newPassword || '')
    const confirmPassword = String(body?.confirmPassword || '')

    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { success: false, message: 'Current password, new password, and confirmation are required.' },
        { status: 400 }
      )
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { success: false, message: 'New password must be at least 6 characters.' },
        { status: 400 }
      )
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { success: false, message: 'New password confirmation does not match.' },
        { status: 400 }
      )
    }

    if (currentPassword === newPassword) {
      return NextResponse.json(
        { success: false, message: 'New password must be different from the current password.' },
        { status: 400 }
      )
    }

    if (isTestModeEnabled()) {
      logTestMode('auth/change-password payload', {
        userId: user.userId,
        currentPasswordLength: currentPassword.length,
        newPasswordLength: newPassword.length,
      })

      return NextResponse.json({
        success: true,
        message: 'Password changed successfully.',
        testMode: true,
      })
    }

    const currentUser = await User.findById(user.userId).select('+password')

    if (!currentUser) {
      return NextResponse.json(
        { success: false, message: 'User not found.' },
        { status: 404 }
      )
    }

    const isCurrentPasswordValid = await currentUser.comparePassword(currentPassword)

    if (!isCurrentPasswordValid) {
      return NextResponse.json(
        { success: false, message: 'Current password is incorrect.' },
        { status: 400 }
      )
    }

    currentUser.password = newPassword
    await currentUser.save()

    return NextResponse.json({
      success: true,
      message: 'Password changed successfully.',
    })
  } catch (error) {
    console.error('Change password error:', error)
    return NextResponse.json(
      { success: false, message: 'Unable to change password right now.' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  return withAuth(req, handler)
}
