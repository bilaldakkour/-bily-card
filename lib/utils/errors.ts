export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function handleError(error: any, defaultMessage = 'An error occurred') {
  if (error instanceof ApiError) {
    return {
      statusCode: error.statusCode,
      message: error.message,
      context: error.context,
    };
  }

  if (error instanceof Error) {
    const isProd = process.env.NODE_ENV === 'production';
    return {
      statusCode: 500,
      message: isProd ? 'Internal server error' : error.message,
    };
  }

  return {
    statusCode: 500,
    message: defaultMessage,
  };
}

export const ErrorMessages = {
  UNAUTHORIZED: 'Unauthorized access',
  FORBIDDEN: 'Access forbidden',
  NOT_FOUND: 'Resource not found',
  BAD_REQUEST: 'Invalid request',
  CONFLICT: 'Resource already exists',
  INTERNAL_SERVER_ERROR: 'Internal server error',
  INSUFFICIENT_BALANCE: 'Insufficient wallet balance',
  INACTIVE_PRODUCT: 'This product is currently inactive',
  INVALID_PLAYER_ID: 'Invalid player ID',
  DUPLICATE_ORDER: 'You have a pending order for this product',
  PROVIDER_ERROR: 'Provider service error',
  GOOGLE_SHEETS_ERROR: 'Failed to sync with Google Sheets',
  TELEGRAM_ERROR: 'Failed to send notification',
};
