import mongoose, { Schema, Document } from 'mongoose';
import { IProduct } from '../types';

interface IProductDocument extends Omit<IProduct, '_id'>, Document {}

const ProductSchema = new Schema(
  {
    providerProductId: {
      type: String,
      required: true,
      unique: true,
    },
    productName: {
      type: String,
      required: true,
      index: true,
    },
    gameName: {
      type: String,
      required: true,
      index: true,
    },
    category: {
      type: String,
      required: true,
      index: true,
    },
    image: String,
    description: String,
    costPrice: {
      type: Number,
      required: true,
    },
    sellingPrice: {
      type: Number,
      required: true,
    },
    profitMargin: {
      type: Number,
      default: 0,
    },
    activeStatus: {
      type: Boolean,
      default: true,
      index: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    stock: {
      type: Number,
      default: -1, // -1 means unlimited
    },
    lastSyncedAt: {
      type: Date,
      default: null,
    },
    providerRawName: {
      type: String,
      default: '',
    },
    providerRawPrice: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Calculate profit margin before saving
ProductSchema.pre('save', function (next) {
  if (this.costPrice && this.sellingPrice) {
    this.profitMargin = this.sellingPrice - this.costPrice;
  }
  next();
});

export default mongoose.models.Product ||
  mongoose.model<IProductDocument>('Product', ProductSchema);
