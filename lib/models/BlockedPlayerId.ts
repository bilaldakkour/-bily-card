import mongoose, { Document, Schema, models } from 'mongoose'

export interface IBlockedPlayerId extends Document {
  productSlug: string
  playerId: string
  reason?: string
  createdBy?: string
  active: boolean
  createdAt: Date
  updatedAt: Date
}

const BlockedPlayerIdSchema = new Schema<IBlockedPlayerId>(
  {
    productSlug: { type: String, required: true, trim: true, lowercase: true, index: true },
    playerId: { type: String, required: true, trim: true, lowercase: true, index: true },
    reason: { type: String, trim: true },
    createdBy: { type: String, trim: true },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
)

BlockedPlayerIdSchema.index({ productSlug: 1, playerId: 1 }, { unique: true })

const BlockedPlayerId =
  models.BlockedPlayerId ||
  mongoose.model<IBlockedPlayerId>('BlockedPlayerId', BlockedPlayerIdSchema)

export default BlockedPlayerId

