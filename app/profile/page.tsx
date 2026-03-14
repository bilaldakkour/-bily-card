'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import UserPageLayout from '@/components/shared/UserPageLayout'

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

  const profileCards = [
    { label: 'Display Name', value: displayName },
    { label: 'Email', value: user.email || '-' },
    { label: 'Role', value: user.role || 'user' },
    { label: 'Verification', value: user.isVerified ? 'Verified' : 'Not Verified' },
    { label: 'Wallet USD', value: `$${Number(user.walletBalance?.usd || 0).toFixed(2)}`, accent: 'text-emerald-300' },
    { label: 'Wallet LBP', value: `${Number(user.walletBalance?.lbp || 0).toFixed(0)} LBP`, accent: 'text-sky-300' },
  ]

  return (
    <UserPageLayout
      title="My Profile"
      subtitle="Your account information in a cleaner, unified layout."
      breadcrumbs={[
        { label: 'Home', href: '/' },
        { label: 'Profile', href: '/profile' },
      ]}
    >
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {profileCards.map((card) => (
          <div
            key={card.label}
            className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,15,29,0.94),rgba(5,10,22,0.98))] p-4 shadow-[0_20px_56px_rgba(2,6,23,0.2)]"
          >
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{card.label}</p>
            <p className={`mt-2 break-words text-lg font-semibold text-white ${card.accent || ''}`}>{card.value}</p>
          </div>
        ))}
      </div>
    </UserPageLayout>
  )
}
