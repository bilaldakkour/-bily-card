import { ProductCard } from './ProductCard'
import { EmptyState } from './EmptyState'
import type { Product } from '@/lib/data'

interface ProductGridProps {
  products: Product[];
  loading?: boolean;
  emptyMessage?: {
    title: string;
    description: string;
  };
}

export function ProductGrid({ products, loading, emptyMessage }: ProductGridProps) {
  if (loading) {
    return (
      <div className="grid gap-8 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="rounded-3xl bg-gradient-to-br from-slate-900/50 to-slate-950/50 border border-white/10 h-96 animate-pulse backdrop-blur-sm">
            <div className="h-56 bg-gradient-to-br from-slate-800 to-slate-900 rounded-t-3xl"></div>
            <div className="p-6 space-y-4">
              <div className="h-3 bg-slate-800 rounded-full w-1/3"></div>
              <div className="h-5 bg-slate-800 rounded w-4/5"></div>
              <div className="h-4 bg-slate-800 rounded w-2/3"></div>
              <div className="flex justify-between items-center pt-2">
                <div className="h-6 bg-slate-800 rounded w-1/4"></div>
                <div className="h-8 bg-slate-800 rounded-xl w-20"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <EmptyState
        title={emptyMessage?.title || "No products found"}
        description={emptyMessage?.description || "Try adjusting your search or filters."}
        action={{
          label: "Browse All Products",
          href: "/products"
        }}
      />
    )
  }

  return (
    <div className="grid gap-8 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  )
}