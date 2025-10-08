# MentalSpace EHR - Production Deployment Guide

## Pre-Deployment Checklist

### Security Verification
- [ ] All Supabase credentials have been rotated if `.env` was ever committed to git
- [ ] `.env` file is listed in `.gitignore` and not tracked by git
- [ ] All `console.log` statements have been replaced with `logger.ts` in production-critical code
- [ ] TypeScript strict mode is enabled and all errors resolved
- [ ] Dependency vulnerabilities have been addressed (`npm audit fix`)
- [ ] Row Level Security (RLS) policies are enabled on all 66+ database tables
- [ ] Audit logging is configured and tested
- [ ] Rate limiting is active for authentication endpoints
- [ ] MFA is available for users who want to enable it

### Environment Configuration
- [ ] Production environment variables are configured in Lovable Cloud
- [ ] Database connection strings are secure
- [ ] Edge function secrets are properly configured (OPENAI_API_KEY, TWILIO_*, RESEND_API_KEY, etc.)
- [ ] CORS settings are configured correctly for production domain
- [ ] Email templates are configured in Resend
- [ ] Twilio SMS settings are verified

### Database Verification
- [ ] All 81 migrations have been applied successfully
- [ ] Database indexes are optimized for production load
- [ ] Backup schedule is configured (daily recommended)
- [ ] Point-in-time recovery is enabled
- [ ] Connection pooling is configured appropriately

### Testing
- [ ] User acceptance testing completed by clinical staff
- [ ] Security penetration testing performed
- [ ] Load testing completed for expected user volume
- [ ] Browser compatibility verified (Chrome, Firefox, Safari, Edge)
- [ ] Mobile responsiveness tested
- [ ] Accessibility audit completed (WCAG 2.1 AA)

## Deployment Steps

### 1. Pre-Deployment (T-24 hours)

1. **Notify Users**
   ```
   Send notification to all users about upcoming maintenance window
   Recommended: 30-minute window during lowest usage period
   ```

2. **Create Database Backup**
   ```sql
   -- Lovable Cloud handles automatic backups
   -- Verify latest backup exists in Supabase dashboard
   ```

3. **Verify Health Check**
   ```bash
   curl https://fpzuxwynuivqdyltpydj.supabase.co/functions/v1/health-check
   # Should return status: "healthy"
   ```

### 2. Deployment (T-0)

1. **Enable Maintenance Mode** (optional)
   - Add a global banner to UI notifying users of deployment
   - Disable non-critical background jobs

2. **Deploy Application**
   ```bash
   # Lovable automatically builds and deploys on git push
   git push origin main
   
   # Monitor build progress in Lovable dashboard
   ```

3. **Run Post-Deployment Migrations** (if any)
   ```bash
   # Migrations run automatically via Supabase
   # Verify in Supabase dashboard > Database > Migrations
   ```

4. **Verify Edge Functions**
   ```bash
   # All 38 edge functions should be deployed
   # Check Supabase dashboard > Edge Functions
   ```

### 3. Post-Deployment Verification (T+15 minutes)

1. **Smoke Tests**
   - [ ] Can log in with test account
   - [ ] Can create new client record
   - [ ] Can schedule appointment
   - [ ] Can create clinical note
   - [ ] Can access client documents
   - [ ] Can send secure message
   - [ ] Telehealth session can be initiated
   - [ ] Billing records can be created

2. **Monitor Logs**
   ```bash
   # Check for errors in Edge Function logs
   # Supabase dashboard > Edge Functions > Select function > Logs
   ```

3. **Check Performance**
   - Page load times < 3 seconds
   - API response times < 500ms
   - Database query performance acceptable

4. **Verify Integrations**
   - [ ] Email sending (Resend)
   - [ ] SMS sending (Twilio)
   - [ ] AI note generation (OpenAI/Gemini)
   - [ ] Document storage (Supabase Storage)

### 4. Rollback Procedure (If Needed)

If critical issues are discovered:

1. **Immediate Rollback**
   ```bash
   # Revert to previous version in Lovable
   # Settings > Version History > Restore previous version
   ```

2. **Database Rollback** (if schema changes were made)
   ```sql
   -- Contact Lovable Support for database restoration
   -- Or manually revert specific migrations
   ```

3. **Notify Users**
   ```
   Send notification explaining rollback and estimated resolution time
   ```

## Post-Deployment Monitoring

### First 24 Hours
- Monitor error rates every hour
- Check user login success rate
- Verify background jobs are running
- Monitor database performance
- Check for security incidents

### First Week
- Daily health check review
- Monitor user feedback
- Track performance metrics
- Review audit logs for anomalies
- Check storage usage trends

### Ongoing
- Weekly security scans
- Monthly dependency updates
- Quarterly load testing
- Continuous user feedback collection

## Health Monitoring Endpoints

### Application Health
```bash
curl https://fpzuxwynuivqdyltpydj.supabase.co/functions/v1/health-check
```

Expected response:
```json
{
  "timestamp": "2025-01-15T10:30:00Z",
  "status": "healthy",
  "checks": {
    "database": { "status": "healthy", "message": "Connected" },
    "auth": { "status": "healthy", "message": "Connected" },
    "storage": { "status": "healthy", "message": "6 buckets available" }
  }
}
```

### Database Monitoring
- Connection count: Should be < 80% of max
- Query performance: 95th percentile < 500ms
- Storage usage: Monitor growth rate

## Emergency Contacts

### Lovable Support
- Email: support@lovable.dev
- Dashboard: https://lovable.app

### Supabase Support
- Dashboard: (Access via Lovable Cloud)
- Status page: status.supabase.com

## Compliance Notes

### HIPAA Requirements
- All PHI access is logged in `audit_logs` table
- Encryption at rest and in transit is handled by Supabase (TLS 1.2+)
- Row Level Security enforces need-to-know access
- Breach detection system monitors for suspicious activity
- Business Associate Agreement with Supabase is required

### Data Retention
- Clinical records: 7 years minimum (per state requirements)
- Audit logs: 6 years minimum
- Session recordings: 90 days (configurable)
- Deleted data: 30-day soft delete before permanent removal

## Performance Baselines

### Target Metrics
- Page Load Time: < 3 seconds (95th percentile)
- Time to Interactive: < 5 seconds
- API Response Time: < 500ms (95th percentile)
- Database Query Time: < 200ms (95th percentile)
- Uptime: 99.9% (excluding scheduled maintenance)

### Resource Usage
- Database connections: < 50 concurrent
- Storage growth: ~10-50 MB per client over time
- Edge function invocations: ~100-500 per hour per user

## Troubleshooting Common Issues

### Users Can't Log In
1. Check Supabase Auth status
2. Verify email confirmation settings
3. Check for account lockouts in `login_attempts` table
4. Review rate limiting logs

### Slow Performance
1. Check database connection pool
2. Review slow query logs
3. Verify CDN is serving static assets
4. Check Edge Function cold starts

### Missing Data
1. Check RLS policies for user role
2. Verify database migrations completed
3. Review audit logs for deletions
4. Check for soft-deleted records

### Email/SMS Not Sending
1. Verify Resend/Twilio API keys
2. Check Edge Function logs for errors
3. Verify rate limits not exceeded
4. Check email/phone validation

---

**Last Updated:** 2025-01-15  
**Version:** 1.0  
**Maintained By:** MentalSpace Development Team
