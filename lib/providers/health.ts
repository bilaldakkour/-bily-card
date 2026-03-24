import { connectDB } from '@/lib/db/mongodb'
import Order from '@/lib/models/Order'
import ProviderControl from '@/lib/models/ProviderControl'
import type { ProviderSlot } from '@/lib/providers/providerConfig'

type ProviderHealthSnapshot = {
  providerSlot: ProviderSlot
  adapterKey: string
  totalOrders: number
  successRate: number
  failureRate: number
  fallbackUsage: number
  avgResponseMs: number
  autoDisabled: boolean
  manualEnabled?: boolean | null
}

const HEALTH_CACHE_TTL_MS = 60_000
let healthCache: { expiresAt: number; data: Record<string, ProviderHealthSnapshot> } | null = null

function toNum(value: unknown) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 0
  return parsed
}

function keyOf(slot: ProviderSlot, adapterKey: string) {
  return `${slot}:${String(adapterKey || '').trim().toLowerCase()}`
}

export async function setProviderManualEnabled(input: {
  slot: ProviderSlot
  adapterKey: string
  enabled: boolean | null
}) {
  await connectDB()
  const normalizedKey = String(input.adapterKey || '').trim().toLowerCase()
  await ProviderControl.findOneAndUpdate(
    { providerSlot: input.slot, adapterKey: normalizedKey },
    {
      $set: {
        providerSlot: input.slot,
        adapterKey: normalizedKey,
        manualEnabled: input.enabled,
      },
    },
    { upsert: true, new: true }
  )
  healthCache = null
}

export async function computeProviderHealthSnapshot(options?: {
  forceRefresh?: boolean
  days?: number
  autoDisableFailureRateThreshold?: number
}) {
  const now = Date.now()
  if (!options?.forceRefresh && healthCache && healthCache.expiresAt > now) {
    return healthCache.data
  }

  const days = Math.max(1, Math.min(60, Number(options?.days || 14)))
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  const autoThreshold = Number.isFinite(Number(options?.autoDisableFailureRateThreshold))
    ? Number(options?.autoDisableFailureRateThreshold)
    : 30

  await connectDB()
  const [orders, controls] = await Promise.all([
    Order.find({ createdAt: { $gte: since } })
      .select('providerSlot status providerResponse')
      .sort({ createdAt: -1 })
      .limit(10000)
      .lean(),
    ProviderControl.find({})
      .select('providerSlot adapterKey manualEnabled autoDisabled')
      .lean(),
  ])

  const byKey: Record<
    string,
    {
      providerSlot: ProviderSlot
      adapterKey: string
      total: number
      success: number
      failed: number
      fallback: number
      responseMsSum: number
      responseMsCount: number
    }
  > = {}

  for (const row of orders as any[]) {
    const slot = String(row?.providerSlot || '').toLowerCase()
    const adapterKey = String(row?.providerResponse?._providerAdapter || '').trim().toLowerCase()
    if (!['primary', 'secondary'].includes(slot) || !adapterKey) continue
    const idx = keyOf(slot as ProviderSlot, adapterKey)
    if (!byKey[idx]) {
      byKey[idx] = {
        providerSlot: slot as ProviderSlot,
        adapterKey,
        total: 0,
        success: 0,
        failed: 0,
        fallback: 0,
        responseMsSum: 0,
        responseMsCount: 0,
      }
    }
    const item = byKey[idx]
    item.total += 1
    const status = String(row?.status || '').toLowerCase()
    if (status === 'completed') item.success += 1
    if (['failed', 'rejected', 'refunded'].includes(status)) item.failed += 1
    if (Boolean(row?.providerResponse?._routingMeta?.fallbackUsed)) item.fallback += 1
    const timing = toNum(row?.providerResponse?._timingMs)
    if (timing > 0) {
      item.responseMsSum += timing
      item.responseMsCount += 1
    }
  }

  const controlMap = new Map<string, any>()
  for (const control of controls as any[]) {
    const k = keyOf(control.providerSlot, control.adapterKey)
    controlMap.set(k, control)
    if (!byKey[k]) {
      byKey[k] = {
        providerSlot: control.providerSlot as ProviderSlot,
        adapterKey: String(control.adapterKey || '').toLowerCase(),
        total: 0,
        success: 0,
        failed: 0,
        fallback: 0,
        responseMsSum: 0,
        responseMsCount: 0,
      }
    }
  }

  const snapshot: Record<string, ProviderHealthSnapshot> = {}
  const upserts: Array<Promise<any>> = []

  for (const [k, metrics] of Object.entries(byKey)) {
    const successRate =
      metrics.total > 0 ? Number(((metrics.success / metrics.total) * 100).toFixed(2)) : 0
    const failureRate =
      metrics.total > 0 ? Number(((metrics.failed / metrics.total) * 100).toFixed(2)) : 0
    const fallbackUsage =
      metrics.total > 0 ? Number(((metrics.fallback / metrics.total) * 100).toFixed(2)) : 0
    const avgResponseMs =
      metrics.responseMsCount > 0
        ? Number((metrics.responseMsSum / metrics.responseMsCount).toFixed(2))
        : 0

    const existingControl = controlMap.get(k)
    const autoDisabled = failureRate > autoThreshold
    const manualEnabled =
      typeof existingControl?.manualEnabled === 'boolean' ? Boolean(existingControl.manualEnabled) : null

    snapshot[k] = {
      providerSlot: metrics.providerSlot,
      adapterKey: metrics.adapterKey,
      totalOrders: metrics.total,
      successRate,
      failureRate,
      fallbackUsage,
      avgResponseMs,
      autoDisabled,
      manualEnabled,
    }

    upserts.push(
      ProviderControl.findOneAndUpdate(
        { providerSlot: metrics.providerSlot, adapterKey: metrics.adapterKey },
        {
          $set: {
            providerSlot: metrics.providerSlot,
            adapterKey: metrics.adapterKey,
            successRate,
            failureRate,
            fallbackUsage,
            avgResponseMs,
            totalOrders: metrics.total,
            autoDisabled,
            autoDisabledReason: autoDisabled ? `failure_rate_gt_${autoThreshold}` : '',
            autoDisabledAt: autoDisabled ? new Date() : null,
            lastHealthCheckAt: new Date(),
          },
        },
        { upsert: true }
      )
    )
  }

  if (upserts.length > 0) {
    await Promise.all(upserts)
  }

  healthCache = {
    expiresAt: now + HEALTH_CACHE_TTL_MS,
    data: snapshot,
  }

  return snapshot
}
