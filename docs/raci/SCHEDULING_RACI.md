# RACI Matrix: Scheduling Module

## Purpose
This RACI matrix defines roles and responsibilities for the scheduling module, ensuring clear accountability for appointments, waitlists, and clinician schedules.

## Legend
- **R** (Responsible): Person who performs the work
- **A** (Accountable): Person ultimately answerable for the task
- **C** (Consulted): People whose input is sought
- **I** (Informed): People who are kept up-to-date

---

## 1. Appointment Management

### Create Appointment

| Task | Front Desk | Clinician | Client | Administrator | Supervisor |
|------|------------|-----------|---------|---------------|------------|
| Schedule new appointment | R | C | I | A | I |
| Verify insurance eligibility | R | - | - | A | I |
| Confirm appointment time | R | - | C | A | - |
| Send appointment confirmation | R | - | - | A | I |

**Code Enforcement**: 
- File: `src/components/schedule/AppointmentDialog.tsx`
- RLS Policy: `appointments` table policies
- Business Rule: Must check for scheduling conflicts before creation

### Update Appointment

| Task | Front Desk | Clinician | Client | Administrator | Supervisor |
|------|------------|-----------|---------|---------------|------------|
| Reschedule appointment | R | C | I | A | I |
| Update appointment type | R | C | - | A | I |
| Modify appointment notes | R | R | - | A | C |
| Record change reason | R | R | - | A | I |

**Code Enforcement**:
- File: `src/pages/Schedule.tsx`
- Audit: `appointment_change_logs` table
- Trigger: `log_appointment_changes()` function

### Cancel Appointment

| Task | Front Desk | Clinician | Client | Administrator | Supervisor |
|------|------------|-----------|---------|---------------|------------|
| Cancel appointment | R | R | C | A | I |
| Document cancellation reason | R | R | - | A | I |
| Apply cancellation fee (if applicable) | R | C | - | A | I |
| Create cancellation note | - | R | - | A | C |
| Notify affected parties | R | - | - | A | I |

**Code Enforcement**:
- File: `src/components/schedule/CancellationDialog.tsx`
- Note Type: `cancellation_notes` table
- Policy: Fee assessment based on notice period

### Mark No-Show

| Task | Front Desk | Clinician | Client | Administrator | Supervisor |
|------|------------|-----------|---------|---------------|------------|
| Record no-show status | R | R | - | A | I |
| Apply no-show fee | R | C | - | A | I |
| Contact client for follow-up | R | C | - | A | I |
| Document no-show details | R | R | - | A | C |

**Code Enforcement**:
- File: `src/components/schedule/AppointmentStatusDialog.tsx`
- Field: `status` = 'No Show'
- Fee Field: `no_show_fee_applied`

---

## 2. Waitlist Management

### Add to Waitlist

| Task | Front Desk | Clinician | Client | Administrator | Supervisor |
|------|------------|-----------|---------|---------------|------------|
| Add client to waitlist | R | - | C | A | I |
| Document preferences | R | - | C | A | - |
| Set priority level | R | C | - | A | C |
| Notify client of waitlist status | R | - | - | A | - |

**Code Enforcement**:
- File: `src/components/schedule/WaitlistAddDialog.tsx`
- Table: `appointment_waitlist`
- Priority: 'Normal', 'High', 'Urgent'

### Process Waitlist

| Task | Front Desk | Clinician | Client | Administrator | Supervisor |
|------|------------|-----------|---------|---------------|------------|
| Review waitlist daily | R | C | - | A | I |
| Match cancellations to waitlist | R | - | - | A | I |
| Contact clients for available slots | R | - | - | A | I |
| Track conversion rate | - | - | - | A | C |

**Code Enforcement**:
- File: `src/components/schedule/WaitlistManagement.tsx`
- Function: `find_matching_slots()`
- Edge Function: `notify-waitlist-slots`

---

## 3. Clinician Schedule Management

### Define Schedule

| Task | Front Desk | Clinician | Client | Administrator | Supervisor |
|------|------------|-----------|---------|---------------|------------|
| Set weekly schedule | - | R | - | A | C |
| Define working hours | - | R | - | A | C |
| Block time for personal use | - | R | - | A | I |
| Request schedule changes | - | R | - | A | C |

**Code Enforcement**:
- File: `src/components/schedule/ClinicianScheduleEditor.tsx`
- Table: `clinician_schedules`
- Validation: `validate_appointment_schedule()` function

### Schedule Exceptions

| Task | Front Desk | Clinician | Client | Administrator | Supervisor |
|------|------------|-----------|---------|---------------|------------|
| Request time off | - | R | - | A | C |
| Approve/deny exceptions | - | C | - | A | R |
| Notify affected clients | R | - | - | A | I |
| Reschedule appointments | R | C | - | A | I |

**Code Enforcement**:
- File: `src/components/schedule/ScheduleExceptionDialog.tsx`
- Table: `schedule_exceptions`
- Status: 'Pending', 'Approved', 'Denied'

---

## 4. Group Sessions

### Create Group Session

| Task | Front Desk | Clinician | Client | Administrator | Supervisor |
|------|------------|-----------|---------|---------------|------------|
| Schedule group session | R | R | - | A | C |
| Set max participants | R | R | - | A | C |
| Define session topic | - | R | - | A | C |
| Invite participants | R | R | - | A | I |

**Code Enforcement**:
- File: `src/components/schedule/GroupSessionParticipantEditor.tsx`
- Field: `is_group_session` = true
- Table: `appointment_participants`

### Manage Participants

| Task | Front Desk | Clinician | Client | Administrator | Supervisor |
|------|------------|-----------|---------|---------------|------------|
| Add participants | R | R | - | A | I |
| Remove participants | R | R | - | A | I |
| Track attendance | - | R | - | A | I |
| Manage participant notes | - | R | - | A | C |

**Code Enforcement**:
- File: `src/components/schedule/GroupSessionParticipants.tsx`
- Max Check: `current_participants` ≤ `max_participants`

---

## 5. Recurring Appointments

### Create Recurring Series

| Task | Front Desk | Clinician | Client | Administrator | Supervisor |
|------|------------|-----------|---------|---------------|------------|
| Define recurrence pattern | R | C | C | A | I |
| Generate appointment series | R | - | - | A | I |
| Review series for conflicts | R | C | - | A | I |
| Notify client of series | R | - | - | A | I |

**Code Enforcement**:
- File: `src/components/schedule/RecurringAppointmentForm.tsx`
- Field: `is_recurring` = true
- Pattern: `recurrence_pattern` (JSON)

### Modify Recurring Series

| Task | Front Desk | Clinician | Client | Administrator | Supervisor |
|------|------------|-----------|---------|---------------|------------|
| Edit single occurrence | R | R | C | A | I |
| Edit entire series | R | C | C | A | I |
| Cancel series | R | R | C | A | I |
| Handle exceptions | R | C | - | A | I |

**Code Enforcement**:
- File: `src/components/schedule/RecurringEditDialog.tsx`
- Options: 'This Instance', 'All Future', 'Entire Series'

---

## 6. Appointment Reminders

### Configure Reminders

| Task | Front Desk | Clinician | Client | Administrator | Supervisor |
|------|------------|-----------|---------|---------------|------------|
| Set reminder templates | - | - | - | A | C |
| Define reminder schedule | - | - | - | A | C |
| Configure reminder methods | - | - | - | A | C |
| Test reminder delivery | R | - | - | A | I |

**Code Enforcement**:
- Edge Function: `send-appointment-reminder`
- Settings: `reminder_settings` table
- Methods: Email, SMS

### Track Reminders

| Task | Front Desk | Clinician | Client | Administrator | Supervisor |
|------|------------|-----------|---------|---------------|------------|
| Monitor reminder delivery | R | - | - | A | I |
| Track reminder responses | R | - | - | A | I |
| Handle failed reminders | R | - | - | A | I |
| Report reminder metrics | - | - | - | A | C |

**Code Enforcement**:
- Table: `appointment_notifications`
- Field: `reminders_sent` (JSON)
- Status tracking per method

---

## 7. Compliance & Auditing

### Track Schedule Changes

| Task | Front Desk | Clinician | Client | Administrator | Supervisor |
|------|------------|-----------|---------|---------------|------------|
| Log all changes | Auto | Auto | Auto | A | R |
| Review change logs | - | - | - | A | R |
| Investigate anomalies | - | - | - | A | R |
| Report compliance issues | - | - | - | R | C |

**Code Enforcement**:
- Table: `appointment_change_logs`
- Trigger: `log_appointment_changes()`
- Audit all CRUD operations

### Performance Metrics

| Task | Front Desk | Clinician | Client | Administrator | Supervisor |
|------|------------|-----------|---------|---------------|------------|
| Track no-show rate | - | - | - | A | R |
| Monitor utilization | - | C | - | A | R |
| Analyze cancellation patterns | - | C | - | A | R |
| Generate reports | - | - | - | A | R |

**Code Enforcement**:
- Metrics in Admin Dashboard
- Query: Calculate rates from appointment data

---

## Escalation Path

1. **Front Desk Issue** → Front Desk Supervisor → Administrator
2. **Clinician Schedule Conflict** → Supervisor → Administrator
3. **Client Complaint** → Front Desk → Supervisor → Administrator
4. **System Error** → Administrator → Technical Support

---

## Key Contacts

| Role | Primary Contact | Backup Contact |
|------|----------------|----------------|
| Scheduling Authority | Administrator | Supervisor |
| Front Desk Lead | Front Desk Manager | Senior Front Desk Staff |
| Clinical Scheduling | Clinical Supervisor | Lead Clinician |
| Technical Issues | System Administrator | IT Support |

---

## Revision History

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2025-10-09 | 1.0 | Initial RACI matrix for scheduling | System |

---

## Implementation Notes

### Database Tables Referenced
- `appointments` - Core appointment records
- `appointment_waitlist` - Waitlist management
- `appointment_participants` - Group session participants
- `appointment_change_logs` - Audit trail
- `clinician_schedules` - Clinician availability
- `schedule_exceptions` - Time off requests
- `blocked_times` - Personal time blocks
- `appointment_notifications` - Reminder tracking

### Key Functions
- `validate_appointment_schedule()` - Schedule validation
- `find_matching_slots()` - Waitlist matching
- `log_appointment_changes()` - Audit logging
- `check_appointment_conflict()` - Conflict detection

### Edge Functions
- `send-appointment-reminder` - Automated reminders
- `send-appointment-notification` - Status notifications
- `notify-waitlist-slots` - Waitlist alerts
- `confirm-appointment` - Confirmation handling

---

## Quick Reference: Who Can Do What?

| Action | Front Desk | Clinician | Client | Admin | Supervisor |
|--------|------------|-----------|---------|-------|------------|
| Create appointment | ✅ | ✅ | ❌ | ✅ | ✅ |
| Cancel appointment | ✅ | ✅ | ✅ (self) | ✅ | ✅ |
| Modify schedule | ❌ | ✅ (own) | ❌ | ✅ | ✅ |
| Add to waitlist | ✅ | ❌ | ❌ | ✅ | ✅ |
| Approve time off | ❌ | ❌ | ❌ | ✅ | ✅ |
| View all schedules | ✅ | ❌ (own only) | ❌ | ✅ | ✅ |
| Generate reports | ❌ | ❌ | ❌ | ✅ | ✅ |
