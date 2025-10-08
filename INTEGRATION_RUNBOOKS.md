# Integration Runbooks

## Purpose

This document provides operational runbooks for all external integrations in the MentalSpace EHR system, including troubleshooting procedures, error taxonomies, and failure simulation tests.

---

## Table of Contents

1. [Email Service (Resend)](#1-email-service-resend)
2. [SMS Service (Twilio)](#2-sms-service-twilio)
3. [File Storage (Supabase Storage)](#3-file-storage-supabase-storage)
4. [Telehealth (WebRTC)](#4-telehealth-webrtc)
5. [AI Services (Lovable AI)](#5-ai-services-lovable-ai)
6. [Insurance Clearinghouse](#6-insurance-clearinghouse)
7. [Payment Processing](#7-payment-processing)
8. [eRx/Labs Integration](#8-erxlabs-integration)

---

## 1. Email Service (Resend)

### Overview

**Provider**: Resend  
**Purpose**: Transactional emails (appointment reminders, password resets, portal invitations)  
**SLA**: 99.9% uptime, <5s delivery time  
**Cost**: Pay-per-email  
**Edge Function**: `send-*-email` functions

### Configuration

```typescript
// Stored in Supabase Secrets
RESEND_API_KEY=re_xxxxxxxxxxxx
SITE_URL=https://your-domain.com
```

**From Address**: noreply@mentalspace.app  
**Reply-To**: support@mentalspace.app

### Endpoints

- **API Base**: `https://api.resend.com`
- **Send Email**: `POST /emails`
- **Get Email Status**: `GET /emails/{email_id}`
- **Health Check**: `GET /domains`

### Authentication

**Method**: Bearer Token  
**Header**: `Authorization: Bearer ${RESEND_API_KEY}`

```typescript
const response = await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(emailPayload)
});
```

### Error Taxonomy

| Error Code | Description | Cause | Resolution | Severity |
|------------|-------------|-------|------------|----------|
| `401` | Unauthorized | Invalid API key | Verify RESEND_API_KEY secret | Critical |
| `422` | Validation Error | Invalid email format | Check recipient email syntax | Medium |
| `429` | Rate Limit Exceeded | Too many requests | Implement exponential backoff | High |
| `500` | Server Error | Resend service issue | Check Resend status page, retry | High |
| `503` | Service Unavailable | Temporary outage | Queue for retry, check status | High |

### Common Issues & Solutions

#### Issue 1: Emails Not Being Delivered

**Symptoms**:
- Email status shows "sent" but user didn't receive
- No error in logs

**Diagnosis**:
```sql
-- Check recent email logs
SELECT * FROM appointment_notifications
WHERE status = 'sent'
AND sent_at > NOW() - INTERVAL '24 hours'
ORDER BY sent_at DESC
LIMIT 50;
```

**Resolution**:
1. Check Resend dashboard for bounce/spam reports
2. Verify domain DNS records (SPF, DKIM, DMARC)
3. Ask user to check spam folder
4. Verify email address is valid

**Prevention**:
- Monitor bounce rates daily
- Maintain email reputation
- Use verified sending domain

#### Issue 2: Rate Limiting

**Symptoms**:
- 429 errors in edge function logs
- Emails queued but not sending

**Diagnosis**:
```typescript
// Check edge function logs
// supabase/functions/send-appointment-reminder/index.ts
console.log('Rate limit headers:', response.headers.get('x-ratelimit-remaining'));
```

**Resolution**:
1. Implement exponential backoff
2. Batch email sends
3. Increase rate limit (contact Resend support)

**Prevention**:
```typescript
// Implement retry logic with backoff
const sendWithRetry = async (emailData, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    const response = await sendEmail(emailData);
    if (response.status === 429) {
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
      continue;
    }
    return response;
  }
  throw new Error('Max retries exceeded');
};
```

### Monitoring & Alerts

**Metrics to Track**:
- Email delivery rate (target: >98%)
- Average send time (target: <5s)
- Bounce rate (target: <2%)
- Complaint rate (target: <0.1%)

**Alert Thresholds**:
- Delivery rate <95% → Page on-call
- Bounce rate >5% → Investigate domain reputation
- 5+ consecutive failures → Check Resend status

### Failure Simulation Test

```bash
# Test 1: Invalid API Key
# Set RESEND_API_KEY to invalid value
# Expected: 401 error, email not sent, error logged

# Test 2: Invalid Recipient
# Send email to invalid@invalid
# Expected: 422 error, bounces logged

# Test 3: Rate Limiting
# Send 100 emails in 1 second
# Expected: 429 errors, retry logic triggered

# Test 4: Network Timeout
# Simulate network delay with proxy
# Expected: Timeout error, retry attempted
```

### Sandbox Testing

**Resend Test Mode**: Use `test_` prefix for API keys in development

```typescript
// Test email sending without actually sending
const testEmail = await resend.emails.send({
  from: 'onboarding@resend.dev', // Test domain
  to: 'delivered@resend.dev',    // Test recipient (always succeeds)
  subject: 'Test Email',
  html: '<p>Test content</p>'
});
```

---

## 2. SMS Service (Twilio)

### Overview

**Provider**: Twilio  
**Purpose**: SMS appointment reminders, 2FA codes  
**SLA**: 99.95% uptime  
**Cost**: Per-message (varies by country)  
**Edge Function**: `send-appointment-reminder` (SMS path)

### Configuration

```typescript
// Stored in Supabase Secrets
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+15555551234
```

### Endpoints

- **API Base**: `https://api.twilio.com/2010-04-01`
- **Send SMS**: `POST /Accounts/{AccountSid}/Messages.json`
- **Get Message Status**: `GET /Accounts/{AccountSid}/Messages/{MessageSid}.json`

### Authentication

**Method**: HTTP Basic Auth  
**Username**: Account SID  
**Password**: Auth Token

```typescript
const auth = btoa(`${accountSid}:${authToken}`);
const response = await fetch(twilioUrl, {
  method: 'POST',
  headers: {
    'Authorization': `Basic ${auth}`,
    'Content-Type': 'application/x-www-form-urlencoded'
  },
  body: new URLSearchParams({
    From: twilioPhoneNumber,
    To: recipientPhone,
    Body: message
  })
});
```

### Error Taxonomy

| Error Code | Description | Cause | Resolution | Severity |
|------------|-------------|-------|------------|----------|
| `20003` | Authentication Error | Invalid credentials | Verify TWILIO_AUTH_TOKEN | Critical |
| `21211` | Invalid Phone Number | Bad format or unverified | Validate phone format | Medium |
| `21408` | Permission Denied | Phone number not verified | Verify number in Twilio console | High |
| `21610` | Unsubscribed Recipient | User opted out | Respect opt-out, log for compliance | Medium |
| `30003` | Unreachable Destination | Invalid carrier/country | Check phone number validity | Medium |
| `30005` | Unknown Destination | Number doesn't exist | Validate against phone DB | Low |
| `30006` | Landline/Unreachable | Can't receive SMS | Ask user for mobile number | Low |

### Common Issues & Solutions

#### Issue 1: SMS Not Delivered

**Symptoms**:
- Message status "undelivered" or "failed"
- No error in application logs

**Diagnosis**:
```sql
-- Check Twilio logs (via Twilio Console)
-- Or query local logs if storing delivery status
SELECT * FROM notification_logs
WHERE notification_type = 'sms'
AND status IN ('failed', 'undelivered')
AND created_at > NOW() - INTERVAL '7 days';
```

**Resolution**:
1. Verify phone number format (E.164: +1234567890)
2. Check Twilio logs for carrier errors
3. Verify number is mobile (not landline)
4. Check for opt-out status

**Prevention**:
- Validate phone numbers on input
- Store delivery status webhooks
- Maintain opt-out list

#### Issue 2: High Latency

**Symptoms**:
- SMS taking >30 seconds to deliver
- Users complaining about delayed reminders

**Diagnosis**:
- Check Twilio status page
- Review message queue length
- Check carrier filtering (spam)

**Resolution**:
1. Register messaging service with Twilio
2. Use short codes for high-volume (if applicable)
3. Optimize message content to avoid spam filters

### Monitoring & Alerts

**Metrics to Track**:
- Delivery rate (target: >95%)
- Average delivery time (target: <10s)
- Failure rate by error code
- Opt-out rate (target: <1%)

**Alert Thresholds**:
- Delivery rate <90% → Investigate carrier issues
- 10+ consecutive failures → Check Twilio status
- Opt-out rate >5% → Review message content

### Failure Simulation Test

```bash
# Test 1: Invalid Phone Number
# Send SMS to +1234
# Expected: 21211 error, logged as failed

# Test 2: Unsubscribed Number
# Send to number marked as opted-out
# Expected: 21610 error, message not sent

# Test 3: Invalid Credentials
# Set TWILIO_AUTH_TOKEN to invalid value
# Expected: 20003 error, critical alert triggered

# Test 4: Carrier Filtering
# Send message with spam-like keywords ("Click here now!")
# Expected: High delivery latency or failure
```

### Sandbox Testing

**Twilio Test Credentials**: Available in console (Test account SID/Token)

```typescript
// Test SMS without actually sending (development)
if (Deno.env.get('ENVIRONMENT') === 'development') {
  console.log('[TEST MODE] Would send SMS:', {
    to: recipientPhone,
    body: message
  });
  return { success: true, messageSid: 'test_' + Date.now() };
}
```

---

## 3. File Storage (Supabase Storage)

### Overview

**Provider**: Supabase Storage (built on S3)  
**Purpose**: Client documents, insurance cards, session recordings, signatures  
**SLA**: 99.9% uptime  
**Cost**: Storage + bandwidth  
**Buckets**: `client-documents`, `client-insurance-cards`, `telehealth-consents`, etc.

### Configuration

Automatically configured via Lovable Cloud integration. No manual setup required.

### Endpoints

- **Upload**: `POST /storage/v1/object/{bucket}/{path}`
- **Download**: `GET /storage/v1/object/public/{bucket}/{path}` (public buckets)
- **List**: `GET /storage/v1/object/list/{bucket}`
- **Delete**: `DELETE /storage/v1/object/{bucket}/{path}`

### Authentication

**Method**: Supabase JWT (from `supabase.auth.session()`)

```typescript
import { supabase } from '@/integrations/supabase/client';

const { data, error } = await supabase.storage
  .from('client-documents')
  .upload(`${clientId}/${fileName}`, file, {
    cacheControl: '3600',
    upsert: false
  });
```

### Error Taxonomy

| Error Code | Description | Cause | Resolution | Severity |
|------------|-------------|-------|------------|----------|
| `401` | Unauthorized | Invalid session or RLS policy | Refresh auth token, check RLS | High |
| `403` | Forbidden | Missing permissions | Review storage bucket policies | High |
| `409` | Conflict | File already exists | Use upsert or different filename | Low |
| `413` | Payload Too Large | File exceeds size limit | Compress file or increase limit | Medium |
| `500` | Internal Server Error | Supabase infrastructure | Check Supabase status, retry | High |

### Common Issues & Solutions

#### Issue 1: Upload Failures

**Symptoms**:
- File upload returns error
- Progress bar stalls at 99%

**Diagnosis**:
```typescript
// Check error details
const { data, error } = await supabase.storage
  .from('client-documents')
  .upload(path, file);

if (error) {
  console.error('Upload error:', error.message, error.statusCode);
}
```

**Resolution**:
1. Check file size (<50MB recommended)
2. Verify file type is allowed (check bucket policies)
3. Ensure user has `storage.objects.create` permission
4. Check network connectivity

**Prevention**:
```typescript
// Client-side file validation
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

if (file.size > MAX_FILE_SIZE) {
  throw new Error('File too large');
}
if (!ALLOWED_TYPES.includes(file.type)) {
  throw new Error('File type not allowed');
}
```

#### Issue 2: Download/Access Issues

**Symptoms**:
- "Access denied" errors when viewing documents
- Signed URLs expiring too quickly

**Diagnosis**:
```sql
-- Check storage bucket RLS policies
SELECT * FROM storage.buckets WHERE name = 'client-documents';
SELECT * FROM storage.objects WHERE bucket_id = 'client-documents' LIMIT 10;
```

**Resolution**:
1. Verify bucket RLS policies allow `SELECT`
2. Use signed URLs for private buckets
3. Increase signed URL expiration time

**Prevention**:
```typescript
// Generate signed URL for private documents
const { data, error } = await supabase.storage
  .from('client-documents')
  .createSignedUrl(path, 3600); // 1 hour expiration
```

### Monitoring & Alerts

**Metrics to Track**:
- Upload success rate (target: >99%)
- Average upload time per file size
- Storage usage per bucket
- Bandwidth usage

**Alert Thresholds**:
- Upload failure rate >5% → Investigate storage health
- Storage bucket >80% quota → Plan for expansion
- Bandwidth spike (>2x baseline) → Check for abuse

### Failure Simulation Test

```bash
# Test 1: Upload with invalid token
# Clear localStorage auth token
# Attempt file upload
# Expected: 401 error, upload fails

# Test 2: Upload oversized file
# Attempt to upload 100MB file
# Expected: 413 error or progress timeout

# Test 3: Access denied (RLS)
# Create test user without document access
# Attempt to view client document
# Expected: 403 error

# Test 4: Network interruption
# Start upload, disable network mid-upload
# Expected: Upload fails, retry prompt shown
```

### Sandbox Testing

```typescript
// Use test bucket for development
const BUCKET = process.env.NODE_ENV === 'production' 
  ? 'client-documents' 
  : 'test-documents';

// Mock upload in tests
if (process.env.NODE_ENV === 'test') {
  const mockUpload = vi.fn().mockResolvedValue({
    data: { path: 'mock-path' },
    error: null
  });
}
```

---

## 4. Telehealth (WebRTC)

### Overview

**Provider**: Native WebRTC (browser-based)  
**Purpose**: Video sessions between clinicians and clients  
**SLA**: Best-effort (dependent on user connectivity)  
**Signaling**: Supabase Realtime  
**STUN/TURN**: Public STUN servers + optional TURN

### Configuration

```typescript
// WebRTC configuration
const rtcConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    // Optional: Add TURN servers for better connectivity
    // {
    //   urls: 'turn:turn.example.com:3478',
    //   username: 'user',
    //   credential: 'pass'
    // }
  ]
};
```

### Architecture

```
┌─────────────┐         ┌──────────────────┐         ┌─────────────┐
│  Clinician  │◄───────►│  Supabase        │◄───────►│   Client    │
│   Browser   │         │  Realtime        │         │   Browser   │
│             │         │  (Signaling)     │         │             │
└──────┬──────┘         └──────────────────┘         └──────┬──────┘
       │                                                      │
       │                                                      │
       │              WebRTC (P2P Video/Audio)              │
       └──────────────────────────────────────────────────────┘
```

### Error Taxonomy

| Error Type | Description | Cause | Resolution | Severity |
|------------|-------------|-------|------------|----------|
| `NotFoundError` | No camera/mic | Hardware not available | Check device permissions | Critical |
| `NotAllowedError` | Permission Denied | User declined access | Request permission again | Critical |
| `OverconstrainedError` | Constraints not met | Requested resolution unavailable | Reduce constraints | Medium |
| `ICE Connection Failed` | P2P connection failed | Firewall/NAT issue | Use TURN server | High |
| `Signaling Timeout` | No response from peer | Network/server issue | Check Realtime status | High |
| `Track Mute/Unmute Fail` | Can't control media | Browser/device issue | Restart track | Medium |

### Common Issues & Solutions

#### Issue 1: Camera/Microphone Access Denied

**Symptoms**:
- User sees permission prompt but clicks "Block"
- Video shows black screen

**Diagnosis**:
```typescript
try {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
  });
} catch (error) {
  console.error('Media access error:', error.name, error.message);
}
```

**Resolution**:
1. Show instructions to user on how to grant permissions (browser-specific)
2. Provide fallback to audio-only mode
3. Test on different browser if issue persists

**Prevention**:
```typescript
// Check permissions before session starts
const checkPermissions = async () => {
  try {
    const permissions = await navigator.permissions.query({
      name: 'camera' as PermissionName
    });
    return permissions.state; // 'granted', 'denied', 'prompt'
  } catch {
    return 'prompt'; // Fallback for browsers without permissions API
  }
};
```

#### Issue 2: Poor Video Quality

**Symptoms**:
- Pixelated video
- Frequent freezing
- Audio cutting out

**Diagnosis**:
```typescript
// Monitor connection quality
peerConnection.getStats().then(stats => {
  stats.forEach(report => {
    if (report.type === 'inbound-rtp' && report.kind === 'video') {
      console.log('Packet loss:', report.packetsLost);
      console.log('Jitter:', report.jitter);
      console.log('Bitrate:', report.bytesReceived / report.timestamp);
    }
  });
});
```

**Resolution**:
1. Reduce video resolution
2. Check network bandwidth (run bandwidth test)
3. Close other applications using bandwidth
4. Switch to audio-only if necessary

**Prevention**:
```typescript
// Adaptive bitrate (reduce quality on poor connection)
const adjustQuality = (packetLoss: number) => {
  if (packetLoss > 0.1) {
    // High packet loss: reduce to 480p
    sender.setParameters({
      encodings: [{ maxBitrate: 500000 }]
    });
  }
};
```

### Monitoring & Alerts

**Metrics to Track**:
- Session establishment success rate (target: >95%)
- Average connection time (target: <5s)
- Average session duration
- Disconnection rate (target: <5%)
- Packet loss rate (target: <2%)

**Alert Thresholds**:
- Connection success rate <90% → Check STUN/TURN servers
- Disconnection rate >10% → Investigate network issues
- 5+ failed sessions in 10 minutes → Page on-call

### Failure Simulation Test

```bash
# Test 1: No Camera Permission
# Deny camera access in browser settings
# Start session
# Expected: Error message, fallback to audio-only

# Test 2: Network Interruption
# Start session, disconnect WiFi mid-call
# Expected: "Connection lost" notification, reconnection attempt

# Test 3: Firewall Blocking
# Use restrictive network (corporate firewall)
# Attempt P2P connection
# Expected: Falls back to TURN relay (if configured)

# Test 4: Browser Incompatibility
# Test on older browser (IE11)
# Expected: "Browser not supported" message
```

### Sandbox Testing

```typescript
// Mock WebRTC for testing
if (process.env.NODE_ENV === 'test') {
  global.navigator.mediaDevices = {
    getUserMedia: vi.fn().mockResolvedValue({
      getTracks: () => []
    })
  };
  
  global.RTCPeerConnection = vi.fn().mockImplementation(() => ({
    createOffer: vi.fn(),
    createAnswer: vi.fn(),
    setLocalDescription: vi.fn(),
    setRemoteDescription: vi.fn(),
    addIceCandidate: vi.fn()
  }));
}
```

---

## 5. AI Services (Lovable AI)

### Overview

**Provider**: Lovable AI (OpenRouter backend)  
**Purpose**: Clinical note generation, treatment plan suggestions, risk assessment  
**SLA**: 99.5% uptime  
**Cost**: Token-based (included in Lovable Cloud)  
**Supported Models**: GPT-5, GPT-5-mini, Gemini-2.5-pro, etc.

### Configuration

No API keys required - automatically configured via Lovable Cloud.

### Endpoints

Called via Lovable AI SDK (abstracted):

```typescript
// Example: Generate clinical note suggestion
const response = await fetch('https://api.lovable.ai/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${lovableApiKey}`, // Auto-injected
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'google/gemini-2.5-flash',
    messages: [...],
    temperature: 0.7,
    max_tokens: 1000
  })
});
```

### Error Taxonomy

| Error Code | Description | Cause | Resolution | Severity |
|------------|-------------|-------|------------|----------|
| `401` | Unauthorized | Missing/invalid API key | Check Lovable Cloud status | Critical |
| `429` | Rate Limit | Too many requests | Implement backoff, upgrade plan | High |
| `500` | Model Error | AI model failure | Retry with different model | Medium |
| `503` | Service Unavailable | Temporary outage | Queue request, retry later | High |

### Common Issues & Solutions

#### Issue 1: Slow Response Times

**Symptoms**:
- AI suggestions take >30 seconds
- User sees "Generating..." indefinitely

**Diagnosis**:
```typescript
const startTime = Date.now();
const response = await generateContent(prompt);
const duration = Date.now() - startTime;
console.log('AI generation time:', duration, 'ms');
```

**Resolution**:
1. Use faster model (gemini-2.5-flash instead of gpt-5)
2. Reduce max_tokens limit
3. Check for unusually long prompts

**Prevention**:
- Set timeout on AI requests (30s)
- Show progress indicator to user
- Implement client-side caching for common suggestions

### Monitoring & Alerts

**Metrics to Track**:
- Success rate (target: >98%)
- Average response time (target: <5s)
- Token usage per request
- Cost per day

**Alert Thresholds**:
- Response time >15s → Switch to faster model
- Failure rate >5% → Check Lovable AI status
- Daily cost spike (>2x baseline) → Investigate usage

---

## 6. Insurance Clearinghouse

### Overview

**Provider**: TBD (Availity, Change Healthcare, etc.)  
**Purpose**: Submit insurance claims (X12 837), check eligibility (X12 270/271)  
**SLA**: Provider-dependent (typically 99.5%)  
**Cost**: Per-transaction  
**Format**: X12 EDI

### Configuration (Placeholder)

```typescript
// To be configured when clearinghouse is integrated
CLEARINGHOUSE_API_URL=https://api.clearinghouse.com
CLEARINGHOUSE_USER_ID=xxxxx
CLEARINGHOUSE_PASSWORD=xxxxx
CLEARINGHOUSE_SUBMITTER_ID=xxxxx
```

### Claim Submission Flow

```
1. Generate X12 837 file from charge_entries + client_insurance
2. Validate X12 syntax (loops, segments, elements)
3. Submit to clearinghouse via SFTP or API
4. Receive ACK (997) - syntactic acceptance
5. Receive 277 (claim acknowledgment) - claim received by payer
6. Receive 835 (remittance advice) - payment/denial
7. Post payment to charge_entries
```

### Error Taxonomy (X12 997 ACK)

| Code | Description | Resolution |
|------|-------------|------------|
| `AK501=R` | Rejected | Fix syntax errors, resubmit |
| `AK501=A` | Accepted | Continue to 277/835 |
| `AK501=E` | Accepted with Errors | Review errors, may need correction |

### Common Issues & Solutions

*To be completed when clearinghouse integration is implemented.*

---

## 7. Payment Processing

### Overview

**Provider**: TBD (Stripe, Square, etc.)  
**Purpose**: Process client credit card payments  
**SLA**: Provider-dependent (typically 99.95%)  
**Cost**: % per transaction  
**PCI Compliance**: Required

### Configuration (Placeholder)

```typescript
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
```

### Payment Flow

```
1. Client enters payment details (via Stripe Elements)
2. Tokenize card (client-side, never touches server)
3. Create payment intent (server-side)
4. Confirm payment with token
5. Record payment in payment_records table
6. Generate receipt
7. Send receipt via email
```

### Common Issues & Solutions

*To be completed when payment integration is implemented.*

---

## 8. eRx/Labs Integration

### Overview

**Status**: Future enhancement  
**Purpose**: Electronic prescribing, lab order/results  
**Providers**: Surescripts (eRx), LabCorp/Quest (labs)

---

## Emergency Response Procedures

### Escalation Matrix

| Severity | Response Time | Who to Contact | Actions |
|----------|--------------|----------------|---------|
| **Critical** (System Down) | Immediate | On-call engineer + CTO | All-hands emergency response |
| **High** (Feature Broken) | <30 minutes | On-call engineer | Investigate, fix, or rollback |
| **Medium** (Degraded) | <2 hours | Assigned engineer | Schedule fix in next sprint |
| **Low** (Minor Issue) | <24 hours | Ticket queue | Fix during normal sprint |

---

**Document Version**: 1.0  
**Last Updated**: 2025-10-08  
**Next Review**: Quarterly or when integration added  
**Owner**: Integration Engineer
