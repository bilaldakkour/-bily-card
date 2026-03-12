# Bily Card AI Automation System - Documentation

## 🚀 Overview

Bily Card is a complete automation system for managing digital gaming top-ups with integrated provider sync, wallet management, Google Sheets reporting, and Telegram notifications.

## 📁 Project Structure

```
bily-card/
├── app/
│   ├── api/                    # API Routes
│   │   ├── auth/              # Authentication endpoints
│   │   ├── products/          # Product endpoints
│   │   ├── orders/            # Order endpoints
│   │   ├── wallet/            # Wallet endpoints
│   │   ├── admin/             # Admin endpoints
│   │   └── integrations/      # Integration endpoints
│   ├── admin/                 # Admin dashboard pages
│   ├── customer/              # Customer pages
│   └── page.tsx               # Home page
├── lib/
│   ├── db/                    # Database connection
│   ├── models/                # MongoDB schemas
│   ├── services/              # Business logic
│   │   ├── providerService.ts
│   │   ├── orderService.ts
│   │   ├── walletService.ts
│   │   ├── telegramService.ts
│   │   └── googleSheetsService.ts
│   ├── auth/                  # JWT & middleware
│   ├── types/                 # TypeScript types
│   └── utils/                 # Helpers & validation
├── components/                # Reusable components
└── public/                    # Static files
```

## 🔧 Installation & Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env.local` and fill in your credentials:

```bash
cp .env.example .env.local
```

Edit `.env.local` with:
- MongoDB connection string
- JWT secret
- Provider API credentials
- Telegram bot token
- Google Sheets ID and credentials

### 3. Initialize Database

Ensure MongoDB is running and models are synced:

```bash
npm run dev
```

The application will automatically sync models on first run.

## 🔐 Authentication

### JWT Flow

1. User registers/logs in
2. Server generates JWT token
3. Token stored in localStorage
4. Token sent in Authorization header: `Bearer <token>`
5. Server validates token in protected routes

### Admin Access

Only users with `role: 'admin'` can access admin endpoints.

```typescript
// Example: Admin-only endpoint
export async function POST(req: NextRequest) {
  return withAdminAuth(req, handler);
}
```

## 💰 Wallet System

### Flow

1. Customer deposits money (pending approval)
2. Admin approves deposit
3. Wallet balance updates
4. Customer purchases product
5. Wallet deducted atomically
6. Transaction logged
7. If order fails, wallet refunded

### Transaction Types

- `deposit` - Money added by admin
- `purchase` - Purchase deduction
- `refund` - Failed order refund
- `manual_adjustment` - Admin adjustment

## 📦 Order Processing

### Complete Flow

```
Customer initiates order
    ↓
Wallet checked for sufficient balance
    ↓
Wallet deducted atomically
    ↓
Order created in DB (status: processing)
    ↓
Sent to provider API
    ↓
Provider response received
    ↓
Order status updated (completed/failed)
    ↓
Google Sheets synced
    ↓
Telegram notification sent
    ↓
Transaction logged
```

## 🤖 Integrations

### Provider API Service

Handles all communication with DailyCard or similar providers:

```typescript
// Fetch products
const products = await providerService.fetchProducts();

// Create order
const response = await providerService.createOrder({
  productId,
  playerId,
  quantity,
});

// Check status
const status = await providerService.getOrderStatus(orderId);
```

### Telegram Bot

Sends admin and customer notifications:

```typescript
// Admin notification
await telegramService.sendAdminNotification('New Order', {
  orderId,
  customer,
  product,
  amount,
});

// Customer notification
await telegramService.sendCustomerNotification(chatId, 'Order Complete', {
  Product: 'PUBG UC 325',
  Status: 'Completed',
});
```

### Google Sheets

Automatic sync of orders and transactions:

```typescript
// Append order
await googleSheetsService.appendOrder(order);

// Append transaction
await googleSheetsService.appendWalletTransaction(transaction);
```

## 📊 Reports

### Daily Report

Endpoint: `GET /api/admin/reports/daily`

Returns:
- Order stats (total, completed, failed, pending)
- Financial data (sales, costs, profit)
- Top products
- Top customers

## 🛡️ Security

### Implemented Security Measures

1. **JWT Authentication** - Token-based auth with expiry
2. **Password Hashing** - bcryptjs with salt rounds
3. **Role-Based Access** - Admin/customer/seller roles
4. **API Route Protection** - `withAuth` and `withAdminAuth` middleware
5. **Input Validation** - Zod schema validation
6. **Error Handling** - Safe error messages, no data leaks
7. **Environment Variables** - Secrets in .env.local

### Never Expose to Customers

- Provider internal costs
- Profit margins
- Provider API credentials
- Provider order responses
- System error details

## 🚀 Deployment (Vercel)

### Steps

1. Push code to GitHub
2. Connect repo to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy automatically on push

### Important

- Set `NODE_ENV=production`
- Use Vercel's MongoDB integration or external connection
- Ensure JWT_SECRET is strong
- Set proper NEXT_PUBLIC_API_URL

## 📱 Customer Pages

| Page | Route | Purpose |
|------|-------|---------|
| Home | `/` | Landing page |
| Register | `/customer/register` | Create account |
| Login | `/customer/login` | Sign in |
| Products | `/customer/products` | Browse products |
| Wallet | `/customer/wallet` | View balance & history |
| Orders | `/customer/orders` | Order history |

## 🔧 Admin Pages

| Page | Route | Purpose |
|------|-------|---------|
| Login | `/admin/login` | Admin login |
| Dashboard | `/admin` | Daily stats & reports |
| Orders | `/admin/orders` | Manage orders |
| Products | `/admin/products` | Manage products |
| Users | `/admin/users` | Manage users |

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (protected)

### Products
- `GET /api/products` - Get active products
- `POST /api/admin/products/sync` - Sync from provider (admin)

### Orders
- `POST /api/orders` - Create order (protected)
- `GET /api/orders` - Get user orders (protected)
- `GET /api/orders/:id` - Get order details (protected)
- `GET /api/admin/orders` - List all orders (admin)
- `PATCH /api/admin/orders/:id` - Update order (admin)

### Wallet
- `GET /api/wallet` - Get wallet balance (protected)
- `GET /api/wallet/history` - Get transaction history (protected)

### Reports
- `GET /api/admin/reports/daily` - Daily report (admin)

## 🧪 Testing

### Test Admin Account

Create via registration, then promote in DB:

```javascript
db.users.updateOne(
  { username: 'admin' },
  { $set: { role: 'admin' } }
)
```

### API Testing

Use Postman or curl:

```bash
# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@example.com","password":"123456","displayName":"Test User"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"123456"}'

# Get products
curl http://localhost:3000/api/products
```

## 🐛 Troubleshooting

### MongoDB Connection Failed

- Verify connection string in .env.local
- Check IP whitelist in MongoDB Atlas
- Ensure database user has correct permissions

### Telegram Not Sending

- Verify bot token is correct
- Check chat ID is valid
- Ensure bot has permission to send messages

### Google Sheets Sync Not Working

- Verify spreadsheet ID
- Check credentials file path
- Ensure service account has editor access

##  📈 Future Enhancements

1. Email notifications
2. SMS notifications
3. Multiple currency conversion
4. Payment gateway integration (Stripe, PayPal)
5. Referral system
6. Promotional codes
7. Subscription plans
8. Advanced analytics
9. Multi-language support
10. Mobile app

## 📝 License

Proprietary - Bily Card Inc.
