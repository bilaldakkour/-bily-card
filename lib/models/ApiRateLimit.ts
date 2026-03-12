import mongoose, { Document, Schema } from 'mongoose';

interface IApiRateLimit {
  key: string;
  count: number;
  resetAt: Date;
}

interface IApiRateLimitDocument extends Omit<IApiRateLimit, '_id'>, Document {}

const ApiRateLimitSchema = new Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    count: {
      type: Number,
      required: true,
      default: 0,
    },
    resetAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: false }
);

// Cleanup expired buckets automatically.
ApiRateLimitSchema.index({ resetAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.ApiRateLimit ||
  mongoose.model<IApiRateLimitDocument>('ApiRateLimit', ApiRateLimitSchema);
