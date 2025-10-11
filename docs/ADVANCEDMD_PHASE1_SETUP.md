# AdvancedMD Integration - Phase 1 Setup Guide

## Overview

Phase 1 establishes the core API infrastructure for AdvancedMD integration including:
- OAuth 2.0 authentication with automatic token rotation
- Secure API proxy via Supabase Edge Functions
- Rate limiting and quota management
- Comprehensive audit logging
- Database schema for billing operations

## Prerequisites

1. **AdvancedMD Account**
   - Sandbox credentials for testing
   - Production credentials (when ready for go-live)
   - Office Key, API Username, and API Password
   - OAuth 2.0 Client ID and Client Secret

2. **Supabase Project**
   - Edge Functions enabled
   - Database access
   - Service role key

3. **Development Environment**
   - Node.js 18+
   - npm or yarn
   - Supabase CLI

## Step 1: Environment Configuration

### 1.1 Copy Environment Template

```bash
cp .env.example .env
```

### 1.2 Configure AdvancedMD Credentials

Edit `.env` and add your AdvancedMD credentials:

```env
# Environment: sandbox or production
VITE_ADVANCEDMD_ENVIRONMENT=sandbox

# Sandbox Configuration
VITE_ADVANCEDMD_SANDBOX_BASE_URL=https://api-sandbox.advancedmd.com/v1
VITE_ADVANCEDMD_SANDBOX_OFFICE_KEY=your-office-key
VITE_ADVANCEDMD_SANDBOX_API_USERNAME=your-api-username
VITE_ADVANCEDMD_SANDBOX_API_PASSWORD=your-api-password
VITE_ADVANCEDMD_SANDBOX_CLIENT_ID=your-oauth-client-id
VITE_ADVANCEDMD_SANDBOX_CLIENT_SECRET=your-oauth-client-secret
```

**Important**: Never commit `.env` to version control!

### 1.3 Configure Supabase Environment

Add the same variables to your Supabase Edge Functions environment:

```bash
supabase secrets set ADVANCEDMD_SANDBOX_BASE_URL=https://api-sandbox.advancedmd.com/v1
supabase secrets set ADVANCEDMD_SANDBOX_CLIENT_ID=your-oauth-client-id
supabase secrets set ADVANCEDMD_SANDBOX_CLIENT_SECRET=your-oauth-client-secret
# ... repeat for all variables
```

## Step 2: Database Setup

### 2.1 Run Migration

The Phase 1 migration creates all necessary tables:

```bash
npx supabase db push
```

This creates:
- `advancedmd_auth_tokens` - OAuth token storage
- `advancedmd_api_logs` - API audit logs
- `advancedmd_rate_limits` - Rate limit tracking
- `advancedmd_eligibility_checks` - Eligibility verification history
- `advancedmd_claims` - Claims and submissions
- `advancedmd_claim_service_lines` - Claim line items
- `advancedmd_claim_diagnoses` - Claim diagnoses
- `advancedmd_claim_status_history` - Status change tracking
- `advancedmd_eras` - Electronic Remittance Advice
- `advancedmd_era_claim_payments` - ERA claim payment details
- `advancedmd_patient_mapping` - Patient ID mapping

### 2.2 Verify Tables

```sql
SELECT tablename
FROM pg_tables
WHERE tablename LIKE 'advancedmd%';
```

## Step 3: Deploy Edge Functions

### 3.1 Deploy Authentication Function

```bash
supabase functions deploy advancedmd-auth
```

This function:
- Handles OAuth 2.0 authentication
- Manages token refresh
- Keeps credentials secure on the server

### 3.2 Deploy Proxy Function

```bash
supabase functions deploy advancedmd-proxy
```

This function:
- Proxies all API requests to AdvancedMD
- Adds authentication headers
- Logs all requests/responses
- Handles errors and retries

### 3.3 Verify Deployment

```bash
supabase functions list
```

## Step 4: Test Integration

### 4.1 Test Authentication

```typescript
import { testAuthentication } from '@/lib/advancedmd';

const success = await testAuthentication();
console.log('Authentication:', success ? 'SUCCESS' : 'FAILED');
```

Expected output:
```
[Test] Testing authentication...
[AdvancedMD] Authenticating with OAuth 2.0...
[AdvancedMD] Authentication successful, token expires at: 2025-10-11T12:00:00.000Z
[Test] ✓ Authentication successful
```

### 4.2 Run Full Test Suite

```typescript
import { runAllTests } from '@/lib/advancedmd';

await runAllTests();
```

This will test:
1. Authentication
2. Rate limit tracking
3. Eligibility verification
4. Patient sync
5. Claim submission
6. ERA retrieval

### 4.3 Monitor API Logs

Check Supabase dashboard for API logs:

```sql
SELECT
  endpoint,
  method,
  status_code,
  duration_ms,
  created_at
FROM advancedmd_api_logs
ORDER BY created_at DESC
LIMIT 10;
```

## Step 5: Integration Usage

### 5.1 Get Client Instance

```typescript
import { getAdvancedMDClient } from '@/lib/advancedmd';

const client = getAdvancedMDClient();
```

### 5.2 Check Eligibility

```typescript
const response = await client.checkEligibility({
  clientId: 'client-uuid',
  insuranceId: 'insurance-uuid',
  serviceDate: '2025-10-10',
  serviceType: '30', // Health Benefit Plan Coverage
  cptCode: '90834' // Psychotherapy, 45 minutes
});

if (response.success) {
  console.log('Coverage Status:', response.data.coverageStatus);
  console.log('Copay:', response.data.copay);
  console.log('Deductible Remaining:', response.data.deductibleRemaining);
}
```

### 5.3 Submit Claim

```typescript
const response = await client.submitClaim({
  claimId: `CLM-${Date.now()}`,
  claimType: 'Original',
  patientId: 'patient-uuid',
  insuranceId: 'insurance-uuid',
  billingProviderId: 'provider-uuid',
  renderingProviderId: 'provider-uuid',
  statementFromDate: '2025-10-10',
  statementToDate: '2025-10-10',
  serviceLines: [
    {
      lineNumber: 1,
      serviceDate: '2025-10-10',
      placeOfService: '11', // Office
      cptCode: '90834',
      units: 1,
      unitCharge: 150.00,
      diagnosisPointers: [1]
    }
  ],
  diagnoses: [
    {
      diagnosisCode: 'F41.1',
      diagnosisPointer: 1,
      diagnosisType: 'primary'
    }
  ]
});

if (response.success) {
  console.log('Claim submitted:', response.data.claimControlNumber);
}
```

### 5.4 Sync Patient

```typescript
const response = await client.syncPatient({
  firstName: 'John',
  lastName: 'Doe',
  dateOfBirth: '1985-06-15',
  gender: 'M',
  address1: '123 Main St',
  city: 'Anytown',
  state: 'CA',
  zipCode: '90210',
  phone: '555-123-4567',
  internalPatientId: 'patient-uuid',
  insurances: [
    {
      rank: 'Primary',
      insuranceCompany: 'Blue Cross',
      payerId: '00123',
      memberId: 'ABC123',
      subscriberRelationship: 'Self'
    }
  ]
});

if (response.success) {
  console.log('AdvancedMD Patient ID:', response.data.advancedMDPatientId);
}
```

## Architecture Overview

### OAuth 2.0 Flow

```
Client App
    ↓
  [Request API Call]
    ↓
getAdvancedMDClient()
    ↓
  [Check Token Validity]
    ↓
  Token Expired?
    ↓ YES
  [Call advancedmd-auth Edge Function]
    ↓
AdvancedMD OAuth Server
    ↓
  [Return Access Token]
    ↓
  [Store in Database]
    ↓
  [Schedule Auto-Refresh]
    ↓
  [Make API Request via advancedmd-proxy]
    ↓
AdvancedMD API
    ↓
  [Return Response]
    ↓
  [Log to Database]
    ↓
Return to Client App
```

### Rate Limiting

The client tracks requests in 4 time buckets:
- **Per Second**: 10 requests max
- **Per Minute**: 100 requests max
- **Per Hour**: 1,000 requests max
- **Per Day**: 10,000 requests max

When a limit is exceeded, the client returns a `RATE_LIMIT_EXCEEDED` error with retry information.

### Token Rotation

Tokens are automatically refreshed:
- **Initial Authentication**: 24-hour token
- **Auto-Refresh**: Triggers 1 hour before expiry
- **Fallback**: Re-authenticates if refresh fails

## Security Best Practices

### 1. Never Expose Credentials

✅ **Correct** (Server-side via Edge Function):
```typescript
const { data } = await supabase.functions.invoke('advancedmd-auth', {
  body: { environment: 'sandbox', grant_type: 'client_credentials' }
});
```

❌ **Wrong** (Client-side direct call):
```typescript
fetch('https://api.advancedmd.com/oauth/token', {
  headers: { Authorization: `Basic ${btoa(clientId + ':' + secret)}` }
});
```

### 2. Use Row-Level Security

All tables have RLS enabled. Only authenticated staff can access billing data.

### 3. Audit Everything

All API calls are automatically logged to `advancedmd_api_logs` with:
- Request/response bodies
- Status codes
- Duration
- Error messages
- User ID (when available)

### 4. Environment Separation

Always use sandbox for development/testing. Switch to production only after:
- Thorough testing in sandbox
- Security review
- Compliance verification
- Go-live approval

## Monitoring

### API Health Check

```sql
SELECT
  DATE(created_at) as date,
  COUNT(*) as total_requests,
  AVG(duration_ms) as avg_duration,
  COUNT(*) FILTER (WHERE status_code >= 400) as error_count
FROM advancedmd_api_logs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

### Rate Limit Status

```typescript
const client = getAdvancedMDClient();
const status = client.getRateLimitStatus();

console.log('Requests remaining:');
console.log('- Per second:', status.second.requestsRemaining);
console.log('- Per minute:', status.minute.requestsRemaining);
console.log('- Per hour:', status.hour.requestsRemaining);
console.log('- Per day:', status.day.requestsRemaining);
```

### Error Analysis

```sql
SELECT
  endpoint,
  error_message,
  COUNT(*) as occurrences
FROM advancedmd_api_logs
WHERE status_code >= 400
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY endpoint, error_message
ORDER BY occurrences DESC;
```

## Troubleshooting

### Authentication Fails

**Problem**: `AUTHENTICATION_FAILED` error

**Solutions**:
1. Verify credentials in `.env`
2. Check Supabase secrets: `supabase secrets list`
3. Ensure sandbox/production environment matches credentials
4. Contact AdvancedMD support to verify API access

### Rate Limit Exceeded

**Problem**: `RATE_LIMIT_EXCEEDED` error

**Solutions**:
1. Check rate limit status: `client.getRateLimitStatus()`
2. Implement request batching
3. Add delays between requests
4. Contact AdvancedMD to increase limits

### Token Expired

**Problem**: `401 Unauthorized` errors

**Solutions**:
1. Token auto-refresh should handle this
2. Check `advancedmd_auth_tokens` table
3. Manually authenticate: `client.authenticate()`
4. Verify system clock is accurate

### Edge Function Not Found

**Problem**: `Function not found` error

**Solutions**:
1. Deploy functions: `supabase functions deploy advancedmd-auth`
2. Check deployment: `supabase functions list`
3. Verify Supabase project link

## Next Steps

After Phase 1 is complete and tested:

1. **Phase 2**: Real-Time Eligibility Integration
   - Build eligibility check UI
   - Add automatic verification on appointment creation
   - Implement benefit visualization

2. **Phase 3**: Electronic Claim Submission
   - Build claim creation UI
   - Implement 837P EDI generation
   - Add claim tracking dashboard

3. **Phase 4**: ERA & Payment Posting
   - Build ERA import system
   - Implement automatic payment posting
   - Add reconciliation workflows

## Support

For issues or questions:
- **AdvancedMD API**: Contact AdvancedMD support
- **Supabase**: https://supabase.com/docs
- **Integration Issues**: Check ADVANCEDMD_INTEGRATION_ROADMAP.md

## Appendix

### Common CPT Codes for Mental Health

- `90791` - Psychiatric diagnostic evaluation
- `90792` - Psychiatric diagnostic evaluation with medical services
- `90832` - Psychotherapy, 30 minutes
- `90834` - Psychotherapy, 45 minutes
- `90837` - Psychotherapy, 60 minutes
- `90846` - Family psychotherapy without patient
- `90847` - Family psychotherapy with patient
- `90853` - Group psychotherapy

### Common ICD-10 Codes for Mental Health

- `F41.1` - Generalized anxiety disorder
- `F32.9` - Major depressive disorder, single episode, unspecified
- `F33.1` - Major depressive disorder, recurrent, moderate
- `F43.10` - Post-traumatic stress disorder, unspecified
- `F60.3` - Borderline personality disorder
- `F84.0` - Autistic disorder
- `F90.0` - Attention-deficit hyperactivity disorder, predominantly inattentive type

### Place of Service Codes

- `02` - Telehealth
- `11` - Office
- `12` - Home
- `22` - On Campus - Outpatient Hospital
- `49` - Independent Clinic
- `50` - Federally Qualified Health Center
- `53` - Community Mental Health Center
