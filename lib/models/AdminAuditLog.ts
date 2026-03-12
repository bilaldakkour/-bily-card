import mongoose, { Document, Schema } from 'mongoose';

export interface IAdminAuditLog {
  adminUserId: string;
  action: string;
  targetType: 'user' | 'order' | 'deposit' | 'wallet' | 'system';
  targetId?: string;
  details?: Record<string, any>;
  createdAt?: Date;
}

interface IAdminAuditLogDocument extends Omit<IAdminAuditLog, '_id'>, Document {}

const AdminAuditLogSchema = new Schema(
  {
    adminUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      maxlength: 120,
    },
    targetType: {
      type: String,
      enum: ['user', 'order', 'deposit', 'wallet', 'system'],
      required: true,
      index: true,
    },
    targetId: {
      type: String,
      index: true,
    },
    details: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

AdminAuditLogSchema.index({ createdAt: -1 });

export default mongoose.models.AdminAuditLog ||
  mongoose.model<IAdminAuditLogDocument>('AdminAuditLog', AdminAuditLogSchema);
