# Bily Card - Gaming Top-Up Automation System

A powerful, production-ready automation platform for managing digital gaming top-ups with integrated provider APIs, wallet management, admin dashboard, and comprehensive reporting.

## 🌟 Features

### 🎮 Customer Platform
- **Product Browsing**: Browse 110+ gaming products with real-time availability
- **Secure Wallet**: Multi-currency wallet (USD/LBP) with transaction history
- **One-Click Purchases**: Fast checkout with instant delivery
- **Order Tracking**: Real-time order status and history
- **Deposit Management**: Request funds with admin approval workflow

### 👨‍💼 Admin Dashboard
- **Real-Time Analytics**: Daily sales, costs, profits, and order statistics
- **Order Management**: View, filter, and manage all orders
- **Product Management**: Sync products from provider, manage pricing and status
- **User Management**: Manage user accounts and wallet balances
- **Deposit Approval**: Approve or reject customer deposit requests
- **Daily Reports**: Automated Google Sheets integration for reporting
- **Top Performers**: See top products and customers at a glance

### 🔧 Technical Integration
- **Multi-Provider Support**: Abstracted provider API for easy switching
- **Telegram Notifications**: Real-time alerts for admins and customers
- **Google Sheets Integration**: Automatic sync of orders and financials
- **JWT Authentication**: Secure token-based auth with role-based access
- **MongoDB**: Scalable NoSQL database with proper indexing
- **Atomic Transactions**: Safe wallet operations with automatic refund logic

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- MongoDB Atlas account (free tier available)
- Telegram Bot token (optional but recommended)
- Google Sheets API credentials (optional)

### 1. Clone & Install

```bash
git clone <repository-url>
cd bily-card
npm install
```

### 2. Environment Setup

```bash
# Copy example to local
cp .env.example .env.local

# Edit .env.local with your credentials
```

**Required Variables:**
```
MONGODB_URI - Your MongoDB connection string
JWT_SECRET - Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
PROVIDER_API_URL - Your DailyCard or similar provider API
PROVIDER_API_KEY - Your provider API key
TELEGRAM_BOT_TOKEN - Create bot with @BotFather on Telegram
TELEGRAM_ADMIN_CHAT_ID - Your admin chat ID (can get with /start)
```

### 3. Run Development Server

```bash
npm run dev
```

Visit http://localhost:3000

## 📱 User Roles

### Customer Account
- Register at `/customer/register`
- Login at `/customer/login`
- Browse products at `/customer/products`
- Manage wallet at `/customer/wallet`
- View orders at `/customer/orders`

**Test Account (after creation):**
```
Username: testuser
Email: test@example.com
Password: password123
```

### Admin Account
- Login at `/admin/login`
- Create admin: In MongoDB, update user role to 'admin'

**Test Admin (after creation):**
```bash
# In MongoDB Atlas
db.users.updateOne(
  { username: "admin" },
  { $set: { role: "admin" } }
)
```

Then login at `/admin/login`

## 🏗️ Project Architecture

```
bily-card/
├── app/
│   ├── api/                      # API Routes
│   │   ├── auth/                 # Authentication
│   │   ├── products/             # Product endpoints
│   │   ├── orders/               # Order operations
│   │   ├── wallet/               # Wallet management
│   │   └── admin/                # Admin operations
│   ├── customer/                 # Customer pages
│   │   ├── register/
│   │   ├── login/
│   │   ├── products/
│   │   ├── wallet/
│   │   ├── orders/
│   │   └── checkout/[productId]/
│   ├── admin/                    # Admin pages
│   │   ├── login/
│   │   ├── page.tsx              # Dashboard
│   │   ├── orders/
│   │   ├── products/
│   │   ├── deposits/
│   │   └── users/
│   └── layout.tsx                # Root layout
├── lib/
│   ├── db/mongodb.ts             # Database connection
│   ├── models/                   # MongoDB schemas (8 models)
│   ├── services/                 # Business logic (5 services)
│   ├── auth/                     # JWT & middleware
│   ├── types/                    # TypeScript interfaces
│   └── utils/                    # Helpers & validation
├── hooks/                        # Custom React hooks
├── public/                       # Static files
├── .env.example                  # Environment template
└── package.json                  # Dependencies
```

## 📊 Database Models

### User
- Customer and admin accounts with password hashing
- Fields: username, email, displayName, password, role, isBlocked

### Product
- Gaming products synced from provider API
- Fields: providerProductId, costPrice, sellingPrice, status, isFeatured

### Order
- Customer purchases with full lifecycle
- Fields: orderId, userId, productId, quantity, status, providerOrderId, profit

### Wallet
- Customer balances in USD and LBP
- Fields: userId, balance_usd, balance_lbp, lastUpdated

### WalletTransaction
- Immutable transaction log for auditing
- Fields: userId, type, amount, balanceBefore, balanceAfter, orderId

### DepositRequest
- Customer deposit requests awaiting approval
- Fields: userId, amount, currency, status, proofImage, rejectionReason

### ErrorLog
- System error tracking
- Fields: message, stack, severity, context, userId, orderId

### SystemSettings
- Configuration for integrations
- Fields: autoSyncProducts, autoRetryFailedOrders, maxRetryAttempts

## 🔐 Security Features

- ✅ JWT token-based authentication (7-day expiry)
- ✅ Password hashing with bcryptjs
- ✅ Role-based access control (RBAC)
- ✅ Input validation with Zod schemas
- ✅ Protected API routes with middleware
- ✅ Secure error handling (no data leaks)
- ✅ Admin-only endpoints (withAdminAuth)
- ✅ Customer privacy (hidden cost/profit from customers)

## 📡 API Endpoints

### Authentication
```
POST   /api/auth/register        Register new user
POST   /api/auth/login           Login user
GET    /api/auth/me              Get current user (protected)
```

### Products
```
GET    /api/products             List products (public)
POST   /api/admin/products/sync  Sync from provider (admin)
```

### Orders
```
POST   /api/orders               Create order (protected)
GET    /api/orders               Get user orders (protected)
GET    /api/orders/:id           Get order details (protected)
GET    /api/admin/orders         List all orders (admin)
PATCH  /api/admin/orders/:id     Update order status (admin)
```

### Wallet
```
GET    /api/wallet               Get balance (protected)
GET    /api/wallet/history       Get transactions (protected)
POST   /api/wallet/deposit-request  Request funds (protected)
```

### Deposits
```
GET    /api/admin/deposits       List deposits (admin)
PATCH  /api/admin/deposits/:id   Approve/reject (admin)
```

### Reports
```
GET    /api/admin/reports/daily  Daily analytics (admin)
```

## 🧪 Testing the System

### 1. Register a Customer
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123",
    "displayName": "Test User"
  }'
```

### 2. Get Login Token
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "password123"
  }'
```

### 3. Fetch Products
```bash
curl http://localhost:3000/api/products
```

### 4. Create Order
```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{
    "productId": "<product-id>",
    "playerId": "MyUsername123",
    "quantity": 1
  }'
```

## 🌐 Deployment (Vercel)

### 1. Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin <github-repo-url>
git push -u origin main
```

### 2. Connect to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Click "Import Project"
3. Select your GitHub repository
4. Add environment variables:
   - All variables from `.env.local`
   - Use strong JWT_SECRET
   - Set `NODE_ENV=production`
   - Set proper `NEXT_PUBLIC_API_URL`

### 3. Deploy
```bash
# One-click deploy from Vercel dashboard
# Or use CLI:
npm i -g vercel
vercel --prod
```

## 📈 Order Processing Flow

```
1. Customer initiates order
   ↓
2. Check wallet balance
   ↓
3. Deduct wallet (atomic transaction)
   ↓
4. Create order record (status: processing)
   ↓
5. Call provider API to create order
   ↓
6. Provider response received
   ↓
7. Update order status (completed/failed)
   ↓
8. If failed: Refund wallet automatically
   ↓
9. Log transaction
   ↓
10. Send Telegram notification
    ↓
11. Sync to Google Sheets
```

## 🔄 Wallet Operations

### Atomic Transactions
Every wallet operation creates an immutable transaction record:
- Balance before deduction
- Balance after deduction
- Transaction ID and UUID
- Reference to order (if applicable)

### Auto-Refund Logic
If provider API fails after wallet deduction:
1. Order marked as "failed"
2. Wallet automatically refunded
3. Admin notified via Telegram
4. Error logged for investigation

## 🤖 Integrations

### Telegram Bot
- **Admin Notifications**: New orders, failures, refunds
- **Customer Notifications**: Order status, wallet changes
- **Message Types**: Automatic formatting, HTML-based

### Google Sheets
- **Auto-Sync**: Orders and transactions logged automatically
- **Sheets Created**: Raw_Orders, Wallet_Transactions, Dashboard_Report
- **Non-Blocking**: System works even if Sheets API fails

### Provider API
- **Abstraction Layer**: Easy to switch providers (DailyCard, etc.)
- **Methods**: fetchProducts, createOrder, getOrderStatus, checkBalance, refundOrder
- **Error Handling**: Graceful degradation with automatic refunds

## 📊 Admin Dashboard

Access at `/admin` after login.

### Features
- **Daily Stats**: Orders (total, completed, failed, pending)
- **Financial**: Revenue, costs, profit calculations
- **Top Products**: Most sold products with revenue
- **Top Customers**: Biggest spenders
- **Quick Actions**: Links to manage orders, products, users

## 🛠️ Configuration

### Environment Variables
```
# Database
MONGODB_URI=mongodb+srv://...

# Authentication
JWT_SECRET=your-super-secret-key
JWT_EXPIRE=7d

# Provider Integration
PROVIDER_API_URL=https://api.dailycard.io
PROVIDER_API_KEY=xxx
PROVIDER_API_SECRET=xxx

# Telegram
TELEGRAM_BOT_TOKEN=xxx
TELEGRAM_ADMIN_CHAT_ID=123456789

# Google Sheets
GOOGLE_SHEETS_ID=xxx
GOOGLE_SHEETS_CREDENTIALS_PATH=./credentials/google.json

# Application
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://yourdomain.com
```

## 🐛 Troubleshooting

### MongoDB Connection Issues
- Verify connection string format
- Check IP whitelist in MongoDB Atlas
- Ensure database user permissions are correct
- Test with: `mongosh <connection-string>`

### Telegram Not Sending
- Verify bot token is correct
- Check admin chat ID (get with /start to bot)
- Ensure bot is not blocked
- Check bot permissions in group

### Google Sheets Sync Failing
- Verify spreadsheet ID
- Check credentials file exists
- Ensure service account email has editor access
- Check API is enabled in GCP

### Order Stuck in Processing
- Check provider API status
- Review error logs in admin dashboard
- Manually retry in orders page
- Check wallet balance for refund

## 📚 Code Examples

### Create Order (API)
```typescript
const response = await fetch('/api/orders', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    productId: '507f1f77bcf86cd799439011',
    playerId: 'MyGameName123',
    quantity: 1
  })
});

const order = await response.json();
```

### Fetch Wallet (Custom Hook)
```typescript
import { useWallet } from '@/hooks/useWallet';

function WalletComponent() {
  const { wallet, fetchWallet } = useWallet();

  useEffect(() => {
    fetchWallet();
  }, []);

  return <div>${wallet?.balance_usd}</div>;
}
```

### Protected Admin Route
```typescript
import { withAdminAuth } from '@/lib/auth/middleware';

async function handler(req: NextRequest, user: JWTPayload) {
  // Only admin users can access this
  return NextResponse.json({ admin: true });
}

export async function GET(req: NextRequest) {
  return withAdminAuth(req, handler);
}
```

## 🚨 Important Notes

1. **Never expose provider credentials** to frontend
2. **Always validate user input** with Zod schemas
3. **Use HTTPS in production** (Vercel handles this)
4. **Rotate JWT_SECRET** periodically
5. **Keep Google credentials** secure and out of repo
6. **Monitor error logs** regularly
7. **Test refund logic** thoroughly
8. **Rate limit** sensitive endpoints in production

## 📝 License

Proprietary - Bily Card Inc.
All rights reserved.

## 🤝 Support

For support, contact: support@bilycard.com

## 🚀 Future Enhancements

- [ ] Email notifications
- [ ] SMS notifications  
- [ ] Stripe/PayPal payment gateway
- [ ] Referral system
- [ ] Promotional codes
- [ ] Subscription plans
- [ ] Advanced analytics
- [ ] Multi-language support
- [ ] Mobile app (React Native)
- [ ] Real-time order tracking WebSocket
- [ ] Customer support chat
- [ ] Product reviews & ratings

---

**Built with Next.js 14 • React 18 • TypeScript • Tailwind CSS • MongoDB**
