import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/auth/middleware'
import { connectDB } from '@/lib/db/mongodb'
import ProductProviderMapping from '@/lib/models/ProductProviderMapping'
import Order from '@/lib/models/Order'
import { getProviderAdapters, getProviderAdapterBySlotAndKey } from '@/lib/providers/registry'
import {
  computeProviderHealthSnapshot,
  setProviderManualEnabled,
} from '@/lib/providers/health'
import type { ProviderAdapter, ProviderConnectionProbeResult } from '@/lib/providers/types'

type ProviderConnectionState = 'ok' | 'timeout' | 'http_error' | 'network_error' | 'invalid_response' | 'unavailable'

function classifyProviderProbe(result?: ProviderConnectionProbeResult) {
  if (!result) {
    return {
      state: 'unavailable' as ProviderConnectionState,
      message: 'Provider check unavailable',
    }
  }

  const details = (result.details || {}) as { status?: unknown; code?: unknown; message?: unknown }
  const status = Number(details.status || 0)
  const code = String(details.code || '').toLowerCase()
  const message = String(result.message || details.message || '').toLowerCase()

  if (result.ok && (result.profileOk ?? true)) {
    return {
      state: 'ok' as ProviderConnectionState,
      message: result.message || 'Provider operational',
    }
  }

  if (message.includes('timeout') || code.includes('abort') || code === 'econnaborted') {
    return {
      state: 'timeout' as ProviderConnectionState,
      message: result.message || 'Provider timeout',
    }
  }

  if (code === 'invalid_response' || message.includes('invalid')) {
    return {
      state: 'invalid_response' as ProviderConnectionState,
      message: result.message || 'Invalid provider response',
    }
  }

  if (status >= 400) {
    return {
      state: 'http_error' as ProviderConnectionState,
      message: result.message || `HTTP ${status}`,
    }
  }

  return {
    state: 'network_error' as ProviderConnectionState,
    message: result.message || 'Provider unavailable',
  }
}

function logProviderProbeFailure(params: {
  providerKey: string
  stage: string
  result?: ProviderConnectionProbeResult
  error?: unknown
}) {
  const details = (params.result?.details || {}) as { status?: unknown; code?: unknown; message?: unknown }
  const statusCode = Number(details.status || 0) || undefined
  const errorCode = String(details.code || (params.error as any)?.code || '') || undefined
  const message =
    String(details.message || params.result?.message || (params.error as any)?.message || '') || undefined
  const state = classifyProviderProbe(params.result).state

  console.warn('Admin provider probe issue', {
    providerKey: params.providerKey,
    stage: params.stage,
    state,
    statusCode,
    errorCode,
    message,
  })
}

async function buildProviderOverviewItem(params: {
  adapter: ProviderAdapter
  bySlot: Map<string, any[]>
  orders: any[]
  healthSnapshot: Record<string, any>
}) {
  const { adapter, bySlot, orders, healthSnapshot } = params
  const slot = adapter.slot
  const slotMappings = bySlot.get(slot) || []
  const activeMappings = slotMappings.filter((row) => row?.active !== false)

  const providerKey = `${slot}:${adapter.key}`
  const health = healthSnapshot[providerKey]
  const providerOrders = orders.filter((row) => {
    const rowSlot = String(row?.providerSlot || '')
    const rowAdapter = String(row?.providerResponse?._providerAdapter || '').toLowerCase()
    return rowSlot === slot && rowAdapter === adapter.key
  })
  const success = providerOrders.filter((row) => String(row?.status || '') === 'completed').length
  const failed = providerOrders.filter((row) =>
    ['failed', 'refunded', 'rejected'].includes(String(row?.status || ''))
  ).length
  const fallback = providerOrders.filter(
    (row) => Boolean(row?.providerResponse?._routingMeta?.fallbackUsed)
  ).length

  let avgResponseMs = 0
  const timings = providerOrders
    .map((row) => Number(row?.providerResponse?._timingMs || 0))
    .filter((v) => Number.isFinite(v) && v > 0)
  if (timings.length > 0) {
    avgResponseMs = Number((timings.reduce((a, b) => a + b, 0) / timings.length).toFixed(2))
  }

  let balance: number | null = null
  let providerStatus: ProviderConnectionState = adapter.isAvailable() ? 'ok' : 'unavailable'
  let providerStatusMessage = adapter.isAvailable() ? 'Provider available' : 'Provider unavailable'

  if (adapter.isAvailable()) {
    if (adapter.key === 'go4card' && adapter.testConnection) {
      const probe = await adapter.testConnection()
      const classified = classifyProviderProbe(probe)
      providerStatus = classified.state
      providerStatusMessage = classified.message
      if (classified.state !== 'ok') {
        logProviderProbeFailure({
          providerKey,
          stage: 'overview_test_connection',
          result: probe,
        })
      }
    } else if (adapter.fetchProfile) {
      try {
        const profile = await adapter.fetchProfile()
        balance =
          profile && Number.isFinite(Number(profile.balance))
            ? Number(profile.balance)
            : null
      } catch (error) {
        providerStatus = 'network_error'
        providerStatusMessage = 'Profile check failed'
        logProviderProbeFailure({
          providerKey,
          stage: 'overview_profile',
          error,
        })
      }
    }
  }

  const lastSync = slotMappings
    .map((row) => (row?.updatedAt ? new Date(row.updatedAt).getTime() : 0))
    .reduce((max, ts) => Math.max(max, ts), 0)

  return {
    providerKey,
    slot,
    adapter: adapter.key,
    enabled: adapter.isAvailable(),
    operational:
      adapter.isAvailable() &&
      !Boolean(health?.autoDisabled) &&
      health?.manualEnabled !== false,
    availability: adapter.isAvailable() ? 'available' : 'disabled',
    providerStatus,
    providerStatusMessage,
    balance,
    mappedProducts: new Set(activeMappings.map((row) => String(row?.internalSlug || ''))).size,
    totalMappings: slotMappings.length,
    orders: providerOrders.length,
    successRate: Number(health?.successRate ?? (providerOrders.length > 0
      ? Number(((success / providerOrders.length) * 100).toFixed(2))
      : 0)),
    failureRate: Number(health?.failureRate ?? (providerOrders.length > 0
      ? Number(((failed / providerOrders.length) * 100).toFixed(2))
      : 0)),
    fallbackUsage: Number(health?.fallbackUsage ?? (providerOrders.length > 0
      ? Number(((fallback / providerOrders.length) * 100).toFixed(2))
      : 0)),
    avgResponseMs: Number(health?.avgResponseMs ?? avgResponseMs),
    autoDisabled: Boolean(health?.autoDisabled),
    autoDisabledReason: Boolean(health?.autoDisabled) ? 'failure_rate_over_threshold' : '',
    lastSyncAt: lastSync > 0 ? new Date(lastSync).toISOString() : null,
  }
}

async function getHandler() {
  try {
    await connectDB()

    const adapters = getProviderAdapters()
    const mappings = await ProductProviderMapping.find({})
      .select('internalSlug providerSlot active updatedAt')
      .lean()
    const orders = await Order.find({})
      .select('providerSlot providerResponse status createdAt')
      .sort({ createdAt: -1 })
      .limit(5000)
      .lean()

    const bySlot = new Map<string, any[]>()
    for (const row of mappings as any[]) {
      const slot = String(row?.providerSlot || '').toLowerCase()
      if (!bySlot.has(slot)) bySlot.set(slot, [])
      bySlot.get(slot)!.push(row)
    }

    const healthSnapshot = await computeProviderHealthSnapshot({ forceRefresh: true })
    const settled = await Promise.allSettled(
      adapters.map(async (adapter) => {
        return buildProviderOverviewItem({
          adapter,
          bySlot,
          orders: orders as any[],
          healthSnapshot,
        })
      })
    )

    const response = settled.map((entry, index) => {
      const fallbackAdapter = adapters[index]
      if (entry.status === 'fulfilled') {
        return entry.value
      }

      const providerKey = `${fallbackAdapter.slot}:${fallbackAdapter.key}`
      logProviderProbeFailure({
        providerKey,
        stage: 'overview_all_settled',
        error: entry.reason,
      })

      return {
        providerKey,
        slot: fallbackAdapter.slot,
        adapter: fallbackAdapter.key,
        enabled: fallbackAdapter.isAvailable(),
        operational: false,
        availability: fallbackAdapter.isAvailable() ? 'available' : 'disabled',
        providerStatus: 'unavailable' as ProviderConnectionState,
        providerStatusMessage: 'Provider check failed, fallback applied',
        balance: null,
        mappedProducts: 0,
        totalMappings: 0,
        orders: 0,
        successRate: 0,
        failureRate: 0,
        fallbackUsage: 0,
        avgResponseMs: 0,
        autoDisabled: false,
        autoDisabledReason: '',
        lastSyncAt: null,
      }
    })

    return NextResponse.json({ success: true, data: response })
  } catch (error) {
    console.error('Admin provider overview GET error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to load provider overview' },
      { status: 500 }
    )
  }
}

async function postHandler(req: NextRequest) {
  try {
    const body = await req.json()
    const action = String(body?.action || '').trim().toLowerCase()
    const slot = String(body?.slot || '').trim().toLowerCase() as 'primary' | 'secondary'
    const key = String(body?.adapter || '').trim().toLowerCase()

    if (!['test_connection', 'toggle_enabled'].includes(action)) {
      return NextResponse.json(
        { success: false, message: 'Unsupported action' },
        { status: 400 }
      )
    }

    if (!['primary', 'secondary'].includes(slot)) {
      return NextResponse.json(
        { success: false, message: 'Invalid provider slot' },
        { status: 400 }
      )
    }

    if (action === 'toggle_enabled') {
      if (!key) {
        return NextResponse.json(
          { success: false, message: 'adapter is required for toggle action' },
          { status: 400 }
        )
      }
      const value = body?.enabled
      if (typeof value !== 'boolean') {
        return NextResponse.json(
          { success: false, message: 'enabled must be boolean' },
          { status: 400 }
        )
      }
      await setProviderManualEnabled({
        slot,
        adapterKey: key,
        enabled: value,
      })
      return NextResponse.json({
        success: true,
        data: {
          slot,
          adapter: key || null,
          enabled: value,
        },
      })
    }

    const adapter = getProviderAdapterBySlotAndKey({ slot, key })
    if (!adapter || !adapter.isAvailable()) {
      return NextResponse.json({
        success: true,
        data: {
          slot,
          adapter: key || null,
          ok: false,
          message: 'Provider is disabled or missing credentials',
        },
      })
    }

    const startedAt = Date.now()
    try {
      if (adapter.testConnection) {
        const result = await adapter.testConnection()
        const classified = classifyProviderProbe(result)
        if (classified.state !== 'ok') {
          logProviderProbeFailure({
            providerKey: `${slot}:${adapter.key}`,
            stage: 'post_test_connection',
            result,
          })
        }
        return NextResponse.json({
          success: true,
          data: {
            slot,
            adapter: adapter.key,
            ok: Boolean(result.ok),
            profileOk: Boolean(result.profileOk),
            productsProbeOk: Boolean(result.productsProbeOk),
            productsSlow: Boolean(result.productsSlow),
            productsVisible: Number(result.productsVisible || 0),
            durationMs: Number(result.durationMs || Date.now() - startedAt),
            message: result.message || (result.ok ? 'Connection OK' : 'Connection failed'),
            providerStatus: classified.state,
            details: result.details || {},
          },
        })
      }

      const sample = await adapter.fetchProducts()
      return NextResponse.json({
        success: true,
        data: {
          slot,
          adapter: adapter.key,
          ok: true,
          profileOk: false,
          productsProbeOk: true,
          productsSlow: false,
          durationMs: Date.now() - startedAt,
          productsVisible: sample.length,
          message: 'Connection OK',
        },
      })
    } catch (error: any) {
      const status = Number(error?.response?.status || 0)
      const code = String(error?.code || '')
      const msg = String(error?.message || '').toLowerCase()
      const isTimeout = msg.includes('timeout') || code === 'ECONNABORTED'
      const isAuth = status === 401 || status === 403
      console.warn('Admin provider test connection failed', {
        providerKey: `${slot}:${adapter.key}`,
        statusCode: status || undefined,
        errorCode: code || undefined,
        message: String(error?.message || ''),
      })

      return NextResponse.json({
        success: true,
        data: {
          slot,
          adapter: adapter.key,
          ok: false,
          profileOk: false,
          productsProbeOk: false,
          productsSlow: isTimeout,
          durationMs: Date.now() - startedAt,
          message: isAuth
            ? 'Authentication failed for provider'
            : isTimeout
              ? 'Provider request timeout'
              : 'Provider connection failed',
          details: {
            status: status || undefined,
            code: code || undefined,
          },
        },
      })
    }
  } catch (error) {
    console.error('Admin provider overview POST error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to run provider action' },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  return withAdminAuth(req, () => getHandler())
}

export async function POST(req: NextRequest) {
  return withAdminAuth(req, () => postHandler(req))
}
