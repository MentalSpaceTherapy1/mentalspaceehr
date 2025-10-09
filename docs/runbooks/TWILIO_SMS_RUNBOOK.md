# Twilio SMS Integration Runbook

## Service Overview
**Integration**: Twilio SMS Service  
**Purpose**: SMS notifications for appointments, reminders, and urgent alerts  
**Criticality**: MEDIUM - Backup communication channel, enhances user experience  
**Owner**: Operations Team  
**Last Updated**: 2025-01-09

---

## Architecture

### SMS Flow
```
Application → Edge Function → Twilio API → SMS Delivery
                ↓
         Audit Log Entry
```

### Edge Functions Using Twilio
- `send-appointment-reminder` (SMS option)
- `send-waitlist-email` (can send SMS)
- Future: Two-factor authentication
- Future: Emergency notifications

### Environment Variables
- `TWILIO_ACCOUNT_SID`: Twilio account identifier
- `TWILIO_AUTH_TOKEN`: Authentication token
- `TWILIO_PHONE_NUMBER`: Sending phone number

---

## Health Check Criteria

### Green (Healthy)
- ✅ API response time < 3 seconds
- ✅ SMS delivery success rate > 95%
- ✅ No authentication errors
- ✅ Phone number active and verified
- ✅ Account balance sufficient

### Yellow (Degraded)
- ⚠️ API response time 3-7 seconds
- ⚠️ SMS delivery success rate 90-95%
- ⚠️ Low account balance warning
- ⚠️ Carrier filtering some messages

### Red (Down)
- ❌ API unreachable or timing out
- ❌ SMS delivery success rate < 90%
- ❌ 401 authentication errors
- ❌ Account suspended or out of credit
- ❌ Phone number deactivated

---

## Common Issues & Resolution

### Issue 1: SMS Messages Not Delivered

**Symptoms**:
- Users report not receiving SMS
- Delivery status shows "undelivered" or "failed"
- No errors in edge function logs

**Diagnosis**:
```typescript
// Check Twilio delivery status
const client = twilio(accountSid, authToken);
const messages = await client.messages.list({ limit: 20 });
messages.forEach(m => {
  console.log(`${m.to}: ${m.status} - ${m.errorMessage}`);
});
```

**Resolution Steps**:
1. **Verify Phone Number Format**:
   - Must be E.164 format: +1234567890
   - Include country code
   - No spaces, dashes, or parentheses

   ```sql
   -- Check phone number formats in database
   SELECT id, phone, cell_phone
   FROM clients
   WHERE phone IS NOT NULL
     AND phone !~ '^\+[1-9]\d{1,14}$';
   ```

2. **Check Twilio Console**:
   - Go to Twilio Console → Monitor → Logs → Errors
   - Review error codes and messages
   - Common error codes:
     - 21211: Invalid 'To' phone number
     - 21608: Phone number unsubscribed from receiving messages
     - 30003: Unreachable destination handset
     - 30005: Unknown destination handset

3. **Verify Sending Number**:
   - Ensure TWILIO_PHONE_NUMBER is active
   - Check number capabilities (SMS enabled)
   - Verify number isn't suspended

4. **Check Account Status**:
   - Sufficient account balance
   - No account suspension
   - API credentials valid

**Prevention**:
- Validate phone numbers at input
- Implement phone number normalization
- Monitor delivery status webhooks
- Maintain unsubscribe list

---

### Issue 2: Messages Marked as Spam

**Symptoms**:
- High filter rate
- Messages not reaching users
- Carrier filtering notifications

**Diagnosis**:
```sql
-- Check message patterns that might trigger spam filters
SELECT 
  content_pattern,
  COUNT(*) as sent,
  SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered
FROM (
  SELECT 
    LEFT(message, 50) as content_pattern,
    status
  FROM notification_logs
  WHERE sent_via @> ARRAY['sms']
    AND created_at > NOW() - INTERVAL '7 days'
) sub
GROUP BY content_pattern
HAVING COUNT(*) > 10;
```

**Resolution Steps**:
1. **Review Message Content**:
   - Avoid spam trigger words (FREE, URGENT, CLICK HERE)
   - Don't use all caps
   - Include practice name/identifier
   - Provide opt-out instructions

2. **Register for 10DLC** (US only):
   - Required for A2P (Application-to-Person) messaging
   - Reduces spam filtering
   - Increases throughput
   - Process: Twilio Console → Regulatory Compliance → US A2P 10DLC

3. **Use Short Codes or Toll-Free Numbers**:
   - Better deliverability than long codes
   - Higher throughput
   - Less carrier filtering

4. **Implement Verified Sender**:
   - Register your brand with carriers
   - Build sender reputation
   - Follow carrier guidelines

**Prevention**:
- Follow SMS best practices
- Maintain clean content
- Monitor delivery rates by carrier
- Use appropriate number type for volume

---

### Issue 3: Rate Limiting / Throughput Issues

**Symptoms**:
- 429 Too Many Requests errors
- Message queuing delays
- Appointment reminders sent late

**Diagnosis**:
```sql
-- Check SMS volume patterns
SELECT 
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as sms_count,
  AVG(EXTRACT(EPOCH FROM (sent_at - created_at))) as avg_delay_seconds
FROM notification_logs
WHERE sent_via @> ARRAY['sms']
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour DESC;
```

**Resolution Steps**:
1. **Check Number Type Limits**:
   - Long code: 1 message/second
   - Toll-free: 3 messages/second
   - Short code: 100 messages/second
   - 10DLC: Varies by brand registration

2. **Implement Queuing**:
   ```typescript
   // Rate-limited SMS sending
   const RATE_LIMIT = 1; // per second for long code
   const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
   
   for (const sms of smsQueue) {
     await sendSMS(sms);
     await delay(1000 / RATE_LIMIT);
   }
   ```

3. **Batch Processing**:
   - Schedule batch sends during off-peak hours
   - Use Messaging Services for automatic queuing
   - Spread reminders over time window

4. **Upgrade Number Type**:
   - Switch to toll-free or short code for higher volume
   - Register for 10DLC for A2P messaging

**Prevention**:
- Plan SMS volume in advance
- Use appropriate number type for volume
- Implement smart scheduling
- Monitor throughput metrics

---

### Issue 4: High Cost / Unexpected Charges

**Symptoms**:
- Twilio bill higher than expected
- Unbudgeted SMS costs
- Messages to international numbers

**Diagnosis**:
```sql
-- Analyze SMS costs by country code
SELECT 
  SUBSTRING(phone FROM 1 FOR 3) as country_code,
  COUNT(*) as message_count,
  COUNT(*) * 0.0075 as estimated_cost_usd -- Adjust rate
FROM clients
WHERE phone IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM notification_logs
    WHERE notification_logs.recipient_user_ids @> ARRAY[clients.portal_user_id]
      AND sent_via @> ARRAY['sms']
  )
GROUP BY country_code
ORDER BY message_count DESC;
```

**Resolution Steps**:
1. **Review Billing**:
   - Check Twilio Console → Billing
   - Identify cost drivers
   - Review usage by number/message type

2. **Implement Cost Controls**:
   ```typescript
   // Block international SMS
   const isInternational = (phone: string) => !phone.startsWith('+1');
   
   if (isInternational(recipientPhone)) {
     console.warn('Blocking international SMS to:', recipientPhone);
     return { success: false, reason: 'International SMS blocked' };
   }
   ```

3. **Set Up Budget Alerts**:
   - Configure Twilio billing alerts
   - Set monthly budget caps
   - Monitor daily spend

4. **Optimize Message Content**:
   - Each 160 characters = 1 message segment
   - Keep messages concise
   - Avoid emojis (may increase segments)

**Prevention**:
- Validate country codes at registration
- Set geographical restrictions
- Monitor costs daily
- Use message length optimization

---

### Issue 5: Opt-Out / Compliance Issues

**Symptoms**:
- Users complaining about unwanted messages
- "STOP" responses not being processed
- Carrier complaints

**Diagnosis**:
```sql
-- Check for opt-out responses
SELECT 
  client_id,
  phone,
  last_sms_date
FROM clients
WHERE phone IS NOT NULL
  AND has_opted_out = false
ORDER BY last_sms_date DESC;
```

**Resolution Steps**:
1. **Implement Opt-Out Handling**:
   ```typescript
   // Process STOP messages
   if (incomingMessage.body.toUpperCase().includes('STOP')) {
     await supabase
       .from('clients')
       .update({ has_opted_out: true })
       .eq('phone', incomingMessage.from);
   }
   ```

2. **Honor Opt-Out Immediately**:
   - Maintain opt-out list
   - Check before every send
   - Provide opt-back-in mechanism

3. **Add Compliance Footer**:
   ```typescript
   const message = `${content}\n\nReply STOP to unsubscribe`;
   ```

4. **Set Up Webhooks**:
   - Configure Twilio webhooks for incoming messages
   - Process STOP, START, HELP commands
   - Log all opt-out events

**Prevention**:
- Always include opt-out instructions
- Check opt-out list before sending
- Maintain detailed opt-out records
- Train staff on SMS compliance

---

## Monitoring & Alerts

### Key Metrics to Monitor
| Metric | Normal Range | Alert Threshold |
|--------|--------------|-----------------|
| Delivery rate | > 95% | < 90% |
| Average delivery time | < 10s | > 30s |
| API response time | < 3s | > 7s |
| Account balance | > $50 | < $20 |
| Error rate | < 2% | > 5% |

### Recommended Alerts
```sql
-- Alert on low delivery rate
INSERT INTO notification_rules (
  rule_name,
  rule_type,
  trigger_conditions,
  recipients
) VALUES (
  'Low SMS Delivery Rate',
  'alert',
  '{
    "metric": "sms_delivery_rate",
    "threshold": 90,
    "window": "1 hour"
  }',
  ARRAY['admin@practice.com']
);
```

---

## Testing Procedures

### Manual Testing
```bash
# Test SMS via Twilio API
curl -X POST "https://api.twilio.com/2010-04-01/Accounts/$TWILIO_ACCOUNT_SID/Messages.json" \
  --data-urlencode "From=$TWILIO_PHONE_NUMBER" \
  --data-urlencode "Body=Test message" \
  --data-urlencode "To=+1234567890" \
  -u $TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN
```

### Edge Function Testing
```typescript
// Test SMS sending via edge function
const { data, error } = await supabase.functions.invoke('send-appointment-reminder', {
  body: {
    appointmentId: 'test-id',
    sendSMS: true,
    recipientPhone: '+1234567890'
  }
});
```

---

## Rollback Procedures

### If SMS Service Fails
1. **Fall Back to Email**:
   - Enable email-only notifications
   - Notify users of temporary SMS outage

2. **Switch to Backup Provider** (if configured):
   - Update TWILIO credentials to backup account
   - Test connectivity

3. **Disable SMS Notifications**:
   ```sql
   UPDATE appointment_notification_settings
   SET send_via_sms = false;
   ```

---

## Escalation Path

### Level 1 (< 30 minutes)
- **Action**: Check Twilio console and credentials
- **Owner**: On-call engineer

### Level 2 (30-120 minutes)
- **Action**: Investigate delivery issues, contact Twilio support
- **Owner**: Operations lead

### Level 3 (> 120 minutes)
- **Action**: Implement alternative communication method
- **Owner**: Engineering lead + CTO

---

## External Dependencies

### Twilio Service Status
- **Status Page**: https://status.twilio.com
- **API Documentation**: https://www.twilio.com/docs/sms
- **Support**: Twilio Console → Help → Create Support Ticket

### Mobile Carriers
- Delivery depends on carrier network health
- Carrier filtering policies may change
- International carriers have varying capabilities

---

## Documentation Links
- [Twilio SMS API Documentation](https://www.twilio.com/docs/sms/api)
- [Edge Function: send-appointment-reminder](../supabase/functions/send-appointment-reminder/index.ts)
- [10DLC Registration Guide](https://www.twilio.com/docs/sms/a2p-10dlc)

---

## Change Log
| Date | Author | Change |
|------|--------|--------|
| 2025-01-09 | System | Initial runbook creation |
