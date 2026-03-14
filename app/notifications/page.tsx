'use client'

import { useEffect, useMemo, useState } from 'react'
import { Bell, CheckCircle2, RefreshCw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import UserPageLayout from '@/components/shared/UserPageLayout'

type OrderItem = {
  _id?: string
  orderId?: string
  productName?: string
  status?: string
  createdAt?: string
}

type TransactionItem = {
  _id?: string
  type?: string
  amount?: number
  currency?: string
  description?: string
  createdAt?: string
}

type NotificationItem = {
  id: string
  title: string
  time: string
}

export default function NotificationsPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)

  const loadNotifications = async () => {
    const token = localStorage.getItem('bilycard_token')
    if (!token) {
      router.push('/login')
      return
    }

    try {
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
      const orders = Array.isArray(ordersData?.data) ? (ordersData.data as OrderItem[]) : []
      const txs = Array.isArray(txData?.transactions) ? (txData.transactions as TransactionItem[]) : []

      const nextNotifications: NotificationItem[] = [
        ...orders.slice(0, 12).map((order, index) => ({
          id: order._id || `order-${index}`,
          title:
            String(order.status || '').toLowerCase() === 'completed'
              ? `تم إكمال طلبك ${order.productName || ''} بنجاح`
              : `تم تحديث طلبك ${order.productName || ''}`,
          time: order.createdAt || new Date().toISOString(),
        })),
        ...txs
          .filter((txn) => String(txn.type || '').toLowerCase() === 'deposit')
          .slice(0, 8)
          .map((txn, index) => ({
            id: txn._id || `txn-${index}`,
            title: `تم قبول دفعتك ${Number(txn.amount || 0).toFixed(2)} ${txn.currency || 'USD'} بنجاح`,
            time: txn.createdAt || new Date().toISOString(),
          })),
      ]
        .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
        .slice(0, 20)

      setNotifications(nextNotifications)
    } catch {
      setNotifications([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadNotifications()
  }, [])

  const count = notifications.length
  const formattedNotifications = useMemo(
    () =>
      notifications.map((item) => ({
        ...item,
        timeLabel: new Date(item.time).toLocaleString(),
      })),
    [notifications]
  )

  return (
    <UserPageLayout
      title="الإشعارات"
      subtitle="Latest account and order updates."
      breadcrumbs={[
        { label: 'Home', href: '/' },
        { label: 'Notifications', href: '/notifications' },
      ]}
      showHeader={false}
      fixedSidebarDesktop
      maxWidthClass="max-w-[1720px]"
      fixedSidebarRightClass="lg:right-6"
    >
      <div className="rounded-[24px] border border-rose-300/10 bg-[linear-gradient(180deg,rgba(10,17,30,0.98),rgba(23,22,35,0.95))] p-3.5 shadow-[0_24px_70px_rgba(2,6,23,0.22)] sm:rounded-[30px] sm:p-5">
        <div className="mb-3 flex items-center justify-between sm:mb-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => void loadNotifications()}
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-400/14 bg-cyan-500/10 text-cyan-200"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <div className="flex h-7 min-w-7 items-center justify-center rounded-full bg-gradient-to-r from-sky-400 to-rose-400 px-2 text-xs font-bold text-slate-950 sm:h-8 sm:min-w-8 sm:text-sm">
              {count}
            </div>
          </div>
          <h2 className="text-right text-3xl font-black text-white">الإشعارات</h2>
        </div>

        <div className="mb-4 grid gap-2 sm:grid-cols-3 sm:gap-3">
          <div className="rounded-[18px] border border-cyan-400/12 bg-cyan-500/10 px-3 py-3 text-center text-sm font-medium text-cyan-100 sm:rounded-2xl sm:px-4 sm:py-4 sm:text-lg">
            جميع الإشعارات
          </div>
          <div className="rounded-[18px] border border-white/8 bg-white/[0.04] px-3 py-3 text-center text-sm font-medium text-slate-200 sm:rounded-2xl sm:px-4 sm:py-4 sm:text-lg">
            غير المقروءة فقط
          </div>
          <div className="rounded-[18px] border border-white/8 bg-white/[0.04] px-3 py-3 text-center text-sm font-medium text-slate-200 sm:rounded-2xl sm:px-4 sm:py-4 sm:text-lg">
            المقروءة فقط
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl bg-white/[0.04] p-8 text-center text-slate-400">
            جاري تحميل الإشعارات...
          </div>
        ) : formattedNotifications.length === 0 ? (
          <div className="rounded-2xl bg-white/[0.04] p-8 text-center text-slate-400">
            لا توجد إشعارات بعد.
          </div>
        ) : (
          <div className="space-y-3">
            {formattedNotifications.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-[20px] border border-rose-300/10 bg-[linear-gradient(180deg,rgba(36,33,42,0.96),rgba(24,25,37,0.96))] px-3.5 py-4 shadow-[0_14px_34px_rgba(2,6,23,0.16)] sm:rounded-[24px] sm:px-4 sm:py-5"
              >
                <div className="flex h-10 w-1.5 shrink-0 rounded-full bg-gradient-to-b from-sky-400 to-rose-400 sm:h-12 sm:w-2" />
                <div className="min-w-0 flex-1 text-right">
                  <p className="text-sm text-white sm:text-lg">{item.title}</p>
                  <p className="mt-1.5 text-xs text-slate-400 sm:mt-2 sm:text-sm">{item.timeLabel}</p>
                </div>
                <Bell className="h-5 w-5 shrink-0 text-rose-300 sm:h-6 sm:w-6" />
              </div>
            ))}
          </div>
        )}

        {!loading && formattedNotifications.length > 0 && (
          <div className="mt-5 flex items-center justify-center gap-2 rounded-2xl border border-cyan-400/18 bg-cyan-500/10 px-4 py-3 text-cyan-200">
            <CheckCircle2 className="h-4 w-4" />
            <span>تم تحميل آخر الإشعارات بنجاح</span>
          </div>
        )}
      </div>
    </UserPageLayout>
  )
}
