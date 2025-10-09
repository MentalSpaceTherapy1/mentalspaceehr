/**
 * Performance Metrics Collection Edge Function
 * 
 * Collects and stores performance metrics including:
 * - Database query performance
 * - System health indicators
 * - Slow query detection
 * 
 * Can be called manually or scheduled via cron
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PerformanceMetricRequest {
  metric_type: 'query' | 'api' | 'function' | 'render' | 'network';
  metric_name: string;
  execution_time_ms: number;
  resource_usage?: Record<string, any>;
  metadata?: Record<string, any>;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, ...payload } = await req.json();

    let result;
    switch (action) {
      case 'record_metric':
        result = await recordMetric(supabaseClient, payload as PerformanceMetricRequest);
        break;
      case 'collect_system_health':
        result = await collectSystemHealth(supabaseClient);
        break;
      case 'cleanup_old_metrics':
        result = await cleanupOldMetrics(supabaseClient);
        break;
      default:
        throw new Error('Invalid action');
    }

    return new Response(
      JSON.stringify({ success: true, data: result }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('Performance metrics error:', error);
    
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

/**
 * Record a performance metric
 */
async function recordMetric(supabase: any, metric: PerformanceMetricRequest) {
  const { data, error } = await supabase
    .from('performance_metrics')
    .insert({
      metric_type: metric.metric_type,
      metric_name: metric.metric_name,
      execution_time_ms: metric.execution_time_ms,
      resource_usage: metric.resource_usage || {},
      metadata: metric.metadata || {},
    });

  if (error) {
    console.error('Failed to record metric:', error);
    throw error;
  }

  // Check if this is a slow query and log it
  if (metric.metric_type === 'query' && metric.execution_time_ms > 500) {
    await logSlowQuery(supabase, metric);
  }

  return data;
}

/**
 * Log a slow query for optimization review
 */
async function logSlowQuery(supabase: any, metric: PerformanceMetricRequest) {
  // Generate a simple hash of the query name for grouping
  const encoder = new TextEncoder();
  const data = encoder.encode(metric.metric_name);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const query_hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);

  await supabase
    .from('slow_query_log')
    .insert({
      query_text: metric.metric_name,
      query_hash,
      execution_time_ms: metric.execution_time_ms,
      table_names: metric.metadata?.tables || [],
      parameters: metric.metadata?.parameters || {},
      endpoint: metric.metadata?.endpoint,
      optimization_suggested: false,
    });
}

/**
 * Collect system health metrics
 */
async function collectSystemHealth(supabase: any) {
  console.log('Collecting system health metrics...');

  // Get database statistics
  const { data: dbStats } = await supabase.rpc('pg_database_size', {
    database_name: 'postgres'
  }).catch(() => ({ data: null }));

  // Get recent performance metrics
  const { data: recentMetrics } = await supabase
    .from('performance_metrics')
    .select('execution_time_ms, metric_type')
    .gte('timestamp', new Date(Date.now() - 3600000).toISOString()) // Last hour
    .limit(1000);

  // Calculate statistics
  const avgQueryTime = recentMetrics && recentMetrics.length > 0
    ? recentMetrics.reduce((sum: number, m: any) => sum + Number(m.execution_time_ms), 0) / recentMetrics.length
    : 0;

  const slowQueryCount = recentMetrics
    ? recentMetrics.filter((m: any) => Number(m.execution_time_ms) > 500).length
    : 0;

  // Count active sessions (approximation based on recent activity)
  const { count: activeSessions } = await supabase
    .from('audit_logs')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', new Date(Date.now() - 300000).toISOString()); // Last 5 minutes

  // Calculate health score (0-100)
  let healthScore = 100;
  if (avgQueryTime > 500) healthScore -= 20;
  if (avgQueryTime > 1000) healthScore -= 20;
  if (slowQueryCount > 10) healthScore -= 15;
  if (slowQueryCount > 50) healthScore -= 15;

  const healthStatus = healthScore >= 80 ? 'healthy' : healthScore >= 60 ? 'degraded' : 'critical';

  // Store system health metrics
  const { data, error } = await supabase
    .from('system_health_metrics')
    .insert({
      database_size_mb: dbStats ? Math.round(dbStats / 1024 / 1024) : null,
      avg_query_time_ms: Math.round(avgQueryTime),
      slow_query_count: slowQueryCount,
      error_rate: 0, // TODO: Calculate from error logs
      active_users: activeSessions || 0,
      total_sessions: recentMetrics?.length || 0,
      overall_health_score: healthScore,
      health_status: healthStatus,
      metadata: {
        collected_at: new Date().toISOString(),
        metrics_analyzed: recentMetrics?.length || 0,
      },
    });

  if (error) {
    console.error('Failed to store system health:', error);
    throw error;
  }

  console.log(`System health recorded: ${healthStatus} (score: ${healthScore})`);

  return {
    health_status: healthStatus,
    health_score: healthScore,
    avg_query_time: avgQueryTime,
    slow_queries: slowQueryCount,
    active_users: activeSessions,
  };
}

/**
 * Cleanup old metrics (keep last 30 days)
 */
async function cleanupOldMetrics(supabase: any) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // Delete old performance metrics
  const { error: perfError } = await supabase
    .from('performance_metrics')
    .delete()
    .lt('timestamp', thirtyDaysAgo);

  if (perfError) {
    console.error('Failed to cleanup performance metrics:', perfError);
  }

  // Delete old slow query logs
  const { error: slowError } = await supabase
    .from('slow_query_log')
    .delete()
    .lt('executed_at', thirtyDaysAgo);

  if (slowError) {
    console.error('Failed to cleanup slow query log:', slowError);
  }

  // Keep system health metrics for 90 days
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const { error: healthError } = await supabase
    .from('system_health_metrics')
    .delete()
    .lt('metric_timestamp', ninetyDaysAgo);

  if (healthError) {
    console.error('Failed to cleanup system health metrics:', healthError);
  }

  console.log('Old metrics cleaned up successfully');

  return { success: true, cleaned_up_to: thirtyDaysAgo };
}
