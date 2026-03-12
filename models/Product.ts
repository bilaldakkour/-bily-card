import mongoose, { Document, Schema } from 'mongoose'

export interface IProduct extends Omit<Document, '_id'> {
  _id: string
  name: string
  slug: string
  description: string
  price: number
  image?: string
  category: string
  providerProductId?: string
  lastSyncedAt?: Date
  providerRawName?: string
  providerRawPrice?: number
  active: boolean
  featured: boolean
  createdAt: Date
  updatedAt: Date
}

const ProductSchema: Schema = new Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  image: { type: String },
  category: { type: String, required: true },
  providerProductId: { type: String },
  lastSyncedAt: { type: Date },
  providerRawName: { type: String },
  providerRawPrice: { type: Number },
  active: { type: Boolean, default: true },
  featured: { type: Boolean, default: false },
}, {
  timestamps: true,
})

export const Product = mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema)