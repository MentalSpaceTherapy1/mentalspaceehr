# RACI Matrix: Clinical Notes Module

## Purpose
This RACI matrix defines roles and responsibilities for clinical documentation, ensuring proper accountability for note creation, review, co-signature, and compliance.

## Legend
- **R** (Responsible): Person who performs the work
- **A** (Accountable): Person ultimately answerable for the task
- **C** (Consulted): People whose input is sought
- **I** (Informed): People who are kept up-to-date

---

## 1. Note Creation & Documentation

### Create Progress Note

| Task | Therapist | Associate Trainee | Supervisor | Psychiatrist | Administrator | Billing Staff |
|------|-----------|-------------------|------------|--------------|---------------|---------------|
| Conduct session | R | R | - | R | - | - |
| Document session | R | R | - | R | - | - |
| Select CPT codes | R | R | C | R | C | I |
| Select diagnosis codes | R | R | C | R | - | I |
| Sign and lock note | R | - | C | R | A | I |
| Request co-signature (if trainee) | - | R | I | - | A | - |

**Code Enforcement:**
- File: `src/pages/ProgressNote.tsx`
- Table: `clinical_notes`
- Status flow: Draft → Signed → Locked → Billed
- Required fields: session_date, duration, cpt_code, diagnosis_codes

### Create Intake Assessment

| Task | Therapist | Associate Trainee | Supervisor | Psychiatrist | Administrator | Billing Staff |
|------|-----------|-------------------|------------|--------------|---------------|---------------|
| Conduct intake session | R | R | - | R | - | - |
| Complete assessment form | R | R | - | R | - | - |
| Document presenting problem | R | R | - | R | - | - |
| Assess risk factors | R | R | C | R | A | - |
| Develop initial treatment plan | R | R | C | R | A | - |
| Review for completeness | - | C | R | - | A | - |

**Code Enforcement:**
- File: `src/pages/IntakeAssessment.tsx`
- Components: Mental Status Exam, Safety Assessment, Diagnostic Formulation
- Required: All sections must be completed before submission
- Trigger: `validate_intake_completeness()`

### Create Treatment Plan

| Task | Therapist | Associate Trainee | Supervisor | Psychiatrist | Administrator | Billing Staff |
|------|-----------|-------------------|------------|--------------|---------------|---------------|
| Develop treatment goals | R | R | C | R | A | - |
| Define interventions | R | R | C | R | A | - |
| Set measurable objectives | R | R | C | R | A | - |
| Establish timeline | R | R | C | R | A | - |
| Review and approve | - | C | R | - | A | - |
| Update as needed | R | R | C | R | A | I |

**Code Enforcement:**
- File: `src/pages/TreatmentPlan.tsx`
- Table: `treatment_plans`
- SMART goals validation
- Review frequency tracking

---

## 2. Note Review & Co-Signature

### Co-Sign Trainee Note

| Task | Therapist | Associate Trainee | Supervisor | Psychiatrist | Administrator | Billing Staff |
|------|-----------|-------------------|------------|--------------|---------------|---------------|
| Submit note for review | - | R | I | - | I | - |
| Review clinical content | - | - | R | - | A | - |
| Request revisions | - | C | R | - | A | - |
| Make requested changes | - | R | I | - | I | - |
| Approve and co-sign | - | - | R | - | A | I |
| Track co-sign metrics | - | - | R | - | A | I |

**Code Enforcement:**
- File: `src/components/supervision/CosignNoteDialog.tsx`
- Table: `note_cosignatures`
- Status: Pending → Revisions Requested → Approved
- SLA: 48-hour review requirement
- Edge Function: `cosignature-workflow`

### Request Note Revisions

| Task | Therapist | Associate Trainee | Supervisor | Psychiatrist | Administrator | Billing Staff |
|------|-----------|-------------------|------------|--------------|---------------|---------------|
| Review note quality | - | - | R | - | A | - |
| Document revision needs | - | - | R | - | A | - |
| Notify trainee | - | I | R | - | A | - |
| Address revisions | - | R | C | - | I | - |
| Re-submit for approval | - | R | I | - | I | - |
| Verify corrections | - | - | R | - | A | - |

**Code Enforcement:**
- Component: `src/components/supervision/RequestRevisionsDialog.tsx`
- Field: `revisions_requested` (JSON array)
- Notification: Automatic email to trainee
- Tracking: Revision history logged

---

## 3. Note Types & Templates

### Select Note Template

| Task | Therapist | Associate Trainee | Supervisor | Psychiatrist | Administrator | Billing Staff |
|------|-----------|-------------------|------------|--------------|---------------|---------------|
| Browse available templates | R | R | - | R | - | - |
| Select appropriate template | R | R | C | R | A | - |
| Customize template content | R | R | C | R | - | - |
| Save as note | R | R | - | R | A | - |

**Code Enforcement:**
- Table: `note_templates`
- Templates: Progress Note, Intake, Treatment Plan, Consultation, Contact, Termination
- Template engine: Variable substitution
- Version control: Template versioning system

### Generate AI-Assisted Note

| Task | Therapist | Associate Trainee | Supervisor | Psychiatrist | Administrator | Billing Staff |
|------|-----------|-------------------|------------|--------------|---------------|---------------|
| Record session (if enabled) | R | R | - | R | - | - |
| Review AI-generated draft | R | R | C | R | A | - |
| Edit and finalize | R | R | C | R | A | - |
| Verify clinical accuracy | R | R | C | R | A | - |
| Sign completed note | R | - | C | R | A | I |

**Code Enforcement:**
- Edge Function: `generate-clinical-note`
- AI Provider: OpenAI GPT-4
- Review: Human-in-loop required
- Compliance: AI disclosure required
- Settings: Admin controlled (can disable)

---

## 4. Note Locking & Compliance

### Lock Note for Billing

| Task | Therapist | Associate Trainee | Supervisor | Psychiatrist | Administrator | Billing Staff |
|------|-----------|-------------------|------------|--------------|---------------|---------------|
| Complete note | R | R | - | R | - | - |
| Verify all fields complete | R | R | C | R | A | - |
| Sign note | R | - | C | R | A | - |
| Lock for billing | R | - | C | R | A | I |
| Notify billing team | Auto | Auto | - | Auto | - | I |

**Code Enforcement:**
- Field: `locked_at` timestamp
- Status: `is_locked = true`
- Trigger: Prevents further edits
- Rule: Locked notes cannot be modified (audit trail preserved)

### Unlock Note (Emergency)

| Task | Therapist | Associate Trainee | Supervisor | Psychiatrist | Administrator | Billing Staff |
|------|-----------|-------------------|------------|--------------|---------------|---------------|
| Request unlock | R | - | R | R | - | - |
| Provide justification | R | - | R | R | - | - |
| Review unlock request | - | - | C | - | R | C |
| Approve/deny unlock | - | - | C | - | R | I |
| Make required edits | R | - | R | R | - | - |
| Re-lock note | R | - | R | R | A | I |

**Code Enforcement:**
- Table: `note_unlock_requests`
- Component: `src/components/compliance/UnlockRequestDialog.tsx`
- Status: Pending → Approved → Completed
- Audit: All unlock actions logged
- Edge Function: `sunday-lockout` (auto-lock notes on Sundays)

---

## 5. Note Addendums & Corrections

### Create Note Addendum

| Task | Therapist | Associate Trainee | Supervisor | Psychiatrist | Administrator | Billing Staff |
|------|-----------|-------------------|------------|--------------|---------------|---------------|
| Identify need for addendum | R | R | - | R | - | - |
| Create addendum note | R | R | - | R | A | - |
| Reference original note | R | R | - | R | - | - |
| Document reason | R | R | - | R | A | - |
| Link to original | Auto | Auto | - | Auto | - | I |

**Code Enforcement:**
- Field: `addendum_to_note_id` (foreign key)
- Type: `note_type = 'addendum'`
- Display: Shows linked to original note
- Preserve: Original note remains unchanged

### Correct Note Error

| Task | Therapist | Associate Trainee | Supervisor | Psychiatrist | Administrator | Billing Staff |
|------|-----------|-------------------|------------|--------------|---------------|---------------|
| Identify error | R | R | R | R | R | R |
| Unlock if needed | - | - | C | - | R | - |
| Make correction | R | - | C | R | - | - |
| Document correction reason | R | - | C | R | A | - |
| Re-lock note | R | - | C | R | A | I |
| Notify affected parties | Auto | Auto | - | Auto | - | I |

**Code Enforcement:**
- Field: `correction_history` (JSON)
- Audit: All changes tracked
- Compliance: Error corrections documented
- Billing impact: Flag if billing affected

---

## 6. Incident-to Billing Compliance

### Verify Incident-to Eligibility

| Task | Therapist | Associate Trainee | Supervisor | Psychiatrist | Administrator | Billing Staff |
|------|-----------|-------------------|------------|--------------|---------------|---------------|
| Document qualifying visit | R | - | - | R | A | - |
| Verify 30-day window | - | - | - | R | A | C |
| Link subsequent visits | R | R | - | R | A | I |
| Monitor compliance | - | - | R | - | A | R |
| Generate compliance report | - | - | - | - | A | R |

**Code Enforcement:**
- Edge Function: `verify-incident-to-compliance`
- Rules: Initial visit by MD/DO, subsequent within 30 days
- Validation: Automatic compliance checking
- Reports: Incident-to audit reports
- Component: `src/components/billing/IncidentToBillingReport.tsx`

---

## 7. Note Documentation Standards

### Ensure Documentation Quality

| Task | Therapist | Associate Trainee | Supervisor | Psychiatrist | Administrator | Billing Staff |
|------|-----------|-------------------|------------|--------------|---------------|---------------|
| Follow documentation standards | R | R | C | R | A | - |
| Use approved abbreviations | R | R | C | R | - | - |
| Document medical necessity | R | R | C | R | A | C |
| Include treatment response | R | R | C | R | A | - |
| Track clinical outcomes | R | R | C | R | A | I |

**Standards Enforced:**
- Required sections per note type
- Minimum documentation length
- Medical necessity language
- Treatment plan alignment
- Progress tracking

### Monitor Documentation Timeliness

| Task | Therapist | Associate Trainee | Supervisor | Psychiatrist | Administrator | Billing Staff |
|------|-----------|-------------------|------------|--------------|---------------|---------------|
| Complete notes timely | R | R | - | R | A | - |
| Track completion status | - | - | R | - | A | R |
| Send reminder notifications | Auto | Auto | Auto | Auto | - | - |
| Escalate overdue notes | - | - | R | - | A | - |
| Generate compliance reports | - | - | R | - | A | R |

**Code Enforcement:**
- SLA: Notes due within 24 hours of session
- Notifications: Automatic reminders
- Dashboard: Overdue notes tracking
- Reports: Compliance metrics

---

## 8. Note Amendments & Versioning

### Amend Note (Pre-Lock)

| Task | Therapist | Associate Trainee | Supervisor | Psychiatrist | Administrator | Billing Staff |
|------|-----------|-------------------|------------|--------------|---------------|---------------|
| Edit draft note | R | R | - | R | - | - |
| Review changes | R | R | C | R | A | - |
| Save updated version | R | R | - | R | - | - |

**Code Enforcement:**
- Status: Only `status = 'draft'` notes editable
- Versioning: Change history preserved
- Autosave: Every 30 seconds

### View Note History

| Task | Therapist | Associate Trainee | Supervisor | Psychiatrist | Administrator | Billing Staff |
|------|-----------|-------------------|------------|--------------|---------------|---------------|
| Access note history | R | R | R | R | R | C |
| Compare versions | R | R | R | R | R | - |
| View audit trail | - | - | R | - | R | C |
| Export history | - | - | C | - | R | C |

**Code Enforcement:**
- All changes logged in `clinical_notes_history`
- View component shows diff between versions
- Audit trail includes: who, when, what changed

---

## 9. Note Review & Quality Assurance

### Conduct Note Review

| Task | Therapist | Associate Trainee | Supervisor | Psychiatrist | Administrator | Billing Staff |
|------|-----------|-------------------|------------|--------------|---------------|---------------|
| Select notes for review | - | - | R | - | A | - |
| Review clinical content | - | - | R | - | A | - |
| Assess documentation quality | - | - | R | - | A | - |
| Provide feedback | - | C | R | - | A | - |
| Track review metrics | - | - | R | - | A | I |

**Code Enforcement:**
- Random sampling for quality review
- Metrics: Documentation completeness, clinical accuracy
- Feedback loop to clinicians

### Monitor Co-Signature Compliance

| Task | Therapist | Associate Trainee | Supervisor | Psychiatrist | Administrator | Billing Staff |
|------|-----------|-------------------|------------|--------------|---------------|---------------|
| Track pending co-signatures | - | I | R | - | A | I |
| Monitor turnaround time | - | - | R | - | A | I |
| Escalate overdue reviews | - | - | R | - | A | I |
| Generate compliance reports | - | - | R | - | A | R |

**Code Enforcement:**
- Dashboard: Pending co-signatures by supervisor
- SLA: 48-hour co-signature requirement
- Alerts: Automatic escalation for overdue
- Component: `src/components/supervision/CosignMetricsDashboard.tsx`

---

## 10. Compliance & Auditing

### Track Note Access (PHI Audit)

| Task | Therapist | Associate Trainee | Supervisor | Psychiatrist | Administrator | Billing Staff |
|------|-----------|-------------------|------------|--------------|---------------|---------------|
| Log all note access | Auto | Auto | Auto | Auto | Auto | Auto |
| Review access logs | - | - | C | - | R | - |
| Investigate anomalies | - | - | C | - | R | - |
| Generate audit reports | - | - | - | - | R | C |

**Code Enforcement:**
- Table: `audit_logs`
- Function: `logPHIAccess()` called on every note view
- Logged: user_id, note_id, timestamp, action
- Reports: PHI access audit trail

### Validate Billing Compliance

| Task | Therapist | Associate Trainee | Supervisor | Psychiatrist | Administrator | Billing Staff |
|------|-----------|-------------------|------------|--------------|---------------|---------------|
| Verify CPT-diagnosis match | R | R | C | R | A | R |
| Check medical necessity | R | R | C | R | A | R |
| Validate time documentation | R | R | C | R | A | R |
| Ensure modifier usage | R | R | C | R | - | R |
| Pre-bill compliance check | - | - | - | - | A | R |

**Code Enforcement:**
- Validation: CPT codes must have supporting diagnosis
- Time tracking: Duration must be documented
- Modifiers: Automatic modifier suggestions
- Edge Function: `check-compliance`

---

## Escalation Path

1. **Note Quality Issue** → Clinician → Supervisor → Clinical Director
2. **Co-signature Delay** → Trainee → Supervisor → Administrator
3. **Compliance Violation** → Supervisor → Compliance Officer → Administrator
4. **System/Technical Issue** → Help Desk → IT Support → System Administrator
5. **Billing Dispute** → Billing Staff → Billing Manager → Administrator

---

## Key Contacts

| Role | Primary Contact | Backup Contact |
|------|----------------|----------------|
| Clinical Documentation Authority | Clinical Supervisor | Medical Director |
| Co-Signature Management | Designated Supervisor | Backup Supervisor |
| Compliance & Audit | Compliance Officer | Administrator |
| Technical Issues | System Administrator | IT Support |
| Billing Questions | Billing Manager | Senior Billing Staff |

---

## Revision History

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2025-01-09 | 1.0 | Initial RACI matrix for clinical notes | System |

---

## Implementation Notes

### Database Tables Referenced
- `clinical_notes` - Core note records
- `note_cosignatures` - Co-signature tracking
- `note_unlock_requests` - Unlock request workflow
- `note_templates` - Template library
- `clinical_notes_history` - Version control
- `audit_logs` - PHI access tracking
- `supervision_relationships` - Supervisor assignments

### Key Functions
- `logPHIAccess()` - Audit logging
- `validate_intake_completeness()` - Intake validation
- `check_cosignature_required()` - Co-sign rules
- `lock_note_for_billing()` - Note locking

### Edge Functions
- `generate-clinical-note` - AI note generation
- `cosignature-workflow` - Co-signature automation
- `sunday-lockout` - Automatic note locking
- `verify-incident-to-compliance` - Billing compliance
- `check-compliance` - General compliance checking

---

## Quick Reference: Who Can Do What?

| Action | Therapist | Trainee | Supervisor | Psychiatrist | Admin | Billing |
|--------|-----------|---------|------------|--------------|-------|---------|
| Create note | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Sign note | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| Co-sign trainee note | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Lock note | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| Request unlock | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ |
| Approve unlock | ❌ | ❌ | ✅ (review) | ❌ | ✅ | ❌ |
| View all notes | ❌ | ❌ | ✅ (supervisees) | ❌ | ✅ | ✅ (for billing) |
| Generate AI note | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Create addendum | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Audit access logs | ❌ | ❌ | ✅ (limited) | ❌ | ✅ | ❌ |
