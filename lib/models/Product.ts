import mongoose, { Schema, Document } from 'mongoose';
import { IProduct } from '../types';

interface IProductDocument extends Omit<IProduct, '_id'>, Document {}

const ProductSchema = new Schema(
  {
    slug: {
      type: String,
      trim: true,
      lowercase: true,
      index: true,
    },
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
    routingMode: {
      type: String,
      enum: ['cheapest', 'priority'],
      default: 'cheapest',
      index: true,
    },
    providerLinks: {
      type: [
        new Schema(
          {
            providerCode: { type: String, required: true, trim: true, lowercase: true },
            providerProductId: { type: String, required: true, trim: true },
            providerProductName: { type: String, trim: true },
            enabled: { type: Boolean, default: true },
            priority: { type: Number, default: 100 },
            priceSource: { type: String, enum: ['provider', 'manual'], default: 'provider' },
            manualCost: { type: Number, min: 0 },
            lastKnownCost: { type: Number, min: 0 },
            providerAvailability: {
              type: String,
              enum: ['unknown', 'available', 'unavailable'],
              default: 'unknown',
            },
            fallbackEnabled: { type: Boolean, default: true },
            lastSyncAt: { type: Date },
          },
          { _id: false }
        ),
      ],
      default: [],
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
