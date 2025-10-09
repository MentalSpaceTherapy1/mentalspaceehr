# RACI Matrix: Client Portal Module

## Purpose
This RACI matrix defines roles and responsibilities for the client-facing portal, ensuring secure PHI access, proper authentication, and HIPAA-compliant patient engagement.

## Legend
- **R** (Responsible): Person who performs the work
- **A** (Accountable): Person ultimately answerable for the task
- **C** (Consulted): People whose input is sought
- **I** (Informed): People who be kept up-to-date

---

## 1. Portal Access & Authentication

### Create Portal Account

| Task | Client | Front Desk | Therapist | Administrator | Billing |
|------|--------|------------|-----------|---------------|---------|
| Request portal access | R | I | I | A | - |
| Verify client identity | - | R | C | A | - |
| Create portal credentials | Auto | R | - | A | - |
| Send invitation email | Auto | R | - | A | - |
| Complete registration | R | I | - | I | - |
| Set up MFA (optional) | R | - | - | I | - |

**Code Enforcement:**
- Edge Function: `create-portal-user`
- Verification: MRN + DOB match required
- Component: `src/pages/admin/PortalManagement.tsx`
- Security: Email verification mandatory

### Manage Portal Login

| Task | Client | Front Desk | Therapist | Administrator | Billing |
|------|--------|------------|-----------|---------------|---------|
| Login to portal | R | - | - | - | - |
| Reset forgotten password | R | C | - | A | - |
| Enable/disable MFA | R | - | - | C | - |
| Lock account (security) | - | - | - | R | - |
| Unlock account | - | C | - | R | - |

**Code Enforcement:**
- Failed login tracking (5 attempts = lockout)
- Session timeout: 15 minutes
- Password requirements: 12+ characters, complexity
- Table: `portal_access_log`

---

## 2. Health Information Access

### View Medical Records

| Task | Client | Front Desk | Therapist | Administrator | Billing |
|------|--------|------------|-----------|---------------|---------|
| Access own health records | R | - | - | A | - |
| View clinical notes | R | - | C | A | - |
| View treatment plans | R | - | C | A | - |
| View assessments | R | - | C | A | - |
| Download records | R | - | - | A | - |
| Request record correction | R | C | C | A | - |

**Code Enforcement:**
- Component: `src/pages/portal/PortalRecords.tsx`
- Audit: All PHI access logged (`logPHIAccess()`)
- Filter: Only client's own records visible
- PDF generation: Secure document download

### View Appointment History

| Task | Client | Front Desk | Therapist | Administrator | Billing |
|------|--------|------------|-----------|---------------|---------|
| View past appointments | R | - | - | - | - |
| View upcoming appointments | R | - | - | - | - |
| View appointment notes | R | - | C | A | - |
| Download appointment summary | R | - | - | A | - |

**Code Enforcement:**
- Shows: Date, time, provider, status
- Excludes: Internal clinical notes (unless approved)
- RLS: `portal_user_id = auth.uid()`

---

## 3. Appointment Management

### Request Appointment

| Task | Client | Front Desk | Therapist | Administrator | Billing |
|------|--------|------------|-----------|---------------|---------|
| View available slots | R | - | - | - | - |
| Select preferred time | R | - | - | - | - |
| Submit appointment request | R | I | I | A | - |
| Review request | - | R | C | A | - |
| Approve/schedule appointment | - | R | C | A | - |
| Receive confirmation | R | - | - | I | - |

**Code Enforcement:**
- Component: `src/components/portal/RequestAppointmentDialog.tsx`
- Status: Pending → Approved/Denied
- Notifications: Auto-email on status change
- Integration: Links to main scheduling system

### Request Appointment Change

| Task | Client | Front Desk | Therapist | Administrator | Billing |
|------|--------|------------|-----------|---------------|---------|
| View current appointments | R | - | - | - | - |
| Request reschedule | R | I | I | A | - |
| Provide reschedule reason | R | I | - | - | - |
| Review change request | - | R | C | A | - |
| Approve/process change | - | R | C | A | - |
| Confirm new time | R | - | - | I | - |

**Code Enforcement:**
- Component: `src/components/portal/RequestAppointmentChangeDialog.tsx`
- Policy: 24-hour notice preferred
- Cancellation fees: Applied per practice policy

### Cancel Appointment

| Task | Client | Front Desk | Therapist | Administrator | Billing |
|------|--------|------------|-----------|---------------|---------|
| Initiate cancellation | R | I | I | A | - |
| Provide cancellation reason | R | I | - | - | - |
| Process cancellation | - | R | C | A | - |
| Apply cancellation fee | - | R | - | A | I |
| Receive confirmation | R | - | - | I | - |

**Code Enforcement:**
- Component: `src/components/portal/CancelAppointmentDialog.tsx`
- Fee policy: < 24 hours = fee applies
- Status update: Appointment marked 'Cancelled by Client'

---

## 4. Secure Messaging

### Send Message to Provider

| Task | Client | Front Desk | Therapist | Administrator | Billing |
|------|--------|------------|-----------|---------------|---------|
| Compose message | R | - | - | - | - |
| Send to assigned therapist | R | - | I | A | - |
| Receive message notification | - | - | R | I | - |
| Read message | - | - | R | - | - |
| Reply to message | - | - | R | A | - |
| Close message thread | - | - | R | A | I |

**Code Enforcement:**
- Table: `portal_messages`
- Encryption: PHI-protected messaging
- Component: `src/components/portal/ComposeMessageDialog.tsx`
- Notifications: Email alerts for new messages
- Audit: All messages logged

### Receive Messages from Staff

| Task | Client | Front Desk | Therapist | Administrator | Billing |
|------|--------|------------|-----------|---------------|---------|
| Receive message notification | R | - | - | - | - |
| Read message in portal | R | - | - | - | - |
| Reply to staff message | R | - | I | A | - |
| Mark as read | R | - | - | - | - |
| Archive message | R | - | - | - | - |

**Code Enforcement:**
- Email notification with portal link (no PHI in email)
- Read receipts: Tracking message delivery
- Retention: Messages archived after 1 year

---

## 5. Forms & Assessments

### Complete Assessment Forms

| Task | Client | Front Desk | Therapist | Administrator | Billing |
|------|--------|------------|-----------|---------------|---------|
| Assign form to client | - | C | R | A | - |
| Receive form notification | R | - | - | I | - |
| Complete assessment | R | - | - | - | - |
| Submit completed form | R | - | I | A | - |
| Review responses | - | - | R | A | - |
| Score assessment | Auto | - | C | A | - |

**Code Enforcement:**
- Forms: PHQ-9, GAD-7, custom intake forms
- Component: Portal form renderer
- Scoring: Automatic calculation
- Integration: Links to clinical_assessments table

### Track Progress

| Task | Client | Front Desk | Therapist | Administrator | Billing |
|------|--------|------------|-----------|---------------|---------|
| View assessment history | R | - | - | - | - |
| See score trends | R | - | C | A | - |
| Add tracker entries | R | - | - | - | - |
| View progress graphs | R | - | C | A | - |
| Share progress with therapist | R | - | I | A | - |

**Code Enforcement:**
- Component: `src/pages/portal/PortalProgress.tsx`
- Visualization: Charts for mood, symptoms tracking
- Privacy: Client controls what's shared

---

## 6. Billing & Payments

### View Account Balance

| Task | Client | Front Desk | Therapist | Administrator | Billing |
|------|--------|------------|-----------|---------------|---------|
| View current balance | R | - | - | - | C |
| View payment history | R | - | - | - | C |
| View insurance claims | R | - | - | - | C |
| Download statements | R | - | - | - | C |

**Code Enforcement:**
- Component: Portal billing section
- Security: Payment information encrypted
- History: Full transaction history visible

### Make Online Payment

| Task | Client | Front Desk | Therapist | Administrator | Billing |
|------|--------|------------|-----------|---------------|---------|
| Select payment amount | R | - | - | - | I |
| Enter payment method | R | - | - | - | I |
| Process payment | R | - | - | A | I |
| Receive receipt | R | - | - | I | I |
| Update account balance | Auto | - | - | - | R |

**Code Enforcement:**
- Integration: Stripe payment processor
- PCI compliance: No card data stored locally
- Receipt: Auto-generated PDF receipt
- Posting: Automatic payment posting to account

### Request Payment Plan

| Task | Client | Front Desk | Therapist | Administrator | Billing |
|------|--------|------------|-----------|---------------|---------|
| Submit payment plan request | R | I | - | A | I |
| Review financial situation | - | - | - | C | R |
| Approve/deny plan | - | - | - | C | R |
| Set up installments | - | - | - | - | R |
| Track plan payments | R | - | - | - | R |

**Code Enforcement:**
- Workflow: Request → Review → Approval → Setup
- Tracking: Installment payment schedule
- Automation: Auto-charge for scheduled payments

---

## 7. Documents & Resources

### Access Educational Materials

| Task | Client | Front Desk | Therapist | Administrator | Billing |
|------|--------|------------|-----------|---------------|---------|
| Browse resource library | R | - | C | A | - |
| Download materials | R | - | - | - | - |
| View recommended resources | R | - | C | A | - |
| Provide feedback | R | - | I | I | - |

**Code Enforcement:**
- Component: `src/pages/portal/PortalResources.tsx`
- Table: `portal_resources`
- Categories: Educational articles, worksheets, videos
- Assignment: Therapist can assign specific resources

### Upload/Share Documents

| Task | Client | Front Desk | Therapist | Administrator | Billing |
|------|--------|------------|-----------|---------------|---------|
| Upload document | R | - | I | A | - |
| Add document description | R | - | - | - | - |
| Share with provider | R | - | I | A | - |
| Review uploaded docs | - | - | R | A | - |
| Download client documents | - | - | R | A | - |

**Code Enforcement:**
- File types: PDF, JPG, PNG only
- Size limit: 10MB per file
- Scanning: Malware scan on upload
- Storage: Supabase Storage with encryption

---

## 8. Privacy & Security

### Manage Privacy Settings

| Task | Client | Front Desk | Therapist | Administrator | Billing |
|------|--------|------------|-----------|---------------|---------|
| View privacy settings | R | - | - | C | - |
| Control data sharing | R | - | C | A | - |
| Set notification preferences | R | - | - | - | - |
| Manage authorized users | R | - | C | A | - |
| Request data deletion | R | - | C | A | - |

**Code Enforcement:**
- Component: `src/components/portal/profile/SecuritySettingsSection.tsx`
- Preferences: Email, SMS notification controls
- HIPAA: Right to access, amend, delete PHI

### Monitor Account Activity

| Task | Client | Front Desk | Therapist | Administrator | Billing |
|------|--------|------------|-----------|---------------|---------|
| View login history | R | - | - | C | - |
| See active sessions | R | - | - | C | - |
| Terminate sessions | R | - | - | C | - |
| Report suspicious activity | R | I | I | A | - |
| Review access log | R | - | - | A | - |

**Code Enforcement:**
- Table: `portal_access_log`
- Shows: Login time, IP address, device type
- Security: Ability to revoke all sessions
- Alerts: Email on new device login

---

## Escalation Path

1. **Portal Technical Issue** → Client → Front Desk → System Administrator
2. **Account Access Problem** → Client → Front Desk → Administrator
3. **Privacy Concern** → Client → Therapist → Compliance Officer
4. **Billing Question** → Client → Billing Staff → Billing Manager
5. **Clinical Question** → Client → Therapist → Clinical Supervisor

---

## Key Contacts

| Role | Primary Contact | Backup Contact |
|------|----------------|----------------|
| Portal Support | Front Desk | System Administrator |
| Clinical Questions | Assigned Therapist | Clinical Supervisor |
| Billing Support | Billing Staff | Billing Manager |
| Technical Issues | System Administrator | IT Support |
| Privacy/Security | Compliance Officer | Administrator |

---

## Revision History

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2025-01-09 | 1.0 | Initial RACI matrix for client portal | System |

---

## Quick Reference: Who Can Do What?

| Action | Client | Front Desk | Therapist | Admin | Billing |
|--------|--------|------------|-----------|-------|---------|
| Login to portal | ✅ | ❌ | ❌ | ❌ | ❌ |
| View own records | ✅ | ❌ | ✅ (assigned) | ✅ | ❌ |
| Request appointment | ✅ | ✅ (on behalf) | ❌ | ✅ | ❌ |
| Send secure message | ✅ | ❌ | ✅ | ✅ | ❌ |
| Complete assessments | ✅ | ❌ | ❌ | ❌ | ❌ |
| Make payment | ✅ | ✅ (on behalf) | ❌ | ✅ | ✅ |
| View billing | ✅ (own) | ❌ | ❌ | ✅ | ✅ |
| Upload documents | ✅ | ❌ | ✅ | ✅ | ❌ |
| Manage portal access | ❌ | ✅ (create) | ❌ | ✅ | ❌ |
| Reset password | ✅ (own) | ✅ (assist) | ❌ | ✅ | ❌ |
