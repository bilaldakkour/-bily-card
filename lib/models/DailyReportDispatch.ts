import mongoose, { Document, Schema } from 'mongoose';

interface IDailyReportDispatch {
  channel: 'telegram_admin_daily';
  reportDate: string;
  status: 'sending' | 'sent' | 'failed';
  sentAt?: Date | null;
  lastAttemptAt?: Date | null;
  lastError?: string;
}

interface IDailyReportDispatchDocument extends Omit<IDailyReportDispatch, '_id'>, Document {}

const DailyReportDispatchSchema = new Schema(
  {
    channel: {
      type: String,
      enum: ['telegram_admin_daily'],
      required: true,
      index: true,
    },
    reportDate: {
      type: String,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['sending', 'sent', 'failed'],
      required: true,
      default: 'sending',
      index: true,
    },
    sentAt: {
      type: Date,
      default: null,
    },
    lastAttemptAt: {
      type: Date,
      default: null,
    },
    lastError: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

DailyReportDispatchSchema.index({ channel: 1, reportDate: 1 }, { unique: true });

export default mongoose.models.DailyReportDispatch ||
  mongoose.model<IDailyReportDispatchDocument>('DailyReportDispatch', DailyReportDispatchSchema);
