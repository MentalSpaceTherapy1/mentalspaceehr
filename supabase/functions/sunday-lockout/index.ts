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

    console.log('Starting Sunday lockout process...');

    // Get active compliance rules
    const { data: rules, error: rulesError } = await supabase
      .from('compliance_rules')
      .select('*')
      .eq('is_active', true)
      .eq('automatic_locking', true);

    if (rulesError) throw rulesError;

    console.log(`Found ${rules?.length || 0} active compliance rules`);

    const results = [];
    
    for (const rule of rules || []) {
      console.log(`Processing rule: ${rule.rule_name}`);
      
      // Find all unsigned notes that are overdue
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - rule.days_allowed_for_documentation);
      
      // Check clinical notes
      const { data: clinicalNotes, error: clinicalError } = await supabase
        .from('clinical_notes')
        .select('id, client_id, clinician_id, date_of_service, signed_by')
        .is('signed_by', null)
        .lte('date_of_service', cutoffDate.toISOString().split('T')[0]);

      if (clinicalError) {
        console.error('Error fetching clinical notes:', clinicalError);
      } else {
        console.log(`Found ${clinicalNotes?.length || 0} unsigned clinical notes to lock`);
        
        for (const note of clinicalNotes || []) {
          // Check if compliance status exists
          const { data: existingStatus } = await supabase
            .from('note_compliance_status')
            .select('id, is_locked')
            .eq('note_id', note.id)
            .eq('note_type', 'clinical_note')
            .single();

          if (existingStatus && existingStatus.is_locked) {
            console.log(`Note ${note.id} already locked, skipping`);
            continue;
          }

          const dueDate = new Date(note.date_of_service);
          dueDate.setDate(dueDate.getDate() + rule.days_allowed_for_documentation);

          const complianceData = {
            note_id: note.id,
            note_type: 'clinical_note',
            client_id: note.client_id,
            clinician_id: note.clinician_id,
            session_date: note.date_of_service,
            due_date: dueDate.toISOString().split('T')[0],
            status: 'Locked',
            is_locked: true,
            locked_date: new Date().toISOString(),
            lock_reason: `Automatically locked by Sunday lockout - documentation not completed within ${rule.days_allowed_for_documentation} days`,
            days_overdue: Math.floor((new Date().getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
          };

          if (existingStatus) {
            // Update existing status
            await supabase
              .from('note_compliance_status')
              .update(complianceData)
              .eq('id', existingStatus.id);
          } else {
            // Insert new status
            await supabase
              .from('note_compliance_status')
              .insert(complianceData);
          }

          // Create dashboard alert
          await supabase
            .from('compliance_warnings')
            .insert({
              compliance_status_id: existingStatus?.id,
              warning_type: 'Dashboard Alert',
              delivered: true,
              delivery_date: new Date().toISOString()
            });

          results.push({
            note_id: note.id,
            note_type: 'clinical_note',
            locked: true
          });

          console.log(`Locked note ${note.id}`);
        }
      }

      // Similar checks for other note types
      const noteTypes = [
        { table: 'contact_notes', type: 'contact_note', dateField: 'contact_date' },
        { table: 'consultation_notes', type: 'consultation_note', dateField: 'consultation_date' },
        { table: 'cancellation_notes', type: 'cancellation_note', dateField: 'cancellation_date' },
        { table: 'miscellaneous_notes', type: 'miscellaneous_note', dateField: 'note_date' }
      ];

      for (const noteType of noteTypes) {
        const { data: notes, error }: any = await supabase
          .from(noteType.table)
          .select('id, client_id, clinician_id, signed_by')
          .is('signed_by', null)
          .lte(noteType.dateField, cutoffDate.toISOString().split('T')[0]);

        if (!error && notes) {
          console.log(`Found ${notes.length} unsigned ${noteType.type} notes to lock`);
          
          for (const note of notes) {
            const { data: existingStatus } = await supabase
              .from('note_compliance_status')
              .select('id, is_locked')
              .eq('note_id', note.id)
              .eq('note_type', noteType.type)
              .single();

            if (existingStatus && existingStatus.is_locked) continue;

            // Get the full note with the date field
            const { data: fullNote }: any = await supabase
              .from(noteType.table)
              .select('*')
              .eq('id', note.id)
              .single();

            if (!fullNote) continue;

            const sessionDate = fullNote[noteType.dateField];
            const dueDate = new Date(sessionDate);
            dueDate.setDate(dueDate.getDate() + rule.days_allowed_for_documentation);

            const complianceData = {
              note_id: note.id,
              note_type: noteType.type,
              client_id: note.client_id,
              clinician_id: note.clinician_id,
              session_date: sessionDate,
              due_date: dueDate.toISOString().split('T')[0],
              status: 'Locked',
              is_locked: true,
              locked_date: new Date().toISOString(),
              lock_reason: `Automatically locked by Sunday lockout - documentation not completed within ${rule.days_allowed_for_documentation} days`,
              days_overdue: Math.floor((new Date().getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
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

            results.push({
              note_id: note.id,
              note_type: noteType.type,
              locked: true
            });

            console.log(`Locked ${noteType.type} ${note.id}`);
          }
        }
      }
    }

    console.log(`Sunday lockout completed. Locked ${results.length} notes.`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Locked ${results.length} notes`,
        results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error: any) {
    console.error('Error in sunday-lockout function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});