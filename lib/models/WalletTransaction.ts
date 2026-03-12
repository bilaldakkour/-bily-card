import mongoose, { Schema, Document } from 'mongoose';
import { IWalletTransaction } from '../types';

interface IWalletTransactionDocument extends Omit<IWalletTransaction, '_id'>, Document {}

const WalletTransactionSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['deposit', 'purchase', 'refund', 'manual_adjustment'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      enum: ['USD', 'LBP'],
      default: 'USD',
    },
    balanceBefore: {
      type: Number,
      required: true,
    },
    balanceAfter: {
      type: Number,
      required: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
    },
    notes: String,
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

WalletTransactionSchema.index({ userId: 1, createdAt: -1 });
WalletTransactionSchema.index({ type: 1 });

export default mongoose.models.WalletTransaction ||
  mongoose.model<IWalletTransactionDocument>(
    'WalletTransaction',
    WalletTransactionSchema
  );
