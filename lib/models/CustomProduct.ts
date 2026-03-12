import mongoose, { Document, Schema } from 'mongoose';

export type CustomProductMode = 'single' | 'package' | 'count';

export interface ICustomPackageOption {
  label: string;
  price: number;
  inStock: boolean;
}

export interface ICustomProduct extends Omit<Document, '_id'> {
  name: string;
  slug: string;
  shortDescription: string;
  fullDescription: string;
  price: number;
  category: string;
  image: string;
  mode: CustomProductMode;
  packageOptions: ICustomPackageOption[];
  countMin?: number;
  countMax?: number;
  active: boolean;
  featured: boolean;
  bestSeller: boolean;
  stockStatus: 'in_stock' | 'out_of_stock' | 'limited';
  platform: string;
  deliveryTime: string;
  tags: string[];
}

const CustomPackageOptionSchema = new Schema<ICustomPackageOption>(
  {
    label: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    inStock: { type: Boolean, default: true },
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
    category: { type: String, required: true, trim: true, lowercase: true, index: true },
    image: { type: String, required: true, trim: true },
    mode: { type: String, enum: ['single', 'package', 'count'], default: 'single', index: true },
    packageOptions: { type: [CustomPackageOptionSchema], default: [] },
    countMin: { type: Number, min: 1 },
    countMax: { type: Number, min: 1 },
    active: { type: Boolean, default: true, index: true },
    featured: { type: Boolean, default: false },
    bestSeller: { type: Boolean, default: false },
    stockStatus: {
      type: String,
      enum: ['in_stock', 'out_of_stock', 'limited'],
      default: 'in_stock',
      index: true,
    },
    platform: { type: String, default: 'BilyCard', trim: true },
    deliveryTime: { type: String, default: 'Instant', trim: true },
    tags: { type: [String], default: [] },
  },
  { timestamps: true }
);

export default (mongoose.models.CustomProduct as mongoose.Model<ICustomProduct>) ||
  mongoose.model<ICustomProduct>('CustomProduct', CustomProductSchema);
