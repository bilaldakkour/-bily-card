'use client';

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Bell,
  Check,
  ChevronLeft,
  CreditCard,
  FileText,
  Globe,
  Heart,
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
import { fetchAuthUser, fetchUserActivitySnapshot } from '@/lib/utils/authClient'
import { logoutCustomer } from '@/lib/utils/customerLogout'
import GlobalSearchOverlay from '@/components/shared/GlobalSearchOverlay'

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
  showTopPanel?: boolean
}

const getLevelState = (balanceRaw: number) => {
  const balance = Number.isFinite(balanceRaw) ? Math.max(0, balanceRaw) : 0

  if (balance < 500) {
    return { level: 1, progress: (balance / 500) * 100, nextLevel: 2 as number | null }
  }
  if (balance < 1500) {
    return { level: 2, progress: ((balance - 500) / 1000) * 100, nextLevel: 3 as number | null }
  }
  if (balance < 6000) {
    return { level: 3, progress: ((balance - 1500) / 4500) * 100, nextLevel: 4 as number | null }
  }
  if (balance < 12000) {
    return { level: 4, progress: ((balance - 6000) / 6000) * 100, nextLevel: 5 as number | null }
  }
  if (balance < 25000) {
    return { level: 5, progress: ((balance - 12000) / 13000) * 100, nextLevel: null as number | null }
  }

  return { level: 5, progress: 100, nextLevel: null as number | null }
}

export default function MobileUserShell({ title, showTopPanel = true }: MobileUserShellProps) {
  const pathname = usePathname()
  const { isRTL, t, language, setAppLanguage } = useLanguage()
  const supportContact = useSupportContact()
  const [query, setQuery] = useState('')
  const [isSearchOverlayOpen, setIsSearchOverlayOpen] = useState(false)
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
  const favoritesLabel =
    language === 'ar' ? 'المفضلة' : language === 'fr' ? 'Favoris' : 'Favorites'
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
      { href: '/my-favorites', label: favoritesLabel, icon: Heart },
      { href: '/contact', label: t('sidebar.contact'), icon: Phone },
      { href: '/account', label: t('sidebar.settings'), icon: Settings },
      ...(user?.role === 'admin'
        ? [{ href: '/admin', label: 'Admin Dashboard', icon: Shield }]
        : []),
    ],
    [favoritesLabel, t, user?.role]
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

        const snapshot = await fetchUserActivitySnapshot(token)
        const orders: SidebarOrder[] = Array.isArray(snapshot?.orders) ? snapshot.orders : []
        const transactions: SidebarTransaction[] = Array.isArray(snapshot?.transactions)
          ? snapshot.transactions
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
    setIsSearchOverlayOpen(true)
  }

  const handleLogout = async () => {
    setIsMenuOpen(false)
    await logoutCustomer('/login')
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

  const walletUsd = Number(user?.walletBalance?.usd || 0)
  const levelState = getLevelState(walletUsd)
  const levelProgress = Math.max(0, Math.min(100, Math.round(levelState.progress)))
  const levelLabelBase =
    language === 'ar' ? 'المستوى الحالي' : language === 'fr' ? 'Niveau actuel' : 'Current level'
  const levelProgressLabel =
    language === 'ar'
      ? levelState.nextLevel
        ? `${levelProgress}% نحو المستوى ${levelState.nextLevel}`
        : levelProgress >= 100
          ? 'تم الوصول لأعلى مستوى'
          : `${levelProgress}% ضمن المستوى 5`
      : language === 'fr'
        ? levelState.nextLevel
          ? `${levelProgress}% vers niveau ${levelState.nextLevel}`
          : levelProgress >= 100
            ? 'Niveau maximum atteint'
            : `${levelProgress}% dans niveau 5`
        : levelState.nextLevel
          ? `${levelProgress}% to level ${levelState.nextLevel}`
          : levelProgress >= 100
            ? 'Max level reached'
            : `${levelProgress}% within level 5`

  return (
    <>
      <div className="md:hidden">
        {showTopPanel ? (
          <div className="theme-premium-panel mb-1.5 rounded-[22px] border px-2.5 py-1.5 shadow-[0_16px_40px_rgba(2,6,23,0.34)] ring-1 ring-white/[0.03]">
            <div className="flex items-center">
              <label className="relative block w-full">
                <button
                  type="button"
                  onClick={handleSearch}
                  className={`absolute top-1/2 -translate-y-1/2 text-slate-500 ${
                    isRTL ? 'left-4' : 'right-4'
                  }`}
                  aria-label={mobileCopy.searchPlaceholder}
                >
                  <Search className="h-4 w-4" />
                </button>
                <input
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value)
                    setIsSearchOverlayOpen(true)
                  }}
                  onFocus={() => setIsSearchOverlayOpen(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') setIsSearchOverlayOpen(true)
                  }}
                  placeholder={mobileCopy.searchPlaceholder}
                  className="w-full rounded-full border border-white/12 bg-white/[0.045] px-4 py-1.5 text-right text-sm text-white placeholder-slate-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] focus:border-[#d4a940]/45 focus:bg-white/[0.055] focus:outline-none"
                  dir={isRTL ? 'rtl' : 'ltr'}
                />
              </label>
            </div>
          </div>
        ) : null}

        {resolvedTitle ? (
          <div className="mb-2.5 flex items-center justify-between">
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

          <aside className="fixed inset-y-0 right-0 z-[80] w-[64vw] max-w-[270px] overflow-y-auto border-l border-cyan-300/18 bg-[linear-gradient(180deg,rgba(7,16,30,0.99),rgba(9,20,36,1))] px-3 pb-20 pt-3.5 shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_30px_90px_rgba(2,6,23,0.6)] md:hidden">
            <div className="mb-3 flex items-center justify-between">
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

            <div className="mb-3 rounded-[22px] border border-cyan-400/14 bg-white/[0.035] p-3 text-right">
              <div className="mb-2.5 flex items-center justify-between">
                <span className="text-xs text-slate-400">{levelLabelBase}</span>
                <Link
                  href="/level-progress"
                  onClick={() => setIsMenuOpen(false)}
                  className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1 text-xs font-semibold text-cyan-200 transition hover:border-cyan-300/40 hover:bg-cyan-400/16"
                >
                  LVL {levelState.level}
                </Link>
              </div>

              <div className="h-2 w-full rounded-full bg-slate-800/90">
                <div className="h-2 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500" style={{ width: `${levelProgress}%` }} />
              </div>

              <p className="mt-1 text-xs text-slate-400">{levelProgressLabel}</p>

              <div className="mt-3 rounded-[20px] border border-cyan-400/18 bg-[linear-gradient(180deg,rgba(7,32,54,0.95),rgba(6,24,40,0.92))] p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xl font-bold text-cyan-300">
                    ${Number(user?.walletBalance?.usd || 0).toFixed(2)}
                  </span>
                  <span className="text-sm text-slate-100">{t('sidebar.availableBalance')}</span>
                </div>
                <Link
                  href="/wallet"
                  onClick={() => setIsMenuOpen(false)}
                  className="theme-premium-btn mt-3 flex items-center justify-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold text-white"
                >
                  <Wallet className="h-4 w-4" />
                  {t('sidebar.addBalance')}
                </Link>
              </div>
            </div>

            <div className="space-y-1.5 border-t border-white/10 pt-3 text-right">
              <p className="mb-2 text-sm text-slate-400">{mobileCopy.quickAccess}</p>
              {navigationItems.map((item) => {
                const Icon = item.icon
                const active = pathname === item.href

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMenuOpen(false)}
                    className={`flex items-center justify-between rounded-[18px] px-3.5 py-2.5 text-sm transition ${
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
            <div className="mt-3 space-y-1.5 border-t border-white/10 pt-3 text-right">
              <p className="mb-2 text-sm text-slate-400">{t('sidebar.accountReport')}</p>

              <div className="flex items-center justify-between rounded-2xl bg-white/[0.04] px-4 py-2.5 text-sm">
                <span className="text-slate-300">{t('sidebar.currentBalance')}</span>
                <span className="font-semibold text-cyan-300">
                  ${Number(user?.walletBalance?.usd || 0).toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-white/[0.04] px-4 py-2.5 text-sm">
                <span className="text-slate-300">{t('sidebar.currentDebt')}</span>
                <span className="font-semibold text-red-300">
                  ${Number(financeStats.currentDebt || 0).toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-white/[0.04] px-4 py-2.5 text-sm">
                <span className="text-slate-300">{t('sidebar.totalTransactions')}</span>
                <span className="font-semibold text-white">{financeStats.totalTransactions}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-white/[0.04] px-4 py-2.5 text-sm">
                <span className="text-slate-300">{t('sidebar.totalDeposits')}</span>
                <span className="font-semibold text-emerald-300">
                  ${Number(financeStats.totalDeposits || 0).toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-white/[0.04] px-4 py-2.5 text-sm">
                <span className="text-slate-300">{t('sidebar.totalOrdersAmount')}</span>
                <span className="font-semibold text-sky-300">
                  ${Number(financeStats.totalOrdersAmount || 0).toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-white/[0.04] px-4 py-2.5 text-sm">
                <span className="text-slate-300">{t('sidebar.totalOrdersCount')}</span>
                <span className="font-semibold text-white">{orderStats.total}</span>
              </div>
            </div>

            <div className="mt-3 space-y-1.5 border-t border-white/10 pt-3 text-right">
              <p className="mb-2 text-sm text-slate-400">{t('sidebar.purchaseSummary')}</p>

              <div className="flex items-center justify-between rounded-2xl bg-white/[0.04] px-4 py-2.5 text-sm">
                <span className="inline-flex items-center gap-2 text-slate-300">
                  <Receipt className="h-4 w-4 text-amber-300" />
                  {t('sidebar.pendingOrders')}
                </span>
                <span className="font-semibold text-amber-300">{orderStats.pending}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-white/[0.04] px-4 py-2.5 text-sm">
                <span className="inline-flex items-center gap-2 text-slate-300">
                  <Shield className="h-4 w-4 text-emerald-300" />
                  {t('sidebar.completedOrders')}
                </span>
                <span className="font-semibold text-emerald-300">{orderStats.completed}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-white/[0.04] px-4 py-2.5 text-sm">
                <span className="inline-flex items-center gap-2 text-slate-300">
                  <FileText className="h-4 w-4 text-red-300" />
                  {t('sidebar.cancelledOrders')}
                </span>
                <span className="font-semibold text-red-300">{orderStats.cancelled}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-white/[0.04] px-4 py-2.5 text-sm">
                <span className="inline-flex items-center gap-2 text-slate-300">
                  <CreditCard className="h-4 w-4 text-cyan-300" />
                  {t('sidebar.totalOrdersCount')}
                </span>
                <span className="font-semibold text-white">{orderStats.total}</span>
              </div>
            </div>

            <div className="mt-3 rounded-[22px] border border-cyan-400/16 bg-gradient-to-br from-cyan-500/10 to-blue-600/10 p-3 text-right shadow-[0_18px_36px_rgba(14,165,233,0.08)]">
              <h3 className="mb-2 font-semibold text-cyan-300">{t('sidebar.needHelp')}</h3>
              <Link
                href={supportContact.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-sm font-semibold text-white"
              >
                <Phone className="h-4 w-4" />
                <span>{t('sidebar.contactSupport')}</span>
              </Link>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-[18px] border border-red-400/20 bg-red-500/85 px-4 py-2.5 text-sm font-semibold text-white"
            >
              <LogOut className="h-4 w-4" />
              {t('nav.logout')}
            </button>
          </aside>
        </>
      )}

      <GlobalSearchOverlay
        open={isSearchOverlayOpen}
        query={query}
        onQueryChange={setQuery}
        onClose={() => setIsSearchOverlayOpen(false)}
      />

      <nav className="fixed inset-x-0 bottom-2 z-[60] px-3 md:hidden">
        <div className="mx-auto flex max-w-lg items-center justify-between rounded-[22px] border border-[#3a7bff]/26 bg-[linear-gradient(180deg,rgba(8,17,31,0.96),rgba(11,22,39,0.98))] px-2 py-1.5 shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_18px_50px_rgba(2,6,23,0.44)] backdrop-blur">
          <Link
            href="/account"
            className={`flex min-w-[52px] flex-col items-center gap-0.5 rounded-xl px-1.5 py-1 text-[10px] ${
              pathname === '/account' || pathname === '/profile' ? 'bg-[linear-gradient(180deg,rgba(46,91,255,0.28),rgba(126,87,255,0.2))] text-[#f3c96b]' : 'text-slate-300'
            }`}
          >
            <User className="h-4 w-4" />
            <span>{mobileCopy.accountTab}</span>
          </Link>

          <Link
            href="/my-favorites"
            className={`flex min-w-[52px] flex-col items-center gap-0.5 rounded-xl px-1.5 py-1 text-[10px] ${
              pathname === '/my-favorites' ? 'bg-[linear-gradient(180deg,rgba(46,91,255,0.28),rgba(126,87,255,0.2))] text-[#f3c96b]' : 'text-slate-300'
            }`}
          >
            <Heart className="h-4 w-4" />
            <span>{favoritesLabel}</span>
          </Link>

          <Link
            href="/notifications"
            className={`relative flex min-w-[52px] flex-col items-center gap-0.5 rounded-xl px-1.5 py-1 text-[10px] ${
              pathname === '/notifications' ? 'bg-[linear-gradient(180deg,rgba(46,91,255,0.28),rgba(126,87,255,0.2))] text-[#f3c96b]' : 'text-slate-300'
            }`}
          >
            <Bell className="h-4 w-4" />
            <span>{mobileCopy.notifications}</span>
            <span className="absolute right-2.5 top-0.5 h-2 w-2 rounded-full bg-red-500" />
          </Link>

          <Link
            href="/"
            className={`flex min-w-[52px] flex-col items-center gap-0.5 rounded-xl px-1.5 py-1 text-[10px] ${
              pathname === '/' ? 'bg-[linear-gradient(180deg,rgba(46,91,255,0.28),rgba(126,87,255,0.2))] text-[#f3c96b]' : 'text-slate-300'
            }`}
          >
            <Home className="h-4 w-4" />
            <span>{t('sidebar.home')}</span>
          </Link>

          <button
            type="button"
            onClick={() => setIsMenuOpen(true)}
            className={`flex min-w-[52px] flex-col items-center gap-0.5 rounded-xl px-1.5 py-1 text-[10px] ${
              isMenuOpen ? 'bg-[linear-gradient(180deg,rgba(46,91,255,0.28),rgba(126,87,255,0.2))] text-[#f3c96b]' : 'text-slate-300'
            }`}
          >
            <Menu className="h-4 w-4" />
            <span>{mobileCopy.menu}</span>
          </button>
        </div>
      </nav>
    </>
  )
}
