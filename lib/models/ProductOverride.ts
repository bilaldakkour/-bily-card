import mongoose, { Document, Schema } from 'mongoose';

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
  stockStatus?: 'in_stock' | 'out_of_stock' | 'limited';
  tags?: string[];
  featured?: boolean;
  bestSeller?: boolean;
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
    stockStatus: { type: String, enum: ['in_stock', 'out_of_stock', 'limited'] },
    tags: { type: [String], default: undefined },
    featured: { type: Boolean },
    bestSeller: { type: Boolean },
  },
  { timestamps: true }
);

export default (mongoose.models.ProductOverride as mongoose.Model<IProductOverride>) ||
  mongoose.model<IProductOverride>('ProductOverride', ProductOverrideSchema);
