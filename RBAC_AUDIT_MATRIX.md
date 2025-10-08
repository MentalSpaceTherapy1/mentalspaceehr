# RBAC & Audit Event Matrix

## Purpose

This document maps every permission in the MentalSpace EHR system to required audit events, ensuring HIPAA-compliant tracking of all PHI access and administrative actions.

---

## Role Hierarchy

```
Administrator (Full System Access)
├── Supervisor (Clinical Oversight)
├── Therapist/Clinician (Patient Care)
├── Billing Staff (Financial Operations)
├── Front Desk (Scheduling & Reception)
├── Associate/Trainee (Supervised Clinical)
└── Client Portal User (Self-Service)
```

---

## Permission Matrix

### 1. Client Management

| Action | Administrator | Supervisor | Therapist | Billing | Front Desk | Associate | Client | Audit Event Required |
|--------|--------------|------------|-----------|---------|------------|-----------|--------|---------------------|
| **View Client List** | ✓ | ✓ | ✓ (assigned only) | ✓ | ✓ | ✓ (assigned only) | ✗ | `phi_access` |
| **View Client Chart** | ✓ | ✓ | ✓ (assigned only) | ✓ (for billing) | ✓ | ✓ (assigned only) | ✗ | `phi_access` + resource_type=`client_chart` |
| **Create Client** | ✓ | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ | `data_modification` + action_type=`create` |
| **Edit Client Demographics** | ✓ | ✗ | ✓ (assigned only) | ✗ | ✓ | ✗ | ✗ | `data_modification` + PHI fields in action_details |
| **Deactivate Client** | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | `admin_action` + severity=`critical` |
| **Export Client Data** | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | `phi_access` + action_type=`export` + severity=`warning` |
| **Assign Primary Therapist** | ✓ | ✓ | ✗ | ✗ | ✓ | ✗ | ✗ | `data_modification` + old/new therapist IDs |

**Critical Audit Requirements**:
- All client chart views must log: user_id, client_id, timestamp, IP address, user_agent
- Bulk exports trigger immediate supervisor notification
- Deactivation requires documented reason in action_details

---

### 2. Clinical Documentation

| Action | Administrator | Supervisor | Therapist | Billing | Front Desk | Associate | Client | Audit Event Required |
|--------|--------------|------------|-----------|---------|------------|-----------|--------|---------------------|
| **Create Progress Note** | ✓ | ✓ | ✓ (own clients) | ✗ | ✗ | ✓ (own clients) | ✗ | `data_modification` + note_type |
| **View Progress Note** | ✓ | ✓ | ✓ (own/supervised) | ✗ | ✗ | ✓ (own only) | ✗ | `phi_access` + resource_type=`clinical_note` |
| **Edit Note (Unlocked)** | ✓ | ✓ | ✓ (author only) | ✗ | ✗ | ✓ (author only) | ✗ | `data_modification` + old/new content hash |
| **Lock Note** | ✓ | ✓ | ✓ (author only) | ✗ | ✗ | ✗ | ✗ | `admin_action` + lock timestamp |
| **Unlock Note (Request)** | ✓ | ✓ | ✓ | ✗ | ✗ | ✓ | ✗ | `admin_action` + request reason |
| **Unlock Note (Approve)** | ✓ | ✓ (if supervisor) | ✗ | ✗ | ✗ | ✗ | ✗ | `admin_action` + approval + severity=`critical` |
| **Co-sign Note** | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | `admin_action` + cosignature timestamp |
| **Delete Note** | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | **PROHIBITED** (soft delete only) |
| **View Note Audit Log** | ✓ | ✓ | ✓ (own notes) | ✗ | ✗ | ✗ | ✗ | `phi_access` + resource_type=`audit_logs` |

**Critical Audit Requirements**:
- Locked note edits must log unlock approval chain
- Co-signatures trigger notification to supervisee
- Associate notes without co-signature within 7 days trigger alert
- Note content changes store before/after diff (encrypted)

---

### 3. Scheduling & Appointments

| Action | Administrator | Supervisor | Therapist | Billing | Front Desk | Associate | Client | Audit Event Required |
|--------|--------------|------------|-----------|---------|------------|-----------|--------|---------------------|
| **View Schedule** | ✓ (all) | ✓ (supervised) | ✓ (own) | ✗ | ✓ (all) | ✓ (own) | ✓ (own) | `phi_access` if client details shown |
| **Create Appointment** | ✓ | ✗ | ✓ (own schedule) | ✗ | ✓ | ✓ (own schedule) | ✗ | `data_modification` + appointment details |
| **Reschedule Appointment** | ✓ | ✗ | ✓ | ✗ | ✓ | ✓ | ✗ | `data_modification` + old/new date/time |
| **Cancel Appointment** | ✓ | ✗ | ✓ | ✗ | ✓ | ✓ | ✗ | `admin_action` + cancellation_reason |
| **Check-in Client** | ✓ | ✗ | ✓ | ✗ | ✓ | ✓ | ✗ | `data_modification` + check_in_time |
| **Check-out Client** | ✓ | ✗ | ✓ | ✗ | ✓ | ✓ | ✗ | `data_modification` + check_out_time |
| **Mark No-Show** | ✓ | ✗ | ✓ | ✗ | ✓ | ✓ | ✗ | `admin_action` + no_show_notes |
| **Request Appointment (Portal)** | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | `data_modification` + portal request |
| **Confirm Appointment (Portal)** | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | `data_modification` + confirmation token |

**Critical Audit Requirements**:
- Same-day cancellations log who initiated and method of notification
- No-show requires documented contact attempt
- Bulk schedule changes (recurring) log each instance
- Portal appointment requests trigger staff notification

---

### 4. Billing & Claims

| Action | Administrator | Supervisor | Therapist | Billing | Front Desk | Associate | Client | Audit Event Required |
|--------|--------------|------------|-----------|---------|------------|-----------|--------|---------------------|
| **View Charges** | ✓ | ✗ | ✓ (own services) | ✓ | ✓ | ✗ | ✗ | `phi_access` + resource_type=`billing` |
| **Create Charge** | ✓ | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ | `data_modification` + CPT, amount, insurance |
| **Edit Unbilled Charge** | ✓ | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ | `data_modification` + old/new values |
| **Delete Unbilled Charge** | ✓ | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ | `admin_action` + deletion_reason + severity=`warning` |
| **Submit Claim** | ✓ | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ | `admin_action` + claim_id + payer |
| **Post Payment** | ✓ | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ | `data_modification` + payment details |
| **Write-off Balance** | ✓ | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ | `admin_action` + write_off_reason + severity=`warning` |
| **View Patient Statement** | ✓ | ✗ | ✗ | ✓ | ✓ | ✗ | ✓ (own) | `phi_access` + resource_type=`statement` |
| **Apply Adjustment** | ✓ | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ | `data_modification` + adjustment_code + amount |

**Critical Audit Requirements**:
- All charge modifications log original CPT code and amount
- Claim submissions store X12 file hash for audit trail
- Write-offs >$500 require supervisor approval (logged)
- Payment allocations track check/transaction numbers
- Adjustments require adjustment reason code

---

### 5. User & Role Management

| Action | Administrator | Supervisor | Therapist | Billing | Front Desk | Associate | Client | Audit Event Required |
|--------|--------------|------------|-----------|---------|------------|-----------|--------|---------------------|
| **View User List** | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | `phi_access` (users have access to PHI) |
| **Create User** | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | `admin_action` + user_email + roles + severity=`critical` |
| **Assign Role** | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | `admin_action` + user_id + new_role + severity=`critical` |
| **Revoke Role** | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | `admin_action` + user_id + removed_role + severity=`critical` |
| **Deactivate User** | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | `admin_action` + user_id + reason + severity=`critical` |
| **Reset User Password** | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | `admin_action` + user_id + reset_method |
| **View Audit Logs** | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | `admin_action` + log_query_parameters |
| **Modify Practice Settings** | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | `configuration_change` + setting_name + old/new |

**Critical Audit Requirements**:
- Role assignments trigger immediate email to user and supervisor
- Administrator role changes require dual approval (future enhancement)
- User deactivation logs termination date and reason
- Password resets log initiator and method (self-service vs admin)
- Audit log access is itself audited (meta-audit)

---

### 6. Documents & Templates

| Action | Administrator | Supervisor | Therapist | Billing | Front Desk | Associate | Client | Audit Event Required |
|--------|--------------|------------|-----------|---------|------------|-----------|--------|---------------------|
| **Upload Client Document** | ✓ | ✗ | ✓ (assigned clients) | ✗ | ✓ | ✓ (assigned clients) | ✓ (own) | `data_modification` + document_type + file_size |
| **View Client Document** | ✓ | ✓ | ✓ (assigned clients) | ✗ | ✓ | ✓ (assigned clients) | ✓ (if shared) | `phi_access` + resource_type=`document` + document_id |
| **Share Document with Client** | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | `admin_action` + document_id + shared_date |
| **Delete Document** | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | `admin_action` + document_id + deletion_reason + severity=`warning` |
| **Download Document** | ✓ | ✓ | ✓ (assigned clients) | ✗ | ✗ | ✓ (assigned clients) | ✓ (if shared) | `phi_access` + resource_type=`document` + action=`download` |
| **Create Document Template** | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | `configuration_change` + template_name + version |
| **Version Document Template** | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | `configuration_change` + template_id + old/new version |

**Critical Audit Requirements**:
- Document downloads log file hash for integrity verification
- Shared documents log client acknowledgment (if viewed)
- Template changes trigger changelog update
- Bulk document uploads log each file individually

---

### 7. Telehealth & Virtual Sessions

| Action | Administrator | Supervisor | Therapist | Billing | Front Desk | Associate | Client | Audit Event Required |
|--------|--------------|------------|-----------|---------|------------|-----------|--------|---------------------|
| **Start Telehealth Session** | ✓ | ✓ | ✓ (own appointments) | ✗ | ✗ | ✓ (own appointments) | ✗ | `admin_action` + session_id + start_time |
| **Join Waiting Room (Client)** | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | `phi_access` + waiting_room_entry + IP/location |
| **Admit from Waiting Room** | ✓ | ✓ | ✓ | ✗ | ✗ | ✓ | ✗ | `admin_action` + client_id + admit_time |
| **Record Session (with consent)** | ✓ | ✓ | ✓ | ✗ | ✗ | ✓ | ✗ | `admin_action` + consent_timestamp + recording_id |
| **End Telehealth Session** | ✓ | ✓ | ✓ | ✗ | ✗ | ✓ | ✗ | `admin_action` + session_id + duration + end_time |
| **View Session Recording** | ✓ | ✓ | ✓ (if host) | ✗ | ✗ | ✗ | ✗ | `phi_access` + resource_type=`recording` + severity=`warning` |
| **Download Session Recording** | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | `phi_access` + action=`download` + severity=`critical` |
| **Delete Session Recording** | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | `admin_action` + recording_id + retention_policy + severity=`critical` |

**Critical Audit Requirements**:
- All session participants logged with join/leave timestamps
- Recording consent must be documented before recording starts
- Client IP address and approximate location logged for licensure compliance
- Session technical issues (connection drops, quality degradation) logged
- Recording access generates email notification to client

---

### 8. Assessments & Clinical Tools

| Action | Administrator | Supervisor | Therapist | Billing | Front Desk | Associate | Client | Audit Event Required |
|--------|--------------|------------|-----------|---------|------------|-----------|--------|---------------------|
| **Administer Assessment** | ✓ | ✓ | ✓ (assigned clients) | ✗ | ✗ | ✓ (assigned clients) | ✗ | `data_modification` + assessment_type + administration_date |
| **View Assessment Results** | ✓ | ✓ | ✓ (assigned clients) | ✗ | ✗ | ✓ (assigned clients) | ✗ | `phi_access` + resource_type=`assessment` + assessment_id |
| **Assign Portal Assessment** | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | `admin_action` + client_id + assessment_type + due_date |
| **Complete Portal Assessment** | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | `data_modification` + assessment_id + completion_time |
| **View Critical Alerts** | ✓ | ✓ | ✓ (assigned clients) | ✗ | ✗ | ✓ (assigned clients) | ✗ | `phi_access` + resource_type=`critical_alert` + alert_id |
| **Acknowledge Alert** | ✓ | ✓ | ✓ | ✗ | ✗ | ✓ | ✗ | `admin_action` + alert_id + acknowledgment_time + severity=`critical` |
| **Resolve Alert** | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | `admin_action` + alert_id + resolution_notes + severity=`critical` |

**Critical Audit Requirements**:
- Critical alerts (suicide/harm) trigger real-time notifications (logged)
- Alert acknowledgment must include action taken
- Portal assessment completion logs IP address and device
- Assessment score trends analyzed for anomalies (automated alerts)

---

## Authentication & Session Audit Events

### Login Events

| Event | Trigger | Required Data | Severity | Real-time Alert |
|-------|---------|---------------|----------|-----------------|
| **Successful Login** | User authenticates successfully | user_id, IP, device, MFA_used, timestamp | info | No |
| **Failed Login** | Invalid credentials | attempted_email, IP, failure_reason, timestamp | warning | After 3 attempts |
| **MFA Challenge** | 2FA requested | user_id, MFA_method, timestamp | info | No |
| **MFA Failure** | Invalid 2FA code | user_id, IP, failure_count, timestamp | warning | After 3 attempts |
| **Account Lockout** | Too many failed attempts | user_id, IP, lockout_duration, timestamp | critical | Yes (Security team) |
| **Suspicious Location** | Login from unusual location | user_id, IP, country, distance_from_usual | warning | Yes (User + Security) |
| **New Device Login** | Unrecognized device | user_id, device_fingerprint, IP, timestamp | warning | Yes (User email) |
| **Password Reset Request** | User requests reset | user_id/email, IP, timestamp | info | Yes (User email) |
| **Password Changed** | Password successfully changed | user_id, IP, change_method (self vs admin), timestamp | warning | Yes (User email) |
| **Session Timeout** | Idle timeout reached | user_id, session_duration, last_activity | info | No |
| **Forced Logout** | Admin terminates session | target_user_id, admin_user_id, reason, timestamp | critical | Yes (Both users) |

---

## Automated Audit Checks (Daily)

### Compliance Monitoring

1. **Unsigned Associate Notes**
   - Query: Notes >7 days old requiring co-signature
   - Alert: Email to supervisor + associate
   - Severity: High

2. **Excessive PHI Access**
   - Query: >50 chart views in 1 hour by single user
   - Alert: Security team + supervisor
   - Severity: Critical

3. **After-Hours Access**
   - Query: PHI access outside business hours (8pm-6am)
   - Alert: Log for review (unless on-call)
   - Severity: Medium

4. **Locked Note Edit Attempts**
   - Query: Attempts to edit locked notes without unlock request
   - Alert: Supervisor + security team
   - Severity: Critical

5. **Orphaned Appointments**
   - Query: Appointments without corresponding notes >48 hours
   - Alert: Clinician + supervisor
   - Severity: Medium

6. **Stale User Accounts**
   - Query: Active accounts with no login >90 days
   - Alert: Administrator for review
   - Severity: Medium

7. **Role Escalation**
   - Query: Users with multiple high-privilege roles
   - Alert: Administrator for periodic review
   - Severity: Low

8. **Unbilled Services**
   - Query: Completed appointments >30 days without charges
   - Alert: Billing department
   - Severity: High

---

## Audit Log Retention

| Event Type | Retention Period | Storage Type | Compliance Requirement |
|------------|-----------------|--------------|------------------------|
| PHI Access | 7 years | Encrypted database | HIPAA §164.312(b) |
| Authentication | 1 year | Database | Best practice |
| Role Changes | 10 years | Encrypted database | Internal policy |
| Clinical Documentation | 7 years (adult) / Until age 25 (minor) | Encrypted database | State law + HIPAA |
| Billing & Claims | 10 years | Encrypted database | IRS + HIPAA |
| Security Incidents | 10 years | Encrypted database + cold storage | HIPAA §164.308(a)(6) |
| System Configuration | 5 years | Database | Best practice |

---

## Response Time SLAs

| Severity | Detection | Notification | Initial Response | Resolution Target |
|----------|-----------|--------------|------------------|-------------------|
| **Critical** (e.g., breach indicator, admin role hijack) | <5 minutes | Immediate (SMS + email) | <15 minutes | <2 hours |
| **High** (e.g., excessive PHI access, MFA failures) | <15 minutes | <15 minutes | <1 hour | <24 hours |
| **Medium** (e.g., after-hours access, orphaned appointments) | <1 hour | <1 hour | <4 hours | <72 hours |
| **Low** (e.g., role reviews, stale accounts) | Daily batch | Daily digest | <1 week | <30 days |

---

## Integration with External Systems

### Third-Party Audit Forwarding

For compliance with organizational security policies, audit events can be forwarded to:

- **SIEM Systems** (Splunk, LogRhythm): Security event aggregation
- **Compliance Platforms** (Vanta, Drata): Automated compliance checks
- **Incident Response** (PagerDuty, Opsgenie): Critical alert routing

**Configuration**: See `supabase/functions/forward-audit-events/`

---

## Quarterly Audit Review Checklist

- [ ] Review all critical severity events
- [ ] Analyze failed login patterns
- [ ] Verify all administrators have valid business justification
- [ ] Confirm all PHI exports have documented purpose
- [ ] Check for role escalation anomalies
- [ ] Validate co-signature compliance for associates
- [ ] Review after-hours access patterns
- [ ] Audit document download volumes per user
- [ ] Verify session recording retention compliance
- [ ] Confirm all locked note edits were properly approved

---

**Document Version**: 1.0  
**Last Updated**: 2025-10-08  
**Next Review**: Quarterly  
**Owner**: Security & Compliance Lead
