import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/auth/middleware'
import { connectDB } from '@/lib/db/mongodb'
import ManualOrder from '@/lib/models/ManualOrder'
import { JWTPayload } from '@/lib/types'

const MANUAL_STATUSES = ['pending', 'processing', 'completed', 'failed', 'cancelled'] as const

type ManualStatus = (typeof MANUAL_STATUSES)[number]

type ExportFormat = 'csv' | 'excel'

type ExportOrderRow = {
  orderId: string
  productName: string
  userId: string
  quantity: number
  totalCost: number
  totalSale: number
  totalProfit: number
  status: string
  notes: string
  createdAt: string
}

const HEADERS = [
  'Order ID',
  'Product Name',
  'User ID',
  'Quantity',
  'Total Cost',
  'Total Sale',
  'Total Profit',
  'Status',
  'Notes',
  'Created At',
]

function isValidStatus(status: string): status is ManualStatus {
  return MANUAL_STATUSES.includes(status as ManualStatus)
}

function isValidFormat(format: string): format is ExportFormat {
  return format === 'csv' || format === 'excel'
}

function escapeCsvValue(value: string) {
  const needsQuotes = /[",\n\r]/.test(value)
  const escaped = value.replace(/"/g, '""')
  return needsQuotes ? `"${escaped}"` : escaped
}

function sanitizeSpreadsheetCell(value: string) {
  const normalized = String(value || '')
  const trimmed = normalized.trimStart()
  // Prevent CSV/Excel formula injection when opening exported files.
  if (/^[=+\-@]/.test(trimmed)) {
    return `'${normalized}`
  }
  return normalized
}

function buildFilter(searchParams: URLSearchParams) {
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

  if (status !== 'all' && isValidStatus(status)) {
    filter.status = status
  }

  if (userId) {
    filter.userId = { $regex: userId, $options: 'i' }
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
    }
  }

  if (search) {
    filter.$or = [
      { orderId: { $regex: search, $options: 'i' } },
      { productName: { $regex: search, $options: 'i' } },
      { userId: { $regex: search, $options: 'i' } },
      { notes: { $regex: search, $options: 'i' } },
    ]
  }

  return filter
}

function toExportRow(order: any): ExportOrderRow {
  const quantity = Number(order?.quantity || 0)
  const totalCost = Number(order?.totalCost || 0)
  const totalSale = Number(order?.totalSale || 0)
  const totalProfit = Number(order?.totalProfit || 0)

  return {
    orderId: String(order?.orderId || ''),
    productName: String(order?.productName || ''),
    userId: String(order?.userId || ''),
    quantity,
    totalCost,
    totalSale,
    totalProfit,
    status: String(order?.status || ''),
    notes: String(order?.notes || ''),
    createdAt: order?.createdAt ? new Date(order.createdAt).toISOString() : '',
  }
}

function buildCsv(rows: ExportOrderRow[]) {
  const lines = [HEADERS.join(',')]

  for (const row of rows) {
    lines.push([
      row.orderId,
      row.productName,
      row.userId,
      String(row.quantity),
      row.totalCost.toFixed(2),
      row.totalSale.toFixed(2),
      row.totalProfit.toFixed(2),
      row.status,
      row.notes,
      row.createdAt,
    ].map((v) => escapeCsvValue(sanitizeSpreadsheetCell(String(v)))).join(','))
  }

  return `\uFEFF${lines.join('\n')}`
}

function buildExcelText(rows: ExportOrderRow[]) {
  const lines = [HEADERS.join('\t')]

  for (const row of rows) {
    lines.push([
      row.orderId,
      row.productName,
      row.userId,
      String(row.quantity),
      row.totalCost.toFixed(2),
      row.totalSale.toFixed(2),
      row.totalProfit.toFixed(2),
      row.status,
      row.notes.replace(/\t/g, ' '),
      row.createdAt,
    ].map((v) => sanitizeSpreadsheetCell(String(v))).join('\t'))
  }

  return `\uFEFF${lines.join('\n')}`
}

function fileTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
}

async function handler(req: NextRequest, _user: JWTPayload): Promise<NextResponse> {
  try {
    await connectDB()

    const { searchParams } = new URL(req.url)
    const formatParam = String(searchParams.get('format') || 'csv').trim().toLowerCase()
    const format: ExportFormat = isValidFormat(formatParam) ? formatParam : 'csv'

    const filter = buildFilter(searchParams)
    const rows = await ManualOrder.find(filter)
      .sort({ createdAt: -1 })
      .lean()

    const normalizedRows = rows.map(toExportRow)

    if (format === 'excel') {
      const excelText = buildExcelText(normalizedRows)
      const filename = `manual-orders-${fileTimestamp()}.xls`
      return new NextResponse(excelText, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.ms-excel; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-store',
        },
      })
    }

    const csv = buildCsv(normalizedRows)
    const filename = `manual-orders-${fileTimestamp()}.csv`

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('Admin manual orders export error:', error)
    return NextResponse.json({ success: false, message: 'Failed to export manual orders' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  return withAdminAuth(req, handler)
}
