'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BadgeCheck, Mail, Shield, Wallet } from 'lucide-react'
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
      <main className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
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
      mobileTitle="إعدادات الحساب"
      subtitle="Your account information in a cleaner, unified layout."
      breadcrumbs={[
        { label: 'Home', href: '/' },
        { label: 'Profile', href: '/profile' },
      ]}
    >
      <div className="space-y-4 md:hidden">
        <div className="rounded-[30px] border border-white/10 bg-[#252525] p-5 shadow-[0_24px_70px_rgba(2,6,23,0.22)]">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div className="min-w-0 text-right">
              <h2 className="truncate text-2xl font-black text-white">{displayName}</h2>
              <p className="mt-1 text-lg text-slate-400">Bilycard@</p>
            </div>
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-500/20">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-orange-500 text-3xl font-bold text-slate-950">
                {displayName.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>

          <div className="space-y-5 text-right">
            <div className="flex items-center justify-between gap-4">
              <Mail className="h-6 w-6 text-slate-400" />
              <div className="min-w-0">
                <p className="text-lg text-slate-400">البريد الإلكتروني</p>
                <p className="mt-1 break-all text-2xl text-white">{user.email || '-'}</p>
                <p className="mt-1 text-lg text-emerald-400">
                  {user.isVerified ? 'تم التحقق' : 'غير محقق'}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <Shield className="h-6 w-6 text-slate-400" />
              <div>
                <p className="text-lg text-slate-400">الصلاحية</p>
                <p className="mt-1 text-2xl text-white">{user.role || 'user'}</p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <Wallet className="h-6 w-6 text-slate-400" />
              <div>
                <p className="text-lg text-slate-400">رصيد المحفظة</p>
                <p className="mt-1 text-2xl text-white">${Number(user.walletBalance?.usd || 0).toFixed(2)}</p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <BadgeCheck className="h-6 w-6 text-slate-400" />
              <div>
                <p className="text-lg text-slate-400">رصيد LBP</p>
                <p className="mt-1 text-2xl text-white">{Number(user.walletBalance?.lbp || 0).toFixed(0)} LBP</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="hidden gap-3 md:grid md:grid-cols-2 xl:grid-cols-3">
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
