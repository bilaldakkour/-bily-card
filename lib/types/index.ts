// User & Auth Types
export interface IUser {
  _id: string;
  email: string;
  username?: string;
  password: string;
  role: 'customer' | 'admin' | 'seller';
  displayName: string;
  avatar?: string;
  phoneNumber?: string;
  country?: string;
  isVerified: boolean;
  isBlocked: boolean;
  pricingPercent?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IWallet {
  _id: string;
  userId: string;
  balance_usd: number;
  balance_lbp: number;
  lastUpdated: Date;
}

export interface IWalletTransaction {
  _id: string;
  userId: string;
  type: 'deposit' | 'purchase' | 'refund' | 'manual_adjustment';
  amount: number;
  currency: 'USD' | 'LBP';
  balanceBefore: number;
  balanceAfter: number;
  orderId?: string;
  notes?: string;
  approvedBy?: string;
  createdAt: Date;
}

// Product Types
export interface IProduct {
  _id: string;
  providerProductId: string;
  productName: string;
  gameName: string;
  category: string;
  image?: string;
  description?: string;
  costPrice: number;
  sellingPrice: number;
  profitMargin: number;
  lastSyncedAt?: Date;
  providerRawName?: string;
  providerRawPrice?: number;
  activeStatus: boolean;
  isFeatured: boolean;
  stock?: number;
  createdAt: Date;
  updatedAt: Date;
}

// Order Types
export interface IOrder {
  _id: string;
  orderId: string;
  userId: string;
  customerName: string;
  customerUsername: string;
  productId: string;
  productName: string;
  playerId: string;
  quantity: number;
  costPrice: number;
  sellingPrice: number;
  profit: number;
  currency: 'USD' | 'LBP';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'rejected';
  providerOrderId?: string;
  providerResponse?: any;
  notes?: string;
  failureReason?: string;
  retryCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IDepositRequest {
  _id: string;
  userId: string;
  username: string;
  amount: number;
  currency: 'USD' | 'LBP';
  paymentMethodKey?: string;
  paymentMethodName?: string;
  paymentAddress?: string;
  status: 'pending' | 'approved' | 'rejected';
  proofImage?: string;
  approvedBy?: string;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPaymentMethodSettings {
  key: string;
  name: string;
  address: string;
  logoUrl: string;
  minAmount: number;
  feePercent: number;
  active: boolean;
}

export interface ISupportContactSettings {
  email: string;
  phoneDisplay: string;
  phoneTel: string;
  whatsappNumber: string;
}

// Settings & Logs
export interface ISystemSettings {
  _id: string;
  providerApiUrl: string;
  providerApiKey: string;
  providerApiSecret: string;
  telegramBotToken: string;
  telegramChatId: string;
  googleSheetsIntegration: {
    enabled: boolean;
    spreadsheetId: string;
    credentialsPath: string;
  };
  autoSyncProducts: boolean;
  autoSyncOrders: boolean;
  autoRetryFailedOrders: boolean;
  autoRefundFailedOrders: boolean;
  maxRetryAttempts: number;
  paymentMethods?: IPaymentMethodSettings[];
  supportContact?: ISupportContactSettings;
  updatedAt: Date;
}

export interface IErrorLog {
  _id: string;
  errorType: string;
  message: string;
  stack?: string;
  context: {
    userId?: string;
    orderId?: string;
    productId?: string;
  };
  severity: 'low' | 'medium' | 'high' | 'critical';
  resolved: boolean;
  createdAt: Date;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
  search?: string;
  filter?: Record<string, any>;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}

// JWT Payload
export interface JWTPayload {
  userId: string;
  username: string;
  role: 'customer' | 'admin' | 'seller';
  iat: number;
  exp: number;
}
