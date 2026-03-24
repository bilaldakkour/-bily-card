'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import OrderSummaryCard from '@/components/shared/OrderSummaryCard'
import { MobileEmptyState, mobilePrimaryButtonClass } from '@/components/shared/MobileDesignSystem'
import UserPageLayout from '@/components/shared/UserPageLayout'
import { useLanguage } from '@/hooks/useLanguage'
import { fetchUserActivitySnapshot } from '@/lib/utils/authClient'
import type { OrderDetailsItem } from '@/components/shared/OrderDetailsModal'

const OrderDetailsModal = dynamic(() => import('@/components/shared/OrderDetailsModal'), {
  ssr: false,
})

export default function MyOrdersPage() {
  const { language } = useLanguage()
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
        setOrders([])
        if (!localStorage.getItem('bilycard_token')) {
          router.push('/login')
        }
      })
      .finally(() => {
        setLoading(false)
      })
  }, [router])

  const pageCopy = {
    ar: {
      title: 'طلباتي',
      subtitle: 'تابع وراجع مشترياتك الأخيرة من مكان واحد.',
      breadcrumbHome: 'الرئيسية',
      loading: 'جارٍ تحميل طلباتك...',
      emptyTitle: 'لا يوجد طلبات بعد',
      emptyDescription: 'عندما تشتري أي منتج ستظهر طلباتك هنا بشكل واضح.',
      browseProducts: 'تصفح المنتجات',
    },
    en: {
      title: 'My Orders',
      subtitle: 'Track your recent purchases in one compact view.',
      breadcrumbHome: 'Home',
      loading: 'Loading your orders...',
      emptyTitle: 'No orders yet',
      emptyDescription: 'When you buy any product, your orders will appear here in a clear layout.',
      browseProducts: 'Browse Products',
    },
    fr: {
      title: 'Mes commandes',
      subtitle: 'Suivez vos achats recents dans une vue compacte.',
      breadcrumbHome: 'Accueil',
      loading: 'Chargement de vos commandes...',
      emptyTitle: 'Aucune commande pour le moment',
      emptyDescription: 'Lorsque vous achetez un produit, vos commandes apparaitront ici clairement.',
      browseProducts: 'Voir les produits',
    },
  }[language]

  return (
    <UserPageLayout
      title={pageCopy.title}
      mobileTitle={pageCopy.title}
      subtitle={pageCopy.subtitle}
      breadcrumbs={[
        { label: pageCopy.breadcrumbHome, href: '/' },
        { label: pageCopy.title, href: '/my-orders' },
      ]}
      fixedSidebarDesktop
      maxWidthClass="max-w-[1720px]"
      fixedSidebarRightClass="lg:right-6"
    >
      {loading ? (
        <div className="rounded-[20px] border border-white/10 bg-[linear-gradient(180deg,rgba(9,18,34,0.94),rgba(16,22,38,0.94))] px-4 py-5 text-center shadow-[0_16px_40px_rgba(2,6,23,0.2)] ring-1 ring-white/[0.025]">
          <p className="text-slate-300">{pageCopy.loading}</p>
        </div>
      ) : orders.length === 0 ? (
        <MobileEmptyState
          title={pageCopy.emptyTitle}
          description={pageCopy.emptyDescription}
          action={
            <Link href="/products" className={mobilePrimaryButtonClass}>
              {pageCopy.browseProducts}
            </Link>
          }
        />
      ) : (
        <div className="space-y-2">
          {orders.map((order) => (
            <OrderSummaryCard key={order._id} order={order} onViewDetails={setSelectedOrder} />
          ))}
        </div>
      )}

      <OrderDetailsModal
        order={selectedOrder}
        open={Boolean(selectedOrder)}
        onClose={() => setSelectedOrder(null)}
      />
    </UserPageLayout>
  )
}
