const ONE_DAY_SECONDS = 60 * 60 * 24

export const AUTH_COOKIE_NAME = 'authToken'

export function getAuthCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 7 * ONE_DAY_SECONDS,
  }
}
