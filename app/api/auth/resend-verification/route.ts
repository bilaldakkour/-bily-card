import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db/mongodb'
import User from '@/lib/models/User'
import { issueEmailVerificationOtp } from '@/lib/auth/emailVerification'
import { sendOtpEmail } from '@/lib/email'
import { enforceRateLimit } from '@/lib/utils/rateLimit'
import { isTestModeEnabled, logTestMode } from '@/lib/utils/testMode'

export async function POST(req: NextRequest) {
  try {
    const limitResponse = await enforceRateLimit(req, 'auth-resend-verification', 5, 10 * 60 * 1000)
    if (limitResponse) return limitResponse

    const body = await req.json()
    const normalizedEmail = String(body?.email || '').toLowerCase().trim()
    const purpose = String(body?.purpose || '').trim().toLowerCase() === 'reauth' ? 'reauth' : 'signup'

    if (!normalizedEmail) {
      return NextResponse.json({ message: 'Email is required' }, { status: 400 })
    }

    if (isTestModeEnabled()) {
      logTestMode('auth/resend-verification payload', {
        email: normalizedEmail,
      })

      return NextResponse.json({
        message: 'Test mode verification email resent.',
        testMode: true,
      })
    }

    await connectDB()

    const user = await User.findOne({ email: normalizedEmail })
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 })
    }

    if (user.isBlocked) {
      return NextResponse.json({ message: 'Account is blocked' }, { status: 403 })
    }

    if (purpose !== 'reauth' && user.isVerified) {
      return NextResponse.json({ message: 'This email is already verified' }, { status: 400 })
    }

    const otp = await issueEmailVerificationOtp(normalizedEmail)
    await sendOtpEmail(normalizedEmail, otp)

    return NextResponse.json({
      message:
        purpose === 'reauth'
          ? 'A new sign-in verification code has been sent to your email.'
          : 'A new verification code has been sent to your email.',
    })
  } catch (error) {
    console.error('Resend verification error:', error)
    return NextResponse.json(
      { message: 'Unable to resend verification code right now.' },
      { status: 500 }
    )
  }
}
