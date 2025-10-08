# MentalSpace EHR - Operations Runbook

## System Overview

MentalSpace EHR is a comprehensive mental health practice management system built on:
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **Hosting**: Lovable Cloud
- **Storage**: Supabase Storage (6 buckets)
- **Database**: PostgreSQL with 81 migrations, 66+ tables, 482 RLS policies

## Daily Operations

### Morning Checklist (Before Business Hours)
- [ ] Check health endpoint status
- [ ] Review overnight error logs
- [ ] Verify scheduled backup completed
- [ ] Check storage usage (should be < 80%)
- [ ] Review security incident logs
- [ ] Check appointment reminder queue

### End of Day Checklist
- [ ] Review day's audit logs for anomalies
- [ ] Check for failed background jobs
- [ ] Verify all critical alerts resolved
- [ ] Review system performance metrics

## Common Issues and Solutions

### 🔴 CRITICAL: Users Cannot Log In

**Symptoms:**
- "Invalid credentials" errors for valid users
- Authentication timeouts
- MFA verification failures

**Diagnosis:**
```bash
# Check Supabase Auth service status
curl https://fpzuxwynuivqdyltpydj.supabase.co/functions/v1/health-check

# Check for account lockouts
SELECT user_id, attempt_count, locked_until 
FROM login_attempts 
WHERE locked_until > NOW() 
ORDER BY locked_until DESC 
LIMIT 10;

# Check rate limiting
SELECT * FROM rate_limits 
WHERE operation = 'login' 
AND window_expires_at > NOW() 
ORDER BY attempt_count DESC;
```

**Solutions:**
1. **Account Locked**: Manually unlock via admin panel or database:
   ```sql
   DELETE FROM login_attempts WHERE user_id = 'USER_ID';
   ```

2. **Rate Limited**: Wait for rate limit window to expire or reset:
   ```sql
   DELETE FROM rate_limits 
   WHERE user_id = 'USER_ID' AND operation = 'login';
   ```

3. **Email Not Confirmed**: Resend verification email via admin panel

4. **MFA Issues**: Reset MFA for user via admin panel

**Prevention:**
- Monitor failed login attempts
- Adjust rate limiting thresholds if needed
- Ensure email delivery is working

---

### ⚠️ HIGH: Application Running Slowly

**Symptoms:**
- Pages take > 5 seconds to load
- Database queries timing out
- Edge functions hitting timeout

**Diagnosis:**
```bash
# Check database performance
SELECT query, calls, mean_exec_time, max_exec_time
FROM pg_stat_statements
WHERE mean_exec_time > 100
ORDER BY mean_exec_time DESC
LIMIT 10;

# Check active connections
SELECT COUNT(*) FROM pg_stat_activity 
WHERE state = 'active';

# Check Edge Function logs for cold starts
# Supabase Dashboard > Edge Functions > Select function > Logs
```

**Solutions:**
1. **Database Connection Pool Exhausted**:
   - Review and close idle connections
   - Increase connection pool size in Supabase settings

2. **Slow Queries**:
   - Add database indexes for frequently queried columns
   - Optimize N+1 queries in application code
   - Enable query result caching

3. **Edge Function Cold Starts**:
   - Functions cold start after inactivity
   - Consider keeping critical functions warm with periodic pings

4. **High Client Load**:
   - Scale Supabase plan if needed
   - Implement client-side caching for static data

**Prevention:**
- Monitor database performance metrics
- Set up alerts for slow queries (> 1s)
- Regular performance testing

---

### ⚠️ HIGH: Documents Not Loading

**Symptoms:**
- "Failed to load document" errors
- Blank document viewer
- Upload failures

**Diagnosis:**
```bash
# Check storage bucket status
# Supabase Dashboard > Storage > Buckets

# Check storage policies
SELECT * FROM storage.policies WHERE bucket_id = 'client-documents';

# Check recent document access
SELECT id, file_path, uploaded_by, uploaded_date, status
FROM client_documents
WHERE uploaded_date > NOW() - INTERVAL '1 hour'
ORDER BY uploaded_date DESC;
```

**Solutions:**
1. **Storage Bucket Full**:
   - Check storage usage in Supabase dashboard
   - Upgrade storage plan if needed
   - Archive old documents

2. **Permission Issues**:
   - Verify RLS policies on `client_documents` table
   - Check storage bucket policies
   - Ensure user has correct role assignment

3. **File Path Issues**:
   - Check for broken file paths in database
   - Verify file exists in storage bucket

4. **CORS Issues**:
   - Verify CORS settings in storage bucket
   - Check browser console for CORS errors

**Prevention:**
- Monitor storage usage weekly
- Set up alerts at 80% capacity
- Regular audit of document access policies

---

### 🟡 MEDIUM: AI Note Generation Failing

**Symptoms:**
- "AI generation failed" errors
- Blank suggestions in intake forms
- Timeout errors

**Diagnosis:**
```bash
# Check OpenAI API key status
# Supabase Dashboard > Edge Functions > Secrets

# Check Edge Function logs
# Look for "generate-clinical-note" function errors

# Check rate limits with OpenAI
# Check billing status in OpenAI dashboard
```

**Solutions:**
1. **API Key Invalid/Expired**:
   - Rotate OpenAI API key via admin panel
   - Update secret in Supabase

2. **Rate Limited by OpenAI**:
   - Check OpenAI rate limit status
   - Upgrade OpenAI plan if needed
   - Implement request queuing

3. **Edge Function Timeout**:
   - Increase function timeout (max 10 minutes)
   - Optimize prompt length
   - Implement streaming for long responses

4. **Invalid Prompts**:
   - Check for malformed input data
   - Verify prompt templates are valid

**Prevention:**
- Monitor OpenAI usage and spending
- Set up billing alerts in OpenAI
- Implement fallback for AI failures

---

### 🟡 MEDIUM: Emails Not Sending

**Symptoms:**
- Users not receiving appointment reminders
- Password reset emails not arriving
- Portal invitations not delivered

**Diagnosis:**
```bash
# Check Resend API status
# https://status.resend.com

# Check Edge Function logs
# Look for "send-appointment-reminder" function errors

# Check email queue
SELECT * FROM notification_logs 
WHERE sent_at IS NULL 
ORDER BY created_at DESC 
LIMIT 20;
```

**Solutions:**
1. **Resend API Key Invalid**:
   - Rotate Resend API key
   - Update secret in Supabase

2. **Rate Limited**:
   - Check Resend rate limit status
   - Upgrade Resend plan if needed
   - Implement email batching

3. **Invalid Email Addresses**:
   - Check for typos in recipient addresses
   - Validate email format before sending

4. **Spam Filters**:
   - Verify SPF, DKIM, DMARC records
   - Check Resend deliverability dashboard
   - Advise users to check spam folder

**Prevention:**
- Monitor email delivery rates
- Set up webhooks for bounce notifications
- Regular testing of email templates

---

### 🟡 MEDIUM: Telehealth Session Issues

**Symptoms:**
- Video/audio not working
- Connection drops frequently
- Participants can't join session

**Diagnosis:**
```bash
# Check session status
SELECT id, status, host_id, start_time, end_time, connection_quality
FROM telehealth_sessions
WHERE start_time > NOW() - INTERVAL '1 hour'
ORDER BY start_time DESC;

# Check waiting room
SELECT * FROM waiting_room
WHERE status = 'waiting'
ORDER BY joined_at;

# Check browser console for WebRTC errors
```

**Solutions:**
1. **Bandwidth Issues**:
   - Run bandwidth test via in-app tool
   - Recommend lower video quality
   - Check for network congestion

2. **Browser Compatibility**:
   - Verify browser version (Chrome/Edge/Safari/Firefox latest)
   - Check for WebRTC support
   - Disable browser extensions causing conflicts

3. **Permission Issues**:
   - Verify camera/microphone permissions
   - Check for antivirus blocking media devices
   - Try incognito/private mode

4. **Session State Issues**:
   - Reset session via admin panel
   - Clear browser cache/cookies
   - End stuck sessions:
     ```sql
     UPDATE telehealth_sessions 
     SET status = 'Ended' 
     WHERE id = 'SESSION_ID';
     ```

**Prevention:**
- Pre-session bandwidth testing
- Browser compatibility checks
- User training on troubleshooting

---

## Database Maintenance

### Weekly Tasks
```sql
-- Vacuum analyze to optimize performance
VACUUM ANALYZE;

-- Clean up expired rate limits (automated via Edge Function)
SELECT cleanup_expired_rate_limits();

-- Clean up expired trusted devices
SELECT cleanup_expired_devices();

-- Review disk usage
SELECT pg_size_pretty(pg_database_size('postgres'));
```

### Monthly Tasks
```sql
-- Review and optimize slow queries
SELECT query, calls, mean_exec_time
FROM pg_stat_statements
WHERE mean_exec_time > 100
ORDER BY mean_exec_time DESC
LIMIT 20;

-- Check for missing indexes
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE schemaname = 'public'
AND n_distinct > 100
ORDER BY n_distinct DESC;

-- Archive old audit logs (keep 6 years per HIPAA)
DELETE FROM audit_logs 
WHERE created_at < NOW() - INTERVAL '6 years';
```

## Security Monitoring

### Daily Security Checks
```sql
-- Check for suspicious access patterns
SELECT user_id, COUNT(*) as access_count, 
       MIN(created_at) as first_access, 
       MAX(created_at) as last_access
FROM audit_logs
WHERE action_type = 'PHI_ACCESS'
AND created_at > NOW() - INTERVAL '1 day'
GROUP BY user_id
HAVING COUNT(*) > 50
ORDER BY access_count DESC;

-- Review security incidents
SELECT * FROM security_incidents
WHERE detected_at > NOW() - INTERVAL '1 day'
ORDER BY severity DESC, detected_at DESC;

-- Check for failed login attempts
SELECT email, COUNT(*) as attempts, MAX(attempted_at) as last_attempt
FROM login_attempts
WHERE attempted_at > NOW() - INTERVAL '1 day'
AND success = false
GROUP BY email
HAVING COUNT(*) > 5
ORDER BY attempts DESC;
```

### Weekly Security Review
- Review audit logs for anomalies
- Check for unauthorized privilege escalations
- Verify MFA adoption rate
- Review and update RLS policies if needed
- Check for SQL injection attempts
- Review API rate limiting effectiveness

## Backup and Recovery

### Backup Schedule
- **Automatic**: Daily backups at 2 AM UTC (via Supabase)
- **Retention**: 7 days for daily, 4 weeks for weekly
- **Point-in-time Recovery**: Available for last 7 days

### Manual Backup
```bash
# Trigger manual backup
# Supabase Dashboard > Database > Backups > Create Backup

# Export specific tables
pg_dump -h [host] -U postgres -t clients -t appointments > backup.sql
```

### Recovery Procedures

**Full Database Restore:**
1. Contact Lovable Support
2. Specify restore point (timestamp)
3. Coordinate with users for downtime window
4. Verify data integrity post-restore

**Single Table Restore:**
```sql
-- Restore from backup file
psql -h [host] -U postgres -d postgres < backup.sql
```

## Performance Monitoring

### Key Metrics to Track

| Metric | Target | Critical |
|--------|--------|----------|
| Page Load Time | < 3s | > 5s |
| API Response Time | < 500ms | > 2s |
| Database Query Time | < 200ms | > 1s |
| Error Rate | < 0.1% | > 1% |
| Uptime | 99.9% | < 99% |
| Active Users | Varies | Monitor trends |

### Monitoring Tools
- **Application**: Lovable Dashboard
- **Database**: Supabase Dashboard > Database > Query Performance
- **Logs**: Supabase Dashboard > Edge Functions > Logs
- **Health**: `https://fpzuxwynuivqdyltpydj.supabase.co/functions/v1/health-check`

## Incident Response

### Severity Levels

**🔴 CRITICAL (P0)**: System down, data breach, HIPAA violation
- **Response Time**: Immediate
- **Actions**: All hands on deck, notify leadership, begin incident response plan

**⚠️ HIGH (P1)**: Major feature broken, significant performance degradation
- **Response Time**: < 1 hour
- **Actions**: Senior engineer assigned, stakeholders notified

**🟡 MEDIUM (P2)**: Minor feature broken, intermittent issues
- **Response Time**: < 4 hours
- **Actions**: Engineer assigned, scheduled for resolution

**🟢 LOW (P3)**: Cosmetic issues, feature requests
- **Response Time**: < 1 business day
- **Actions**: Added to backlog, prioritized in sprint planning

### Incident Response Steps

1. **Identify and Triage** (0-5 minutes)
   - Confirm the issue
   - Assess severity
   - Assign severity level

2. **Notify Stakeholders** (5-15 minutes)
   - Alert on-call engineer
   - Notify management for P0/P1
   - Create incident tracking ticket

3. **Investigate** (15-60 minutes)
   - Check logs and monitoring
   - Reproduce issue if possible
   - Identify root cause

4. **Resolve** (varies)
   - Implement fix
   - Test in staging if available
   - Deploy to production
   - Monitor for regression

5. **Post-Mortem** (within 48 hours for P0/P1)
   - Document incident timeline
   - Identify root cause
   - Create action items to prevent recurrence
   - Share learnings with team

## Contact Information

### Internal Team
- **On-Call Engineer**: [Rotation schedule]
- **Development Lead**: [Contact info]
- **Product Manager**: [Contact info]
- **Clinical Director**: [Contact info]

### External Support
- **Lovable Support**: support@lovable.dev
- **Supabase**: (via Lovable Cloud)
- **Resend Support**: support@resend.com
- **Twilio Support**: support@twilio.com

## Useful SQL Queries

### User Activity
```sql
-- Active users in last 24 hours
SELECT COUNT(DISTINCT user_id) 
FROM audit_logs 
WHERE created_at > NOW() - INTERVAL '1 day';

-- Top 10 active users
SELECT p.first_name, p.last_name, COUNT(*) as actions
FROM audit_logs al
JOIN profiles p ON p.id = al.user_id
WHERE al.created_at > NOW() - INTERVAL '1 week'
GROUP BY p.id, p.first_name, p.last_name
ORDER BY actions DESC
LIMIT 10;
```

### System Health
```sql
-- Database size
SELECT pg_size_pretty(pg_database_size('postgres'));

-- Table sizes
SELECT schemaname, tablename, 
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;

-- Active connections
SELECT state, COUNT(*) 
FROM pg_stat_activity 
GROUP BY state;
```

### Compliance
```sql
-- Audit log retention check (should keep 6 years)
SELECT 
  MIN(created_at) as oldest_log,
  MAX(created_at) as newest_log,
  COUNT(*) as total_logs,
  COUNT(DISTINCT user_id) as unique_users
FROM audit_logs;

-- PHI access by user (last 30 days)
SELECT p.first_name, p.last_name, COUNT(*) as phi_accesses
FROM audit_logs al
JOIN profiles p ON p.id = al.user_id
WHERE al.action_type = 'PHI_ACCESS'
AND al.created_at > NOW() - INTERVAL '30 days'
GROUP BY p.id, p.first_name, p.last_name
ORDER BY phi_accesses DESC;
```

---

**Last Updated:** 2025-01-15  
**Version:** 1.0  
**Maintained By:** MentalSpace Operations Team
