'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Bell,
  Check,
  ChevronLeft,
  CreditCard,
  FileText,
  Globe,
  Home,
  LogOut,
  Menu,
  Phone,
  Receipt,
  Search,
  Settings,
  Shield,
  Trophy,
  User,
  Wallet,
  X,
} from 'lucide-react'
import { useLanguage, type LanguageCode } from '@/hooks/useLanguage'
import { useSupportContact } from '@/hooks/useSupportContact'
import { clearAuthUserCache, fetchAuthUser } from '@/lib/utils/authClient'

type UserData = {
  displayName?: string
  username?: string
  name?: string
  email?: string
  phoneNumber?: string
  country?: string
  avatar?: string
  role?: string
  walletBalance?: {
    usd?: number
  }
}

type SidebarOrder = {
  status?: string
  total?: number
}

type SidebarTransaction = {
  type?: string
  amount?: number
}

interface MobileUserShellProps {
  title?: string
}

export default function MobileUserShell({ title }: MobileUserShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { isRTL, t, language, setAppLanguage } = useLanguage()
  const supportContact = useSupportContact()
  const [query, setQuery] = useState('')
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [user, setUser] = useState<UserData | null>(null)
  const [orderStats, setOrderStats] = useState({
    pending: 0,
    completed: 0,
    cancelled: 0,
    total: 0,
  })
  const [financeStats, setFinanceStats] = useState({
    totalTransactions: 0,
    totalDeposits: 0,
    totalOrdersAmount: 0,
    currentDebt: 0,
  })
  const languageOptions: Array<{ code: LanguageCode; label: string }> = [
    { code: 'ar', label: t('lang.ar') },
    { code: 'en', label: t('lang.en') },
    { code: 'fr', label: t('lang.fr') },
  ]

  const mobileCopy = {
    ar: {
      searchPlaceholder: 'ابحث عن المنتجات...',
      quickAccess: 'الوصول السريع',
      accountSettingsTitle: 'إعدادات الحساب',
      accountSettingsSubtitle: 'ثابتة على نسخة التلفون',
      username: 'اسم المستخدم',
      email: 'البريد الإلكتروني',
      phone: 'رقم الهاتف',
      phoneLater: 'سنربطه لاحقاً',
      country: 'الدولة',
      countryLater: 'سنربطها لاحقاً',
      walletBalance: 'رصيد المحفظة',
      userLevel: 'مستوى المستخدم',
      fixedProgress: 'تقدم ثابت حالياً',
      securitySettings: 'إعدادات الأمان',
      twoFactor: 'المصادقة الثنائية',
      twoFactorValue: 'يتم استخدام: email',
      laterNote: '(سنربطها لاحقاً)',
      password: 'كلمة المرور',
      passwordAction: 'تغيير كلمة المرور الحساب',
      changePassword: 'تغيير كلمة المرور',
      menu: 'القائمة',
      notifications: 'الإشعارات',
      accountTab: 'حسابي',
      openMenu: 'فتح القائمة',
      closeMenu: 'إغلاق القائمة',
      closeOverlay: 'إغلاق القائمة',
      languageTitle: 'اللغة',
      languageSubtitle: 'بدّل لغة الموقع على الهاتف',
      usdOnly: 'USD only',
    },
    en: {
      searchPlaceholder: 'Search products...',
      quickAccess: 'Quick Access',
      accountSettingsTitle: 'Account Settings',
      accountSettingsSubtitle: 'Pinned on mobile version',
      username: 'Username',
      email: 'Email',
      phone: 'Phone Number',
      phoneLater: 'Will be linked later',
      country: 'Country',
      countryLater: 'Will be linked later',
      walletBalance: 'Wallet Balance',
      userLevel: 'User Level',
      fixedProgress: 'Static progress for now',
      securitySettings: 'Security Settings',
      twoFactor: 'Two-Factor Authentication',
      twoFactorValue: 'Using: email',
      laterNote: '(Will be linked later)',
      password: 'Password',
      passwordAction: 'Change account password',
      changePassword: 'Change Password',
      menu: 'Menu',
      notifications: 'Notifications',
      accountTab: 'Account',
      openMenu: 'Open menu',
      closeMenu: 'Close menu',
      closeOverlay: 'Close menu',
      languageTitle: 'Language',
      languageSubtitle: 'Switch the site language on mobile',
      usdOnly: 'USD only',
    },
    fr: {
      searchPlaceholder: 'Rechercher des produits...',
      quickAccess: 'Acces rapide',
      accountSettingsTitle: 'Parametres du compte',
      accountSettingsSubtitle: 'Epingle sur la version mobile',
      username: "Nom d'utilisateur",
      email: 'Email',
      phone: 'Numero de telephone',
      phoneLater: 'Sera lie plus tard',
      country: 'Pays',
      countryLater: 'Sera lie plus tard',
      walletBalance: 'Solde du portefeuille',
      userLevel: "Niveau d'utilisateur",
      fixedProgress: 'Progression fixe pour le moment',
      securitySettings: 'Parametres de securite',
      twoFactor: 'Authentification a deux facteurs',
      twoFactorValue: 'Utilise: email',
      laterNote: '(Sera lie plus tard)',
      password: 'Mot de passe',
      passwordAction: 'Changer le mot de passe du compte',
      changePassword: 'Changer le mot de passe',
      menu: 'Menu',
      notifications: 'Notifications',
      accountTab: 'Compte',
      openMenu: 'Ouvrir le menu',
      closeMenu: 'Fermer le menu',
      closeOverlay: 'Fermer le menu',
      languageTitle: 'Langue',
      languageSubtitle: 'Changer la langue du site sur mobile',
      usdOnly: 'USD only',
    },
  }[language]
  const routeTitles: Record<string, string> = {
    '/': t('sidebar.home'),
    '/products': t('nav.products'),
    '/wallet': t('wallet.title'),
    '/account': t('account.title'),
    '/orders': t('orders.title'),
    '/my-orders': t('orders.title'),
    '/notifications':
      language === 'ar' ? 'الإشعارات' : language === 'fr' ? 'Notifications' : 'Notifications',
    '/my-favorites':
      language === 'ar' ? 'المفضلة' : language === 'fr' ? 'Favoris' : 'Favorites',
    '/profile':
      language === 'ar'
        ? 'إعدادات الحساب'
        : language === 'fr'
          ? 'Parametres du compte'
          : 'Account Settings',
    '/contact':
      language === 'ar' ? 'تواصل معنا' : language === 'fr' ? 'Contactez-nous' : 'Contact Us',
  }
  const resolvedTitle = routeTitles[pathname] || title

  const navigationItems = useMemo(
    () => [
      { href: '/', label: t('sidebar.home'), icon: Home },
      { href: '/products', label: t('sidebar.products'), icon: Trophy },
      { href: '/wallet', label: t('sidebar.wallet'), icon: Wallet },
      { href: '/my-orders', label: t('sidebar.purchaseHistory'), icon: Receipt },
      { href: '/orders', label: t('sidebar.orders'), icon: FileText },
      { href: '/profile', label: t('sidebar.account'), icon: Settings },
      { href: '/contact', label: t('sidebar.contact'), icon: Phone },
      { href: '/account', label: t('sidebar.settings'), icon: Settings },
      ...(user?.role === 'admin'
        ? [{ href: '/admin', label: 'Admin Dashboard', icon: Shield }]
        : []),
    ],
    [t, user?.role]
  )

  useEffect(() => {
    const token = localStorage.getItem('bilycard_token')
    if (!token) return

    const loadData = async () => {
      try {
        const nextUser = await fetchAuthUser(token)
        if (!nextUser) {
          setUser(null)
          return
        }

        setUser(nextUser)

        const walletUsd = Number(nextUser.walletBalance?.usd || 0)
        setFinanceStats((prev) => ({
          ...prev,
          currentDebt: walletUsd < 0 ? Math.abs(walletUsd) : 0,
        }))

        const [ordersRes, txRes] = await Promise.all([
          fetch('/api/orders', {
            headers: { Authorization: `Bearer ${token}` },
            cache: 'no-store',
          }),
          fetch('/api/wallet/transactions', {
            headers: { Authorization: `Bearer ${token}` },
            cache: 'no-store',
          }),
        ])

        const [ordersData, txData] = await Promise.all([ordersRes.json(), txRes.json()])
        const orders: SidebarOrder[] = Array.isArray(ordersData?.data) ? ordersData.data : []
        const transactions: SidebarTransaction[] = Array.isArray(txData?.transactions)
          ? txData.transactions
          : []

        const pendingCount = orders.filter((order) =>
          ['pending', 'processing'].includes(String(order.status || '').toLowerCase())
        ).length
        const completedCount = orders.filter(
          (order) => String(order.status || '').toLowerCase() === 'completed'
        ).length
        const cancelledCount = orders.filter((order) =>
          ['failed', 'rejected', 'refunded'].includes(String(order.status || '').toLowerCase())
        ).length

        const totalDeposits = transactions
          .filter((tx) => String(tx.type || '').toLowerCase() === 'deposit')
          .reduce((sum, tx) => sum + Math.max(0, Number(tx.amount || 0)), 0)

        const totalOrdersAmount = orders
          .filter((order) => String(order.status || '').toLowerCase() === 'completed')
          .reduce((sum, order) => sum + Math.max(0, Number(order.total || 0)), 0)

        setOrderStats({
          pending: pendingCount,
          completed: completedCount,
          cancelled: cancelledCount,
          total: orders.length,
        })

        setFinanceStats((prev) => ({
          ...prev,
          totalTransactions: transactions.length,
          totalDeposits,
          totalOrdersAmount,
        }))
      } catch {
        setUser(null)
      }
    }

    void loadData()
  }, [])

  const handleSearch = () => {
    const next = query.trim()
    router.push(next ? `/products?search=${encodeURIComponent(next)}` : '/products')
  }

  const handleLogout = () => {
    const token = localStorage.getItem('bilycard_token') || localStorage.getItem('token') || undefined
    clearAuthUserCache(token)
    localStorage.removeItem('token')
    localStorage.removeItem('bilycard_token')
    localStorage.removeItem('bilycard_user_name')
    localStorage.removeItem('bilycard_user_email')
    localStorage.removeItem('bilycard_user_avatar')
    setIsMenuOpen(false)
    window.dispatchEvent(new Event('bilycard-auth-changed'))
    router.push('/login')
  }

  const userDisplayName =
    user?.displayName ||
    user?.username ||
    user?.name ||
    (user?.email ? user.email.split('@')[0] : '') ||
    'Bilycard@'

  const handleLanguageChange = (nextLanguage: LanguageCode) => {
    if (nextLanguage === language) {
      return
    }
    setAppLanguage(nextLanguage)
    setIsMenuOpen(false)
    window.location.reload()
  }

  return (
    <>
      <div className="md:hidden">
        <div className="mb-3 rounded-[28px] border border-cyan-300/14 bg-[linear-gradient(180deg,rgba(7,16,30,0.98),rgba(9,19,35,0.99))] px-3 py-2.5 shadow-[0_24px_70px_rgba(2,6,23,0.42)] ring-1 ring-white/[0.03]">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsMenuOpen(true)}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] border border-cyan-300/16 bg-[linear-gradient(180deg,rgba(16,32,56,0.96),rgba(12,22,40,0.96))] text-slate-100 shadow-[0_12px_24px_rgba(2,6,23,0.18)]"
              aria-label={mobileCopy.openMenu}
            >
              <Menu className="h-5 w-5" />
            </button>

            <label className="relative block flex-1">
              <Search
                className={`pointer-events-none absolute top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500 ${
                  isRTL ? 'left-4' : 'right-4'
                }`}
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSearch()
                }}
                placeholder={mobileCopy.searchPlaceholder}
                className="w-full rounded-[20px] border border-white/10 bg-white/[0.045] px-4 py-2.5 text-right text-sm text-white placeholder-slate-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] focus:border-cyan-400/45 focus:bg-white/[0.055] focus:outline-none"
                dir={isRTL ? 'rtl' : 'ltr'}
              />
            </label>
          </div>
        </div>

        {resolvedTitle ? (
          <div className="mb-4 flex items-center justify-between">
            <h1 className="text-right text-[1.75rem] font-black leading-none text-white sm:text-[2rem]">
              {resolvedTitle}
            </h1>
          </div>
        ) : null}
      </div>

      {isMenuOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[70] bg-black/65 md:hidden"
            onClick={() => setIsMenuOpen(false)}
            aria-label={mobileCopy.closeOverlay}
          />

          <aside className="fixed inset-y-0 right-0 z-[80] w-[86vw] max-w-[360px] overflow-y-auto border-l border-cyan-300/18 bg-[linear-gradient(180deg,rgba(7,16,30,0.99),rgba(9,20,36,1))] px-3.5 pb-24 pt-4 shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_30px_90px_rgba(2,6,23,0.6)] md:hidden">
            <div className="mb-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsMenuOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white shadow-[0_12px_22px_rgba(2,6,23,0.18)]"
                aria-label={mobileCopy.closeMenu}
              >
                <X className="h-4 w-4" />
              </button>

              <div className="text-right">
                <p className="text-base font-bold text-white">{userDisplayName}</p>
                <p className="text-xs text-slate-400">{t('sidebar.account')}</p>
              </div>

              <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-cyan-400/20 bg-cyan-500/10">
                {user?.avatar ? (
                  <img src={user.avatar} alt="User avatar" className="h-full w-full object-cover" />
                ) : (
                  <User className="h-6 w-6 text-cyan-200" />
                )}
              </div>
            </div>

            <div className="mb-4 rounded-[22px] border border-cyan-400/14 bg-white/[0.035] p-3.5 text-right">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs text-slate-400">{t('sidebar.level')}</span>
                <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1 text-xs font-semibold text-cyan-200">
                  LVL 3
                </span>
              </div>

              <div className="h-2 w-full rounded-full bg-slate-800/90">
                <div className="h-2 w-[60%] rounded-full bg-gradient-to-r from-cyan-400 to-blue-500" />
              </div>

              <p className="mt-1.5 text-xs text-slate-400">{t('sidebar.progress')}</p>

              <div className="mt-3.5 rounded-[20px] border border-cyan-400/18 bg-[linear-gradient(180deg,rgba(7,32,54,0.95),rgba(6,24,40,0.92))] p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xl font-bold text-cyan-300">
                    ${Number(user?.walletBalance?.usd || 0).toFixed(2)}
                  </span>
                  <span className="text-sm text-slate-100">{t('sidebar.availableBalance')}</span>
                </div>
                <Link
                  href="/wallet"
                  onClick={() => setIsMenuOpen(false)}
                  className="mt-3.5 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(14,165,233,0.22)]"
                >
                  <Wallet className="h-4 w-4" />
                  {t('sidebar.addBalance')}
                </Link>
              </div>
            </div>

            <div className="space-y-2 border-t border-white/10 pt-4 text-right">
              <p className="mb-2.5 text-sm text-slate-400">{mobileCopy.quickAccess}</p>
              {navigationItems.map((item) => {
                const Icon = item.icon
                const active = pathname === item.href

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMenuOpen(false)}
                    className={`flex items-center justify-between rounded-[18px] px-3.5 py-3 text-sm transition ${
                      active
                        ? 'border border-cyan-400/30 bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_12px_24px_rgba(14,165,233,0.22)]'
                        : 'border border-transparent text-slate-300 hover:border-white/10 hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5" />
                      <span>{item.label}</span>
                    </div>
                    <ChevronLeft className="h-4 w-4 text-slate-500" />
                  </Link>
                )
              })}
            </div>

            <div className="mt-4 rounded-[22px] border border-cyan-400/16 bg-[linear-gradient(180deg,rgba(8,18,33,0.98),rgba(15,23,42,0.96))] p-3.5 text-right shadow-[0_18px_36px_rgba(2,6,23,0.2)]">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-base font-bold text-white">{mobileCopy.languageTitle}</p>
                  <p className="mt-1 text-xs text-slate-400">{mobileCopy.languageSubtitle}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-400/16 bg-cyan-500/10 text-cyan-300">
                  <Globe className="h-5 w-5" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {languageOptions.map((option) => {
                  const active = language === option.code
                  return (
                    <button
                      key={option.code}
                      type="button"
                      onClick={() => handleLanguageChange(option.code)}
                      className={`rounded-2xl border px-3 py-3 text-center text-sm font-semibold transition ${
                        active
                          ? 'border-cyan-400/30 bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_12px_24px_rgba(14,165,233,0.22)]'
                          : 'border-white/10 bg-white/[0.04] text-slate-200'
                      }`}
                    >
                      <span className="flex items-center justify-center gap-1.5">
                        {active ? <Check className="h-4 w-4" /> : null}
                        {option.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="mt-4 rounded-[22px] border border-cyan-400/16 bg-[linear-gradient(180deg,rgba(8,18,33,0.98),rgba(15,23,42,0.96))] p-3.5 text-right shadow-[0_18px_36px_rgba(2,6,23,0.2)]">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-base font-bold text-white">{mobileCopy.accountSettingsTitle}</p>
                  <p className="mt-1 text-xs text-slate-400">{mobileCopy.accountSettingsSubtitle}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-400/16 bg-cyan-500/10 text-cyan-300">
                  <Settings className="h-5 w-5" />
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                  <p className="text-xs text-slate-500">{mobileCopy.username}</p>
                  <p className="mt-1 text-sm font-semibold text-white">{userDisplayName}</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                  <p className="text-xs text-slate-500">{mobileCopy.email}</p>
                  <p className="mt-1 break-all text-sm font-semibold text-white">{user?.email || '-'}</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                  <p className="text-xs text-slate-500">{mobileCopy.phone}</p>
                  <p className="mt-1 text-sm font-semibold text-white">{user?.phoneNumber || mobileCopy.phoneLater}</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                  <p className="text-xs text-slate-500">{mobileCopy.country}</p>
                  <p className="mt-1 text-sm font-semibold text-white">{user?.country || mobileCopy.countryLater}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-2xl border border-cyan-400/14 bg-cyan-500/8 px-4 py-3">
                    <p className="text-xs text-slate-500">{mobileCopy.walletBalance}</p>
                    <p className="mt-1 text-sm font-semibold text-cyan-200">
                      ${Number(user?.walletBalance?.usd || 0).toFixed(2)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">{mobileCopy.usdOnly}</p>
                  </div>
                  <div className="rounded-2xl border border-cyan-400/14 bg-cyan-500/8 px-4 py-3">
                    <p className="text-xs text-slate-500">{mobileCopy.userLevel}</p>
                    <p className="mt-1 text-sm font-semibold text-cyan-200">LVL 3</p>
                    <p className="mt-1 text-xs text-slate-500">{mobileCopy.fixedProgress}</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-[22px] border border-rose-300/10 bg-[linear-gradient(180deg,rgba(31,24,35,0.94),rgba(18,20,32,0.96))] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-base font-semibold text-white">{mobileCopy.securitySettings}</p>
                  <Shield className="h-5 w-5 text-rose-300" />
                </div>

                <div className="space-y-2.5">
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                    <p className="text-xs text-slate-500">{mobileCopy.twoFactor}</p>
                    <p className="mt-1 text-sm font-semibold text-white">{mobileCopy.twoFactorValue}</p>
                    <p className="mt-1 text-xs text-slate-500">{mobileCopy.laterNote}</p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                    <p className="text-xs text-slate-500">{mobileCopy.password}</p>
                    <p className="mt-1 text-sm font-semibold text-white">{mobileCopy.passwordAction}</p>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Link
                    href="/profile"
                    onClick={() => setIsMenuOpen(false)}
                    className="rounded-2xl border border-cyan-400/14 bg-cyan-500/10 px-4 py-3 text-center text-sm font-semibold text-cyan-200"
                  >
                    {mobileCopy.accountSettingsTitle}
                  </Link>
                  <Link
                    href="/account"
                    onClick={() => setIsMenuOpen(false)}
                    className="rounded-2xl border border-rose-300/14 bg-rose-500/10 px-4 py-3 text-center text-sm font-semibold text-rose-200"
                  >
                    {mobileCopy.changePassword}
                  </Link>
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-2 border-t border-white/10 pt-4 text-right">
              <p className="mb-2.5 text-sm text-slate-400">{t('sidebar.accountReport')}</p>

              <div className="flex items-center justify-between rounded-2xl bg-white/[0.04] px-4 py-3 text-sm">
                <span className="text-slate-300">{t('sidebar.currentBalance')}</span>
                <span className="font-semibold text-cyan-300">
                  ${Number(user?.walletBalance?.usd || 0).toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-white/[0.04] px-4 py-3 text-sm">
                <span className="text-slate-300">{t('sidebar.currentDebt')}</span>
                <span className="font-semibold text-red-300">
                  ${Number(financeStats.currentDebt || 0).toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-white/[0.04] px-4 py-3 text-sm">
                <span className="text-slate-300">{t('sidebar.totalTransactions')}</span>
                <span className="font-semibold text-white">{financeStats.totalTransactions}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-white/[0.04] px-4 py-3 text-sm">
                <span className="text-slate-300">{t('sidebar.totalDeposits')}</span>
                <span className="font-semibold text-emerald-300">
                  ${Number(financeStats.totalDeposits || 0).toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-white/[0.04] px-4 py-3 text-sm">
                <span className="text-slate-300">{t('sidebar.totalOrdersAmount')}</span>
                <span className="font-semibold text-sky-300">
                  ${Number(financeStats.totalOrdersAmount || 0).toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-white/[0.04] px-4 py-3 text-sm">
                <span className="text-slate-300">{t('sidebar.totalOrdersCount')}</span>
                <span className="font-semibold text-white">{orderStats.total}</span>
              </div>
            </div>

            <div className="mt-4 space-y-2 border-t border-white/10 pt-4 text-right">
              <p className="mb-2.5 text-sm text-slate-400">{t('sidebar.purchaseSummary')}</p>

              <div className="flex items-center justify-between rounded-2xl bg-white/[0.04] px-4 py-3 text-sm">
                <span className="inline-flex items-center gap-2 text-slate-300">
                  <Receipt className="h-4 w-4 text-amber-300" />
                  {t('sidebar.pendingOrders')}
                </span>
                <span className="font-semibold text-amber-300">{orderStats.pending}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-white/[0.04] px-4 py-3 text-sm">
                <span className="inline-flex items-center gap-2 text-slate-300">
                  <Shield className="h-4 w-4 text-emerald-300" />
                  {t('sidebar.completedOrders')}
                </span>
                <span className="font-semibold text-emerald-300">{orderStats.completed}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-white/[0.04] px-4 py-3 text-sm">
                <span className="inline-flex items-center gap-2 text-slate-300">
                  <FileText className="h-4 w-4 text-red-300" />
                  {t('sidebar.cancelledOrders')}
                </span>
                <span className="font-semibold text-red-300">{orderStats.cancelled}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-white/[0.04] px-4 py-3 text-sm">
                <span className="inline-flex items-center gap-2 text-slate-300">
                  <CreditCard className="h-4 w-4 text-cyan-300" />
                  {t('sidebar.totalOrdersCount')}
                </span>
                <span className="font-semibold text-white">{orderStats.total}</span>
              </div>
            </div>

            <div className="mt-4 rounded-[22px] border border-cyan-400/16 bg-gradient-to-br from-cyan-500/10 to-blue-600/10 p-3.5 text-right shadow-[0_18px_36px_rgba(14,165,233,0.08)]">
              <h3 className="mb-2 font-semibold text-cyan-300">{t('sidebar.needHelp')}</h3>
              <Link
                href={supportContact.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white"
              >
                <Phone className="h-4 w-4" />
                <span>{t('sidebar.contactSupport')}</span>
              </Link>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-[18px] border border-red-400/20 bg-red-500/85 px-4 py-3 text-sm font-semibold text-white"
            >
              <LogOut className="h-4 w-4" />
              {t('nav.logout')}
            </button>
          </aside>
        </>
      )}

      <nav className="fixed inset-x-0 bottom-3 z-[60] px-4 md:hidden">
        <div className="mx-auto flex max-w-md items-center justify-between rounded-[26px] border border-cyan-300/20 bg-[linear-gradient(180deg,rgba(8,17,31,0.96),rgba(11,22,39,0.98))] px-3 py-2.5 shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_20px_60px_rgba(2,6,23,0.48)] backdrop-blur">
          <Link
            href="/account"
            className={`flex min-w-[62px] flex-col items-center gap-1 rounded-2xl px-2 py-1 text-xs ${
              pathname === '/account' || pathname === '/profile' ? 'bg-cyan-500/10 text-cyan-300' : 'text-slate-300'
            }`}
          >
            <User className="h-5 w-5" />
            <span>{mobileCopy.accountTab}</span>
          </Link>

          <Link
            href="/notifications"
            className={`relative flex min-w-[62px] flex-col items-center gap-1 rounded-2xl px-2 py-1 text-xs ${
              pathname === '/notifications' ? 'bg-cyan-500/10 text-cyan-300' : 'text-slate-300'
            }`}
          >
            <Bell className="h-5 w-5" />
            <span>{mobileCopy.notifications}</span>
            <span className="absolute right-3 top-0 h-2.5 w-2.5 rounded-full bg-red-500" />
          </Link>

          <Link
            href="/"
            className={`flex min-w-[62px] flex-col items-center gap-1 rounded-2xl px-2 py-1 text-xs ${
              pathname === '/' ? 'bg-cyan-500/10 text-cyan-300' : 'text-slate-300'
            }`}
          >
            <Home className="h-5 w-5" />
            <span>{t('sidebar.home')}</span>
          </Link>

          <button
            type="button"
            onClick={() => setIsMenuOpen(true)}
            className={`flex min-w-[62px] flex-col items-center gap-1 rounded-2xl px-2 py-1 text-xs ${
              isMenuOpen ? 'bg-cyan-500/10 text-cyan-300' : 'text-slate-300'
            }`}
          >
            <Menu className="h-5 w-5" />
            <span>{mobileCopy.menu}</span>
          </button>
        </div>
      </nav>
    </>
  )
}
