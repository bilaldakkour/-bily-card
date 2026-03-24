import mongoose, { Document, Schema, models } from 'mongoose'

export type ProviderSlotPreference = 'primary' | 'secondary' | 'any'

export interface IProviderRegistry extends Document {
  providerKey: string
  displayName: string
  adapterKind: string
  slotPreference: ProviderSlotPreference
  enabled: boolean
  priority: number
  financial: {
    landingRate: number
    fixedFeePerOrder: number
    variableFeePercent: number
    topupSentUsd: number
    topupReceivedUsd: number
    notes?: string
  }
  routing: {
    allowOrderCreation: boolean
    allowSync: boolean
  }
  api: {
    baseUrl?: string
    timeoutMs?: number
    adminTimeoutMs?: number
    profileTimeoutMs?: number
    credentialsRef?: string
  }
  metadata?: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

const ProviderRegistrySchema = new Schema<IProviderRegistry>(
  {
    providerKey: { type: String, required: true, trim: true, lowercase: true, unique: true, index: true },
    displayName: { type: String, required: true, trim: true },
    adapterKind: { type: String, required: true, trim: true, lowercase: true, index: true },
    slotPreference: {
      type: String,
      enum: ['primary', 'secondary', 'any'],
      default: 'any',
      index: true,
    },
    enabled: { type: Boolean, default: true, index: true },
    priority: { type: Number, default: 100, index: true },
    financial: {
      landingRate: { type: Number, default: 1, min: 0 },
      fixedFeePerOrder: { type: Number, default: 0, min: 0 },
      variableFeePercent: { type: Number, default: 0, min: 0 },
      topupSentUsd: { type: Number, default: 0, min: 0 },
      topupReceivedUsd: { type: Number, default: 0, min: 0 },
      notes: { type: String, trim: true },
    },
    routing: {
      allowOrderCreation: { type: Boolean, default: true, index: true },
      allowSync: { type: Boolean, default: true, index: true },
    },
    api: {
      baseUrl: { type: String, trim: true },
      timeoutMs: { type: Number, min: 1000 },
      adminTimeoutMs: { type: Number, min: 1000 },
      profileTimeoutMs: { type: Number, min: 1000 },
      credentialsRef: { type: String, trim: true },
    },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
)

ProviderRegistrySchema.index({ enabled: 1, priority: 1 })
ProviderRegistrySchema.index({ adapterKind: 1, slotPreference: 1 })

const ProviderRegistry =
  models.ProviderRegistry || mongoose.model<IProviderRegistry>('ProviderRegistry', ProviderRegistrySchema)

export default ProviderRegistry

