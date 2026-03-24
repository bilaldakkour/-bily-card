import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/auth/middleware'
import { connectDB } from '@/lib/db/mongodb'
import ProviderRegistry from '@/lib/models/ProviderRegistry'
import { JWTPayload } from '@/lib/types'

function n(value: unknown) {
  return String(value || '').trim().toLowerCase()
}

function toNum(value: unknown, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

async function getHandler(req: NextRequest) {
  await connectDB()
  const { searchParams } = new URL(req.url)
  const providerKey = n(searchParams.get('providerKey') || '')
  const enabledParam = searchParams.get('enabled')
  const query: Record<string, unknown> = {}

  if (providerKey) query.providerKey = providerKey
  if (enabledParam === '1') query.enabled = true
  if (enabledParam === '0') query.enabled = false

  const rows = await ProviderRegistry.find(query).sort({ priority: 1, providerKey: 1 }).lean()
  return NextResponse.json({ success: true, data: rows })
}

async function postHandler(req: NextRequest, admin: JWTPayload) {
  await connectDB()
  const body = await req.json()
  const providerKey = n(body?.providerKey || '')
  if (!providerKey) {
    return NextResponse.json({ success: false, message: 'providerKey is required' }, { status: 400 })
  }

  const updated = await ProviderRegistry.findOneAndUpdate(
    { providerKey },
    {
      $set: {
        providerKey,
        displayName: String(body?.displayName || providerKey).trim(),
        adapterKind: n(body?.adapterKind || providerKey),
        slotPreference: ['primary', 'secondary', 'any'].includes(n(body?.slotPreference))
          ? n(body?.slotPreference)
          : 'any',
        enabled: body?.enabled !== false,
        priority: toNum(body?.priority, 100),
        financial: {
          landingRate: Math.max(0, toNum(body?.financial?.landingRate, 1)),
          fixedFeePerOrder: Math.max(0, toNum(body?.financial?.fixedFeePerOrder, 0)),
          variableFeePercent: Math.max(0, toNum(body?.financial?.variableFeePercent, 0)),
          topupSentUsd: Math.max(0, toNum(body?.financial?.topupSentUsd, 0)),
          topupReceivedUsd: Math.max(0, toNum(body?.financial?.topupReceivedUsd, 0)),
          notes: String(body?.financial?.notes || '').trim() || undefined,
        },
        routing: {
          allowOrderCreation: body?.routing?.allowOrderCreation !== false,
          allowSync: body?.routing?.allowSync !== false,
        },
        api: {
          baseUrl: String(body?.api?.baseUrl || '').trim() || undefined,
          timeoutMs: toNum(body?.api?.timeoutMs, 0) || undefined,
          adminTimeoutMs: toNum(body?.api?.adminTimeoutMs, 0) || undefined,
          profileTimeoutMs: toNum(body?.api?.profileTimeoutMs, 0) || undefined,
          credentialsRef: String(body?.api?.credentialsRef || '').trim() || undefined,
        },
        metadata:
          typeof body?.metadata === 'object' && body?.metadata
            ? body.metadata
            : undefined,
      },
      $setOnInsert: {
        createdBy: admin.userId,
      },
    },
    { upsert: true, new: true }
  ).lean()

  return NextResponse.json({ success: true, data: updated })
}

async function patchHandler(req: NextRequest) {
  await connectDB()
  const body = await req.json()
  const providerKey = n(body?.providerKey || '')
  const action = n(body?.action || 'toggle_enabled')
  if (!providerKey) {
    return NextResponse.json({ success: false, message: 'providerKey is required' }, { status: 400 })
  }

  if (action === 'toggle_enabled') {
    if (typeof body?.enabled !== 'boolean') {
      return NextResponse.json({ success: false, message: 'enabled must be boolean' }, { status: 400 })
    }
    const updated = await ProviderRegistry.findOneAndUpdate(
      { providerKey },
      { $set: { enabled: body.enabled } },
      { new: true }
    ).lean()
    return NextResponse.json({ success: true, data: updated })
  }

  if (action === 'update_financial') {
    const updated = await ProviderRegistry.findOneAndUpdate(
      { providerKey },
      {
        $set: {
          'financial.landingRate': Math.max(0, toNum(body?.landingRate, 1)),
          'financial.fixedFeePerOrder': Math.max(0, toNum(body?.fixedFeePerOrder, 0)),
          'financial.variableFeePercent': Math.max(0, toNum(body?.variableFeePercent, 0)),
          'financial.topupSentUsd': Math.max(0, toNum(body?.topupSentUsd, 0)),
          'financial.topupReceivedUsd': Math.max(0, toNum(body?.topupReceivedUsd, 0)),
          'financial.notes': String(body?.notes || '').trim() || undefined,
        },
      },
      { new: true }
    ).lean()
    return NextResponse.json({ success: true, data: updated })
  }

  return NextResponse.json({ success: false, message: 'Unsupported action' }, { status: 400 })
}

async function deleteHandler(req: NextRequest) {
  await connectDB()
  const body = await req.json()
  const providerKey = n(body?.providerKey || '')
  const hard = body?.hard === true
  if (!providerKey) {
    return NextResponse.json({ success: false, message: 'providerKey is required' }, { status: 400 })
  }

  if (hard) {
    await ProviderRegistry.deleteOne({ providerKey })
    return NextResponse.json({ success: true, data: { deleted: true, providerKey } })
  }

  const updated = await ProviderRegistry.findOneAndUpdate(
    { providerKey },
    { $set: { enabled: false, 'routing.allowOrderCreation': false, 'routing.allowSync': false } },
    { new: true }
  ).lean()

  return NextResponse.json({ success: true, data: updated })
}

export async function GET(req: NextRequest) {
  return withAdminAuth(req, () => getHandler(req))
}

export async function POST(req: NextRequest) {
  return withAdminAuth(req, (r, u) => postHandler(r, u))
}

export async function PATCH(req: NextRequest) {
  return withAdminAuth(req, () => patchHandler(req))
}

export async function DELETE(req: NextRequest) {
  return withAdminAuth(req, () => deleteHandler(req))
}

