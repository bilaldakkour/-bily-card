import mongoose, { Document, Schema } from 'mongoose';
import type { ProductProviderMode } from '@/lib/products/providerMode';
import type { ProductRoutingMode } from '@/lib/data/products';

export interface IProductOverride extends Omit<Document, '_id'> {
  slug: string;
  active: boolean;
  name?: string;
  category?: string;
  image?: string;
  shortDescription?: string;
  fullDescription?: string;
  price?: number;
  platform?: string;
  deliveryTime?: string;
  stockQuantity?: number;
  stockStatus?: 'in_stock' | 'out_of_stock' | 'limited';
  saleEnabled?: boolean;
  tags?: string[];
  featured?: boolean;
  bestSeller?: boolean;
  providerMode?: ProductProviderMode;
  routingMode?: ProductRoutingMode;
  providerLinks?: Array<{
    providerCode: string;
    providerProductId: string;
    providerProductName?: string;
    enabled?: boolean;
    priority?: number;
    priceSource?: 'provider' | 'manual';
    manualCost?: number;
    lastKnownCost?: number;
    providerAvailability?: 'unknown' | 'available' | 'unavailable';
    fallbackEnabled?: boolean;
    lastSyncAt?: Date;
  }>;
}

const ProductOverrideSchema = new Schema<IProductOverride>(
  {
    slug: { type: String, required: true, trim: true, lowercase: true, unique: true, index: true },
    active: { type: Boolean, default: true, index: true },
    name: { type: String, trim: true },
    category: { type: String, trim: true, lowercase: true },
    image: { type: String, trim: true },
    shortDescription: { type: String, trim: true },
    fullDescription: { type: String, trim: true },
    price: { type: Number, min: 0 },
    platform: { type: String, trim: true },
    deliveryTime: { type: String, trim: true },
    stockQuantity: { type: Number, min: 0 },
    stockStatus: { type: String, enum: ['in_stock', 'out_of_stock', 'limited'] },
    saleEnabled: { type: Boolean },
    tags: { type: [String], default: undefined },
    featured: { type: Boolean },
    bestSeller: { type: Boolean },
    providerMode: { type: String, enum: ['primary', 'manual', 'secondary'] },
    routingMode: { type: String, enum: ['cheapest', 'priority'], default: 'cheapest', index: true },
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

export default (mongoose.models.ProductOverride as mongoose.Model<IProductOverride>) ||
  mongoose.model<IProductOverride>('ProductOverride', ProductOverrideSchema);
