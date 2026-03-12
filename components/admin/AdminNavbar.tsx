'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { clearAuthUserCache, fetchAuthUser } from '@/lib/utils/authClient'

interface User {
  displayName: string
  email: string
}

export default function AdminNavbar() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [today, setToday] = useState('')

  useEffect(() => {
    setToday(new Intl.DateTimeFormat('en-US').format(new Date()))

    const token = localStorage.getItem('adminToken')
    if (!token) {
      router.push('/admin/login')
      return
    }

    fetchAuthUser(token)
      .then((data) => {
        setUser(data)
      })
      .catch(() => {
        clearAuthUserCache(token)
        localStorage.removeItem('adminToken')
        router.push('/admin/login')
      })
  }, [router])

  return (
    <header className="bg-slate-900 border-b border-slate-700 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Admin Panel</h2>
          {user && (
            <p className="text-sm text-slate-400">Welcome, {user.displayName}</p>
          )}
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-slate-400">{today}</span>
        </div>
      </div>
    </header>
  )
}