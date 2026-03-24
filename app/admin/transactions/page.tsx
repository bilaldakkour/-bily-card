'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { buildAdminAuthHeaders, getAdminTokenOptional, isUnauthorizedStatus } from '@/lib/utils/adminAuth'

interface Transaction {
  _id: string
  type: string
  amount: number
  description: string
  createdAt: string
  userId?: {
    email?: string
    displayName?: string
  }
}

export default function AdminTransactionsPage() {
  const router = useRouter()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    const token = getAdminTokenOptional()
    fetchTransactions(token, 1)
  }, [router])

  const fetchTransactions = async (token: string, page: number = 1) => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
        type: typeFilter
      })

      const res = await fetch(`/api/admin/transactions?${params}`, {
        headers: buildAdminAuthHeaders(token),
      })
      if (isUnauthorizedStatus(res.status)) {
        router.push('/admin/login')
        return
      }
      const data = await res.json()
      if (data.success) {
        setTransactions(data.data)
        setTotalPages(data.pagination.pages)
        setCurrentPage(data.pagination.page)
      }
    } catch (err) {
      console.error('Failed to fetch transactions:', err)
    } finally {
      setLoading(false)
    }
  }

  // Filter transactions locally
  useEffect(() => {
    let result = transactions

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(
        (transaction) =>
          transaction.description.toLowerCase().includes(term) ||
          transaction.userId?.email?.toLowerCase().includes(term) ||
          transaction.userId?.displayName?.toLowerCase().includes(term)
      )
    }

    setFilteredTransactions(result)
  }, [transactions, searchTerm])

  const handleTypeFilterChange = (type: string) => {
    setTypeFilter(type)
    setCurrentPage(1)
    const token = getAdminTokenOptional()
    if (token) {
      fetchTransactions(token, 1)
    }
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    const token = getAdminTokenOptional()
    if (token) {
      fetchTransactions(token, page)
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'deposit':
        return 'bg-green-500/20 text-green-400'
      case 'withdrawal':
        return 'bg-red-500/20 text-red-400'
      case 'purchase':
        return 'bg-blue-500/20 text-blue-400'
      case 'refund':
        return 'bg-yellow-500/20 text-yellow-400'
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
          <h1 className="text-2xl font-bold text-white">Transaction History</h1>
          <p className="text-slate-400">View all wallet transactions and activity</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <label htmlFor="typeFilter" className="text-sm font-medium text-slate-300">
              Type:
            </label>
            <select
              id="typeFilter"
              value={typeFilter}
              onChange={(e) => handleTypeFilterChange(e.target.value)}
              className="rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="all">All Types</option>
              <option value="deposit">Deposits</option>
              <option value="withdrawal">Withdrawals</option>
              <option value="purchase">Purchases</option>
              <option value="refund">Refunds</option>
            </select>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search transactions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none sm:w-auto"
          />
        </div>
      </div>

      {/* Transactions Table */}
      {filteredTransactions.length === 0 ? (
        <div className="rounded-lg border border-white/10 bg-slate-900 p-8 text-center">
          <p className="text-slate-400">No transactions found</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 md:hidden">
            {filteredTransactions.map((transaction) => (
              <div key={transaction._id} className="rounded-2xl border border-white/10 bg-slate-900 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-white">
                      {transaction.userId?.displayName || transaction.userId?.email || 'Unknown User'}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {new Date(transaction.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded px-3 py-1 text-xs font-medium capitalize ${getTypeColor(transaction.type)}`}>
                    {transaction.type}
                  </span>
                </div>

                <div className="mt-4 rounded-xl bg-slate-800/70 p-3">
                  <p className="text-xs text-slate-400">Amount</p>
                  <p className="mt-1 font-semibold text-green-400">${transaction.amount.toFixed(2)}</p>
                </div>

                <div className="mt-3 rounded-xl bg-slate-800/50 p-3 text-sm text-slate-300">
                  {transaction.description}
                </div>
              </div>
            ))}
          </div>

          <div className="hidden overflow-x-auto rounded-lg border border-white/10 bg-slate-900 md:block">
            <table className="w-full text-sm">
              <thead className="border-b border-white/10 bg-slate-800">
                <tr className="text-left text-slate-300">
                  <th className="px-6 py-4 font-semibold">User</th>
                  <th className="px-6 py-4 font-semibold">Type</th>
                  <th className="px-6 py-4 font-semibold">Amount</th>
                  <th className="px-6 py-4 font-semibold">Description</th>
                  <th className="px-6 py-4 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredTransactions.map((transaction) => (
                  <tr key={transaction._id} className="hover:bg-slate-800/50">
                    <td className="px-6 py-4 text-white">
                      {transaction.userId?.displayName || transaction.userId?.email || 'Unknown User'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block rounded px-3 py-1 text-xs font-medium capitalize ${getTypeColor(transaction.type)}`}>
                        {transaction.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-semibold text-green-400">
                      ${transaction.amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-slate-300">{transaction.description}</td>
                    <td className="px-6 py-4 text-slate-400">
                      {new Date(transaction.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-700"
              >
                Previous
              </button>
              <span className="text-slate-400">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-700"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
