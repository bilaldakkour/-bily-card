import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectDB } from '@/lib/db/mongodb'
import User from '@/lib/models/User'
import { extractToken, verifyToken } from '@/lib/auth/jwt'
import { isTestModeEnabled, logTestMode } from '@/lib/utils/testMode'
import { AUTH_COOKIE_NAME, getAuthCookieOptions } from '@/lib/auth/cookies'

function buildLoggedOutResponse(testMode = false) {
  const response = NextResponse.json({
    success: true,
    message: 'Logged out.',
    ...(testMode ? { testMode: true } : {}),
  })

  response.cookies.set(AUTH_COOKIE_NAME, '', {
    ...getAuthCookieOptions(),
    maxAge: 0,
  })

  return response
}

export async function POST(req: NextRequest) {
  try {
    const token =
      extractToken(
      req.headers.get('authorization') || req.headers.get('Authorization')
      ) || req.cookies.get(AUTH_COOKIE_NAME)?.value || null

    if (!token) {
      return buildLoggedOutResponse()
    }

    const user = verifyToken(token)
    if (!user) {
      return buildLoggedOutResponse()
    }

    if (isTestModeEnabled()) {
      logTestMode('auth/logout payload', { userId: user.userId, role: user.role })
      return buildLoggedOutResponse(true)
    }

    if (!mongoose.Types.ObjectId.isValid(user.userId)) {
      return buildLoggedOutResponse()
    }

    await connectDB()

    await User.updateOne(
      { _id: user.userId, role: { $ne: 'admin' } },
      {
        $set: {
          forceEmailReauth: true,
        },
      }
    )

    return buildLoggedOutResponse()
  } catch (error) {
    console.error('Logout error:', error)
    return buildLoggedOutResponse()
  }
}
