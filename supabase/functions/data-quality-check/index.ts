import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface QualityCheck {
  name: string;
  table: string;
  type: 'completeness' | 'validity' | 'uniqueness' | 'consistency' | 'timeliness';
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  query: string;
  threshold: number;
}

const QUALITY_CHECKS: QualityCheck[] = [
  // CLIENTS TABLE CHECKS
  {
    name: 'Clients: Required fields completeness',
    table: 'clients',
    type: 'completeness',
    severity: 'critical',
    query: `SELECT COUNT(*) as count FROM clients WHERE first_name IS NULL OR last_name IS NULL OR date_of_birth IS NULL OR medical_record_number IS NULL`,
    threshold: 0
  },
  {
    name: 'Clients: Invalid status values',
    table: 'clients',
    type: 'validity',
    severity: 'critical',
    query: `SELECT COUNT(*) as count FROM clients WHERE status NOT IN ('Active', 'Inactive', 'Discharged', 'On Hold')`,
    threshold: 0
  },
  {
    name: 'Clients: Active without therapist',
    table: 'clients',
    type: 'completeness',
    severity: 'high',
    query: `SELECT COUNT(*) as count FROM clients WHERE status = 'Active' AND primary_therapist_id IS NULL`,
    threshold: 0
  },
  {
    name: 'Clients: Duplicate MRNs',
    table: 'clients',
    type: 'uniqueness',
    severity: 'critical',
    query: `SELECT COUNT(*) - COUNT(DISTINCT medical_record_number) as count FROM clients`,
    threshold: 0
  },
  {
    name: 'Clients: Future dates of birth',
    table: 'clients',
    type: 'validity',
    severity: 'critical',
    query: `SELECT COUNT(*) as count FROM clients WHERE date_of_birth > CURRENT_DATE`,
    threshold: 0
  },

  // APPOINTMENTS TABLE CHECKS
  {
    name: 'Appointments: Required fields completeness',
    table: 'appointments',
    type: 'completeness',
    severity: 'critical',
    query: `SELECT COUNT(*) as count FROM appointments WHERE client_id IS NULL OR clinician_id IS NULL OR appointment_date IS NULL OR start_time IS NULL OR end_time IS NULL OR status IS NULL`,
    threshold: 0
  },
  {
    name: 'Appointments: Invalid time logic',
    table: 'appointments',
    type: 'validity',
    severity: 'critical',
    query: `SELECT COUNT(*) as count FROM appointments WHERE end_time <= start_time`,
    threshold: 0
  },
  {
    name: 'Appointments: Invalid status values',
    table: 'appointments',
    type: 'validity',
    severity: 'critical',
    query: `SELECT COUNT(*) as count FROM appointments WHERE status NOT IN ('Scheduled', 'Confirmed', 'Checked In', 'In Progress', 'Completed', 'Cancelled', 'No Show', 'Rescheduled')`,
    threshold: 0
  },
  {
    name: 'Appointments: Incident-to without supervisor',
    table: 'appointments',
    type: 'consistency',
    severity: 'critical',
    query: `SELECT COUNT(*) as count FROM appointments WHERE is_incident_to = true AND billed_under_provider_id IS NULL`,
    threshold: 0
  },
  {
    name: 'Appointments: Completed without note (>48hrs)',
    table: 'appointments',
    type: 'timeliness',
    severity: 'high',
    query: `SELECT COUNT(*) as count FROM appointments a WHERE a.status = 'Completed' AND a.appointment_date < CURRENT_DATE - INTERVAL '2 days' AND NOT EXISTS (SELECT 1 FROM clinical_notes cn WHERE cn.appointment_id = a.id AND cn.status != 'Deleted')`,
    threshold: 0
  },

  // CLINICAL NOTES TABLE CHECKS
  {
    name: 'Clinical Notes: Required fields completeness',
    table: 'clinical_notes',
    type: 'completeness',
    severity: 'critical',
    query: `SELECT COUNT(*) as count FROM clinical_notes WHERE client_id IS NULL OR clinician_id IS NULL OR note_type IS NULL OR session_date IS NULL OR status IS NULL`,
    threshold: 0
  },
  {
    name: 'Clinical Notes: Future session dates',
    table: 'clinical_notes',
    type: 'validity',
    severity: 'critical',
    query: `SELECT COUNT(*) as count FROM clinical_notes WHERE session_date > CURRENT_DATE`,
    threshold: 0
  },
  {
    name: 'Clinical Notes: Unsigned cosignatures',
    table: 'clinical_notes',
    type: 'consistency',
    severity: 'critical',
    query: `SELECT COUNT(*) as count FROM clinical_notes WHERE requires_cosignature = true AND status = 'Signed' AND (cosigned_by IS NULL OR cosigned_at IS NULL)`,
    threshold: 0
  },
  {
    name: 'Clinical Notes: Late documentation (>7 days)',
    table: 'clinical_notes',
    type: 'timeliness',
    severity: 'high',
    query: `SELECT COUNT(*) as count FROM clinical_notes WHERE status NOT IN ('Signed', 'Locked') AND session_date < CURRENT_DATE - INTERVAL '7 days'`,
    threshold: 0
  },
  {
    name: 'Clinical Notes: Modified locked notes',
    table: 'clinical_notes',
    type: 'consistency',
    severity: 'critical',
    query: `SELECT COUNT(*) as count FROM clinical_notes WHERE locked_at IS NOT NULL AND updated_at > locked_at`,
    threshold: 0
  },

  // CHARGE ENTRIES TABLE CHECKS
  {
    name: 'Charge Entries: Required fields completeness',
    table: 'charge_entries',
    type: 'completeness',
    severity: 'critical',
    query: `SELECT COUNT(*) as count FROM charge_entries WHERE client_id IS NULL OR provider_id IS NULL OR service_date IS NULL OR cpt_code IS NULL OR charge_amount IS NULL OR charge_status IS NULL`,
    threshold: 0
  },
  {
    name: 'Charge Entries: Invalid amounts',
    table: 'charge_entries',
    type: 'validity',
    severity: 'critical',
    query: `SELECT COUNT(*) as count FROM charge_entries WHERE charge_amount <= 0 OR units <= 0`,
    threshold: 0
  },
  {
    name: 'Charge Entries: Payment exceeds charge',
    table: 'charge_entries',
    type: 'validity',
    severity: 'critical',
    query: `SELECT COUNT(*) as count FROM charge_entries WHERE payment_amount > charge_amount`,
    threshold: 0
  },
  {
    name: 'Charge Entries: Billed without claim',
    table: 'charge_entries',
    type: 'consistency',
    severity: 'high',
    query: `SELECT COUNT(*) as count FROM charge_entries WHERE charge_status = 'Billed' AND claim_id IS NULL`,
    threshold: 0
  },
  {
    name: 'Charge Entries: Aged unbilled (>30 days)',
    table: 'charge_entries',
    type: 'timeliness',
    severity: 'high',
    query: `SELECT COUNT(*) as count FROM charge_entries WHERE charge_status = 'Unbilled' AND service_date < CURRENT_DATE - INTERVAL '30 days'`,
    threshold: 0
  },

  // USER ROLES TABLE CHECKS
  {
    name: 'User Roles: Required fields completeness',
    table: 'user_roles',
    type: 'completeness',
    severity: 'critical',
    query: `SELECT COUNT(*) as count FROM user_roles WHERE user_id IS NULL OR role IS NULL OR assigned_at IS NULL`,
    threshold: 0
  },
  {
    name: 'User Roles: No administrators',
    table: 'user_roles',
    type: 'consistency',
    severity: 'critical',
    query: `SELECT CASE WHEN COUNT(*) = 0 THEN 1 ELSE 0 END as count FROM user_roles WHERE role = 'administrator'`,
    threshold: 0
  },
  {
    name: 'User Roles: Users without roles',
    table: 'user_roles',
    type: 'completeness',
    severity: 'high',
    query: `SELECT COUNT(*) as count FROM auth.users u LEFT JOIN user_roles ur ON u.id = ur.user_id WHERE ur.id IS NULL AND u.created_at < NOW() - INTERVAL '1 hour'`,
    threshold: 0
  },
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const results = [];
    let totalChecks = 0;
    let passedChecks = 0;
    let failedChecks = 0;
    let criticalFailures = 0;

    console.log(`Starting data quality checks - ${QUALITY_CHECKS.length} checks to run`);

    for (const check of QUALITY_CHECKS) {
      totalChecks++;
      const startTime = Date.now();
      
      try {
        const { data, error } = await supabaseClient
          .from('_temp_check')
          .select('*')
          .limit(0)
          .then(() => supabaseClient.rpc('sql', { query: check.query }));

        const executionTime = Date.now() - startTime;
        
        // Execute the query directly
        const countResult = await supabaseClient.rpc('sql', { query: check.query }).single();
        const violationCount = (countResult.data as any)?.count || 0;
        
        if (countResult.error) {
          console.error(`Check failed: ${check.name}`, countResult.error);
          
          await supabaseClient.from('data_quality_results').insert({
            check_name: check.name,
            table_name: check.table,
            check_type: check.type,
            severity: check.severity,
            violation_count: 0,
            threshold: check.threshold,
            passed: false,
            check_query: check.query,
            error_message: (countResult.error as any)?.message || 'Unknown error',
            execution_time_ms: executionTime,
          });

          failedChecks++;
          continue;
        }
        const passed = violationCount <= check.threshold;

        if (!passed) {
          failedChecks++;
          if (check.severity === 'critical') {
            criticalFailures++;
          }
        } else {
          passedChecks++;
        }

        await supabaseClient.from('data_quality_results').insert({
          check_name: check.name,
          table_name: check.table,
          check_type: check.type,
          severity: check.severity,
          violation_count: violationCount,
          threshold: check.threshold,
          passed,
          check_query: check.query,
          execution_time_ms: executionTime,
        });

        results.push({
          check: check.name,
          table: check.table,
          type: check.type,
          severity: check.severity,
          violations: violationCount,
          threshold: check.threshold,
          passed,
          executionTime,
        });

        console.log(`✓ ${check.name}: ${passed ? 'PASSED' : 'FAILED'} (${violationCount} violations)`);

      } catch (checkError) {
        console.error(`Exception in check: ${check.name}`, checkError);
        failedChecks++;
      }
    }

    // If critical failures detected, send notification
    if (criticalFailures > 0) {
      const { data: admins } = await supabaseClient
        .from('user_roles')
        .select('user_id')
        .eq('role', 'administrator');

      if (admins && admins.length > 0) {
        const adminIds = admins.map(a => a.user_id);
        
        await supabaseClient.from('notification_logs').insert({
          notification_type: 'data_quality_alert',
          recipient_user_ids: adminIds,
          subject: `Data Quality Alert: ${criticalFailures} Critical Failures Detected`,
          message: `Automated data quality checks found ${criticalFailures} critical violations. Please review the Data Quality Dashboard immediately.`,
          priority: 'urgent',
          sent_via: ['in_app', 'email'],
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          totalChecks,
          passedChecks,
          failedChecks,
          criticalFailures,
          timestamp: new Date().toISOString(),
        },
        results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in data quality check:', error);
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
