  # AdvancedMD Integration - Phase 3: Electronic Claim Submission

## Overview

Phase 3 completes the full claims lifecycle from creation to payment, including:
- Comprehensive claim creation with validation
- 837P EDI generation for electronic submission
- Claims dashboard with real-time status tracking
- Denial management with correction and appeal workflows
- Batch submission capabilities
- Automatic status polling

## Components Implemented

### 1. ClaimCreationForm
**File**: `src/components/billing/ClaimCreationForm.tsx`

Full-featured claim creation form with dynamic service lines and diagnoses.

**Features**:
- React Hook Form with Zod validation
- Dynamic service line addition/removal
- Dynamic diagnosis management (primary/secondary)
- Real-time total charge calculation
- Comprehensive pre-submission validation
- Place of service dropdown
- CPT code selection with search
- ICD-10 diagnosis picker
- Prior authorization field
- Statement period validation

**Usage**:
```typescript
import { ClaimCreationForm } from '@/components/billing';

<ClaimCreationForm
  clientId="uuid"
  insuranceId="uuid"
  onSuccess={(response) => console.log('Claim submitted:', response)}
  onError={(error) => console.error('Error:', error)}
/>
```

### 2. CPTCodeSearch
**File**: `src/components/billing/CPTCodeSearch.tsx`

Searchable autocomplete for 50+ mental health CPT codes.

**Database**:
- Psychotherapy codes (90832, 90834, 90837)
- Diagnostic evaluation (90791, 90792)
- Family therapy (90846, 90847)
- Group therapy (90853)
- Crisis intervention (90839, 90840)
- Psychological testing (96130, 96131)
- ABA therapy (97151-97158)
- Medication management (90863)

**Features**:
- Category filtering
- Search by code or description
- Suggested pricing
- Badge display
- Command palette UI

### 3. ICD10CodePicker
**File**: `src/components/billing/ICD10CodePicker.tsx`

Searchable autocomplete for 100+ mental health ICD-10 codes.

**Categories**:
- Anxiety disorders (F40-F42)
- Depressive disorders (F32-F33)
- Trauma/stress (F43)
- Bipolar disorders (F30-F31)
- ADHD (F90)
- Substance use (F10-F19)
- Personality disorders (F60)
- Autism spectrum (F84)
- Z-codes (social circumstances)

**Features**:
- Category filtering
- Search by code or description
- Category badges
- Popover UI

### 4. Claim Validation
**File**: `src/lib/advancedmd/claim-validation.ts`

Comprehensive claim scrubbing and validation.

**Validations**:
- **Header**: Dates, required fields, providers
- **Service Lines**: CPT format, POS, units, charges
- **Diagnoses**: ICD-10 format, primary required
- **Cross-field**: Diagnosis pointers, total charges
- **Duplicates**: Service lines, diagnoses
- **Payer Rules**: Time-based CPT, add-on codes, prior auth

**Error Severity**:
- `error`: Must fix before submission
- `warning`: Should review
- `info`: Informational only

**Usage**:
```typescript
import { validateClaim } from '@/lib/advancedmd/claim-validation';

const result = validateClaim(claimData);

if (!result.isValid) {
  console.log('Errors:', result.errors);
  console.log('Warnings:', result.warnings);
}
```

### 5. ClaimsDashboard
**File**: `src/components/billing/ClaimsDashboard.tsx`

Comprehensive claims management dashboard.

**Stats Cards**:
- Total claims
- Total billed amount
- Total paid amount
- Average days to payment
- Claims by status

**Features**:
- Search by claim ID/control number
- Filter by status
- Sort by date
- Status icons and badges
- Export functionality
- Real-time refresh

**Table Columns**:
- Claim ID
- Control number
- Status with icon
- Service period
- Billed amount
- Paid amount
- Submission date
- Actions

### 6. DenialManagement
**File**: `src/components/billing/DenialManagement.tsx`

Denial workflow with correction and appeal capabilities.

**Features**:
- Denied/rejected claims table
- Denial code reference
- Category badges (correctable/appealable/final)
- Correction workflow
- Appeal workflow
- Action recommendations

**Common Denial Codes**:
```typescript
CO-16: Claim lacks information (correctable)
CO-18: Duplicate claim (correctable)
CO-22: Resubmission not allowed (appealable)
CO-29: Timely filing expired (appealable)
CO-45: Charge exceeds fee schedule (appealable)
CO-50: Non-covered service (final)
CO-97: Bundled service (correctable)
CO-109: Wrong payer (correctable)
CO-151: Incomplete information (correctable)
PR-1: Deductible (final - bill patient)
PR-2: Coinsurance (final - bill patient)
PR-3: Copay (final - bill patient)
```

**Workflows**:
- **Correction**: Move to Draft → Edit → Resubmit as Replacement
- **Appeal**: File appeal → Add justification → Submit

### 7. 837P EDI Generation
**File**: `src/lib/advancedmd/edi-837p-generator.ts`

HIPAA-compliant 837P (Professional) EDI file generation.

**Segments**:
- ISA: Interchange Control Header
- GS: Functional Group Header
- ST: Transaction Set Header
- BHT: Beginning of Hierarchical Transaction
- 1000A: Submitter Name
- 1000B: Receiver Name
- 2000A: Billing Provider Hierarchical
- 2010AA: Billing Provider Name
- 2000B: Subscriber Hierarchical
- 2010BA: Subscriber Name
- 2300: Claim Information
- 2310A: Rendering Provider
- 2400: Service Line (repeating)
- SE/GE/IEA: Trailers

**Usage**:
```typescript
import { generate837P, validate837P } from '@/lib/advancedmd/edi-837p-generator';

const ediContent = generate837P(claimData, {
  submitterId: '123456789',
  submitterName: 'Mental Space Therapy',
  submitterContactName: 'Jane Doe',
  submitterContactPhone: '5551234567',
  receiverId: '987654321',
  receiverName: 'Waystar Clearinghouse',
  testMode: true,
});

const validation = validate837P(ediContent);
if (validation.isValid) {
  // Submit to clearinghouse
}
```

### 8. Claim Status Polling
**File**: `src/hooks/useClaimStatusPolling.tsx`

Automatic status monitoring with configurable intervals.

**Features**:
- Auto-polling every 5 minutes (configurable)
- Batch processing (5 claims at a time)
- Rate limit respect (1s delay between batches)
- Status change detection
- Toast notifications
- Database updates
- Manual refresh
- Start/stop control

**Usage**:
```typescript
import { useClaimStatusPolling, useAutoClaimStatusMonitoring } from '@/hooks/useClaimStatusPolling';

// Manual control
const { statuses, isPolling, refresh } = useClaimStatusPolling({
  claimIds: ['CLM-123', 'CLM-456'],
  pollingInterval: 300000, // 5 minutes
  enabled: true,
  onStatusChange: (update) => {
    console.log(`${update.claimId}: ${update.previousStatus} → ${update.newStatus}`);
  },
});

// Auto-monitoring for submitted claims
const { claimCount, statuses, lastUpdate } = useAutoClaimStatusMonitoring({
  statuses: ['Submitted', 'Accepted', 'In Process'],
  maxAge: 30, // days
});
```

### 9. ClaimsManagement Page
**File**: `src/pages/ClaimsManagement.tsx`

Central hub for all claims activities.

**Tabs**:
1. **Dashboard**: ClaimsDashboard component
2. **Denials**: DenialManagement component
3. **Analytics**: Coming soon

**Actions**:
- Create new claim (dialog)
- View claim details
- Correct denied claims
- File appeals
- Export data

## Database Schema

### New Tables (Phase 3)

#### EDI Batches
```sql
CREATE TABLE advancedmd_edi_batches (
  id UUID PRIMARY KEY,
  batch_id TEXT UNIQUE NOT NULL,
  file_type TEXT CHECK (file_type IN ('837P', '835', '277')),
  file_path TEXT,
  file_content TEXT,
  total_claims INTEGER,
  total_billed_amount DECIMAL(10, 2),
  submission_date TIMESTAMPTZ,
  submitted_by UUID,
  batch_status TEXT,
  acknowledgment_date TIMESTAMPTZ,
  clearinghouse_name TEXT,
  environment TEXT
);
```

#### Batch Claims
```sql
CREATE TABLE advancedmd_batch_claims (
  id UUID PRIMARY KEY,
  batch_id UUID REFERENCES advancedmd_edi_batches,
  claim_id UUID REFERENCES advancedmd_claims,
  line_number INTEGER,
  UNIQUE (batch_id, claim_id)
);
```

#### Claim Appeals
```sql
CREATE TABLE advancedmd_claim_appeals (
  id UUID PRIMARY KEY,
  claim_id UUID REFERENCES advancedmd_claims,
  appeal_number INTEGER,
  appeal_date DATE,
  appeal_reason TEXT,
  appeal_status TEXT,
  decision_date DATE,
  decision_amount DECIMAL(10, 2),
  filed_by UUID
);
```

#### Claim Corrections
```sql
CREATE TABLE advancedmd_claim_corrections (
  id UUID PRIMARY KEY,
  original_claim_id UUID,
  corrected_claim_id UUID,
  correction_reason TEXT,
  changes_made JSONB,
  corrected_by UUID
);
```

#### CPT Code Library
```sql
CREATE TABLE cpt_codes (
  id UUID PRIMARY KEY,
  code TEXT UNIQUE,
  description TEXT,
  category TEXT,
  default_price DECIMAL(10, 2),
  time_based BOOLEAN,
  add_on_code BOOLEAN,
  prior_auth_required BOOLEAN,
  active BOOLEAN
);
```

#### ICD-10 Code Library
```sql
CREATE TABLE icd10_codes (
  id UUID PRIMARY KEY,
  code TEXT UNIQUE,
  description TEXT,
  category TEXT,
  active BOOLEAN
);
```

#### Denial Codes
```sql
CREATE TABLE denial_codes (
  id UUID PRIMARY KEY,
  code TEXT UNIQUE,
  category TEXT CHECK (category IN ('correctable', 'appealable', 'final')),
  description TEXT,
  action_required TEXT,
  common_resolution TEXT
);
```

### Views

#### Claims Dashboard Stats
```sql
CREATE VIEW claims_dashboard_stats AS
SELECT
  COUNT(*) FILTER (WHERE claim_status = 'Draft') AS draft_count,
  COUNT(*) FILTER (WHERE claim_status = 'Submitted') AS submitted_count,
  COUNT(*) FILTER (WHERE claim_status = 'Paid') AS paid_count,
  COUNT(*) FILTER (WHERE claim_status = 'Denied') AS denied_count,
  SUM(billed_amount) AS total_billed,
  SUM(paid_amount) AS total_paid,
  AVG(EXTRACT(DAY FROM (paid_date - submission_date))) AS avg_days_to_payment
FROM advancedmd_claims
WHERE submission_date > NOW() - INTERVAL '90 days';
```

#### Denial Analysis
```sql
CREATE VIEW denial_analysis AS
SELECT
  denial_code,
  COUNT(*) AS denial_count,
  SUM(billed_amount) AS total_denied_amount,
  COUNT(*) FILTER (WHERE claim_status = 'Appealed') AS appeal_count
FROM advancedmd_claims
WHERE claim_status IN ('Denied', 'Appealed')
GROUP BY denial_code;
```

## Workflows

### 1. Create and Submit Claim

```
1. Open Claims Management page
   ↓
2. Click "Create New Claim"
   ↓
3. Fill claim information:
   - Statement period
   - Billing provider
   - Rendering provider
   - Prior auth (if required)
   ↓
4. Add diagnoses:
   - Select ICD-10 codes
   - Mark primary diagnosis
   ↓
5. Add service lines:
   - Service date
   - Place of service
   - CPT code
   - Units & charge
   - Link to diagnoses
   ↓
6. Review validation:
   - Fix errors
   - Review warnings
   ↓
7. Submit claim
   ↓
8. Generate 837P EDI file
   ↓
9. Submit to clearinghouse
   ↓
10. Poll for status updates
```

### 2. Handle Denied Claim

```
1. Denial notification received
   ↓
2. Navigate to Denials tab
   ↓
3. Review denial details:
   - Denial code
   - Category (correctable/appealable/final)
   - Recommended action
   ↓
4. Choose workflow:

   CORRECTABLE:
   - Click "Correct"
   - Add correction notes
   - Claim moves to Draft
   - Edit claim data
   - Resubmit as Replacement

   APPEALABLE:
   - Click "Appeal"
   - Add appeal justification
   - Attach documentation
   - Submit appeal
   - Track appeal status

   FINAL:
   - Accept adjustment
   - Bill patient for responsibility
   - Close claim
```

### 3. Monitor Claim Status

```
1. Claims auto-monitored if status in:
   - Submitted
   - Accepted
   - In Process
   ↓
2. Poll AdvancedMD API every 5 minutes
   ↓
3. Detect status changes
   ↓
4. Show toast notification
   ↓
5. Update database
   ↓
6. Display new status in dashboard
```

### 4. Batch Submission

```
1. Create multiple claims
   ↓
2. Move to "Ready" status
   ↓
3. Select claims for batch
   ↓
4. Generate 837P batch file:
   - ISA/GS headers (one per batch)
   - ST/BHT per claim
   - All service lines
   - SE/GE/IEA trailers
   ↓
5. Submit batch to clearinghouse
   ↓
6. Track batch acknowledgment (997)
   ↓
7. Process individual claim statuses
```

## Validation Rules

### Claim Header
- ✓ Required: Patient, Insurance, Providers
- ✓ Statement to date ≥ from date
- ✓ Dates not in future
- ⚠ Warn if >1 year old (timely filing)

### Service Lines
- ✓ CPT code: 5 digits
- ✓ Place of service: 2 digits
- ✓ Units: 1-999
- ✓ Charge: >$0
- ✓ Service date within statement period
- ✓ At least one diagnosis pointer
- ⚠ Warn if units >999
- ⚠ Warn if charge >$10,000
- ℹ Info if time-based CPT
- ℹ Info if add-on code
- ⚠ Warn if prior auth typically required

### Diagnoses
- ✓ ICD-10 format (starts with letter, followed by digits)
- ✓ At least one primary diagnosis
- ✓ Diagnosis pointer exists
- ⚠ Warn if >12 diagnoses
- ⚠ Warn if duplicate codes

### Cross-field
- ✓ Diagnosis pointers reference valid diagnoses
- ✓ Total charge >$0
- ⚠ Warn if total >$100,000

## Status Lifecycle

```
Draft → Ready → Submitted → Accepted → In Process → Paid
                     ↓           ↓
                 Rejected     Denied
                     ↓           ↓
                  (Correct)  (Appeal or Correct)
                     ↓           ↓
                   Draft      Appealed
                               ↓
                          (Approved or Denied)
```

**Status Definitions**:
- **Draft**: Being created/edited
- **Ready**: Complete, awaiting submission
- **Submitted**: Sent to clearinghouse/payer
- **Accepted**: Clearinghouse accepted
- **Rejected**: Clearinghouse rejected (technical errors)
- **In Process**: Payer processing
- **Denied**: Payer denied (clinical/coverage reasons)
- **Appealed**: Under appeal review
- **Paid**: Payment received
- **Void**: Cancelled

## Testing

### Manual Test Checklist
- [ ] Create claim with single service line
- [ ] Create claim with multiple service lines
- [ ] Add/remove service lines dynamically
- [ ] Add/remove diagnoses dynamically
- [ ] Search and select CPT codes
- [ ] Search and select ICD-10 codes
- [ ] Validate required fields
- [ ] Validate date ranges
- [ ] Validate diagnosis pointers
- [ ] Calculate line totals
- [ ] Calculate claim total
- [ ] Submit claim successfully
- [ ] Generate 837P EDI file
- [ ] View claim in dashboard
- [ ] Search claims by ID
- [ ] Filter claims by status
- [ ] Detect status changes
- [ ] Receive status notifications
- [ ] View denied claims
- [ ] Correct denied claim
- [ ] File appeal for denied claim
- [ ] Export claims data

### Integration Tests
```typescript
// Test claim submission
const claim = createTestClaim();
const validation = validateClaim(claim);
expect(validation.isValid).toBe(true);

const response = await submitClaim(claim);
expect(response.success).toBe(true);
expect(response.data.claimControlNumber).toBeDefined();

// Test EDI generation
const edi = generate837P(claim, options);
const ediValidation = validate837P(edi);
expect(ediValidation.isValid).toBe(true);
expect(edi).toContain('ISA*');
expect(edi).toContain('GS*HC');
expect(edi).toContain('ST*837');

// Test status polling
const polling = useClaimStatusPolling({
  claimIds: [response.data.claimId],
  pollingInterval: 1000,
});
await wait(1100);
expect(polling.statuses.length).toBeGreaterThan(0);
```

## Error Handling

### Common Errors

**E001: Missing Required Field**
```
Error: Patient ID is required
Solution: Ensure all required fields are filled
```

**E002: Invalid Date Range**
```
Error: Statement to date cannot be before from date
Solution: Check and correct date fields
```

**E003: Invalid Diagnosis Pointer**
```
Error: Service line 2: Diagnosis pointer 5 references non-existent diagnosis
Solution: Add diagnosis #5 or update pointer
```

**E004: Duplicate Service Line**
```
Warning: Possible duplicate service lines: Line 2, Line 3
Solution: Verify if duplicate or intentional
```

**E005: Timely Filing**
```
Warning: Claim is over 1 year old - may be subject to timely filing limits
Solution: Check payer timely filing requirements
```

## Performance

### Optimizations
- ✓ Batch status checks (5 at a time)
- ✓ 1s delay between batches
- ✓ Database indexes on claim_id, status, dates
- ✓ Views for dashboard stats
- ✓ Debounced search input
- ✓ Lazy loading of claim details

### Expected Performance
- Claim validation: <100ms
- Claim submission: <2s
- 837P generation: <500ms
- Status poll: <1s per claim
- Dashboard load: <1s
- Search results: <500ms

## Security

### Access Control
- ✓ RLS on all tables
- ✓ Staff-only access to claims
- ✓ Admin-only for CPT/ICD-10 management
- ✓ Audit logging for all submissions
- ✓ User attribution

### Data Protection
- ✓ Encrypted storage (at rest)
- ✓ Encrypted transmission (HTTPS)
- ✓ No PHI in client-side logs
- ✓ Secure EDI file storage
- ✓ Access logs

## Next Steps: Phase 4

**ERA (835) Processing & Payment Posting**
- ERA file import (835 EDI)
- Automatic payment posting
- Payment reconciliation
- Adjustment handling
- EOB generation
- Patient statements

**Timeline**: 4-5 weeks

## Support

- **Phase 1 Setup**: `docs/ADVANCEDMD_PHASE1_SETUP.md`
- **Phase 2 Eligibility**: `docs/ADVANCEDMD_PHASE2_ELIGIBILITY.md`
- **Phase 3 Claims**: This document
- **Full Roadmap**: `ADVANCEDMD_INTEGRATION_ROADMAP.md`

---

**Phase 3 Status**: ✓ Complete
**Date**: October 10, 2025
**Components**: 9 components, 1 hook, 1 validation lib, 1 EDI generator, 1 migration
**Total Lines**: ~4,000 TypeScript + SQL
