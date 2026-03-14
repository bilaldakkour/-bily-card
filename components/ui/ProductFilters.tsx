'use client'

import { Filter, Search, X } from 'lucide-react'
import { Button } from './Button'
import { Input } from './Input'
import { Select } from './Select'

interface ProductFiltersProps {
  onSearch: (query: string) => void
  onCategoryFilter: (category: string) => void
  onSort: (sortBy: string) => void
  categories: Array<{ id: string; name: string }>
  searchQuery?: string
  selectedCategory?: string
  sortBy?: string
}

export function ProductFilters({
  onSearch,
  onCategoryFilter,
  onSort,
  categories,
  searchQuery = '',
  selectedCategory = '',
  sortBy = 'name',
}: ProductFiltersProps) {
  const clearFilters = () => {
    onSearch('')
    onCategoryFilter('')
    onSort('name')
  }

  return (
    <div className="mb-4 overflow-hidden rounded-[24px] border border-cyan-300/12 bg-[linear-gradient(180deg,rgba(8,18,34,0.96),rgba(7,14,28,0.98))] p-3.5 shadow-[0_24px_70px_rgba(2,6,23,0.22)] ring-1 ring-white/[0.03] sm:mb-6 sm:rounded-[28px] sm:p-5">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2.5 sm:mb-5">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-cyan-300">Store Tools</p>
          <h3 className="mt-1 flex items-center text-base font-semibold text-white sm:text-lg">
            <Filter className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
            Filters & Search
          </h3>
        </div>

        {(searchQuery || selectedCategory) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-9 rounded-[14px] border border-white/10 bg-white/[0.05] px-3 text-xs text-slate-100 hover:bg-white/[0.08] sm:h-10 sm:px-4 sm:text-sm"
          >
            <X className="mr-1.5 h-3.5 w-3.5 sm:mr-2 sm:h-4 sm:w-4" />
            Clear All
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:gap-3 md:grid-cols-2 lg:grid-cols-4">
        <form
          onSubmit={(event) => event.preventDefault()}
          className="lg:col-span-2"
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(event) => onSearch(event.target.value)}
              className="h-11 rounded-[18px] border-white/10 bg-white/[0.045] px-3 pl-10 text-sm text-white placeholder:text-slate-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] sm:px-4 sm:text-base"
            />
          </div>
        </form>

        <div>
          <Select
            value={selectedCategory}
            onChange={(event) => onCategoryFilter(event.target.value)}
            className="h-11 rounded-[18px] border-white/10 bg-white/[0.045] px-3 text-sm text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] sm:px-4 sm:text-base"
          >
            <option value="">All Categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Select
            value={sortBy}
            onChange={(event) => onSort(event.target.value)}
            className="h-11 rounded-[18px] border-white/10 bg-white/[0.045] px-3 text-sm text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] sm:px-4 sm:text-base"
          >
            <option value="name">Name A-Z</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
            <option value="newest">Newest First</option>
            <option value="popular">Most Popular</option>
          </Select>
        </div>
      </div>

      {(searchQuery || selectedCategory) && (
        <div className="mt-3 flex flex-wrap gap-1.5 border-t border-white/10 pt-3 sm:mt-4 sm:gap-2 sm:pt-4">
          {searchQuery && (
            <span className="inline-flex items-center rounded-full border border-cyan-400/18 bg-cyan-500/10 px-2.5 py-1 text-xs text-cyan-200 sm:px-3 sm:text-sm">
              Search: "{searchQuery}"
            </span>
          )}

          {selectedCategory && (
            <span className="inline-flex items-center rounded-full border border-blue-400/18 bg-blue-500/10 px-2.5 py-1 text-xs text-blue-200 sm:px-3 sm:text-sm">
              Category: {categories.find((category) => category.id === selectedCategory)?.name}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
