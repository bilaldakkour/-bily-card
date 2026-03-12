import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';
import { IUser } from '../types';

interface IUserDocument extends Omit<IUser, '_id'>, Document {}

const UserSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    username: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      minlength: 3,
      maxlength: 50,
      index: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false,
    },
    role: {
      type: String,
      enum: ['customer', 'admin', 'seller'],
      default: 'customer',
    },
    displayName: {
      type: String,
      required: true,
    },
    avatar: String,
    phoneNumber: {
      type: String,
      required: function (this: { isNew: boolean }) {
        return this.isNew;
      },
      unique: true,
      sparse: true,
      trim: true,
      minlength: 7,
      maxlength: 20,
      index: true,
    },
    country: String,
    isVerified: {
      type: Boolean,
      default: false,
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    pricingPercent: {
      type: Number,
      default: 0,
      min: -100,
      max: 1000,
    },
  },
  { timestamps: true }
);

const BCRYPT_ROUNDS = 12;

// Hash password before saving.
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  // Keep existing bcrypt hashes untouched on save.
  if (typeof this.password === 'string' && this.password.startsWith('$2')) {
    return next();
  }

  this.password = await bcrypt.hash(this.password, BCRYPT_ROUNDS);
  next();
});

// Compare passwords with backward compatibility for legacy mock hashes.
UserSchema.methods.comparePassword = async function (
  enteredPassword: string
): Promise<boolean> {
  const currentPassword = String(this.password || '');

  if (!currentPassword) {
    return false;
  }

  if (currentPassword.startsWith('$2')) {
    return bcrypt.compare(enteredPassword, currentPassword);
  }

  // Legacy fallback for accounts created before secure hashing rollout.
  if (currentPassword.startsWith('hashed_')) {
    return currentPassword === `hashed_${enteredPassword}`;
  }

  return false;
};

// Remove password from response
UserSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

export default mongoose.models.User ||
  mongoose.model<IUserDocument>('User', UserSchema);
