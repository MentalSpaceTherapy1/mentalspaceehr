# Data Contract: Clients Table

## Metadata
- **Contract Name**: Clients
- **Contract Version**: 1.0.0
- **Effective Date**: 2025-01-09
- **Owner**: Clinical Operations Team
- **Status**: Active
- **Last Updated**: 2025-01-09
- **Updated By**: System Administrator

## Purpose
### Business Context
The clients table is the central repository for all client demographic, contact, and clinical assignment information. It serves as the foundation for client care coordination, billing, and compliance tracking.

### Use Cases
1. Client registration and onboarding
2. Clinical assignment and care team coordination
3. Billing and insurance verification
4. Compliance reporting and auditing
5. Portal access management

### Stakeholders
- **Data Producer**: Front Desk, Administrators
- **Data Consumer**: Clinicians, Billing Staff, Compliance Team
- **Data Steward**: Clinical Operations Manager

## Schema Definition
### Table Name
`public.clients`

### Key Columns
| Column Name | Data Type | Nullable | Description | Business Rules |
|------------|-----------|----------|-------------|----------------|
| id | uuid | No | Primary key | Generated automatically |
| medical_record_number | text | No | Unique MRN | Format: MH{YEAR}{6-digit-random} |
| first_name | text | No | Client first name | Required for registration |
| last_name | text | No | Client last name | Required for registration |
| date_of_birth | date | No | Client DOB | Must be in the past |
| primary_therapist_id | uuid | Yes | Assigned therapist | Must reference valid profiles.id |
| status | text | No | Client status | [Active, Inactive, Discharged, On Hold] |
| portal_user_id | uuid | Yes | Portal account link | Unique, references auth.users |

## Data Quality Rules
### Completeness
- **Required Fields**: id, medical_record_number, first_name, last_name, date_of_birth, status
- **Conditional Requirements**: 
  - If portal_enabled = true, portal_user_id must not be null
  - If status = 'Active', primary_therapist_id should not be null

### Validity
- **Date Constraints**: date_of_birth must be < current_date
- **Email Format**: email must be valid email format (if provided)
- **Phone Format**: phone numbers should follow standard format
- **Status Values**: Must be one of [Active, Inactive, Discharged, On Hold]

### Uniqueness
- **Unique Constraints**: 
  - medical_record_number (unique)
  - portal_user_id (unique, if not null)
  - Composite: first_name + last_name + date_of_birth (warn if duplicate)

### Consistency
- **Foreign Key Integrity**: 
  - primary_therapist_id must exist in profiles table
  - psychiatrist_id must exist in profiles table (if not null)
  - case_manager_id must exist in profiles table (if not null)
- **Portal Assignment**: portal_user_id must reference valid auth user

## Data Quality Checks
### Automated Validations
```sql
-- Check: No NULL values in required fields
SELECT COUNT(*) as violations
FROM clients
WHERE first_name IS NULL 
   OR last_name IS NULL 
   OR date_of_birth IS NULL
   OR medical_record_number IS NULL;

-- Check: Valid status values
SELECT COUNT(*) as violations
FROM clients
WHERE status NOT IN ('Active', 'Inactive', 'Discharged', 'On Hold');

-- Check: Active clients have assigned therapist
SELECT COUNT(*) as violations
FROM clients
WHERE status = 'Active' 
  AND primary_therapist_id IS NULL;

-- Check: Portal users have valid account
SELECT COUNT(*) as violations
FROM clients c
LEFT JOIN auth.users u ON c.portal_user_id = u.id
WHERE c.portal_user_id IS NOT NULL 
  AND u.id IS NULL;

-- Check: Duplicate MRNs
SELECT medical_record_number, COUNT(*) as count
FROM clients
GROUP BY medical_record_number
HAVING COUNT(*) > 1;

-- Check: Future dates of birth
SELECT COUNT(*) as violations
FROM clients
WHERE date_of_birth > CURRENT_DATE;
```

### Quality Thresholds
| Check | Threshold | Severity | Action |
|-------|-----------|----------|--------|
| Null required fields | 0% | Critical | Alert immediately |
| Invalid status | 0% | Critical | Alert immediately |
| Active without therapist | < 5% | High | Daily report |
| Orphaned portal users | 0% | High | Alert within 1 hour |
| Duplicate MRNs | 0 | Critical | Alert immediately |
| Future DOB | 0 | Critical | Alert immediately |

## Access Control & Security
### Row-Level Security (RLS)
```sql
-- Clinicians can view assigned clients
CREATE POLICY "Clinicians can view assigned clients"
ON clients FOR SELECT
USING (
  primary_therapist_id = auth.uid() 
  OR psychiatrist_id = auth.uid() 
  OR case_manager_id = auth.uid()
);

-- Administrators have full access
CREATE POLICY "Administrators have full access"
ON clients FOR ALL
USING (has_role(auth.uid(), 'administrator'));

-- Clients can view own record via portal
CREATE POLICY "Portal users can view own record"
ON clients FOR SELECT
USING (portal_user_id = auth.uid());
```

### Authorized Roles
| Role | Select | Insert | Update | Delete | Notes |
|------|--------|--------|--------|--------|-------|
| administrator | Yes | Yes | Yes | No | Full management |
| front_desk | Yes | Yes | Yes | No | Registration duties |
| therapist | Limited | No | Limited | No | Only assigned clients |
| billing_staff | Yes | No | Limited | No | Billing info only |

### PHI/PII Classification
- **Contains PHI**: Yes (name, DOB, contact info, diagnoses)
- **Contains PII**: Yes (name, DOB, SSN, contact info)
- **Encryption Required**: Yes (at rest and in transit)
- **Audit Required**: Yes (all access must be logged)

### Compliance Requirements
- HIPAA: Minimum necessary access, audit trail, encryption
- State Licensing: Maintain accurate clinical assignments
- Insurance: Accurate demographic for billing

## Service Level Agreements (SLAs)
### Data Quality
- **Accuracy**: 99.9% (all required fields complete and valid)
- **Completeness**: 100% for active clients
- **Timeliness**: Updated within 24 hours of changes

### Support
- **Critical Issues**: Response within 1 hour, resolution within 4 hours
- **High Issues**: Response within 4 hours, resolution within 24 hours
- **Medium Issues**: Response within 24 hours, resolution within 3 days

## Monitoring & Alerting
### Key Metrics
| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| Total active clients | [Practice-specific] | ±10% monthly | ±25% monthly |
| Clients without therapist | 0 | 1-5 | > 5 |
| Duplicate MRNs | 0 | N/A | Any |
| Invalid status values | 0 | N/A | Any |

### Alert Configuration
| Alert | Condition | Recipients | Escalation |
|-------|-----------|-----------|------------|
| Duplicate MRN detected | Any duplicate | Clinical Ops | Immediate |
| Invalid data on insert | Quality check fails | Front Desk Manager | Immediate |
| Orphaned therapist assignment | FK violation | Clinical Director | 1 hour |

## Support Contacts
- **Primary Contact**: Clinical Operations Manager
- **Escalation Contact**: Clinical Director
- **Technical Support**: System Administrator

## Revision History
| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-01-09 | System | Initial contract for clients table |
