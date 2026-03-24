import mongoose, { Document, Schema, models } from 'mongoose'
import type { ProviderRoutingMode } from '@/lib/models/ProductProviderOption'

export interface IProductRoutingPolicy extends Document {
  internalSlug: string
  routingMode: ProviderRoutingMode
  forcedProviderKey?: string
  updatedBy?: string
  createdAt: Date
  updatedAt: Date
}

const ProductRoutingPolicySchema = new Schema<IProductRoutingPolicy>(
  {
    internalSlug: { type: String, required: true, trim: true, lowercase: true, unique: true, index: true },
    routingMode: { type: String, enum: ['cheapest', 'priority', 'forced'], default: 'cheapest', index: true },
    forcedProviderKey: { type: String, trim: true, lowercase: true },
    updatedBy: { type: String },
  },
  { timestamps: true }
)

const ProductRoutingPolicy =
  models.ProductRoutingPolicy ||
  mongoose.model<IProductRoutingPolicy>('ProductRoutingPolicy', ProductRoutingPolicySchema)

export default ProductRoutingPolicy

