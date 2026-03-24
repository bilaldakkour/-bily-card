'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { buildAdminAuthHeaders, getAdminTokenOptional, isUnauthorizedStatus } from '@/lib/utils/adminAuth'

export default function AdminDiagnosticsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [data, setData] = useState<any>(null)
  const [days, setDays] = useState(7)
  const [dryRunInput, setDryRunInput] = useState({
    slug: '',
    productId: '',
    productName: '',
    quantity: 1,
    providerMode: 'primary',
  })
  const [dryRunResult, setDryRunResult] = useState<any>(null)

  const loadDiagnostics = async (windowDays = days) => {
    const token = getAdminTokenOptional()
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/providers/diagnostics?days=${windowDays}`, {
        headers: buildAdminAuthHeaders(token),
      })
      if (isUnauthorizedStatus(res.status)) {
        router.push('/admin/login')
        return
      }
      const payload = await res.json()
      if (payload?.success) {
        setData(payload.data || null)
      } else {
        setMessage(payload?.message || 'Failed to load diagnostics')
      }
    } catch {
      setMessage('Failed to load diagnostics')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadDiagnostics(7)
  }, [])

  const runDryRun = async () => {
    const token = getAdminTokenOptional()
    setDryRunResult(null)
    setMessage('')
    try {
      const res = await fetch('/api/admin/providers/diagnostics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(buildAdminAuthHeaders(token) || {}),
        },
        body: JSON.stringify(dryRunInput),
      })
      if (isUnauthorizedStatus(res.status)) {
        router.push('/admin/login')
        return
      }
      const payload = await res.json()
      if (payload?.success) {
        setDryRunResult(payload.data || null)
      } else {
        setMessage(payload?.message || 'Dry-run failed')
      }
    } catch {
      setMessage('Dry-run failed')
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4 sm:p-5">
        <h1 className="text-xl font-bold text-white sm:text-2xl">Diagnostics & Profit Monitor</h1>
        <p className="mt-1 text-sm text-slate-400">Provider observability, routing diagnostics, and margin health.</p>
      </div>

      {message ? <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100">{message}</div> : null}

      <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <select value={days} onChange={(e) => setDays(Number(e.target.value || 7))} className="rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white">
            <option value={1}>Today</option>
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
          </select>
          <button onClick={() => loadDiagnostics(days)} className="rounded-lg bg-cyan-600 px-3 py-2 text-sm text-white">Refresh</button>
        </div>

        {loading ? (
          <p className="text-slate-400">Loading...</p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-white/10 bg-slate-800/70 p-3 text-sm text-slate-200">Orders: <span className="text-white">{data?.totals?.orders || 0}</span></div>
              <div className="rounded-xl border border-white/10 bg-slate-800/70 p-3 text-sm text-slate-200">Providers: <span className="text-white">{(data?.totals?.providers || []).length}</span></div>
              <div className="rounded-xl border border-white/10 bg-slate-800/70 p-3 text-sm text-slate-200">Mappings: <span className="text-white">{data?.totals?.mappingRows || 0}</span></div>
              <div className="rounded-xl border border-white/10 bg-slate-800/70 p-3 text-sm text-slate-200">Low Margin Orders: <span className="text-amber-300">{(data?.lowMarginOrders || []).length}</span></div>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="border-b border-white/10 text-slate-300">
                  <tr>
                    <th className="px-3 py-2 text-left">Provider</th>
                    <th className="px-3 py-2 text-left">Orders</th>
                    <th className="px-3 py-2 text-left">Success %</th>
                    <th className="px-3 py-2 text-left">Failure %</th>
                    <th className="px-3 py-2 text-left">Fallback %</th>
                    <th className="px-3 py-2 text-left">Avg RT</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(data?.providerStats || {}).map(([key, stat]: [string, any]) => (
                    <tr key={key} className="border-b border-white/5">
                      <td className="px-3 py-2 font-mono text-cyan-300">{key}</td>
                      <td className="px-3 py-2 text-white">{stat.total}</td>
                      <td className="px-3 py-2 text-emerald-300">{stat.successRate ?? stat.success}</td>
                      <td className="px-3 py-2 text-rose-300">{stat.failureRate ?? stat.failed}</td>
                      <td className="px-3 py-2 text-amber-300">{stat.fallbackUsage}</td>
                      <td className="px-3 py-2 text-slate-200">{stat.avgResponseMs}ms</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4">
        <h2 className="mb-3 text-base font-semibold text-white">Controlled Dry-Run</h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <input placeholder="slug" value={dryRunInput.slug} onChange={(e) => setDryRunInput((p) => ({ ...p, slug: e.target.value }))} className="rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white" />
          <input placeholder="productId" value={dryRunInput.productId} onChange={(e) => setDryRunInput((p) => ({ ...p, productId: e.target.value }))} className="rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white" />
          <input placeholder="productName" value={dryRunInput.productName} onChange={(e) => setDryRunInput((p) => ({ ...p, productName: e.target.value }))} className="rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white" />
          <input type="number" min={1} value={dryRunInput.quantity} onChange={(e) => setDryRunInput((p) => ({ ...p, quantity: Number(e.target.value || 1) }))} className="rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white" />
          <select value={dryRunInput.providerMode} onChange={(e) => setDryRunInput((p) => ({ ...p, providerMode: e.target.value }))} className="rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white">
            <option value="primary">primary</option>
            <option value="secondary">secondary</option>
            <option value="manual">manual</option>
          </select>
        </div>
        <button onClick={runDryRun} className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white">Run Dry-Run</button>

        {dryRunResult ? (
          <div className="mt-3 rounded-lg border border-white/10 bg-slate-800/60 p-3 text-xs text-slate-200">
            <p>Selection reason: {dryRunResult.selectionReason}</p>
            <p className="mt-1">Candidates: {(dryRunResult.simulatedCandidates || []).length}</p>
            <div className="mt-2 space-y-1">
              {(dryRunResult.simulatedCandidates || []).map((item: any) => (
                <p key={`${item.providerSlot}-${item.providerProductId}`}>
                  {item.order}. {item.providerSlot}/{item.providerAdapterKey} | cost={item.unitCost} | selected={String(item.wouldBeSelected)} | req={item.requirements?.requiresExtraInput ? 'extra' : 'playerId_only'}
                </p>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
