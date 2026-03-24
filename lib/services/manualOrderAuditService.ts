import mongoose from 'mongoose'
import ManualOrderAuditLog, { ManualOrderAuditAction } from '@/lib/models/ManualOrderAuditLog'

type ManualOrderAuditInput = {
  manualOrderId: string
  orderId: string
  actionType: ManualOrderAuditAction
  adminUserId: string
  changedFields: string[]
  oldValues?: Record<string, unknown>
  newValues?: Record<string, unknown>
}

export async function logManualOrderAudit(input: ManualOrderAuditInput) {
  try {
    if (!mongoose.Types.ObjectId.isValid(input.manualOrderId)) return
    if (!mongoose.Types.ObjectId.isValid(input.adminUserId)) return

    await ManualOrderAuditLog.create({
      manualOrderId: input.manualOrderId,
      orderId: input.orderId,
      actionType: input.actionType,
      adminUserId: input.adminUserId,
      changedFields: input.changedFields,
      oldValues: input.oldValues || {},
      newValues: input.newValues || {},
    })
  } catch (error) {
    console.error('Manual order audit log write failed:', error)
  }
}
