import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BackupStatus {
  table: string;
  record_count: number;
  last_modified: string | null;
  status: 'healthy' | 'warning' | 'critical';
  message?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting backup health check...');
    const backupStatuses: BackupStatus[] = [];
    const criticalTables = [
      'clients',
      'chart_notes',
      'appointments',
      'treatment_plans',
      'client_documents',
      'profiles',
      'insurance_claims',
    ];

    // Check each critical table
    for (const table of criticalTables) {
      try {
        const { count, error: countError } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });

        if (countError) {
          backupStatuses.push({
            table,
            record_count: 0,
            last_modified: null,
            status: 'critical',
            message: `Error accessing table: ${countError.message}`,
          });
          continue;
        }

        // Get most recent update
        const { data: recentData } = await supabase
          .from(table)
          .select('updated_at, created_at')
          .order('updated_at', { ascending: false, nullsFirst: false })
          .limit(1)
          .single();

        const lastModified = recentData?.updated_at || recentData?.created_at || null;
        const recordCount = count || 0;

        // Determine status
        let status: 'healthy' | 'warning' | 'critical' = 'healthy';
        let message: string | undefined;

        if (recordCount === 0) {
          status = 'warning';
          message = 'No records found in table';
        } else if (lastModified) {
          const daysSinceUpdate = (Date.now() - new Date(lastModified).getTime()) / (1000 * 60 * 60 * 24);
          if (daysSinceUpdate > 7) {
            status = 'warning';
            message = `No updates in ${Math.floor(daysSinceUpdate)} days`;
          }
        }

        backupStatuses.push({
          table,
          record_count: recordCount,
          last_modified: lastModified,
          status,
          message,
        });
      } catch (error: any) {
        backupStatuses.push({
          table,
          record_count: 0,
          last_modified: null,
          status: 'critical',
          message: error.message,
        });
      }
    }

    // Check backup age (simulate with system_health_metrics)
    const { data: healthMetrics } = await supabase
      .from('system_health_metrics')
      .select('metric_timestamp')
      .order('metric_timestamp', { ascending: false })
      .limit(1)
      .single();

    const lastBackup = healthMetrics?.metric_timestamp 
      ? new Date(healthMetrics.metric_timestamp)
      : null;

    let backupAge = 'unknown';
    let backupStatus: 'healthy' | 'warning' | 'critical' = 'healthy';
    
    if (lastBackup) {
      const hoursSinceBackup = (Date.now() - lastBackup.getTime()) / (1000 * 60 * 60);
      backupAge = `${Math.floor(hoursSinceBackup)} hours ago`;
      
      if (hoursSinceBackup > 48) {
        backupStatus = 'critical';
      } else if (hoursSinceBackup > 24) {
        backupStatus = 'warning';
      }
    } else {
      backupStatus = 'critical';
    }

    const overallHealth = {
      backup_age: backupAge,
      backup_status: backupStatus,
      tables_healthy: backupStatuses.filter(s => s.status === 'healthy').length,
      tables_warning: backupStatuses.filter(s => s.status === 'warning').length,
      tables_critical: backupStatuses.filter(s => s.status === 'critical').length,
      total_records: backupStatuses.reduce((sum, s) => sum + s.record_count, 0),
    };

    // Log the health check
    await supabase.from('audit_logs').insert({
      user_id: '00000000-0000-0000-0000-000000000000',
      action_type: 'backup_health_check',
      resource_type: 'system',
      action_description: 'Backup health check completed',
      action_details: overallHealth,
      severity: backupStatus === 'critical' ? 'critical' : 'info',
    });

    console.log('Backup health check completed');

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        overall_health: overallHealth,
        table_statuses: backupStatuses,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error during backup health check:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
