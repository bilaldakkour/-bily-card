import mongoose, { Document, Schema, models } from 'mongoose'

export type MatrixRoutingMode = 'cheapest' | 'priority' | 'forced'

export interface IProductProviderRouteRow {
  providerKey: string
  providerProductId: string
  providerProductName?: string
  active: boolean
  fallbackEnabled: boolean
  priority: number
  fixedUnitCost?: number
  metadata?: Record<string, unknown>
}

export interface IProductProviderMatrix extends Document {
  internalSlug: string
  productName?: string
  category?: string
  routingMode: MatrixRoutingMode
  forcedProviderKey?: string
  routes: IProductProviderRouteRow[]
  notes?: string
  updatedBy?: string
  createdAt: Date
  updatedAt: Date
}

const ProductProviderRouteRowSchema = new Schema<IProductProviderRouteRow>(
  {
    providerKey: { type: String, required: true, trim: true, lowercase: true, index: true },
    providerProductId: { type: String, required: true, trim: true, index: true },
    providerProductName: { type: String, trim: true },
    active: { type: Boolean, default: true, index: true },
    fallbackEnabled: { type: Boolean, default: true },
    priority: { type: Number, default: 100 },
    fixedUnitCost: { type: Number, min: 0 },
    metadata: { type: Schema.Types.Mixed },
  },
  { _id: false }
)

const ProductProviderMatrixSchema = new Schema<IProductProviderMatrix>(
  {
    internalSlug: { type: String, required: true, trim: true, lowercase: true, unique: true, index: true },
    productName: { type: String, trim: true },
    category: { type: String, trim: true, lowercase: true, index: true },
    routingMode: { type: String, enum: ['cheapest', 'priority', 'forced'], default: 'cheapest', index: true },
    forcedProviderKey: { type: String, trim: true, lowercase: true },
    routes: { type: [ProductProviderRouteRowSchema], default: [] },
    notes: { type: String, trim: true },
    updatedBy: { type: String },
  },
  { timestamps: true }
)

ProductProviderMatrixSchema.index({ category: 1, updatedAt: -1 })
ProductProviderMatrixSchema.index({ 'routes.providerKey': 1, 'routes.active': 1 })

const ProductProviderMatrix =
  models.ProductProviderMatrix ||
  mongoose.model<IProductProviderMatrix>('ProductProviderMatrix', ProductProviderMatrixSchema)

export default ProductProviderMatrix

