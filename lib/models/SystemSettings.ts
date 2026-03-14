import mongoose, { Schema, Document } from 'mongoose';
import { ISystemSettings } from '../types';

interface ISystemSettingsDocument extends Omit<ISystemSettings, '_id'>, Document {}

const SystemSettingsSchema = new Schema(
  {
    providerApiUrl: String,
    providerApiKey: String,
    providerApiSecret: String,
    telegramBotToken: String,
    telegramChatId: String,
    googleSheetsIntegration: {
      enabled: { type: Boolean, default: false },
      spreadsheetId: String,
      credentialsPath: String,
    },
    autoSyncProducts: { type: Boolean, default: false },
    autoSyncOrders: { type: Boolean, default: false },
    autoRetryFailedOrders: { type: Boolean, default: true },
    autoRefundFailedOrders: { type: Boolean, default: true },
    maxRetryAttempts: { type: Number, default: 3 },
    paymentMethods: [
      {
        key: { type: String, required: true },
        name: { type: String, required: true },
        address: { type: String, default: '' },
        logoUrl: { type: String, default: '' },
        minAmount: { type: Number, default: 0 },
        feePercent: { type: Number, default: 0 },
        active: { type: Boolean, default: true },
      },
    ],
    supportContact: {
      email: { type: String, default: '' },
      phoneDisplay: { type: String, default: '' },
      phoneTel: { type: String, default: '' },
      whatsappNumber: { type: String, default: '' },
    },
  },
  { timestamps: true }
);

export default mongoose.models.SystemSettings ||
  mongoose.model<ISystemSettingsDocument>(
    'SystemSettings',
    SystemSettingsSchema
  );
