'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { buildAdminAuthHeaders, getAdminTokenOptional, isUnauthorizedStatus } from '@/lib/utils/adminAuth'

type ProviderKey = 'dailycard' | 'go4card'

type ProviderProductRow = {
  providerProductId: string
  providerProductName: string
  price: number
  cost: number
  category: string
  stockStatus: string
  available: boolean
  currency: string
  lastSyncAt: string
}

type ProviderMeta = {
  providerKey: ProviderKey
  adapterAvailable: boolean
  total: number
  page: number
  limit: number
  totalPages: number
  rawCount: number
  filteredCount: number
  sourceFunction: string
}

const TAB_CONFIG: Array<{ key: ProviderKey; label: string }> = [
  { key: 'dailycard', label: 'DailyCard' },
  { key: 'go4card', label: 'Go4Card' },
]

export default function AdminProviderProductsPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<ProviderKey>('dailycard')
  const [queryInput, setQueryInput] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [rows, setRows] = useState<ProviderProductRow[]>([])
  const [meta, setMeta] = useState<ProviderMeta | null>(null)

  const getHeaders = () => buildAdminAuthHeaders(getAdminTokenOptional())

  const endpoint = useMemo(() => {
    if (activeTab === 'go4card') return '/api/admin/providers/go4card-products'
    return '/api/admin/providers/dailycard-products'
  }, [activeTab])

  const loadData = async () => {
    setLoading(true)
    setMessage('')
    try {
      const params = new URLSearchParams({
        page: '1',
        limit: '300',
      })
      if (search.trim()) params.set('q', search.trim())

      const res = await fetch(`${endpoint}?${params.toString()}`, {
        headers: getHeaders(),
      })
      if (isUnauthorizedStatus(res.status)) {
        router.push('/admin/login')
        return
      }
      const data = await res.json()
      if (!data?.success) {
        setRows([])
        setMeta(null)
        setMessage(data?.message || 'Failed to load provider products')
        return
      }
      setRows(Array.isArray(data?.data) ? data.data : [])
      setMeta((data?.meta || null) as ProviderMeta | null)
    } catch {
      setRows([])
      setMeta(null)
      setMessage('Failed to load provider products')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [activeTab, search])

  const exportCsv = () => {
    const params = new URLSearchParams({
      page: '1',
      limit: '5000',
      format: 'csv',
    })
    if (search.trim()) params.set('q', search.trim())
    window.location.href = `${endpoint}?${params.toString()}`
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-cyan-500/25 bg-slate-900/70 p-4 sm:p-5">
        <h1 className="text-xl font-bold text-white sm:text-2xl">Provider Products</h1>
        <p className="mt-1 text-sm text-cyan-100/80">
          View all products and prices from DailyCard / Go4Card and export CSV.
        </p>
      </div>

      <div className="rounded-2xl border border-cyan-500/20 bg-slate-900/60 p-3 sm:p-4">
        <div className="flex flex-wrap gap-2">
          {TAB_CONFIG.map((tab) => {
            const active = activeTab === tab.key
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                  active ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                }`}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') setSearch(queryInput.trim())
            }}
            placeholder="Search by product name or ID"
            className="h-11 flex-1 rounded-lg border border-cyan-500/20 bg-slate-800 px-3 text-sm text-white placeholder:text-slate-400 focus:border-cyan-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setSearch(queryInput.trim())}
            className="h-11 rounded-lg bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-500"
          >
            Search
          </button>
          <button
            type="button"
            onClick={() => {
              setQueryInput('')
              setSearch('')
            }}
            className="h-11 rounded-lg bg-slate-700 px-4 text-sm font-medium text-white hover:bg-slate-600"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={exportCsv}
            className="h-11 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-500"
          >
            Export CSV
          </button>
        </div>
      </div>

      {message ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {message}
        </div>
      ) : null}

      {meta ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <MetricCard label="Total" value={String(meta.total)} />
          <MetricCard label="Raw" value={String(meta.rawCount)} />
          <MetricCard label="Filtered" value={String(meta.filteredCount)} />
          <MetricCard label="Page Size" value={String(meta.limit)} />
          <MetricCard label="Pages" value={String(meta.totalPages)} />
          <MetricCard label="Source" value={meta.sourceFunction || '-'} />
        </div>
      ) : null}

      <div className="rounded-2xl border border-cyan-500/15 bg-slate-900/60 p-2 sm:p-3">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead>
              <tr className="text-left text-cyan-100">
                <th className="px-3 py-2">Provider Product ID</th>
                <th className="px-3 py-2">Provider Product Name</th>
                <th className="px-3 py-2">Price/Cost</th>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2">Stock Status</th>
                <th className="px-3 py-2">Available</th>
                <th className="px-3 py-2">Currency</th>
                <th className="px-3 py-2">Last Sync</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-3 py-6 text-slate-300" colSpan={8}>
                    Loading...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td className="px-3 py-6 text-slate-400" colSpan={8}>
                    No products found.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={`${row.providerProductId}-${row.providerProductName}`} className="border-t border-white/10">
                    <td className="px-3 py-2 text-cyan-200">{row.providerProductId}</td>
                    <td className="px-3 py-2 text-white">{row.providerProductName}</td>
                    <td className="px-3 py-2 text-emerald-300">${Number(row.price || 0).toFixed(4)}</td>
                    <td className="px-3 py-2 text-slate-300">{row.category || '-'}</td>
                    <td className="px-3 py-2 text-slate-300">{row.stockStatus || '-'}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded-full px-2 py-1 text-xs ${
                          row.available ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                        }`}
                      >
                        {row.available ? 'yes' : 'no'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-300">{row.currency || 'USD'}</td>
                    <td className="px-3 py-2 text-slate-400">{row.lastSyncAt ? new Date(row.lastSyncAt).toLocaleString() : '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-cyan-500/20 bg-slate-900/60 px-3 py-2">
      <p className="text-xs text-cyan-100/80">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-white">{value}</p>
    </div>
  )
}
