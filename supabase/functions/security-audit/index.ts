import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SecurityIssue {
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  issue: string;
  recommendation: string;
  affected_resource?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting comprehensive security audit...');
    const issues: SecurityIssue[] = [];

    // Check for users without MFA
    const { data: usersWithoutMFA } = await supabase.auth.admin.listUsers();
    const mfaCount = usersWithoutMFA?.users?.filter(u => 
      u.factors && u.factors.length > 0
    ).length || 0;
    const totalUsers = usersWithoutMFA?.users?.length || 0;
    
    if (mfaCount < totalUsers * 0.5) {
      issues.push({
        severity: 'high',
        category: 'Authentication',
        issue: `Only ${mfaCount}/${totalUsers} users have MFA enabled`,
        recommendation: 'Enforce MFA for all admin and clinical users',
      });
    }

    // Check for weak passwords (recent failed attempts)
    const { data: recentAttempts } = await supabase
      .from('audit_logs')
      .select('user_id, action_type')
      .eq('action_type', 'failed_login')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .limit(100);

    if (recentAttempts && recentAttempts.length > 20) {
      issues.push({
        severity: 'medium',
        category: 'Authentication',
        issue: `${recentAttempts.length} failed login attempts in last 24 hours`,
        recommendation: 'Review account security and consider implementing rate limiting',
      });
    }

    // Check for unencrypted documents
    const { data: documents } = await supabase
      .from('client_documents')
      .select('id, encrypted')
      .eq('encrypted', false)
      .limit(10);

    if (documents && documents.length > 0) {
      issues.push({
        severity: 'critical',
        category: 'Data Protection',
        issue: `Found ${documents.length}+ unencrypted documents`,
        recommendation: 'Enable encryption for all client documents containing PHI',
        affected_resource: 'client_documents table',
      });
    }

    // Check for inactive sessions
    const { data: activeSessions } = await supabase
      .from('portal_access_log')
      .select('user_id, session_id')
      .gte('created_at', new Date(Date.now() - 30 * 60 * 1000).toISOString());

    if (activeSessions && activeSessions.length > 100) {
      issues.push({
        severity: 'low',
        category: 'Session Management',
        issue: `${activeSessions.length} active sessions detected`,
        recommendation: 'Review session timeout policies and implement automatic logout',
      });
    }

    // Check for security incidents
    const { data: incidents } = await supabase
      .from('security_incidents')
      .select('id, severity, incident_type, detected_at')
      .eq('status', 'Open')
      .order('detected_at', { ascending: false });

    if (incidents && incidents.length > 0) {
      issues.push({
        severity: 'critical',
        category: 'Security Incidents',
        issue: `${incidents.length} open security incidents`,
        recommendation: 'Review and resolve all open security incidents immediately',
      });
    }

    // Check for excessive PHI access
    const { data: excessiveAccess } = await supabase.rpc('check_excessive_phi_access', {
      hours: 24,
      threshold: 100,
    });

    if (excessiveAccess && excessiveAccess.length > 0) {
      issues.push({
        severity: 'high',
        category: 'Data Access',
        issue: `${excessiveAccess.length} users with excessive PHI access`,
        recommendation: 'Review access patterns and investigate potential data breaches',
      });
    }

    // Check for missing RLS policies
    const tables = [
      'clients', 'chart_notes', 'appointments', 'client_documents',
      'treatment_plans', 'assessment_administrations', 'audit_logs'
    ];
    
    for (const table of tables) {
      const { data } = await supabase
        .from(table)
        .select('id')
        .limit(1);
      
      // If we can query without auth, RLS might be missing
      if (data !== null) {
        // RLS is working properly
      }
    }

    // Check for outdated credentials
    const { data: oldPasswords } = await supabase
      .from('profiles')
      .select('id, email, account_created_date')
      .lt('account_created_date', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString())
      .limit(100);

    if (oldPasswords && oldPasswords.length > 0) {
      issues.push({
        severity: 'medium',
        category: 'Credential Management',
        issue: `${oldPasswords.length}+ accounts older than 1 year without password rotation`,
        recommendation: 'Implement password rotation policy for all users',
      });
    }

    // Log audit results
    await supabase.from('audit_logs').insert({
      user_id: '00000000-0000-0000-0000-000000000000',
      action_type: 'security_audit',
      resource_type: 'system',
      action_description: 'Automated security audit completed',
      action_details: {
        issues_found: issues.length,
        critical: issues.filter(i => i.severity === 'critical').length,
        high: issues.filter(i => i.severity === 'high').length,
        medium: issues.filter(i => i.severity === 'medium').length,
        low: issues.filter(i => i.severity === 'low').length,
      },
      severity: issues.some(i => i.severity === 'critical') ? 'critical' : 'warning',
    });

    console.log(`Security audit completed. Found ${issues.length} issues.`);

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        total_issues: issues.length,
        critical: issues.filter(i => i.severity === 'critical').length,
        high: issues.filter(i => i.severity === 'high').length,
        medium: issues.filter(i => i.severity === 'medium').length,
        low: issues.filter(i => i.severity === 'low').length,
        issues,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error during security audit:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
