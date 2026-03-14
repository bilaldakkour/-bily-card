'use client'

import { useEffect, useMemo, useState } from 'react'
import { Bell, CheckCircle2, RefreshCw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import {
  MobileEmptyState,
  MobilePanel,
  MobileSectionHeading,
  mobileSecondaryButtonClass,
} from '@/components/shared/MobileDesignSystem'
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
      const transactions = Array.isArray(txData?.transactions)
        ? (txData.transactions as TransactionItem[])
        : []

      const nextNotifications: NotificationItem[] = [
        ...orders.slice(0, 12).map((order, index) => ({
          id: order._id || `order-${index}`,
          title:
            String(order.status || '').toLowerCase() === 'completed'
              ? `تم إكمال طلبك ${order.productName || ''} بنجاح`
              : `تم تحديث حالة طلبك ${order.productName || ''}`,
          time: order.createdAt || new Date().toISOString(),
        })),
        ...transactions
          .filter((txn) => String(txn.type || '').toLowerCase() === 'deposit')
          .slice(0, 8)
          .map((txn, index) => ({
            id: txn._id || `txn-${index}`,
            title: `تم تسجيل دفعة ${Number(txn.amount || 0).toFixed(2)} ${txn.currency || 'USD'} في حسابك`,
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
      title="Notifications"
      mobileTitle="الإشعارات"
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
      <MobilePanel tone="danger">
        <MobileSectionHeading
          eyebrow="Live Updates"
          title="الإشعارات"
          description="آخر تحديثات الطلبات والدفعات بحلة أوضح وأنسب للموبايل."
          action={
            <button
              type="button"
              onClick={() => void loadNotifications()}
              className={mobileSecondaryButtonClass}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              تحديث
            </button>
          }
        />

        <div className="mt-4 grid grid-cols-3 gap-2.5">
          <div className="rounded-[18px] border border-cyan-400/16 bg-cyan-500/10 px-3 py-3 text-center text-sm font-semibold text-cyan-100">
            الجميع
          </div>
          <div className="rounded-[18px] border border-white/8 bg-white/[0.04] px-3 py-3 text-center text-sm font-medium text-slate-200">
            غير المقروءة
          </div>
          <div className="rounded-[18px] border border-white/8 bg-white/[0.04] px-3 py-3 text-center text-sm font-medium text-slate-200">
            المقروءة
          </div>
        </div>
      </MobilePanel>

      {loading ? (
        <MobilePanel className="px-5 py-8 text-center" tone="soft">
          <p className="text-slate-300">جارٍ تحميل الإشعارات...</p>
        </MobilePanel>
      ) : formattedNotifications.length === 0 ? (
        <MobileEmptyState
          title="لا يوجد إشعارات بعد"
          description="عندما يصدر تحديث جديد على طلباتك أو دفعاتك سيظهر هنا."
        />
      ) : (
        <div className="space-y-3">
          {formattedNotifications.map((item) => (
            <MobilePanel
              key={item.id}
              tone="soft"
              className="flex items-center justify-between gap-3 px-3.5 py-4"
            >
              <div className="flex h-11 w-1.5 shrink-0 rounded-full bg-gradient-to-b from-cyan-300 to-rose-300" />
              <div className="min-w-0 flex-1 text-right">
                <p className="text-sm leading-6 text-white sm:text-base">{item.title}</p>
                <p className="mt-1.5 text-xs text-slate-400">{item.timeLabel}</p>
              </div>
              <Bell className="h-5 w-5 shrink-0 text-rose-200" />
            </MobilePanel>
          ))}
        </div>
      )}

      {!loading && formattedNotifications.length > 0 ? (
        <MobilePanel className="flex items-center justify-center gap-2 px-4 py-3 text-cyan-200" tone="accent">
          <CheckCircle2 className="h-4 w-4" />
          <span>تم تحميل آخر الإشعارات بنجاح</span>
        </MobilePanel>
      ) : null}
    </UserPageLayout>
  )
}
