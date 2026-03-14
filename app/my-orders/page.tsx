'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
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

interface OrderItem {
  _id: string
  orderId: string
  productName: string
  playerId: string
  quantity: number
  price: number
  total: number
  walletBalanceBefore?: number
  walletBalanceAfter?: number
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'rejected'
  createdAt: string
}

export default function MyOrdersPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<OrderItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

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

  return (
    <UserPageLayout
      title="My Orders"
      mobileTitle="طلباتي"
      subtitle="Track and review your recent purchases in one place."
      breadcrumbs={[
        { label: 'Home', href: '/' },
        { label: 'My Orders', href: '/my-orders' },
      ]}
      showHeader={false}
      fixedSidebarDesktop
      maxWidthClass="max-w-[1720px]"
      fixedSidebarRightClass="lg:right-6"
    >
      <MobilePanel>
        <MobileSectionHeading
          eyebrow="Purchase History"
          title="طلباتك الأخيرة"
          description="كل طلب صار أوضح وأسهل للمراجعة على شاشة الهاتف."
        />

        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <MobileMetricTile label="Orders" value={orders.length} />
          <MobileMetricTile
            label="Completed"
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
            placeholder="ابحث بالطلب أو المنتج أو رقم الحساب..."
            className={`${mobileInputClass} pl-10`}
          />
        </label>
      </MobilePanel>

      {loading ? (
        <MobilePanel className="px-5 py-8 text-center" tone="soft">
          <p className="text-slate-300">Loading your orders...</p>
        </MobilePanel>
      ) : orders.length === 0 ? (
        <MobileEmptyState
          title="لا يوجد طلبات بعد"
          description="عندما تشتري أي منتج ستظهر الطلبات هنا بشكل منظم وواضح."
          action={
            <Link href="/products" className={mobilePrimaryButtonClass}>
              تصفح المنتجات
            </Link>
          }
        />
      ) : filteredOrders.length === 0 ? (
        <MobileEmptyState
          title="لا يوجد نتائج"
          description="جرّب كلمة بحث مختلفة أو امسح الفلتر الحالي."
        />
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => (
            <OrderSummaryCard key={order._id} order={order} />
          ))}
        </div>
      )}
    </UserPageLayout>
  )
}
