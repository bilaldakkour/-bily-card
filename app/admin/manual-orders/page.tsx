'use client'

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { buildAdminAuthHeaders, getAdminTokenOptional, isUnauthorizedStatus } from '@/lib/utils/adminAuth'

type ManualOrderStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'

interface ManualOrder {
  _id: string
  orderId: string
  productName: string
  userId: string
  quantity: number
  totalProfit: number
  totalCost: number
  totalSale: number
  status: ManualOrderStatus
  notes?: string
  createdAt: string
  updatedAt?: string
}

interface UserSuggestion {
  _id: string
  displayName: string
  username: string
  email: string
  phoneNumber?: string
}

interface ManualOrdersResponse {
  success: boolean
  data: ManualOrder[]
  summary: {
    count: number
    revenue: number
    cost: number
    profit: number
    byStatus: Record<ManualOrderStatus, number>
  }
}

const statusOptions: ManualOrderStatus[] = ['pending', 'processing', 'completed', 'failed', 'cancelled']

export default function AdminManualOrdersPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<ManualOrder[]>([])
  const [summary, setSummary] = useState({
    count: 0,
    revenue: 0,
    cost: 0,
    profit: 0,
    byStatus: {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
    } as Record<ManualOrderStatus, number>,
  })
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [exportingFormat, setExportingFormat] = useState<'' | 'csv' | 'excel'>('')
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null)
  const [statusDraft, setStatusDraft] = useState<Record<string, ManualOrderStatus>>({})
  const [message, setMessage] = useState('')

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [userFilter, setUserFilter] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [userSearchInput, setUserSearchInput] = useState('')
  const [userSuggestions, setUserSuggestions] = useState<UserSuggestion[]>([])
  const [selectedUser, setSelectedUser] = useState<UserSuggestion | null>(null)
  const [isUserLookupOpen, setIsUserLookupOpen] = useState(false)
  const [isUserLookupLoading, setIsUserLookupLoading] = useState(false)

  const [formState, setFormState] = useState({
    productName: '',
    userId: '',
    quantity: 1,
    totalCost: 0,
    totalSale: 0,
    status: 'pending' as ManualOrderStatus,
    notes: '',
  })

  const totalProfit = useMemo(
    () => Number(formState.totalSale || 0) - Number(formState.totalCost || 0),
    [formState.totalCost, formState.totalSale]
  )
  const canShowNoUserResult = userSearchInput.trim().length >= 2 && !isUserLookupLoading && userSuggestions.length === 0

  const buildFilterParams = useCallback(() => {
    const params = new URLSearchParams()
    if (searchTerm.trim()) params.set('search', searchTerm.trim())
    if (statusFilter !== 'all') params.set('status', statusFilter)
    if (userFilter.trim()) params.set('userId', userFilter.trim())
    if (fromDate) params.set('from', fromDate)
    if (toDate) params.set('to', toDate)
    return params
  }, [fromDate, searchTerm, statusFilter, toDate, userFilter])

  useEffect(() => {
    const token = getAdminTokenOptional()
    const query = userSearchInput.trim()

    if (!token || query.length < 2 || !isUserLookupOpen) {
      setUserSuggestions([])
      setIsUserLookupLoading(false)
      return
    }

    const controller = new AbortController()
    const timeout = setTimeout(async () => {
      try {
        setIsUserLookupLoading(true)
        const params = new URLSearchParams({ q: query, limit: '8' })
        const res = await fetch(`/api/admin/users/search?${params.toString()}`, {
          headers: buildAdminAuthHeaders(token),
          signal: controller.signal,
        })
        if (isUnauthorizedStatus(res.status)) {
          router.push('/admin/login')
          return
        }

        const payload = await res.json()
        if (!res.ok || !payload?.success) {
          setUserSuggestions([])
          return
        }
        setUserSuggestions(Array.isArray(payload.data) ? payload.data : [])
      } catch (error: any) {
        if (error?.name !== 'AbortError') {
          setUserSuggestions([])
        }
      } finally {
        setIsUserLookupLoading(false)
      }
    }, 350)

    return () => {
      clearTimeout(timeout)
      controller.abort()
    }
  }, [isUserLookupOpen, router, userSearchInput])

  const fetchManualOrders = useCallback(async (token: string) => {
    try {
      const params = buildFilterParams()
      const query = params.toString() ? `?${params.toString()}` : ''
      const res = await fetch(`/api/admin/manual-orders${query}`, {
        headers: buildAdminAuthHeaders(token),
      })
      if (isUnauthorizedStatus(res.status)) {
        router.push('/admin/login')
        return
      }

      const data = (await res.json()) as ManualOrdersResponse

      if (data.success) {
        setOrders(data.data || [])
        setStatusDraft(
          Object.fromEntries((data.data || []).map((row) => [row._id, row.status])) as Record<string, ManualOrderStatus>
        )
        setSummary(data.summary || {
          count: 0,
          revenue: 0,
          cost: 0,
          profit: 0,
          byStatus: {
            pending: 0,
            processing: 0,
            completed: 0,
            failed: 0,
            cancelled: 0,
          },
        })
      } else {
        setMessage('Failed to load manual orders')
      }
    } catch (error) {
      console.error('Manual orders fetch error:', error)
      setMessage('Failed to load manual orders')
    } finally {
      setLoading(false)
    }
  }, [buildFilterParams, router])

  useEffect(() => {
    const token = getAdminTokenOptional()

    void fetchManualOrders(token)
  }, [fetchManualOrders])

  const handleCreateOrder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const token = getAdminTokenOptional()

    setSubmitting(true)
    setMessage('')

    try {
      const res = await fetch('/api/admin/manual-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(buildAdminAuthHeaders(token) || {}),
        },
        body: JSON.stringify({
          productName: formState.productName,
          userId: formState.userId,
          quantity: Number(formState.quantity),
          totalCost: Number(formState.totalCost),
          totalSale: Number(formState.totalSale),
          status: formState.status,
          notes: formState.notes,
        }),
      })

      if (isUnauthorizedStatus(res.status)) {
        router.push('/admin/login')
        return
      }
      const data = await res.json()

      if (data.success) {
        setMessage('Manual order created successfully')
        setFormState({
          productName: '',
          userId: '',
          quantity: 1,
          totalCost: 0,
          totalSale: 0,
          status: 'pending',
          notes: '',
        })
        setUserSearchInput('')
        setUserSuggestions([])
        setSelectedUser(null)
        setIsUserLookupOpen(false)
        await fetchManualOrders(token)
      } else {
        setMessage(data.message || 'Failed to create manual order')
      }
    } catch (error) {
      console.error('Manual order create error:', error)
      setMessage('Failed to create manual order')
    } finally {
      setSubmitting(false)
    }
  }

  const handleStatusUpdate = async (orderId: string) => {
    const token = getAdminTokenOptional()

    const nextStatus = statusDraft[orderId]
    if (!nextStatus) return

    setUpdatingStatusId(orderId)
    setMessage('')

    try {
      const res = await fetch(`/api/admin/manual-orders/${orderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(buildAdminAuthHeaders(token) || {}),
        },
        body: JSON.stringify({ status: nextStatus }),
      })
      if (isUnauthorizedStatus(res.status)) {
        router.push('/admin/login')
        return
      }

      const data = await res.json()
      if (data?.success) {
        setMessage('Manual order status updated successfully')
        await fetchManualOrders(token)
      } else {
        setMessage(data?.message || 'Failed to update manual order status')
      }
    } catch (error) {
      console.error('Manual order status update error:', error)
      setMessage('Failed to update manual order status')
    } finally {
      setUpdatingStatusId(null)
    }
  }

  const selectUserSuggestion = (user: UserSuggestion) => {
    const label = [user.displayName || user.username || 'User', user.email ? `<${user.email}>` : '']
      .filter(Boolean)
      .join(' ')
    setSelectedUser(user)
    setUserSearchInput(label)
    setUserSuggestions([])
    setFormState((prev) => ({ ...prev, userId: user._id }))
    setIsUserLookupOpen(false)
  }

  const handleExport = async (format: 'csv' | 'excel') => {
    const token = getAdminTokenOptional()

    setExportingFormat(format)
    setMessage('')

    try {
      const params = buildFilterParams()
      params.set('format', format)
      const query = params.toString() ? `?${params.toString()}` : ''
      const res = await fetch(`/api/admin/manual-orders/export${query}`, {
        headers: buildAdminAuthHeaders(token),
      })
      if (isUnauthorizedStatus(res.status)) {
        router.push('/admin/login')
        return
      }

      if (!res.ok) {
        throw new Error('Export failed')
      }

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      const ext = format === 'excel' ? 'xls' : 'csv'
      link.href = url
      link.download = `manual-orders-export.${ext}`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Manual orders export error:', error)
      setMessage(`Failed to export ${format.toUpperCase()}`)
    } finally {
      setExportingFormat('')
    }
  }

  const statusTone = (status: ManualOrderStatus) => {
    if (status === 'completed') return 'bg-emerald-500/15 text-emerald-300'
    if (status === 'pending') return 'bg-amber-500/15 text-amber-300'
    if (status === 'processing') return 'bg-blue-500/15 text-blue-300'
    if (status === 'failed' || status === 'cancelled') return 'bg-rose-500/15 text-rose-300'
    return 'bg-slate-500/15 text-slate-300'
  }

  const statusTextTone = (status: ManualOrderStatus) => {
    if (status === 'completed') return 'text-emerald-300'
    if (status === 'pending') return 'text-amber-300'
    if (status === 'processing') return 'text-blue-300'
    if (status === 'failed' || status === 'cancelled') return 'text-rose-300'
    return 'text-slate-300'
  }

  if (loading) {
    return <div className="text-slate-300">Loading manual orders...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Manual Orders</h1>
        <p className="text-slate-400">Internal-only orders for external sales channels</p>
      </div>

      {message && (
        <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/10 p-4 text-cyan-200">
          {message}
        </div>
      )}

      <form onSubmit={handleCreateOrder} className="rounded-2xl border border-white/10 bg-slate-900/80 p-4 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Create Manual Order</h2>
          <p className="text-xs text-slate-500">Order ID and Created At are generated automatically</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <label className="space-y-2 text-sm text-slate-300">
            <span>Order ID</span>
            <input value="Auto-generated" disabled className="w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-slate-400" />
          </label>

          <label className="space-y-2 text-sm text-slate-300">
            <span>Created At</span>
            <input value="Auto-generated" disabled className="w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-slate-400" />
          </label>

          <label className="space-y-2 text-sm text-slate-300">
            <span>Status</span>
            <select
              value={formState.status}
              onChange={(e) => setFormState((prev) => ({ ...prev, status: e.target.value as ManualOrderStatus }))}
              className="w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-white"
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm text-slate-300 md:col-span-2 xl:col-span-1">
            <span>Product Name</span>
            <input
              required
              value={formState.productName}
              onChange={(e) => setFormState((prev) => ({ ...prev, productName: e.target.value }))}
              className="w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-white"
              placeholder="Example: PUBG UC 600"
            />
          </label>

          <div className="space-y-2 text-sm text-slate-300">
            <label htmlFor="manual-user-search">User ID (Search or Manual)</label>
            <div className="relative">
              <input
                id="manual-user-search"
                value={userSearchInput}
                onFocus={() => setIsUserLookupOpen(true)}
                onBlur={() => setTimeout(() => setIsUserLookupOpen(false), 120)}
                onChange={(e) => {
                  const next = e.target.value
                  setUserSearchInput(next)
                  setSelectedUser(null)
                  setFormState((prev) => ({ ...prev, userId: next }))
                  setIsUserLookupOpen(true)
                }}
                className="w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-white"
                placeholder="Search by user id, name, email, phone (or type manual ID)"
                autoComplete="off"
              />

              {isUserLookupOpen && userSearchInput.trim().length >= 2 && (
                <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-white/10 bg-slate-900 shadow-xl">
                  {isUserLookupLoading ? (
                    <p className="px-3 py-2 text-xs text-slate-400">Searching users...</p>
                  ) : (
                    <>
                      {userSuggestions.map((user) => (
                        <button
                          key={user._id}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => selectUserSuggestion(user)}
                          className="block w-full border-b border-white/5 px-3 py-2 text-left text-xs hover:bg-slate-800"
                        >
                          <p className="font-medium text-white">{user.displayName || user.username || 'User'}</p>
                          <p className="text-slate-400">{user.email || 'No email'}{user.phoneNumber ? ` | ${user.phoneNumber}` : ''}</p>
                          <p className="font-mono text-cyan-300">{user._id}</p>
                        </button>
                      ))}
                      {canShowNoUserResult && (
                        <p className="px-3 py-2 text-xs text-amber-300">
                          No users found. Manual User ID entry is allowed.
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            <input
              value={formState.userId}
              onChange={(e) => {
                setSelectedUser(null)
                setFormState((prev) => ({ ...prev, userId: e.target.value }))
              }}
              className="w-full rounded-lg border border-white/10 bg-slate-800/70 px-3 py-2 font-mono text-xs text-cyan-300"
              placeholder="Resolved User ID"
              required
            />
            {selectedUser ? (
              <p className="text-xs text-emerald-300">
                Selected: {selectedUser.displayName || selectedUser.username || selectedUser.email}
              </p>
            ) : (
              <p className="text-xs text-slate-500">You can still enter User ID manually if needed.</p>
            )}
          </div>

          <label className="space-y-2 text-sm text-slate-300">
            <span>Quantity</span>
            <input
              type="number"
              min={1}
              required
              value={formState.quantity}
              onChange={(e) => setFormState((prev) => ({ ...prev, quantity: Number(e.target.value) }))}
              className="w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-white"
            />
          </label>

          <label className="space-y-2 text-sm text-slate-300">
            <span>Total Cost</span>
            <input
              type="number"
              min={0}
              step="0.01"
              required
              value={formState.totalCost}
              onChange={(e) => setFormState((prev) => ({ ...prev, totalCost: Number(e.target.value) }))}
              className="w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-white"
            />
          </label>

          <label className="space-y-2 text-sm text-slate-300">
            <span>Total Sale</span>
            <input
              type="number"
              min={0}
              step="0.01"
              required
              value={formState.totalSale}
              onChange={(e) => setFormState((prev) => ({ ...prev, totalSale: Number(e.target.value) }))}
              className="w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-white"
            />
          </label>

          <label className="space-y-2 text-sm text-slate-300">
            <span>Total Profit</span>
            <input value={totalProfit.toFixed(2)} disabled className="w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-cyan-300" />
          </label>

          <label className="space-y-2 text-sm text-slate-300 md:col-span-2 xl:col-span-3">
            <span>Notes</span>
            <textarea
              rows={3}
              value={formState.notes}
              onChange={(e) => setFormState((prev) => ({ ...prev, notes: e.target.value }))}
              className="w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-white"
              placeholder="Internal note (optional)"
            />
          </label>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-cyan-600 px-4 py-2 font-medium text-white transition hover:bg-cyan-500 disabled:opacity-60"
          >
            {submitting ? 'Creating...' : 'Create Manual Order'}
          </button>
        </div>
      </form>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-white/10 bg-slate-900/80 p-4">
          <p className="text-xs text-slate-400">Manual Orders Count</p>
          <p className="mt-2 text-2xl font-bold text-white">{summary.count}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-slate-900/80 p-4">
          <p className="text-xs text-slate-400">Manual Revenue</p>
          <p className="mt-2 text-2xl font-bold text-emerald-300">${Number(summary.revenue || 0).toFixed(2)}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-slate-900/80 p-4">
          <p className="text-xs text-slate-400">Manual Cost</p>
          <p className="mt-2 text-2xl font-bold text-amber-300">${Number(summary.cost || 0).toFixed(2)}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-slate-900/80 p-4">
          <p className="text-xs text-slate-400">Manual Profit</p>
          <p className={`mt-2 text-2xl font-bold ${Number(summary.profit || 0) >= 0 ? 'text-cyan-300' : 'text-rose-300'}`}>
            ${Number(summary.profit || 0).toFixed(2)}
          </p>
        </div>
      </div>

      <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
        {statusOptions.map((status) => (
          <div key={`status-count-${status}`} className="rounded-xl border border-white/10 bg-slate-900/70 p-3">
            <p className="text-xs capitalize text-slate-400">{status}</p>
            <p className={`mt-2 text-xl font-bold ${statusTextTone(status)}`}>
              {Number(summary.byStatus?.[status] || 0)}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4 sm:p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-white">Manual Orders List</h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void handleExport('csv')}
              disabled={exportingFormat !== ''}
              className="rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-3 py-2 text-sm font-medium text-cyan-200 hover:bg-cyan-500/20 disabled:opacity-60"
            >
              {exportingFormat === 'csv' ? 'Exporting CSV...' : 'Export CSV'}
            </button>
            <button
              type="button"
              onClick={() => void handleExport('excel')}
              disabled={exportingFormat !== ''}
              className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-60"
            >
              {exportingFormat === 'excel' ? 'Exporting Excel...' : 'Export Excel'}
            </button>
          </div>
        </div>

        <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search order, product, user, notes"
            className="rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-white placeholder:text-slate-500 xl:col-span-2"
          />

          <input
            type="text"
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            placeholder="Filter by user ID"
            className="rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-white placeholder:text-slate-500"
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-white"
          >
            <option value="all">All Statuses</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => {
              setSearchTerm('')
              setStatusFilter('all')
              setUserFilter('')
              setFromDate('')
              setToDate('')
            }}
            className="rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-slate-200 hover:bg-slate-700"
          >
            Clear Filters
          </button>

          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-white"
          />

          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-white"
          />
        </div>

        {orders.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-slate-800/40 p-8 text-center text-slate-400">No manual orders found</div>
        ) : (
          <>
            <div className="grid gap-3 md:hidden">
              {orders.map((order) => (
                <div key={order._id} className="rounded-xl border border-white/10 bg-slate-800/60 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-mono text-xs text-cyan-300">{order.orderId}</p>
                      <p className="mt-1 text-sm font-semibold text-white">{order.productName}</p>
                      <p className="text-xs text-slate-400">User: {order.userId}</p>
                    </div>
                    <span className={`rounded px-2 py-1 text-xs capitalize ${statusTone(order.status)}`}>
                      {order.status}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg bg-slate-900/70 p-2 text-slate-300">Qty: {order.quantity}</div>
                    <div className="rounded-lg bg-slate-900/70 p-2 text-amber-300">Cost: ${order.totalCost.toFixed(2)}</div>
                    <div className="rounded-lg bg-slate-900/70 p-2 text-emerald-300">Sale: ${order.totalSale.toFixed(2)}</div>
                    <div className="col-span-2 rounded-lg bg-slate-900/70 p-2 text-cyan-300">Total Profit: ${order.totalProfit.toFixed(2)}</div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <select
                      value={statusDraft[order._id] || order.status}
                      onChange={(e) =>
                        setStatusDraft((prev) => ({
                          ...prev,
                          [order._id]: e.target.value as ManualOrderStatus,
                        }))
                      }
                      className="rounded-lg border border-white/10 bg-slate-900 px-2 py-2 text-xs text-white"
                    >
                      {statusOptions.map((status) => (
                        <option key={`${order._id}-${status}`} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => void handleStatusUpdate(order._id)}
                      disabled={updatingStatusId === order._id}
                      className="rounded-lg bg-cyan-600 px-2 py-2 text-xs font-medium text-white hover:bg-cyan-500 disabled:opacity-60"
                    >
                      {updatingStatusId === order._id ? 'Updating...' : 'Update Status'}
                    </button>
                  </div>

                  {order.notes ? <p className="mt-3 text-xs text-slate-300">{order.notes}</p> : null}

                  <p className="mt-2 text-right text-xs text-slate-500">
                    {new Date(order.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                  <p className="mt-1 text-right text-[11px] text-slate-600">
                    Updated: {order.updatedAt ? new Date(order.updatedAt).toLocaleString('en-US') : 'n/a'}
                  </p>
                </div>
              ))}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead className="border-b border-white/10 text-left text-slate-300">
                  <tr>
                    <th className="px-3 py-3">Order ID</th>
                    <th className="px-3 py-3">Product</th>
                    <th className="px-3 py-3">User ID</th>
                    <th className="px-3 py-3">Qty</th>
                    <th className="px-3 py-3">Total Cost</th>
                    <th className="px-3 py-3">Total Sale</th>
                    <th className="px-3 py-3">Total Profit</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Update</th>
                    <th className="px-3 py-3">Created At</th>
                    <th className="px-3 py-3">Updated At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {orders.map((order) => (
                    <tr key={order._id} className="hover:bg-slate-800/40">
                      <td className="px-3 py-3 font-mono text-xs text-cyan-300">{order.orderId}</td>
                      <td className="px-3 py-3 text-white">
                        <p>{order.productName}</p>
                        {order.notes ? <p className="mt-1 text-xs text-slate-400">{order.notes}</p> : null}
                      </td>
                      <td className="px-3 py-3 text-slate-200">{order.userId}</td>
                      <td className="px-3 py-3 text-slate-200">{order.quantity}</td>
                      <td className="px-3 py-3 text-amber-300">${order.totalCost.toFixed(2)}</td>
                      <td className="px-3 py-3 text-emerald-300">${order.totalSale.toFixed(2)}</td>
                      <td className={`px-3 py-3 font-semibold ${order.totalProfit >= 0 ? 'text-cyan-300' : 'text-rose-300'}`}>
                        ${order.totalProfit.toFixed(2)}
                      </td>
                      <td className="px-3 py-3">
                        <span className={`rounded px-2 py-1 text-xs capitalize ${statusTone(order.status)}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <select
                            value={statusDraft[order._id] || order.status}
                            onChange={(e) =>
                              setStatusDraft((prev) => ({
                                ...prev,
                                [order._id]: e.target.value as ManualOrderStatus,
                              }))
                            }
                            className="rounded border border-white/10 bg-slate-800 px-2 py-1 text-xs text-white"
                          >
                            {statusOptions.map((status) => (
                              <option key={`${order._id}-desktop-${status}`} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => void handleStatusUpdate(order._id)}
                            disabled={updatingStatusId === order._id}
                            className="rounded bg-cyan-600 px-2 py-1 text-xs text-white hover:bg-cyan-500 disabled:opacity-60"
                          >
                            {updatingStatusId === order._id ? '...' : 'Save'}
                          </button>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-slate-400">
                        {new Date(order.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-3 py-3 text-slate-500">
                        {order.updatedAt
                          ? new Date(order.updatedAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'n/a'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
