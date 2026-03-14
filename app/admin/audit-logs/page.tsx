'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

type AuditLog = {
  _id: string
  adminUserId?: {
    displayName?: string
    email?: string
    username?: string
  } | null
  action: string
  targetType: 'user' | 'order' | 'deposit' | 'wallet' | 'system'
  targetId?: string
  details?: Record<string, any>
  createdAt: string
}

const ACTION_OPTIONS = [
  'all',
  'wallet_adjustment_add',
  'wallet_adjustment_deduct',
  'deposit_approve',
  'deposit_reject',
  'order_approve',
  'order_reject',
  'order_manual_update',
  'user_profile_update',
]

const TARGET_TYPE_OPTIONS = ['all', 'user', 'order', 'deposit', 'wallet', 'system']

export default function AdminAuditLogsPage() {
  const router = useRouter()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [actionFilter, setActionFilter] = useState('all')
  const [targetTypeFilter, setTargetTypeFilter] = useState('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [exporting, setExporting] = useState(false)

  const fetchLogs = async (page = 1) => {
    const token = localStorage.getItem('adminToken')
    if (!token) {
      router.push('/admin/login')
      return
    }

    try {
      setLoading(true)
      setError('')

      const params = new URLSearchParams({
        page: String(page),
        limit: '50',
        action: actionFilter,
        targetType: targetTypeFilter,
        search: searchTerm,
      })

      if (fromDate) params.set('from', fromDate)
      if (toDate) params.set('to', toDate)

      const res = await fetch(`/api/admin/audit-logs?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await res.json()

      if (!res.ok || !data?.success) {
        throw new Error(data?.message || 'Failed to fetch audit logs')
      }

      setLogs(data.data || [])
      setCurrentPage(data.pagination?.page || 1)
      setTotalPages(data.pagination?.pages || 1)
      setTotal(data.pagination?.total || 0)
    } catch (err: any) {
      setError(err.message || 'Failed to fetch audit logs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionFilter, targetTypeFilter, fromDate, toDate])

  const exportCsv = async () => {
    const token = localStorage.getItem('adminToken')
    if (!token) {
      router.push('/admin/login')
      return
    }

    try {
      setExporting(true)
      const params = new URLSearchParams({
        format: 'csv',
        exportLimit: '3000',
        action: actionFilter,
        targetType: targetTypeFilter,
        search: searchTerm,
      })

      if (fromDate) params.set('from', fromDate)
      if (toDate) params.set('to', toDate)

      const res = await fetch(`/api/admin/audit-logs?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!res.ok) {
        throw new Error('Failed to export CSV')
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (err: any) {
      setError(err.message || 'Failed to export CSV')
    } finally {
      setExporting(false)
    }
  }

  const detailsText = (details?: Record<string, any>) => {
    if (!details) return '-'
    const compact = Object.entries(details)
      .slice(0, 4)
      .map(([k, v]) => `${k}: ${String(v)}`)
      .join(' | ')
    return compact || '-'
  }

  const safeLogs = useMemo(() => logs || [], [logs])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Audit Logs</h1>
        <p className="text-slate-400">Track admin actions across users, orders, deposits, and wallets</p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-red-300">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-lg border border-white/10 bg-slate-900 p-4 lg:flex-row lg:items-center">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search action, target id, reason..."
          className="rounded border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-400"
        />

        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="rounded border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white"
        >
          {ACTION_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        <select
          value={targetTypeFilter}
          onChange={(e) => setTargetTypeFilter(e.target.value)}
          className="rounded border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white"
        >
          {TARGET_TYPE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          className="rounded border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white"
          title="From date"
        />

        <input
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          className="rounded border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white"
          title="To date"
        />

        <button
          onClick={() => fetchLogs(1)}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Search
        </button>

        <button
          onClick={exportCsv}
          disabled={exporting}
          className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {exporting ? 'Exporting...' : 'Export CSV'}
        </button>
      </div>

      <div className="text-sm text-slate-400">Total logs: {total}</div>

      {loading ? (
        <div className="text-slate-300">Loading audit logs...</div>
      ) : safeLogs.length === 0 ? (
        <div className="rounded-lg border border-white/10 bg-slate-900 p-6 text-slate-400">
          No audit logs found.
        </div>
      ) : (
        <>
        <div className="grid gap-4 md:hidden">
          {safeLogs.map((log) => (
            <div key={log._id} className="rounded-2xl border border-white/10 bg-slate-900 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">{log.action}</p>
                  <p className="mt-1 text-xs text-slate-400">{new Date(log.createdAt).toLocaleString('en-US')}</p>
                </div>
                <span className="shrink-0 rounded bg-blue-500/15 px-3 py-1 text-xs font-medium text-blue-300">
                  {log.targetType}
                </span>
              </div>

              <div className="mt-4 space-y-3 text-sm">
                <div className="rounded-xl bg-slate-800/60 p-3">
                  <p className="text-xs text-slate-400">Admin</p>
                  <p className="mt-1 text-slate-200">
                    {log.adminUserId?.displayName || log.adminUserId?.username || 'Admin'}
                  </p>
                  <p className="mt-1 break-all text-xs text-slate-500">{log.adminUserId?.email || ''}</p>
                </div>
                <div className="rounded-xl bg-slate-800/60 p-3">
                  <p className="text-xs text-slate-400">Target ID</p>
                  <p className="mt-1 break-all font-mono text-slate-200">{log.targetId || '-'}</p>
                </div>
                <div className="rounded-xl bg-slate-800/60 p-3">
                  <p className="text-xs text-slate-400">Details</p>
                  <p className="mt-1 break-words text-slate-300">{detailsText(log.details)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="hidden overflow-x-auto rounded-lg border border-white/10 bg-slate-900 md:block">
          <table className="w-full text-sm">
            <thead className="border-b border-white/10 bg-slate-800">
              <tr className="text-left text-slate-300">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Admin</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Target</th>
                <th className="px-4 py-3">Target ID</th>
                <th className="px-4 py-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {safeLogs.map((log) => (
                <tr key={log._id} className="hover:bg-slate-800/50">
                  <td className="px-4 py-3 text-slate-300">
                    {new Date(log.createdAt).toLocaleString('en-US')}
                  </td>
                  <td className="px-4 py-3 text-slate-200">
                    {log.adminUserId?.displayName || log.adminUserId?.username || 'Admin'}
                    <div className="text-xs text-slate-400">{log.adminUserId?.email || ''}</div>
                  </td>
                  <td className="px-4 py-3 text-cyan-300">{log.action}</td>
                  <td className="px-4 py-3 text-white">{log.targetType}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-300">{log.targetId || '-'}</td>
                  <td className="px-4 py-3 text-slate-300">{detailsText(log.details)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => fetchLogs(currentPage - 1)}
            disabled={currentPage <= 1}
            className="rounded border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-slate-300">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => fetchLogs(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="rounded border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
