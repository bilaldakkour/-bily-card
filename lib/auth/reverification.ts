const DEFAULT_EMAIL_REVERIFICATION_HOURS = 168

function normalizePositiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(String(value || ''), 10)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback
  }

  return parsed
}

export const EMAIL_REVERIFICATION_HOURS = normalizePositiveInteger(
  process.env.EMAIL_REVERIFICATION_HOURS,
  DEFAULT_EMAIL_REVERIFICATION_HOURS
)

export const EMAIL_REVERIFICATION_WINDOW_MS = EMAIL_REVERIFICATION_HOURS * 60 * 60 * 1000

export function isEmailReverificationRequired(input: {
  role?: string | null
  isVerified?: boolean | null
  lastEmailVerificationAt?: Date | string | null
  forceEmailReauth?: boolean | null
}) {
  if (String(input.role || '').toLowerCase() === 'admin') {
    return false
  }

  if (input.forceEmailReauth) {
    return true
  }

  if (!input.isVerified) {
    return true
  }

  if (!input.lastEmailVerificationAt) {
    return true
  }

  const verifiedAt = new Date(input.lastEmailVerificationAt)
  if (Number.isNaN(verifiedAt.getTime())) {
    return true
  }

  return Date.now() - verifiedAt.getTime() >= EMAIL_REVERIFICATION_WINDOW_MS
}
