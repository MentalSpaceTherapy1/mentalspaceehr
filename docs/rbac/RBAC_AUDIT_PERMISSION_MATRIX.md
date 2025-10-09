# RBAC-Audit Permission Matrix

## Purpose
This matrix explicitly documents which audit event must be logged for each system permission, ensuring HIPAA compliance and complete audit trail coverage. Every permission that accesses PHI or performs security-sensitive operations must trigger appropriate audit logging.

## Legend
- **Permission**: The specific action or access capability in the system
- **Role(s)**: Which app roles can perform this action
- **Audit Event Type**: The type of audit log entry that must be created (from `auditLogger.ts`)
- **Severity**: The importance level of the audit event (info, warning, critical)
- **Required**: Whether audit logging is mandatory (M) or optional (O)
- **Code Reference**: Where the permission check and audit logging occurs

---

## Audit Event Types Reference

From `src/lib/auditLogger.ts`:

| Event Type | Description | Typical Use Case |
|------------|-------------|-----------------|
| `phi_access` | PHI/Protected Health Information accessed | Viewing client charts, notes, assessments |
| `data_modification` | Data created, updated, or deleted | Creating notes, modifying treatment plans |
| `admin_action` | Administrative action performed | User management, role changes, settings |
| `login` | Successful login | User authenticated successfully |
| `logout` | Explicit logout | User logged out |
| `authentication_attempt` | Failed login attempt | Invalid credentials, account lockout |
| `permission_change` | Role or permission modified | Role assignment, permission grant/revoke |
| `configuration_change` | System configuration changed | Practice settings, fee schedules |

---

## 1. Client Chart & Demographics Access

| Permission | Role(s) | Audit Event | Severity | Required | Code Reference |
|------------|---------|-------------|----------|----------|----------------|
| View Client List | All Staff | `phi_access` | info | M | `ClientsList.tsx` |
| View Client Demographics | All Staff | `phi_access` | info | M | `ClientChart.tsx:logPHIAccess()` |
| View Client Chart | All Staff | `phi_access` | info | M | `ClientChart.tsx:logPHIAccess()` |
| Create New Client | Administrator, Front Desk | `data_modification` + `phi_access` | info | M | Client create dialog |
| Edit Client Demographics | Administrator, Front Desk | `data_modification` | info | M | Client edit dialog |
| Archive/Delete Client | Administrator | `data_modification` | warning | M | Client management |
| Export Client Data | Administrator | `phi_access` | warning | M | `logBulkExport()` if >50 records |
| View Multiple Clients (Bulk) | Administrator | `phi_access` | warning | M | `logCriticalAccess()` if >50 |

**Example Code:**
```typescript
// ClientChart.tsx
await logPHIAccess(
  userId,
  clientId,
  'client_chart',
  'Viewed client demographics',
  { section: 'demographics' }
);
```

---

## 2. Clinical Notes & Documentation

| Permission | Role(s) | Audit Event | Severity | Required | Code Reference |
|------------|---------|-------------|----------|----------|----------------|
| View Clinical Note | Therapist, Supervisor, Administrator | `phi_access` | info | M | `ProgressNote.tsx` |
| Create Clinical Note | Therapist, Associate Trainee, Administrator | `data_modification` | info | M | `ProgressNote.tsx` |
| Edit Clinical Note (Own) | Therapist (Author) | `data_modification` | info | M | Note edit function |
| Edit Clinical Note (Others) | Administrator | `data_modification` | warning | M | Note edit override |
| Delete Clinical Note | Administrator | `data_modification` | critical | M | Note deletion |
| Sign/Lock Clinical Note | Therapist (Author) | `data_modification` | warning | M | Note signature |
| Request Co-Signature | Associate Trainee | `data_modification` | info | M | Co-signature workflow |
| Provide Co-Signature | Supervisor | `data_modification` | warning | M | Co-signature completion |
| Unlock Signed Note | Administrator | `admin_action` | critical | M | Emergency unlock |
| Amend Signed Note | Therapist (Author), Administrator | `data_modification` | critical | M | Note amendment |
| Generate AI Note | Therapist, Associate Trainee | `data_modification` | info | M | AI note generation |
| View Note History | Therapist (Author), Supervisor, Administrator | `phi_access` | info | M | Version history |
| Export Multiple Notes | Administrator | `phi_access` | warning | M | `logBulkExport()` |

**Example Code:**
```typescript
// ProgressNote.tsx - Viewing note
await logPHIAccess(
  userId,
  clientId,
  'clinical_note',
  'Viewed progress note',
  { noteId, noteType: 'progress_note' }
);

// ProgressNote.tsx - Creating note
await logDataModification(
  userId,
  'clinical_note',
  noteId,
  'Created progress note',
  { clientId, noteType: 'progress_note', service: '90834' }
);

// Co-signature workflow
await logDataModification(
  supervisorId,
  'clinical_note',
  noteId,
  'Co-signed note for associate trainee',
  { traineeId, clientId, attestationSigned: true }
);
```

---

## 3. Assessments & Screening Tools

| Permission | Role(s) | Audit Event | Severity | Required | Code Reference |
|------------|---------|-------------|----------|----------|----------------|
| View Assessment | Therapist (Assigned), Supervisor, Administrator | `phi_access` | info | M | Assessment view |
| Create Assessment | Therapist, Administrator | `data_modification` | info | M | Assessment creation |
| Complete Assessment | Therapist | `data_modification` | info | M | Assessment scoring |
| Assign Assessment to Client | Therapist | `data_modification` | info | M | Assessment assignment |
| View Assessment Scores | Therapist (Assigned), Supervisor, Administrator | `phi_access` | info | M | Scores view |
| View Assessment History | Therapist (Assigned), Supervisor, Administrator | `phi_access` | info | M | Assessment history |
| Export Assessment Data | Administrator | `phi_access` | warning | M | Data export |

**Example Code:**
```typescript
await logPHIAccess(
  userId,
  clientId,
  'assessment',
  'Viewed PHQ-9 assessment',
  { assessmentType: 'PHQ-9', score: 15 }
);
```

---

## 4. Treatment Plans

| Permission | Role(s) | Audit Event | Severity | Required | Code Reference |
|------------|---------|-------------|----------|----------|----------------|
| View Treatment Plan | Therapist (Assigned), Supervisor, Administrator | `phi_access` | info | M | Treatment plan view |
| Create Treatment Plan | Therapist, Administrator | `data_modification` | info | M | Treatment plan creation |
| Update Treatment Plan | Therapist (Assigned), Administrator | `data_modification` | info | M | Treatment plan update |
| Review/Approve Treatment Plan | Supervisor | `data_modification` | warning | M | Treatment plan approval |
| Terminate Treatment Plan | Therapist (Assigned), Administrator | `data_modification` | warning | M | Treatment plan termination |

**Example Code:**
```typescript
await logDataModification(
  userId,
  'treatment_plan',
  planId,
  'Created treatment plan',
  { clientId, diagnosisCodes: ['F41.1', 'F43.10'], goals: 3 }
);
```

---

## 5. Appointments & Scheduling

| Permission | Role(s) | Audit Event | Severity | Required | Code Reference |
|------------|---------|-------------|----------|----------|----------------|
| View Own Schedule | All Staff | `phi_access` | info | O | Calendar view (low sensitivity) |
| View All Schedules | Administrator, Front Desk, Supervisor | `phi_access` | info | M | System-wide calendar |
| Create Appointment | Front Desk, Therapist, Administrator | `data_modification` | info | M | Appointment creation |
| Modify Appointment | Front Desk, Therapist (Own), Administrator | `data_modification` | info | M | Appointment update |
| Cancel Appointment | Front Desk, Therapist (Own), Administrator | `data_modification` | info | M | Appointment cancellation |
| Check-In Client | Front Desk, Administrator | `data_modification` | info | M | Client check-in |
| Check-Out Client | Front Desk, Administrator | `data_modification` | info | M | Client check-out |
| View Appointment History | Therapist, Front Desk, Administrator | `phi_access` | info | M | History query |
| Export Appointment Data | Administrator | `phi_access` | warning | M | `logBulkExport()` |

**Example Code:**
```typescript
await logDataModification(
  userId,
  'appointment',
  appointmentId,
  'Created appointment',
  { clientId, providerId, serviceType: '90834', date: '2025-10-15' }
);
```

---

## 6. Billing & Claims

| Permission | Role(s) | Audit Event | Severity | Required | Code Reference |
|------------|---------|-------------|----------|----------|----------------|
| View Client Balance | Billing Staff, Administrator | `phi_access` | info | M | Billing dashboard |
| View Payment History | Billing Staff, Administrator | `phi_access` | info | M | Payment ledger |
| Enter Charge | Billing Staff, Administrator | `data_modification` | info | M | Charge entry |
| Submit Insurance Claim | Billing Staff, Administrator | `data_modification` | warning | M | 837 submission |
| Post Payment | Billing Staff, Administrator | `data_modification` | info | M | Payment posting |
| Apply Adjustment | Billing Staff, Administrator | `data_modification` | warning | M | Adjustment posting |
| Write-Off Balance | Billing Staff, Administrator | `data_modification` | warning | M | Write-off |
| Export Billing Report | Administrator, Billing Staff | `phi_access` | warning | M | `logBulkExport()` |
| Access Credit Card Data | Billing Staff (PCI), Administrator | `admin_action` | critical | M | Payment processing |
| Verify Incident-to Compliance | Billing Staff, Administrator | `admin_action` | warning | M | Edge Function: `verify-incident-to-compliance` |

**Example Code:**
```typescript
await logDataModification(
  userId,
  'billing',
  chargeId,
  'Submitted insurance claim (837)',
  { clientId, claimAmount: 150.00, payerId: 'BCBS', claimId }
);

await logAdminAction(
  userId,
  'billing',
  'Verified incident-to billing compliance',
  { appointmentId, supervisingProviderId, attestationVerified: true }
);
```

---

## 7. User Management & Roles

| Permission | Role(s) | Audit Event | Severity | Required | Code Reference |
|------------|---------|-------------|----------|----------|----------------|
| View User List | Administrator | `phi_access` | info | O | User management page |
| Create User | Administrator | `admin_action` | warning | M | User creation |
| Edit User Profile | Administrator | `admin_action` | warning | M | User profile update |
| Assign Role | Administrator | `permission_change` | critical | M | Role assignment |
| Remove Role | Administrator | `permission_change` | critical | M | Role removal |
| Activate User | Administrator | `admin_action` | warning | M | User activation |
| Deactivate User | Administrator | `admin_action` | warning | M | User deactivation |
| Reset User Password | Administrator | `admin_action` | warning | M | Password reset |
| View Audit Logs | Administrator | `phi_access` | warning | M | Audit log access |

**Example Code:**
```typescript
await logAdminAction(
  adminUserId,
  'role_assignment',
  'Assigned supervisor role to user',
  { targetUserId, newRole: 'supervisor', previousRoles: ['therapist'] }
);

await logSecurityEvent(
  adminUserId,
  'user_management',
  'Deactivated user account',
  { targetUserId, reason: 'Employment terminated', deactivationDate }
);
```

---

## 8. Portal & Client Access

| Permission | Role(s) | Audit Event | Severity | Required | Code Reference |
|------------|---------|-------------|----------|----------|----------------|
| Login to Portal | Client User | `login` | info | M | Portal authentication |
| View Own Records | Client User | `phi_access` | info | M | Portal records view |
| View Own Appointments | Client User | `phi_access` | info | M | Portal appointments |
| Request Appointment | Client User | `data_modification` | info | M | Appointment request |
| Send Secure Message | Client User | `data_modification` | info | M | Portal messaging |
| Upload Document | Client User | `data_modification` | info | M | Document upload |
| Make Payment | Client User | `data_modification` | info | M | Payment processing |
| Complete Assessment | Client User | `data_modification` | info | M | Portal assessment |

**Example Code:**
```typescript
await logAuthEvent(
  portalUserId,
  'login',
  'Client logged into portal',
  'info'
);

await logPHIAccess(
  portalUserId,
  clientId,
  'client_chart',
  'Viewed own medical records via portal',
  { portalSession: true }
);
```

---

## 9. System Administration

| Permission | Role(s) | Audit Event | Severity | Required | Code Reference |
|------------|---------|-------------|----------|----------|----------------|
| Modify Practice Settings | Administrator | `configuration_change` | warning | M | Settings page |
| Update Fee Schedule | Administrator, Billing Staff | `configuration_change` | warning | M | Fee schedule |
| Manage Content Packs | Administrator | `configuration_change` | warning | M | Content pack manager |
| View System Logs | Administrator | `admin_action` | info | M | Log viewer |
| Run System Reports | Administrator | `phi_access` | warning | M | Reporting module |
| Backup Database | Administrator | `admin_action` | critical | M | Backup operation |
| Restore Database | Administrator | `admin_action` | critical | M | Restore operation |

**Example Code:**
```typescript
await logAdminAction(
  userId,
  'settings',
  'Updated practice business hours',
  { previousHours, newHours, effectiveDate }
);

await logSecurityEvent(
  userId,
  'settings',
  'Initiated database backup',
  { backupType: 'manual', backupSize: '2.3GB' }
);
```

---

## 10. After-Hours & High-Risk Access

| Permission | Role(s) | Audit Event | Severity | Required | Code Reference |
|------------|---------|-------------|----------|----------|----------------|
| After-Hours PHI Access | All Staff | `phi_access` | info | M | `logAfterHoursAccess()` |
| Bulk Data Export (>50 records) | Administrator | `phi_access` | warning | M | `logBulkExport()` |
| Critical Access (>50 charts) | Administrator | `phi_access` | warning-critical | M | `logCriticalAccess()` |
| Emergency Record Override | Administrator | `admin_action` | critical | M | Emergency access |

**Example Code:**
```typescript
// Automatically logs after-hours access (before 6 AM or after 8 PM)
await logAfterHoursAccess(
  userId,
  'client_chart',
  clientId,
  'Accessed client chart after hours',
  { reason: 'Emergency consultation', hour: 22 }
);

// Bulk export tracking
await logBulkExport(
  userId,
  'clinical_note',
  'Exported client notes for insurance audit',
  recordCount: 150,
  { auditRequestor: 'BCBS', auditId: 'AUD-2025-001' }
);

// Critical access monitoring
await logCriticalAccess(
  userId,
  'client_chart',
  'Accessed multiple client charts in single session',
  accessCount: 75,
  { sessionDuration: '45 minutes', purpose: 'Quality review' }
);
```

---

## Audit Logging Compliance Matrix

### HIPAA Compliance Requirements

All actions accessing PHI or modifying patient data **MUST** trigger audit logging per HIPAA §164.312(b) - Audit Controls:

| HIPAA Requirement | Implementation | Enforcement |
|-------------------|----------------|-------------|
| Who accessed PHI | `userId` in audit log | All `logPHIAccess()` calls |
| What PHI was accessed | `resourceType` + `resourceId` | All audit functions |
| When access occurred | `action_timestamp` | Automatic in `audit_logs` table |
| Where access occurred | `ip_address` (stored in RPC) | Database-level tracking |
| Why access occurred | `actionDescription` + `actionDetails` | Required parameter |

### Mandatory Audit Events

The following events **MUST** always trigger audit logging:

1. **PHI Access**: Any view of client demographics, notes, assessments, treatment plans
2. **PHI Modification**: Any create/update/delete of client data
3. **Authentication**: All login, logout, and failed login attempts
4. **Role Changes**: Any permission or role assignment change
5. **After-Hours Access**: Any PHI access outside business hours (6 AM - 8 PM)
6. **Bulk Access**: Any operation accessing >50 records
7. **Administrative Actions**: User management, system configuration, emergency overrides

---

## Database Function: `log_audit_event`

From `supabase/migrations`:

```sql
CREATE FUNCTION log_audit_event(
  p_user_id UUID,
  p_action_type TEXT,
  p_resource_type TEXT,
  p_resource_id UUID,
  p_action_description TEXT,
  p_action_details JSONB,
  p_severity TEXT
) RETURNS UUID AS $$
DECLARE
  v_audit_id UUID;
BEGIN
  INSERT INTO public.audit_logs (
    user_id,
    action_type,
    resource_type,
    resource_id,
    action_description,
    action_details,
    severity,
    ip_address,
    user_agent
  ) VALUES (
    p_user_id,
    p_action_type,
    p_resource_type,
    p_resource_id,
    p_action_description,
    p_action_details,
    p_severity,
    inet_client_addr(),
    current_setting('request.headers', true)::jsonb->>'user-agent'
  )
  RETURNING id INTO v_audit_id;

  RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Permission-Role Matrix

Quick reference for which roles can perform which permission categories:

| Permission Category | Administrator | Supervisor | Therapist | Billing Staff | Front Desk | Associate Trainee | Client User |
|---------------------|---------------|------------|-----------|---------------|------------|-------------------|-------------|
| View Client Charts | ✅ | ✅ | ✅ (assigned) | ❌ | ✅ | ✅ (assigned) | ✅ (own) |
| Create Clinical Notes | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ (requires co-sig) | ❌ |
| Co-sign Notes | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Manage Appointments | ✅ | ❌ | ✅ (own) | ❌ | ✅ | ❌ | ❌ |
| Process Billing | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Manage Users | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| View Audit Logs | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Portal Access | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## Gap Analysis & Recommendations

### Current Coverage: ~85%

**Strong Areas:**
- ✅ PHI access logging comprehensively implemented
- ✅ All 8 audit event types defined and in use
- ✅ Database-level audit function with IP tracking
- ✅ After-hours and bulk access special logging
- ✅ Severity levels properly categorized

**Gaps Identified:**

1. **Inconsistent Enforcement** (Medium Priority)
   - Some pages may access PHI without logging
   - **Recommendation**: Add automated linting rule to require `logPHIAccess()` call in any component importing client data

2. **Missing Bulk Export Tracking** (High Priority)
   - Not all reporting/export features use `logBulkExport()`
   - **Recommendation**: Add middleware to detect >50 record queries and auto-log

3. **Portal Audit Coverage** (Medium Priority)
   - Client portal actions need consistent audit logging
   - **Recommendation**: Add audit logging middleware to all portal API calls

4. **Authentication Audit** (Low Priority)
   - Login/logout events not consistently tracked
   - **Recommendation**: Supabase Auth triggers can auto-log authentication events

---

## Implementation Checklist

Use this checklist to verify audit logging coverage in new features:

### For New PHI-Access Features:
- [ ] Import `logPHIAccess` from `@/lib/auditLogger`
- [ ] Call `logPHIAccess()` on component mount or data load
- [ ] Include `clientId`, `resourceType`, and descriptive message
- [ ] Add relevant `actionDetails` (e.g., note type, date range)
- [ ] Test that audit log entry appears in `audit_logs` table

### For New Data Modification Features:
- [ ] Import `logDataModification` from `@/lib/auditLogger`
- [ ] Call on successful create/update/delete operations
- [ ] Include `resourceId` of modified record
- [ ] Capture before/after values in `actionDetails` if applicable
- [ ] Set appropriate severity level

### For New Administrative Features:
- [ ] Import `logAdminAction` from `@/lib/auditLogger`
- [ ] Call for user management, role changes, settings updates
- [ ] Use `severity: 'warning'` or `'critical'` for security-sensitive operations
- [ ] Include comprehensive details about the action

---

## Audit Log Retention Policy

Per HIPAA §164.312(b), audit logs must be retained for:
- **Minimum**: 6 years from creation date
- **Recommended**: 7 years for legal protection

**Database Enforcement:**
```sql
-- Automatic archival after 7 years (not deletion)
CREATE TABLE public.audit_logs_archive (LIKE public.audit_logs);

-- Scheduled job to move old logs to archive
-- (Configured in Supabase Edge Function: archive-old-audit-logs)
```

---

## Monitoring & Alerts

### Recommended Monitoring Rules:

1. **Excessive After-Hours Access**: Alert if user accesses >20 PHI records after hours
2. **Bulk Export Alert**: Notify administrator on any `logBulkExport()` call
3. **Critical Access Alert**: Immediate notification on >100 record access
4. **Failed Authentication**: Lock account after 5 failed login attempts in 15 minutes
5. **Permission Change Alert**: Email notification to administrators on any role change

**Implementation**: Edge Function `monitor-suspicious-activity`

---

## Version History

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2025-10-08 | 1.0 | Initial RBAC-Audit Permission Matrix | System |

---

## Related Documentation

- [Client Portal RACI](../raci/CLIENT_PORTAL_RACI.md)
- [Scheduling RACI](../raci/SCHEDULING_RACI.md)
- [Billing RACI](../raci/BILLING_RACI.md)
- [Notes RACI](../raci/NOTES_RACI.md)
- [Governance Assessment Report](../GOVERNANCE_ASSESSMENT_REPORT.md)
- [Security Enhancements](../SECURITY_ENHANCEMENTS_COMPLETE.md)

---

## Quick Reference Commands

**View recent audit logs:**
```sql
SELECT
  al.action_timestamp,
  p.email as user_email,
  al.action_type,
  al.resource_type,
  al.action_description,
  al.severity
FROM audit_logs al
JOIN profiles p ON p.id = al.user_id
ORDER BY al.action_timestamp DESC
LIMIT 50;
```

**Find after-hours access:**
```sql
SELECT * FROM audit_logs
WHERE action_description LIKE '%AFTER HOURS%'
AND action_timestamp > NOW() - INTERVAL '30 days'
ORDER BY action_timestamp DESC;
```

**Monitor bulk exports:**
```sql
SELECT * FROM audit_logs
WHERE action_details->>'exportType' = 'bulk'
AND action_timestamp > NOW() - INTERVAL '7 days';
```

**Failed authentication attempts:**
```sql
SELECT
  user_id,
  COUNT(*) as failed_attempts,
  MAX(action_timestamp) as last_attempt
FROM audit_logs
WHERE action_type = 'authentication_attempt'
AND severity = 'warning'
AND action_timestamp > NOW() - INTERVAL '1 hour'
GROUP BY user_id
HAVING COUNT(*) >= 5;
```
