import Link from 'next/link'
import { PageHeader } from '@/components/ui/PageHeader'

export default function MyOrdersPage() {
  return (
    <div className="min-h-screen">
      <PageHeader
        title="My Orders"
        subtitle="Track and review your recent purchases in one place."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'My Orders', href: '/my-orders' },
        ]}
      />

      <div className="mx-auto max-w-4xl px-6 py-12">
        <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-10 text-center">
          <h2 className="mb-4 text-2xl font-semibold text-white">
            No orders found yet
          </h2>

          <p className="mb-6 text-slate-400">
            When you purchase a product, your orders will appear here.
          </p>

          <Link
            href="/products"
            className="inline-block rounded-xl bg-cyan-500 px-6 py-3 font-semibold text-black transition-colors hover:bg-cyan-400"
          >
            Browse Products
          </Link>
        </div>
      </div>
    </div>
  )
}