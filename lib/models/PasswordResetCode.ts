import mongoose, { Document, Schema } from 'mongoose'

export interface IPasswordResetCode {
  email: string
  otp: string
  expiresAt: Date
  used: boolean
}

interface IPasswordResetCodeDocument extends Omit<IPasswordResetCode, '_id'>, Document {}

const PasswordResetCodeSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    otp: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 10 * 60 * 1000),
    },
    used: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
)

PasswordResetCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export default (mongoose.models.PasswordResetCode as mongoose.Model<IPasswordResetCodeDocument>) ||
  mongoose.model<IPasswordResetCodeDocument>('PasswordResetCode', PasswordResetCodeSchema)
