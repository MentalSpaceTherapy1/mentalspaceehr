# Data Contract: Appointments Table

## Metadata
- **Contract Name**: Appointments
- **Contract Version**: 1.0.0
- **Effective Date**: 2025-01-09
- **Owner**: Scheduling & Operations Team
- **Status**: Active
- **Last Updated**: 2025-01-09
- **Updated By**: System Administrator

## Purpose
### Business Context
The appointments table manages all client scheduling, session tracking, and attendance records. It serves as the source of truth for billing, compliance, and clinical workflow management.

### Use Cases
1. Client appointment scheduling and management
2. Clinician calendar and availability
3. Billing and charge entry generation
4. Compliance tracking (timely documentation)
5. Incident-to billing supervision tracking

### Stakeholders
- **Data Producer**: Front Desk, Clinicians
- **Data Consumer**: Clinicians, Billing Staff, Compliance Team
- **Data Steward**: Scheduling Manager

## Schema Definition
### Table Name
`public.appointments`

### Key Columns
| Column Name | Data Type | Nullable | Description | Business Rules |
|------------|-----------|----------|-------------|----------------|
| id | uuid | No | Primary key | Generated automatically |
| client_id | uuid | No | Client reference | Must exist in clients table |
| clinician_id | uuid | No | Assigned clinician | Must exist in profiles table |
| appointment_date | date | No | Date of appointment | Cannot be in distant past |
| start_time | time | No | Start time | Must be before end_time |
| end_time | time | No | End time | Must be after start_time |
| status | text | No | Appointment status | Valid status values required |
| billing_status | text | No | Billing status | Tracks billing lifecycle |
| is_incident_to | boolean | No | Incident-to flag | Default false |
| billed_under_provider_id | uuid | Yes | Supervising provider | Required if is_incident_to = true |

## Data Quality Rules
### Completeness
- **Required Fields**: id, client_id, clinician_id, appointment_date, start_time, end_time, status, billing_status
- **Conditional Requirements**:
  - If is_incident_to = true, billed_under_provider_id must not be null
  - If status = 'Completed', checked_in_time should not be null
  - If status = 'Cancelled', cancellation_reason should not be null

### Validity
- **Date/Time Logic**: 
  - end_time > start_time
  - appointment_date should not be > 1 year in future
  - appointment_date should not be > 2 years in past
- **Status Values**: Must be one of [Scheduled, Confirmed, Checked In, In Progress, Completed, Cancelled, No Show, Rescheduled]
- **Billing Status**: Must be one of [Not Billed, Pending, Billed, Paid, Denied]

### Uniqueness
- **Conflict Prevention**: No overlapping appointments for same clinician at same time
- **Composite Validation**: clinician_id + appointment_date + start_time + end_time should not conflict with existing appointments

### Consistency
- **Foreign Key Integrity**:
  - client_id must exist in clients table
  - clinician_id must exist in profiles table
  - billed_under_provider_id must exist in profiles table (if not null)
  - office_location_id must exist in locations table (if not null)
- **Business Logic**:
  - Incident-to appointments must have supervising provider
  - Completed appointments should have corresponding clinical note within compliance window

## Data Quality Checks
### Automated Validations
```sql
-- Check: No NULL values in required fields
SELECT COUNT(*) as violations
FROM appointments
WHERE client_id IS NULL 
   OR clinician_id IS NULL
   OR appointment_date IS NULL
   OR start_time IS NULL
   OR end_time IS NULL
   OR status IS NULL;

-- Check: Valid time logic
SELECT COUNT(*) as violations
FROM appointments
WHERE end_time <= start_time;

-- Check: Invalid status values
SELECT COUNT(*) as violations
FROM appointments
WHERE status NOT IN ('Scheduled', 'Confirmed', 'Checked In', 'In Progress', 'Completed', 'Cancelled', 'No Show', 'Rescheduled');

-- Check: Incident-to without supervisor
SELECT COUNT(*) as violations
FROM appointments
WHERE is_incident_to = true 
  AND billed_under_provider_id IS NULL;

-- Check: Completed appointments without clinical note (48-hour window)
SELECT COUNT(*) as violations
FROM appointments a
WHERE a.status = 'Completed'
  AND a.appointment_date < CURRENT_DATE - INTERVAL '2 days'
  AND NOT EXISTS (
    SELECT 1 FROM clinical_notes cn
    WHERE cn.appointment_id = a.id
    AND cn.status != 'Deleted'
  );

-- Check: Appointment conflicts
SELECT a1.clinician_id, a1.appointment_date, a1.start_time, COUNT(*) as conflicts
FROM appointments a1
JOIN appointments a2 ON 
  a1.clinician_id = a2.clinician_id
  AND a1.appointment_date = a2.appointment_date
  AND a1.id != a2.id
  AND a1.status NOT IN ('Cancelled', 'No Show')
  AND a2.status NOT IN ('Cancelled', 'No Show')
  AND (
    (a1.start_time >= a2.start_time AND a1.start_time < a2.end_time)
    OR (a1.end_time > a2.start_time AND a1.end_time <= a2.end_time)
  )
GROUP BY a1.clinician_id, a1.appointment_date, a1.start_time
HAVING COUNT(*) > 1;

-- Check: Orphaned foreign keys
SELECT COUNT(*) as violations
FROM appointments a
LEFT JOIN clients c ON a.client_id = c.id
WHERE c.id IS NULL;
```

### Quality Thresholds
| Check | Threshold | Severity | Action |
|-------|-----------|----------|--------|
| Null required fields | 0% | Critical | Alert immediately |
| Invalid time logic | 0% | Critical | Alert immediately |
| Invalid status | 0% | Critical | Alert immediately |
| Incident-to violations | 0% | Critical | Alert immediately |
| Missing notes (>48hrs) | < 5% | High | Daily compliance report |
| Appointment conflicts | 0 | Critical | Alert immediately |
| Orphaned references | 0% | High | Alert within 1 hour |

## Access Control & Security
### Row-Level Security (RLS)
```sql
-- Users can view appointments they're involved in
CREATE POLICY "Users can view relevant appointments"
ON appointments FOR SELECT
USING (
  clinician_id = auth.uid()
  OR client_id IN (
    SELECT id FROM clients WHERE portal_user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'administrator')
  OR has_role(auth.uid(), 'front_desk')
);

-- Authorized staff can manage appointments
CREATE POLICY "Staff can manage appointments"
ON appointments FOR ALL
USING (
  has_role(auth.uid(), 'administrator')
  OR has_role(auth.uid(), 'front_desk')
  OR clinician_id = auth.uid()
);
```

### Authorized Roles
| Role | Select | Insert | Update | Delete | Notes |
|------|--------|--------|--------|--------|-------|
| administrator | Yes | Yes | Yes | No | Full management |
| front_desk | Yes | Yes | Yes | No | Scheduling duties |
| clinician | Limited | Limited | Limited | No | Own appointments only |
| portal_user | Limited | No | No | No | View own appointments |

### PHI/PII Classification
- **Contains PHI**: Yes (client identity, clinical details)
- **Contains PII**: Yes (linked to client records)
- **Encryption Required**: Yes
- **Audit Required**: Yes (all modifications)

### Compliance Requirements
- HIPAA: Audit trail for all changes
- Billing Compliance: Timely documentation (48-72 hours)
- Incident-to Rules: Proper supervision documentation

## Service Level Agreements (SLAs)
### Data Quality
- **Accuracy**: 99.9% (correct client-clinician assignments)
- **Completeness**: 100% for required fields
- **Timeliness**: Real-time updates for status changes

### Support
- **Critical Issues**: Response < 30 min, resolution < 2 hours
- **High Issues**: Response < 2 hours, resolution < 12 hours

## Monitoring & Alerting
### Key Metrics
| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| Daily appointments | [Practice-specific] | ±20% | ±50% |
| Appointment conflicts | 0 | N/A | Any |
| Missing notes (>48hrs) | < 5% | 5-10% | > 10% |
| Incident-to violations | 0 | N/A | Any |

### Alert Configuration
| Alert | Condition | Recipients | Escalation |
|-------|-----------|-----------|------------|
| Appointment conflict | Overlap detected | Scheduling + Clinician | Immediate |
| Incident-to violation | Missing supervisor | Billing Manager | Immediate |
| Late documentation | >48hrs no note | Compliance Officer | Daily batch |

## Support Contacts
- **Primary Contact**: Scheduling Manager
- **Escalation Contact**: Operations Director
- **Technical Support**: System Administrator

## Revision History
| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-01-09 | System | Initial contract for appointments table |
