import mongoose, { Document, Schema } from 'mongoose';
import type { ProductProviderMode } from '@/lib/products/providerMode';
import { resolveStockFields } from '@/lib/products/stock';
import type { ProductRoutingMode } from '@/lib/data/products';

export type CustomProductMode = 'single' | 'package' | 'count';

export interface ICustomPackageOption {
  key?: string;
  label: string;
  price: number;
  inStock: boolean;
  profitMarginPercent?: number;
  manualBaseCost?: number;
  roundingRule?: 'none' | 'ceil_0_01' | 'round_0_01' | 'ceil_0_1' | 'round_0_1' | 'ceil_1' | 'round_1';
  providerLinks?: Array<{
    providerCode: string;
    providerProductId: string;
    providerProductName?: string;
    enabled?: boolean;
    executionEnabled?: boolean;
    priceSyncEnabled?: boolean;
    priority?: number;
    priceSource?: 'provider' | 'manual';
    manualCost?: number;
    lastKnownCost?: number;
    lastCost?: number;
    providerAvailability?: 'unknown' | 'available' | 'unavailable';
    healthStatus?: 'unknown' | 'healthy' | 'degraded' | 'unhealthy';
    fallbackEnabled?: boolean;
    lastError?: string;
    variantKey?: string;
    lastSyncAt?: Date;
  }>;
}

export interface ICustomProduct extends Omit<Document, '_id'> {
  name: string;
  slug: string;
  shortDescription: string;
  fullDescription: string;
  price: number;
  costPrice?: number;
  category: string;
  image: string;
  mode: CustomProductMode;
  packageOptions: ICustomPackageOption[];
  countMin?: number;
  countMax?: number;
  active: boolean;
  featured: boolean;
  bestSeller: boolean;
  stockQuantity: number;
  stockStatus: 'in_stock' | 'out_of_stock' | 'limited';
  saleEnabled: boolean;
  platform: string;
  deliveryTime: string;
  tags: string[];
  providerMode: ProductProviderMode;
  profitMarginPercent?: number;
  roundingRule?: 'none' | 'ceil_0_01' | 'round_0_01' | 'ceil_0_1' | 'round_0_1' | 'ceil_1' | 'round_1';
  routingMode?: ProductRoutingMode;
  providerLinks?: Array<{
    providerCode: string;
    providerProductId: string;
    providerProductName?: string;
    enabled?: boolean;
    executionEnabled?: boolean;
    priceSyncEnabled?: boolean;
    priority?: number;
    priceSource?: 'provider' | 'manual';
    manualCost?: number;
    lastKnownCost?: number;
    lastCost?: number;
    providerAvailability?: 'unknown' | 'available' | 'unavailable';
    healthStatus?: 'unknown' | 'healthy' | 'degraded' | 'unhealthy';
    fallbackEnabled?: boolean;
    lastError?: string;
    variantKey?: string;
    lastSyncAt?: Date;
  }>;
}

const CustomPackageOptionSchema = new Schema<ICustomPackageOption>(
  {
    key: { type: String, trim: true, lowercase: true },
    label: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    inStock: { type: Boolean, default: true },
    profitMarginPercent: { type: Number, default: undefined },
    manualBaseCost: { type: Number, min: 0, default: undefined },
    roundingRule: {
      type: String,
      enum: ['none', 'ceil_0_01', 'round_0_01', 'ceil_0_1', 'round_0_1', 'ceil_1', 'round_1'],
      default: 'none',
    },
    providerLinks: {
      type: [
        new Schema(
          {
            providerCode: { type: String, required: true, trim: true, lowercase: true },
            providerProductId: { type: String, required: true, trim: true },
            providerProductName: { type: String, trim: true },
            enabled: { type: Boolean, default: true },
            executionEnabled: { type: Boolean, default: true },
            priceSyncEnabled: { type: Boolean, default: true },
            priority: { type: Number, default: 100 },
            priceSource: { type: String, enum: ['provider', 'manual'], default: 'provider' },
            manualCost: { type: Number, min: 0 },
            lastKnownCost: { type: Number, min: 0 },
            lastCost: { type: Number, min: 0 },
            providerAvailability: {
              type: String,
              enum: ['unknown', 'available', 'unavailable'],
              default: 'unknown',
            },
            healthStatus: {
              type: String,
              enum: ['unknown', 'healthy', 'degraded', 'unhealthy'],
              default: 'unknown',
            },
            fallbackEnabled: { type: Boolean, default: true },
            lastError: { type: String, trim: true },
            variantKey: { type: String, trim: true, lowercase: true },
            lastSyncAt: { type: Date },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
  },
  { _id: false }
);

const CustomProductSchema = new Schema<ICustomProduct>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true, unique: true, index: true },
    shortDescription: { type: String, required: true, trim: true },
    fullDescription: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    costPrice: { type: Number, min: 0 },
    category: { type: String, required: true, trim: true, lowercase: true, index: true },
    image: { type: String, required: true, trim: true },
    mode: { type: String, enum: ['single', 'package', 'count'], default: 'single', index: true },
    packageOptions: { type: [CustomPackageOptionSchema], default: [] },
    countMin: { type: Number, min: 1 },
    countMax: { type: Number, min: 1 },
    active: { type: Boolean, default: true, index: true },
    featured: { type: Boolean, default: false },
    bestSeller: { type: Boolean, default: false },
    stockQuantity: { type: Number, default: 0, min: 0 },
    stockStatus: {
      type: String,
      enum: ['in_stock', 'out_of_stock', 'limited'],
      default: 'out_of_stock',
      index: true,
    },
    saleEnabled: { type: Boolean, default: true, index: true },
    platform: { type: String, default: 'BilyCard', trim: true },
    deliveryTime: { type: String, default: 'Instant', trim: true },
    tags: { type: [String], default: [] },
    providerMode: { type: String, enum: ['primary', 'manual', 'secondary'], default: 'manual' },
    profitMarginPercent: { type: Number, default: undefined },
    roundingRule: {
      type: String,
      enum: ['none', 'ceil_0_01', 'round_0_01', 'ceil_0_1', 'round_0_1', 'ceil_1', 'round_1'],
      default: 'none',
    },
    routingMode: { type: String, enum: ['cheapest', 'priority'], default: 'cheapest', index: true },
    providerLinks: {
      type: [
        new Schema(
          {
            providerCode: { type: String, required: true, trim: true, lowercase: true },
            providerProductId: { type: String, required: true, trim: true },
            providerProductName: { type: String, trim: true },
            enabled: { type: Boolean, default: true },
            executionEnabled: { type: Boolean, default: true },
            priceSyncEnabled: { type: Boolean, default: true },
            priority: { type: Number, default: 100 },
            priceSource: { type: String, enum: ['provider', 'manual'], default: 'provider' },
            manualCost: { type: Number, min: 0 },
            lastKnownCost: { type: Number, min: 0 },
            lastCost: { type: Number, min: 0 },
            providerAvailability: {
              type: String,
              enum: ['unknown', 'available', 'unavailable'],
              default: 'unknown',
            },
            healthStatus: {
              type: String,
              enum: ['unknown', 'healthy', 'degraded', 'unhealthy'],
              default: 'unknown',
            },
            fallbackEnabled: { type: Boolean, default: true },
            lastError: { type: String, trim: true },
            variantKey: { type: String, trim: true, lowercase: true },
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

CustomProductSchema.pre('validate', function (next) {
  const resolved = resolveStockFields(this.stockQuantity, this.stockStatus);
  this.stockQuantity = resolved.stockQuantity;
  this.stockStatus = resolved.stockStatus;
  next();
});

export default (mongoose.models.CustomProduct as mongoose.Model<ICustomProduct>) ||
  mongoose.model<ICustomProduct>('CustomProduct', CustomProductSchema);
