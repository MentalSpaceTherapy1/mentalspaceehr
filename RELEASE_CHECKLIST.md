# Production Release Checklist

## Purpose

This checklist ensures safe, compliant, and zero-downtime deployments of the MentalSpace EHR system.

**MANDATORY**: All checklist items must be completed before production deployment.

---

## Pre-Release Phase (T-24 Hours)

### 1. Stakeholder Communication

- [ ] **Release announcement sent** (email to all staff)
  - Release version number
  - Deployment window
  - Expected user-facing changes
  - Contact for issues
  - Rollback trigger criteria

- [ ] **Maintenance window scheduled** (if required)
  - Duration estimate
  - Affected services
  - User notification displayed in app
  - Alternative workflow documented

- [ ] **On-call rotation confirmed**
  - Primary on-call engineer identified
  - Secondary backup identified
  - Escalation path documented
  - Contact numbers verified

### 2. Code Review & Testing

- [ ] **All code changes peer-reviewed**
  - Minimum 2 approvals for critical changes
  - Security review for auth/RBAC changes
  - Performance review for database migrations

- [ ] **Automated tests passing**
  - Unit tests: 100% pass rate
  - Integration tests: 100% pass rate
  - E2E tests: 100% pass rate (critical paths)
  - No flaky tests

- [ ] **Security scan completed**
  - Dependency vulnerability scan (npm audit)
  - SAST scan completed (if applicable)
  - No critical or high vulnerabilities
  - Known issues have documented mitigation

- [ ] **Load testing completed** (for performance-critical changes)
  - Baseline performance established
  - Load test scenarios executed
  - No performance regression
  - Capacity limits documented

### 3. Database Preparation

- [ ] **Database backup verified**
  - Full backup completed within last 24 hours
  - Backup restoration tested
  - Backup size and location documented
  - Point-in-time recovery capability confirmed

- [ ] **Migration scripts reviewed**
  - SQL syntax validated
  - Execution plan reviewed
  - Rollback script prepared
  - Estimated execution time documented
  - Large table migrations have batching strategy

- [ ] **Migration dry-run completed** (staging environment)
  - Migration executed successfully
  - No data loss
  - Performance impact measured
  - Application compatible with new schema

- [ ] **Data integrity checks prepared**
  - Pre-migration row counts recorded
  - Post-migration validation queries ready
  - Data quality checks defined

### 4. Configuration & Secrets

- [ ] **Environment variables verified**
  - All required secrets present in production
  - No hardcoded credentials in code
  - Secrets rotation status checked
  - Feature flags configured correctly

- [ ] **External service credentials validated**
  - Email service (Resend) credentials valid
  - SMS service (Twilio) credentials valid
  - Storage service credentials valid
  - Payment processor credentials valid (if applicable)

- [ ] **Third-party service health checked**
  - Supabase status page reviewed
  - Email provider status verified
  - SMS provider status verified
  - CDN status verified

### 5. Monitoring & Observability

- [ ] **Monitoring dashboards prepared**
  - Application metrics dashboard ready
  - Database performance dashboard ready
  - Error rate dashboard ready
  - Business metrics dashboard ready

- [ ] **Alerts configured**
  - Error rate threshold alerts enabled
  - Response time alerts enabled
  - Database connection pool alerts enabled
  - Disk space alerts enabled

- [ ] **Logging verified**
  - Application logs flowing correctly
  - Log retention policy confirmed
  - PII redaction working
  - Log aggregation functioning

### 6. Compliance & Documentation

- [ ] **Release notes prepared**
  - User-facing changes documented
  - Known issues documented
  - Breaking changes highlighted
  - Migration steps for users (if any)

- [ ] **Audit logging verified**
  - Audit events configured for new features
  - PHI access logging confirmed
  - Role changes logged
  - Critical actions logged

- [ ] **HIPAA compliance checked**
  - BAA agreements current with vendors
  - Encryption at rest verified
  - Encryption in transit verified
  - Access controls reviewed

---

## Deployment Phase (T-0)

### 7. Pre-Deployment Verification

- [ ] **Current system health confirmed**
  - All services healthy
  - No active incidents
  - Error rates within normal range
  - Response times within SLA

- [ ] **Final backup taken**
  - Database backup completed
  - Backup timestamp recorded
  - Backup size verified

- [ ] **Deployment window opened**
  - Maintenance mode enabled (if required)
  - User notification banner displayed
  - Non-critical background jobs paused

### 8. Code Deployment

- [ ] **Code deployed to production**
  - Git tag created with version number
  - Code pushed to production branch
  - Build process completed successfully
  - Deployment logs reviewed

- [ ] **Edge functions deployed** (if applicable)
  - Functions compiled successfully
  - Environment variables present
  - Functions responding to requests

### 9. Database Migration

- [ ] **Pre-migration checks completed**
  - Database connection confirmed
  - Row counts recorded
  - Replication lag checked (if applicable)

- [ ] **Migration executed**
  - Migration script run successfully
  - Execution time recorded
  - No errors in migration logs

- [ ] **Post-migration validation**
  - Row counts match expectations
  - Indexes created successfully
  - Foreign key constraints valid
  - Data integrity checks passed

### 10. Post-Deployment Verification

- [ ] **Application health check passed**
  - Health endpoint responding (200 OK)
  - Database connectivity confirmed
  - External service connectivity confirmed

- [ ] **Smoke tests executed**
  - User login successful
  - Critical user flows tested:
    - [ ] Create/view client chart
    - [ ] Create clinical note
    - [ ] Schedule appointment
    - [ ] Process payment (if billing changes)
    - [ ] Send message via portal

- [ ] **Monitoring dashboards reviewed**
  - Error rates normal
  - Response times within SLA
  - Database query performance acceptable
  - No memory leaks detected

- [ ] **Maintenance mode disabled** (if enabled)
  - User notification removed
  - Background jobs resumed
  - Full traffic restored

---

## Post-Deployment Phase (T+15 Minutes)

### 11. Immediate Monitoring

- [ ] **Real-time error monitoring** (first 15 minutes)
  - Error logs reviewed
  - No critical errors
  - Error rate below threshold
  - User-reported issues monitored

- [ ] **Performance monitoring**
  - API response times within SLA
  - Database query performance acceptable
  - CDN hit rates normal
  - Browser console errors checked

- [ ] **User feedback monitoring**
  - Support channels monitored
  - No widespread user complaints
  - Portal access confirmed by test user

### 12. Business Metrics Validation

- [ ] **Critical business flows verified**
  - Appointments being created
  - Notes being saved
  - Billing charges being posted
  - Portal messages being sent/received

- [ ] **Data consistency checks**
  - No orphaned records
  - Foreign keys intact
  - Audit logs being created
  - Timestamps accurate

---

## 24-Hour Post-Release (T+24 Hours)

### 13. Extended Monitoring

- [ ] **24-hour error trends reviewed**
  - Error rate compared to baseline
  - No new error patterns
  - Performance regression analysis

- [ ] **User feedback collected**
  - Support tickets reviewed
  - User satisfaction surveyed (if applicable)
  - Feature adoption measured

- [ ] **Business metrics analyzed**
  - Appointment creation rate normal
  - Note completion rate normal
  - Billing workflow functioning
  - Portal engagement metrics

### 14. Post-Release Review Scheduled (MANDATORY)

⚠️ **ENFORCEMENT**: Post-release reviews are MANDATORY. See [POST_RELEASE_REVIEW_PROCESS.md](docs/processes/POST_RELEASE_REVIEW_PROCESS.md)

- [ ] **72-hour review automatically scheduled** (T+48h)
  - Automated calendar invite sent to stakeholders
  - Review meeting set at exactly T+72h from deployment
  - Participants auto-invited from `release_stakeholders` table:
    - Release manager
    - Engineering lead
    - Operations manager
    - Product owner
    - QA lead
    - Database administrator
    - Security lead

- [ ] **Metrics collection verified**
  - 24-hour metrics captured automatically
  - 48-hour metrics captured automatically
  - 72-hour metrics will capture before review
  - Baseline comparison calculated

- [ ] **Review dashboard accessible**
  - Deployment timeline visible
  - Defect count and severity breakdown
  - User feedback summary from support tickets
  - Performance comparison charts (before/after)
  - Business metrics comparison
  - Action from previous reviews tracked

- [ ] **Release record created in database**
  - Entry exists in `releases` table
  - `review_status` = 'scheduled'
  - `review_scheduled_at` set to T+72h
  - Git commit hash and branch recorded

**Note**: If review not completed by T+96h, status becomes 'overdue' and escalation notifications sent

---

## Rollback Criteria (Decision Tree)

### Immediate Rollback Triggers (T+15 minutes)

- **Critical**: System-wide outage or data loss
- **Critical**: Authentication/authorization failure
- **Critical**: PHI data exposure or security breach
- **Critical**: Billing/payment processing completely broken
- **High**: Error rate >5% of requests
- **High**: Response time >3x baseline
- **High**: Database deadlocks or connection exhaustion

### Delayed Rollback Triggers (T+24 hours)

- **High**: >10 critical user-reported bugs
- **Medium**: Performance degradation affecting >50% of users
- **Medium**: Feature completely unusable for key workflow
- **Low**: Minor UI issues (can be hotfixed instead)

---

## Rollback Procedure

### 1. Declare Rollback Decision

- [ ] **Rollback decision made**
  - Trigger criteria met
  - Rollback approved by release manager
  - Stakeholders notified

- [ ] **Rollback team assembled**
  - On-call engineer engaged
  - Database administrator available
  - Operations manager informed

### 2. Execute Code Rollback

- [ ] **Previous version redeployed**
  - Git checkout previous release tag
  - Code redeployed to production
  - Edge functions rolled back (if needed)

- [ ] **Application health verified**
  - Health endpoint responding
  - Error rate returned to normal
  - Critical flows tested

### 3. Database Rollback (If Required)

⚠️ **CAUTION**: Only rollback database if schema change is incompatible

- [ ] **Rollback script executed**
  - Pre-rollback backup taken
  - Rollback SQL script run
  - Migration table reverted

- [ ] **Data integrity verified**
  - Row counts checked
  - Foreign keys intact
  - No data loss confirmed

- [ ] **Application compatibility confirmed**
  - Application functions with rolled-back schema
  - No errors related to missing columns/tables

### 4. Post-Rollback Verification

- [ ] **System health confirmed**
  - Error rates normal
  - Performance restored
  - User workflows functioning

- [ ] **User communication sent**
  - Rollback announcement
  - Explanation of issue
  - Timeline for fix and redeployment

- [ ] **Rollback recorded in database**
  - `releases.was_rolled_back` set to TRUE
  - `releases.rollback_at` timestamp recorded
  - `releases.rollback_reason` documented
  - Audit log entry created

- [ ] **Emergency post-rollback review scheduled** (MANDATORY)
  - Review must occur within 24 hours of rollback
  - All stakeholders notified immediately
  - Root cause analysis prepared
  - Incident timeline documented
  - Action items assigned for fix and redeployment

- [ ] **Post-mortem scheduled**
  - Root cause analysis meeting set (within 48h)
  - Incident timeline documented
  - Action items assigned
  - Lessons learned captured

---

## Data Backfill Procedures

For releases requiring data backfill (populating new columns, migrating data):

### Before Backfill

- [ ] **Backfill script tested** (staging environment)
  - Script executes successfully
  - Data correctness verified
  - Performance impact measured

- [ ] **Backfill strategy documented**
  - Batch size determined
  - Execution order defined
  - Rollback plan prepared

### During Backfill

- [ ] **Backfill executed**
  - Script run with appropriate batch size
  - Progress monitored
  - Database performance monitored

- [ ] **Backfill verification**
  - Row counts match expectations
  - Null values filled correctly
  - Data quality checks passed

### After Backfill

- [ ] **Backfill logs archived**
  - Execution time recorded
  - Rows affected documented
  - Any errors logged

---

## Compliance Checklist

### HIPAA Compliance

- [ ] **Audit logging verified**
  - PHI access logged
  - User actions logged
  - Audit retention policy followed

- [ ] **Encryption verified**
  - Data at rest encrypted
  - Data in transit uses TLS
  - Backup encryption confirmed

- [ ] **Access controls tested**
  - RLS policies functioning
  - Role-based access enforced
  - Session management working

### Data Integrity

- [ ] **Referential integrity maintained**
  - Foreign keys valid
  - No orphaned records
  - Cascade deletes working correctly

- [ ] **Data validation enforced**
  - Required fields enforced
  - Data type constraints working
  - Business logic validation active

---

## Release Approval Sign-off

Before production deployment, the following stakeholders must sign off:

| Role | Name | Signature | Date | Time |
|------|------|-----------|------|------|
| **Release Manager** | | | | |
| **Engineering Lead** | | | | |
| **Database Administrator** | | | | |
| **Security Lead** | | | | |
| **Product Owner** | | | | |

---

## Appendices

### A. Smoke Test Scripts

Critical user flows to test post-deployment:

```bash
# 1. User Login
# Navigate to /auth
# Enter valid credentials
# Verify redirect to /dashboard
# Expected: 200 OK, user profile visible

# 2. Client Chart Access
# Navigate to /clients
# Click on any client
# Expected: Client chart loads, no console errors

# 3. Create Clinical Note
# Navigate to /notes
# Click "New Progress Note"
# Fill minimal required fields
# Save note
# Expected: Note saved, appears in list

# 4. Schedule Appointment
# Navigate to /schedule
# Click on time slot
# Select client and fill details
# Save appointment
# Expected: Appointment appears on calendar

# 5. Portal Login
# Navigate to /portal/login
# Enter client portal credentials
# Expected: Portal dashboard loads
```

### B. Monitoring Dashboard URLs

- Application Metrics: [View Backend](#) → Analytics
- Error Logs: [View Backend](#) → Edge Function Logs
- Database Performance: [View Backend](#) → Database → Performance
- Audit Logs: [View Backend](#) → Database → Table Editor → audit_logs

### C. Emergency Contacts

| Role | Name | Phone | Email | Availability |
|------|------|-------|-------|--------------|
| On-Call Engineer | | | | 24/7 |
| Database Administrator | | | | Business hours + on-call |
| Security Lead | | | | Business hours + escalation |
| Operations Manager | | | | Business hours |
| Executive Sponsor | | | | Escalation only |

### D. Rollback SQL Template

```sql
-- ROLLBACK SCRIPT TEMPLATE
-- Release Version: [VERSION]
-- Rollback Date: [DATE]
-- Executed By: [USER]

BEGIN;

-- 1. Record rollback action
INSERT INTO audit_logs (user_id, action_type, resource_type, action_description, severity)
VALUES (
  auth.uid(),
  'configuration_change',
  'settings',
  'Database rollback initiated for release [VERSION]',
  'critical'
);

-- 2. Drop new columns (if added)
-- ALTER TABLE table_name DROP COLUMN IF EXISTS new_column_name;

-- 3. Revert data changes (if applicable)
-- UPDATE table_name SET column = old_value WHERE condition;

-- 4. Drop new tables (if added)
-- DROP TABLE IF EXISTS new_table_name CASCADE;

-- 5. Restore old constraints (if modified)
-- ALTER TABLE table_name ADD CONSTRAINT constraint_name ...;

-- 6. Verify rollback
DO $$
BEGIN
  -- Add verification logic here
  RAISE NOTICE 'Rollback verification passed';
END $$;

COMMIT;

-- Post-rollback verification queries
SELECT COUNT(*) FROM critical_table; -- Should match pre-migration count
```

---

**Document Version**: 1.0  
**Last Updated**: 2025-10-08  
**Next Review**: After each major release  
**Owner**: Release Manager
