'use client'

import { useEffect, useState } from 'react'
import { SESSION_EXPIRED_EVENT } from '@/lib/utils/sessionNotice'

const AUTO_HIDE_MS = 3500

export default function SessionExpiredToast() {
  const [message, setMessage] = useState('')
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null

    const onSessionExpired = (event: Event) => {
      const custom = event as CustomEvent<string>
      const nextMessage = String(custom.detail || 'Session expired. Please log in again.')

      setMessage(nextMessage)
      setVisible(true)

      if (timeoutId) clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        setVisible(false)
      }, AUTO_HIDE_MS)
    }

    window.addEventListener(SESSION_EXPIRED_EVENT, onSessionExpired)

    return () => {
      window.removeEventListener(SESSION_EXPIRED_EVENT, onSessionExpired)
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [])

  if (!visible) return null

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[100] max-w-sm rounded-lg border border-amber-300/40 bg-amber-500/15 px-4 py-3 text-sm text-amber-100 shadow-lg backdrop-blur-sm">
      {message}
    </div>
  )
}
