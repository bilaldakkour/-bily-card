import mongoose, { Schema, Document } from 'mongoose';
import { IErrorLog } from '../types';

interface IErrorLogDocument extends Omit<IErrorLog, '_id'>, Document {}

const ErrorLogSchema = new Schema(
  {
    errorType: {
      type: String,
      required: true,
      index: true,
    },
    message: {
      type: String,
      required: true,
    },
    stack: String,
    context: {
      userId: mongoose.Schema.Types.ObjectId,
      orderId: mongoose.Schema.Types.ObjectId,
      productId: mongoose.Schema.Types.ObjectId,
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
      index: true,
    },
    resolved: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

ErrorLogSchema.index({ createdAt: -1 });
ErrorLogSchema.index({ severity: 1 });

export default mongoose.models.ErrorLog ||
  mongoose.model<IErrorLogDocument>('ErrorLog', ErrorLogSchema);
