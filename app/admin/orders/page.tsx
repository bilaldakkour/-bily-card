'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Order {
  _id: string
  orderId: string
  productName: string
  playerId: string
  price: number
  quantity: number
  total: number
  providerTotalCost: number
  grossProfit: number
  status: string
  providerStatus?: string
  selectedPackageOption?: string
  providerMatchedProductName?: string
  failureReason?: string
  createdAt: string
  userId?: {
    email?: string
    displayName?: string
  }
}

export default function AdminOrdersPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('adminToken')
    if (!token) {
      router.push('/admin/login')
      return
    }

    fetchOrders(token)
  }, [router])

  const fetchOrders = async (token: string) => {
    try {
      const res = await fetch('/api/admin/orders', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const data = await res.json()
      if (data.success) {
        setOrders(data.data)
      }
    } catch (err) {
      console.error('Failed to fetch orders:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (orderId: string, action: 'approve' | 'reject') => {
    setProcessingId(orderId)
    setMessage('')

    const token = localStorage.getItem('adminToken')
    if (!token) return

    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action }),
      })

      const data = await res.json()

      if (data.success) {
        setMessage(`${action === 'approve' ? 'Order approved' : 'Order rejected and refunded'} successfully`)
        // Refresh orders
        await fetchOrders(token)
      } else {
        setMessage(data.message || 'Action failed')
      }
    } catch (err) {
      setMessage('An error occurred')
    } finally {
      setProcessingId(null)
    }
  }

  // Filter orders
  useEffect(() => {
    let result = orders

    if (statusFilter !== 'all') {
      result = result.filter((order) => order.status === statusFilter)
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(
        (order) =>
          order.orderId.toLowerCase().includes(term) ||
          order.playerId.toLowerCase().includes(term) ||
          order.productName.toLowerCase().includes(term)
      )
    }

    setFilteredOrders(result)
  }, [orders, statusFilter, searchTerm])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/20 text-green-400'
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-400'
      case 'processing':
        return 'bg-blue-500/20 text-blue-400'
      case 'failed':
        return 'bg-red-500/20 text-red-400'
      case 'refunded':
        return 'bg-slate-500/20 text-slate-400'
      default:
        return 'bg-slate-500/20 text-slate-400'
    }
  }

  if (loading) {
    return (
      <div className="text-white">Loading...</div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Orders Management</h1>
          <p className="text-slate-400">Review and manage customer orders</p>
        </div>
      </div>

      {message && (
        <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-4">
          <p className="text-blue-400">{message}</p>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <label htmlFor="statusFilter" className="text-sm font-medium text-slate-300">
              Status:
            </label>
            <select
              id="statusFilter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="all">All Orders</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search orders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none sm:w-auto"
          />
        </div>
      </div>

        {/* Orders Table */}
        {filteredOrders.length === 0 ? (
          <div className="rounded-lg border border-white/10 bg-slate-900 p-8 text-center">
            <p className="text-slate-400">No orders found</p>
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:hidden">
              {filteredOrders.map((order) => {
                const orderProfit = Number(order.grossProfit || 0)
                const canManage = order.status === 'pending' || order.status === 'processing'

                return (
                  <div key={order._id} className="rounded-2xl border border-white/10 bg-slate-900 p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link
                          href={`/admin/orders/${order._id}`}
                          className="block font-mono text-xs text-blue-400 hover:text-blue-300"
                        >
                          {order.orderId}
                        </Link>
                        <h2 className="mt-1 text-sm font-semibold text-white">{order.productName}</h2>
                        <p className="mt-1 text-xs text-slate-400">
                          {new Date(order.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <span className={`shrink-0 rounded px-3 py-1 text-xs font-medium capitalize ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-xl bg-slate-800/70 p-3">
                        <p className="text-xs text-slate-400">Player ID</p>
                        <p className="mt-1 break-all font-mono text-slate-200">{order.playerId}</p>
                      </div>
                      <div className="rounded-xl bg-slate-800/70 p-3">
                        <p className="text-xs text-slate-400">Quantity</p>
                        <p className="mt-1 text-white">{Number(order.quantity || 1)}</p>
                      </div>
                      <div className="rounded-xl bg-slate-800/70 p-3">
                        <p className="text-xs text-slate-400">Sale Total</p>
                        <p className="mt-1 font-semibold text-green-400">${Number(order.total || 0).toFixed(2)}</p>
                      </div>
                      <div className="rounded-xl bg-slate-800/70 p-3">
                        <p className="text-xs text-slate-400">Profit</p>
                        <p className={`mt-1 font-semibold ${orderProfit >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                          ${orderProfit.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 rounded-xl border border-white/8 bg-slate-800/40 p-3 text-xs text-slate-300">
                      <p><span className="text-slate-500">Provider:</span> <span className="text-cyan-300">{order.providerStatus || 'n/a'}</span></p>
                      {order.selectedPackageOption && (
                        <p className="mt-1"><span className="text-slate-500">Selected:</span> {order.selectedPackageOption}</p>
                      )}
                      {order.providerMatchedProductName && (
                        <p className="mt-1"><span className="text-slate-500">Matched:</span> <span className="text-emerald-300">{order.providerMatchedProductName}</span></p>
                      )}
                      {order.failureReason && (
                        <p className="mt-1 text-red-300"><span className="text-slate-500">Reason:</span> {order.failureReason}</p>
                      )}
                    </div>

                    {canManage && (
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handleAction(order._id, 'approve')}
                          disabled={processingId === order._id}
                          className="rounded-xl bg-green-600 px-3 py-3 text-sm font-medium text-white transition hover:bg-green-500 disabled:opacity-50"
                        >
                          {processingId === order._id ? 'Processing...' : 'Approve'}
                        </button>
                        <button
                          onClick={() => handleAction(order._id, 'reject')}
                          disabled={processingId === order._id}
                          className="rounded-xl bg-red-600 px-3 py-3 text-sm font-medium text-white transition hover:bg-red-500 disabled:opacity-50"
                        >
                          {processingId === order._id ? 'Processing...' : 'Reject'}
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="hidden overflow-x-auto rounded-lg border border-white/10 bg-slate-900 md:block">
            <table className="w-full text-sm">
              <thead className="border-b border-white/10 bg-slate-800">
                <tr className="text-left text-slate-300">
                  <th className="px-6 py-4 font-semibold">Order ID</th>
                  <th className="px-6 py-4 font-semibold">Product</th>
                  <th className="px-6 py-4 font-semibold">Player ID</th>
                  <th className="px-6 py-4 font-semibold">Qty</th>
                  <th className="px-6 py-4 font-semibold">Sale Total</th>
                  <th className="px-6 py-4 font-semibold">Provider Cost</th>
                  <th className="px-6 py-4 font-semibold">Profit</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold">Provider Trace</th>
                  <th className="px-6 py-4 font-semibold">Date</th>
                  <th className="px-6 py-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredOrders.map((order) => {
                  const orderProfit = Number(order.grossProfit || 0)
                  return (
                  <tr key={order._id} className="hover:bg-slate-800/50">
                    <td className="px-6 py-4 font-mono text-xs text-blue-400">
                      <Link href={`/admin/orders/${order._id}`} className="hover:text-blue-300">
                        {order.orderId}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-white">{order.productName}</td>
                    <td className="px-6 py-4 font-mono text-slate-300">{order.playerId}</td>
                    <td className="px-6 py-4 text-slate-300">{Number(order.quantity || 1)}</td>
                    <td className="px-6 py-4 font-semibold text-green-400">${Number(order.total || 0).toFixed(2)}</td>
                    <td className="px-6 py-4 text-amber-300">${Number(order.providerTotalCost || 0).toFixed(2)}</td>
                    <td className={`px-6 py-4 font-semibold ${orderProfit >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                      ${orderProfit.toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block rounded px-3 py-1 text-xs font-medium capitalize ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-300">
                      <div className="space-y-1">
                        <div>
                          <span className="text-slate-400">Provider:</span>{' '}
                          <span className="font-medium text-cyan-300">{order.providerStatus || 'n/a'}</span>
                        </div>
                        {order.selectedPackageOption && (
                          <div>
                            <span className="text-slate-400">Selected:</span>{' '}
                            <span className="text-slate-200">{order.selectedPackageOption}</span>
                          </div>
                        )}
                        {order.providerMatchedProductName && (
                          <div>
                            <span className="text-slate-400">Matched:</span>{' '}
                            <span className="text-emerald-300">{order.providerMatchedProductName}</span>
                          </div>
                        )}
                        {order.failureReason && (
                          <div className="text-red-300">
                            <span className="text-slate-400">Reason:</span> {order.failureReason}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-400">
                      {new Date(order.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-6 py-4">
                      {(order.status === 'pending' || order.status === 'processing') && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAction(order._id, 'approve')}
                            disabled={processingId === order._id}
                            className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-3 py-1 rounded text-sm"
                          >
                            {processingId === order._id ? 'Processing...' : 'Approve'}
                          </button>
                          <button
                            onClick={() => handleAction(order._id, 'reject')}
                            disabled={processingId === order._id}
                            className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-3 py-1 rounded text-sm"
                          >
                            {processingId === order._id ? 'Processing...' : 'Reject'}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
          </>
        )}
    </div>
  )
}
