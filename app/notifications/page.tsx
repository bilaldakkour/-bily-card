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
import { useLanguage } from '@/hooks/useLanguage'
import { fetchUserActivitySnapshot } from '@/lib/utils/authClient'

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
  const { language } = useLanguage()
  const router = useRouter()
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const pageCopy = {
    ar: {
      title: 'الإشعارات',
      subtitle: 'آخر تحديثات الحساب والطلبات.',
      breadcrumbHome: 'الرئيسية',
      eyebrow: 'تحديثات مباشرة',
      description: 'آخر تحديثات الطلبات والدفعات بحلة أوضح وأنسب للموبايل.',
      refresh: 'تحديث',
      all: 'الجميع',
      unread: 'غير المقروءة',
      read: 'المقروءة',
      loading: 'جاري تحميل الإشعارات...',
      emptyTitle: 'لا يوجد إشعارات بعد',
      emptyDescription: 'عندما يصدر تحديث جديد على طلباتك أو دفعاتك سيظهر هنا.',
      loaded: 'تم تحميل آخر الإشعارات بنجاح',
      completedOrder: (name: string) => `تم إكمال طلبك ${name} بنجاح`,
      updatedOrder: (name: string) => `تم تحديث حالة طلبك ${name}`,
      depositRecorded: (amount: number, currency: string) =>
        `تم تسجيل دفعة ${amount.toFixed(2)} ${currency} في حسابك`,
    },
    en: {
      title: 'Notifications',
      subtitle: 'Latest account and order updates.',
      breadcrumbHome: 'Home',
      eyebrow: 'Live Updates',
      description: 'The latest order and deposit updates in a clearer mobile view.',
      refresh: 'Refresh',
      all: 'All',
      unread: 'Unread',
      read: 'Read',
      loading: 'Loading notifications...',
      emptyTitle: 'No notifications yet',
      emptyDescription: 'When a new update appears for your orders or deposits, it will show here.',
      loaded: 'Latest notifications loaded successfully',
      completedOrder: (name: string) => `Your ${name} order was completed successfully`,
      updatedOrder: (name: string) => `Your ${name} order status was updated`,
      depositRecorded: (amount: number, currency: string) =>
        `A deposit of ${amount.toFixed(2)} ${currency} was recorded on your account`,
    },
    fr: {
      title: 'Notifications',
      subtitle: 'Dernieres mises a jour du compte et des commandes.',
      breadcrumbHome: 'Accueil',
      eyebrow: 'Mises a jour en direct',
      description: 'Les dernieres mises a jour des commandes et depots dans une vue mobile plus claire.',
      refresh: 'Actualiser',
      all: 'Toutes',
      unread: 'Non lues',
      read: 'Lues',
      loading: 'Chargement des notifications...',
      emptyTitle: 'Aucune notification pour le moment',
      emptyDescription: 'Lorsqu une nouvelle mise a jour apparait pour vos commandes ou depots, elle sera affichee ici.',
      loaded: 'Les dernieres notifications ont ete chargees avec succes',
      completedOrder: (name: string) => `Votre commande ${name} a ete terminee avec succes`,
      updatedOrder: (name: string) => `Le statut de votre commande ${name} a ete mis a jour`,
      depositRecorded: (amount: number, currency: string) =>
        `Un depot de ${amount.toFixed(2)} ${currency} a ete enregistre sur votre compte`,
    },
  }[language]

  const loadNotifications = async (force = false) => {
    const token = localStorage.getItem('bilycard_token')
    if (!token) {
      router.push('/login')
      return
    }

    try {
      const snapshot = await fetchUserActivitySnapshot(token, force)
      const orders = Array.isArray(snapshot?.orders) ? (snapshot.orders as OrderItem[]) : []
      const transactions = Array.isArray(snapshot?.transactions)
        ? (snapshot.transactions as TransactionItem[])
        : []

      const nextNotifications: NotificationItem[] = [
        ...orders.slice(0, 12).map((order, index) => ({
          id: order._id || `order-${index}`,
          title:
            String(order.status || '').toLowerCase() === 'completed'
              ? pageCopy.completedOrder(order.productName || '')
              : pageCopy.updatedOrder(order.productName || ''),
          time: order.createdAt || new Date().toISOString(),
        })),
        ...transactions
          .filter((txn) => String(txn.type || '').toLowerCase() === 'deposit')
          .slice(0, 8)
          .map((txn, index) => ({
            id: txn._id || `txn-${index}`,
            title: pageCopy.depositRecorded(Number(txn.amount || 0), txn.currency || 'USD'),
            time: txn.createdAt || new Date().toISOString(),
          })),
      ]
        .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
        .slice(0, 20)

      setNotifications(nextNotifications)
    } catch {
      setNotifications([])
      if (!localStorage.getItem('bilycard_token')) {
        router.push('/login')
      }
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
      title={pageCopy.title}
      mobileTitle={pageCopy.title}
      subtitle={pageCopy.subtitle}
      breadcrumbs={[
        { label: pageCopy.breadcrumbHome, href: '/' },
        { label: pageCopy.title, href: '/notifications' },
      ]}
      showHeader={false}
      fixedSidebarDesktop
      maxWidthClass="max-w-[1720px]"
      fixedSidebarRightClass="lg:right-6"
    >
      <MobilePanel tone="danger">
        <MobileSectionHeading
          eyebrow={pageCopy.eyebrow}
          title={pageCopy.title}
          description={pageCopy.description}
          action={
            <button
              type="button"
              onClick={() => void loadNotifications(true)}
              className={mobileSecondaryButtonClass}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              {pageCopy.refresh}
            </button>
          }
        />

        <div className="mt-4 grid grid-cols-3 gap-2.5">
          <div className="rounded-[18px] border border-cyan-400/16 bg-cyan-500/10 px-3 py-3 text-center text-sm font-semibold text-cyan-100">
            {pageCopy.all}
          </div>
          <div className="rounded-[18px] border border-white/8 bg-white/[0.04] px-3 py-3 text-center text-sm font-medium text-slate-200">
            {pageCopy.unread}
          </div>
          <div className="rounded-[18px] border border-white/8 bg-white/[0.04] px-3 py-3 text-center text-sm font-medium text-slate-200">
            {pageCopy.read}
          </div>
        </div>
      </MobilePanel>

      {loading ? (
        <MobilePanel className="px-5 py-8 text-center" tone="soft">
          <p className="text-slate-300">{pageCopy.loading}</p>
        </MobilePanel>
      ) : formattedNotifications.length === 0 ? (
        <MobileEmptyState
          title={pageCopy.emptyTitle}
          description={pageCopy.emptyDescription}
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
          <span>{pageCopy.loaded}</span>
        </MobilePanel>
      ) : null}
    </UserPageLayout>
  )
}
