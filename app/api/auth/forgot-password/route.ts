import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db/mongodb'
import User from '@/lib/models/User'
import { issuePasswordResetCode } from '@/lib/auth/passwordReset'
import { sendPasswordResetCodeEmail } from '@/lib/email'
import { enforceRateLimit } from '@/lib/utils/rateLimit'
import { isTestModeEnabled, logTestMode } from '@/lib/utils/testMode'

export async function POST(req: NextRequest) {
  try {
    const limitResponse = await enforceRateLimit(req, 'auth-forgot-password', 5, 10 * 60 * 1000)
    if (limitResponse) return limitResponse

    const body = await req.json()
    const normalizedEmail = String(body?.email || '').toLowerCase().trim()

    if (!normalizedEmail) {
      return NextResponse.json({ success: false, message: 'Email is required.' }, { status: 400 })
    }

    if (isTestModeEnabled()) {
      logTestMode('auth/forgot-password payload', { email: normalizedEmail })
      return NextResponse.json({
        success: true,
        message: 'If this email exists, a password reset code has been sent.',
        testMode: true,
      })
    }

    await connectDB()

    const user = await User.findOne({ email: normalizedEmail }).select('email isBlocked')
    if (user && !user.isBlocked) {
      const otp = await issuePasswordResetCode(normalizedEmail)
      await sendPasswordResetCodeEmail(normalizedEmail, otp)
    }

    return NextResponse.json({
      success: true,
      message: 'If this email exists, a password reset code has been sent.',
    })
  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json(
      { success: false, message: 'Unable to start password reset right now.' },
      { status: 500 }
    )
  }
}
