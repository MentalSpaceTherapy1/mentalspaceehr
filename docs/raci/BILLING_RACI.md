# RACI Matrix: Billing Module

## Purpose
This RACI matrix defines roles and responsibilities for billing, claims, payments, and revenue cycle management, ensuring proper accountability and HIPAA compliance.

## Legend
- **R** (Responsible): Person who performs the work
- **A** (Accountable): Person ultimately answerable for the task
- **C** (Consulted): People whose input is sought
- **I** (Informed): People who are kept up-to-date

---

## 1. Charge Entry & Documentation

### Create Service Charge

| Task | Billing Staff | Therapist | Administrator | Front Desk | Client |
|------|---------------|-----------|---------------|------------|--------|
| Select CPT code | R | C | A | - | - |
| Enter service date | R | C | A | - | - |
| Enter units/duration | R | C | A | - | - |
| Link to diagnosis codes | R | C | A | - | - |
| Set fee amount | R | - | A | - | - |
| Verify insurance coverage | R | - | A | I | I |

**Code Enforcement:**
- File: `src/components/billing/ChargeEntryDialog.tsx`
- Table: `billing_charges`
- Required: cpt_code, service_date, units, fee_amount, diagnosis_codes
- Validation: CPT-diagnosis match, medical necessity

### Link Charge to Clinical Note

| Task | Billing Staff | Therapist | Administrator | Front Desk | Client |
|------|---------------|-----------|---------------|------------|--------|
| Verify note is locked | R | - | A | - | - |
| Match charge to note | R | C | A | - | - |
| Validate documentation | R | C | A | - | - |
| Check billing compliance | R | - | A | - | - |

**Code Enforcement:**
- Field: `note_id` (foreign key to clinical_notes)
- Rule: Note must be locked (`is_locked = true`)
- Validation: Charge cannot be created without locked note
- Audit: All linkages logged

---

## 2. Insurance & Eligibility

### Verify Insurance Eligibility

| Task | Billing Staff | Therapist | Administrator | Front Desk | Client |
|------|---------------|-----------|---------------|------------|--------|
| Collect insurance information | C | - | A | R | C |
| Verify active coverage | R | - | A | I | I |
| Check benefits | R | - | A | I | I |
| Document eligibility status | R | - | A | I | I |
| Update insurance records | R | - | A | I | I |

**Code Enforcement:**
- Table: `client_insurance`
- Fields: member_id, group_number, payer_id
- Edge Function: Future - 270/271 eligibility verification
- Status tracking: Active, Inactive, Pending Verification

### Manage Insurance Information

| Task | Billing Staff | Therapist | Administrator | Front Desk | Client |
|------|---------------|-----------|---------------|------------|--------|
| Enter insurance details | R | - | A | C | C |
| Verify insurance card | R | - | A | C | - |
| Track authorization | R | - | A | I | I |
| Update policy changes | R | - | A | I | I |
| Manage secondary insurance | R | - | A | I | I |

**Code Enforcement:**
- Component: `src/components/clients/insurance/ClientInsuranceDialog.tsx`
- Validation: Required fields per payer
- Attachment: Insurance card images
- History: Policy change tracking

---

## 3. Claims Submission

### Generate Insurance Claim (837)

| Task | Billing Staff | Therapist | Administrator | Front Desk | Client |
|------|---------------|-----------|---------------|------------|--------|
| Select charges for billing | R | - | A | - | - |
| Verify claim completeness | R | C | A | - | - |
| Generate X12 837 file | R | - | A | - | - |
| Review claim before submit | R | - | A | - | - |
| Submit to clearinghouse | R | - | A | - | I |

**Code Enforcement:**
- File: `src/lib/x12/claim837Generator.ts`
- Format: X12 837P (Professional)
- Validation: Claim scrubbing before submission
- Integration: Clearinghouse API
- Spec: `docs/integrations/CLEARINGHOUSE_INTEGRATION_SPEC.md`

### Track Claim Status

| Task | Billing Staff | Therapist | Administrator | Front Desk | Client |
|------|---------------|-----------|---------------|------------|--------|
| Monitor claim submission | R | - | A | - | I |
| Check clearinghouse status | R | - | A | - | - |
| Review payer acknowledgment | R | - | A | - | - |
| Track claim to payment | R | - | A | - | I |
| Handle claim rejections | R | C | A | - | I |

**Code Enforcement:**
- Table: `billing_claims`
- Statuses: Draft, Submitted, Accepted, Rejected, Paid, Denied
- Edge Function: Future - 276/277 claim status inquiry
- Notifications: Auto-alerts for status changes

---

## 4. Payment Processing

### Post Insurance Payment (ERA/835)

| Task | Billing Staff | Therapist | Administrator | Front Desk | Client |
|------|---------------|-----------|---------------|------------|--------|
| Receive ERA/835 file | R | - | A | - | - |
| Parse remittance data | R | - | A | - | - |
| Post payment to accounts | R | - | A | - | I |
| Apply adjustments | R | - | A | - | I |
| Record denial reasons | R | - | A | - | I |
| Update claim status | R | - | A | - | I |

**Code Enforcement:**
- File: Future - X12 835 parser
- Component: `src/components/billing/PaymentPostingDialog.tsx`
- Table: `billing_payments`
- Automation: Auto-posting of ERA payments

### Process Patient Payment

| Task | Billing Staff | Therapist | Administrator | Front Desk | Client |
|------|---------------|-----------|---------------|------------|--------|
| Collect payment information | R | - | A | C | C |
| Process credit card payment | R | - | A | C | - |
| Record check payment | R | - | A | C | - |
| Issue receipt | R | - | A | C | I |
| Apply to patient balance | R | - | A | - | I |
| Track payment method | R | - | A | C | - |

**Code Enforcement:**
- Integration: Stripe/Square payment processor
- Component: Payment collection dialog
- Receipts: Auto-generated PDF receipts
- Compliance: PCI-DSS for card data
- Spec: `docs/integrations/PAYMENT_INTEGRATION_SPEC.md`

---

## 5. Patient Statements & Collections

### Generate Patient Statement

| Task | Billing Staff | Therapist | Administrator | Front Desk | Client |
|------|---------------|-----------|---------------|------------|--------|
| Calculate patient balance | R | - | A | - | - |
| Apply insurance payments | R | - | A | - | - |
| Generate statement | R | - | A | - | I |
| Send to patient | R | - | A | - | I |
| Track delivery | R | - | A | I | - |

**Code Enforcement:**
- Table: `client_statements`
- Format: PDF statement generation
- Delivery: Email or postal mail
- Frequency: Monthly or on-demand
- Component: Statement generator

### Manage Collections

| Task | Billing Staff | Therapist | Administrator | Front Desk | Client |
|------|---------------|-----------|---------------|------------|--------|
| Identify overdue accounts | R | - | A | - | - |
| Send payment reminders | R | - | A | I | I |
| Contact patients | R | - | A | C | C |
| Negotiate payment plans | R | C | A | - | C |
| Track collection efforts | R | - | A | - | I |
| Write off uncollectable | C | - | R | - | I |

**Code Enforcement:**
- Aging buckets: 30, 60, 90, 120+ days
- Payment plans: Installment tracking
- Write-offs: Approval workflow required
- Automation: Auto-reminders

---

## 6. Fee Schedules & Contracts

### Manage Fee Schedules

| Task | Billing Staff | Therapist | Administrator | Front Desk | Client |
|------|---------------|-----------|---------------|------------|--------|
| Create fee schedule | C | C | R | - | - |
| Set standard rates | C | C | R | - | - |
| Define payer contracts | R | C | A | - | - |
| Update fee changes | R | - | A | I | - |
| Track effective dates | R | - | A | - | - |

**Code Enforcement:**
- Table: `fee_schedules`
- Hierarchy: Standard → Payer-specific → Client-specific
- Effective dates: Date-based fee changes
- Integration: Auto-apply to charges

### Manage Payer Contracts

| Task | Billing Staff | Therapist | Administrator | Front Desk | Client |
|------|---------------|-----------|---------------|------------|--------|
| Negotiate contract terms | C | C | R | - | - |
| Document fee agreements | R | - | A | - | - |
| Track contract periods | R | - | A | - | - |
| Monitor reimbursement rates | R | - | A | - | - |
| Renegotiate contracts | C | C | R | - | - |

**Code Enforcement:**
- Table: `payer_contracts`
- Fields: Contract number, effective dates, rate tables
- Alerts: Contract expiration warnings
- Reports: Reimbursement rate analysis

---

## 7. Billing Compliance & Auditing

### Verify Billing Compliance

| Task | Billing Staff | Therapist | Administrator | Front Desk | Client |
|------|---------------|-----------|---------------|------------|--------|
| Check medical necessity | R | C | A | - | - |
| Validate CPT-diagnosis match | R | C | A | - | - |
| Verify documentation | R | C | A | - | - |
| Check modifier usage | R | C | A | - | - |
| Run compliance reports | R | - | A | - | - |

**Code Enforcement:**
- Edge Function: `check-compliance`
- Validations:
  - CPT requires supporting diagnosis
  - Time-based codes have duration
  - Modifiers are appropriate
  - Place of service is correct
- Reports: Compliance dashboard

### Audit Billing Activity

| Task | Billing Staff | Therapist | Administrator | Front Desk | Client |
|------|---------------|-----------|---------------|------------|--------|
| Log all billing actions | Auto | Auto | Auto | Auto | - |
| Review audit logs | C | - | R | - | - |
| Investigate anomalies | R | C | A | - | - |
| Generate audit reports | R | - | A | - | - |
| Report violations | R | - | A | - | - |

**Code Enforcement:**
- Table: `audit_logs`
- Tracked actions: Charge entry, payment posting, adjustments, write-offs
- Function: `logAdminAction()` for billing actions
- Reports: Billing audit trail

---

## 8. Adjustments & Write-offs

### Process Billing Adjustment

| Task | Billing Staff | Therapist | Administrator | Front Desk | Client |
|------|---------------|-----------|---------------|------------|--------|
| Identify adjustment need | R | C | A | - | - |
| Document adjustment reason | R | - | A | - | - |
| Calculate adjustment amount | R | - | A | - | - |
| Obtain approval (if >$X) | C | - | R | - | - |
| Post adjustment | R | - | A | - | I |
| Update account balance | R | - | A | - | I |

**Code Enforcement:**
- Table: `billing_adjustments`
- Types: Contractual, Courtesy, Administrative, Insurance
- Approval: Required for adjustments > $500
- Audit: All adjustments logged with reason

### Write Off Bad Debt

| Task | Billing Staff | Therapist | Administrator | Front Desk | Client |
|------|---------------|-----------|---------------|------------|--------|
| Determine uncollectable | R | - | A | - | - |
| Document collection efforts | R | - | A | - | - |
| Obtain write-off approval | C | - | R | - | - |
| Post write-off | R | - | A | - | I |
| Report to credit agency | C | - | R | - | I |

**Code Enforcement:**
- Field: `adjustment_type = 'write_off'`
- Approval workflow: Required for all write-offs
- Criteria: 120+ days overdue, collection efforts exhausted
- Compliance: IRS reporting requirements

---

## 9. Reporting & Analytics

### Generate Financial Reports

| Task | Billing Staff | Therapist | Administrator | Front Desk | Client |
|------|---------------|-----------|---------------|------------|--------|
| Run revenue reports | R | - | A | - | - |
| Analyze payer mix | R | - | A | - | - |
| Track collections metrics | R | - | A | - | - |
| Calculate aging | R | - | A | - | - |
| Export financial data | R | - | A | - | - |

**Code Enforcement:**
- Reports:
  - Revenue by provider
  - Revenue by CPT code
  - Payer analysis
  - Aging report
  - Collection rate
- Export: CSV, PDF formats
- Scheduling: Auto-generated monthly reports

### Monitor Key Performance Indicators (KPIs)

| Task | Billing Staff | Therapist | Administrator | Front Desk | Client |
|------|---------------|-----------|---------------|------------|--------|
| Track days in A/R | R | - | A | - | - |
| Monitor collection rate | R | - | A | - | - |
| Calculate denial rate | R | - | A | - | - |
| Track claim turnaround | R | - | A | - | - |
| Report KPI trends | R | - | A | I | - |

**Code Enforcement:**
- Dashboard: Billing KPI dashboard
- Metrics:
  - Days in A/R (target: < 30)
  - Collection rate (target: > 95%)
  - Denial rate (target: < 5%)
  - First-pass claim rate (target: > 90%)
- Alerts: Automatic alerts if KPIs fall below target

---

## 10. Special Billing Scenarios

### Process Incident-to Billing

| Task | Billing Staff | Therapist | Administrator | Front Desk | Client |
|------|---------------|-----------|---------------|------------|--------|
| Verify qualifying visit | C | C | A | - | - |
| Check 30-day window | R | - | A | - | - |
| Link subsequent visits | R | C | A | - | - |
| Bill under MD/DO NPI | R | - | A | - | - |
| Generate compliance report | R | - | A | - | - |

**Code Enforcement:**
- Edge Function: `verify-incident-to-compliance`
- Rules: Initial visit by MD/DO, subsequent within 30 days by trainee
- Component: `src/components/billing/IncidentToBillingReport.tsx`
- Audit: Incident-to compliance tracking

### Handle Refunds

| Task | Billing Staff | Therapist | Administrator | Front Desk | Client |
|------|---------------|-----------|---------------|------------|--------|
| Identify refund need | R | C | A | C | C |
| Calculate refund amount | R | - | A | - | - |
| Obtain approval | C | - | R | - | - |
| Process refund | R | - | A | - | I |
| Document refund reason | R | - | A | - | - |
| Update account balance | R | - | A | - | I |

**Code Enforcement:**
- Types: Overpayment, Duplicate payment, Service not provided
- Approval: Required for all refunds
- Processing: Within 30 days of request
- Audit: All refunds logged

---

## 11. Denial Management

### Process Claim Denial

| Task | Billing Staff | Therapist | Administrator | Front Desk | Client |
|------|---------------|-----------|---------------|------------|--------|
| Review denial reason | R | C | A | - | - |
| Determine if appealable | R | C | A | - | - |
| Gather supporting documentation | R | C | A | - | - |
| Submit appeal | R | - | A | - | I |
| Track appeal status | R | - | A | - | I |
| Re-bill patient if denied | R | - | A | - | I |

**Code Enforcement:**
- Table: `claim_denials`
- Denial codes: CMS denial code mapping
- Appeal tracking: Status workflow
- Deadline tracking: Auto-alerts for appeal deadlines
- Patterns: Denial trend analysis

### Analyze Denial Patterns

| Task | Billing Staff | Therapist | Administrator | Front Desk | Client |
|------|---------------|-----------|---------------|------------|--------|
| Track denial reasons | R | - | A | - | - |
| Identify trends | R | C | A | - | - |
| Recommend process changes | R | C | A | - | - |
| Train staff on prevention | C | C | R | I | - |
| Monitor improvement | R | - | A | - | - |

**Code Enforcement:**
- Reports: Denial analysis by reason, payer, provider
- Trends: Month-over-month denial rate tracking
- Action plans: Systematic denial reduction

---

## 12. Client Portal Billing

### Enable Client Self-Service

| Task | Billing Staff | Therapist | Administrator | Front Desk | Client |
|------|---------------|-----------|---------------|------------|--------|
| Configure portal access | R | - | A | C | - |
| Enable online payments | R | - | A | - | I |
| Provide statement access | R | - | A | - | I |
| Support payment plans | R | - | A | - | C |
| Answer billing questions | R | C | A | C | C |

**Code Enforcement:**
- Portal: Client can view statements, make payments, request plans
- Integration: Stripe payment integration
- Security: PHI protection, secure payment processing
- Component: `src/pages/portal/PortalBilling.tsx`

---

## Escalation Path

1. **Billing Discrepancy** → Billing Staff → Billing Manager → Administrator
2. **Claim Denial** → Billing Staff → Billing Manager → Clinical Director
3. **Payment Dispute** → Billing Staff → Administrator → Legal (if needed)
4. **Compliance Issue** → Billing Staff → Compliance Officer → Administrator
5. **Technical Issue** → Billing Staff → System Administrator → IT Support

---

## Key Contacts

| Role | Primary Contact | Backup Contact |
|------|----------------|----------------|
| Billing Authority | Billing Manager | Administrator |
| Claims Submission | Senior Billing Specialist | Billing Manager |
| Payment Processing | Billing Staff Lead | Billing Manager |
| Compliance | Compliance Officer | Administrator |
| Technical Issues | System Administrator | IT Support |

---

## Revision History

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2025-01-09 | 1.0 | Initial RACI matrix for billing | System |

---

## Implementation Notes

### Database Tables Referenced
- `billing_charges` - Service charges
- `billing_claims` - Insurance claims
- `billing_payments` - Payment records
- `billing_adjustments` - Adjustments and write-offs
- `client_statements` - Patient statements
- `client_insurance` - Insurance information
- `fee_schedules` - Fee/rate schedules
- `payer_contracts` - Contract terms
- `claim_denials` - Denial tracking

### Key Functions
- `generate_837_claim()` - X12 claim generation
- `parse_835_era()` - ERA payment parsing
- `calculate_patient_balance()` - Balance calculation
- `check_compliance()` - Billing compliance validation

### Edge Functions
- `verify-incident-to-compliance` - Incident-to validation
- `check-compliance` - General compliance checking

### Integration Points
- Clearinghouse: X12 837/835 transactions
- Payment Processor: Stripe/Square API
- Eligibility: 270/271 verification (future)
- Claim Status: 276/277 inquiry (future)

---

## Quick Reference: Who Can Do What?

| Action | Billing | Therapist | Admin | Front Desk | Client |
|--------|---------|-----------|-------|------------|--------|
| Enter charges | ✅ | ❌ | ✅ | ❌ | ❌ |
| Submit claims | ✅ | ❌ | ✅ | ❌ | ❌ |
| Post payments | ✅ | ❌ | ✅ | ✅ (limited) | ❌ |
| Generate statements | ✅ | ❌ | ✅ | ❌ | ❌ |
| Process refunds | ✅ (with approval) | ❌ | ✅ | ❌ | ❌ |
| Write-off debt | ❌ | ❌ | ✅ | ❌ | ❌ |
| View financials | ✅ | ❌ (own only) | ✅ | ❌ | ✅ (own only) |
| Make payment | ✅ | ❌ | ✅ | ✅ | ✅ |
| Appeal denial | ✅ | ✅ (support) | ✅ | ❌ | ❌ |
| Run reports | ✅ | ❌ | ✅ | ❌ | ❌ |
