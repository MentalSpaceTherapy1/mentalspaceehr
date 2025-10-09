import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ComplianceViolation {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  count?: number;
  description: string;
  data?: any;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting daily compliance check...');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const violations: ComplianceViolation[] = [];

    // Check 1: Unsigned associate notes >7 days old
    console.log('Checking for unsigned associate notes...');
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: unsignedNotes } = await supabase
      .from('clinical_notes')
      .select('id, client_id, clinician_id, created_date')
      .eq('requires_cosignature', true)
      .is('cosigned_by', null)
      .lt('created_date', sevenDaysAgo.toISOString());

    if (unsignedNotes && unsignedNotes.length > 0) {
      console.log(`Found ${unsignedNotes.length} unsigned notes`);
      violations.push({
        type: 'unsigned_associate_notes',
        severity: 'high',
        count: unsignedNotes.length,
        description: `${unsignedNotes.length} associate notes require co-signature (>7 days old)`,
        data: unsignedNotes.slice(0, 10) // Include first 10 for details
      });
    }

    // Check 2: Excessive PHI access in last hour
    console.log('Checking for excessive PHI access...');
    const { data: excessiveAccess } = await supabase
      .rpc('check_excessive_phi_access', { hours: 1, threshold: 50 });

    if (excessiveAccess && excessiveAccess.length > 0) {
      console.log(`Found ${excessiveAccess.length} users with excessive PHI access`);
      violations.push({
        type: 'excessive_phi_access',
        severity: 'critical',
        count: excessiveAccess.length,
        description: `${excessiveAccess.length} users exceeded PHI access threshold (50 in 1 hour)`,
        data: excessiveAccess
      });
    }

    // Check 3: Orphaned appointments (completed but no note)
    console.log('Checking for orphaned appointments...');
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const { data: orphanedAppts } = await supabase
      .from('appointments')
      .select('id, client_id, clinician_id, appointment_date, appointment_type')
      .eq('status', 'Completed')
      .lt('appointment_date', twoDaysAgo.toISOString().split('T')[0])
      .is('note_id', null)
      .limit(100);

    if (orphanedAppts && orphanedAppts.length > 0) {
      console.log(`Found ${orphanedAppts.length} orphaned appointments`);
      violations.push({
        type: 'orphaned_appointments',
        severity: 'medium',
        count: orphanedAppts.length,
        description: `${orphanedAppts.length} completed appointments missing clinical notes (>48 hours)`,
        data: orphanedAppts.slice(0, 10)
      });
    }

    // Check 4: Stale user accounts (no login >90 days)
    console.log('Checking for stale user accounts...');
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const { data: staleAccounts } = await supabase
      .from('profiles')
      .select('id, email, last_login_date, is_active')
      .eq('is_active', true)
      .lt('last_login_date', ninetyDaysAgo.toISOString())
      .limit(50);

    if (staleAccounts && staleAccounts.length > 0) {
      console.log(`Found ${staleAccounts.length} stale accounts`);
      violations.push({
        type: 'stale_user_accounts',
        severity: 'medium',
        count: staleAccounts.length,
        description: `${staleAccounts.length} active accounts with no login in 90+ days`,
        data: staleAccounts.map(a => ({ id: a.id, email: a.email, lastLogin: a.last_login_date }))
      });
    }

    // Check 5: Users without roles
    console.log('Checking for users without roles...');
    const { data: usersWithoutRoles } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        is_active,
        user_roles!left(role)
      `)
      .eq('is_active', true)
      .is('user_roles.role', null);

    if (usersWithoutRoles && usersWithoutRoles.length > 0) {
      console.log(`Found ${usersWithoutRoles.length} users without roles`);
      violations.push({
        type: 'users_without_roles',
        severity: 'critical',
        count: usersWithoutRoles.length,
        description: `${usersWithoutRoles.length} active users have no assigned roles`,
        data: usersWithoutRoles.map(u => ({ id: u.id, email: u.email }))
      });
    }

    console.log(`Compliance check complete. Found ${violations.length} violation types.`);

    // Send notifications if violations found
    if (violations.length > 0) {
      console.log('Sending compliance alert notifications...');
      
      // Get all administrators
      const { data: adminRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'administrator');

      const adminIds = adminRoles?.map(r => r.user_id) || [];

      if (adminIds.length > 0) {
        // Create summary message
        const criticalCount = violations.filter(v => v.severity === 'critical').length;
        const highCount = violations.filter(v => v.severity === 'high').length;
        
        const summary = `Daily Compliance Check Results:\n\n` +
          `Critical Issues: ${criticalCount}\n` +
          `High Priority Issues: ${highCount}\n` +
          `Total Issues: ${violations.length}\n\n` +
          violations.map(v => `- ${v.description}`).join('\n');

        // Insert notification
        await supabase.from('notification_logs').insert({
          notification_type: 'compliance_alert',
          recipient_user_ids: adminIds,
          subject: `Daily Compliance Report: ${violations.length} Issues Found`,
          message: summary,
          priority: criticalCount > 0 ? 'urgent' : 'high',
          sent_via: ['email', 'in_app']
        });

        console.log(`Notification sent to ${adminIds.length} administrators`);
      }
    } else {
      console.log('No compliance violations found.');
    }

    return new Response(
      JSON.stringify({
        success: true,
        violations,
        timestamp: new Date().toISOString(),
        summary: {
          total: violations.length,
          critical: violations.filter(v => v.severity === 'critical').length,
          high: violations.filter(v => v.severity === 'high').length,
          medium: violations.filter(v => v.severity === 'medium').length,
          low: violations.filter(v => v.severity === 'low').length
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Compliance check error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
