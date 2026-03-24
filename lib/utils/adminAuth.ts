export function getAdminTokenOptional() {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem('adminToken') || ''
}

export function buildAdminAuthHeaders(token?: string) {
  const value = String(token || '').trim()
  if (!value) return undefined
  return { Authorization: `Bearer ${value}` }
}

export function isUnauthorizedStatus(status: number) {
  return status === 401 || status === 403
}
