# Data Contract: Charge Entries Table

## Metadata
- **Contract Name**: Charge Entries
- **Contract Version**: 1.0.0
- **Effective Date**: 2025-01-09
- **Owner**: Billing & Revenue Cycle Team
- **Status**: Active
- **Last Updated**: 2025-01-09
- **Updated By**: System Administrator

## Purpose
### Business Context
The charge_entries table is the core financial record linking clinical services to billing and revenue. It tracks all billable services, their status through the revenue cycle, and financial outcomes.

### Use Cases
1. Service billing and claim submission
2. Revenue cycle management
3. Financial reporting and analytics
4. Denial management and appeals
5. Accounts receivable tracking

### Stakeholders
- **Data Producer**: Billing Staff, Clinicians
- **Data Consumer**: Billing Staff, Finance, Administrators
- **Data Steward**: Billing Manager

## Schema Definition
### Table Name
`public.charge_entries`

### Key Columns
| Column Name | Data Type | Nullable | Description | Business Rules |
|------------|-----------|----------|-------------|----------------|
| id | uuid | No | Primary key | Generated automatically |
| client_id | uuid | No | Client reference | Must exist in clients table |
| provider_id | uuid | No | Rendering provider | Must exist in profiles table |
| service_date | date | No | Date of service | Must be ≤ current date |
| cpt_code | text | No | CPT service code | Must be valid CPT code |
| charge_amount | numeric | No | Charged amount | Must be > 0 |
| charge_status | text | No | Billing status | Valid status required |
| claim_id | uuid | Yes | Associated claim | Links to insurance claim |
| appointment_id | uuid | Yes | Related appointment | Should link to appointment |
| note_id | uuid | Yes | Clinical note | Should link to clinical note |

## Data Quality Rules
### Completeness
- **Required Fields**: id, client_id, provider_id, service_date, cpt_code, charge_amount, charge_status, units
- **Conditional Requirements**:
  - If charge_status = 'Billed', claim_id should not be null
  - If charge_status = 'Denied', denial_reason should not be null
  - If write_off_amount > 0, write_off_reason must not be null
  - Completed appointments should have charge entry within 7 days

### Validity
- **Amount Constraints**:
  - charge_amount > 0
  - units > 0
  - payment_amount ≤ charge_amount
  - adjustment_amount should be reasonable (< charge_amount)
  - client_responsibility ≥ 0
- **Date Logic**:
  - service_date ≤ CURRENT_DATE
  - service_date should be within last 2 years (for new entries)
  - billed_date ≥ service_date (if not null)
- **Status Values**: Must be one of [Unbilled, Pending, Billed, Paid, Partially Paid, Denied, Write-off, Appealed]

### Uniqueness
- **Logical Uniqueness**: Warn if duplicate charges for same client + provider + service_date + cpt_code + appointment_id

### Consistency
- **Foreign Key Integrity**:
  - client_id must exist in clients table
  - provider_id must exist in profiles table
  - appointment_id must exist in appointments table (if not null)
  - note_id must exist in clinical_notes table (if not null)
  - claim_id must exist in insurance_claims table (if not null)
- **Business Logic**:
  - Billed charges must have corresponding appointment/note
  - Payment amount should not exceed charge amount
  - Charge status should align with claim status

## Data Quality Checks
### Automated Validations
```sql
-- Check: No NULL values in required fields
SELECT COUNT(*) as violations
FROM charge_entries
WHERE client_id IS NULL 
   OR provider_id IS NULL
   OR service_date IS NULL
   OR cpt_code IS NULL
   OR charge_amount IS NULL
   OR charge_status IS NULL;

-- Check: Invalid charge amounts
SELECT COUNT(*) as violations
FROM charge_entries
WHERE charge_amount <= 0 OR units <= 0;

-- Check: Payment exceeds charge
SELECT COUNT(*) as violations
FROM charge_entries
WHERE payment_amount > charge_amount;

-- Check: Future service dates
SELECT COUNT(*) as violations
FROM charge_entries
WHERE service_date > CURRENT_DATE;

-- Check: Invalid status values
SELECT COUNT(*) as violations
FROM charge_entries
WHERE charge_status NOT IN ('Unbilled', 'Pending', 'Billed', 'Paid', 'Partially Paid', 'Denied', 'Write-off', 'Appealed');

-- Check: Billed without claim
SELECT COUNT(*) as violations
FROM charge_entries
WHERE charge_status = 'Billed'
  AND claim_id IS NULL;

-- Check: Denied without reason
SELECT COUNT(*) as violations
FROM charge_entries
WHERE charge_status = 'Denied'
  AND denial_reason IS NULL;

-- Check: Charges without clinical note
SELECT COUNT(*) as violations
FROM charge_entries
WHERE charge_status IN ('Billed', 'Paid', 'Partially Paid')
  AND note_id IS NULL;

-- Check: Unbilled aged charges (>30 days)
SELECT COUNT(*) as violations
FROM charge_entries
WHERE charge_status = 'Unbilled'
  AND service_date < CURRENT_DATE - INTERVAL '30 days';

-- Check: Orphaned foreign keys
SELECT COUNT(*) as violations
FROM charge_entries ce
LEFT JOIN clients c ON ce.client_id = c.id
LEFT JOIN profiles p ON ce.provider_id = p.id
WHERE c.id IS NULL OR p.id IS NULL;

-- Check: Write-off without reason
SELECT COUNT(*) as violations
FROM charge_entries
WHERE write_off_amount > 0
  AND write_off_reason IS NULL;
```

### Quality Thresholds
| Check | Threshold | Severity | Action |
|-------|-----------|----------|--------|
| Null required fields | 0% | Critical | Alert immediately |
| Invalid amounts | 0% | Critical | Alert immediately |
| Payment exceeds charge | 0% | Critical | Alert immediately |
| Future service dates | 0% | Critical | Alert immediately |
| Invalid status | 0% | Critical | Alert immediately |
| Billed without claim | 0% | High | Alert within 4 hours |
| Denied without reason | 0% | High | Alert within 4 hours |
| Charges without note | < 5% | Medium | Daily report |
| Aged unbilled (>30 days) | < 10% | High | Weekly report |
| Orphaned references | 0% | High | Alert within 1 hour |

## Access Control & Security
### Row-Level Security (RLS)
```sql
-- Billing staff can view and manage all charges
CREATE POLICY "Billing staff manage charges"
ON charge_entries FOR ALL
USING (
  has_role(auth.uid(), 'administrator')
  OR has_role(auth.uid(), 'billing_staff')
);

-- Providers can view charges for their services
CREATE POLICY "Providers view own charges"
ON charge_entries FOR SELECT
USING (
  provider_id = auth.uid()
  OR has_role(auth.uid(), 'administrator')
  OR has_role(auth.uid(), 'billing_staff')
);
```

### Authorized Roles
| Role | Select | Insert | Update | Delete | Notes |
|------|--------|--------|--------|--------|-------|
| administrator | Yes | Yes | Yes | No | Full management |
| billing_staff | Yes | Yes | Yes | No | Revenue cycle duties |
| provider | Limited | No | No | No | View own charges only |
| front_desk | Limited | No | No | No | View for scheduling |

### PHI/PII Classification
- **Contains PHI**: Yes (linked to client services and diagnoses)
- **Contains PII**: No (but linked to clients)
- **Encryption Required**: Yes
- **Audit Required**: Yes (financial compliance)

### Compliance Requirements
- HIPAA: Audit trail for all access
- Insurance Regulations: Accurate coding and billing
- Tax: Maintain records for 7 years
- CMS: Follow Medicare/Medicaid billing rules

## Service Level Agreements (SLAs)
### Data Quality
- **Accuracy**: 99.5% (correct CPT codes and amounts)
- **Completeness**: 100% for required fields
- **Timeliness**: 95% billed within 30 days of service

### Support
- **Critical Issues**: Response < 1 hour, resolution < 4 hours
- **High Issues**: Response < 4 hours, resolution < 24 hours

## Monitoring & Alerting
### Key Metrics
| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| Days in AR | < 30 days | 30-45 days | > 45 days |
| Unbilled charges | < 5% | 5-10% | > 10% |
| Denial rate | < 5% | 5-10% | > 10% |
| Collection rate | > 95% | 90-95% | < 90% |

### Alert Configuration
| Alert | Condition | Recipients | Escalation |
|-------|-----------|-----------|------------|
| Invalid charge created | Validation failure | Billing Manager | Immediate |
| Aged unbilled (>30 days) | Count > threshold | Billing Staff | Daily |
| High denial rate | >10% daily | Revenue Cycle Manager | Immediate |
| Payment exceeds charge | Any occurrence | Billing Manager | Immediate |

## Support Contacts
- **Primary Contact**: Billing Manager
- **Escalation Contact**: Revenue Cycle Director
- **Technical Support**: System Administrator
- **Coding Questions**: Medical Coder

## Revision History
| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-01-09 | System | Initial contract for charge_entries table |
