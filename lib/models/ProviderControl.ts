import mongoose, { Document, Schema, models } from 'mongoose'
import type { ProviderSlot } from '@/lib/providers/providerConfig'

export interface IProviderControl extends Document {
  providerSlot: ProviderSlot
  adapterKey: string
  manualEnabled?: boolean | null
  autoDisabled: boolean
  autoDisabledReason?: string
  autoDisabledAt?: Date | null
  successRate: number
  failureRate: number
  avgResponseMs: number
  fallbackUsage: number
  totalOrders: number
  lastHealthCheckAt?: Date | null
  createdAt: Date
  updatedAt: Date
}

const ProviderControlSchema = new Schema<IProviderControl>(
  {
    providerSlot: {
      type: String,
      enum: ['primary', 'secondary'],
      required: true,
      index: true,
    },
    adapterKey: { type: String, required: true, trim: true, lowercase: true, index: true },
    manualEnabled: { type: Boolean, default: null },
    autoDisabled: { type: Boolean, default: false, index: true },
    autoDisabledReason: { type: String, default: '' },
    autoDisabledAt: { type: Date, default: null },
    successRate: { type: Number, default: 0 },
    failureRate: { type: Number, default: 0 },
    avgResponseMs: { type: Number, default: 0 },
    fallbackUsage: { type: Number, default: 0 },
    totalOrders: { type: Number, default: 0 },
    lastHealthCheckAt: { type: Date, default: null },
  },
  { timestamps: true }
)

ProviderControlSchema.index({ providerSlot: 1, adapterKey: 1 }, { unique: true })

const ProviderControl =
  models.ProviderControl || mongoose.model<IProviderControl>('ProviderControl', ProviderControlSchema)

export default ProviderControl
