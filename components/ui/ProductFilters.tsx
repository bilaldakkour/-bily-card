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
    <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-6 mb-8">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white flex items-center">
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-white/10">
          {searchQuery && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-500/20 text-blue-400">
              Search: "{searchQuery}"
            </span>
          )}
          {selectedCategory && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-500/20 text-purple-400">
              Category: {categories.find(c => c.id === selectedCategory)?.name}
            </span>
          )}
        </div>
      )}
    </div>
  )
}