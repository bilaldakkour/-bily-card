import mongoose, { Schema, Document } from 'mongoose';
import { IOrder } from '../types';

interface IOrderDocument extends Omit<IOrder, '_id'>, Document {}

const OrderSchema = new Schema(
  {
    orderId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    productId: {
      type: String,
      required: true,
    },
    productName: {
      type: String,
      required: true,
    },
    productSlug: String,
    category: String,
    providerProductId: String,
    selectedProviderId: String,
    selectedProviderCode: String,
    providerSlot: String,
    selectedPackageOption: String,
    providerMatchedProductName: String,
    providerMatchMode: String,
    playerId: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    baseUnitPrice: {
      type: Number,
      default: 0,
    },
    providerUnitCost: {
      type: Number,
      default: 0,
    },
    providerEffectiveCost: {
      type: Number,
      default: 0,
    },
    providerTotalCost: {
      type: Number,
      default: 0,
    },
    grossProfit: {
      type: Number,
      default: 0,
    },
    quantity: {
      type: Number,
      default: 1,
    },
    total: {
      type: Number,
      required: true,
    },
    walletBalanceBefore: {
      type: Number,
      default: 0,
    },
    walletBalanceAfter: {
      type: Number,
      default: 0,
    },
    currency: {
      type: String,
      enum: ['USD', 'LBP'],
      default: 'USD',
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'refunded', 'rejected'],
      default: 'pending',
      index: true,
    },
    providerStatus: {
      type: String,
      default: 'pending',
    },
    providerOrderId: String,
    routingRequestUuid: {
      type: String,
      index: true,
      sparse: true,
    },
    providerAttempts: {
      type: [
        new Schema(
          {
            providerId: { type: String },
            providerCode: { type: String },
            providerProductId: { type: String },
            status: { type: String, enum: ['success', 'failed', 'skipped'], default: 'skipped' },
            message: { type: String },
            attemptedAt: { type: Date, default: Date.now },
            rawCost: { type: Number, default: 0 },
            effectiveCost: { type: Number, default: 0 },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
    providerResponse: Schema.Types.Mixed,
    notes: String,
    failureReason: String,
    retryCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Indexes for queries
OrderSchema.index({ userId: 1, createdAt: -1 });
OrderSchema.index({ createdAt: -1 });

export default mongoose.models.Order ||
  mongoose.model<IOrderDocument>('Order', OrderSchema);
