'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface ProfileData {
  id?: string
  email?: string
  displayName?: string
  username?: string
  name?: string
  role?: string
  isVerified?: boolean
  walletBalance?: {
    usd?: number
    lbp?: number
  }
}

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadProfile = async () => {
      const token = localStorage.getItem('bilycard_token')

      if (!token) {
        router.push('/login')
        return
      }

      try {
        const res = await fetch('/api/auth/me', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: 'no-store',
        })

        const data = await res.json()

        if (res.ok && data?.success) {
          setUser(data.data || data.user || null)
        } else {
          router.push('/login')
          return
        }
      } catch (error) {
        console.error('Failed to load profile:', error)
        router.push('/login')
        return
      } finally {
        setLoading(false)
      }
    }

    void loadProfile()
  }, [router])

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="text-white">Loading profile...</div>
      </main>
    )
  }

  if (!user) return null

  const displayName =
    user.displayName ||
    user.username ||
    user.name ||
    (user.email ? user.email.split('@')[0] : '') ||
    'User'

  return (
    <main className="min-h-screen bg-slate-950 p-4 md:p-8">
      <div className="mx-auto max-w-4xl">
        <div className="rounded-2xl border border-white/10 bg-slate-900 p-8">
          <h1 className="mb-6 text-4xl font-bold text-white">My Profile</h1>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-white/10 bg-slate-800 p-4">
              <p className="text-sm text-slate-400">Display Name</p>
              <p className="mt-1 text-lg font-semibold text-white">{displayName}</p>
            </div>

            <div className="rounded-lg border border-white/10 bg-slate-800 p-4">
              <p className="text-sm text-slate-400">Email</p>
              <p className="mt-1 text-lg font-semibold text-white">{user.email || '-'}</p>
            </div>

            <div className="rounded-lg border border-white/10 bg-slate-800 p-4">
              <p className="text-sm text-slate-400">Role</p>
              <p className="mt-1 text-lg font-semibold text-white">{user.role || 'user'}</p>
            </div>

            <div className="rounded-lg border border-white/10 bg-slate-800 p-4">
              <p className="text-sm text-slate-400">Verification</p>
              <p className="mt-1 text-lg font-semibold text-white">
                {user.isVerified ? 'Verified' : 'Not Verified'}
              </p>
            </div>

            <div className="rounded-lg border border-white/10 bg-slate-800 p-4">
              <p className="text-sm text-slate-400">Wallet USD</p>
              <p className="mt-1 text-lg font-semibold text-green-400">
                ${Number(user.walletBalance?.usd || 0).toFixed(2)}
              </p>
            </div>

            <div className="rounded-lg border border-white/10 bg-slate-800 p-4">
              <p className="text-sm text-slate-400">Wallet LBP</p>
              <p className="mt-1 text-lg font-semibold text-blue-400">
                {Number(user.walletBalance?.lbp || 0).toFixed(0)} LBP
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}