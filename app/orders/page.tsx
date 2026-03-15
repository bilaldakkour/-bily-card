'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LogoutButton } from '@/components/shared'
import OrderDetailsModal, { type OrderDetailsItem } from '@/components/shared/OrderDetailsModal'
import OrderSummaryCard from '@/components/shared/OrderSummaryCard'
import UserPageLayout from '@/components/shared/UserPageLayout'
import { useLanguage } from '@/hooks/useLanguage'

export default function OrdersPage() {
  const { t, isRTL } = useLanguage()
  const router = useRouter()
  const [orders, setOrders] = useState<OrderDetailsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<OrderDetailsItem | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('bilycard_token')
    if (!token) {
      router.push('/login')
      return
    }

    fetch('/api/orders', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          setOrders(data.data)
        }
      })
      .catch(() => {
        console.error(t('orders.failedFetch'))
      })
      .finally(() => setLoading(false))
  }, [router, t])

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 p-6">
        <div className="mx-auto max-w-4xl">
          <div className="text-white">{t('orders.loading')}</div>
        </div>
      </main>
    )
  }

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'}>
      <UserPageLayout
        title={t('orders.title')}
        subtitle="Review all your orders in a cleaner, more compact layout."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: t('orders.title'), href: '/orders' },
        ]}
        action={
          <Link
            href="/account"
            className="rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            {t('orders.backToAccount')}
          </Link>
        }
      >
        {orders.length === 0 ? (
          <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,15,29,0.94),rgba(5,10,22,0.98))] p-8 text-center shadow-[0_24px_70px_rgba(2,6,23,0.22)]">
            <p className="mb-4 text-slate-400">{t('orders.noOrders')}</p>
            <Link
              href="/products"
              className="inline-block rounded-xl bg-cyan-500 px-6 py-2.5 font-medium text-black transition hover:bg-cyan-400"
            >
              {t('orders.browseProducts')}
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <OrderSummaryCard key={order._id} order={order} onViewDetails={setSelectedOrder} />
            ))}
          </div>
        )}

        <div className="pt-2">
          <LogoutButton />
        </div>

        <OrderDetailsModal
          order={selectedOrder}
          open={Boolean(selectedOrder)}
          onClose={() => setSelectedOrder(null)}
        />
      </UserPageLayout>
    </div>
  )
}
