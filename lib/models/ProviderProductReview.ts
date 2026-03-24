import mongoose, { Document, Schema, models } from 'mongoose'
import type { ProviderSlot } from '@/lib/providers/providerConfig'

export type ProviderProductClassification =
  | 'matched_to_existing'
  | 'new_unique_products'
  | 'ambiguous_candidates'
  | 'invalid_or_unusable'

export type ProviderProductReviewStatus =
  | 'pending_review'
  | 'linked'
  | 'created'
  | 'ignored'

export interface IProviderProductReview extends Document {
  providerSlot: ProviderSlot
  adapterKey: string
  providerProductId: string
  providerProductName: string
  providerCategory?: string
  classification: ProviderProductClassification
  suggestedInternalSlug?: string
  confidence: number
  reasons: string[]
  requirements?: Record<string, unknown>
  rawSnapshot?: Record<string, unknown>
  reviewStatus: ProviderProductReviewStatus
  updatedBy?: string
  createdAt: Date
  updatedAt: Date
}

const ProviderProductReviewSchema = new Schema<IProviderProductReview>(
  {
    providerSlot: {
      type: String,
      enum: ['primary', 'secondary'],
      required: true,
      index: true,
    },
    adapterKey: { type: String, required: true, trim: true, lowercase: true, index: true },
    providerProductId: { type: String, required: true, trim: true, index: true },
    providerProductName: { type: String, required: true, trim: true },
    providerCategory: { type: String, trim: true },
    classification: {
      type: String,
      enum: [
        'matched_to_existing',
        'new_unique_products',
        'ambiguous_candidates',
        'invalid_or_unusable',
      ],
      required: true,
      index: true,
    },
    suggestedInternalSlug: { type: String, trim: true, lowercase: true },
    confidence: { type: Number, default: 0 },
    reasons: { type: [String], default: [] },
    requirements: { type: Schema.Types.Mixed },
    rawSnapshot: { type: Schema.Types.Mixed },
    reviewStatus: {
      type: String,
      enum: ['pending_review', 'linked', 'created', 'ignored'],
      default: 'pending_review',
      index: true,
    },
    updatedBy: { type: String, default: '' },
  },
  { timestamps: true }
)

ProviderProductReviewSchema.index(
  { providerSlot: 1, adapterKey: 1, providerProductId: 1 },
  { unique: true }
)

const ProviderProductReview =
  models.ProviderProductReview ||
  mongoose.model<IProviderProductReview>('ProviderProductReview', ProviderProductReviewSchema)

export default ProviderProductReview
