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
      <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4 2xl:grid-cols-5">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-[12.5rem] rounded-[22px] border border-white/10 bg-gradient-to-br from-slate-900/50 to-slate-950/50 animate-pulse backdrop-blur-sm sm:h-[22rem] sm:rounded-[26px]">
            <div className="h-24 rounded-t-[22px] bg-gradient-to-br from-slate-800 to-slate-900 sm:h-44 sm:rounded-t-[26px]"></div>
            <div className="space-y-2 p-3 sm:space-y-4 sm:p-5">
              <div className="h-3 bg-slate-800 rounded-full w-1/3"></div>
              <div className="h-4 bg-slate-800 rounded w-4/5 sm:h-5"></div>
              <div className="h-3 bg-slate-800 rounded w-2/3 sm:h-4"></div>
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
      <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4 2xl:grid-cols-5">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} onProductSelect={onProductSelect} />
      ))}
    </div>
  )
}
