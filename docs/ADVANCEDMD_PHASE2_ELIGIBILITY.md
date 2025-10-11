# AdvancedMD Integration - Phase 2: Real-Time Eligibility Verification

## Overview

Phase 2 builds on the Phase 1 API infrastructure to deliver a complete real-time insurance eligibility verification system with automatic caching, OCR card scanning, and patient synchronization.

## Features Implemented

### 1. Eligibility Check Form
**Component**: `EligibilityCheckForm.tsx`

Modern, intuitive form for verifying insurance eligibility:
- Service date selection
- Service type dropdown (Mental Health, Substance Abuse, etc.)
- CPT code entry (optional for specific procedures)
- Real-time validation
- Loading states and error handling
- Success callback for displaying results

**Usage**:
```typescript
import { EligibilityCheckForm } from '@/components/billing';

<EligibilityCheckForm
  clientId="uuid"
  insuranceId="uuid"
  onSuccess={(response) => console.log('Eligibility:', response)}
/>
```

### 2. Benefit Visualization
**Component**: `BenefitVisualization.tsx`

Beautiful, color-coded display of insurance benefits:
- **Coverage Status**: Active/Inactive/Pending with icons
- **Financial Responsibility**:
  - Copay amount
  - Coinsurance percentage
  - Prior authorization status
- **Deductible Progress Bar**:
  - Total vs Met vs Remaining
  - Visual progress indicator
- **Out-of-Pocket Maximum**:
  - Total vs Met vs Remaining
  - Visual progress indicator
- **Covered Benefits List**:
  - Service type breakdown
  - In-network vs out-of-network
  - Coverage limitations
- **Warnings**: Coverage limitations displayed prominently

**Features**:
- Gradient headers with brand colors
- Progress bars for deductible/OOP tracking
- Color-coded sections (blue, purple, orange, green)
- Responsive grid layout
- Dark mode support

**Usage**:
```typescript
import { BenefitVisualization } from '@/components/billing';

<BenefitVisualization
  eligibility={eligibilityResponse}
  showHeader={true}
/>
```

### 3. Eligibility History Dashboard
**Component**: `EligibilityHistory.tsx`

Collapsible history of all eligibility checks:
- Chronological list of all checks
- Expandable details view
- Status badges (Active, Inactive, Pending)
- Financial summary (copay, deductible)
- Service date vs check date
- Prior auth indicators
- Full benefit visualization on expand
- Real-time updates

**Features**:
- Collapsible rows for space efficiency
- Color-coded status indicators
- Hover effects for interactivity
- Refresh button for manual updates
- Embedded BenefitVisualization on expand

**Usage**:
```typescript
import { EligibilityHistory } from '@/components/billing';

<EligibilityHistory clientId="uuid" limit={10} />
```

### 4. Automatic Eligibility Verification
**Hook**: `useAutoEligibilityCheck.tsx`

Intelligent hook that automatically verifies eligibility when needed:
- **Auto-check on mount**: Verifies when component loads
- **Smart caching**: Uses 24-hour cache by default (configurable)
- **Auto-refresh**: Refreshes expired cached results
- **Toast notifications**: Optional user-friendly notifications
- **Error handling**: Graceful fallbacks and retry logic
- **Loading states**: Track check progress

**Features**:
- Configurable cache duration
- Manual refresh capability
- From-cache indicator
- Last-checked timestamp
- Success/error callbacks

**Usage**:
```typescript
import { useAutoEligibilityCheck } from '@/hooks/useAutoEligibilityCheck';

const {
  eligibility,
  isChecking,
  error,
  lastChecked,
  fromCache,
  refresh
} = useAutoEligibilityCheck(clientId, insuranceId, serviceDate, {
  enabled: true,
  cacheHours: 24,
  showToast: true
});
```

### 5. Insurance Card Upload with OCR
**Component**: `InsuranceCardUpload.tsx`

Drag-and-drop insurance card scanner:
- **Dual upload**: Front and back card images
- **Drag-and-drop**: Modern file upload UX
- **Image preview**: See uploaded cards before processing
- **OCR extraction**: Automatic data extraction
- **Validation**: File type and size validation (10MB max)
- **Storage**: Secure Supabase storage integration

**Extracted Fields**:
- Insurance company name
- Member ID
- Group number
- Payer ID
- Plan name
- Effective date
- Copay amount
- Phone number
- RX BIN/PCN (pharmacy benefits)

**Features**:
- Visual feedback during upload
- Progress indicators
- Extracted data preview
- Manual verification prompt
- Error handling for failed OCR

**Usage**:
```typescript
import { InsuranceCardUpload } from '@/components/billing';

<InsuranceCardUpload
  clientId="uuid"
  insuranceId="uuid"
  onExtracted={(data) => console.log('Extracted:', data)}
/>
```

### 6. Patient Sync to AdvancedMD
**Component**: `PatientSyncDialog.tsx`

Dialog for syncing patient data to AdvancedMD billing:
- **Patient demographics**: Name, DOB, gender, contact info
- **Address information**: Full address with validation
- **Insurance information**: All active insurances
- **Sync status**: Track if patient already synced
- **Duplicate detection**: Identifies existing records
- **Error handling**: Clear error messages
- **Re-sync capability**: Update existing records

**Features**:
- Modal dialog for focused workflow
- Pre-sync data review
- Real-time sync status
- AdvancedMD Patient ID display
- Last synced timestamp
- Sync error display
- Re-sync button for updates

**Usage**:
```typescript
import { PatientSyncDialog } from '@/components/billing';

<PatientSyncDialog
  clientId="uuid"
  trigger={<Button>Sync to AdvancedMD</Button>}
/>
```

### 7. Eligibility Verification Page
**Page**: `EligibilityVerification.tsx`

Comprehensive eligibility management dashboard:
- **Tabbed interface**: Check, Results, History
- **Check tab**: Form + card upload side-by-side
- **Results tab**: Full benefit visualization
- **History tab**: All past checks
- **Patient sync**: Quick access button
- **Responsive layout**: Mobile-friendly

**Usage**:
Navigate to `/eligibility-verification/:clientId`

## Database Schema

### New Tables (Phase 2)

#### Insurance Card Storage
```sql
ALTER TABLE client_insurance
ADD COLUMN front_card_image TEXT,
ADD COLUMN back_card_image TEXT,
ADD COLUMN card_uploaded_at TIMESTAMPTZ,
ADD COLUMN ocr_extracted_data JSONB;
```

### New Functions

#### Get Cached Eligibility
```sql
SELECT * FROM get_cached_eligibility(
  client_id,
  insurance_id,
  service_date,
  cache_hours DEFAULT 24
);
```

Returns most recent eligibility check if within cache window.

#### Check if Refresh Needed
```sql
SELECT needs_eligibility_refresh(
  client_id,
  insurance_id,
  service_date
);
```

Returns `true` if eligibility should be re-checked (>24 hours old).

### New Views

#### Recent Eligibility Checks
```sql
SELECT * FROM recent_eligibility_checks
WHERE client_id = 'uuid'
ORDER BY check_date DESC;
```

Includes client info, insurance info, and validity flag.

## Supabase Edge Functions

### Insurance Card OCR
**Function**: `extract-insurance-card`

Extracts insurance data from card images using OCR.

**Input**:
```typescript
{
  frontImageUrl: string;
  backImageUrl?: string;
  clientId: string;
  insuranceId?: string;
}
```

**Output**:
```typescript
{
  insuranceCompany?: string;
  memberId?: string;
  groupNumber?: string;
  payerId?: string;
  planName?: string;
  effectiveDate?: string;
  copay?: string;
  phoneNumber?: string;
  rxBin?: string;
  rxPcn?: string;
}
```

**Deploy**:
```bash
supabase functions deploy extract-insurance-card
```

**OCR Integration**:
Currently returns mock data. Integrate with:
- **Google Cloud Vision**: Best OCR accuracy
- **Azure Computer Vision**: Good balance of cost/accuracy
- **AWS Textract**: Healthcare-specific features
- **Tesseract.js**: Free, open-source option

See function code for integration examples.

## Storage Buckets

### Insurance Cards
**Bucket**: `insurance-cards`

Stores uploaded insurance card images.

**Policies**:
- Authenticated users can upload
- Users can view their own cards
- Users can update their own cards
- Users can delete their own cards

**Path Structure**:
```
insurance-cards/
  {clientId}/
    insurance-card-front-{timestamp}.jpg
    insurance-card-back-{timestamp}.jpg
```

## Workflows

### 1. New Patient Eligibility Check

```
1. Patient arrives for appointment
   ↓
2. Staff opens client chart
   ↓
3. Navigate to Insurance tab
   ↓
4. Click "Check Eligibility"
   ↓
5. System auto-checks if >24 hours since last check
   ↓
6. If no check or expired:
   - Makes real-time API call to AdvancedMD
   - Saves result to database
   - Displays benefit visualization
   ↓
7. If cached result available (<24 hours):
   - Displays cached results immediately
   - Shows "Last checked: X hours ago"
   - Option to force refresh
   ↓
8. Staff reviews coverage, copay, deductible
   ↓
9. Proceed with appointment
```

### 2. Insurance Card Upload

```
1. Patient provides insurance card
   ↓
2. Staff opens Insurance Card Upload
   ↓
3. Takes photo or scans front/back
   ↓
4. Drag-drop into upload area
   ↓
5. System uploads to Supabase Storage
   ↓
6. Calls extract-insurance-card Edge Function
   ↓
7. OCR processes images
   ↓
8. Extracted data displayed for verification
   ↓
9. Staff reviews and confirms accuracy
   ↓
10. Data saved to client_insurance table
   ↓
11. Card images linked to insurance record
```

### 3. Patient Sync to AdvancedMD

```
1. New patient registered in EHR
   ↓
2. Insurance information entered
   ↓
3. Staff clicks "Sync to AdvancedMD"
   ↓
4. System checks if already synced
   ↓
5. If not synced:
   - Validates required fields
   - Builds sync request
   - Calls AdvancedMD Patient API
   - Saves AdvancedMD Patient ID
   - Updates sync status
   ↓
6. If already synced:
   - Shows sync status
   - Option to re-sync (update)
   - Shows AdvancedMD Patient ID
   ↓
7. Sync complete - ready for billing
```

### 4. Automatic Appointment Eligibility

```
1. Appointment created/scheduled
   ↓
2. useAutoEligibilityCheck hook triggered
   ↓
3. Check for cached eligibility (<24 hours)
   ↓
4. If cached:
   - Display cached results
   - Show toast: "Coverage is Active (Cached)"
   ↓
5. If not cached:
   - Make real-time eligibility check
   - Cache results for 24 hours
   - Show toast: "Eligibility Verified - Copay: $XX"
   ↓
6. If error:
   - Show error toast
   - Log error for review
   - Allow manual retry
   ↓
7. Results available for appointment check-in
```

## Caching Strategy

### Why 24-Hour Cache?

Insurance eligibility doesn't change frequently. Caching reduces:
- API costs (fewer real-time calls)
- Response time (instant from cache)
- Rate limit consumption
- User wait time

### Cache Invalidation

Cache is considered invalid if:
- >24 hours since last check
- Service date has changed significantly
- Insurance changed/updated
- Manual refresh requested

### Cache Lookup Flow

```typescript
1. Check if eligibility exists for client + insurance + service date
   ↓
2. If found, check if check_date > (NOW - 24 hours)
   ↓
3. If valid:
   - Return cached result
   - Set fromCache = true
   ↓
4. If invalid or not found:
   - Make real-time API call
   - Save new result
   - Set fromCache = false
```

## Integration Points

### Client Chart
Add eligibility components to client insurance section:

```typescript
import { EligibilityHistory, PatientSyncDialog } from '@/components/billing';

// In Insurance tab
<EligibilityHistory clientId={clientId} />
<PatientSyncDialog clientId={clientId} />
```

### Appointment Creation
Auto-check eligibility when creating appointments:

```typescript
import { useAutoEligibilityCheck } from '@/hooks/useAutoEligibilityCheck';

const { eligibility, isChecking } = useAutoEligibilityCheck(
  appointment.clientId,
  client.primaryInsuranceId,
  appointment.serviceDate
);

// Show eligibility status during scheduling
```

### Scheduler
Display eligibility status on appointments:

```typescript
// In appointment tooltip/details
{eligibility?.coverageStatus === 'Active' && (
  <Badge>Coverage Verified</Badge>
)}
{eligibility?.copay && (
  <p>Copay: ${eligibility.copay}</p>
)}
```

## Testing

### Unit Tests
```bash
# Test eligibility check
npm test EligibilityCheckForm.test.tsx

# Test caching logic
npm test useAutoEligibilityCheck.test.tsx

# Test OCR extraction
npm test InsuranceCardUpload.test.tsx
```

### Integration Tests
```bash
# Test full eligibility workflow
npm test eligibility-workflow.test.tsx

# Test patient sync
npm test patient-sync.test.tsx
```

### Manual Testing Checklist

- [ ] Upload insurance card (front only)
- [ ] Upload insurance card (front + back)
- [ ] Verify OCR extraction accuracy
- [ ] Check eligibility for active insurance
- [ ] Check eligibility for inactive insurance
- [ ] View eligibility history (multiple checks)
- [ ] Expand history item to see full details
- [ ] Test cache (check twice within 24 hours)
- [ ] Test cache expiry (force refresh after 24 hours)
- [ ] Sync new patient to AdvancedMD
- [ ] Re-sync existing patient
- [ ] Test auto-eligibility on appointment creation
- [ ] Test error handling (invalid insurance)
- [ ] Test loading states
- [ ] Test responsive layout (mobile)

## Performance Optimizations

### Implemented
✓ 24-hour eligibility caching
✓ Lazy loading of eligibility history
✓ Optimized database queries with indexes
✓ Image compression on upload
✓ Debounced form inputs

### Recommended
- [ ] Prefetch eligibility for upcoming appointments
- [ ] Background sync of patient data
- [ ] Batch eligibility checks for multiple clients
- [ ] CDN for insurance card images
- [ ] WebP image format for smaller file sizes

## Security

### Data Protection
- Insurance cards stored in private Supabase bucket
- RLS policies restrict access to owner
- OCR processing server-side only
- Sensitive data encrypted at rest
- HTTPS for all API calls

### Compliance
- HIPAA-compliant storage
- Audit logging for all eligibility checks
- User attribution for all actions
- Data retention policies configurable

## Troubleshooting

### Eligibility Check Fails
**Error**: "Eligibility check failed"
**Solutions**:
1. Verify insurance is active
2. Check AdvancedMD credentials
3. Verify payer ID is correct
4. Check service date is valid
5. Review API logs in `advancedmd_api_logs`

### OCR Extraction Returns Empty
**Error**: No data extracted from card
**Solutions**:
1. Ensure image is clear and well-lit
2. Verify image is right-side up
3. Check file format (JPG, PNG)
4. Try higher resolution image
5. Review OCR Edge Function logs

### Patient Sync Fails
**Error**: "Sync failed"
**Solutions**:
1. Verify all required fields filled
2. Check for duplicate patient in AdvancedMD
3. Verify insurance information complete
4. Review sync error message
5. Check AdvancedMD API status

### Cache Not Working
**Error**: Always making real-time calls
**Solutions**:
1. Check database migration applied
2. Verify `get_cached_eligibility` function exists
3. Check cache_hours parameter
4. Review eligibility check timestamps
5. Clear and rebuild cache

## Next Steps: Phase 3

After Phase 2 is tested and deployed:

**Phase 3: Electronic Claim Submission**
- Claim creation UI
- 837P EDI generation
- Claim scrubbing and validation
- Batch claim submission
- Claim status tracking
- Denial management

**Timeline**: 4-5 weeks

## Support

- **Setup Guide**: `docs/ADVANCEDMD_PHASE1_SETUP.md`
- **API Documentation**: `src/lib/advancedmd/`
- **Database Schema**: `supabase/migrations/`
- **Component Documentation**: See component file headers

---

**Phase 2 Status**: ✓ Implementation Complete
**Date**: October 10, 2025
**Components**: 7 new components, 1 hook, 2 migrations, 1 Edge Function
**Lines of Code**: ~2,000 lines TypeScript + SQL
