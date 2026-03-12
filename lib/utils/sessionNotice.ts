export const SESSION_EXPIRED_EVENT = 'bilycard-session-expired'

let lastSessionNoticeAt = 0

export function notifySessionExpired(message = 'Session expired. Please log in again.') {
  if (typeof window === 'undefined') return

  const now = Date.now()
  if (now - lastSessionNoticeAt < 3000) return
  lastSessionNoticeAt = now

  window.dispatchEvent(
    new CustomEvent<string>(SESSION_EXPIRED_EVENT, {
      detail: message,
    })
  )
}
