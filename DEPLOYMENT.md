# Bily Card - Deployment Checklist

## Pre-Deployment Verification

### ✅ Code Quality
- [ ] All TypeScript errors resolved (`npm run build`)
- [ ] No console errors in development
- [ ] All API endpoints tested
- [ ] Database models verified
- [ ] Authentication working (JWT tokens valid)

### ✅ Environment Configuration
- [ ] MongoDB URI configured and tested
- [ ] JWT_SECRET is strong (32+ chars, random)
- [ ] Provider API credentials verified
- [ ] Telegram bot token and chat ID confirmed
- [ ] Google Sheets ID (optional) configured
- [ ] NEXT_PUBLIC_API_URL set to production domain
- [ ] NODE_ENV=production in Vercel

### ✅ Database Setup
- [ ] MongoDB Atlas cluster created
- [ ] Database user created
- [ ] IP whitelist updated (Vercel IPs)
- [ ] All collections auto-created by Mongoose
- [ ] Indexes created on models
- [ ] Test data created (at least 5 products)

### ✅ Feature Testing
- [ ] Customer registration works
- [ ] Customer login works
- [ ] Product listing loads
- [ ] Wallet displays balance
- [ ] Order creation functions
- [ ] Wallet transactions log correctly
- [ ] Admin login works
- [ ] Admin dashboard shows stats
- [ ] Admin can sync products
- [ ] Admin can approve deposits

### ✅ Security Review
- [ ] No hardcoded credentials in code
- [ ] No secrets in .env.example
- [ ] Password hashing working
- [ ] JWT tokens expire correctly
- [ ] Admin routes protected
- [ ] Customer data not exposed in admin view
- [ ] Cost/profit hidden from customers
- [ ] Error messages don't leak sensitive data

### ✅ Integration Testing
- [ ] Provider API integration working
- [ ] Telegram notifications sending (admin)
- [ ] Google Sheets sync working (if enabled)
- [ ] Refund logic triggers on failed orders
- [ ] Auto-refund updates wallet correctly

## Deployment Steps

### 1. Push to GitHub
```bash
git add .
git commit -m "Release v1.0.0"
git push origin main
```

### 2. Connect to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Sign up / Sign in
3. Click "Add New..." → "Project"
4. Import your GitHub repository
5. Configure project:
   - Framework: Next.js
   - Root Directory: ./
   - Build Command: `npm run build`
   - Output Directory: .next
   - Install Command: `npm install`

### 3. Add Environment Variables in Vercel
```
MONGODB_URI = mongodb+srv://...
JWT_SECRET = your-super-secret-key
JWT_EXPIRE = 7d
PROVIDER_API_URL = https://api.dailycard.io
PROVIDER_API_KEY = your-key
PROVIDER_API_SECRET = your-secret
TELEGRAM_BOT_TOKEN = your-token
TELEGRAM_ADMIN_CHAT_ID = your-chat-id
GOOGLE_SHEETS_ID = your-sheet-id
GOOGLE_SHEETS_CREDENTIALS_PATH = ./credentials/google.json
NODE_ENV = production
NEXT_PUBLIC_API_URL = https://yourdomain.com
```

### 4. Configure MongoDB for Production
In MongoDB Atlas:
1. Go to Network Access
2. Update IP whitelist to only Vercel IPs:
   - 76.76.19.0/24
   - 34.64.4.0/22
   - 35.184.97.0/24
   - (Get latest from Vercel docs)
3. Create read-only backup user

### 5. Deploy
1. Click "Deploy" in Vercel
2. Wait for build to complete
3. Get production URL (https://xxx.vercel.app)
4. Test all endpoints on production URL

## Post-Deployment

### Day 1: Immediate Monitoring
- [ ] Monitor error logs in MongoDB
- [ ] Check Vercel deployment logs for errors
- [ ] Verify API endpoints responding
- [ ] Test authentication flow
- [ ] Monitor database connections

### Week 1: Stability Checks
- [ ] Monitor daily order processing
- [ ] Check wallet transaction accuracy
- [ ] Verify Telegram notifications
- [ ] Monitor API response times
- [ ] Check for memory leaks

### Week 4: Performance Optimization
- [ ] Analyze slow queries in MongoDB
- [ ] Add database indexes if needed
- [ ] Cache frequently accessed products
- [ ] Optimize images and assets
- [ ] Consider CDN for assets

## Rollback Plan

If issues occur:

### Immediate Steps
1. Revert commit: `git revert <commit-hash>`
2. Push to main: `git push origin main`
3. Vercel auto-deploys

### Database Recovery
If data is corrupted:
1. Use MongoDB Atlas backup (daily backups available)
2. Contact MongoDB support for restoration
3. Verify data integrity before resuming

### Emergency Cutoff
If critical issue:
1. Delete JWT_SECRET from env (forces re-login)
2. Disable admin access temporarily
3. Display maintenance notice
4. Investigate in private environment

## Scaling Plan

### As Traffic Grows:

**100-1000 orders/day:**
- Add MongoDB indexes (done)
- Enable Vercel auto-scaling
- Monitor database performance
- Keep current setup

**1000-10000 orders/day:**
- Upgrade MongoDB to M10 tier
- Implement caching layer (Redis)
- Add database read replicas
- Consider rate limiting

**10000+ orders/day:**
- Dedicated MongoDB Atlas instance
- Multiple API regions (Vercel Enterprise)
- Database sharding strategy
- Queue system for orders (Bull, RabbitMQ)
- Monitor with New Relic/DataDog

## Maintenance Schedule

### Daily
- Check error logs
- Monitor order processing
- Verify system uptime

### Weekly
- Review failed orders
- Check API performance
- Verify integrations working

### Monthly
- Analyze trends
- Update products
- Review security logs
- Plan new features

### Quarterly
- Database optimization
- Performance profiling
- Security audit
- Disaster recovery test

## Monitoring Setup

### Error Tracking
1. Set up error notifications:
   - MongoDB Error collection
   - Vercel error alerts
   - Custom Slack integration

### Performance Monitoring
1. Use Vercel Analytics
2. Monitor database query times
3. Track API response times
4. Monitor Telegram API rate limits

### Business Metrics
1. Daily order count
2. Revenue per day
3. Top products
4. Customer acquisition
5. Conversion rate

## Backup Strategy

### Daily Backups
- MongoDB Atlas automatic (included)
- Backup frequency: Every 6 hours
- Retention: 30 days

### Monthly Backup
- Export database snapshot
- Store in S3
- Keep for 1 year

### Disaster Recovery
- Recovery time objective: 1 hour
- Recovery point objective: 1 hour
- Test recovery quarterly

## Security Updates

### Critical Fixes (Deploy Immediately)
- MongoDB driver updates
- Node dependencies with vulnerabilities
- JWT library updates
- Authentication bypass fixes

### Regular Updates (Monthly)
- Minor dependency updates
- Performance improvements
- Bug fixes

### Breaking Changes (Plan Ahead)
- Major version upgrades
- Database schema changes
- API contract changes

## Launch Checklist

Before going public:

**Technical:**
- [ ] All tests pass
- [ ] No console errors
- [ ] Health check endpoint works
- [ ] Backups configured
- [ ] Monitoring active

**Documentation:**
- [ ] README updated
- [ ] API docs complete
- [ ] Deployment guide written
- [ ] Error recovery procedures documented

**Operations:**
- [ ] Support process defined
- [ ] Incident response plan ready
- [ ] On-call schedule set
- [ ] Runbooks created

**Business:**
- [ ] Terms of service drafted
- [ ] Privacy policy written
- [ ] User agreement ready
- [ ] Legal review complete

## Post-Launch Marketing

Once stable for 2 weeks:
- Announce on social media
- Write blog post about launch
- Email existing users
- Share with gaming communities
- Gather user feedback

---

**Status: Ready for Production Deployment ✅**

For questions: support@bilycard.com
