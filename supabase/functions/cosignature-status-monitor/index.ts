import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CosignatureRecord {
  id: string;
  note_id: string;
  clinician_id: string;
  supervisor_id: string;
  status: string;
  due_date: string;
  created_date: string;
  escalated: boolean;
  supervisor_notified: boolean;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const now = new Date();
    const statusUpdates: { id: string; updates: any }[] = [];
    const notifications: any[] = [];

    // Fetch all pending cosignatures
    const { data: cosignatures, error: fetchError } = await supabaseClient
      .from('note_cosignatures')
      .select('*')
      .in('status', ['Pending', 'Pending Review', 'Under Review', 'Revisions Requested'])
      .order('created_date', { ascending: true });

    if (fetchError) throw fetchError;

    if (!cosignatures || cosignatures.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No cosignatures to monitor',
          checked: 0,
          overdue: 0,
          escalated: 0
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    let overdueCount = 0;
    let escalatedCount = 0;

    // Check each cosignature for overdue status
    for (const cosig of cosignatures as CosignatureRecord[]) {
      const updates: any = {};
      let needsUpdate = false;

      // Check if overdue
      if (cosig.due_date) {
        const dueDate = new Date(cosig.due_date);
        const isOverdue = now > dueDate;

        if (isOverdue && cosig.status !== 'Overdue') {
          updates.status = 'Overdue';
          needsUpdate = true;
          overdueCount++;

          // Add notification for overdue status
          notifications.push({
            cosignatureId: cosig.id,
            type: 'overdue',
            supervisorId: cosig.supervisor_id,
            clinicianId: cosig.clinician_id
          });
        }

        // Check if needs escalation (overdue for more than 3 days)
        const daysSinceDue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysSinceDue > 3 && !cosig.escalated) {
          updates.escalated = true;
          updates.escalated_date = now.toISOString();
          needsUpdate = true;
          escalatedCount++;

          // Add escalation notification
          notifications.push({
            cosignatureId: cosig.id,
            type: 'escalated',
            supervisorId: cosig.supervisor_id,
            clinicianId: cosig.clinician_id,
            daysOverdue: daysSinceDue
          });
        }
      }

      // Check if supervisor needs reminder (7 days since submission, not yet notified in last 3 days)
      const submittedDate = new Date(cosig.created_date);
      const daysSinceSubmission = Math.floor((now.getTime() - submittedDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysSinceSubmission >= 7 && daysSinceSubmission % 3 === 0) {
        notifications.push({
          cosignatureId: cosig.id,
          type: 'reminder',
          supervisorId: cosig.supervisor_id,
          clinicianId: cosig.clinician_id,
          daysWaiting: daysSinceSubmission
        });
      }

      if (needsUpdate) {
        statusUpdates.push({ id: cosig.id, updates });
      }
    }

    // Apply all status updates in batch
    if (statusUpdates.length > 0) {
      for (const { id, updates } of statusUpdates) {
        const { error: updateError } = await supabaseClient
          .from('note_cosignatures')
          .update(updates)
          .eq('id', id);
      }
    }

    // Send notifications via the supervision-notifications function
    if (notifications.length > 0) {
      for (const notification of notifications) {
        try {
          const { error: notifError } = await supabaseClient.functions.invoke(
            'supervision-notifications',
            {
              body: {
                type: notification.type,
                cosignatureId: notification.cosignatureId,
                supervisorId: notification.supervisorId,
                clinicianId: notification.clinicianId,
                daysOverdue: notification.daysOverdue,
                daysWaiting: notification.daysWaiting
              }
            }
          );
        } catch (err) {
          // Notification failures are non-critical
        }
      }
    }

    const summary = {
      success: true,
      timestamp: now.toISOString(),
      checked: cosignatures.length,
      overdue: overdueCount,
      escalated: escalatedCount,
      notifications: notifications.length,
      message: `Checked ${cosignatures.length} cosignatures, marked ${overdueCount} as overdue, escalated ${escalatedCount}, sent ${notifications.length} notifications`
    };

    return new Response(
      JSON.stringify(summary),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Monitoring failed'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
