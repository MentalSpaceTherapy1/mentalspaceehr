# Phase 2 Implementation Plan: Governance & Ownership

**Duration**: Weeks 4-6  
**Focus**: Clear ownership, data governance, continuous improvement

---

## Week 4: RACI Matrix (Core Modules)

### Task 4.1: Document RACI for Scheduling Module

**Goal**: Establish clear ownership for appointment management

**Files to Create**:

1. **Create: `docs/raci/SCHEDULING_RACI.md`**
   ```markdown
   # Scheduling Module RACI Matrix
   
   ## Operations
   
   | Task | Front Desk | Therapist | Supervisor | Administrator | Client |
   |------|-----------|-----------|------------|---------------|---------|
   | **View Schedule** | R,A | R,A | R,A | R,A | I |
   | **Create Appointment** | R,A | R,A | I | I | I |
   | **Cancel Appointment** | R,A | R | C | I | I |
   | **Reschedule Appointment** | R,A | R,A | I | I | I |
   | **Manage Waitlist** | R,A | I | I | I | I |
   | **Send Reminders** | A | I | I | C | I |
   | **Handle No-Shows** | R,A | R | C | I | - |
   | **Blocked Time Management** | C | R,A | C | A | - |
   | **Schedule Reports** | R | I | A | C | - |
   
   **Legend**:
   - R = Responsible (does the work)
   - A = Accountable (decision maker, only one per task)
   - C = Consulted (provides input)
   - I = Informed (kept updated)
   
   ## SLAs
   
   - **Appointment Creation**: <2 minutes
   - **Cancellation Processing**: <5 minutes
   - **Reminder Sending**: 24-48 hours before appointment
   - **No-Show Documentation**: Within 24 hours
   
   ## Escalation Path
   
   1. **Scheduling Conflict**: Front Desk → Therapist → Supervisor
   2. **System Issue**: Front Desk → IT Support → Administrator
   3. **Client Complaint**: Front Desk → Therapist → Clinical Director
   
   ## Handoff Procedures
   
   ### Daily Handoff (End of Business Day)
   - Front desk reviews next day's schedule
   - Flags any incomplete reminders
   - Notifies clinicians of early arrivals
   - Documents any scheduling issues
   
   ### On-Call Coverage
   - Weekend/evening emergency appointments
   - Crisis intervention scheduling
   - Cancellation handling outside business hours
   ```

2. **Implement in Application: `src/pages/admin/RACIManagement.tsx`**
   ```typescript
   import { Card } from '@/components/ui/card';
   import { Table } from '@/components/ui/table';
   
   const SchedulingRACIView = () => {
     const raciData = [
       {
         task: 'View Schedule',
         frontDesk: ['R', 'A'],
         therapist: ['R', 'A'],
         supervisor: ['R', 'A'],
         administrator: ['R', 'A'],
         client: ['I']
       },
       // ... more tasks
     ];
     
     return (
       <Card>
         <h2>Scheduling Module - RACI Matrix</h2>
         <Table>
           <thead>
             <tr>
               <th>Task</th>
               <th>Front Desk</th>
               <th>Therapist</th>
               <th>Supervisor</th>
               <th>Administrator</th>
               <th>Client</th>
             </tr>
           </thead>
           <tbody>
             {raciData.map(row => (
               <tr key={row.task}>
                 <td>{row.task}</td>
                 <td>{row.frontDesk.join(', ')}</td>
                 <td>{row.therapist.join(', ')}</td>
                 <td>{row.supervisor.join(', ')}</td>
                 <td>{row.administrator.join(', ')}</td>
                 <td>{row.client.join(', ')}</td>
               </tr>
             ))}
           </tbody>
         </Table>
       </Card>
     );
   };
   ```

### Task 4.2: Create RACI Matrices for All Core Modules

**Modules to Document**:

1. **Clinical Notes RACI** (`docs/raci/CLINICAL_NOTES_RACI.md`)
   - Note creation, editing, locking
   - Co-signature requirements
   - Unlock request approval
   - Note compliance monitoring

2. **Billing RACI** (`docs/raci/BILLING_RACI.md`)
   - Charge entry creation
   - Claim submission
   - Payment posting
   - Write-offs and adjustments
   - Patient statement generation

3. **Client Portal RACI** (`docs/raci/CLIENT_PORTAL_RACI.md`)
   - Portal account creation
   - Message management
   - Document sharing
   - Appointment requests
   - Assessment assignment

4. **Telehealth RACI** (`docs/raci/TELEHEALTH_RACI.md`)
   - Session setup
   - Technical support
   - Recording management
   - Consent verification
   - Session termination

### Task 4.3: RACI Enforcement in Code

**Goal**: Codify RACI rules in permission system

**Files to Modify**:

1. **Update: `src/lib/roleUtils.ts`**
   ```typescript
   export interface RACIAssignment {
     responsible: AppRole[];
     accountable: AppRole[];
     consulted: AppRole[];
     informed: AppRole[];
   }
   
   export const raciMatrix: Record<string, Record<string, RACIAssignment>> = {
     scheduling: {
       createAppointment: {
         responsible: ['front_desk', 'therapist'],
         accountable: ['front_desk'],
         consulted: [],
         informed: ['supervisor', 'administrator']
       },
       cancelAppointment: {
         responsible: ['front_desk', 'therapist'],
         accountable: ['front_desk'],
         consulted: ['supervisor'],
         informed: ['administrator']
       },
       // ... more tasks
     },
     clinicalNotes: {
       createNote: {
         responsible: ['therapist', 'associate_trainee'],
         accountable: ['therapist'],
         consulted: [],
         informed: ['supervisor']
       },
       cosignNote: {
         responsible: ['supervisor'],
         accountable: ['supervisor'],
         consulted: [],
         informed: ['administrator']
       }
     }
   };
   
   export const hasRACIPermission = (
     roles: AppRole[],
     module: string,
     task: string,
     permissionType: 'responsible' | 'accountable' | 'consulted' | 'informed'
   ): boolean => {
     const assignment = raciMatrix[module]?.[task];
     if (!assignment) return false;
     
     return roles.some(role => assignment[permissionType].includes(role));
   };
   ```

2. **Create: `src/hooks/useRACIPermissions.tsx`**
   ```typescript
   import { useUserRoles } from './useUserRoles';
   import { hasRACIPermission } from '@/lib/roleUtils';
   
   export const useRACIPermissions = (module: string, task: string) => {
     const { roles } = useUserRoles();
     
     return {
       isResponsible: hasRACIPermission(roles, module, task, 'responsible'),
       isAccountable: hasRACIPermission(roles, module, task, 'accountable'),
       isConsulted: hasRACIPermission(roles, module, task, 'consulted'),
       isInformed: hasRACIPermission(roles, module, task, 'informed'),
       canPerform: hasRACIPermission(roles, module, task, 'responsible') || 
                   hasRACIPermission(roles, module, task, 'accountable')
     };
   };
   ```

**Verification**:

- [ ] All 5 core modules have documented RACI matrices
- [ ] RACI visible in admin dashboard
- [ ] Permissions enforce RACI rules
- [ ] Escalation paths documented

---

## Week 5: Data Contract Templates

### Task 5.1: Create Data Contract Framework

**Goal**: Formalize data ownership and quality standards

**Files to Create**:

1. **Create: `DATA_CONTRACT_TEMPLATE.md`**
   ```markdown
   # Data Contract Template
   
   ## Contract Metadata
   - **Table Name**: 
   - **Owner**: 
   - **Created Date**: 
   - **Last Updated**: 
   - **Version**: 
   
   ## Purpose & Scope
   
   ### Business Purpose
   *What business function does this table support?*
   
   ### Data Lineage
   *Where does data come from? Where does it go?*
   ```
   Data Sources:
   - Source 1: [System/Process]
   - Source 2: [User Input]
   
   Data Consumers:
   - Consumer 1: [Report/Dashboard]
   - Consumer 2: [Integration/API]
   ```
   
   ## Schema Definition
   
   | Column | Type | Nullable | Default | Purpose | PII/PHI |
   |--------|------|----------|---------|---------|---------|
   | id | UUID | No | gen_random_uuid() | Primary key | No |
   | created_at | TIMESTAMPTZ | No | NOW() | Record creation | No |
   
   ### Foreign Key Relationships
   
   | Column | References | On Delete | Purpose |
   |--------|-----------|-----------|---------|
   | client_id | clients(id) | CASCADE | Links to client |
   
   ### Indexes
   
   | Index Name | Columns | Type | Purpose |
   |------------|---------|------|---------|
   | idx_table_client | client_id | BTREE | Client lookup |
   
   ## Data Quality Rules
   
   ### Validation Rules
   - Column X must be...
   - Column Y cannot be...
   
   ### Quality Metrics
   - **Completeness**: >99% (non-null for required fields)
   - **Accuracy**: Manual spot-check quarterly
   - **Consistency**: Foreign keys valid
   - **Timeliness**: Updates within 5 minutes
   
   ### Quality Checks (SQL)
   ```sql
   -- Check for orphaned records
   SELECT COUNT(*) FROM table_name t
   LEFT JOIN related_table r ON t.related_id = r.id
   WHERE r.id IS NULL;
   
   -- Check for data outside valid range
   SELECT COUNT(*) FROM table_name
   WHERE value < 0 OR value > 100;
   ```
   
   ## Change Management
   
   ### Breaking Changes
   *Changes that require stakeholder approval and migration plan:*
   - Dropping columns
   - Changing column types
   - Removing constraints
   - Changing RLS policies
   
   ### Non-Breaking Changes
   *Changes that can be made with notification:*
   - Adding nullable columns
   - Adding indexes
   - Adding RLS policies (more restrictive)
   
   ### Change Approval Process
   1. Owner proposes change
   2. Data steward reviews impact
   3. Stakeholders notified (3 business days notice)
   4. Migration plan created and tested
   5. Change implemented in maintenance window
   
   ## SLAs
   
   - **Uptime**: 99.9%
   - **Query Performance**: p95 < 100ms
   - **Data Freshness**: <5 minutes lag
   
   ## Access Control
   
   ### RLS Policies
   - Policy 1: [Description]
   - Policy 2: [Description]
   
   ### Who Can Access
   - Read: [Roles]
   - Write: [Roles]
   - Delete: [Roles]
   
   ## Compliance & Retention
   
   - **PHI/PII**: Yes/No
   - **Retention Period**: [e.g., 7 years]
   - **Deletion Policy**: [e.g., Soft delete, hard delete after retention]
   - **Audit Requirements**: [e.g., All access logged]
   
   ## Support & Contacts
   
   - **Technical Owner**: [Name, Email]
   - **Business Owner**: [Name, Email]
   - **On-Call**: [Rotation/Contact]
   
   ## Version History
   
   | Version | Date | Author | Changes |
   |---------|------|--------|---------|
   | 1.0 | 2025-01-01 | John Doe | Initial creation |
   ```

### Task 5.2: Create Data Contracts for Critical Tables

**Tables to Document**:

1. **`clients` Table Contract** (`docs/data-contracts/CLIENTS_CONTRACT.md`)
   - Owner: Clinical Operations Manager
   - Purpose: Core patient demographics and assignment tracking
   - PHI: Yes (name, DOB, SSN, address, insurance)
   - Retention: 7 years post-discharge (adult), until age 25 (minor)
   - Quality: 100% completeness on required fields

2. **`appointments` Table Contract** (`docs/data-contracts/APPOINTMENTS_CONTRACT.md`)
   - Owner: Scheduling Manager
   - Purpose: Appointment scheduling and tracking
   - Retention: 7 years
   - Quality: No double-bookings, all appointments linked to valid client

3. **`clinical_notes` Table Contract** (`docs/data-contracts/CLINICAL_NOTES_CONTRACT.md`)
   - Owner: Clinical Director
   - Purpose: Clinical documentation and treatment records
   - PHI: Yes (entire content)
   - Retention: 7 years (adult), until age 25 (minor)
   - Quality: 100% of completed appointments have notes within 72 hours

4. **`charge_entries` Table Contract** (`docs/data-contracts/CHARGE_ENTRIES_CONTRACT.md`)
   - Owner: Billing Manager
   - Purpose: Billable services tracking
   - Retention: 10 years (IRS requirement)
   - Quality: All charges have valid CPT code, linked to appointment

5. **`user_roles` Table Contract** (`docs/data-contracts/USER_ROLES_CONTRACT.md`)
   - Owner: Security Administrator
   - Purpose: Role-based access control
   - Retention: 10 years (audit trail)
   - Quality: No user without at least one role, no orphaned role assignments

### Task 5.3: Implement Data Quality Monitoring

**Files to Create**:

1. **Create Edge Function: `supabase/functions/data-quality-check/index.ts`**
   ```typescript
   import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
   
   interface QualityCheck {
     table: string;
     checkName: string;
     query: string;
     threshold: number;
     severity: 'low' | 'medium' | 'high' | 'critical';
   }
   
   const qualityChecks: QualityCheck[] = [
     {
       table: 'clients',
       checkName: 'Missing Required Fields',
       query: `
         SELECT COUNT(*) as count 
         FROM clients 
         WHERE first_name IS NULL 
         OR last_name IS NULL 
         OR date_of_birth IS NULL
       `,
       threshold: 0,
       severity: 'critical'
     },
     {
       table: 'appointments',
       checkName: 'Orphaned Appointments',
       query: `
         SELECT COUNT(*) as count
         FROM appointments a
         WHERE status = 'Completed'
         AND appointment_date < NOW() - INTERVAL '72 hours'
         AND NOT EXISTS (
           SELECT 1 FROM clinical_notes n 
           WHERE n.appointment_id = a.id
         )
       `,
       threshold: 0,
       severity: 'high'
     },
     {
       table: 'charge_entries',
       checkName: 'Invalid CPT Codes',
       query: `
         SELECT COUNT(*) as count
         FROM charge_entries
         WHERE cpt_code NOT IN (
           SELECT code FROM service_codes WHERE is_active = true
         )
       `,
       threshold: 0,
       severity: 'high'
     },
     {
       table: 'user_roles',
       checkName: 'Users Without Roles',
       query: `
         SELECT COUNT(*) as count
         FROM profiles p
         WHERE is_active = true
         AND NOT EXISTS (
           SELECT 1 FROM user_roles ur WHERE ur.user_id = p.id
         )
       `,
       threshold: 0,
       severity: 'critical'
     }
   ];
   
   Deno.serve(async (req) => {
     const supabase = createClient(
       Deno.env.get('SUPABASE_URL')!,
       Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
     );
     
     const results = [];
     
     for (const check of qualityChecks) {
       const { data, error } = await supabase.rpc('execute_quality_check', {
         check_query: check.query
       });
       
       if (error) {
         console.error(`Quality check failed: ${check.checkName}`, error);
         continue;
       }
       
       const count = data?.[0]?.count || 0;
       const passed = count <= check.threshold;
       
       results.push({
         table: check.table,
         checkName: check.checkName,
         passed,
         actualValue: count,
         threshold: check.threshold,
         severity: check.severity
       });
       
       // Alert if failed
       if (!passed && (check.severity === 'critical' || check.severity === 'high')) {
         await supabase.from('notification_logs').insert({
           notification_type: 'data_quality_alert',
           recipient_user_ids: await getDataOwners(check.table),
           subject: `Data Quality Alert: ${check.table} - ${check.checkName}`,
           message: `Found ${count} issues (threshold: ${check.threshold})`,
           priority: check.severity === 'critical' ? 'urgent' : 'high',
           sent_via: ['email', 'in_app']
         });
       }
     }
     
     // Store results
     await supabase.from('data_quality_results').insert({
       check_date: new Date().toISOString(),
       results: results
     });
     
     return new Response(JSON.stringify({ results }), {
       headers: { 'Content-Type': 'application/json' }
     });
   });
   
   async function getDataOwners(table: string): Promise<string[]> {
     // Map tables to owner user IDs
     const ownerMap: Record<string, string[]> = {
       clients: ['clinical-ops-manager-id'],
       appointments: ['scheduling-manager-id'],
       clinical_notes: ['clinical-director-id'],
       charge_entries: ['billing-manager-id'],
       user_roles: ['security-admin-id']
     };
     
     return ownerMap[table] || [];
   }
   ```

2. **Create Database Table for Results**:
   ```sql
   CREATE TABLE IF NOT EXISTS data_quality_results (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     check_date TIMESTAMPTZ NOT NULL,
     results JSONB NOT NULL,
     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
   );
   
   CREATE INDEX idx_dq_check_date ON data_quality_results(check_date DESC);
   ```

3. **Schedule Daily** (in `supabase/config.toml`):
   ```toml
   [functions.data-quality-check]
   schedule = "0 7 * * *"  # Run at 7 AM daily
   ```

**Verification**:

- [ ] All 5 critical tables have data contracts
- [ ] Data quality checks run daily
- [ ] Failures trigger alerts to data owners
- [ ] Quality metrics tracked over time

---

## Week 6: Post-Release Review Process

### Task 6.1: Create Post-Release Review Template

**Files to Create**:

1. **Create: `POST_RELEASE_REVIEW_TEMPLATE.md`**
   ```markdown
   # Post-Release Review: [Release Version]
   
   **Release Date**: [Date]  
   **Deployed By**: [Name]  
   **Review Date**: [72 hours post-release]  
   **Review Facilitator**: [Release Manager]
   
   ## Release Summary
   
   - **Version**: v1.2.3
   - **Changes**: 
     - Feature A
     - Bug fix B
     - Performance improvement C
   - **Deployment Duration**: [X minutes]
   - **Rollback Required**: Yes/No
   
   ## Metrics
   
   ### Defects
   
   | Severity | Count | Examples |
   |----------|-------|----------|
   | P0 (Critical) | 0 | - |
   | P1 (High) | 1 | Users can't save notes on mobile |
   | P2 (Medium) | 3 | Slow loading on client list |
   | P3 (Low) | 5 | UI misalignment |
   
   **Defect Rate**: [X] bugs per feature
   **Escaped Defects**: [Y] bugs found in production (not caught in QA)
   
   ### Performance
   
   | Metric | Baseline | Post-Release | Change |
   |--------|----------|--------------|--------|
   | P95 Response Time | 250ms | 280ms | +12% |
   | Error Rate | 0.5% | 0.6% | +0.1% |
   | Uptime | 99.9% | 99.95% | +0.05% |
   | Page Load Time | 2.1s | 2.0s | -5% |
   
   ### User Impact
   
   | Metric | Count |
   |--------|-------|
   | Support Tickets | 12 |
   | User Complaints | 3 |
   | Feature Adoption | 45% (within 72h) |
   | Session Duration Change | +8% |
   
   ### Business Metrics
   
   | Metric | Baseline | Post-Release | Change |
   |--------|----------|--------------|--------|
   | Appointments Created | 150/day | 165/day | +10% |
   | Notes Completed | 120/day | 125/day | +4% |
   | Portal Logins | 80/day | 95/day | +19% |
   
   ## What Went Well ✅
   
   1. Deployment completed without downtime
   2. Pre-deployment checklist caught 2 critical issues
   3. Rollback plan was tested and ready
   4. Monitoring alerts worked as expected
   
   ## What Didn't Go Well ❌
   
   1. Mobile testing was insufficient
   2. Load testing didn't catch performance regression
   3. User notification sent too late (after deployment)
   
   ## Root Cause Analysis
   
   ### Issue 1: Notes Not Saving on Mobile
   
   - **Root Cause**: Form validation library incompatible with mobile Safari
   - **Why Not Caught**: E2E tests only run on desktop Chrome
   - **Fix**: Added mobile-specific validation
   - **Prevention**: Add mobile Safari to E2E test matrix
   
   ### Issue 2: Performance Regression
   
   - **Root Cause**: Database query missing index
   - **Why Not Caught**: Load test data volume too small
   - **Fix**: Added index on client_id, status
   - **Prevention**: Increase load test data to match production
   
   ## Action Items
   
   | Action | Owner | Due Date | Priority |
   |--------|-------|----------|----------|
   | Add mobile Safari to E2E | QA Lead | 2025-10-15 | High |
   | Increase load test data volume | Performance Engineer | 2025-10-20 | High |
   | Update user notification template | Product Manager | 2025-10-12 | Medium |
   | Document new deployment gotchas | Release Manager | 2025-10-10 | Low |
   
   ## Lessons Learned
   
   1. **Testing**: Mobile compatibility must be part of pre-release checklist
   2. **Communication**: Send user notification 24h before (not day-of)
   3. **Monitoring**: Add alerts for P95 response time (not just error rate)
   4. **Process**: Load test with production-scale data
   
   ## Release Health Score: 7/10
   
   **Breakdown**:
   - Deployment Process: 9/10 (smooth, no downtime)
   - Quality: 6/10 (escaped defects on mobile)
   - Performance: 7/10 (minor regression, quickly fixed)
   - User Impact: 7/10 (some complaints, but positive adoption)
   - Communication: 6/10 (late notification)
   
   ## Recommendations
   
   - [ ] Update release checklist with mobile testing requirement
   - [ ] Schedule mobile-specific testing session for next release
   - [ ] Implement automated performance regression detection
   - [ ] Improve user notification timing
   
   ## Attendees
   
   - [Release Manager]
   - [Engineering Lead]
   - [QA Lead]
   - [Product Owner]
   - [Operations Manager]
   
   **Next Review**: [Date of next release + 72 hours]
   ```

### Task 6.2: Automate Metrics Collection

**Files to Create**:

1. **Create Edge Function: `supabase/functions/collect-release-metrics/index.ts`**
   ```typescript
   import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
   
   Deno.serve(async (req) => {
     const { releaseVersion, releaseDate } = await req.json();
     
     const supabase = createClient(
       Deno.env.get('SUPABASE_URL')!,
       Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
     );
     
     const release72hAgo = new Date(releaseDate);
     release72hAgo.setHours(release72hAgo.getHours() + 72);
     
     // Collect defect metrics
     const { data: defects } = await supabase
       .from('issue_tracker') // Assuming you have this
       .select('severity')
       .gte('created_at', releaseDate)
       .lte('created_at', release72hAgo.toISOString());
     
     const defectCount = {
       p0: defects?.filter(d => d.severity === 'critical').length || 0,
       p1: defects?.filter(d => d.severity === 'high').length || 0,
       p2: defects?.filter(d => d.severity === 'medium').length || 0,
       p3: defects?.filter(d => d.severity === 'low').length || 0
     };
     
     // Collect performance metrics from audit logs or monitoring
     // This would integrate with your monitoring solution
     
     // Collect business metrics
     const { data: apptMetrics } = await supabase
       .from('appointments')
       .select('id')
       .gte('created_date', releaseDate)
       .lte('created_date', release72hAgo.toISOString());
     
     const metrics = {
       releaseVersion,
       releaseDate,
       defects: defectCount,
       totalDefects: Object.values(defectCount).reduce((a, b) => a + b, 0),
       businessMetrics: {
         appointmentsCreated: apptMetrics?.length || 0
       },
       collectedAt: new Date().toISOString()
     };
     
     // Store metrics
     await supabase.from('release_metrics').insert(metrics);
     
     return new Response(JSON.stringify(metrics), {
       headers: { 'Content-Type': 'application/json' }
     });
   });
   ```

2. **Create: `src/components/admin/ReleaseMetricsDashboard.tsx`**
   - Display release health trends over time
   - Show defect rates per release
   - Track action item completion
   - Compare release performance

**Verification**:

- [ ] Post-release review template created
- [ ] Metrics automatically collected
- [ ] Review scheduled within 72h of every deployment
- [ ] Action items tracked to completion

---

## Phase 2 Completion Checklist

### Week 4 Deliverables
- [ ] RACI matrices for all 5 core modules
- [ ] RACI enforcement in permission system
- [ ] RACI visible in admin dashboard
- [ ] Escalation paths documented

### Week 5 Deliverables
- [ ] Data contracts for 5 critical tables
- [ ] Data quality monitoring system
- [ ] Daily quality checks running
- [ ] Quality alerts to data owners

### Week 6 Deliverables
- [ ] Post-release review template
- [ ] Automated metrics collection
- [ ] Release metrics dashboard
- [ ] 72-hour review process established

### Success Metrics
- RACI coverage: 100% of core operations
- Data quality: >99% for critical tables
- Post-release review completion: 100% of releases
- Action item completion rate: >90%

---

**Next Phase**: Week 7-9 (Extended Integrations, Content Pack Versioning)

**Document Version**: 1.0  
**Last Updated**: 2025-10-08  
**Owner**: Operations Manager
