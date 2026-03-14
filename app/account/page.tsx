'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LogoutButton } from '@/components/shared'
import UserPageLayout from '@/components/shared/UserPageLayout'
import { useLanguage } from '@/hooks/useLanguage'

interface WalletBalance {
  usd: number
  lbp: number
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

  const accountCards = [
    {
      label: t('account.name'),
      value: user.displayName,
      sublabel: t('account.email'),
      subvalue: user.email,
    },
    {
      label: t('account.walletUsd'),
      value: `$${user.walletBalance.usd.toFixed(2)}`,
      accent: 'text-emerald-300',
      action: (
        <Link
          href="/wallet"
          className="inline-flex rounded-2xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-black transition hover:bg-cyan-400"
        >
          {t('account.topUpWallet')}
        </Link>
      ),
    },
    {
      label: t('account.walletLbp'),
      value: `LBP ${user.walletBalance.lbp.toFixed(0)}`,
      accent: 'text-sky-300',
      sublabel: t('account.secondaryCurrency'),
      subvalue: user.role,
    },
  ]

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
        <div className="grid gap-3 md:grid-cols-3">
          {accountCards.map((card) => (
            <div
              key={card.label}
              className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,15,29,0.94),rgba(5,10,22,0.98))] p-4 shadow-[0_20px_56px_rgba(2,6,23,0.2)]"
            >
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{card.label}</p>
              <p className={`mt-2 text-xl font-bold text-white ${card.accent || ''}`}>{card.value}</p>
              {card.sublabel && (
                <p className="mt-3 text-xs uppercase tracking-[0.16em] text-slate-500">{card.sublabel}</p>
              )}
              {card.subvalue && (
                <p className="mt-1 break-all text-sm text-slate-300">{card.subvalue}</p>
              )}
              {card.action && <div className="mt-4">{card.action}</div>}
            </div>
          ))}
        </div>

        <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,15,29,0.94),rgba(5,10,22,0.98))] p-4 shadow-[0_24px_70px_rgba(2,6,23,0.22)] sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-300">
                Recent Activity
              </p>
              <h2 className="mt-1 text-xl font-semibold text-white">{t('account.recentOrders')}</h2>
            </div>
            <Link
              href="/orders"
              className="rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              {t('account.viewAll')}
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <div className="rounded-[24px] border border-white/10 bg-white/[0.035] p-8 text-center">
              <p className="text-slate-400">{t('account.noOrders')}</p>
              <Link
                href="/products"
                className="mt-4 inline-block rounded-xl bg-cyan-500 px-6 py-2.5 font-medium text-black transition hover:bg-cyan-400"
              >
                {t('account.browseProducts')}
              </Link>
            </div>
          ) : (
            <div className="space-y-2.5">
              {recentOrders.map((order) => (
                <div
                  key={order._id}
                  className="grid gap-3 rounded-[22px] border border-white/8 bg-white/[0.035] p-4 md:grid-cols-[minmax(0,1.5fr)_repeat(3,minmax(0,1fr))]"
                >
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{t('orders.product')}</p>
                    <p className="mt-1 truncate text-sm font-semibold text-white">{order.productName}</p>
                    <p className="mt-2 inline-flex rounded-xl border border-cyan-400/25 bg-cyan-500/10 px-2.5 py-1 font-mono text-[11px] text-cyan-300">
                      {order.orderId}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{t('orders.playerId')}</p>
                    <p className="mt-1 truncate font-mono text-sm text-slate-300">{order.playerId}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{t('orders.price')}</p>
                    <p className="mt-1 text-sm font-semibold text-emerald-300">${Number(order.total ?? order.price).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{t('orders.date')}</p>
                    <p className="mt-1 text-sm text-slate-300">{new Date(order.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href="/products"
            className="rounded-[24px] border border-cyan-400/15 bg-cyan-500/10 px-5 py-4 text-center text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/15"
          >
            {t('account.continueShopping')}
          </Link>
          <LogoutButton />
        </div>
      </UserPageLayout>
    </div>
  )
}
