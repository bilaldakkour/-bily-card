import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { connectDB } from '@/lib/db/mongodb'
import User from '@/lib/models/User'
import PasswordResetCode from '@/lib/models/PasswordResetCode'
import { enforceRateLimit } from '@/lib/utils/rateLimit'
import { isTestModeEnabled, logTestMode } from '@/lib/utils/testMode'

export async function POST(req: NextRequest) {
  try {
    const limitResponse = await enforceRateLimit(req, 'auth-reset-password', 8, 10 * 60 * 1000)
    if (limitResponse) return limitResponse

    const body = await req.json()
    const normalizedEmail = String(body?.email || '').toLowerCase().trim()
    const normalizedCode = String(body?.code || '').trim()
    const nextPassword = String(body?.password || '')

    if (!normalizedEmail || !normalizedCode || !nextPassword) {
      return NextResponse.json(
        { success: false, message: 'Email, code, and new password are required.' },
        { status: 400 }
      )
    }

    if (nextPassword.length < 6) {
      return NextResponse.json(
        { success: false, message: 'Password must be at least 6 characters.' },
        { status: 400 }
      )
    }

    if (isTestModeEnabled()) {
      logTestMode('auth/reset-password payload', {
        email: normalizedEmail,
        codeLength: normalizedCode.length,
        passwordLength: nextPassword.length,
      })

      return NextResponse.json({
        success: true,
        message: 'Test mode password reset accepted.',
        testMode: true,
      })
    }

    await connectDB()

    const activeCodes = await PasswordResetCode.find({
      email: normalizedEmail,
      used: false,
      expiresAt: { $gt: new Date() },
    })
      .sort({ createdAt: -1 })
      .limit(5)

    let matchedCode: any = null
    for (const candidate of activeCodes) {
      if (await bcrypt.compare(normalizedCode, String(candidate.otp || ''))) {
        matchedCode = candidate
        break
      }
    }

    if (!matchedCode) {
      return NextResponse.json(
        { success: false, message: 'Invalid or expired reset code.' },
        { status: 400 }
      )
    }

    const consumedCode = await PasswordResetCode.findOneAndUpdate(
      { _id: matchedCode._id, used: false },
      { $set: { used: true } },
      { new: true }
    )

    if (!consumedCode) {
      return NextResponse.json(
        { success: false, message: 'Reset code already used.' },
        { status: 400 }
      )
    }

    const user = await User.findOne({ email: normalizedEmail }).select('+password')
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found.' },
        { status: 404 }
      )
    }

    if (user.isBlocked) {
      return NextResponse.json(
        { success: false, message: 'Account is blocked.' },
        { status: 403 }
      )
    }

    user.password = nextPassword
    user.isVerified = true
    user.lastEmailVerificationAt = new Date()
    user.forceEmailReauth = false
    await user.save()

    await PasswordResetCode.updateMany(
      { email: normalizedEmail, used: false },
      { $set: { used: true } }
    )

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully. You can sign in now.',
    })
  } catch (error) {
    console.error('Reset password error:', error)
    return NextResponse.json(
      { success: false, message: 'Unable to reset password right now.' },
      { status: 500 }
    )
  }
}
