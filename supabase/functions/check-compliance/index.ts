import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get active compliance rules
    const { data: rules, error: rulesError } = await supabase
      .from('compliance_rules')
      .select('*')
      .eq('is_active', true);

    if (rulesError) throw rulesError;

    const results = [];

    for (const rule of rules || []) {
      // Check clinical notes
      const { data: clinicalNotes, error: clinicalError } = await supabase
        .from('clinical_notes')
        .select('id, client_id, clinician_id, date_of_service, signed_by, locked')
        .is('signed_by', null)
        .eq('locked', false);

      if (!clinicalError && clinicalNotes) {
        for (const note of clinicalNotes) {
          const sessionDate = new Date(note.date_of_service);
          const dueDate = new Date(sessionDate);
          dueDate.setDate(dueDate.getDate() + rule.days_allowed_for_documentation);
          
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          dueDate.setHours(0, 0, 0, 0);
          
          const daysUntilDue = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          const daysOverdue = daysUntilDue < 0 ? Math.abs(daysUntilDue) : 0;
          
          let status = 'On Time';
          if (daysUntilDue <= 0 && daysOverdue <= 1) {
            status = 'Overdue';
          } else if (daysOverdue > 1) {
            status = 'Late';
          } else if (daysUntilDue <= 2) {
            status = 'Due Soon';
          }

          // Upsert compliance status
          const { data: existingStatus } = await supabase
            .from('note_compliance_status')
            .select('id')
            .eq('note_id', note.id)
            .eq('note_type', 'clinical_note')
            .single();

          const complianceData = {
            note_id: note.id,
            note_type: 'clinical_note',
            client_id: note.client_id,
            clinician_id: note.clinician_id,
            session_date: note.date_of_service,
            due_date: dueDate.toISOString().split('T')[0],
            status,
            days_until_due: daysUntilDue > 0 ? daysUntilDue : 0,
            days_overdue: daysOverdue
          };

          if (existingStatus) {
            await supabase
              .from('note_compliance_status')
              .update(complianceData)
              .eq('id', existingStatus.id);
          } else {
            await supabase
              .from('note_compliance_status')
              .insert(complianceData);
          }

          // Send warnings if needed
          if (rule.send_warning_notifications && rule.warning_days_before_due) {
            for (const warningDay of rule.warning_days_before_due) {
              if (daysUntilDue === warningDay) {
                // Check if warning already sent
                const { data: existingWarning } = await supabase
                  .from('compliance_warnings')
                  .select('id')
                  .eq('compliance_status_id', existingStatus?.id)
                  .gte('warning_date', new Date(new Date().setHours(0, 0, 0, 0)).toISOString())
                  .single();

                if (!existingWarning && existingStatus) {
                  await supabase
                    .from('compliance_warnings')
                    .insert({
                      compliance_status_id: existingStatus.id,
                      warning_type: 'Dashboard Alert',
                      delivered: true,
                      delivery_date: new Date().toISOString()
                    });
                }
              }
            }
          }

          results.push({
            note_id: note.id,
            note_type: 'clinical_note',
            status,
            days_until_due: daysUntilDue,
            days_overdue: daysOverdue
          });
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Checked ${results.length} notes`,
        results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: 'Compliance check failed' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});