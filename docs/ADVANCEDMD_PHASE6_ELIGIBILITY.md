# AdvancedMD Phase 6: Insurance Eligibility Verification & Benefits Check

## Overview

Phase 6 implements comprehensive insurance eligibility verification with both real-time and batch processing capabilities. This phase uses EDI 270/271 transactions to verify patient insurance coverage, retrieve benefit details, and track coverage changes.

## Database Schema

### Tables

#### `advancedmd_eligibility_requests`
Stores all eligibility verification requests (both real-time and batch).

**Key Fields:**
- `request_number` - Unique request identifier
- `patient_id` - Reference to patient
- `insurance_id` - Reference to patient insurance
- `verification_type` - 'real_time' or 'batch'
- `service_type` - Type of service being verified
- `status` - Request status (pending, processing, completed, failed, error)
- `is_eligible` - Boolean eligibility result
- `payer_name` - Insurance payer name
- `subscriber_id` - Insurance subscriber ID
- `coverage_details` - JSONB field with deductibles, copays, coinsurance, out-of-pocket max
- `plan_details` - JSONB field with plan information
- `service_limitations` - JSONB array of service limits
- `x12_request` - EDI 270 transaction (for production)
- `x12_response` - EDI 271 transaction (for production)

#### `advancedmd_eligibility_batches`
Manages batch eligibility verification jobs.

**Key Fields:**
- `batch_number` - Unique batch identifier
- `batch_name` - Descriptive name
- `scheduled_date` - Date scheduled for processing
- `status` - Batch status
- `total_patients` - Number of patients in batch
- `processed_count` - Number processed
- `successful_count` - Number successful
- `failed_count` - Number failed

#### `advancedmd_eligibility_batch_items`
Links requests to batch jobs.

#### `advancedmd_eligibility_alerts`
Automated alerts for eligibility issues.

**Alert Types:**
- `expiring_coverage` - Insurance expiring soon
- `coverage_terminated` - Coverage has ended
- `verification_failed` - Unable to verify
- `deductible_met` - Patient has met deductible
- `authorization_required` - Prior auth needed

### Views

#### `active_eligibility_verifications`
Shows all currently active and eligible patient coverage.

#### `eligibility_verification_summary`
Aggregates verification statistics by payer.

**Metrics:**
- Total verifications
- Eligible count
- Ineligible count
- Failed count
- Eligibility rate
- Average response time

#### `upcoming_coverage_expirations`
Lists patients with insurance expiring in next 60 days.

### Functions

#### `get_latest_eligibility(patient_id)`
Returns the most recent eligibility verification for a patient.

#### `needs_eligibility_refresh(patient_id, days_threshold)`
Checks if patient eligibility needs to be re-verified (default 30 days).

#### `create_eligibility_alert(patient_id, insurance_id, alert_type, severity, message, related_request_id)`
Creates an automated alert for eligibility issues.

## Components

### RealTimeEligibilityCheck
Real-time eligibility verification with immediate results.

**Features:**
- Patient selection
- Service type selection
- Instant verification
- Detailed coverage display
- Deductible progress bars
- Copay and coinsurance details
- Plan information

**Usage:**
```tsx
import { RealTimeEligibilityCheck } from '@/components/billing';

<RealTimeEligibilityCheck />
```

### BatchEligibilityVerification
Schedule and process batch eligibility jobs for multiple patients.

**Features:**
- Patient multi-select with checkbox table
- Batch job creation
- Progress tracking with progress bars
- Success/failure counts
- Process batch on-demand
- Batch history with status badges

**Usage:**
```tsx
import { BatchEligibilityVerification } from '@/components/billing';

<BatchEligibilityVerification />
```

### EligibilityHistoryTracker
View complete eligibility verification history for any patient.

**Features:**
- Patient selection dropdown
- Chronological history table
- Request details dialog
- Coverage details display
- Error message tracking
- Request status badges

**Usage:**
```tsx
import { EligibilityHistoryTracker } from '@/components/billing';

<EligibilityHistoryTracker />
```

### CoverageDetailsViewer
Comprehensive coverage details with visual indicators.

**Features:**
- Latest eligibility display
- Refresh eligibility button
- Expiration alerts (critical, warning)
- Deductible progress bars
- Out-of-pocket max tracking
- Copay breakdown
- Coinsurance rates
- Plan details
- Auto-refresh recommendations

**Usage:**
```tsx
import { CoverageDetailsViewer } from '@/components/billing';

<CoverageDetailsViewer />
```

## API Utilities

Location: `src/lib/eligibility/eligibilityVerification.ts`

### Functions

#### `submitEligibilityRequest(request: EligibilityRequest): Promise<EligibilityResponse>`
Submits a real-time eligibility verification request.

**Parameters:**
```typescript
{
  patientId: string;
  insuranceId?: string;
  serviceType: string;
  verificationType: 'real_time' | 'batch';
}
```

**Returns:**
```typescript
{
  requestId: string;
  requestNumber: string;
  isEligible: boolean;
  eligibilityStatus: string;
  effectiveDate?: string;
  terminationDate?: string;
  payerName?: string;
  subscriberId?: string;
  coverageDetails?: CoverageDetails;
  planDetails?: PlanDetails;
  serviceLimitations?: ServiceLimitation[];
}
```

#### `getEligibilityHistory(patientId: string)`
Retrieves all eligibility verifications for a patient.

#### `getLatestEligibility(patientId: string): Promise<EligibilityResponse | null>`
Gets the most recent eligibility verification for a patient.

#### `needsEligibilityRefresh(patientId: string, daysThreshold?: number): Promise<boolean>`
Checks if eligibility verification is older than threshold (default 30 days).

#### `createBatchEligibilityJob(job: BatchEligibilityJob)`
Creates a new batch eligibility verification job.

**Parameters:**
```typescript
{
  batchName: string;
  scheduledDate: string;
  patientIds: string[];
}
```

#### `processBatchEligibilityJob(batchId: string)`
Processes all requests in a batch job.

#### `getUnacknowledgedAlerts(): Promise<EligibilityAlert[]>`
Retrieves all unacknowledged eligibility alerts.

#### `acknowledgeAlert(alertId: string)`
Marks an alert as acknowledged.

## Main Page

**File:** `src/pages/EligibilityVerificationAdvanced.tsx`

4-tab interface:
1. **Real-Time Check** - Instant eligibility verification
2. **Batch Verification** - Bulk processing
3. **Coverage Details** - Comprehensive coverage view
4. **History** - Historical verification tracking

## Data Structures

### CoverageDetails
```typescript
{
  deductible?: {
    individual: number;
    family: number;
    individualMet: number;
    familyMet: number;
  };
  outOfPocketMax?: {
    individual: number;
    family: number;
    individualMet: number;
    familyMet: number;
  };
  copay?: {
    officeVisit: number;
    specialist: number;
    emergencyRoom: number;
    urgentCare: number;
  };
  coinsurance?: {
    inNetwork: number;
    outOfNetwork: number;
  };
}
```

### PlanDetails
```typescript
{
  planName?: string;
  planType?: string; // HMO, PPO, EPO, POS
  networkStatus?: 'in_network' | 'out_of_network' | 'both';
  planBeginDate?: string;
  planEndDate?: string;
}
```

### ServiceLimitation
```typescript
{
  serviceType: string;
  limitationType: string; // visits, units, dollars
  limitationValue: number;
  limitationPeriod: string; // per visit, per day, per year
  remainingValue?: number;
}
```

## Key Features

### 1. Real-Time Verification
- Instant eligibility checks via EDI 270/271
- Full benefit details retrieval
- Coverage period validation
- Deductible and out-of-pocket tracking

### 2. Batch Processing
- Schedule verification for multiple patients
- Progress tracking with real-time updates
- Success/failure reporting
- On-demand or scheduled execution

### 3. Coverage Tracking
- Visual deductible progress indicators
- Out-of-pocket maximum tracking
- Copay and coinsurance display
- Plan type and network status

### 4. Automated Alerts
- Coverage expiration warnings (7, 30, 60 days)
- Terminated coverage notifications
- Verification failure alerts
- Deductible milestone notifications

### 5. Historical Tracking
- Complete verification history per patient
- Request/response audit trail
- Error tracking and debugging
- Coverage change timeline

## Implementation Notes

### Mock vs Production

**Current Implementation (Mock):**
The `simulateEligibilityCheck()` function generates mock eligibility responses for development and testing.

**Production Integration:**
To connect to AdvancedMD API:

1. Replace `simulateEligibilityCheck()` with actual API calls
2. Generate EDI 270 transactions
3. Parse EDI 271 responses
4. Store raw EDI in `x12_request` and `x12_response` fields
5. Handle API authentication and rate limiting

### Service Types

Common service types for mental health:
- Mental Health
- Substance Abuse
- Psychotherapy
- Psychiatric Evaluation
- Family Therapy
- Group Therapy

### Refresh Recommendations

Best practices:
- Verify eligibility every 30 days
- Always verify before expensive procedures
- Re-verify if patient reports insurance changes
- Batch verify all active patients monthly

### Alert Severity Levels

- **Critical** - Coverage terminated, immediate action required
- **High** - Expiring within 7 days, verification failed
- **Medium** - Expiring within 30 days
- **Low** - Informational (deductible met)

## RLS Policies

### Eligibility Requests
- Administrators and billing staff: Full access
- Therapists: Read-only access for their patients

### Batches and Alerts
- Administrators and billing staff: Full access
- Front desk: Read-only access to alerts

## Performance Considerations

### Indexes
- `patient_id` - Fast patient lookups
- `insurance_id` - Insurance-based queries
- `status` - Filter by request status
- `requested_at` - Chronological sorting
- `scheduled_date` - Batch scheduling queries

### Views
All views are standard (not materialized) to ensure real-time data accuracy.

### Query Optimization
- Use `get_latest_eligibility()` function instead of custom queries
- Leverage indexed fields in WHERE clauses
- Limit historical queries with date ranges

## Testing Checklist

- [ ] Real-time verification creates request record
- [ ] Coverage details display correctly
- [ ] Deductible progress bars calculate accurately
- [ ] Batch job creates individual requests
- [ ] Batch processing updates counts correctly
- [ ] Alerts created for expiring coverage
- [ ] Alerts created for terminated coverage
- [ ] History displays chronologically
- [ ] Refresh button updates eligibility
- [ ] Expiration warnings display at correct thresholds
- [ ] Progress bars show accurate percentages

## Future Enhancements

1. **Scheduled Batch Processing** - Automatic nightly verification
2. **Email Notifications** - Alert staff of coverage issues
3. **Patient Portal Integration** - Show patients their benefits
4. **Authorization Tracking** - Link to prior auth requirements
5. **Multi-Payer Support** - Handle patients with multiple insurances
6. **Real-Time API Integration** - Connect to actual EDI gateway
7. **Benefits Estimation** - Calculate patient responsibility
8. **Coverage Gap Detection** - Identify uninsured periods

## Related Documentation

- [Phase 3: Claims Management](./ADVANCEDMD_PHASE3_CLAIMS.md) - Claim creation uses eligibility data
- [Phase 4: Payment Posting](./ADVANCEDMD_PHASE4_PAYMENT.md) - Payments reference coverage details
- [Phase 5: Reporting](./ADVANCEDMD_PHASE5_REPORTING.md) - Analytics include eligibility metrics

## Support

For issues or questions:
- Check migration has been applied
- Verify RLS policies allow access
- Review browser console for errors
- Test with mock data first before production integration
