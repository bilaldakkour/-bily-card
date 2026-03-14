'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LogoutButton } from '@/components/shared'
import UserPageLayout from '@/components/shared/UserPageLayout'
import {
  MobileMetricTile,
  MobilePanel,
  MobileSectionHeading,
  mobilePrimaryButtonClass,
} from '@/components/shared/MobileDesignSystem'
import { CopyButton } from '@/components/ui/CopyButton'
import { useLanguage } from '@/hooks/useLanguage'

interface WalletBalance {
  usd: number
}

interface Order {
  _id: string
  orderId: string
  productName: string
  playerId: string
  price: number
  total?: number
  walletBalanceBefore?: number
  walletBalanceAfter?: number
  status: string
  createdAt: string
}

interface UserData {
  displayName: string
  email: string
  walletBalance: WalletBalance
  role: string
}

export default function AccountPage() {
  const { t, isRTL } = useLanguage()
  const router = useRouter()
  const [user, setUser] = useState<UserData | null>(null)
  const [recentOrders, setRecentOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('bilycard_token')
    if (!token) {
      router.push('/login')
      return
    }

    Promise.all([
      fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }).then((res) => res.json()),
      fetch('/api/orders', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }).then((res) => res.json()),
    ])
      .then(([userData, ordersData]) => {
        if (userData.success) {
          setUser(userData.data)
        } else {
          router.push('/login')
        }

        if (ordersData.success && ordersData.data) {
          setRecentOrders(ordersData.data.slice(0, 5))
        }
      })
      .catch(() => {
        router.push('/login')
      })
      .finally(() => setLoading(false))
  }, [router])

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="text-white">{t('account.loading')}</div>
      </main>
    )
  }

  if (!user) return null

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'}>
      <UserPageLayout
        title={t('account.title')}
        mobileTitle="حسابي"
        subtitle={t('account.subtitle')}
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: t('account.title'), href: '/account' },
        ]}
      >
        <MobilePanel>
          <MobileSectionHeading
            eyebrow="Account Overview"
            title="لوحة الحساب"
            description="ملخص سريع لحسابك ورصيدك وآخر نشاطاتك."
            action={
              <Link href="/wallet" className={mobilePrimaryButtonClass}>
                {t('account.topUpWallet')}
              </Link>
            }
          />

          <div className="mt-4 grid gap-2.5 md:grid-cols-3">
            <MobileMetricTile label={t('account.name')} value={user.displayName} hint={user.email} />
            <MobileMetricTile label={t('account.walletUsd')} value={`$${user.walletBalance.usd.toFixed(2)}`} />
            <MobileMetricTile label="Role" value={user.role} hint="USD only wallet" />
          </div>
        </MobilePanel>

        <MobilePanel tone="soft">
          <MobileSectionHeading
            eyebrow="Recent Activity"
            title={t('account.recentOrders')}
            description="طلباتك الأحدث ضمن عرض مختصر ومناسب للتلفون."
            action={
              <Link
                href="/orders"
                className="rounded-[18px] border border-white/12 bg-white/[0.05] px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/[0.08] sm:px-4 sm:text-sm"
              >
                {t('account.viewAll')}
              </Link>
            }
          />

          {recentOrders.length === 0 ? (
            <div className="mt-4 rounded-[20px] border border-white/10 bg-white/[0.04] p-6 text-center">
              <p className="text-slate-400">{t('account.noOrders')}</p>
              <Link href="/products" className={`mt-4 ${mobilePrimaryButtonClass}`}>
                {t('account.browseProducts')}
              </Link>
            </div>
          ) : (
            <div className="mt-4 space-y-2.5">
              {recentOrders.map((order) => (
                <div
                  key={order._id}
                  className="grid gap-2.5 rounded-[20px] border border-white/10 bg-white/[0.04] p-3.5 md:grid-cols-[minmax(0,1.5fr)_repeat(3,minmax(0,1fr))]"
                >
                  <div className="min-w-0 text-right">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">{t('orders.product')}</p>
                    <p className="mt-1 truncate text-sm font-semibold text-white">{order.productName}</p>
                    <span className="mt-2 inline-flex items-center gap-1 rounded-full border border-cyan-400/18 bg-cyan-500/10 px-2 py-1 font-mono text-[10px] text-cyan-200">
                      {order.orderId}
                      <CopyButton
                        value={order.orderId}
                        label="Copy order ID"
                        className="h-5 w-5 border-transparent bg-transparent text-cyan-200 hover:border-cyan-400/20 hover:bg-cyan-500/10"
                      />
                    </span>
                  </div>

                  <div className="text-right">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">{t('orders.playerId')}</p>
                    <div className="mt-1 flex items-center justify-end gap-1">
                      {order.playerId ? (
                        <CopyButton
                          value={order.playerId}
                          label="Copy player ID"
                          className="h-5 w-5 border-transparent bg-transparent text-slate-300 hover:border-cyan-400/20 hover:bg-cyan-500/10 hover:text-cyan-200"
                        />
                      ) : null}
                      <p className="truncate font-mono text-xs text-slate-300">{order.playerId}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">{t('orders.price')}</p>
                    <p className="mt-1 text-sm font-semibold text-emerald-300">${Number(order.total ?? order.price).toFixed(2)}</p>
                  </div>

                  <div className="text-right">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">{t('orders.date')}</p>
                    <p className="mt-1 text-sm text-slate-300">{new Date(order.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </MobilePanel>

        <div className="grid gap-2.5 sm:grid-cols-2">
          <Link
            href="/products"
            className="inline-flex items-center justify-center rounded-[18px] border border-cyan-400/16 bg-cyan-500/10 px-4 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/16"
          >
            {t('account.continueShopping')}
          </Link>
          <LogoutButton />
        </div>
      </UserPageLayout>
    </div>
  )
}
