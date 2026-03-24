'use client'

import { clearAuthUserCache } from '@/lib/utils/authClient'

function clearCustomerStorage(token?: string) {
  clearAuthUserCache(token)
  localStorage.removeItem('token')
  localStorage.removeItem('bilycard_token')
  localStorage.removeItem('bilycard_user_name')
  localStorage.removeItem('bilycard_user_email')
  localStorage.removeItem('bilycard_user_avatar')
}

export async function logoutCustomer(redirectTo = '/login') {
  const token =
    localStorage.getItem('bilycard_token') ||
    localStorage.getItem('token') ||
    undefined

  if (token) {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
    } catch {
      // Best-effort only; local logout should still succeed.
    }
  }

  clearCustomerStorage(token)
  window.dispatchEvent(new Event('bilycard-auth-changed'))
  window.location.href = redirectTo
}
