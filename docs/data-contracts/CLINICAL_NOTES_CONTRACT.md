# Data Contract: Clinical Notes Table

## Metadata
- **Contract Name**: Clinical Notes
- **Contract Version**: 1.0.0
- **Effective Date**: 2025-01-09
- **Owner**: Clinical Documentation Team
- **Status**: Active
- **Last Updated**: 2025-01-09
- **Updated By**: System Administrator

## Purpose
### Business Context
The clinical_notes table stores all clinical documentation including progress notes, intake assessments, treatment plans, and other clinical records. This is the most critical table for clinical, legal, and billing compliance.

### Use Cases
1. Clinical documentation and record-keeping
2. Supervision and cosignature workflow
3. Billing justification and audit support
4. Legal protection and risk management
5. Quality assurance and compliance monitoring

### Stakeholders
- **Data Producer**: Clinicians (Therapists, Psychiatrists, Associates)
- **Data Consumer**: Supervisors, Billing Staff, Compliance Team, Legal
- **Data Steward**: Clinical Director

## Schema Definition
### Table Name
`public.clinical_notes`

### Key Columns
| Column Name | Data Type | Nullable | Description | Business Rules |
|------------|-----------|----------|-------------|----------------|
| id | uuid | No | Primary key | Generated automatically |
| client_id | uuid | No | Client reference | Must exist in clients table |
| clinician_id | uuid | No | Authoring clinician | Must exist in profiles table |
| appointment_id | uuid | Yes | Related appointment | Should exist for session notes |
| note_type | text | No | Type of note | Valid note types required |
| session_date | date | No | Date of session | Must match appointment_date if linked |
| status | text | No | Note status | Controls editing and locking |
| requires_cosignature | boolean | No | Cosign flag | True for associate/trainee notes |
| cosigned_by | uuid | Yes | Supervisor signature | Required if requires_cosignature |
| cosigned_at | timestamp | Yes | Signature timestamp | Set when cosigned |
| locked_at | timestamp | Yes | Lock timestamp | Prevents further edits |

## Data Quality Rules
### Completeness
- **Required Fields**: id, client_id, clinician_id, note_type, session_date, status
- **Conditional Requirements**:
  - If requires_cosignature = true, cosigned_by must be set before status = 'Signed'
  - If appointment_id is not null, session_date should match appointment.appointment_date
  - If status = 'Signed', signed_by and signed_at must not be null
  - If locked_at is not null, status must be 'Signed' or 'Locked'

### Validity
- **Date Logic**:
  - session_date <= CURRENT_DATE (cannot document future sessions)
  - session_date should be within last 90 days for new notes (compliance)
  - created_at should be <= 7 days after session_date (timely documentation)
- **Status Values**: Must be one of [Draft, In Progress, Pending Review, Pending Signature, Signed, Locked, Archived, Amended]
- **Note Types**: Must be valid note type [Progress Note, Intake Assessment, Treatment Plan, etc.]

### Uniqueness
- **Logical Uniqueness**: Warn if multiple notes for same client + clinician + session_date with status != 'Deleted'

### Consistency
- **Foreign Key Integrity**:
  - client_id must exist in clients table
  - clinician_id must exist in profiles table
  - appointment_id must exist in appointments table (if not null)
  - cosigned_by must exist in profiles table (if not null)
- **Business Logic**:
  - Associates/trainees must have supervisor assigned
  - Cosignature must be from assigned supervisor
  - Cannot edit notes in 'Signed' or 'Locked' status
  - Amendments must reference original note

## Data Quality Checks
### Automated Validations
```sql
-- Check: No NULL values in required fields
SELECT COUNT(*) as violations
FROM clinical_notes
WHERE client_id IS NULL 
   OR clinician_id IS NULL
   OR note_type IS NULL
   OR session_date IS NULL
   OR status IS NULL;

-- Check: Future session dates
SELECT COUNT(*) as violations
FROM clinical_notes
WHERE session_date > CURRENT_DATE;

-- Check: Invalid status values
SELECT COUNT(*) as violations
FROM clinical_notes
WHERE status NOT IN ('Draft', 'In Progress', 'Pending Review', 'Pending Signature', 'Signed', 'Locked', 'Archived', 'Amended', 'Deleted');

-- Check: Unsigned cosignature requirements
SELECT COUNT(*) as violations
FROM clinical_notes
WHERE requires_cosignature = true
  AND status = 'Signed'
  AND (cosigned_by IS NULL OR cosigned_at IS NULL);

-- Check: Late documentation (>7 days after session)
SELECT COUNT(*) as violations
FROM clinical_notes
WHERE status NOT IN ('Signed', 'Locked')
  AND session_date < CURRENT_DATE - INTERVAL '7 days'
  AND created_at > session_date + INTERVAL '7 days';

-- Check: Appointment date mismatch
SELECT COUNT(*) as violations
FROM clinical_notes cn
JOIN appointments a ON cn.appointment_id = a.id
WHERE cn.session_date != a.appointment_date;

-- Check: Associate notes without supervisor
SELECT COUNT(*) as violations
FROM clinical_notes cn
JOIN user_roles ur ON cn.clinician_id = ur.user_id
WHERE ur.role = 'associate_trainee'
  AND cn.requires_cosignature = false;

-- Check: Orphaned foreign keys
SELECT COUNT(*) as violations
FROM clinical_notes cn
LEFT JOIN clients c ON cn.client_id = c.id
LEFT JOIN profiles p ON cn.clinician_id = p.id
WHERE c.id IS NULL OR p.id IS NULL;

-- Check: Locked notes with modifications
SELECT COUNT(*) as violations
FROM clinical_notes
WHERE locked_at IS NOT NULL
  AND updated_at > locked_at;
```

### Quality Thresholds
| Check | Threshold | Severity | Action |
|-------|-----------|----------|--------|
| Null required fields | 0% | Critical | Alert immediately |
| Future session dates | 0% | Critical | Alert immediately |
| Invalid status | 0% | Critical | Alert immediately |
| Unsigned cosignatures | 0% for Signed notes | Critical | Alert immediately |
| Late documentation (>7 days) | < 10% | High | Daily compliance report |
| Appointment mismatches | 0% | High | Alert within 1 hour |
| Associate without supervisor | 0% | Critical | Alert immediately |
| Orphaned references | 0% | High | Alert within 1 hour |
| Modified locked notes | 0% | Critical | Alert immediately |

## Access Control & Security
### Row-Level Security (RLS)
```sql
-- Clinicians can view notes they authored or for their clients
CREATE POLICY "Clinicians can view relevant notes"
ON clinical_notes FOR SELECT
USING (
  clinician_id = auth.uid()
  OR client_id IN (
    SELECT id FROM clients 
    WHERE primary_therapist_id = auth.uid()
       OR psychiatrist_id = auth.uid()
       OR case_manager_id = auth.uid()
  )
  OR has_role(auth.uid(), 'administrator')
  OR has_role(auth.uid(), 'supervisor')
);

-- Clinicians can create notes
CREATE POLICY "Clinicians can create notes"
ON clinical_notes FOR INSERT
WITH CHECK (
  clinician_id = auth.uid()
  AND (
    has_role(auth.uid(), 'therapist')
    OR has_role(auth.uid(), 'psychiatrist')
    OR has_role(auth.uid(), 'associate_trainee')
    OR has_role(auth.uid(), 'administrator')
  )
);

-- Can only edit own unlocked notes
CREATE POLICY "Edit own unlocked notes"
ON clinical_notes FOR UPDATE
USING (
  clinician_id = auth.uid()
  AND locked_at IS NULL
  AND status NOT IN ('Signed', 'Locked')
);
```

### Authorized Roles
| Role | Select | Insert | Update | Delete | Notes |
|------|--------|--------|--------|--------|-------|
| administrator | Yes | Yes | Yes | No | Full access |
| supervisor | Yes | Limited | Limited | No | Supervisee notes |
| therapist | Limited | Yes | Limited | No | Own notes only |
| associate_trainee | Limited | Yes | Limited | No | Own notes, requires cosign |
| billing_staff | Limited | No | No | No | For billing validation |

### PHI/PII Classification
- **Contains PHI**: Yes (clinical assessments, diagnoses, treatment)
- **Contains PII**: Yes (linked to client identity)
- **Encryption Required**: Yes (at rest and in transit)
- **Audit Required**: Yes (all access and modifications)

### Compliance Requirements
- HIPAA: Complete audit trail, minimum necessary access, encryption
- State Licensing: Timely documentation, proper supervision
- Billing Compliance: Documentation must support billed services
- Legal: Immutability after signing (amendments only)

## Service Level Agreements (SLAs)
### Data Quality
- **Accuracy**: 100% (critical for legal/billing)
- **Completeness**: 100% for signed notes
- **Timeliness**: 95% documented within 48-72 hours

### Support
- **Critical Issues**: Response < 15 min, resolution < 1 hour
- **High Issues**: Response < 1 hour, resolution < 4 hours

## Monitoring & Alerting
### Key Metrics
| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| Notes requiring cosign | [Expected based on associates] | >20 pending | >50 pending |
| Late documentation (>7 days) | < 5% | 5-10% | > 10% |
| Unsigned notes (>30 days) | 0 | 1-5 | > 5 |
| Notes without appointment link | < 10% | 10-20% | > 20% |

### Alert Configuration
| Alert | Condition | Recipients | Escalation |
|-------|-----------|-----------|------------|
| Modified locked note | Any edit after lock | Clinical Director | Immediate |
| Unsigned associate note (>7 days) | Pending cosign >7 days | Supervisor + Clinical Director | Immediate |
| Mass late documentation | >10% notes late | Compliance Officer | Daily |
| Orphaned note created | FK violation | System Admin | Immediate |

## Support Contacts
- **Primary Contact**: Clinical Director
- **Escalation Contact**: Chief Clinical Officer
- **Technical Support**: System Administrator
- **Compliance**: Compliance Officer

## Revision History
| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-01-09 | System | Initial contract for clinical_notes table |
