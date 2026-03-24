import mongoose, { Document, Schema, models } from 'mongoose'
import type { ProviderSlot } from '@/lib/providers/providerConfig'

export type NormalizedProductStockStatus =
  | 'in_stock'
  | 'low_stock'
  | 'out_of_stock'
  | 'paused'
  | 'unknown'

export interface IProductProviderMapping extends Document {
  internalSlug: string
  providerSlot: ProviderSlot
  providerProductId: string
  providerProductName?: string
  active: boolean
  priority: number
  fallbackEnabled: boolean
  lastSyncedCost?: number
  currency?: string
  stockStatus?: NormalizedProductStockStatus
  deliveryType?: string
  manualPriceOverride?: number
  marginRule?: string
  categoryMapping?: string
  metadata?: Record<string, unknown>
  updatedBy?: string
  createdAt: Date
  updatedAt: Date
}

const ProductProviderMappingSchema = new Schema<IProductProviderMapping>(
  {
    internalSlug: { type: String, required: true, trim: true, lowercase: true, index: true },
    providerSlot: {
      type: String,
      required: true,
      enum: ['primary', 'secondary'],
      index: true,
    },
    providerProductId: { type: String, required: true, trim: true, index: true },
    providerProductName: { type: String, trim: true },
    active: { type: Boolean, default: true, index: true },
    priority: { type: Number, default: 100, index: true },
    fallbackEnabled: { type: Boolean, default: true, index: true },
    lastSyncedCost: { type: Number, min: 0 },
    currency: { type: String, default: 'USD' },
    stockStatus: {
      type: String,
      enum: ['in_stock', 'low_stock', 'out_of_stock', 'paused', 'unknown'],
      default: 'unknown',
    },
    deliveryType: { type: String, trim: true },
    manualPriceOverride: { type: Number, min: 0 },
    marginRule: { type: String, trim: true },
    categoryMapping: { type: String, trim: true },
    metadata: { type: Schema.Types.Mixed },
    updatedBy: { type: String },
  },
  { timestamps: true }
)

ProductProviderMappingSchema.index(
  { internalSlug: 1, providerSlot: 1, providerProductId: 1 },
  { unique: true }
)

const ProductProviderMapping =
  models.ProductProviderMapping ||
  mongoose.model<IProductProviderMapping>('ProductProviderMapping', ProductProviderMappingSchema)

export default ProductProviderMapping

