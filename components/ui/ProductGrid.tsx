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
  onProductSelect?: (product: Product) => void;
}

export function ProductGrid({ products, loading, emptyMessage, onProductSelect }: ProductGridProps) {
  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-[22rem] rounded-[26px] border border-white/10 bg-gradient-to-br from-slate-900/50 to-slate-950/50 animate-pulse backdrop-blur-sm">
            <div className="h-44 rounded-t-[26px] bg-gradient-to-br from-slate-800 to-slate-900"></div>
            <div className="space-y-4 p-5">
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
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} onProductSelect={onProductSelect} />
      ))}
    </div>
  )
}
