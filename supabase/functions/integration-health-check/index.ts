import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'degraded' | 'down';
  response_time_ms: number;
  error_message?: string;
  metadata?: any;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting integration health checks...');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const results: HealthCheckResult[] = [];

    // 1. Check Supabase Database Connection
    console.log('Checking database connection...');
    const dbStart = Date.now();
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('count')
        .limit(1)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      
      results.push({
        service: 'supabase_database',
        status: 'healthy',
        response_time_ms: Date.now() - dbStart,
        metadata: { check: 'profiles_query' }
      });
      console.log('✓ Database connection healthy');
    } catch (error: any) {
      results.push({
        service: 'supabase_database',
        status: 'down',
        response_time_ms: Date.now() - dbStart,
        error_message: error?.message || 'Unknown error'
      });
      console.error('✗ Database connection failed:', error?.message);
    }

    // 2. Check Authentication Service
    console.log('Checking auth service...');
    const authStart = Date.now();
    try {
      const { data: { users }, error } = await supabase.auth.admin.listUsers({
        page: 1,
        perPage: 1
      });
      
      if (error) throw error;
      
      results.push({
        service: 'supabase_auth',
        status: 'healthy',
        response_time_ms: Date.now() - authStart,
        metadata: { users_count: users.length }
      });
      console.log('✓ Auth service healthy');
    } catch (error: any) {
      results.push({
        service: 'supabase_auth',
        status: 'down',
        response_time_ms: Date.now() - authStart,
        error_message: error?.message || 'Unknown error'
      });
      console.error('✗ Auth service failed:', error?.message);
    }

    // 3. Check Storage Service
    console.log('Checking storage service...');
    const storageStart = Date.now();
    try {
      const { data, error } = await supabase.storage.listBuckets();
      
      if (error) throw error;
      
      results.push({
        service: 'supabase_storage',
        status: 'healthy',
        response_time_ms: Date.now() - storageStart,
        metadata: { buckets_count: data.length }
      });
      console.log('✓ Storage service healthy');
    } catch (error: any) {
      results.push({
        service: 'supabase_storage',
        status: 'down',
        response_time_ms: Date.now() - storageStart,
        error_message: error?.message || 'Unknown error'
      });
      console.error('✗ Storage service failed:', error?.message);
    }

    // 4. Check Critical Tables Accessibility
    console.log('Checking critical tables...');
    const tablesStart = Date.now();
    const criticalTables = [
      'clients',
      'appointments',
      'clinical_notes',
      'profiles',
      'user_roles'
    ];
    
    let tablesHealthy = true;
    const tableResults: any = {};
    
    for (const table of criticalTables) {
      try {
        const { error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        if (error) {
          tablesHealthy = false;
          tableResults[table] = 'error: ' + error.message;
        } else {
          tableResults[table] = 'accessible';
        }
      } catch (error: any) {
        tablesHealthy = false;
        tableResults[table] = 'error: ' + (error?.message || 'Unknown error');
      }
    }
    
    results.push({
      service: 'critical_tables',
      status: tablesHealthy ? 'healthy' : 'degraded',
      response_time_ms: Date.now() - tablesStart,
      metadata: tableResults
    });
    console.log(tablesHealthy ? '✓ Critical tables healthy' : '⚠ Some critical tables have issues');

    // 5. Check RLS Policies Enforcement
    console.log('Checking RLS enforcement...');
    const rlsStart = Date.now();
    try {
      // Try to access data without proper auth (should fail)
      const anonSupabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!
      );
      
      const { data, error } = await anonSupabase
        .from('clients')
        .select('*')
        .limit(1);
      
      // If we get data without auth, RLS is not working
      const rlsWorking = (error?.message?.includes('permission denied') || 
                          error?.code === 'PGRST301' ||
                          data === null || 
                          (Array.isArray(data) && data.length === 0));
      
      results.push({
        service: 'rls_policies',
        status: rlsWorking ? 'healthy' : 'down',
        response_time_ms: Date.now() - rlsStart,
        metadata: { 
          check: 'unauthorized_access_blocked',
          working: rlsWorking
        }
      });
      console.log(rlsWorking ? '✓ RLS policies enforced' : '✗ RLS policies NOT enforced');
    } catch (error: any) {
      results.push({
        service: 'rls_policies',
        status: 'degraded',
        response_time_ms: Date.now() - rlsStart,
        error_message: error?.message || 'Unknown error'
      });
      console.error('⚠ RLS check error:', error?.message);
    }

    // 6. Check Edge Functions Health
    console.log('Checking edge functions...');
    const functionsStart = Date.now();
    try {
      // Check if health-check function responds
      const { data, error } = await supabase.functions.invoke('health-check', {
        body: { check: 'integration-health' }
      });
      
      results.push({
        service: 'edge_functions',
        status: error ? 'degraded' : 'healthy',
        response_time_ms: Date.now() - functionsStart,
        metadata: { 
          health_check_function: error ? 'failed' : 'working'
        }
      });
      console.log(error ? '⚠ Edge functions degraded' : '✓ Edge functions healthy');
    } catch (error: any) {
      results.push({
        service: 'edge_functions',
        status: 'degraded',
        response_time_ms: Date.now() - functionsStart,
        error_message: error?.message || 'Unknown error'
      });
      console.error('⚠ Edge functions check error:', error?.message);
    }

    // 7. Check Database Performance
    console.log('Checking database performance...');
    const perfStart = Date.now();
    try {
      // Run a complex query to test performance
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          clients(first_name, last_name),
          profiles!appointments_clinician_id_fkey(first_name, last_name)
        `)
        .limit(10);
      
      const queryTime = Date.now() - perfStart;
      const status = queryTime < 500 ? 'healthy' : 
                     queryTime < 2000 ? 'degraded' : 'down';
      
      results.push({
        service: 'database_performance',
        status,
        response_time_ms: queryTime,
        metadata: { 
          query_type: 'complex_join',
          records_fetched: data?.length || 0,
          threshold_ms: 500
        }
      });
      console.log(`${status === 'healthy' ? '✓' : '⚠'} Database performance: ${queryTime}ms`);
    } catch (error: any) {
      results.push({
        service: 'database_performance',
        status: 'down',
        response_time_ms: Date.now() - perfStart,
        error_message: error?.message || 'Unknown error'
      });
      console.error('✗ Database performance check failed:', error?.message);
    }

    // Store results in database
    console.log('Storing health check results...');
    const timestamp = new Date().toISOString();
    
    for (const result of results) {
      await supabase.from('integration_health_logs').insert({
        service_name: result.service,
        status: result.status,
        response_time_ms: result.response_time_ms,
        error_message: result.error_message,
        metadata: result.metadata,
        checked_at: timestamp
      });
    }

    // Check if any critical services are down
    const criticalDown = results.filter(r => 
      ['supabase_database', 'supabase_auth', 'rls_policies'].includes(r.service) &&
      r.status === 'down'
    );

    if (criticalDown.length > 0) {
      console.log('🚨 CRITICAL: Some services are down!');
      
      // Get administrators to notify
      const { data: adminRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'administrator');

      const adminIds = adminRoles?.map(r => r.user_id) || [];

      if (adminIds.length > 0) {
        await supabase.from('notification_logs').insert({
          notification_type: 'system_alert',
          recipient_user_ids: adminIds,
          subject: '🚨 Critical System Health Alert',
          message: `Critical services are down:\n\n${criticalDown.map(s => 
            `- ${s.service}: ${s.error_message || 'Service unavailable'}`
          ).join('\n')}\n\nImmediate attention required!`,
          priority: 'urgent',
          sent_via: ['email', 'in_app']
        });
        console.log(`Alert sent to ${adminIds.length} administrators`);
      }
    }

    // Calculate overall health
    const healthyCount = results.filter(r => r.status === 'healthy').length;
    const degradedCount = results.filter(r => r.status === 'degraded').length;
    const downCount = results.filter(r => r.status === 'down').length;
    
    const overallStatus = downCount > 0 ? 'down' :
                         degradedCount > 0 ? 'degraded' : 'healthy';

    console.log(`Health check complete: ${healthyCount} healthy, ${degradedCount} degraded, ${downCount} down`);

    return new Response(
      JSON.stringify({
        success: true,
        timestamp,
        overall_status: overallStatus,
        summary: {
          total_checks: results.length,
          healthy: healthyCount,
          degraded: degradedCount,
          down: downCount
        },
        results
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Integration health check error:', error);
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
