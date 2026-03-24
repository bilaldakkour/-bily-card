'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { buildAdminAuthHeaders, getAdminTokenOptional, isUnauthorizedStatus } from '@/lib/utils/adminAuth'

interface User {
  _id: string
  username: string
  email: string
  displayName: string
  phoneNumber?: string
  role: string
  isBlocked: boolean
  pricingPercent?: number
  walletBalance?: {
    usd?: number
  }
  createdAt: string
}

interface ProductDiscountItem {
  slug: string
  name: string
  category?: string
}

export default function AdminUsersPage() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [pricingInputs, setPricingInputs] = useState<Record<string, string>>({})
  const [walletAmountInputs, setWalletAmountInputs] = useState<Record<string, string>>({})
  const [walletDirectionInputs, setWalletDirectionInputs] = useState<Record<string, 'add' | 'deduct'>>({})
  const [walletNoteInputs, setWalletNoteInputs] = useState<Record<string, string>>({})
  const [discountEditorUser, setDiscountEditorUser] = useState<User | null>(null)
  const [discountCatalog, setDiscountCatalog] = useState<ProductDiscountItem[]>([])
  const [discountSearch, setDiscountSearch] = useState('')
  const [discountValues, setDiscountValues] = useState<Record<string, string>>({})
  const [discountLoading, setDiscountLoading] = useState(false)
  const [discountSaving, setDiscountSaving] = useState(false)

  useEffect(() => {
    const token = getAdminTokenOptional()
    fetchUsers(token, 1)
  }, [router])

  const fetchUsers = async (token: string, page: number = 1) => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
        search: searchTerm
      })

      const res = await fetch(`/api/admin/users?${params}`, {
        headers: buildAdminAuthHeaders(token),
      })
      if (isUnauthorizedStatus(res.status)) {
        router.push('/admin/login')
        return
      }
      const data = await res.json()
      if (data.success) {
        setUsers(data.data)
        const nextInputs: Record<string, string> = {}
        for (const u of data.data as User[]) {
          nextInputs[u._id] = String(Number(u.pricingPercent || 0))
        }
        setPricingInputs(nextInputs)
        setWalletAmountInputs((prev) => {
          const next = { ...prev }
          for (const u of data.data as User[]) {
            if (!next[u._id]) next[u._id] = ''
          }
          return next
        })
        setWalletDirectionInputs((prev) => {
          const next = { ...prev }
          for (const u of data.data as User[]) {
            if (!next[u._id]) next[u._id] = 'add'
          }
          return next
        })
        setWalletNoteInputs((prev) => {
          const next = { ...prev }
          for (const u of data.data as User[]) {
            if (!next[u._id]) next[u._id] = ''
          }
          return next
        })
        setTotalPages(data.pagination.pages)
        setCurrentPage(data.pagination.page)
      } else {
        setError(data.message || 'Failed to fetch users')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Filter users locally for additional client-side filtering
  useEffect(() => {
    let result = users

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(
        (user) =>
          user.username.toLowerCase().includes(term) ||
          user.email.toLowerCase().includes(term) ||
          user.displayName.toLowerCase().includes(term) ||
          String(user.phoneNumber || '').toLowerCase().includes(term)
      )
    }

    setFilteredUsers(result)
  }, [users, searchTerm])

  const handleSearch = () => {
    setCurrentPage(1)
    const token = getAdminTokenOptional()
    if (token) {
      fetchUsers(token, 1)
    }
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    const token = getAdminTokenOptional()
    if (token) {
      fetchUsers(token, page)
    }
  }

  const handleBlockToggle = async (userId: string, currentlyBlocked: boolean) => {
    setProcessingId(userId)
    setMessage('')

    const token = getAdminTokenOptional()

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(buildAdminAuthHeaders(token) || {}),
        },
        body: JSON.stringify({
          isBlocked: !currentlyBlocked
        }),
      })
      if (isUnauthorizedStatus(res.status)) {
        router.push('/admin/login')
        return
      }

      const data = await res.json()

      if (data.success) {
        setMessage(`User ${!currentlyBlocked ? 'blocked' : 'unblocked'} successfully`)
        // Refresh users
        await fetchUsers(token, currentPage)
      } else {
        setMessage(data.message || 'Action failed')
      }
    } catch (err) {
      setMessage('An error occurred')
    } finally {
      setProcessingId(null)
    }
  }

  const handleSaveUserPercent = async (userId: string) => {
    setProcessingId(userId)
    setMessage('')

    const token = getAdminTokenOptional()

    try {
      const percent = Number(pricingInputs[userId] || 0)
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(buildAdminAuthHeaders(token) || {}),
        },
        body: JSON.stringify({ pricingPercent: percent }),
      })
      if (isUnauthorizedStatus(res.status)) {
        router.push('/admin/login')
        return
      }

      const data = await res.json()
      if (data.success) {
        setMessage('User pricing updated successfully')
        await fetchUsers(token, currentPage)
      } else {
        setMessage(data.message || 'Failed to update user pricing')
      }
    } catch (err) {
      setMessage('Failed to update user pricing')
    } finally {
      setProcessingId(null)
    }
  }

  const handleWalletAdjustment = async (userId: string) => {
    setProcessingId(userId)
    setMessage('')

    const token = getAdminTokenOptional()

    try {
      const amount = Number(walletAmountInputs[userId] || 0)
      if (!Number.isFinite(amount) || amount <= 0) {
        setMessage('Please enter a valid wallet amount')
        return
      }

      const direction = walletDirectionInputs[userId] || 'add'
      const signedAmount = direction === 'deduct' ? -amount : amount
      const walletNotes = (walletNoteInputs[userId] || '').trim() || 'Admin adjustment'

      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(buildAdminAuthHeaders(token) || {}),
        },
        body: JSON.stringify({
          walletAdjustment: signedAmount,
          currency: 'USD',
          walletNotes,
        }),
      })
      if (isUnauthorizedStatus(res.status)) {
        router.push('/admin/login')
        return
      }

      const data = await res.json()
      if (data.success) {
        setMessage(`Wallet ${direction === 'deduct' ? 'deducted from' : 'added to'} user successfully`)
        setWalletAmountInputs((prev) => ({ ...prev, [userId]: '' }))
        setWalletNoteInputs((prev) => ({ ...prev, [userId]: '' }))
        await fetchUsers(token, currentPage)
      } else {
        setMessage(data.message || 'Failed to adjust wallet')
      }
    } catch (err) {
      setMessage('Failed to adjust wallet')
    } finally {
      setProcessingId(null)
    }
  }

  const openProductDiscountEditor = async (user: User) => {
    const token = getAdminTokenOptional()

    setDiscountEditorUser(user)
    setDiscountSearch('')
    setDiscountLoading(true)
    setDiscountValues({})
    setMessage('')

    try {
      const [productsRes, discountsRes] = await Promise.all([
        fetch('/api/admin/pricing/products', {
          headers: buildAdminAuthHeaders(token),
          cache: 'no-store',
        }),
        fetch(`/api/admin/users/${user._id}/product-discounts`, {
          headers: buildAdminAuthHeaders(token),
          cache: 'no-store',
        }),
      ])
      if (isUnauthorizedStatus(productsRes.status) || isUnauthorizedStatus(discountsRes.status)) {
        router.push('/admin/login')
        return
      }

      const productsData = await productsRes.json()
      const discountsData = await discountsRes.json()

      if (!productsRes.ok || !productsData?.success || !Array.isArray(productsData?.data)) {
        throw new Error('Failed to load products list')
      }

      const catalog = (productsData.data as any[]).map((item) => ({
        slug: String(item?.slug || '').trim().toLowerCase(),
        name: String(item?.name || item?.slug || ''),
        category: String(item?.category || ''),
      }))

      setDiscountCatalog(catalog)

      const nextValues: Record<string, string> = {}
      if (discountsRes.ok && discountsData?.success && Array.isArray(discountsData?.data)) {
        for (const row of discountsData.data as any[]) {
          const slug = String(row?.productSlug || '').trim().toLowerCase()
          if (!slug) continue
          nextValues[slug] = String(Number(row?.discountPercent || 0))
        }
      }
      setDiscountValues(nextValues)
    } catch (err: any) {
      setMessage(err?.message || 'Failed to load user product discounts')
    } finally {
      setDiscountLoading(false)
    }
  }

  const handleSaveProductDiscounts = async () => {
    if (!discountEditorUser) return
    const token = getAdminTokenOptional()

    setDiscountSaving(true)
    setMessage('')

    try {
      const discounts = Object.entries(discountValues)
        .map(([productSlug, value]) => ({
          productSlug: String(productSlug || '').trim().toLowerCase(),
          discountPercent: Number(value || 0),
        }))
        .filter((item) => item.productSlug && Number.isFinite(item.discountPercent) && item.discountPercent > 0)
        .map((item) => ({
          ...item,
          discountPercent: Math.max(0, Math.min(100, item.discountPercent)),
        }))

      const res = await fetch(`/api/admin/users/${discountEditorUser._id}/product-discounts`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(buildAdminAuthHeaders(token) || {}),
        },
        body: JSON.stringify({ discounts }),
      })

      if (isUnauthorizedStatus(res.status)) {
        router.push('/admin/login')
        return
      }

      const data = await res.json()
      if (!res.ok || !data?.success) {
        throw new Error(data?.message || 'Failed to save user product discounts')
      }

      setMessage('User product discounts saved successfully')
      setDiscountEditorUser(null)
    } catch (err: any) {
      setMessage(err?.message || 'Failed to save user product discounts')
    } finally {
      setDiscountSaving(false)
    }
  }

  const filteredDiscountCatalog = useMemo(() => {
    const term = discountSearch.trim().toLowerCase()
    if (!term) return discountCatalog

    return discountCatalog.filter((item) =>
      [item.name, item.slug, item.category].some((value) =>
        String(value || '').toLowerCase().includes(term)
      )
    )
  }, [discountCatalog, discountSearch])

  if (loading) {
    return (
      <div className="text-white">Loading...</div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">User Management</h1>
          <p className="text-slate-400">Manage customer accounts and permissions</p>
        </div>
      </div>

      {message && (
        <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-4">
          <p className="text-blue-400">{message}</p>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* Search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search users by name, email, username, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            className="rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
          />
          <button
            onClick={handleSearch}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 transition-colors"
          >
            Search
          </button>
        </div>
      </div>

      {/* Users Table */}
      {filteredUsers.length === 0 ? (
        <div className="rounded-lg border border-white/10 bg-slate-900 p-8 text-center">
          <p className="text-slate-400">No users found</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 md:hidden">
            {filteredUsers.map((user) => (
              <div key={user._id} className="rounded-2xl border border-white/10 bg-slate-900 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-base font-semibold text-white">{user.displayName}</p>
                    <p className="text-sm text-slate-400">@{user.username}</p>
                    <p className="mt-1 break-all text-xs text-slate-500">{user.email}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span
                      className={`inline-block rounded px-3 py-1 text-xs font-medium capitalize ${
                        user.role === 'admin' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'
                      }`}
                    >
                      {user.role}
                    </span>
                    <span
                      className={`inline-block rounded px-3 py-1 text-xs font-medium capitalize ${
                        user.isBlocked ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
                      }`}
                    >
                      {user.isBlocked ? 'Blocked' : 'Active'}
                    </span>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl bg-slate-800/70 p-3">
                    <p className="text-xs text-slate-400">Phone</p>
                    <p className="mt-1 break-all text-slate-200">{user.phoneNumber || '-'}</p>
                  </div>
                  <div className="rounded-xl bg-slate-800/70 p-3">
                    <p className="text-xs text-slate-400">Joined</p>
                    <p className="mt-1 text-slate-200">
                      {new Date(user.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-800/70 p-3">
                    <p className="text-xs text-slate-400">USD Wallet</p>
                    <p className="mt-1 font-semibold text-emerald-300">${Number(user.walletBalance?.usd || 0).toFixed(2)}</p>
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-white/10 bg-slate-800/40 p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">User Percent</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={pricingInputs[user._id] ?? String(Number(user.pricingPercent || 0))}
                      onChange={(e) =>
                        setPricingInputs((prev) => ({ ...prev, [user._id]: e.target.value }))
                      }
                      className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-white"
                    />
                    <button
                      onClick={() => handleSaveUserPercent(user._id)}
                      disabled={processingId === user._id}
                      className="rounded-xl bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      Save
                    </button>
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-white/10 bg-slate-800/40 p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Wallet Adjustment</p>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={walletDirectionInputs[user._id] || 'add'}
                      onChange={(e) =>
                        setWalletDirectionInputs((prev) => ({
                          ...prev,
                          [user._id]: e.target.value as 'add' | 'deduct',
                        }))
                      }
                      className="rounded-xl border border-white/10 bg-slate-900 px-2 py-2 text-xs text-white"
                    >
                      <option value="add">Add</option>
                      <option value="deduct">Deduct</option>
                    </select>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Amount"
                      value={walletAmountInputs[user._id] ?? ''}
                      onChange={(e) =>
                        setWalletAmountInputs((prev) => ({ ...prev, [user._id]: e.target.value }))
                      }
                      className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white"
                    />
                    <div className="flex items-center justify-center rounded-xl border border-white/10 bg-slate-900 px-2 py-2 text-xs font-semibold text-cyan-200">
                      USD
                    </div>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <input
                      type="text"
                      placeholder="Reason"
                      value={walletNoteInputs[user._id] ?? ''}
                      onChange={(e) =>
                        setWalletNoteInputs((prev) => ({ ...prev, [user._id]: e.target.value }))
                      }
                      className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white"
                    />
                    <button
                      onClick={() => handleWalletAdjustment(user._id)}
                      disabled={processingId === user._id}
                      className="rounded-xl bg-amber-600 px-4 py-2 text-xs text-white hover:bg-amber-700 disabled:opacity-50"
                    >
                      Apply
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => handleBlockToggle(user._id, user.isBlocked)}
                  disabled={processingId === user._id}
                  className={`mt-4 w-full rounded-xl px-3 py-3 text-sm font-medium ${
                    user.isBlocked
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : 'bg-red-600 hover:bg-red-700 text-white'
                  } disabled:opacity-50`}
                >
                  {processingId === user._id ? 'Processing...' : user.isBlocked ? 'Unblock User' : 'Block User'}
                </button>

                <button
                  onClick={() => openProductDiscountEditor(user)}
                  className="mt-2 w-full rounded-xl bg-cyan-600 px-3 py-2 text-sm font-medium text-white hover:bg-cyan-700"
                >
                  Product Discounts
                </button>
              </div>
            ))}
          </div>

          <div className="hidden overflow-x-auto rounded-lg border border-white/10 bg-slate-900 md:block">
            <table className="w-full text-sm">
              <thead className="border-b border-white/10 bg-slate-800">
                <tr className="text-left text-slate-300">
                  <th className="px-6 py-4 font-semibold">User</th>
                  <th className="px-6 py-4 font-semibold">Email</th>
                  <th className="px-6 py-4 font-semibold">Phone</th>
                  <th className="px-6 py-4 font-semibold">Role</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold">Wallet</th>
                  <th className="px-6 py-4 font-semibold">User %</th>
                  <th className="px-6 py-4 font-semibold">Joined</th>
                  <th className="px-6 py-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredUsers.map((user) => (
                  <tr key={user._id} className="hover:bg-slate-800/50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-white">{user.displayName}</div>
                        <div className="text-slate-400">@{user.username}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-300">{user.email}</td>
                    <td className="px-6 py-4 text-slate-300">{user.phoneNumber || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-block rounded px-3 py-1 text-xs font-medium capitalize ${
                        user.role === 'admin' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block rounded px-3 py-1 text-xs font-medium capitalize ${
                        user.isBlocked ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
                      }`}>
                        {user.isBlocked ? 'Blocked' : 'Active'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-300">
                      <div className="space-y-1">
                        <div>USD: ${Number(user.walletBalance?.usd || 0).toFixed(2)}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={pricingInputs[user._id] ?? String(Number(user.pricingPercent || 0))}
                          onChange={(e) =>
                            setPricingInputs((prev) => ({ ...prev, [user._id]: e.target.value }))
                          }
                          className="w-20 rounded border border-white/10 bg-slate-800 px-2 py-1 text-white"
                        />
                        <button
                          onClick={() => handleSaveUserPercent(user._id)}
                          disabled={processingId === user._id}
                          className="rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                          Save
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-400">
                      {new Date(user.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-2">
                        <button
                          onClick={() => handleBlockToggle(user._id, user.isBlocked)}
                          disabled={processingId === user._id}
                          className={`px-3 py-1 rounded text-sm ${
                            user.isBlocked
                              ? 'bg-green-600 hover:bg-green-700 text-white'
                              : 'bg-red-600 hover:bg-red-700 text-white'
                          } disabled:opacity-50`}
                        >
                          {processingId === user._id ? 'Processing...' : user.isBlocked ? 'Unblock' : 'Block'}
                        </button>

                        <button
                          onClick={() => openProductDiscountEditor(user)}
                          className="rounded bg-cyan-600 px-3 py-1 text-sm text-white hover:bg-cyan-700"
                        >
                          Product Discounts
                        </button>

                        <div className="flex items-center gap-2">
                          <select
                            value={walletDirectionInputs[user._id] || 'add'}
                            onChange={(e) =>
                              setWalletDirectionInputs((prev) => ({
                                ...prev,
                                [user._id]: e.target.value as 'add' | 'deduct',
                              }))
                            }
                            className="rounded border border-white/10 bg-slate-800 px-2 py-1 text-xs text-white"
                          >
                            <option value="add">Add</option>
                            <option value="deduct">Deduct</option>
                          </select>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="Amount"
                            value={walletAmountInputs[user._id] ?? ''}
                            onChange={(e) =>
                              setWalletAmountInputs((prev) => ({ ...prev, [user._id]: e.target.value }))
                            }
                            className="w-24 rounded border border-white/10 bg-slate-800 px-2 py-1 text-xs text-white"
                          />
                          <div className="rounded border border-white/10 bg-slate-800 px-2 py-1 text-xs font-semibold text-cyan-200">
                            USD
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="Reason"
                            value={walletNoteInputs[user._id] ?? ''}
                            onChange={(e) =>
                              setWalletNoteInputs((prev) => ({ ...prev, [user._id]: e.target.value }))
                            }
                            className="w-44 rounded border border-white/10 bg-slate-800 px-2 py-1 text-xs text-white"
                          />
                          <button
                            onClick={() => handleWalletAdjustment(user._id)}
                            disabled={processingId === user._id}
                            className="rounded bg-amber-600 px-2 py-1 text-xs text-white hover:bg-amber-700 disabled:opacity-50"
                          >
                            Apply Wallet
                          </button>
                        </div>
                      </div>
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

      {discountEditorUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-white/10 bg-slate-900 p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Product Discounts - {discountEditorUser.displayName}
                </h2>
                <p className="text-xs text-slate-400">
                  Set custom discount per product (0 to remove / fallback to user percent)
                </p>
              </div>
              <button
                onClick={() => setDiscountEditorUser(null)}
                className="rounded-lg border border-white/10 px-3 py-1 text-sm text-slate-200 hover:bg-slate-800"
              >
                Close
              </button>
            </div>

            <div className="mb-3">
              <input
                type="text"
                value={discountSearch}
                onChange={(e) => setDiscountSearch(e.target.value)}
                placeholder="Search product by name / slug / category..."
                className="w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-400"
              />
            </div>

            {discountLoading ? (
              <div className="rounded-lg border border-white/10 bg-slate-800/50 p-5 text-center text-slate-300">
                Loading products...
              </div>
            ) : (
              <div className="space-y-2">
                {filteredDiscountCatalog.map((item) => (
                  <div
                    key={item.slug}
                    className="grid grid-cols-1 gap-2 rounded-lg border border-white/10 bg-slate-800/40 p-3 sm:grid-cols-[minmax(0,1fr)_160px] sm:items-center"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">{item.name}</p>
                      <p className="truncate text-xs text-slate-400">
                        {item.slug}{item.category ? ` â€¢ ${item.category}` : ''}
                      </p>
                    </div>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={discountValues[item.slug] ?? ''}
                      onChange={(e) =>
                        setDiscountValues((prev) => ({
                          ...prev,
                          [item.slug]: e.target.value,
                        }))
                      }
                      placeholder="0 - 100"
                      className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white"
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                onClick={() => setDiscountEditorUser(null)}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProductDiscounts}
                disabled={discountSaving || discountLoading}
                className="rounded-lg bg-cyan-600 px-4 py-2 text-sm text-white hover:bg-cyan-700 disabled:opacity-50"
              >
                {discountSaving ? 'Saving...' : 'Save Discounts'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}



