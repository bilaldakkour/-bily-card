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
    <div className="mb-6 rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,15,29,0.95),rgba(5,10,22,0.98))] p-4 shadow-[0_24px_70px_rgba(2,6,23,0.22)] sm:p-5">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex items-center text-lg font-semibold text-white">
          <Filter className="h-5 w-5 mr-2" />
          Filters & Search
        </h3>
        {(searchQuery || selectedCategory) && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4 mr-2" />
            Clear All
          </Button>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        {/* Search */}
        <form onSubmit={handleSearch} className="lg:col-span-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => onSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </form>

        {/* Category Filter */}
        <div>
          <Select
            value={selectedCategory}
            onChange={(e) => handleCategoryChange(e.target.value)}
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
        <div className="mt-4 flex flex-wrap gap-2 border-t border-white/10 pt-4">
          {searchQuery && (
            <span className="inline-flex items-center rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-sm text-cyan-300">
              Search: "{searchQuery}"
            </span>
          )}
          {selectedCategory && (
            <span className="inline-flex items-center rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-sm text-violet-300">
              Category: {categories.find(c => c.id === selectedCategory)?.name}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
