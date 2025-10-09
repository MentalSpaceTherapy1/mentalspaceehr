# MentalSpace EHR - Production Deployment Guide

## Pre-Deployment Checklist

### 1. Environment Setup ✅

#### Required Actions:
- [ ] Copy `.env.example` to `.env` and fill in production values
- [ ] **CRITICAL**: Rotate Supabase credentials if `.env` was ever committed to git
- [ ] Set `VITE_ENV=production`
- [ ] Configure monitoring tools (Sentry, Analytics)
- [ ] Set up production Supabase project (separate from dev/staging)

#### Environment Variables:
```bash
# Production values
VITE_SUPABASE_URL=https://your-prod-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-prod-anon-key
VITE_SUPABASE_PROJECT_ID=your-prod-project-id
VITE_ENV=production
VITE_APP_URL=https://your-domain.com
```

### 2. Security Configuration ✅

#### Database (Supabase)
- [ ] Enable Row Level Security on all tables (already done)
- [ ] Review and test all RLS policies
- [ ] Set up database backups (daily recommended)
- [ ] Enable audit logging
- [ ] Configure connection pooling

#### Application
- [ ] Enable MFA for all admin users
- [ ] Configure session timeout (15 minutes default)
- [ ] Review rate limiting settings
- [ ] Test breach detection triggers
- [ ] Verify all Edge Functions are deployed

### 3. HIPAA Compliance ✅

- [ ] Complete risk assessment
- [ ] Sign Business Associate Agreement (BAA) with Supabase
- [ ] Document security measures
- [ ] Train staff on HIPAA policies
- [ ] Set up incident response team
- [ ] Configure audit log retention (6 years minimum)

### 4. Code Quality ⚠️

- [ ] Fix TypeScript errors (enable strict mode gradually)
- [ ] Replace remaining console.logs with logger utility
- [ ] Run `npm audit` and resolve vulnerabilities
- [ ] Test all critical user flows
- [ ] Perform accessibility audit

---

## Deployment Methods

### Option 1: Lovable Cloud (Recommended)

**Pros:**
- One-click deployment
- Automatic SSL certificates
- CDN hosting
- Environment variable management
- Zero DevOps overhead

**Steps:**
1. Open your project in [Lovable](https://lovable.dev)
2. Click "Share" → "Publish"
3. Configure custom domain (optional)
4. Set production environment variables in Lovable UI
5. Deploy

**Post-Deployment:**
- Monitor application at: `https://your-project.lovable.app`
- Check health endpoint: `/health-check`
- Review Supabase logs

### Option 2: Vercel

**Steps:**
1. Install Vercel CLI: `npm i -g vercel`
2. Connect repository: `vercel link`
3. Configure environment variables:
   ```bash
   vercel env add VITE_SUPABASE_URL production
   vercel env add VITE_SUPABASE_PUBLISHABLE_KEY production
   ```
4. Deploy: `vercel --prod`

**Configuration:**
Create `vercel.json`:
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### Option 3: Netlify

**Steps:**
1. Install Netlify CLI: `npm i -g netlify-cli`
2. Login: `netlify login`
3. Initialize: `netlify init`
4. Set environment variables in Netlify UI
5. Deploy: `netlify deploy --prod`

**Configuration:**
Create `netlify.toml`:
```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

---

## Database Migration

### Production Database Setup

1. **Create Production Supabase Project**
   - Go to [Supabase Dashboard](https://app.supabase.com)
   - Create new project (select closest region to users)
   - Note the connection details

2. **Run Migrations**
   ```bash
   # Install Supabase CLI
   npm install -g supabase

   # Link to production project
   supabase link --project-ref your-prod-project-id

   # Push all migrations
   supabase db push
   ```

3. **Verify Schema**
   ```bash
   # Check all tables exist
   supabase db inspect

   # Test RLS policies
   # (Run test queries from Supabase SQL editor)
   ```

4. **Seed Initial Data** (if needed)
   ```sql
   -- Create initial admin user
   -- Set up default practice settings
   -- Add service codes, etc.
   ```

---

## Post-Deployment Verification

### Automated Health Checks

1. **Application Health**
   - Visit: `https://your-domain.com/health-check`
   - Should return `200 OK` with all checks passing

2. **Database Connectivity**
   ```bash
   curl https://your-domain.com/health-check
   # Should return JSON with status: "healthy"
   ```

### Manual Testing Checklist

- [ ] **Authentication**
  - Sign up new user
  - Sign in with existing user
  - Test MFA flow
  - Test password reset

- [ ] **Core Workflows**
  - Create new client
  - Schedule appointment
  - Write clinical note
  - Submit billing charge

- [ ] **Security Features**
  - Verify session timeout (15 min)
  - Test rate limiting (password reset)
  - Check audit logs are recording
  - Verify RLS policies (try unauthorized access)

- [ ] **Performance**
  - Page load times < 3 seconds
  - Database queries < 500ms
  - No console errors
  - Mobile responsiveness

---

## Monitoring & Alerts

### Application Monitoring (Optional but Recommended)

**Sentry Setup:**
```bash
npm install @sentry/react
```

Add to `.env.production`:
```bash
VITE_SENTRY_DSN=your-sentry-dsn
```

Initialize in `src/main.tsx`:
```typescript
import * as Sentry from "@sentry/react";

if (import.meta.env.PROD) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: "production",
    tracesSampleRate: 0.1,
  });
}
```

### Database Monitoring

- **Supabase Dashboard**: Monitor query performance
- **Alerts**: Set up email alerts for:
  - High error rates
  - Slow queries (> 1s)
  - High connection usage
  - Failed backups

---

## Backup & Recovery

### Automated Backups

Supabase provides automatic daily backups (Pro plan required).

**Manual Backup:**
```bash
# Export database
supabase db dump -f backup-$(date +%Y%m%d).sql

# Export storage (if needed)
# Use Supabase Dashboard → Storage → Download
```

### Recovery Procedures

1. **Database Restore**
   ```bash
   supabase db reset
   psql -h db.your-project.supabase.co -U postgres < backup.sql
   ```

2. **Application Rollback**
   - Lovable: Use "Rollback" feature
   - Vercel: `vercel rollback`
   - Netlify: Redeploy previous version

---

## Scaling Considerations

### Performance Optimization

- **Database**:
  - Enable connection pooling (Supabase Pooler)
  - Add indexes for slow queries
  - Use database read replicas (Enterprise)

- **Frontend**:
  - Enable CDN caching
  - Lazy load components
  - Optimize images (WebP format)
  - Code splitting

### Capacity Planning

**Estimated Limits (Supabase Pro):**
- Database: 8 GB included, expandable
- Storage: 100 GB included
- Bandwidth: 250 GB/month
- Concurrent connections: 500

**Scaling Triggers:**
- Database CPU > 80% for 5 minutes
- API response time > 2 seconds
- Storage > 80% capacity

---

## Security Hardening

### Post-Launch Checklist

- [ ] Enable Supabase auth rate limiting
- [ ] Configure CORS to allow only production domain
- [ ] Enable security headers (CSP, HSTS)
- [ ] Set up WAF (Web Application Firewall)
- [ ] Schedule quarterly penetration testing
- [ ] Review access logs monthly
- [ ] Update dependencies monthly

### Security Headers

Add to `vite.config.ts`:
```typescript
export default defineConfig({
  server: {
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    }
  }
});
```

---

## Rollback Procedures

### Emergency Rollback

**If critical bug discovered:**

1. **Immediate Action** (< 5 minutes)
   ```bash
   # Lovable
   Click "Rollback" in Lovable UI

   # Vercel
   vercel rollback

   # Netlify
   netlify rollback
   ```

2. **Communicate** (< 15 minutes)
   - Notify users via in-app banner
   - Email administrators
   - Update status page

3. **Fix & Redeploy** (< 2 hours)
   - Identify root cause
   - Fix in development
   - Test thoroughly
   - Redeploy

---

## Support & Maintenance

### Regular Maintenance Tasks

**Daily:**
- Check error logs
- Monitor uptime (should be > 99.9%)
- Review security alerts

**Weekly:**
- Review audit logs for anomalies
- Check database performance
- Verify backups are running

**Monthly:**
- Update dependencies (`npm update`)
- Review and rotate API keys
- Security patch review
- Performance optimization

**Quarterly:**
- HIPAA compliance audit
- Disaster recovery drill
- User feedback review
- Feature roadmap planning

---

## Troubleshooting

### Common Issues

**Application Won't Start:**
- Check environment variables are set
- Verify Supabase credentials
- Check browser console for errors

**Database Connection Errors:**
- Verify Supabase project is active
- Check IP allowlist settings
- Confirm RLS policies aren't blocking access

**Slow Performance:**
- Review database query performance
- Check for N+1 queries
- Optimize large data fetches
- Enable browser caching

### Getting Help

- **Documentation**: [Supabase Docs](https://supabase.com/docs)
- **Community**: Lovable Discord, Supabase Discord
- **Support**: support@lovable.dev (for Lovable issues)

---

## Compliance Documentation

### Required for HIPAA Audit

1. **Security Risk Assessment** (annually)
2. **BAA with Supabase** (signed)
3. **Breach Notification Procedures** (see `SECURITY_BREACH_RESPONSE.md`)
4. **Staff Training Records** (HIPAA awareness)
5. **Access Control Policies** (documented)
6. **Audit Log Retention** (6 years)
7. **Disaster Recovery Plan** (tested annually)

---

## Success Criteria

### Production Readiness Checklist ✅

- [x] .gitignore excludes .env
- [x] Environment variables configured
- [x] Database migrations applied
- [x] RLS policies enabled
- [x] Health check endpoint working
- [ ] All critical tests passing
- [ ] Security audit completed
- [ ] HIPAA compliance verified
- [ ] Staff trained
- [ ] Monitoring configured
- [ ] Backups tested
- [ ] Rollback procedure tested

**When all items are checked, you're ready for production!** 🚀

---

**Last Updated:** January 2025
**Document Owner:** DevOps Team
**Next Review:** Quarterly
