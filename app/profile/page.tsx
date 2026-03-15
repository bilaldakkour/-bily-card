'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BadgeCheck, Mail, Shield, Wallet } from 'lucide-react'
import { MobileMetricTile, MobilePanel } from '@/components/shared/MobileDesignSystem'
import UserPageLayout from '@/components/shared/UserPageLayout'
import { useLanguage } from '@/hooks/useLanguage'

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
  }
}

export default function ProfilePage() {
  const { language } = useLanguage()
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
      } catch {
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
        <div className="text-white">
          {language === 'ar'
            ? 'جاري تحميل الحساب...'
            : language === 'fr'
              ? 'Chargement du profil...'
              : 'Loading profile...'}
        </div>
      </main>
    )
  }

  if (!user) return null

  const pageCopy = {
    ar: {
      loading: 'جاري تحميل الحساب...',
      userFallback: 'مستخدم',
      title: 'الملف الشخصي',
      mobileTitle: 'إعدادات الحساب',
      subtitle: 'معلومات حسابك ضمن واجهة أوضح وموحدة.',
      breadcrumbHome: 'الرئيسية',
      breadcrumbProfile: 'الملف الشخصي',
      accountLabel: 'حساب Bily Card',
      emailLabel: 'البريد الإلكتروني',
      verified: 'تم التحقق من البريد',
      notVerified: 'البريد غير محقق',
      roleLabel: 'الدور',
      verificationLabel: 'التحقق',
      walletLabel: 'محفظة USD',
      pending: 'قيد الانتظار',
      displayName: 'اسم العرض',
    },
    en: {
      loading: 'Loading profile...',
      userFallback: 'User',
      title: 'My Profile',
      mobileTitle: 'Account Settings',
      subtitle: 'Your account information in a cleaner, unified layout.',
      breadcrumbHome: 'Home',
      breadcrumbProfile: 'Profile',
      accountLabel: 'Bily Card Account',
      emailLabel: 'Email',
      verified: 'Email verified',
      notVerified: 'Email not verified',
      roleLabel: 'Role',
      verificationLabel: 'Verification',
      walletLabel: 'Wallet USD',
      pending: 'Pending',
      displayName: 'Display Name',
    },
    fr: {
      loading: 'Chargement du profil...',
      userFallback: 'Utilisateur',
      title: 'Mon profil',
      mobileTitle: 'Parametres du compte',
      subtitle: 'Les informations de votre compte dans une interface plus claire et unifiee.',
      breadcrumbHome: 'Accueil',
      breadcrumbProfile: 'Profil',
      accountLabel: 'Compte Bily Card',
      emailLabel: 'Email',
      verified: 'Email verifie',
      notVerified: 'Email non verifie',
      roleLabel: 'Role',
      verificationLabel: 'Verification',
      walletLabel: 'Portefeuille USD',
      pending: 'En attente',
      displayName: 'Nom affiche',
    },
  }[language]

  const displayName =
    user.displayName ||
    user.username ||
    user.name ||
    (user.email ? user.email.split('@')[0] : '') ||
    pageCopy.userFallback

  const profileCards = [
    { label: pageCopy.displayName, value: displayName },
    { label: pageCopy.emailLabel, value: user.email || '-' },
    { label: pageCopy.roleLabel, value: user.role || 'user' },
    { label: pageCopy.verificationLabel, value: user.isVerified ? pageCopy.verified : pageCopy.notVerified },
    { label: pageCopy.walletLabel, value: `$${Number(user.walletBalance?.usd || 0).toFixed(2)}` },
  ]

  return (
    <UserPageLayout
      title={pageCopy.title}
      mobileTitle={pageCopy.mobileTitle}
      subtitle={pageCopy.subtitle}
      breadcrumbs={[
        { label: pageCopy.breadcrumbHome, href: '/' },
        { label: pageCopy.breadcrumbProfile, href: '/profile' },
      ]}
    >
      <div className="space-y-4 md:hidden">
        <MobilePanel>
          <div className="mb-5 flex items-center justify-between gap-4">
            <div className="min-w-0 text-right">
              <h2 className="truncate text-2xl font-black text-white">{displayName}</h2>
              <p className="mt-1 text-sm text-slate-400">{pageCopy.accountLabel}</p>
            </div>

            <div className="flex h-20 w-20 items-center justify-center rounded-full border border-cyan-300/18 bg-[linear-gradient(135deg,rgba(34,211,238,0.18),rgba(37,99,235,0.24))]">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[linear-gradient(135deg,rgba(125,211,252,0.96),rgba(59,130,246,0.98))] text-3xl font-bold text-slate-950">
                {displayName.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4 rounded-[20px] border border-white/10 bg-white/[0.04] px-4 py-3.5">
              <Mail className="h-5 w-5 text-cyan-200" />
              <div className="min-w-0 text-right">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{pageCopy.emailLabel}</p>
                <p className="mt-1 break-all text-sm font-semibold text-white">{user.email || '-'}</p>
                <p className="mt-1 text-xs text-emerald-300">
                  {user.isVerified ? pageCopy.verified : pageCopy.notVerified}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <MobileMetricTile
                label={pageCopy.roleLabel}
                value={
                  <span className="inline-flex items-center gap-2">
                    <Shield className="h-4 w-4 text-cyan-200" />
                    {user.role || 'user'}
                  </span>
                }
              />
              <MobileMetricTile
                label={pageCopy.verificationLabel}
                value={
                  <span className="inline-flex items-center gap-2">
                    <BadgeCheck className="h-4 w-4 text-emerald-300" />
                    {user.isVerified ? pageCopy.verified : pageCopy.pending}
                  </span>
                }
              />
              <MobileMetricTile
                label={pageCopy.walletLabel}
                value={
                  <span className="inline-flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-cyan-200" />
                    {`$${Number(user.walletBalance?.usd || 0).toFixed(2)}`}
                  </span>
                }
              />
            </div>
          </div>
        </MobilePanel>
      </div>

      <div className="hidden gap-3 md:grid md:grid-cols-2 xl:grid-cols-3">
        {profileCards.map((card) => (
          <MobilePanel key={card.label} className="p-4" tone="soft">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{card.label}</p>
            <p className="mt-2 break-words text-lg font-semibold text-white">{card.value}</p>
          </MobilePanel>
        ))}
      </div>
    </UserPageLayout>
  )
}
