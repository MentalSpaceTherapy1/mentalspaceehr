# Resend Email Integration Runbook

## Service Overview
**Integration**: Resend Email Service  
**Purpose**: Transactional email delivery for notifications, password resets, appointments, and portal communications  
**Criticality**: HIGH - Required for user notifications and system communications  
**Owner**: Operations Team  
**Last Updated**: 2025-01-09

---

## Architecture

### Email Flow
```
Application → Edge Function → Resend API → Email Delivery
                ↓
         Audit Log Entry
```

### Edge Functions Using Resend
- `send-appointment-reminder`
- `send-appointment-notification`
- `send-password-reset`
- `send-admin-password-reset`
- `send-portal-invitation`
- `send-staff-invitation`
- `send-portal-form-notification`
- `send-portal-form-bulk-notification`
- `send-schedule-exception-notification`
- `send-waitlist-email`

### Environment Variables
- `RESEND_API_KEY`: API key for Resend service

---

## Health Check Criteria

### Green (Healthy)
- ✅ API response time < 2 seconds
- ✅ Email delivery success rate > 98%
- ✅ No rate limit errors
- ✅ API key valid and active
- ✅ Webhook events being received

### Yellow (Degraded)
- ⚠️ API response time 2-5 seconds
- ⚠️ Email delivery success rate 95-98%
- ⚠️ Occasional 429 rate limit errors
- ⚠️ Webhook delays > 5 minutes

### Red (Down)
- ❌ API unreachable or timing out
- ❌ Email delivery success rate < 95%
- ❌ 401 authentication errors (invalid API key)
- ❌ 403 forbidden errors (account suspended)
- ❌ Multiple consecutive 5xx errors

---

## Common Issues & Resolution

### Issue 1: Emails Not Being Delivered

**Symptoms**:
- Users report not receiving emails
- No errors in edge function logs
- `send-*` functions succeed but emails don't arrive

**Diagnosis**:
```sql
-- Check recent email attempts
SELECT 
  notification_type,
  recipient_user_ids,
  sent_via,
  status,
  created_at
FROM notification_logs
WHERE sent_via @> ARRAY['email']
ORDER BY created_at DESC
LIMIT 20;
```

**Resolution Steps**:
1. **Check Resend Dashboard**:
   - Go to https://resend.com/emails
   - Verify email status (queued, sent, delivered, bounced)
   - Check for bounce/complaint notifications

2. **Verify API Key**:
   ```bash
   # Test API key validity
   curl -X POST https://api.resend.com/emails \
     -H "Authorization: Bearer YOUR_RESEND_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "from": "noreply@yourdomain.com",
       "to": "test@example.com",
       "subject": "Test",
       "html": "<p>Test email</p>"
     }'
   ```

3. **Check Spam Folder**: Instruct users to check spam/junk folders

4. **Verify Domain DNS Settings**:
   - SPF record configured correctly
   - DKIM records present and valid
   - Domain verified in Resend dashboard

5. **Check Rate Limits**:
   ```sql
   -- Check for rate limit errors
   SELECT COUNT(*), error_message
   FROM notification_logs
   WHERE error_message LIKE '%rate%limit%'
   GROUP BY error_message;
   ```

**Prevention**:
- Monitor email delivery rates daily
- Set up domain authentication properly
- Implement email warmup for new domains
- Use separate domains for transactional vs marketing emails

---

### Issue 2: High Email Bounce Rate

**Symptoms**:
- Bounce rate > 5%
- Hard bounces accumulating
- Soft bounces not converting to deliveries

**Diagnosis**:
```javascript
// Check Resend webhook logs
const { data } = await supabase
  .from('audit_logs')
  .select('*')
  .eq('action_type', 'email_bounced')
  .gte('created_at', new Date(Date.now() - 24*60*60*1000).toISOString());
```

**Resolution Steps**:
1. **Categorize Bounces**:
   - Hard bounces: Invalid email addresses (remove from list)
   - Soft bounces: Temporary issues (retry with backoff)
   - Block bounces: User unsubscribed or marked spam

2. **Clean Email List**:
   ```sql
   -- Find users with hard bounces
   SELECT u.id, u.email, p.email as profile_email
   FROM auth.users u
   LEFT JOIN profiles p ON p.id = u.id
   WHERE u.email IN (
     -- List of bounced emails from Resend
   );
   ```

3. **Update User Records**:
   - Flag bounced email addresses
   - Prevent further email attempts
   - Notify administrators

4. **Implement Bounce Handling**:
   - Set up Resend webhooks for bounce events
   - Create edge function to process bounces
   - Automatically suppress bounced addresses

**Prevention**:
- Validate email addresses at registration
- Implement double opt-in for portal users
- Regular list cleaning
- Monitor bounce rates per domain

---

### Issue 3: API Rate Limiting

**Symptoms**:
- 429 Too Many Requests errors
- Emails queuing up
- Delayed notifications

**Diagnosis**:
```sql
-- Check notification volume
SELECT 
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as email_count
FROM notification_logs
WHERE sent_via @> ARRAY['email']
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour DESC;
```

**Resolution Steps**:
1. **Check Resend Plan Limits**:
   - Free tier: 100 emails/day, 3 emails/second
   - Paid plans: Check your specific limits

2. **Implement Rate Limiting**:
   ```typescript
   // Add to edge functions
   const RATE_LIMIT = 2; // emails per second
   const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
   
   for (const email of emails) {
     await sendEmail(email);
     await delay(1000 / RATE_LIMIT);
   }
   ```

3. **Batch Processing**:
   - Queue bulk emails
   - Process in batches
   - Use background tasks

4. **Upgrade Plan**: If consistently hitting limits, upgrade Resend plan

**Prevention**:
- Implement queue system for bulk emails
- Respect rate limits in code
- Monitor daily send volume
- Plan for peak times (appointment reminders)

---

### Issue 4: Template Rendering Issues

**Symptoms**:
- Emails display incorrectly
- Missing data in email body
- Broken links or images

**Diagnosis**:
```typescript
// Check template usage
const { data: recentEmails } = await supabase
  .from('notification_logs')
  .select('subject, message')
  .order('created_at', { ascending: false })
  .limit(10);

console.log('Recent email content:', recentEmails);
```

**Resolution Steps**:
1. **Validate Template Variables**:
   - Ensure all required variables are provided
   - Check for undefined/null values
   - Verify date formatting

2. **Test Email Rendering**:
   ```typescript
   // Test template with sample data
   const testData = {
     client_name: 'Test Client',
     appointment_date: '2025-01-15',
     appointment_time: '10:00 AM',
     clinician_name: 'Dr. Smith'
   };
   
   const rendered = template.replace(/{(\w+)}/g, (match, key) => testData[key] || match);
   console.log('Rendered:', rendered);
   ```

3. **Fix Template Issues**:
   - Update template in database or edge function
   - Ensure proper HTML escaping
   - Test across email clients

4. **Review Edge Function Code**:
   - Check data fetching logic
   - Verify template substitution
   - Ensure proper error handling

**Prevention**:
- Maintain template documentation
- Test templates with various data scenarios
- Implement template versioning
- Use email preview testing tools

---

## Monitoring & Alerts

### Key Metrics to Monitor
| Metric | Normal Range | Alert Threshold |
|--------|--------------|-----------------|
| Delivery rate | > 98% | < 95% |
| Bounce rate | < 2% | > 5% |
| API response time | < 2s | > 5s |
| Daily send volume | Varies by practice | 2x normal |
| Error rate | < 1% | > 3% |

### Recommended Alerts
```sql
-- Create alert rule for high email failure rate
INSERT INTO notification_rules (
  rule_name,
  rule_type,
  trigger_conditions,
  recipients,
  notification_channels
) VALUES (
  'High Email Failure Rate',
  'alert',
  '{
    "metric": "email_failure_rate",
    "threshold": 5,
    "window": "1 hour"
  }',
  ARRAY['admin@practice.com'],
  ARRAY['email', 'in_app']
);
```

---

## Testing Procedures

### Manual Testing
```typescript
// Test email sending via edge function
const { data, error } = await supabase.functions.invoke('send-appointment-reminder', {
  body: {
    appointmentId: 'test-appointment-id',
    recipientEmail: 'your-test-email@example.com'
  }
});

console.log('Response:', data, error);
```

### Automated Testing
```bash
# Run smoke tests
npm run test:smoke -- --grep "email"

# Check edge function health
curl -X POST https://your-project.supabase.co/functions/v1/health-check
```

---

## Rollback Procedures

### If Emails Are Failing
1. **Switch to Backup Notification Method**:
   - Enable SMS notifications as backup
   - Use in-app notifications
   - Manual phone calls for critical alerts

2. **Check API Key Rotation**:
   - Verify correct API key in secrets
   - Roll back to previous key if recently changed

3. **Disable Email Notifications Temporarily**:
   ```sql
   -- Disable email in notification settings
   UPDATE appointment_notification_settings
   SET send_on_create = false,
       send_on_update = false,
       send_on_cancel = false;
   ```

4. **Queue Failed Emails for Retry**:
   - Log failed emails to database
   - Implement retry logic after resolution

---

## Escalation Path

### Level 1 (< 15 minutes)
- **Action**: Check Resend dashboard and edge function logs
- **Owner**: On-call engineer
- **Resolution**: Fix obvious issues (API key, rate limits)

### Level 2 (15-60 minutes)
- **Action**: Deep dive into email delivery issues
- **Owner**: Operations lead + Engineering
- **Resolution**: Template fixes, DNS configuration

### Level 3 (> 60 minutes)
- **Action**: Contact Resend support, implement workarounds
- **Owner**: Engineering lead + CTO
- **Resolution**: Service-level issues, account problems

---

## External Dependencies

### Resend Service Status
- **Status Page**: https://status.resend.com
- **API Documentation**: https://resend.com/docs
- **Support Contact**: support@resend.com

### DNS Providers
- Domain DNS must be properly configured
- SPF, DKIM, DMARC records required
- TTL considerations for DNS changes

---

## Documentation Links
- [Resend API Documentation](https://resend.com/docs/api-reference/introduction)
- [Edge Function: send-appointment-reminder](../supabase/functions/send-appointment-reminder/index.ts)
- [Notification Settings](../src/pages/admin/AppointmentNotificationSettings.tsx)
- [Email Templates Configuration](../src/components/admin/portal/PortalEmailTemplates.tsx)

---

## Change Log
| Date | Author | Change |
|------|--------|--------|
| 2025-01-09 | System | Initial runbook creation |
