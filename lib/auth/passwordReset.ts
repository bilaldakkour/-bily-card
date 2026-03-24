import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import PasswordResetCode from '@/lib/models/PasswordResetCode'

export async function issuePasswordResetCode(email: string) {
  const normalizedEmail = String(email || '').toLowerCase().trim()
  const otp = crypto.randomInt(100000, 999999).toString()
  const otpHash = await bcrypt.hash(otp, 10)

  await PasswordResetCode.deleteMany({
    email: normalizedEmail,
    used: false,
  })

  await PasswordResetCode.create({
    email: normalizedEmail,
    otp: otpHash,
    used: false,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  })

  return otp
}
