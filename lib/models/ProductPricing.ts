import mongoose, { Document, Schema } from 'mongoose';

interface IProductPricingDocument extends Document {
  productSlug: string;
  percentage: number;
  updatedBy?: Schema.Types.ObjectId;
  updatedAt: Date;
  createdAt: Date;
}

const ProductPricingSchema = new Schema<IProductPricingDocument>(
  {
    productSlug: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
      lowercase: true,
    },
    percentage: {
      type: Number,
      default: 0,
      min: -100,
      max: 1000,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

export default mongoose.models.ProductPricing ||
  mongoose.model<IProductPricingDocument>('ProductPricing', ProductPricingSchema);
