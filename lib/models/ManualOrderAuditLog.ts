import mongoose, { Document, Schema } from 'mongoose'

export type ManualOrderAuditAction =
  | 'create'
  | 'update_status'
  | 'update_pricing'
  | 'update_notes'

export interface IManualOrderAuditLog {
  manualOrderId: mongoose.Types.ObjectId
  orderId: string
  actionType: ManualOrderAuditAction
  adminUserId: mongoose.Types.ObjectId
  changedFields: string[]
  oldValues?: Record<string, unknown>
  newValues?: Record<string, unknown>
  createdAt: Date
}

interface IManualOrderAuditLogDocument extends Omit<IManualOrderAuditLog, 'createdAt'>, Document {
  createdAt: Date
}

const ManualOrderAuditLogSchema = new Schema<IManualOrderAuditLogDocument>(
  {
    manualOrderId: {
      type: Schema.Types.ObjectId,
      ref: 'ManualOrder',
      required: true,
      index: true,
    },
    orderId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    actionType: {
      type: String,
      enum: ['create', 'update_status', 'update_pricing', 'update_notes'],
      required: true,
      index: true,
    },
    adminUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    changedFields: {
      type: [String],
      default: [],
    },
    oldValues: {
      type: Schema.Types.Mixed,
      default: {},
    },
    newValues: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'manual_order_audit_logs',
  }
)

ManualOrderAuditLogSchema.index({ createdAt: -1 })
ManualOrderAuditLogSchema.index({ manualOrderId: 1, createdAt: -1 })
ManualOrderAuditLogSchema.index({ orderId: 1, createdAt: -1 })

const ManualOrderAuditLog =
  mongoose.models.ManualOrderAuditLog ||
  mongoose.model<IManualOrderAuditLogDocument>('ManualOrderAuditLog', ManualOrderAuditLogSchema)

export default ManualOrderAuditLog
