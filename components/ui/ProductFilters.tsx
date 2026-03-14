'use client'

import { Search, Filter, X } from 'lucide-react'
import { Button } from './Button'
import { Input } from './Input'
import { Select } from './Select'

interface ProductFiltersProps {
  onSearch: (query: string) => void;
  onCategoryFilter: (category: string) => void;
  onSort: (sortBy: string) => void;
  categories: Array<{ id: string; name: string }>;
  searchQuery?: string;
  selectedCategory?: string;
  sortBy?: string;
}

export function ProductFilters({
  onSearch,
  onCategoryFilter,
  onSort,
  categories,
  searchQuery = '',
  selectedCategory = '',
  sortBy = 'name'
}: ProductFiltersProps) {

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
  }

  const handleCategoryChange = (category: string) => {
    onCategoryFilter(category)
  }

  const handleSortChange = (sort: string) => {
    onSort(sort)
  }

  const clearFilters = () => {
    onSearch('')
    onCategoryFilter('')
    onSort('name')
  }

  return (
    <div className="mb-4 rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,15,29,0.95),rgba(5,10,22,0.98))] p-3 shadow-[0_18px_50px_rgba(2,6,23,0.2)] sm:mb-6 sm:rounded-[28px] sm:p-5 sm:shadow-[0_24px_70px_rgba(2,6,23,0.22)]">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 sm:mb-5 sm:gap-3">
        <h3 className="flex items-center text-base font-semibold text-white sm:text-lg">
          <Filter className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
          Filters & Search
        </h3>
        {(searchQuery || selectedCategory) && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 px-2.5 text-xs sm:h-10 sm:px-4 sm:text-sm">
            <X className="mr-1.5 h-3.5 w-3.5 sm:mr-2 sm:h-4 sm:w-4" />
            Clear All
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:gap-3 md:grid-cols-2 lg:grid-cols-4">
        {/* Search */}
        <form onSubmit={handleSearch} className="lg:col-span-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => onSearch(e.target.value)}
              className="h-10 rounded-lg px-3 text-sm pl-10 sm:h-11 sm:rounded-xl sm:px-4 sm:text-base"
            />
          </div>
        </form>

        {/* Category Filter */}
        <div>
          <Select
            value={selectedCategory}
            onChange={(e) => handleCategoryChange(e.target.value)}
            className="h-10 rounded-lg px-3 text-sm sm:h-11 sm:rounded-xl sm:px-4 sm:text-base"
          >
            <option value="">All Categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
        </div>

        {/* Sort */}
        <div>
          <Select
            value={sortBy}
            onChange={(e) => handleSortChange(e.target.value)}
            className="h-10 rounded-lg px-3 text-sm sm:h-11 sm:rounded-xl sm:px-4 sm:text-base"
          >
            <option value="name">Name A-Z</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
            <option value="newest">Newest First</option>
            <option value="popular">Most Popular</option>
          </Select>
        </div>
      </div>

      {/* Active Filters */}
      {(searchQuery || selectedCategory) && (
        <div className="mt-3 flex flex-wrap gap-1.5 border-t border-white/10 pt-3 sm:mt-4 sm:gap-2 sm:pt-4">
          {searchQuery && (
            <span className="inline-flex items-center rounded-full border border-cyan-400/20 bg-cyan-500/10 px-2.5 py-1 text-xs text-cyan-300 sm:px-3 sm:text-sm">
              Search: "{searchQuery}"
            </span>
          )}
          {selectedCategory && (
            <span className="inline-flex items-center rounded-full border border-violet-400/20 bg-violet-500/10 px-2.5 py-1 text-xs text-violet-300 sm:px-3 sm:text-sm">
              Category: {categories.find(c => c.id === selectedCategory)?.name}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
