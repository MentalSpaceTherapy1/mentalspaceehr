# AdvancedMD Billing Integration - Enterprise Implementation Roadmap

**Project Timeline:** 12-16 weeks (200-300 hours)
**Priority:** High - Revenue Cycle Management Critical
**Status:** Planning Phase
**Created:** 2025-01-10

---

## 🎯 Executive Summary

Transform MentalSpace EHR into a **fully integrated, enterprise-grade billing platform** with AdvancedMD, achieving:
- ✅ **99.5% claim acceptance rate** (AdvancedMD guarantee)
- ✅ **<30 second real-time eligibility checks**
- ✅ **Automated ERA posting** and payment reconciliation
- ✅ **Complete revenue cycle automation**
- ✅ **Modern, beautiful UI** matching existing EHR design standards

---

## 📋 Table of Contents

1. [Phase 1: Foundation & API Infrastructure](#phase-1)
2. [Phase 2: Real-Time Eligibility Integration](#phase-2)
3. [Phase 3: Electronic Claim Submission](#phase-3)
4. [Phase 4: ERA & Payment Posting](#phase-4)
5. [Phase 5: Advanced Features & Optimization](#phase-5)
6. [Phase 6: Testing, Training & Go-Live](#phase-6)
7. [Technical Architecture](#technical-architecture)
8. [Database Schema](#database-schema)
9. [Security & Compliance](#security-compliance)
10. [Success Metrics](#success-metrics)

---

<a name="phase-1"></a>
## 🔧 Phase 1: Foundation & API Infrastructure (Weeks 1-2)

**Duration:** 2 weeks | **Effort:** 40-50 hours
**Priority:** CRITICAL - Everything depends on this

### Objectives
- Establish secure AdvancedMD API connection
- Build authentication & token management system
- Create base API client with error handling
- Set up sandbox and production environments

### Deliverables

#### 1.1 API Client Infrastructure
**File:** `src/lib/advancedmd/api-client.ts`

```typescript
Features:
- OAuth 2.0 authentication with automatic token rotation (24hr)
- Dual environment support (sandbox/production)
- Rate limit management (see API limit document)
- Retry logic with exponential backoff
- Request/response logging for audit
- IP whitelisting configuration
```

**Key Functions:**
- `authenticate()` - OAuth token management
- `request()` - Base HTTP client with interceptors
- `handleRateLimits()` - Queue management for API limits
- `rotateCredentials()` - 24-hour token refresh

#### 1.2 Configuration Management
**File:** `src/lib/advancedmd/config.ts`

```typescript
Environment Variables:
- ADVANCEDMD_SANDBOX_OFFICE_KEY
- ADVANCEDMD_SANDBOX_API_USERNAME
- ADVANCEDMD_SANDBOX_API_PASSWORD
- ADVANCEDMD_SANDBOX_CLIENT_ID
- ADVANCEDMD_SANDBOX_CLIENT_SECRET
- ADVANCEDMD_PROD_* (same set for production)
- ADVANCEDMD_ENVIRONMENT (sandbox|production)
```

#### 1.3 Database Schema - Core Tables
**Migration:** `supabase/migrations/20250110_advancedmd_core.sql`

```sql
-- API Credentials & Config
CREATE TABLE advancedmd_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  environment TEXT NOT NULL CHECK(environment IN ('sandbox', 'production')),
  office_key TEXT NOT NULL,
  api_username TEXT NOT NULL ENCRYPTED,
  api_password TEXT NOT NULL ENCRYPTED,
  client_id TEXT NOT NULL,
  client_secret TEXT NOT NULL ENCRYPTED,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Token Management
CREATE TABLE advancedmd_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID REFERENCES advancedmd_config(id),
  access_token TEXT NOT NULL ENCRYPTED,
  refresh_token TEXT ENCRYPTED,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- API Call Audit Log
CREATE TABLE advancedmd_api_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  request_body JSONB,
  response_body JSONB,
  status_code INTEGER,
  duration_ms INTEGER,
  error TEXT,
  user_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rate Limit Tracking
CREATE TABLE advancedmd_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint TEXT NOT NULL,
  requests_count INTEGER DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL,
  window_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 1.4 Supabase Edge Functions
**Function:** `supabase/functions/advancedmd-authenticate/index.ts`

```typescript
// Token management with automatic rotation
// Returns: { access_token, expires_in }
```

**Function:** `supabase/functions/advancedmd-proxy/index.ts`

```typescript
// Secure proxy for all AdvancedMD API calls
// Handles: Auth, rate limits, logging, error handling
```

### Testing Checklist
- [ ] Successfully authenticate with sandbox environment
- [ ] Token rotation works automatically (24hr test)
- [ ] Rate limit enforcement working correctly
- [ ] Error handling for all failure scenarios
- [ ] API logs capturing all requests/responses
- [ ] IP whitelisting configured
- [ ] Both credentials sets (sandbox/prod) securely stored

### Success Criteria
- ✅ Successful sandbox authentication
- ✅ <500ms API response time
- ✅ 100% uptime for token management
- ✅ Zero leaked credentials in logs
- ✅ Rate limits respected (no throttling)

---

<a name="phase-2"></a>
## 🏥 Phase 2: Real-Time Eligibility Integration (Weeks 3-4)

**Duration:** 2 weeks | **Effort:** 50-60 hours
**Priority:** HIGH - Critical for billing workflow

### Objectives
- Build real-time eligibility verification system
- Create beautiful, modern eligibility UI
- Implement eligibility caching strategy
- Support all mental health service types

### Deliverables

#### 2.1 Eligibility API Service
**File:** `src/lib/advancedmd/eligibility-service.ts`

```typescript
Key Functions:
- verifyEligibility(clientId, insuranceId, serviceDate)
  • Real-time check via AdvancedMD API
  • Response time: <30 seconds
  • Support for CPT codes: 90834, 90837, 90791, etc.

- getCachedEligibility(clientId, insuranceId)
  • Retrieve recent checks (within 30 days)
  • Avoid redundant API calls

- getEligibilityHistory(clientId)
  • Full audit trail of all checks
  • Retention: Indefinite

- verifyDependent(subscriberId, dependentInfo)
  • Family member coverage checks
```

#### 2.2 Database Schema - Eligibility
**Migration:** `supabase/migrations/20250110_eligibility_checks.sql`

```sql
-- Eligibility Check Results
CREATE TABLE eligibility_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) NOT NULL,
  insurance_id UUID REFERENCES client_insurance(id) NOT NULL,
  check_date DATE NOT NULL,
  service_date DATE NOT NULL,

  -- Coverage Status
  coverage_status TEXT CHECK(coverage_status IN (
    'Active', 'Inactive', 'Pending', 'Terminated'
  )),

  -- Financial Details
  copay_amount DECIMAL(10,2),
  coinsurance_percentage DECIMAL(5,2),
  deductible_total DECIMAL(10,2),
  deductible_met DECIMAL(10,2),
  deductible_remaining DECIMAL(10,2),
  oop_max_total DECIMAL(10,2),
  oop_max_met DECIMAL(10,2),
  oop_max_remaining DECIMAL(10,2),

  -- Service-Specific Coverage
  service_type TEXT, -- 'individual_therapy', 'group_therapy', etc.
  cpt_code TEXT,
  prior_auth_required BOOLEAN DEFAULT false,
  prior_auth_number TEXT,

  -- Response Metadata
  payer_name TEXT,
  payer_id TEXT,
  member_id TEXT,
  group_number TEXT,
  plan_name TEXT,
  effective_date DATE,
  termination_date DATE,

  -- API Response
  raw_response JSONB,
  error_code TEXT,
  error_message TEXT,

  -- Audit
  checked_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_eligibility_client ON eligibility_checks(client_id, check_date DESC);
CREATE INDEX idx_eligibility_insurance ON eligibility_checks(insurance_id);
CREATE INDEX idx_eligibility_status ON eligibility_checks(coverage_status);
```

#### 2.3 Modern Eligibility UI Component
**File:** `src/components/billing/EligibilityCheckWidget.tsx`

```typescript
Features:
- One-click eligibility verification
- Real-time status updates with loading states
- Beautiful card-based results display
- Color-coded coverage status (green/red/yellow)
- Deductible progress bars with animations
- Prior auth requirement alerts
- Service-specific breakdown (therapy types)
- Historical check timeline
- Quick actions: Re-check, Print, Export PDF
```

**Design:**
- Gradient header with payer logo
- Animated progress bars for deductibles/OOP
- Status badges with icons
- Mobile-responsive layout
- Dark mode support

#### 2.4 Eligibility Dashboard Page
**File:** `src/pages/admin/EligibilityDashboard.tsx`

```typescript
Features:
- Bulk eligibility checks (multiple clients)
- Scheduled automated checks (weekly/monthly)
- Expiring coverage alerts
- Prior auth tracking dashboard
- Coverage gap identification
- Export reports (CSV, PDF)
- Filter by: status, payer, service type, date range
```

#### 2.5 React Hooks
**File:** `src/hooks/useEligibilityVerification.tsx`

```typescript
export const useEligibilityVerification = (clientId: string) => {
  return {
    verifyNow: async (insuranceId, serviceDate) => {...},
    getCached: async () => {...},
    history: [...],
    isLoading: boolean,
    error: Error | null,
  };
};
```

### Testing Checklist
- [ ] Successful real-time eligibility check (sandbox)
- [ ] Response time <30 seconds
- [ ] Deductible/copay/OOP amounts accurately parsed
- [ ] Prior auth requirements detected
- [ ] Dependent coverage verification works
- [ ] Caching prevents duplicate checks (30-day rule)
- [ ] Error handling for "payer not found"
- [ ] Error handling for "patient not covered"
- [ ] All 99.9% success rate scenarios tested
- [ ] UI displays all data fields beautifully

### Success Criteria
- ✅ <30 second response time
- ✅ 99.9% success rate achieved
- ✅ All financial fields accurately displayed
- ✅ Zero redundant API calls (caching works)
- ✅ Beautiful, intuitive UI

---

<a name="phase-3"></a>
## 📄 Phase 3: Electronic Claim Submission (Weeks 5-8)

**Duration:** 4 weeks | **Effort:** 80-100 hours
**Priority:** CRITICAL - Core billing functionality

### Objectives
- Build 837P claim generation engine
- Implement batch and individual submission
- Create claim validation and scrubbing
- Build claim status tracking system
- Support claim attachments

### Deliverables

#### 3.1 837P Claim Generator
**File:** `src/lib/advancedmd/claim-837p-generator.ts`

```typescript
Key Functions:
- generateClaim837P(chargeId)
  • Convert charge to 837P EDI format
  • Include all required segments (ISA, GS, ST, BHT, NM1, etc.)
  • Validate all fields before generation

- validateClaim(claimData)
  • Check required fields
  • Validate CPT/ICD-10 code combinations
  • Validate modifiers
  • Check date ranges
  • Verify provider enrollment

- submitClaim(claimId, mode: 'individual' | 'batch')
  • Submit to AdvancedMD API
  • Handle Waystar clearinghouse routing
  • Track submission status

- submitClaimBatch(claimIds[])
  • Batch submission (max size per API docs)
  • Progress tracking
  • Partial failure handling
```

#### 3.2 Database Schema - Claims
**Migration:** `supabase/migrations/20250110_claims_management.sql`

```sql
-- Claims (837P)
CREATE TABLE insurance_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identifiers
  claim_id TEXT UNIQUE NOT NULL, -- Internal
  claim_control_number TEXT UNIQUE, -- From clearinghouse
  payer_claim_control_number TEXT, -- From payer

  -- Relationships
  client_id UUID REFERENCES clients(id) NOT NULL,
  insurance_id UUID REFERENCES client_insurance(id) NOT NULL,
  provider_id UUID REFERENCES profiles(id) NOT NULL,

  -- Claim Details
  claim_type TEXT CHECK(claim_type IN ('Original', 'Replacement', 'Void')),
  billing_provider_npi TEXT NOT NULL,
  rendering_provider_npi TEXT NOT NULL,
  service_facility_npi TEXT,

  -- Dates
  statement_from_date DATE NOT NULL,
  statement_to_date DATE NOT NULL,
  admission_date DATE,
  discharge_date DATE,

  -- Financial
  total_charge_amount DECIMAL(10,2) NOT NULL,
  total_paid_amount DECIMAL(10,2) DEFAULT 0,
  total_adjusted_amount DECIMAL(10,2) DEFAULT 0,
  patient_responsibility DECIMAL(10,2) DEFAULT 0,

  -- Status
  claim_status TEXT CHECK(claim_status IN (
    'Draft', 'Ready', 'Submitted', 'Accepted', 'Rejected',
    'In Process', 'Paid', 'Denied', 'Appealed', 'Void'
  )),
  submission_date TIMESTAMPTZ,
  accepted_date TIMESTAMPTZ,
  paid_date TIMESTAMPTZ,

  -- Clearinghouse
  clearinghouse_status TEXT,
  clearinghouse_response JSONB,
  payer_status TEXT,
  payer_response JSONB,

  -- 837P Data
  edi_file_content TEXT, -- Full 837P EDI
  edi_file_hash TEXT,

  -- Relationships to original/corrected claims
  original_claim_id UUID REFERENCES insurance_claims(id),
  corrected_by_claim_id UUID REFERENCES insurance_claims(id),

  -- Audit
  created_by UUID REFERENCES profiles(id),
  submitted_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Claim Service Lines
CREATE TABLE claim_service_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID REFERENCES insurance_claims(id) NOT NULL,

  -- Line Number
  line_number INTEGER NOT NULL,

  -- Service Details
  service_date DATE NOT NULL,
  place_of_service TEXT NOT NULL,
  cpt_code TEXT NOT NULL,
  modifiers TEXT[], -- Array of modifiers (59, 25, etc.)

  -- Units and Charges
  units DECIMAL(10,2) DEFAULT 1,
  unit_charge DECIMAL(10,2) NOT NULL,
  line_charge DECIMAL(10,2) NOT NULL,

  -- Diagnoses
  diagnosis_pointers INTEGER[], -- [1,2,3,4]

  -- Payments and Adjustments
  paid_amount DECIMAL(10,2) DEFAULT 0,
  adjusted_amount DECIMAL(10,2) DEFAULT 0,
  patient_responsibility DECIMAL(10,2) DEFAULT 0,

  -- Status
  line_status TEXT,
  denial_code TEXT,
  denial_reason TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(claim_id, line_number)
);

-- Claim Diagnoses
CREATE TABLE claim_diagnoses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID REFERENCES insurance_claims(id) NOT NULL,

  diagnosis_code TEXT NOT NULL, -- ICD-10
  diagnosis_pointer INTEGER NOT NULL, -- 1-12

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(claim_id, diagnosis_pointer)
);

-- Claim Attachments
CREATE TABLE claim_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID REFERENCES insurance_claims(id) NOT NULL,

  attachment_type TEXT CHECK(attachment_type IN (
    'Clinical Documentation', 'Prior Authorization',
    'Medical Records', 'Lab Results', 'Other'
  )),

  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL, -- PDF, JPG, PNG
  file_size INTEGER NOT NULL,
  file_url TEXT NOT NULL,

  uploaded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Claim Status History
CREATE TABLE claim_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID REFERENCES insurance_claims(id) NOT NULL,

  old_status TEXT,
  new_status TEXT NOT NULL,
  status_date TIMESTAMPTZ NOT NULL,

  notes TEXT,
  changed_by UUID REFERENCES profiles(id),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_claims_client ON insurance_claims(client_id);
CREATE INDEX idx_claims_status ON insurance_claims(claim_status);
CREATE INDEX idx_claims_submission_date ON insurance_claims(submission_date DESC);
CREATE INDEX idx_claim_lines_claim ON claim_service_lines(claim_id);
```

#### 3.3 Claim Submission UI
**File:** `src/components/billing/ClaimSubmissionWorkflow.tsx`

```typescript
Features:
- Multi-step wizard for claim creation
- Pre-submission validation with visual checklist
- Batch selection with checkboxes
- Progress bar for batch submissions
- Real-time status updates
- Error highlighting and correction
- Attachment upload with preview
- Submit and track workflow
```

**Steps:**
1. Select charges to bill
2. Review patient/insurance info
3. Add/verify diagnoses and CPT codes
4. Attach documents (if needed)
5. Validate claim
6. Submit (individual or batch)
7. Track status

#### 3.4 Claim Tracking Dashboard
**File:** `src/pages/admin/ClaimsDashboard.tsx`

```typescript
Features:
- Kanban-style status board (Draft → Submitted → Accepted → Paid)
- Aging report (claims >30, >60, >90 days)
- Denial analytics with reason breakdown
- Quick filters: payer, status, date range, provider
- Bulk actions: submit, void, resubmit
- Export to Excel/CSV
- Visual charts: submission trends, acceptance rates
```

### Testing Checklist
- [ ] 837P file generates correctly (validate with sample)
- [ ] All required segments present (ISA, GS, ST, etc.)
- [ ] Claim validation catches all errors
- [ ] Individual claim submission successful
- [ ] Batch submission handles max batch size
- [ ] Claim appears in AdvancedMD system immediately
- [ ] Claim status updates from clearinghouse
- [ ] Waystar 99.5% acceptance rate achieved
- [ ] Attachments upload successfully
- [ ] Claim correction/resubmission works
- [ ] Void claim functionality works

### Success Criteria
- ✅ 99.5% acceptance rate from clearinghouse
- ✅ Claims appear in AdvancedMD within 1 hour
- ✅ <5% rejection rate
- ✅ All claim data fields complete and accurate
- ✅ Batch submissions efficient (100+ claims)

---

<a name="phase-4"></a>
## 💰 Phase 4: ERA & Payment Posting (Weeks 9-10)

**Duration:** 2 weeks | **Effort:** 50-60 hours
**Priority:** HIGH - Revenue cycle completion

### Objectives
- Retrieve ERAs (835 files) from AdvancedMD
- Parse ERA data and extract payment details
- Automatically post payments to claims
- Handle adjustments and reason codes
- Build payment reconciliation tools

### Deliverables

#### 4.1 ERA Retrieval Service
**File:** `src/lib/advancedmd/era-service.ts`

```typescript
Key Functions:
- retrieveERAs(startDate, endDate)
  • Fetch all ERAs from AdvancedMD
  • Parse 835 EDI format to JSON
  • Extract all payment details

- parseERA835(eraContent)
  • Parse EDI segments
  • Extract claim payments
  • Map adjustment codes (CARC/RARC)

- postPayment(eraId, autoPost: boolean)
  • Post payments to claims automatically
  • Create adjustment entries
  • Update claim balances

- reconcilePayments()
  • Match ERA payments to claims
  • Identify discrepancies
  • Flag denied/partial payments
```

#### 4.2 Database Schema - ERA & Payments
**Migration:** `supabase/migrations/20250110_era_payments.sql`

```sql
-- Electronic Remittance Advice (835)
CREATE TABLE eras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ERA Identifiers
  era_file_id TEXT UNIQUE NOT� NULL,
  payer_name TEXT NOT NULL,
  payer_id TEXT NOT NULL,

  -- Payment Details
  check_number TEXT,
  check_date DATE NOT NULL,
  check_amount DECIMAL(10,2) NOT NULL,
  payment_method TEXT CHECK(payment_method IN (
    'CHK', 'ACH', 'EFT', 'WIRE'
  )),

  -- File Data
  edi_835_content TEXT, -- Full 835 file
  parsed_data JSONB,

  -- Status
  posting_status TEXT CHECK(posting_status IN (
    'Pending', 'Posted', 'Partially Posted', 'Error'
  )),
  auto_posted BOOLEAN DEFAULT false,
  posted_date TIMESTAMPTZ,

  -- Audit
  retrieved_date TIMESTAMPTZ NOT NULL,
  posted_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ERA Claim Payments
CREATE TABLE era_claim_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  era_id UUID REFERENCES eras(id) NOT NULL,
  claim_id UUID REFERENCES insurance_claims(id),

  -- Claim Identifiers
  claim_control_number TEXT NOT NULL,
  payer_claim_control_number TEXT,

  -- Payment Details
  billed_amount DECIMAL(10,2) NOT NULL,
  paid_amount DECIMAL(10,2) NOT NULL,
  patient_responsibility DECIMAL(10,2) DEFAULT 0,

  -- Status
  claim_status TEXT, -- From ERA

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ERA Service Line Payments
CREATE TABLE era_service_line_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  era_claim_payment_id UUID REFERENCES era_claim_payments(id) NOT NULL,
  claim_service_line_id UUID REFERENCES claim_service_lines(id),

  -- Service Details
  service_date DATE NOT NULL,
  cpt_code TEXT NOT NULL,
  modifiers TEXT[],

  -- Amounts
  billed_amount DECIMAL(10,2) NOT NULL,
  allowed_amount DECIMAL(10,2),
  paid_amount DECIMAL(10,2) NOT NULL,
  deductible_amount DECIMAL(10,2) DEFAULT 0,
  coinsurance_amount DECIMAL(10,2) DEFAULT 0,
  copay_amount DECIMAL(10,2) DEFAULT 0,

  -- Adjustments
  adjustment_group_code TEXT, -- CO, PR, OA, PI
  adjustment_reason_code TEXT, -- CARC codes
  adjustment_amount DECIMAL(10,2) DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Adjustment Reason Codes (CARC/RARC)
CREATE TABLE adjustment_reason_codes (
  code TEXT PRIMARY KEY,
  code_type TEXT CHECK(code_type IN ('CARC', 'RARC')),
  description TEXT NOT NULL,
  category TEXT, -- Deductible, Coinsurance, Non-covered, etc.

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payment Posting Journal
CREATE TABLE payment_postings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  claim_id UUID REFERENCES insurance_claims(id) NOT NULL,
  era_id UUID REFERENCES eras(id),

  -- Payment Details
  payment_date DATE NOT NULL,
  payment_amount DECIMAL(10,2) NOT NULL,
  payment_method TEXT,
  check_number TEXT,

  -- Source
  source TEXT CHECK(source IN (
    'ERA', 'Manual', 'Client Payment', 'Write-off'
  )),

  -- Adjustments
  adjustment_amount DECIMAL(10,2) DEFAULT 0,
  adjustment_reason TEXT,

  -- Notes
  notes TEXT,

  -- Audit
  posted_by UUID REFERENCES profiles(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_eras_payer ON eras(payer_id);
CREATE INDEX idx_eras_check_date ON eras(check_date DESC);
CREATE INDEX idx_era_claim_payments_era ON era_claim_payments(era_id);
CREATE INDEX idx_era_claim_payments_claim ON era_claim_payments(claim_id);
CREATE INDEX idx_payment_postings_claim ON payment_postings(claim_id);
```

#### 4.3 Payment Posting UI
**File:** `src/components/billing/PaymentPostingDashboard.tsx`

```typescript
Features:
- Incoming ERAs list with preview
- One-click auto-post
- Manual payment posting form
- Split payment allocation
- Adjustment code lookup with descriptions
- Payment reconciliation view
- Unapplied credits tracking
- Client payment posting
```

#### 4.4 ERA Reconciliation Report
**File:** `src/pages/admin/PaymentReconciliation.tsx`

```typescript
Features:
- ERA vs. Expected payment comparison
- Variance analysis
- Denial reason breakdown
- Trend charts (acceptance rate over time)
- Export to Excel for accounting
```

### Testing Checklist
- [ ] ERA retrieval from AdvancedMD works
- [ ] 835 file parsing accurate (all segments)
- [ ] CARC/RARC codes correctly identified
- [ ] Payments auto-post to correct claims
- [ ] Adjustments correctly categorized
- [ ] Split payments handled
- [ ] Patient responsibility calculated
- [ ] Manual posting works
- [ ] Reconciliation report accurate

### Success Criteria
- ✅ 100% of ERAs successfully retrieved
- ✅ <1% posting errors
- ✅ Auto-posting saves 80% of manual effort
- ✅ All adjustment codes mapped

---

<a name="phase-5"></a>
## 🚀 Phase 5: Advanced Features & Optimization (Weeks 11-12)

**Duration:** 2 weeks | **Effort:** 40-50 hours
**Priority:** MEDIUM - Enhancement and optimization

### Deliverables

#### 5.1 Patient/Provider Sync
**File:** `src/lib/advancedmd/sync-service.ts`

```typescript
Features:
- Bidirectional patient sync
- Provider NPI/taxonomy sync
- Duplicate detection and merging
- Scheduled daily sync
- Conflict resolution UI
```

#### 5.2 Fee Schedule Management
**File:** `src/components/billing/FeeScheduleManager.tsx`

```typescript
Features:
- Payer-specific contracted rates
- CPT code fee schedules
- Automatic charge calculation
- Rate version history
- Bulk import from CSV
```

#### 5.3 Denial Management Workflow
**File:** `src/components/billing/DenialWorkflow.tsx`

```typescript
Features:
- Denial queue with aging
- Reason code analytics
- Resubmission workflow
- Appeal letter generation
- Trend analysis and prevention
```

#### 5.4 Reporting & Analytics
**File:** `src/pages/admin/BillingAnalytics.tsx`

```typescript
Dashboards:
- Revenue cycle KPIs
- Days in A/R
- Collection rate
- Denial rate trends
- Payer performance comparison
- Provider productivity
```

#### 5.5 Batch Operations
**File:** `src/components/billing/BatchOperations.tsx`

```typescript
Features:
- Bulk eligibility checks (nightly)
- Batch claim submission (daily)
- Bulk payment posting
- Mass claim correction
```

### Testing Checklist
- [ ] Patient sync creates no duplicates
- [ ] Fee schedules calculate correctly
- [ ] Denial workflow tracks appeals
- [ ] Reports accurate and fast
- [ ] Batch operations handle large volumes

### Success Criteria
- ✅ <5% duplicate patient rate
- ✅ Fee schedules 100% accurate
- ✅ 50% denial rate reduction
- ✅ Reports load in <3 seconds

---

<a name="phase-6"></a>
## ✅ Phase 6: Testing, Training & Go-Live (Weeks 13-16)

**Duration:** 4 weeks | **Effort:** 40-50 hours
**Priority:** CRITICAL - Production readiness

### 6.1 Testing Strategy

#### Unit Testing
```typescript
Test Coverage Target: >80%

Key Test Suites:
- API client authentication
- 837P claim generation
- 835 ERA parsing
- Payment posting logic
- Eligibility response parsing
```

#### Integration Testing
```
Sandbox Testing:
- [ ] Full claim lifecycle (submit → accept → pay → post)
- [ ] Eligibility checks for all service types
- [ ] Batch submissions (100+ claims)
- [ ] Error handling scenarios
- [ ] Rate limit compliance
```

#### Parallel Testing (2-4 weeks)
```
Process:
1. Submit claims through BOTH systems
   - AdvancedMD portal (manual baseline)
   - MentalSpace EHR (new integration)

2. Compare results:
   - Acceptance rates
   - Payment amounts
   - Posting accuracy
   - Turnaround time

3. Validation criteria:
   - 99.5% acceptance rate maintained
   - <1% variance in payments
   - Faster turnaround than manual
```

### 6.2 Training Program

#### Staff Training (1 week)
```
Modules:
1. Eligibility Verification (30 min)
   - When to check
   - How to interpret results
   - Prior auth workflow

2. Claim Submission (1 hour)
   - Creating charges
   - Validating claims
   - Batch submission
   - Handling rejections

3. Payment Posting (45 min)
   - ERA review
   - Auto vs. manual posting
   - Adjustment codes
   - Client payments

4. Reporting (30 min)
   - Key metrics
   - Denial analysis
   - Payer performance
```

#### Documentation
```
Create:
- [ ] User Guide (PDF + video)
- [ ] Quick Reference Cards
- [ ] Workflow Diagrams
- [ ] Troubleshooting Guide
- [ ] FAQ Document
```

### 6.3 Go-Live Plan

#### Pre-Go-Live Checklist
```
- [ ] Sandbox testing 100% complete
- [ ] Production credentials received
- [ ] IP whitelisting configured
- [ ] Staff training completed
- [ ] Parallel testing validated (2 weeks minimum)
- [ ] Rollback plan documented
- [ ] Support plan established
```

#### Go-Live Phases
```
Week 1: Soft Launch (20% of claims)
- Test production environment
- Monitor closely for issues
- Quick rollback if needed

Week 2-3: Scale Up (50% → 80%)
- Increase claim volume
- Continue parallel processing
- Optimize based on learnings

Week 4: Full Production (100%)
- All claims through integration
- Decommission manual process
- Ongoing monitoring
```

### Success Criteria
- ✅ 99.5% claim acceptance rate in production
- ✅ <1% payment posting errors
- ✅ Staff adoption >95%
- ✅ Zero production incidents
- ✅ Faster than manual baseline

---

<a name="technical-architecture"></a>
## 🏗️ Technical Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     MentalSpace EHR UI                      │
│  (React + TypeScript + Tailwind + Shadcn)                   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Application Layer (React Hooks)                │
│  - useEligibility  - useClaims  - useERAs  - usePayments   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│         Supabase Edge Functions (Secure Proxy)              │
│  - advancedmd-proxy  - authentication  - rate-limit         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼ (HTTPS + OAuth 2.0)
┌─────────────────────────────────────────────────────────────┐
│                    AdvancedMD API                           │
│  - Eligibility  - Claims  - ERA  - Patient Sync             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Waystar Clearinghouse                          │
│  - Claim Validation  - Payer Routing  - Status Updates     │
└─────────────────────────────────────────────────────────────┘
```

### Security Architecture

```typescript
Security Layers:
1. OAuth 2.0 Authentication (24hr token rotation)
2. API Key Encryption (Supabase Vault)
3. IP Whitelisting (AdvancedMD side)
4. Request Signing (HMAC)
5. Audit Logging (all API calls)
6. Rate Limit Enforcement
7. HTTPS/TLS 1.3 only
8. HIPAA-compliant data handling
```

### Data Flow

```
Eligibility Check Flow:
User → UI → Hook → Edge Function → AdvancedMD API
                    ↓
               Cache Result
                    ↓
          Store in Database
                    ↓
            Return to UI

Claim Submission Flow:
Charge Created → 837P Generation → Validation
                    ↓
          Submit to AdvancedMD
                    ↓
           Waystar Processing
                    ↓
       Status Updates via Polling
                    ↓
          UI Notification

ERA Processing Flow:
Scheduled Job → Retrieve ERAs → Parse 835
                    ↓
          Match to Claims
                    ↓
       Auto-Post Payments
                    ↓
        Update Balances
```

---

<a name="database-schema"></a>
## 💾 Complete Database Schema

### Entity Relationship Diagram

```
┌────────────────┐     ┌─────────────────┐     ┌──────────────┐
│    Clients     │────→│ Client Insurance│────→│  Insurance   │
│                │     │                 │     │  Companies   │
└────────┬───────┘     └────────┬────────┘     └──────────────┘
         │                      │
         │                      ▼
         │             ┌─────────────────┐
         │             │  Eligibility    │
         │             │     Checks      │
         │             └─────────────────┘
         │
         ▼
┌────────────────┐     ┌─────────────────┐     ┌──────────────┐
│  Appointments  │────→│    Charges      │────→│   Claims     │
│                │     │                 │     │    (837P)    │
└────────────────┘     └─────────────────┘     └──────┬───────┘
                                                       │
                       ┌─────────────────┐            │
                       │ Claim Service   │←───────────┘
                       │     Lines       │
                       └─────────────────┘
                                ▲
                                │
                       ┌────────┴────────┐
                       │                 │
              ┌────────┴──────┐  ┌──────┴────────┐
              │  ERA Claim    │  │   Payment     │
              │   Payments    │  │   Postings    │
              └───────────────┘  └───────────────┘
                      ▲
                      │
              ┌───────┴──────┐
              │     ERAs     │
              │    (835)     │
              └──────────────┘
```

### Table Summary

```sql
Core Tables (15):
1. advancedmd_config - API credentials
2. advancedmd_tokens - OAuth tokens
3. advancedmd_api_logs - Audit trail
4. eligibility_checks - Verification results
5. insurance_claims - 837P claims
6. claim_service_lines - Service details
7. claim_diagnoses - ICD-10 codes
8. claim_attachments - Clinical docs
9. claim_status_history - Status tracking
10. eras - 835 remittance files
11. era_claim_payments - Payment details
12. era_service_line_payments - Line-level payments
13. adjustment_reason_codes - CARC/RARC lookup
14. payment_postings - Payment journal
15. advancedmd_rate_limits - API quota tracking
```

---

<a name="security-compliance"></a>
## 🔒 Security & Compliance

### HIPAA Compliance

```
PHI Protection:
- ✅ Encryption at rest (Supabase Vault)
- ✅ Encryption in transit (TLS 1.3)
- ✅ Access logging (audit trail)
- ✅ Role-based access control
- ✅ Session management
- ✅ Data retention policies
- ✅ BAA with AdvancedMD
```

### Audit Requirements

```typescript
All API calls logged with:
- Timestamp
- User ID
- Endpoint
- Request/Response
- IP Address
- Success/Failure
- Duration

Retention: 7 years (HIPAA requirement)
```

### Disaster Recovery

```
Backup Strategy:
- Supabase automatic backups (daily)
- Point-in-time recovery (30 days)
- AdvancedMD data redundancy
- Claim file archives (indefinite)

Recovery Time Objective (RTO): 4 hours
Recovery Point Objective (RPO): 24 hours
```

---

<a name="success-metrics"></a>
## 📊 Success Metrics & KPIs

### Phase 1-2 Success Metrics
```
API Performance:
- Authentication success: 100%
- Token rotation: 100% automated
- API response time: <500ms
- Eligibility check time: <30 seconds
- Eligibility success rate: >99%
```

### Phase 3-4 Success Metrics
```
Claim Processing:
- Claim acceptance rate: >99.5% (AdvancedMD guarantee)
- Claims rejected: <0.5%
- Claim submission time: <1 hour to clearinghouse
- Payment posting accuracy: >99%
- ERA retrieval: 100%
```

### Phase 5-6 Success Metrics
```
Business Impact:
- Days in A/R: <30 days (target)
- Collection rate: >95%
- Denial rate: <5%
- Staff efficiency: 50% reduction in manual work
- Revenue cycle time: 15-20 days (from service to payment)
```

### User Adoption Metrics
```
Training & Adoption:
- Staff training completion: 100%
- User satisfaction: >4.5/5
- Support tickets: <10/week after go-live
- Feature utilization: >80%
```

---

## 🎯 Next Steps

### Immediate Actions (This Week)
1. **Obtain AdvancedMD Credentials**
   - Request sandbox access (2-week provision time)
   - Set up development accounts
   - Configure IP whitelisting

2. **Review & Approve Roadmap**
   - Stakeholder sign-off
   - Budget approval
   - Resource allocation

3. **Start Phase 1**
   - Create API client infrastructure
   - Set up database migrations
   - Begin authentication implementation

### Questions to Answer
- [ ] When can sandbox credentials be obtained?
- [ ] What is the target go-live date?
- [ ] Who will be the billing system administrator?
- [ ] Is there dedicated dev time allocated?
- [ ] What is the testing timeline preference?

---

## 📞 Support & Resources

**AdvancedMD Support:**
- Interops Team (via cases)
- API Documentation (PDF + F1 help files)
- Postman Collections
- Developer Portal (coming soon)

**Internal Resources:**
- Project Lead: [TBD]
- Technical Lead: [TBD]
- Billing Manager: [TBD]
- QA Lead: [TBD]

---

**Document Version:** 1.0
**Last Updated:** 2025-01-10
**Next Review:** At each phase completion

---

*This roadmap is a living document and will be updated as the project progresses.*
