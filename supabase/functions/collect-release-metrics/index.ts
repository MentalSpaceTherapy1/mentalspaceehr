import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReleaseMetrics {
  release_id: string;
  release_date: string;
  collected_at: string;
  deployment_metrics: {
    duration_minutes: number;
    pre_checks_passed: number;
    pre_checks_total: number;
    critical_paths_tested: number;
    critical_paths_total: number;
  };
  stability_metrics: {
    uptime_percentage: number;
    error_rate: number;
    avg_response_time_ms: number;
    db_query_time_ms: number;
    edge_function_failures: number;
  };
  user_impact: {
    active_users: number;
    user_reported_issues: number;
    support_tickets: number;
  };
  data_quality: {
    checks_passed: number;
    checks_total: number;
    completeness_percentage: number;
    rls_violations: number;
  };
  security: {
    linter_warnings: number;
    failed_auth_attempts: number;
    suspicious_access_patterns: number;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { release_id, release_date } = await req.json();

    if (!release_id) {
      throw new Error('release_id is required');
    }

    console.log(`Collecting metrics for release: ${release_id}`);

    // Collect deployment metrics (from recent deployment logs)
    const deploymentMetrics = {
      duration_minutes: 0, // Would be populated from CI/CD logs
      pre_checks_passed: 0,
      pre_checks_total: 0,
      critical_paths_tested: 0,
      critical_paths_total: 0,
    };

    // Collect stability metrics (last 48 hours)
    const fortyEightHoursAgo = new Date();
    fortyEightHoursAgo.setHours(fortyEightHoursAgo.getHours() - 48);

    // Get integration health data
    const { data: healthLogs } = await supabaseClient
      .from('integration_health_logs')
      .select('*')
      .gte('checked_at', fortyEightHoursAgo.toISOString())
      .order('checked_at', { ascending: false });

    const totalHealthChecks = healthLogs?.length || 0;
    const healthyChecks = healthLogs?.filter(log => log.status === 'healthy').length || 0;
    const avgResponseTime = healthLogs?.reduce((sum, log) => sum + log.response_time_ms, 0) / totalHealthChecks || 0;

    // Get error rate from audit logs
    const { count: totalAuditEvents } = await supabaseClient
      .from('audit_logs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', fortyEightHoursAgo.toISOString());

    const { count: errorEvents } = await supabaseClient
      .from('audit_logs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', fortyEightHoursAgo.toISOString())
      .eq('severity', 'critical');

    const errorRate = totalAuditEvents ? (errorEvents || 0) / totalAuditEvents : 0;

    const stabilityMetrics = {
      uptime_percentage: totalHealthChecks > 0 ? (healthyChecks / totalHealthChecks) * 100 : 100,
      error_rate: errorRate,
      avg_response_time_ms: Math.round(avgResponseTime),
      db_query_time_ms: 0, // Would need separate DB performance tracking
      edge_function_failures: 0, // Would need edge function monitoring
    };

    // Collect user impact metrics
    const { count: activeUsers } = await supabaseClient
      .from('audit_logs')
      .select('user_id', { count: 'exact', head: true })
      .gte('created_at', fortyEightHoursAgo.toISOString());

    const { count: userIssues } = await supabaseClient
      .from('audit_logs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', fortyEightHoursAgo.toISOString())
      .in('action_type', ['error_reported', 'issue_logged']);

    const { count: supportTickets } = await supabaseClient
      .from('client_portal_messages')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', fortyEightHoursAgo.toISOString())
      .eq('priority', 'urgent');

    const userImpact = {
      active_users: activeUsers || 0,
      user_reported_issues: userIssues || 0,
      support_tickets: supportTickets || 0,
    };

    // Collect data quality metrics
    const { data: qualityResults } = await supabaseClient
      .from('data_quality_results')
      .select('*')
      .gte('checked_at', fortyEightHoursAgo.toISOString())
      .order('checked_at', { ascending: false })
      .limit(100);

    // Get latest results per check
    const latestQualityResults = qualityResults?.reduce((acc, result) => {
      if (!acc[result.check_name] || new Date(result.checked_at) > new Date(acc[result.check_name].checked_at)) {
        acc[result.check_name] = result;
      }
      return acc;
    }, {} as Record<string, any>);

    const qualityChecks = Object.values(latestQualityResults || {});
    const passedChecks = qualityChecks.filter((r: any) => r.passed).length;
    const totalChecks = qualityChecks.length;

    const dataQuality = {
      checks_passed: passedChecks,
      checks_total: totalChecks,
      completeness_percentage: totalChecks > 0 ? (passedChecks / totalChecks) * 100 : 100,
      rls_violations: 0, // Would need specific RLS violation tracking
    };

    // Collect security metrics
    const { count: failedAuth } = await supabaseClient
      .from('audit_logs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', fortyEightHoursAgo.toISOString())
      .eq('action_type', 'failed_login');

    const { count: suspiciousAccess } = await supabaseClient
      .from('audit_logs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', fortyEightHoursAgo.toISOString())
      .eq('severity', 'warning')
      .in('action_type', ['suspicious_access', 'rate_limit_exceeded']);

    const security = {
      linter_warnings: 0, // Would be populated from linter results
      failed_auth_attempts: failedAuth || 0,
      suspicious_access_patterns: suspiciousAccess || 0,
    };

    // Store metrics
    const metrics: ReleaseMetrics = {
      release_id,
      release_date: release_date || new Date().toISOString(),
      collected_at: new Date().toISOString(),
      deployment_metrics: deploymentMetrics,
      stability_metrics: stabilityMetrics,
      user_impact: userImpact,
      data_quality: dataQuality,
      security: security,
    };

    const { error: insertError } = await supabaseClient
      .from('release_metrics')
      .insert(metrics);

    if (insertError) throw insertError;

    console.log(`Metrics collected successfully for release: ${release_id}`);

    // Generate summary
    const summary = {
      release_id,
      overall_health: stabilityMetrics.uptime_percentage >= 99.9 ? 'Excellent' : 
                     stabilityMetrics.uptime_percentage >= 99.0 ? 'Good' : 'Needs Attention',
      critical_issues: [] as string[],
      warnings: [] as string[],
    };

    if (stabilityMetrics.error_rate > 0.001) {
      summary.critical_issues.push(`High error rate: ${(stabilityMetrics.error_rate * 100).toFixed(2)}%`);
    }

    if (dataQuality.completeness_percentage < 95) {
      summary.warnings.push(`Data quality below target: ${dataQuality.completeness_percentage.toFixed(1)}%`);
    }

    if (security.suspicious_access_patterns > 0) {
      summary.warnings.push(`${security.suspicious_access_patterns} suspicious access patterns detected`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        metrics,
        summary,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error collecting release metrics:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
