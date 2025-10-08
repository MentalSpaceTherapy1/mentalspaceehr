# Phase 1 Implementation Plan: Foundation & Critical Operations

**Duration**: Weeks 1-3  
**Focus**: Security baseline, deployment safety, critical integrations

---

## Week 1: RBAC Matrix & Audit Framework

### Task 1.1: Enhance Audit Logging System

**Goal**: Implement comprehensive audit event tracking per RBAC matrix

**Files to Create/Modify**:

1. **Create: `src/lib/auditLogger.ts`** (already exists, enhance it)
   - Add missing audit event types
   - Add severity-based logging
   - Add real-time alert triggers for critical events

2. **Create: `src/hooks/useAuditLog.tsx`**
   ```typescript
   // Hook for easy audit logging across components
   import { useAuth } from './useAuth';
   import { logAuditEvent, AuditActionType, AuditResourceType } from '@/lib/auditLogger';
   
   export const useAuditLog = () => {
     const { user } = useAuth();
     
     const logAction = async (
       actionType: AuditActionType,
       resourceType: AuditResourceType,
       description: string,
       details?: Record<string, any>,
       resourceId?: string
     ) => {
       if (!user?.id) return;
       
       await logAuditEvent({
         userId: user.id,
         actionType,
         resourceType,
         resourceId,
         actionDescription: description,
         actionDetails: details,
         severity: getSeverity(actionType, resourceType)
       });
     };
     
     return { logAction };
   };
   ```

3. **Modify: `src/lib/auditLogger.ts`**
   - Add `logBulkExport()` function with supervisor notification
   - Add `logCriticalAccess()` function with real-time alerts
   - Add `logAfterHoursAccess()` function

4. **Create: `src/components/admin/AuditEventViewer.tsx`**
   - Real-time audit log viewer for administrators
   - Filters by severity, action type, user, date range
   - Export functionality for compliance reports

**Database Changes**:

```sql
-- Add indexes for audit log queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity 
ON audit_logs(severity, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type 
ON audit_logs(action_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_resource 
ON audit_logs(resource_type, resource_id);

-- Add table for real-time alert rules
CREATE TABLE IF NOT EXISTS audit_alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name TEXT NOT NULL,
  action_type TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  threshold INTEGER NOT NULL, -- e.g., 50 for "50 PHI access in 1 hour"
  time_window_minutes INTEGER NOT NULL,
  alert_recipients UUID[] NOT NULL, -- user IDs to notify
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE audit_alert_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage alert rules"
ON audit_alert_rules
FOR ALL
USING (has_role(auth.uid(), 'administrator'));

-- Function to check audit alert thresholds
CREATE OR REPLACE FUNCTION check_audit_alerts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  rule RECORD;
  event_count INTEGER;
BEGIN
  -- Check all active alert rules
  FOR rule IN 
    SELECT * FROM audit_alert_rules 
    WHERE is_active = true 
    AND action_type = NEW.action_type
    AND resource_type = NEW.resource_type
  LOOP
    -- Count events in time window
    SELECT COUNT(*) INTO event_count
    FROM audit_logs
    WHERE action_type = rule.action_type
    AND resource_type = rule.resource_type
    AND user_id = NEW.user_id
    AND created_at > NOW() - (rule.time_window_minutes || ' minutes')::INTERVAL;
    
    -- If threshold exceeded, create alert
    IF event_count >= rule.threshold THEN
      -- Insert into notification system or call edge function
      INSERT INTO notification_logs (
        notification_type,
        recipient_user_ids,
        subject,
        message,
        priority,
        sent_via
      ) VALUES (
        'security_alert',
        rule.alert_recipients,
        'Audit Alert: ' || rule.rule_name,
        format('User %s has %s %s events in %s minutes (threshold: %s)',
          NEW.user_id, event_count, rule.action_type, 
          rule.time_window_minutes, rule.threshold),
        'urgent',
        ARRAY['email', 'in_app']
      );
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Trigger to check alerts on audit log insert
CREATE TRIGGER audit_alert_check
AFTER INSERT ON audit_logs
FOR EACH ROW
EXECUTE FUNCTION check_audit_alerts();
```

**Code Integration**:

5. **Add audit logging to all PHI access points**:

   - `src/pages/ClientChart.tsx`: Log when chart is viewed
   ```typescript
   useEffect(() => {
     if (client?.id) {
       logPHIAccess(
         user.id,
         client.id,
         'client_chart',
         `Viewed client chart: ${client.first_name} ${client.last_name}`,
         { view_timestamp: new Date().toISOString() }
       );
     }
   }, [client?.id]);
   ```

   - `src/pages/ClinicalNote.tsx`: Log note views/edits
   - `src/components/documents/DocumentViewer.tsx`: Log document views
   - `src/components/billing/ChargeEntryDialog.tsx`: Log billing access

6. **Add audit logging to administrative actions**:

   - `src/pages/admin/UserManagement.tsx`: Log role assignments
   - `src/components/admin/RoleAssignmentDialog.tsx`: Log role changes
   - `src/pages/admin/PracticeSettings.tsx`: Log configuration changes

**Testing**:

```typescript
// src/__tests__/auditLogger.test.ts
describe('Audit Logger', () => {
  it('should log PHI access with correct severity', async () => {
    await logPHIAccess(testUserId, testClientId, 'client_chart', 'Test access');
    // Verify log entry created with severity='info'
  });
  
  it('should trigger alert on excessive PHI access', async () => {
    // Simulate 51 chart views in 1 hour
    for (let i = 0; i < 51; i++) {
      await logPHIAccess(testUserId, testClientId, 'client_chart', `Access ${i}`);
    }
    // Verify alert was triggered
  });
  
  it('should log role changes with critical severity', async () => {
    await logAdminAction(adminId, 'role_assignment', 'Assigned administrator role');
    // Verify severity='critical'
  });
});
```

**Verification Checklist**:

- [ ] All PHI access triggers audit events
- [ ] Critical actions have severity='critical'
- [ ] Audit logs include IP address and user_agent
- [ ] Alert rules can be configured via admin UI
- [ ] Excessive access triggers real-time alerts
- [ ] Audit logs cannot be deleted (only viewed)

---

### Task 1.2: Create RBAC Permission Verification

**Goal**: Implement permission checking at component and API level

**Files to Create**:

1. **Create: `src/hooks/usePermissions.tsx`**
   ```typescript
   import { useUserRoles } from './useUserRoles';
   import { hasRole, canManageUsers } from '@/lib/roleUtils';
   
   export const usePermissions = () => {
     const { roles, isLoading } = useUserRoles();
     
     const permissions = {
       // Client Management
       canViewAllClients: hasRole(roles, 'administrator') || 
                          hasRole(roles, 'supervisor') ||
                          hasRole(roles, 'front_desk'),
       canCreateClient: hasRole(roles, 'administrator') || 
                        hasRole(roles, 'front_desk'),
       canEditClient: hasRole(roles, 'administrator') || 
                      hasRole(roles, 'front_desk'),
       canDeactivateClient: hasRole(roles, 'administrator'),
       canExportClientData: hasRole(roles, 'administrator'),
       
       // Clinical Notes
       canCreateNote: hasRole(roles, 'administrator') ||
                      hasRole(roles, 'supervisor') ||
                      hasRole(roles, 'therapist') ||
                      hasRole(roles, 'associate_trainee'),
       canLockNote: hasRole(roles, 'administrator') ||
                    hasRole(roles, 'supervisor') ||
                    hasRole(roles, 'therapist'),
       canUnlockNote: hasRole(roles, 'administrator') ||
                      hasRole(roles, 'supervisor'),
       canCosignNote: hasRole(roles, 'administrator') ||
                      hasRole(roles, 'supervisor'),
       
       // Billing
       canViewBilling: hasRole(roles, 'administrator') ||
                       hasRole(roles, 'billing_staff'),
       canCreateCharge: hasRole(roles, 'administrator') ||
                        hasRole(roles, 'billing_staff'),
       canWriteOff: hasRole(roles, 'administrator') ||
                    hasRole(roles, 'billing_staff'),
       
       // User Management
       canManageUsers: hasRole(roles, 'administrator'),
       canAssignRoles: hasRole(roles, 'administrator'),
       canViewAuditLogs: hasRole(roles, 'administrator'),
       
       // System
       canAccessAdmin: hasRole(roles, 'administrator'),
       canModifySettings: hasRole(roles, 'administrator')
     };
     
     return { permissions, isLoading };
   };
   ```

2. **Create: `src/components/admin/PermissionGate.tsx`**
   ```typescript
   import { usePermissions } from '@/hooks/usePermissions';
   import { ReactNode } from 'react';
   
   interface PermissionGateProps {
     permission: keyof ReturnType<typeof usePermissions>['permissions'];
     children: ReactNode;
     fallback?: ReactNode;
   }
   
   export const PermissionGate = ({ 
     permission, 
     children, 
     fallback = null 
   }: PermissionGateProps) => {
     const { permissions, isLoading } = usePermissions();
     
     if (isLoading) return null;
     
     return permissions[permission] ? <>{children}</> : <>{fallback}</>;
   };
   ```

3. **Usage in components**:
   ```typescript
   // Hide features based on permissions
   <PermissionGate permission="canExportClientData">
     <Button onClick={handleExport}>Export Client List</Button>
   </PermissionGate>
   
   // Show different UI based on role
   <PermissionGate 
     permission="canManageUsers"
     fallback={<p>Access Denied</p>}
   >
     <UserManagementPanel />
   </PermissionGate>
   ```

**Edge Function for Server-Side Verification**:

4. **Create: `supabase/functions/verify-permission/index.ts`**
   ```typescript
   import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
   
   Deno.serve(async (req) => {
     const supabase = createClient(
       Deno.env.get('SUPABASE_URL')!,
       Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
     );
     
     const authHeader = req.headers.get('Authorization');
     const { data: { user }, error } = await supabase.auth.getUser(
       authHeader?.replace('Bearer ', '')
     );
     
     if (error || !user) {
       return new Response(JSON.stringify({ error: 'Unauthorized' }), {
         status: 401
       });
     }
     
     const { permission, resourceId } = await req.json();
     
     // Check user roles
     const { data: roles } = await supabase
       .from('user_roles')
       .select('role')
       .eq('user_id', user.id);
     
     const hasPermission = await checkPermission(
       roles?.map(r => r.role) || [],
       permission,
       user.id,
       resourceId
     );
     
     return new Response(
       JSON.stringify({ hasPermission }),
       { headers: { 'Content-Type': 'application/json' } }
     );
   });
   
   async function checkPermission(
     roles: string[],
     permission: string,
     userId: string,
     resourceId?: string
   ): Promise<boolean> {
     // Implement permission logic
     // Example: Check if user can edit specific client
     if (permission === 'edit_client' && resourceId) {
       // Check if user is assigned to client
       // ... implementation
     }
     
     return false;
   }
   ```

**Verification**:

- [ ] Permission gates hide unauthorized UI elements
- [ ] API calls verify permissions server-side
- [ ] Permission denied shows appropriate error message
- [ ] Audit logs record permission checks

---

### Task 1.3: Implement Automated Compliance Checks

**Goal**: Daily automated checks for compliance violations

**Files to Create**:

1. **Create Edge Function: `supabase/functions/daily-compliance-check/index.ts`**
   ```typescript
   import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
   
   Deno.serve(async (req) => {
     const supabase = createClient(
       Deno.env.get('SUPABASE_URL')!,
       Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
     );
     
     const violations = [];
     
     // Check 1: Unsigned associate notes >7 days
     const { data: unsignedNotes } = await supabase
       .from('clinical_notes')
       .select('id, client_id, clinician_id, created_date')
       .eq('requires_cosignature', true)
       .is('cosigned_by', null)
       .lt('created_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
     
     if (unsignedNotes && unsignedNotes.length > 0) {
       violations.push({
         type: 'unsigned_associate_notes',
         count: unsignedNotes.length,
         severity: 'high',
         notes: unsignedNotes
       });
     }
     
     // Check 2: Excessive PHI access
     const { data: excessiveAccess } = await supabase.rpc(
       'check_excessive_phi_access',
       { hours: 1, threshold: 50 }
     );
     
     if (excessiveAccess && excessiveAccess.length > 0) {
       violations.push({
         type: 'excessive_phi_access',
         users: excessiveAccess,
         severity: 'critical'
       });
     }
     
     // Check 3: Orphaned appointments (no notes)
     const { data: orphanedAppts } = await supabase
       .from('appointments')
       .select('id, client_id, clinician_id, appointment_date')
       .eq('status', 'Completed')
       .is('note_id', null)
       .lt('appointment_date', new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString());
     
     if (orphanedAppts && orphanedAppts.length > 0) {
       violations.push({
         type: 'orphaned_appointments',
         count: orphanedAppts.length,
         severity: 'medium',
         appointments: orphanedAppts
       });
     }
     
     // Send notifications if violations found
     if (violations.length > 0) {
       // Send to administrators
       const { data: admins } = await supabase
         .from('user_roles')
         .select('user_id')
         .eq('role', 'administrator');
       
       // Create notifications
       for (const admin of admins || []) {
         await supabase.from('notification_logs').insert({
           notification_type: 'compliance_alert',
           recipient_user_ids: [admin.user_id],
           subject: `Daily Compliance Check: ${violations.length} Violations`,
           message: JSON.stringify(violations),
           priority: 'urgent',
           sent_via: ['email', 'in_app']
         });
       }
     }
     
     return new Response(
       JSON.stringify({ violations, timestamp: new Date().toISOString() }),
       { headers: { 'Content-Type': 'application/json' } }
     );
   });
   ```

2. **Create Database Functions**:
   ```sql
   -- Function to check excessive PHI access
   CREATE OR REPLACE FUNCTION check_excessive_phi_access(
     hours INTEGER,
     threshold INTEGER
   )
   RETURNS TABLE (
     user_id UUID,
     access_count BIGINT,
     user_email TEXT
   )
   LANGUAGE sql
   SECURITY DEFINER
   AS $$
     SELECT 
       al.user_id,
       COUNT(*) as access_count,
       p.email as user_email
     FROM audit_logs al
     JOIN profiles p ON p.id = al.user_id
     WHERE al.action_type = 'phi_access'
     AND al.created_at > NOW() - (hours || ' hours')::INTERVAL
     GROUP BY al.user_id, p.email
     HAVING COUNT(*) > threshold
     ORDER BY access_count DESC;
   $$;
   ```

3. **Schedule via Supabase Cron** (in `supabase/config.toml`):
   ```toml
   [functions.daily-compliance-check]
   schedule = "0 6 * * *"  # Run at 6 AM daily
   ```

**Verification**:

- [ ] Compliance check runs daily at 6 AM
- [ ] Violations are logged and sent to admins
- [ ] False positives are minimized
- [ ] Can manually trigger compliance check

---

## Week 2: Release Checklist & Rollback Procedures

### Task 2.1: Create Pre-Flight Test Suite

**Goal**: Automated smoke tests before deployment

**Files to Create**:

1. **Create: `tests/smoke/critical-paths.spec.ts`** (E2E tests)
   ```typescript
   import { test, expect } from '@playwright/test';
   
   test.describe('Critical Path Smoke Tests', () => {
     test('User can log in', async ({ page }) => {
       await page.goto('/auth');
       await page.fill('input[type="email"]', 'test@example.com');
       await page.fill('input[type="password"]', 'password123');
       await page.click('button[type="submit"]');
       await expect(page).toHaveURL('/dashboard');
     });
     
     test('User can view client chart', async ({ page }) => {
       await page.goto('/clients');
       await page.click('text=John Doe');
       await expect(page).toHaveURL(/\/clients\/[a-f0-9-]+/);
       await expect(page.locator('h1')).toContainText('John Doe');
     });
     
     test('User can create progress note', async ({ page }) => {
       await page.goto('/notes');
       await page.click('text=New Progress Note');
       // Fill minimal fields
       await page.fill('textarea[name="subjective"]', 'Test subjective');
       await page.click('button:has-text("Save")');
       await expect(page.locator('.toast')).toContainText('Note saved');
     });
     
     test('User can schedule appointment', async ({ page }) => {
       await page.goto('/schedule');
       // Click on time slot
       await page.click('[data-timeslot="2025-10-15T10:00"]');
       // Select client
       await page.selectOption('select[name="client"]', 'client-123');
       await page.click('button:has-text("Schedule")');
       await expect(page.locator('.calendar')).toContainText('John Doe');
     });
   });
   ```

2. **Create: `scripts/pre-deployment-check.sh`**
   ```bash
   #!/bin/bash
   set -e
   
   echo "🔍 Running pre-deployment checks..."
   
   # 1. Run linter
   echo "1. Running linter..."
   npm run lint
   
   # 2. Run type check
   echo "2. Type checking..."
   npm run type-check
   
   # 3. Run unit tests
   echo "3. Running unit tests..."
   npm run test
   
   # 4. Run security audit
   echo "4. Security audit..."
   npm audit --audit-level=high
   
   # 5. Check for console.logs in production code
   echo "5. Checking for console.logs..."
   if grep -r "console\\.log" src/ --exclude-dir=__tests__; then
     echo "❌ Found console.log statements in production code"
     exit 1
   fi
   
   # 6. Verify environment variables
   echo "6. Checking environment variables..."
   node scripts/verify-env.js
   
   # 7. Run smoke tests (if in CI)
   if [ "$CI" = "true" ]; then
     echo "7. Running E2E smoke tests..."
     npm run test:e2e
   fi
   
   echo "✅ All pre-deployment checks passed!"
   ```

3. **Create: `scripts/verify-env.js`**
   ```javascript
   const requiredEnvVars = [
     'VITE_SUPABASE_URL',
     'VITE_SUPABASE_PUBLISHABLE_KEY'
   ];
   
   const requiredSecrets = [
     'RESEND_API_KEY',
     'TWILIO_ACCOUNT_SID',
     'TWILIO_AUTH_TOKEN'
   ];
   
   console.log('Verifying environment configuration...');
   
   let hasErrors = false;
   
   requiredEnvVars.forEach(varName => {
     if (!process.env[varName]) {
       console.error(`❌ Missing environment variable: ${varName}`);
       hasErrors = true;
     }
   });
   
   console.log('⚠️  Note: Supabase secrets must be verified manually:');
   requiredSecrets.forEach(secret => {
     console.log(`   - ${secret}`);
   });
   
   if (hasErrors) {
     process.exit(1);
   }
   
   console.log('✅ Environment configuration verified');
   ```

**Integration with GitHub Actions** (if using):

4. **Create: `.github/workflows/pre-deployment.yml`**
   ```yaml
   name: Pre-Deployment Checks
   
   on:
     push:
       branches: [ main ]
     pull_request:
       branches: [ main ]
   
   jobs:
     pre-deployment:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3
         - uses: actions/setup-node@v3
           with:
             node-version: '18'
         - run: npm ci
         - run: npm run lint
         - run: npm run type-check
         - run: npm test
         - run: npm audit --audit-level=high
         - run: ./scripts/pre-deployment-check.sh
   ```

**Verification**:

- [ ] All smoke tests pass in CI
- [ ] Pre-deployment script catches common issues
- [ ] Environment verification prevents deployment with missing secrets
- [ ] Tests run in <5 minutes

---

### Task 2.2: Create Rollback Procedures

**Goal**: Quick rollback capability for failed deployments

**Files to Create**:

1. **Create: `scripts/rollback.sh`**
   ```bash
   #!/bin/bash
   
   # Usage: ./scripts/rollback.sh <previous-git-tag>
   
   if [ -z "$1" ]; then
     echo "Usage: $0 <git-tag>"
     echo "Example: $0 v1.2.3"
     exit 1
   fi
   
   PREVIOUS_TAG=$1
   
   echo "🔄 Starting rollback to $PREVIOUS_TAG..."
   
   # 1. Confirm rollback
   read -p "Are you sure you want to rollback to $PREVIOUS_TAG? (yes/no): " confirm
   if [ "$confirm" != "yes" ]; then
     echo "Rollback cancelled"
     exit 0
   fi
   
   # 2. Take database backup
   echo "📦 Taking database backup before rollback..."
   # Use Supabase CLI or pg_dump
   # supabase db dump > backup_before_rollback_$(date +%Y%m%d_%H%M%S).sql
   
   # 3. Checkout previous version
   echo "📥 Checking out $PREVIOUS_TAG..."
   git checkout $PREVIOUS_TAG
   
   # 4. Install dependencies
   echo "📦 Installing dependencies..."
   npm ci
   
   # 5. Build
   echo "🔨 Building..."
   npm run build
   
   # 6. Deploy
   echo "🚀 Deploying..."
   # This depends on hosting platform
   # For Lovable Cloud, just push to git
   git push origin HEAD:main --force
   
   echo "✅ Rollback complete"
   echo "⚠️  Database rollback must be done manually if schema changed"
   ```

2. **Create: `ROLLBACK_PLAYBOOK.md`**
   ```markdown
   # Rollback Playbook
   
   ## When to Rollback
   
   Immediate rollback if:
   - System-wide outage (>50% of users affected)
   - Data loss or corruption detected
   - Security breach or PHI exposure
   - Authentication completely broken
   
   ## Rollback Procedure
   
   ### 1. Declare Rollback
   - Notify on-call team in Slack/Teams
   - Update status page
   
   ### 2. Code Rollback
   ```bash
   # Find previous release tag
   git tag -l | tail -5
   
   # Rollback to previous version
   ./scripts/rollback.sh v1.2.3
   ```
   
   ### 3. Database Rollback (if needed)
   ```sql
   -- Only if schema change is breaking
   -- Review migration rollback script
   BEGIN;
   
   -- Drop new columns/tables
   ALTER TABLE table_name DROP COLUMN new_column;
   
   -- Verify
   SELECT COUNT(*) FROM critical_table;
   
   COMMIT;
   ```
   
   ### 4. Verify System Health
   - [ ] Health endpoint returns 200
   - [ ] Users can log in
   - [ ] Critical workflows functional
   - [ ] Error rate <2%
   
   ### 5. Post-Rollback
   - [ ] Update status page
   - [ ] Send user communication
   - [ ] Schedule post-mortem
   ```

**Verification**:

- [ ] Rollback script tested in staging
- [ ] Team trained on rollback procedure
- [ ] Rollback can complete in <5 minutes
- [ ] Database rollback scripts prepared

---

## Week 3: Integration Runbooks (Critical Services)

### Task 3.1: Email Service Health Monitoring

**Goal**: Proactive monitoring of email delivery

**Files to Create**:

1. **Create Edge Function: `supabase/functions/check-email-health/index.ts`**
   ```typescript
   import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
   
   Deno.serve(async (req) => {
     const supabase = createClient(
       Deno.env.get('SUPABASE_URL')!,
       Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
     );
     
     // Check email delivery rate in last 24 hours
     const { data: emailStats } = await supabase
       .from('appointment_notifications')
       .select('status')
       .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
     
     const total = emailStats?.length || 0;
     const sent = emailStats?.filter(e => e.status === 'sent').length || 0;
     const failed = emailStats?.filter(e => e.status === 'failed').length || 0;
     
     const deliveryRate = total > 0 ? (sent / total) * 100 : 100;
     
     const health = {
       status: deliveryRate >= 95 ? 'healthy' : deliveryRate >= 90 ? 'degraded' : 'critical',
       deliveryRate,
       total,
       sent,
       failed,
       timestamp: new Date().toISOString()
     };
     
     // Alert if unhealthy
     if (health.status === 'critical') {
       // Trigger alert to on-call
       await supabase.rpc('send_critical_alert', {
         alert_type: 'email_delivery_critical',
         message: `Email delivery rate is ${deliveryRate.toFixed(2)}% (threshold: 95%)`
       });
     }
     
     return new Response(JSON.stringify(health), {
       headers: { 'Content-Type': 'application/json' }
     });
   });
   ```

2. **Schedule health check** (in `supabase/config.toml`):
   ```toml
   [functions.check-email-health]
   schedule = "*/15 * * * *"  # Every 15 minutes
   ```

3. **Create: `src/components/admin/IntegrationHealthDashboard.tsx`**
   - Display real-time integration health
   - Show email delivery rate
   - Show SMS delivery rate
   - Show storage health
   - Show telehealth session success rate

**Verification**:

- [ ] Health check runs every 15 minutes
- [ ] Alerts trigger when delivery rate <95%
- [ ] Dashboard shows real-time health status

---

### Task 3.2: Integration Failure Simulation Tests

**Goal**: Verify error handling for integration failures

**Files to Create**:

1. **Create: `tests/integration/email-failure.spec.ts`**
   ```typescript
   import { test, expect } from '@playwright/test';
   
   test.describe('Email Failure Handling', () => {
     test('should handle invalid API key gracefully', async ({ page }) => {
       // Mock edge function to return 401
       await page.route('**/functions/v1/send-appointment-reminder', route => {
         route.fulfill({
           status: 401,
           body: JSON.stringify({ error: 'Invalid API key' })
         });
       });
       
       // Trigger email send
       await page.goto('/schedule');
       await page.click('button:has-text("Send Reminder")');
       
       // Verify error shown to user
       await expect(page.locator('.toast')).toContainText('Failed to send reminder');
       
       // Verify email logged as failed
       // ... check database
     });
     
     test('should retry on rate limit', async ({ page }) => {
       let attempts = 0;
       await page.route('**/functions/v1/send-appointment-reminder', route => {
         attempts++;
         if (attempts < 3) {
           route.fulfill({ status: 429, body: 'Rate limit exceeded' });
         } else {
           route.fulfill({ status: 200, body: '{"success": true}' });
         }
       });
       
       await page.click('button:has-text("Send Reminder")');
       
       // Verify retry logic worked
       expect(attempts).toBe(3);
       await expect(page.locator('.toast')).toContainText('Reminder sent');
     });
   });
   ```

**Verification**:

- [ ] All failure scenarios have tests
- [ ] Error messages are user-friendly
- [ ] Failures are logged for debugging
- [ ] Retries work with exponential backoff

---

## Phase 1 Completion Checklist

### Week 1 Deliverables
- [ ] Audit logging enhanced with severity levels
- [ ] Real-time alert system for critical events
- [ ] Automated daily compliance checks
- [ ] RBAC permission verification in UI
- [ ] Permission gates on all sensitive features

### Week 2 Deliverables
- [ ] Pre-deployment smoke test suite
- [ ] Rollback scripts and playbook
- [ ] Environment verification scripts
- [ ] CI/CD integration (if applicable)

### Week 3 Deliverables
- [ ] Email service health monitoring
- [ ] SMS service health monitoring
- [ ] Integration failure tests
- [ ] Admin dashboard for integration health

### Success Metrics
- Audit log coverage: 100% of PHI access
- Deployment confidence: Pre-flight tests pass
- Rollback capability: <5 minute recovery time
- Integration visibility: Real-time health dashboard

---

**Next Phase**: Week 4-6 (RACI Matrices, Data Contracts, Post-Release Reviews)

**Document Version**: 1.0  
**Last Updated**: 2025-10-08  
**Owner**: Engineering Lead
