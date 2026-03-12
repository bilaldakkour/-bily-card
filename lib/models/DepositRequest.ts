import mongoose, { Schema, Document, Types } from 'mongoose';
import { IDepositRequest } from '../types';

interface IDepositRequestDocument extends Omit<IDepositRequest, '_id'>, Document {}

const DepositRequestSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    username: String,
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      enum: ['USD', 'LBP'],
      default: 'USD',
    },
    paymentMethodKey: {
      type: String,
      default: '',
    },
    paymentMethodName: {
      type: String,
      default: '',
    },
    paymentAddress: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    proofImage: String,
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    rejectionReason: String,
  },
  { timestamps: true }
);

DepositRequestSchema.index({ status: 1, createdAt: -1 });

export default mongoose.models.DepositRequest ||
  mongoose.model<IDepositRequestDocument>(
    'DepositRequest',
    DepositRequestSchema
  );
