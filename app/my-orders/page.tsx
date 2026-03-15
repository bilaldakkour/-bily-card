'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import OrderDetailsModal, { type OrderDetailsItem } from '@/components/shared/OrderDetailsModal'
import OrderSummaryCard from '@/components/shared/OrderSummaryCard'
import {
  MobileEmptyState,
  MobileMetricTile,
  MobilePanel,
  MobileSectionHeading,
  mobileInputClass,
  mobilePrimaryButtonClass,
} from '@/components/shared/MobileDesignSystem'
import UserPageLayout from '@/components/shared/UserPageLayout'
import { useLanguage } from '@/hooks/useLanguage'

export default function MyOrdersPage() {
  const { language } = useLanguage()
  const router = useRouter()
  const [orders, setOrders] = useState<OrderDetailsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
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
      .then(async (res) => {
        if (res.status === 401 || res.status === 403) {
          router.push('/login')
          return null
        }
        return res.json()
      })
      .then((data) => {
        if (data?.success && Array.isArray(data.data)) {
          setOrders(data.data)
        }
      })
      .catch(() => {
        setOrders([])
      })
      .finally(() => {
        setLoading(false)
      })
  }, [router])

  const completedOrders = orders.filter((order) => order.status === 'completed').length

  const filteredOrders = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    if (!query) return orders

    return orders.filter((order) =>
      [order.orderId, order.productName, order.playerId, order.status, String(order.total)]
        .join(' ')
        .toLowerCase()
        .includes(query)
    )
  }, [orders, searchTerm])

  const pageCopy = {
    ar: {
      title: 'طلباتي',
      subtitle: 'تتبع وراجع مشترياتك الأخيرة من مكان واحد.',
      breadcrumbHome: 'الرئيسية',
      headingEyebrow: 'سجل المشتريات',
      headingTitle: 'طلباتك الأخيرة',
      headingDescription: 'كل طلب صار أوضح وأسهل للمراجعة على شاشة الهاتف.',
      ordersLabel: 'الطلبات',
      completedLabel: 'المكتمل',
      searchPlaceholder: 'ابحث بالطلب أو المنتج أو رقم الحساب...',
      loading: 'جاري تحميل طلباتك...',
      emptyTitle: 'لا يوجد طلبات بعد',
      emptyDescription: 'عندما تشتري أي منتج ستظهر الطلبات هنا بشكل منظم وواضح.',
      browseProducts: 'تصفح المنتجات',
      noResultsTitle: 'لا يوجد نتائج',
      noResultsDescription: 'جرّب كلمة بحث مختلفة أو امسح الفلتر الحالي.',
    },
    en: {
      title: 'My Orders',
      subtitle: 'Track and review your recent purchases in one place.',
      breadcrumbHome: 'Home',
      headingEyebrow: 'Purchase History',
      headingTitle: 'Your Latest Orders',
      headingDescription: 'Every order is easier to review in a layout tuned for mobile.',
      ordersLabel: 'Orders',
      completedLabel: 'Completed',
      searchPlaceholder: 'Search by order, product, or account ID...',
      loading: 'Loading your orders...',
      emptyTitle: 'No orders yet',
      emptyDescription: 'When you buy any product, your orders will appear here in a clear layout.',
      browseProducts: 'Browse Products',
      noResultsTitle: 'No results',
      noResultsDescription: 'Try a different search term or clear the current filter.',
    },
    fr: {
      title: 'Mes commandes',
      subtitle: 'Suivez et consultez vos achats recents au meme endroit.',
      breadcrumbHome: 'Accueil',
      headingEyebrow: 'Historique des achats',
      headingTitle: 'Vos dernieres commandes',
      headingDescription: 'Chaque commande est plus simple a consulter dans une vue adaptee au mobile.',
      ordersLabel: 'Commandes',
      completedLabel: 'Terminees',
      searchPlaceholder: 'Rechercher par commande, produit ou ID de compte...',
      loading: 'Chargement de vos commandes...',
      emptyTitle: 'Aucune commande pour le moment',
      emptyDescription: 'Lorsque vous achetez un produit, vos commandes apparaitront ici clairement.',
      browseProducts: 'Voir les produits',
      noResultsTitle: 'Aucun resultat',
      noResultsDescription: 'Essayez un autre terme de recherche ou effacez le filtre actuel.',
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
      showHeader={false}
      fixedSidebarDesktop
      maxWidthClass="max-w-[1720px]"
      fixedSidebarRightClass="lg:right-6"
    >
      <MobilePanel>
        <MobileSectionHeading
          eyebrow={pageCopy.headingEyebrow}
          title={pageCopy.headingTitle}
          description={pageCopy.headingDescription}
        />

        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <MobileMetricTile label={pageCopy.ordersLabel} value={orders.length} />
          <MobileMetricTile
            label={pageCopy.completedLabel}
            value={<span className="text-emerald-200">{completedOrders}</span>}
            className="border-emerald-400/15 bg-emerald-500/10"
          />
        </div>

        <label className="relative mt-4 block">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder={pageCopy.searchPlaceholder}
            className={`${mobileInputClass} pl-10`}
          />
        </label>
      </MobilePanel>

      {loading ? (
        <MobilePanel className="px-5 py-8 text-center" tone="soft">
          <p className="text-slate-300">{pageCopy.loading}</p>
        </MobilePanel>
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
      ) : filteredOrders.length === 0 ? (
        <MobileEmptyState
          title={pageCopy.noResultsTitle}
          description={pageCopy.noResultsDescription}
        />
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => (
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
