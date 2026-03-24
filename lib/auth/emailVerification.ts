import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import Otp from '@/lib/models/Otp'

export async function issueEmailVerificationOtp(email: string) {
  const normalizedEmail = String(email || '').toLowerCase().trim()
  const otp = crypto.randomInt(100000, 999999).toString()
  const otpHash = await bcrypt.hash(otp, 10)

  await Otp.deleteMany({
    email: normalizedEmail,
    used: false,
  })

  await Otp.create({
    email: normalizedEmail,
    otp: otpHash,
    used: false,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  })

  return otp
}
