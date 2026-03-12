# Bily Card - Developer Quick Reference

## 🚀 Quick Start

```bash
# Setup
git clone <repo>
cd bily-card
npm install
cp .env.example .env.local
# Edit .env.local with your credentials

# Run
npm run dev
# Open http://localhost:3000
```

## 📁 Key Files & Locations

### Database Models
- User: `lib/models/User.ts`
- Product: `lib/models/Product.ts`
- Order: `lib/models/Order.ts`
- Wallet: `lib/models/Wallet.ts`
- WalletTransaction: `lib/models/WalletTransaction.ts`
- DepositRequest: `lib/models/DepositRequest.ts`
- ErrorLog: `lib/models/ErrorLog.ts`
- SystemSettings: `lib/models/SystemSettings.ts`

### Authentication
- JWT: `lib/auth/jwt.ts`
- Middleware: `lib/auth/middleware.ts`
- Routes: `app/api/auth/`

### Business Logic
- Order Service: `lib/services/orderService.ts`
- Wallet Service: `lib/services/walletService.ts`
- Provider API: `lib/services/providerService.ts`
- Telegram: `lib/services/telegramService.ts`
- Google Sheets: `lib/services/googleSheetsService.ts`

### API Endpoints
- Auth: `app/api/auth/`
- Products: `app/api/products/`
- Orders: `app/api/orders/`
- Wallet: `app/api/wallet/`
- Admin: `app/api/admin/`

### Frontend Pages
- Customer: `app/customer/`
- Admin: `app/admin/`
- Home: `app/page.tsx`

### Components
- Shared UI: `components/shared/`
- Custom Hooks: `hooks/`

### Utilities
- Validation: `lib/utils/validation.ts`
- Helpers: `lib/utils/helpers.ts`
- Errors: `lib/utils/errors.ts`
- Messages: `lib/utils/messages.ts`

## 🔑 Environment Variables

```bash
# Database
MONGODB_URI=mongodb+srv://...

# Auth
JWT_SECRET=<strong-secret>
JWT_EXPIRE=7d

# Provider
PROVIDER_API_URL=https://api.dailycard.io
PROVIDER_API_KEY=xxx
PROVIDER_API_SECRET=xxx

# Telegram
TELEGRAM_BOT_TOKEN=xxx
TELEGRAM_ADMIN_CHAT_ID=123456

# Google Sheets (optional)
GOOGLE_SHEETS_ID=xxx
GOOGLE_SHEETS_CREDENTIALS_PATH=./credentials/google.json

# App
NODE_ENV=development
NEXT_PUBLIC_API_URL=http://localhost:3000
```

## 🛣️ API Endpoints Cheat Sheet

### Authentication
```
POST   /api/auth/register     - Create new user
POST   /api/auth/login        - Get JWT token
GET    /api/auth/me           - Current user [Bearer token]
```

### Products
```
GET    /api/products          - List products
POST   /api/admin/products/sync - Sync from provider [Admin]
```

### Orders
```
POST   /api/orders            - Create order [Bearer token]
GET    /api/orders            - User's orders [Bearer token]
GET    /api/orders/:id        - Order details [Bearer token]
GET    /api/admin/orders      - All orders [Admin]
PATCH  /api/admin/orders/:id  - Update order [Admin]
```

### Wallet
```
GET    /api/wallet            - Balance [Bearer token]
GET    /api/wallet/history    - Transactions [Bearer token]
POST   /api/wallet/deposit-request - Request funds [Bearer token]
```

### Deposits
```
GET    /api/admin/deposits    - List deposits [Admin]
PATCH  /api/admin/deposits/:id - Approve/reject [Admin]
```

### Reports
```
GET    /api/admin/reports/daily - Daily stats [Admin]
```

## 🧪 Testing Endpoints

### Register Customer
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john",
    "email": "john@test.com",
    "password": "password123",
    "displayName": "John Doe"
  }'
```

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john",
    "password": "password123"
  }'
# Returns token - use in Authorization header
```

### Get Products
```bash
curl http://localhost:3000/api/products
```

### Create Order
```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "productId": "507f1f77bcf86cd799439011",
    "playerId": "MyGameID123",
    "quantity": 1
  }'
```

## 🔒 Authentication Pattern

```typescript
// Protected API Route
import { withAuth } from '@/lib/auth/middleware';

async function handler(req: NextRequest, user: JWTPayload) {
  // user.userId - authenticated user ID
  // user.username - user's username
  // user.role - 'customer' or 'admin'
}

export async function GET(req: NextRequest) {
  return withAuth(req, handler);
}

// Admin-only Route
import { withAdminAuth } from '@/lib/auth/middleware';

export async function POST(req: NextRequest) {
  return withAdminAuth(req, handler);
}
```

## 📊 Database Models Pattern

```typescript
// Models use Mongoose
import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  field: { type: String, required: true },
  // Hooks
  timestamps: true // createdAt, updatedAt auto-added
});

export default mongoose.models.Model || mongoose.model('Model', schema);
```

## 🎯 Service Layer Pattern

```typescript
// Services handle business logic
async function businessLogic(userId: string) {
  // 1. Validate input
  const user = await userService.validateUser(userId);
  
  // 2. Execute logic
  const result = await performAction(user);
  
  // 3. Log/notify
  await notificationService.send(result);
  
  return result;
}
```

## 💰 Wallet Operation Pattern

```typescript
// Atomic wallet operations
const wallet = await walletService.deductBalance(
  userId,
  amount,
  'USD',
  orderId,
  'Purchase order ORD-123'
);

// Returns:
// { wallet, transaction, success }

// If fails, automatic refund not applied - transaction logs the failure
```

## 🔄 Order Flow Pattern

```
1. Customer calls POST /api/orders
2. orderService.createOrder() executes:
   - Validate input
   - Check wallet balance
   - Deduct wallet (atomic)
   - Create order (status: processing)
   - Call provider API
   - Update order status
   - If failed: Refund wallet
   - Add transaction
   - Send notifications
   - Sync to Google Sheets
3. Return order to customer
```

## 🚨 Error Handling

```typescript
// Use custom ApiError
import { ApiError } from '@/lib/utils/errors';

throw new ApiError(400, 'Invalid input', { field: 'email' });

// Or use handleError helper
import { handleError } from '@/lib/utils/errors';

try {
  // code
} catch (error) {
  const { statusCode, message } = handleError(error);
  return NextResponse.json({ message }, { status: statusCode });
}
```

## 📝 Adding a New Feature

### 1. Create Database Model
```typescript
// lib/models/Feature.ts
const featureSchema = new mongoose.Schema({...});
export default mongoose.model('Feature', featureSchema);
```

### 2. Create Service
```typescript
// lib/services/featureService.ts
export async function createFeature(data) {...}
```

### 3. Create API Route
```typescript
// app/api/feature/route.ts
export async function POST(req: NextRequest) {
  return withAuth(req, handler);
}
```

### 4. Create Frontend Page/Component
```typescript
// app/customer/feature/page.tsx
export default function FeaturePage() {...}
```

### 5. Add Types
```typescript
// lib/types/index.ts
export interface Feature {...}
```

## 🐛 Debugging Tips

### Check Logs
```bash
npm run dev  # See console output
```

### MongoDB Queries
```bash
# In MongoDB Atlas console
db.orders.find().limit(5)
db.wallets.find({ balance_usd: { $lt: 0 } })
```

### Test API
```bash
# Use REST Client or Postman
# Or curl commands from "Testing Endpoints" section
```

### Enable Debug Mode
```bash
# Add to .env.local
DEBUG=bily-card:*
```

## 📦 Common Dependencies

| Package | Usage |
|---------|-------|
| `mongoose` | Database ODM |
| `jsonwebtoken` | JWT tokens |
| `bcryptjs` | Password hashing |
| `zod` | Input validation |
| `axios` | HTTP requests |
| `node-telegram-bot-api` | Telegram bot |
| `googleapis` | Google Sheets |
| `uuid` | Generate unique IDs |

## 🎨 Styling

- **CSS Framework**: Tailwind CSS 4.2.1
- **Colors**: Slate/Purple/Pink theme (dark mode)
- **Components**: `components/shared/`
- **Utilities**: `app/globals.css`

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| [README.md](./README.md) | Main project documentation |
| [DOCUMENTATION.md](./DOCUMENTATION.md) | Detailed system docs |
| [SETUP_GUIDE.md](./SETUP_GUIDE.md) | Installation instructions |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Deployment to Vercel |
| [APIv1.md](./QUICK_REFERENCE.md) | This file |

## 🚀 Build & Deploy

```bash
# Build for production
npm run build

# Start production server
npm start

# Deploy to Vercel
vercel --prod
```

## 🔗 Useful Links

- [Next.js Docs](https://nextjs.org/docs)
- [MongoDB Docs](https://docs.mongodb.com)
- [Mongoose Docs](https://mongoosejs.com)
- [Tailwind Docs](https://tailwindcss.com/docs)
- [Telegram Bot API](https://core.telegram.org/bots/api)

## 💡 Tips & Tricks

- Use TypeScript everywhere - catch errors early
- Test API endpoints with curl before frontend
- Commit frequently with descriptive messages
- Never commit .env.local
- Document complex business logic
- Use middleware for cross-cutting concerns
- Cache API responses when possible
- Monitor error logs in production

## ❓ FAQs

**Q: How do I add a new gaming product?**
A: Products auto-sync from provider API. Click "Sync Products" in admin panel.

**Q: How do I refund a customer?**
A: Use `/api/admin/users/:id` to adjust wallet, or manually mark order as refunded.

**Q: How do I change the broker/provider?**
A: Edit `lib/services/providerService.ts` to change API calls.

**Q: How do I add a new payment gateway?**
A: Create new service, add endpoint, integrate with wallet system.

**Q: How do I monitor performance?**
A: Use Vercel Analytics + MongoDB profiler + custom monitoring.

---

**Last Updated:** 2024
**Status:** Production Ready ✅
