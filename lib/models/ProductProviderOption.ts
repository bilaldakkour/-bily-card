import mongoose, { Document, Schema, models } from 'mongoose'

export type ProviderRoutingMode = 'cheapest' | 'priority' | 'forced'

export interface IProductProviderOption extends Document {
  internalSlug: string
  providerKey: string
  providerProductId: string
  providerProductName?: string
  active: boolean
  fallbackEnabled: boolean
  priority: number
  fixedUnitCost?: number
  metadata?: Record<string, unknown>
  updatedBy?: string
  createdAt: Date
  updatedAt: Date
}

const ProductProviderOptionSchema = new Schema<IProductProviderOption>(
  {
    internalSlug: { type: String, required: true, trim: true, lowercase: true, index: true },
    providerKey: { type: String, required: true, trim: true, lowercase: true, index: true },
    providerProductId: { type: String, required: true, trim: true, index: true },
    providerProductName: { type: String, trim: true },
    active: { type: Boolean, default: true, index: true },
    fallbackEnabled: { type: Boolean, default: true, index: true },
    priority: { type: Number, default: 100, index: true },
    fixedUnitCost: { type: Number, min: 0 },
    metadata: { type: Schema.Types.Mixed },
    updatedBy: { type: String },
  },
  { timestamps: true }
)

ProductProviderOptionSchema.index(
  { internalSlug: 1, providerKey: 1, providerProductId: 1 },
  { unique: true }
)

const ProductProviderOption =
  models.ProductProviderOption ||
  mongoose.model<IProductProviderOption>('ProductProviderOption', ProductProviderOptionSchema)

export default ProductProviderOption

