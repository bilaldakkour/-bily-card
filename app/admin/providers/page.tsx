'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { buildAdminAuthHeaders, getAdminTokenOptional, isUnauthorizedStatus } from '@/lib/utils/adminAuth'

type ProviderOverview = {
  providerKey: string
  slot: 'primary' | 'secondary'
  adapter: string
  enabled: boolean
  availability: string
  providerStatus?: 'ok' | 'timeout' | 'http_error' | 'network_error' | 'invalid_response' | 'unavailable'
  providerStatusMessage?: string
  balance: number | null
  mappedProducts: number
  totalMappings: number
  orders: number
  successRate: number
  failureRate: number
  fallbackUsage: number
  avgResponseMs: number
  lastSyncAt: string | null
}

type SyncResult = {
  mode: string
  synced: number
  updated: number
  mapped: number
  providers: string[]
  durationMs: number
  syncErrors?: number
}

export default function AdminProvidersPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<ProviderOverview[]>([])
  const [message, setMessage] = useState('')
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null)
  const [processingKey, setProcessingKey] = useState('')
  const [slotFilter, setSlotFilter] = useState<'all' | 'primary' | 'secondary'>('all')

  const providerStatusTone = (status?: ProviderOverview['providerStatus']) => {
    if (status === 'ok') return 'bg-emerald-500/15 text-emerald-300'
    if (status === 'timeout') return 'bg-amber-500/15 text-amber-300'
    if (status === 'http_error') return 'bg-rose-500/15 text-rose-300'
    if (status === 'network_error' || status === 'invalid_response' || status === 'unavailable') {
      return 'bg-slate-500/15 text-slate-300'
    }
    return 'bg-slate-500/15 text-slate-300'
  }

  const loadOverview = async () => {
    const token = getAdminTokenOptional()
    setLoading(true)
    const controller = new AbortController()
    const timeoutRef = setTimeout(() => controller.abort(), 12000)
    try {
      const res = await fetch('/api/admin/providers/overview', {
        headers: buildAdminAuthHeaders(token),
        signal: controller.signal,
      })
      if (isUnauthorizedStatus(res.status)) {
        router.push('/admin/login')
        return
      }
      const data = await res.json()
      if (data?.success) {
        setItems(Array.isArray(data.data) ? data.data : [])
      } else {
        setMessage(data?.message || 'Failed to load providers overview')
      }
    } catch {
      setMessage('Providers overview request timeout or failed')
    } finally {
      clearTimeout(timeoutRef)
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadOverview()
  }, [router])

  const filteredItems = useMemo(() => {
    return items.filter((item) => (slotFilter === 'all' ? true : item.slot === slotFilter))
  }, [items, slotFilter])

  const runProviderAction = async (input: { slot: 'primary' | 'secondary'; adapter: string }) => {
    const token = getAdminTokenOptional()
    setProcessingKey(`${input.slot}:${input.adapter}:test`)
    setMessage('')
    try {
      const res = await fetch('/api/admin/providers/overview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(buildAdminAuthHeaders(token) || {}),
        },
        body: JSON.stringify({
          action: 'test_connection',
          slot: input.slot,
          adapter: input.adapter,
        }),
      })
      if (isUnauthorizedStatus(res.status)) {
        router.push('/admin/login')
        return
      }
      const data = await res.json()
      if (data?.success) {
        setMessage(
          data?.data?.ok
            ? `Connection test ok (${data.data.durationMs}ms, products: ${data.data.productsVisible})`
            : data?.data?.message || 'Connection test failed'
        )
      } else {
        setMessage(data?.message || 'Connection test failed')
      }
    } catch {
      setMessage('Connection test failed')
    } finally {
      setProcessingKey('')
    }
  }

  const runSync = async (mode: 'all' | 'mappings_only' | 'costs_only' | 'stock_only', slot?: string) => {
    const token = getAdminTokenOptional()
    setProcessingKey(`sync:${mode}:${slot || 'all'}`)
    setMessage('')
    setSyncResult(null)

    const doSyncCall = async (targetSlot?: 'primary' | 'secondary') => {
      const controller = new AbortController()
      const timeoutRef = setTimeout(() => controller.abort(), 90_000)
      try {
        const res = await fetch('/api/admin/products/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(buildAdminAuthHeaders(token) || {}),
          },
          signal: controller.signal,
          body: JSON.stringify({
            mode,
            ...(targetSlot ? { providerSlot: targetSlot } : {}),
          }),
        })
        return res
      } finally {
        clearTimeout(timeoutRef)
      }
    }

    try {
      if (!slot && mode === 'all') {
        // Avoid long-running single request that can appear stuck in the browser.
        const [primaryRes, secondaryRes] = await Promise.all([
          doSyncCall('primary'),
          doSyncCall('secondary'),
        ])

        if (isUnauthorizedStatus(primaryRes.status) || isUnauthorizedStatus(secondaryRes.status)) {
          router.push('/admin/login')
          return
        }

        const primaryData = await primaryRes.json().catch(() => null)
        const secondaryData = await secondaryRes.json().catch(() => null)

        const okPrimary = Boolean(primaryData?.success)
        const okSecondary = Boolean(secondaryData?.success)

        const merged: SyncResult = {
          mode: 'all',
          synced: Number(primaryData?.data?.synced || 0) + Number(secondaryData?.data?.synced || 0),
          updated: Number(primaryData?.data?.updated || 0) + Number(secondaryData?.data?.updated || 0),
          mapped: Number(primaryData?.data?.mapped || 0) + Number(secondaryData?.data?.mapped || 0),
          providers: [
            ...(Array.isArray(primaryData?.data?.providers) ? primaryData.data.providers : []),
            ...(Array.isArray(secondaryData?.data?.providers) ? secondaryData.data.providers : []),
          ],
          durationMs:
            Number(primaryData?.data?.durationMs || 0) + Number(secondaryData?.data?.durationMs || 0),
          syncErrors:
            Number(primaryData?.data?.syncErrors || 0) + Number(secondaryData?.data?.syncErrors || 0),
        }

        if (okPrimary || okSecondary) {
          setSyncResult(merged)
          if (!okPrimary && okSecondary) {
            setMessage(primaryData?.message || 'Primary sync failed, secondary completed')
          } else if (okPrimary && !okSecondary) {
            setMessage(secondaryData?.message || 'Secondary sync failed, primary completed')
          } else {
            setMessage('Sync completed successfully')
          }
          await loadOverview()
        } else {
          setMessage(primaryData?.message || secondaryData?.message || 'Sync failed')
        }
      } else {
        const res = await doSyncCall(slot as 'primary' | 'secondary' | undefined)
        if (isUnauthorizedStatus(res.status)) {
          router.push('/admin/login')
          return
        }
        const data = await res.json()
        if (data?.success) {
          setSyncResult(data.data || null)
          setMessage('Sync completed successfully')
          await loadOverview()
        } else {
          setMessage(data?.message || 'Sync failed')
        }
      }
    } catch {
      setMessage('Sync timeout or failed')
    } finally {
      setProcessingKey('')
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4 sm:p-5">
        <h1 className="text-xl font-bold text-white sm:text-2xl">Providers Control Center</h1>
        <p className="mt-1 text-sm text-slate-400">
          Internal provider operations, sync controls, and connection checks.
        </p>
      </div>

      {message ? (
        <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100">
          {message}
        </div>
      ) : null}

      <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <button
            onClick={() => setSlotFilter('all')}
            className={`rounded-lg px-3 py-2 text-xs font-medium ${slotFilter === 'all' ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-200'}`}
          >
            All slots
          </button>
          <button
            onClick={() => setSlotFilter('primary')}
            className={`rounded-lg px-3 py-2 text-xs font-medium ${slotFilter === 'primary' ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-200'}`}
          >
            Primary
          </button>
          <button
            onClick={() => setSlotFilter('secondary')}
            className={`rounded-lg px-3 py-2 text-xs font-medium ${slotFilter === 'secondary' ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-200'}`}
          >
            Secondary
          </button>
        </div>

        {loading ? (
          <p className="text-slate-400">Loading...</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {filteredItems.map((item) => (
              <div key={item.providerKey} className="rounded-xl border border-white/10 bg-slate-800/70 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">{item.slot.toUpperCase()} / {item.adapter}</p>
                    <p className={`mt-1 text-xs ${item.enabled ? 'text-emerald-300' : 'text-rose-300'}`}>
                      {item.enabled ? 'Enabled' : 'Disabled'}
                    </p>
                    <p className={`mt-1 inline-flex rounded px-2 py-1 text-[11px] ${providerStatusTone(item.providerStatus)}`}>
                      {item.providerStatus || 'unavailable'}
                    </p>
                    {item.providerStatusMessage ? (
                      <p className="mt-1 text-[11px] text-slate-400">{item.providerStatusMessage}</p>
                    ) : null}
                  </div>
                  <button
                    onClick={() => runProviderAction({ slot: item.slot, adapter: item.adapter })}
                    disabled={processingKey === `${item.slot}:${item.adapter}:test`}
                    className="rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white hover:bg-slate-700 disabled:opacity-50"
                  >
                    Test
                  </button>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-300">
                  <p>Mapped: <span className="text-white">{item.mappedProducts}</span></p>
                  <p>Orders: <span className="text-white">{item.orders}</span></p>
                  <p>Success: <span className="text-emerald-300">{item.successRate}%</span></p>
                  <p>Failure: <span className="text-rose-300">{item.failureRate}%</span></p>
                  <p>Fallback: <span className="text-amber-300">{item.fallbackUsage}%</span></p>
                  <p>Avg RT: <span className="text-cyan-300">{item.avgResponseMs || 0}ms</span></p>
                  <p>Balance: <span className="text-white">{item.balance == null ? 'n/a' : `$${item.balance}`}</span></p>
                  <p>Last Sync: <span className="text-white">{item.lastSyncAt ? new Date(item.lastSyncAt).toLocaleString() : 'n/a'}</span></p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4">
        <h2 className="mb-3 text-base font-semibold text-white">Sync Controls</h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <button onClick={() => runSync('all')} disabled={processingKey.startsWith('sync:')} className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white disabled:opacity-50">Sync all providers</button>
          <button onClick={() => runSync('all', 'primary')} disabled={processingKey.startsWith('sync:')} className="rounded-lg bg-slate-700 px-3 py-2 text-sm text-white disabled:opacity-50">Sync primary</button>
          <button onClick={() => runSync('all', 'secondary')} disabled={processingKey.startsWith('sync:')} className="rounded-lg bg-slate-700 px-3 py-2 text-sm text-white disabled:opacity-50">Sync secondary</button>
          <button onClick={() => runSync('mappings_only')} disabled={processingKey.startsWith('sync:')} className="rounded-lg bg-slate-700 px-3 py-2 text-sm text-white disabled:opacity-50">Sync mappings only</button>
          <button onClick={() => runSync('costs_only')} disabled={processingKey.startsWith('sync:')} className="rounded-lg bg-slate-700 px-3 py-2 text-sm text-white disabled:opacity-50">Refresh costs only</button>
          <button onClick={() => runSync('stock_only')} disabled={processingKey.startsWith('sync:')} className="rounded-lg bg-slate-700 px-3 py-2 text-sm text-white disabled:opacity-50">Refresh stock only</button>
        </div>

        {syncResult ? (
          <div className="mt-3 rounded-lg border border-white/10 bg-slate-800/60 p-3 text-xs text-slate-200">
            <p>Mode: {syncResult.mode}</p>
            <p>Synced: {syncResult.synced} | Updated: {syncResult.updated} | Mapped: {syncResult.mapped}</p>
            <p>Providers: {syncResult.providers.join(', ')}</p>
            <p>Duration: {syncResult.durationMs}ms</p>
          </div>
        ) : null}
      </div>
    </div>
  )
}
