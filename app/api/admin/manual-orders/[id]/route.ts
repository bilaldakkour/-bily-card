import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { withAdminAuth } from '@/lib/auth/middleware'
import { connectDB } from '@/lib/db/mongodb'
import ManualOrder from '@/lib/models/ManualOrder'
import AdminAuditLog from '@/lib/models/AdminAuditLog'
import { logManualOrderAudit } from '@/lib/services/manualOrderAuditService'
import { JWTPayload } from '@/lib/types'

const MANUAL_STATUSES = ['pending', 'processing', 'completed', 'failed', 'cancelled'] as const

type ManualStatus = (typeof MANUAL_STATUSES)[number]

function isValidStatus(status: string): status is ManualStatus {
  return MANUAL_STATUSES.includes(status as ManualStatus)
}

async function patchHandler(
  req: NextRequest,
  user: JWTPayload,
  context: { params: { id: string } }
): Promise<NextResponse> {
  try {
    await connectDB()

    const id = String(context?.params?.id || '').trim()
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: 'Invalid manual order id' }, { status: 400 })
    }

    const body = await req.json().catch(() => ({}))
    const statusInput = String(body?.status || '').trim().toLowerCase()

    if (!isValidStatus(statusInput)) {
      return NextResponse.json({ success: false, message: 'Invalid status' }, { status: 400 })
    }

    const currentOrder = (await ManualOrder.findOne({
      _id: id,
      source: 'manual',
      isManual: true,
      isVisibleToCustomer: false,
    })
      .select('_id orderId status')
      .lean()) as { _id: string; orderId: string; status: string } | null

    if (!currentOrder) {
      return NextResponse.json({ success: false, message: 'Manual order not found' }, { status: 404 })
    }

    if (String(currentOrder.status) === statusInput) {
      return NextResponse.json({ success: true, data: currentOrder, message: 'Status unchanged' })
    }

    const updatedOrder = (await ManualOrder.findOneAndUpdate(
      {
        _id: id,
        source: 'manual',
        isManual: true,
        isVisibleToCustomer: false,
      },
      {
        $set: {
          status: statusInput,
        },
      },
      {
        new: true,
        runValidators: true,
      }
    ).lean()) as { _id: string; orderId: string; status: string } | null

    if (!updatedOrder) {
      return NextResponse.json({ success: false, message: 'Manual order not found' }, { status: 404 })
    }

    try {
      void logManualOrderAudit({
        manualOrderId: String(updatedOrder._id || ''),
        orderId: String(updatedOrder.orderId || ''),
        actionType: 'update_status',
        adminUserId: user.userId,
        changedFields: ['status'],
        oldValues: {
          status: String(currentOrder.status || ''),
        },
        newValues: {
          status: statusInput,
        },
      })

      await AdminAuditLog.create({
        adminUserId: user.userId,
        action: 'manual_order_status_update',
        targetType: 'order',
        targetId: String(updatedOrder._id),
        details: {
          orderId: String(updatedOrder.orderId || ''),
          previousStatus: String(currentOrder.status || ''),
          nextStatus: statusInput,
          source: 'manual_order',
        },
      })
    } catch (auditError) {
      console.error('Manual order status audit failed:', auditError)
    }

    return NextResponse.json({
      success: true,
      data: updatedOrder,
      message: 'Manual order status updated successfully',
    })
  } catch (error) {
    console.error('Manual order status update error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: { id: string } }
) {
  return withAdminAuth(req, (securedReq, user) => patchHandler(securedReq, user, context))
}
