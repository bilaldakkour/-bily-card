import mongoose, { Schema, Document, models } from 'mongoose'

export interface IUserProductDiscount extends Document {
  userId: string
  productSlug: string
  discountPercent: number
  isActive: boolean
  updatedBy?: string
  createdAt: Date
  updatedAt: Date
}

const UserProductDiscountSchema = new Schema<IUserProductDiscount>(
  {
    userId: { type: String, required: true, index: true },
    productSlug: { type: String, required: true, lowercase: true, trim: true, index: true },
    discountPercent: { type: Number, required: true, default: 0, min: 0, max: 100 },
    isActive: { type: Boolean, default: true, index: true },
    updatedBy: { type: String },
  },
  { timestamps: true }
)

UserProductDiscountSchema.index({ userId: 1, productSlug: 1 }, { unique: true })

const UserProductDiscount =
  models.UserProductDiscount ||
  mongoose.model<IUserProductDiscount>('UserProductDiscount', UserProductDiscountSchema)

export default UserProductDiscount

