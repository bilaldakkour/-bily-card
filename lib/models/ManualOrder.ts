import mongoose, { Document, Schema } from 'mongoose'

export interface IManualOrder {
  orderId: string
  productName: string
  userId: string
  quantity: number
  totalProfit: number
  totalCost: number
  totalSale: number
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  notes?: string
  source: 'manual'
  isManual: true
  isVisibleToCustomer: false
  createdBy?: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

interface IManualOrderDocument extends Omit<IManualOrder, 'createdAt' | 'updatedAt'>, Document {
  createdAt: Date
  updatedAt: Date
}

const ManualOrderSchema = new Schema<IManualOrderDocument>(
  {
    orderId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    productName: {
      type: String,
      required: true,
      trim: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    totalProfit: {
      type: Number,
      required: true,
      default: 0,
    },
    totalCost: {
      type: Number,
      required: true,
      default: 0,
    },
    totalSale: {
      type: Number,
      required: true,
      default: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
      default: 'pending',
      index: true,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    source: {
      type: String,
      enum: ['manual'],
      default: 'manual',
      index: true,
    },
    isManual: {
      type: Boolean,
      default: true,
      index: true,
    },
    isVisibleToCustomer: {
      type: Boolean,
      default: false,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
  },
  {
    timestamps: true,
    collection: 'manual_orders',
  }
)

ManualOrderSchema.pre('validate', function (next) {
  const totalCost = Number(this.totalCost || 0)
  const totalSale = Number(this.totalSale || 0)
  this.totalProfit = totalSale - totalCost

  next()
})

ManualOrderSchema.index({ createdAt: -1 })
ManualOrderSchema.index({ userId: 1, createdAt: -1 })
ManualOrderSchema.index({ status: 1, createdAt: -1 })

const ManualOrder =
  mongoose.models.ManualOrder || mongoose.model<IManualOrderDocument>('ManualOrder', ManualOrderSchema)

export default ManualOrder
