'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Filter, Search, X } from 'lucide-react'
import { Button } from './Button'
import { Input } from './Input'
import { cn } from '@/lib/utils'

interface ProductFiltersProps {
  onSearch: (query: string) => void
  onCategoryFilter: (category: string) => void
  onSort: (sortBy: string) => void
  categories: Array<{ id: string; name: string }>
  searchQuery?: string
  selectedCategory?: string
  sortBy?: string
}

interface FilterSelectOption {
  value: string
  label: string
}

interface FilterSelectProps {
  value: string
  onChange: (value: string) => void
  options: FilterSelectOption[]
  placeholder: string
}

function FilterSelect({ value, onChange, options, placeholder }: FilterSelectProps) {
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return

    const handlePointerDown = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    window.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const selected = options.find((option) => option.value === value)

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={cn(
          'flex h-11 w-full items-center justify-between rounded-[18px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.86),rgba(17,24,39,0.94))] px-4 text-sm text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition',
          open
            ? 'border-cyan-400/35 shadow-[0_16px_30px_rgba(8,145,178,0.18)]'
            : 'hover:border-cyan-400/18 hover:bg-[linear-gradient(180deg,rgba(15,23,42,0.94),rgba(17,24,39,0.98))]'
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="truncate font-medium text-slate-100">{selected?.label || placeholder}</span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-slate-400 transition', open && 'rotate-180 text-cyan-300')} />
      </button>

      {open ? (
        <div className="absolute left-0 right-0 top-[calc(100%+0.55rem)] z-30 overflow-hidden rounded-[20px] border border-cyan-400/18 bg-[linear-gradient(180deg,rgba(5,11,24,0.98),rgba(8,15,30,0.99))] p-1.5 shadow-[0_24px_50px_rgba(2,6,23,0.48)] ring-1 ring-white/[0.05]">
          <div className="max-h-72 overflow-y-auto pr-1">
            {options.map((option) => {
              const active = option.value === value

              return (
                <button
                  key={option.value || option.label}
                  type="button"
                  onClick={() => {
                    onChange(option.value)
                    setOpen(false)
                  }}
                  className={cn(
                    'flex w-full items-center justify-between rounded-[16px] px-3.5 py-2.5 text-left text-sm transition',
                    active
                      ? 'bg-[linear-gradient(135deg,rgba(34,211,238,0.18),rgba(37,99,235,0.22))] text-cyan-50'
                      : 'text-slate-200 hover:bg-white/[0.06] hover:text-white'
                  )}
                  role="option"
                  aria-selected={active}
                >
                  <span className="truncate">{option.label}</span>
                  {active ? <Check className="h-4 w-4 text-cyan-200" /> : null}
                </button>
              )
            })}
          </div>
        </div>
      ) : null}
    </div>
  )
}

const sortOptions: FilterSelectOption[] = [
  { value: 'name', label: 'Name A-Z' },
  { value: 'price-low', label: 'Price: Low to High' },
  { value: 'price-high', label: 'Price: High to Low' },
  { value: 'newest', label: 'Newest First' },
  { value: 'popular', label: 'Most Popular' },
]

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

  const categoryOptions = useMemo<FilterSelectOption[]>(
    () => [
      { value: '', label: 'All Categories' },
      ...categories.map((category) => ({
        value: category.id,
        label: category.name,
      })),
    ],
    [categories]
  )

  return (
    <div className="mb-4 overflow-visible rounded-[24px] border border-cyan-300/12 bg-[linear-gradient(180deg,rgba(6,14,28,0.94),rgba(5,11,24,0.98))] p-3 shadow-[0_24px_70px_rgba(2,6,23,0.22)] ring-1 ring-white/[0.03] sm:mb-6 sm:rounded-[28px] sm:p-4 lg:p-[18px]">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2.5 sm:mb-4">
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

      <div className="grid grid-cols-1 gap-2.5 sm:gap-3 md:grid-cols-2 lg:grid-cols-[minmax(0,1.55fr)_minmax(15rem,0.8fr)_minmax(14rem,0.72fr)]">
        <form onSubmit={(event) => event.preventDefault()}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(event) => onSearch(event.target.value)}
              className="h-11 rounded-[18px] border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.86),rgba(17,24,39,0.94))] px-3 pl-10 text-sm text-white placeholder:text-slate-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] focus:border-cyan-400/30 focus:ring-cyan-500/10 sm:px-4 sm:text-base"
            />
          </div>
        </form>

        <FilterSelect
          value={selectedCategory}
          onChange={onCategoryFilter}
          options={categoryOptions}
          placeholder="All Categories"
        />

        <FilterSelect
          value={sortBy}
          onChange={onSort}
          options={sortOptions}
          placeholder="Sort Products"
        />
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
