import mongoose, { Schema, Document } from 'mongoose';

export interface IOtp {
  email: string;
  otp: string;
  expiresAt: Date;
  used: boolean;
}

interface IOtpDocument extends Omit<IOtp, '_id'>, Document {}

const OtpSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
    },
    otp: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    },
    used: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Index for automatic expiration
OtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.Otp || mongoose.model<IOtpDocument>('Otp', OtpSchema);