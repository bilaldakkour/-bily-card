import mongoose, { Schema, Document } from 'mongoose';
import { IWallet } from '../types';

interface IWalletDocument extends Omit<IWallet, '_id'>, Document {}

const WalletSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    balance_usd: {
      type: Number,
      default: 0,
    },
    balance_lbp: {
      type: Number,
      default: 0,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export default mongoose.models.Wallet ||
  mongoose.model<IWalletDocument>('Wallet', WalletSchema);
