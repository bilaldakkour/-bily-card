'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LogoutButton } from '@/components/shared'
import OrderSummaryCard from '@/components/shared/OrderSummaryCard'
import UserPageLayout from '@/components/shared/UserPageLayout'
import { useLanguage } from '@/hooks/useLanguage'
import { fetchUserActivitySnapshot } from '@/lib/utils/authClient'
import type { OrderDetailsItem } from '@/components/shared/OrderDetailsModal'

const OrderDetailsModal = dynamic(() => import('@/components/shared/OrderDetailsModal'), {
  ssr: false,
})

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

    fetchUserActivitySnapshot(token)
      .then((data) => {
        if (Array.isArray(data?.orders)) {
          setOrders(data.orders as OrderDetailsItem[])
        }
      })
      .catch(() => {
        console.error(t('orders.failedFetch'))
        if (!localStorage.getItem('bilycard_token')) {
          router.push('/login')
        }
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
        subtitle="راجع كل طلباتك ضمن عرض مختصر وواضح."
        breadcrumbs={[
          { label: 'الرئيسية', href: '/' },
          { label: t('orders.title'), href: '/orders' },
        ]}
        action={
          <Link
            href="/account"
            className="rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/10"
          >
            {t('orders.backToAccount')}
          </Link>
        }
      >
        {orders.length === 0 ? (
          <div className="rounded-[20px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,15,29,0.94),rgba(5,10,22,0.98))] p-4 text-center shadow-[0_16px_40px_rgba(2,6,23,0.2)]">
            <p className="mb-3 text-sm text-slate-400">{t('orders.noOrders')}</p>
            <Link
              href="/products"
              className="inline-block rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-black transition hover:bg-cyan-400"
            >
              {t('orders.browseProducts')}
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
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
