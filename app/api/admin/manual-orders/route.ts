import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/auth/middleware'
import { connectDB } from '@/lib/db/mongodb'
import ManualOrder from '@/lib/models/ManualOrder'
import { logManualOrderAudit } from '@/lib/services/manualOrderAuditService'
import { JWTPayload } from '@/lib/types'

const MANUAL_STATUSES = ['pending', 'processing', 'completed', 'failed', 'cancelled'] as const

type ManualStatus = (typeof MANUAL_STATUSES)[number]

function isValidStatus(status: string): status is ManualStatus {
  return MANUAL_STATUSES.includes(status as ManualStatus)
}

function parseNumber(input: unknown): number {
  const value = Number(input)
  return Number.isFinite(value) ? value : NaN
}

function buildOrderId() {
  const now = new Date()
  const stamp = now
    .toISOString()
    .replace(/[-:TZ.]/g, '')
    .slice(0, 14)
  const random = Math.floor(1000 + Math.random() * 9000)
  return `MO-${stamp}-${random}`
}

async function getManualOrders(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url)
  const page = Math.max(1, Number(searchParams.get('page') || 1))
  const limit = Math.min(200, Math.max(1, Number(searchParams.get('limit') || 25)))
  const status = (searchParams.get('status') || 'all').trim().toLowerCase()
  const search = (searchParams.get('search') || '').trim()
  const userId = (searchParams.get('userId') || '').trim()
  const from = (searchParams.get('from') || '').trim()
  const to = (searchParams.get('to') || '').trim()

  const filter: Record<string, unknown> = {
    source: 'manual',
    isManual: true,
    isVisibleToCustomer: false,
  }
  const scopeFilter: Record<string, unknown> = {
    source: 'manual',
    isManual: true,
    isVisibleToCustomer: false,
  }

  if (status !== 'all' && isValidStatus(status)) {
    filter.status = status
  }

  if (userId) {
    filter.userId = { $regex: userId, $options: 'i' }
    scopeFilter.userId = { $regex: userId, $options: 'i' }
  }

  if (from || to) {
    const createdAt: Record<string, Date> = {}

    if (from) {
      const fromDate = new Date(`${from}T00:00:00.000Z`)
      if (!Number.isNaN(fromDate.getTime())) {
        createdAt.$gte = fromDate
      }
    }

    if (to) {
      const toDate = new Date(`${to}T23:59:59.999Z`)
      if (!Number.isNaN(toDate.getTime())) {
        createdAt.$lte = toDate
      }
    }

    if (Object.keys(createdAt).length > 0) {
      filter.createdAt = createdAt
      scopeFilter.createdAt = createdAt
    }
  }

  if (search) {
    const searchFilter = [
      { orderId: { $regex: search, $options: 'i' } },
      { productName: { $regex: search, $options: 'i' } },
      { userId: { $regex: search, $options: 'i' } },
      { notes: { $regex: search, $options: 'i' } },
    ]
    filter.$or = searchFilter
    scopeFilter.$or = searchFilter
  }

  const skip = (page - 1) * limit

  const [orders, total, summaryAgg, byStatusAgg] = await Promise.all([
    ManualOrder.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    ManualOrder.countDocuments(filter),
    ManualOrder.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          revenue: { $sum: '$totalSale' },
          cost: { $sum: '$totalCost' },
          profit: { $sum: '$totalProfit' },
        },
      },
    ]),
    ManualOrder.aggregate([
      { $match: scopeFilter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]),
  ])

  const summary = summaryAgg[0] || {
    count: 0,
    revenue: 0,
    cost: 0,
    profit: 0,
  }
  const byStatus = {
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    cancelled: 0,
  }

  for (const row of byStatusAgg as Array<{ _id?: string; count?: number }>) {
    const key = String(row?._id || '').toLowerCase()
    if (key in byStatus) {
      byStatus[key as keyof typeof byStatus] = Number(row?.count || 0)
    }
  }

  return NextResponse.json({
    success: true,
    data: orders,
    summary: {
      ...summary,
      byStatus,
    },
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  })
}

async function createManualOrder(req: NextRequest, user: JWTPayload): Promise<NextResponse> {
  const body = await req.json()

  const productName = String(body?.productName || '').trim()
  const userId = String(body?.userId || '').trim()
  const quantity = parseNumber(body?.quantity)
  const totalCost = parseNumber(body?.totalCost)
  const totalSale = parseNumber(body?.totalSale)
  const statusInput = String(body?.status || 'pending').trim().toLowerCase()
  const notes = String(body?.notes || '').trim()

  if (!productName) {
    return NextResponse.json({ success: false, message: 'Product name is required' }, { status: 400 })
  }

  if (!userId) {
    return NextResponse.json({ success: false, message: 'User ID is required' }, { status: 400 })
  }

  if (!Number.isFinite(quantity) || quantity <= 0) {
    return NextResponse.json({ success: false, message: 'Quantity must be greater than 0' }, { status: 400 })
  }

  if (!Number.isFinite(totalCost) || totalCost < 0) {
    return NextResponse.json({ success: false, message: 'Total cost must be 0 or more' }, { status: 400 })
  }

  if (!Number.isFinite(totalSale) || totalSale < 0) {
    return NextResponse.json({ success: false, message: 'Total sale must be 0 or more' }, { status: 400 })
  }

  if (!isValidStatus(statusInput)) {
    return NextResponse.json({ success: false, message: 'Invalid status' }, { status: 400 })
  }

  const totalProfit = totalSale - totalCost

  const payload = {
    productName,
    userId,
    quantity,
    totalProfit,
    totalCost,
    totalSale,
    status: statusInput,
    notes,
    source: 'manual' as const,
    isManual: true as const,
    isVisibleToCustomer: false as const,
    createdBy: user.userId,
  }

  let createdOrder = null
  let attempts = 0

  while (!createdOrder && attempts < 5) {
    attempts += 1
    try {
      createdOrder = await ManualOrder.create({
        ...payload,
        orderId: buildOrderId(),
      })
    } catch (error: any) {
      if (error?.code === 11000) {
        continue
      }
      throw error
    }
  }

  if (!createdOrder) {
    return NextResponse.json(
      { success: false, message: 'Failed to generate unique order ID' },
      { status: 500 }
    )
  }

  void logManualOrderAudit({
    manualOrderId: String((createdOrder as any)._id || ''),
    orderId: String((createdOrder as any).orderId || ''),
    actionType: 'create',
    adminUserId: user.userId,
    changedFields: ['productName', 'userId', 'quantity', 'totalCost', 'totalSale', 'totalProfit', 'status', 'notes'],
    oldValues: {},
    newValues: {
      productName,
      userId,
      quantity,
      totalCost,
      totalSale,
      totalProfit,
      status: statusInput,
      notes,
    },
  })

  return NextResponse.json(
    {
      success: true,
      data: createdOrder,
      message: 'Manual order created successfully',
    },
    { status: 201 }
  )
}

async function handler(req: NextRequest, user: JWTPayload): Promise<NextResponse> {
  try {
    await connectDB()

    if (req.method === 'GET') {
      return getManualOrders(req)
    }

    if (req.method === 'POST') {
      return createManualOrder(req, user)
    }

    return NextResponse.json({ success: false, message: 'Method not allowed' }, { status: 405 })
  } catch (error) {
    console.error('Admin manual orders API error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  return withAdminAuth(req, handler)
}

export async function POST(req: NextRequest) {
  return withAdminAuth(req, handler)
}
