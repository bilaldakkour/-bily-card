'use client'

import { ProductCard } from './ProductCard'
import { EmptyState } from './EmptyState'
import type { ProductListItem } from '@/lib/data'

interface ProductGridProps {
  products: ProductListItem[];
  loading?: boolean;
  emptyMessage?: {
    title: string;
    description: string;
  };
  onProductSelect?: (product: ProductListItem) => void;
}

export function ProductGrid({ products, loading, emptyMessage, onProductSelect }: ProductGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-[10.15rem] rounded-[15px] border border-white/10 bg-gradient-to-br from-slate-900/50 to-slate-950/50 animate-pulse backdrop-blur-sm sm:h-[10.8rem] sm:rounded-[16px]">
            <div className="h-[3.95rem] rounded-t-[15px] bg-gradient-to-br from-slate-800 to-slate-900 sm:h-[4.4rem] sm:rounded-t-[16px]"></div>
            <div className="space-y-1 p-1.5">
              <div className="h-3 bg-slate-800 rounded-full w-1/3"></div>
              <div className="h-3 bg-slate-800 rounded w-4/5"></div>
              <div className="flex justify-between items-center pt-1">
                <div className="h-4 bg-slate-800 rounded w-1/4"></div>
                <div className="h-5 bg-slate-800 rounded-lg w-12"></div>
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
        title={emptyMessage?.title || 'لا توجد منتجات حالياً'}
        description={emptyMessage?.description || 'جرّب تعديل البحث أو الفلاتر.'}
        action={{
          label: 'تصفح كل المنتجات',
          href: '/products'
        }}
      />
    )
  }

  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} onProductSelect={onProductSelect} />
      ))}
    </div>
  )
}
