# Bily Card System - Setup & Installation Guide

## Prerequisites

Before you begin, ensure you have:

- **Node.js 18+** - Download from [nodejs.org](https://nodejs.org/)
- **npm** (comes with Node.js)
- **Git** - For version control
- **MongoDB Atlas Account** - Free at [mongodb.com](https://www.mongodb.com/cloud/atlas/register)
- **Code Editor** - VS Code recommended

## Step 1: Clone the Repository

```bash
# Clone the project
git clone <your-repo-url>
cd bily-card

# Install dependencies
npm install
```

## Step 2: Set Up MongoDB

### Create MongoDB Atlas Cluster:

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)
2. Create a free account
3. Create a new organization and project
4. Deploy a free cluster (M0)
5. Create database user:
   - Username: `bilycard`
   - Password: (generate secure password)
6. Get connection string:
   - Click "Connect"
   - Choose "Connect your application"
   - Copy connection string (URI)
   - Replace `<password>` with your password
   - Replace `myFirstDatabase` with `bily-card`

### Whitelist IP Address:
1. In MongoDB Atlas, go to Network Access
2. Add IP Address: 0.0.0.0/0 (for development only!)
3. For production, whitelist your Vercel IP

## Step 3: Configure Environment Variables

```bash
# Copy the example file
cp .env.example .env.local
```

Edit `.env.local` and fill in all variables:

### Database
```
MONGODB_URI=mongodb+srv://bilycard:YOUR_PASSWORD@cluster0.mongodb.net/bily-card?retryWrites=true&w=majority
```

### JWT Secret (Generate Secure Key)
```bash
# Run this command to generate a strong secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Then add it to `.env.local`:
```
JWT_SECRET=<generated-secret>
JWT_EXPIRE=7d
```

### Provider API
```
PROVIDER_API_URL=https://api.dailycard.io  # Your provider's API endpoint
PROVIDER_API_KEY=your-api-key-here
PROVIDER_API_SECRET=your-api-secret-here
```

To get provider credentials:
1. Create account on your provider's dashboard
2. Go to API/Developer settings
3. Generate API key and secret
4. Copy values to .env.local

### Telegram Bot (Optional but Recommended)
```bash
# Create bot:
# 1. Message @BotFather on Telegram
# 2. Send /newbot
# 3. Follow prompts, get bot token
# 4. Send /start to your bot
# 5. Message your bot
# 6. Go to: https://api.telegram.org/botYOUR_BOT_TOKEN/getUpdates
# 7. Find your chat ID in the response
```

Add to `.env.local`:
```
TELEGRAM_BOT_TOKEN=123456789:ABCDefGHIJKlmnoPQRstuvWXYZ...
TELEGRAM_ADMIN_CHAT_ID=987654321
```

### Google Sheets (Optional)
```
GOOGLE_SHEETS_ID=your-spreadsheet-id
GOOGLE_SHEETS_CREDENTIALS_PATH=./credentials/google-credentials.json
```

#### Setup Google Credentials:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project
3. Enable Google Sheets API
4. Create service account key:
   - Service Accounts → Create Service Account
   - Name: "Bily Card"
   - Grant role: Editor
   - Create JSON key
5. Save as `credentials/google-credentials.json`
6. Share your Google Sheet with service account email
7. Copy sheet ID from URL: `docs.google.com/spreadsheets/d/SHEET_ID/edit`

### Application
```
NODE_ENV=development
NEXT_PUBLIC_API_URL=http://localhost:3000
```

## Step 4: Verify All Variables

Your `.env.local` should look like:
```
# Database
MONGODB_URI=mongodb+srv://bilycard:password@cluster0.mongodb.net/bily-card?retryWrites=true&w=majority

# JWT
JWT_SECRET=abcd1234efgh5678ijkl9101112131415...
JWT_EXPIRE=7d

# Provider API
PROVIDER_API_URL=https://api.dailycard.io
PROVIDER_API_KEY=your-key-here
PROVIDER_API_SECRET=your-secret-here

# Telegram
TELEGRAM_BOT_TOKEN=123456789:ABCDefGHIJKlmno...
TELEGRAM_ADMIN_CHAT_ID=987654321

# Google Sheets
GOOGLE_SHEETS_ID=1a2b3c4d5e6f7g8h9i0j...
GOOGLE_SHEETS_CREDENTIALS_PATH=./credentials/google-credentials.json

# App
NODE_ENV=development
NEXT_PUBLIC_API_URL=http://localhost:3000
```

## Step 5: Run Development Server

```bash
npm run dev
```

Visit http://localhost:3000

## Step 6: Create First Test Accounts

### Register Customer:
1. Go to http://localhost:3000/customer/register
2. Create account:
   - Username: `testuser`
   - Email: `test@example.com`
   - Password: `password123`
   - Display Name: `Test User`

### Create Admin Account:
1. Register an account as "customer" above
2. Open MongoDB Atlas
3. Go to Collections → users
4. Find your user document
5. Edit and change role to `admin`
6. Go to `/admin/login`
7. Login with same username and password

## Step 7: Test the System

### Test Customer Flow:
```bash
# 1. Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"john","email":"john@test.com","password":"pass123","displayName":"John"}'

# 2. Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"john","password":"pass123"}'

# 3. Get products
curl http://localhost:3000/api/products

# 4. Get wallet (with token from login)
curl http://localhost:3000/api/wallet \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test Admin Flow:
1. Create admin account (steps in 6)
2. Login at `/admin/login`
3. Click "Dashboard" to see daily stats
4. Go to "Products" → "Sync Products" to fetch from provider
5. Go to "Orders" to see all orders
6. Go to "Deposits" to approve/reject customer deposits

## Common Issues & Solutions

### Error: "connect ECONNREFUSED"
- **Cause**: MongoDB not reachable
- **Fix**: 
  - Check MONGODB_URI in .env.local
  - Verify IP whitelist in MongoDB Atlas
  - Ensure database exists

### Error: "Invalid JWT"
- **Cause**: Token expired or signature mismatch
- **Fix**:
  - Clear localStorage and login again
  - Check JWT_SECRET is correct and same on all servers

### Error: "Provider API returned 401"
- **Cause**: Invalid API key
- **Fix**:
  - Verify PROVIDER_API_KEY in .env.local
  - Check API key hasn't expired on provider
  - Test with curl first

### Telegram Bot Not Sending
- **Cause**: Wrong bot token or chat ID
- **Fix**:
  - Verify TELEGRAM_BOT_TOKEN is correct
  - Get correct chat ID: send message to bot, check `/getUpdates`
  - Ensure bot is active in Telegram

### Google Sheets Not Syncing
- **Cause**: Missing credentials or permissions
- **Fix**:
  - Verify credentials file exists at path
  - Share spreadsheet with service account email
  - Check API is enabled in Google Cloud

## Development Tips

### Enable Debug Logging:
```bash
# Add to .env.local
DEBUG=bily-card:*
```

### Reset Database:
```bash
# In MongoDB Atlas, delete collection and re-run app
```

### Test Rate Limiting:
```bash
# Not implemented yet, coming in next phase
```

### Monitor Error Logs:
```bash
# Check ErrorLog collection in MongoDB for system errors
```

## Project Structure Reference

```
bily-card/
├── app/
│   ├── api/route.ts            # API endpoints
│   ├── customer/page.tsx        # Customer pages
│   ├── admin/page.tsx           # Admin pages
│   └── layout.tsx               # Root layout
├── lib/
│   ├── db/mongodb.ts            # Database connection
│   ├── models/                  # MongoDB schemas
│   ├── services/                # Business logic
│   ├── auth/                    # Authentication
│   ├── types/                   # TypeScript types
│   └── utils/                   # Utilities
├── hooks/                       # Custom React hooks
├── components/                  # React components
├── public/                      # Static files
├── .env.example                 # Environment template
├── .env.local                   # Your local variables (NEVER commit!)
├── package.json                 # Dependencies
└── README.md                    # Main documentation
```

## Next Steps

1. ✅ Install and run locally
2. ✅ Create test accounts
3. ✅ Test customer flow (register → products → wallet → order)
4. ✅ Test admin flow (dashboard → orders → products)
5. 📤 Deploy to Vercel (see README.md)
6. 🔒 Set up production environment variables
7. 📊 Monitor logs and analytics
8. 🚀 Launch publicly

## Support & Troubleshooting

- Check logs: `npm run dev` console output
- Read error messages carefully
- Google Sheets and Telegram are optional (system works without them)
- Provider API must be working for orders
- MongoDB must be accessible from your server

## Security Reminders

⚠️ **IMPORTANT:**
- ❌ Never commit .env.local to Git
- ❌ Never share JWT_SECRET
- ❌ Never commit Google credentials
- ❌ Never hardcode API keys
- ✅ Use environment variables for all secrets
- ✅ Use strong passwords
- ✅ Whitelist IPs in production
- ✅ Rotate secrets regularly

## Getting Help

If you encounter issues:

1. Check the error message in console
2. Review relevant documentation (DOCUMENTATION.md)
3. Check API endpoint status
4. Verify environment variables
5. Check MongoDB Atlas dashboard
6. Review error logs in MongoDB
7. Contact support@bilycard.com

---

**Once setup is complete, your system is ready to process orders!**
