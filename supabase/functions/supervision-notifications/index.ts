import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationEvent {
  type: 'new_note' | 'note_cosigned' | 'overdue_cosignature';
  relationshipId: string;
  noteId?: string;
  supervisorId: string;
  superviseeId: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resend = new Resend(resendApiKey);

    const event: NotificationEvent = await req.json();

    // Get relationship and notification settings
    const { data: relationship, error: relError } = await supabase
      .from('supervision_relationships')
      .select(`
        *,
        supervisor:profiles!supervision_relationships_supervisor_id_fkey(id, first_name, last_name, email),
        supervisee:profiles!supervision_relationships_supervisee_id_fkey(id, first_name, last_name, email)
      `)
      .eq('id', event.relationshipId)
      .single();

    if (relError || !relationship) {
      throw new Error('Relationship not found');
    }

    const settings = relationship.notification_settings || {};

    // Handle different notification types
    switch (event.type) {
      case 'new_note':
        if (settings.notifySupervisorNewNote !== false) {
          await resend.emails.send({
            from: 'MentalSpace <notifications@mentalspace.app>',
            to: relationship.supervisor.email,
            subject: 'New Note Awaiting Co-Signature',
            html: `
              <h2>New Note Requires Your Co-Signature</h2>
              <p>Dear ${relationship.supervisor.first_name},</p>
              <p>${relationship.supervisee.first_name} ${relationship.supervisee.last_name} has created a new clinical note that requires your co-signature.</p>
              <p>Please review and sign the note to maintain compliance.</p>
              <p><a href="${supabaseUrl}/dashboard">View Dashboard</a></p>
            `
          });
        }
        break;

      case 'note_cosigned':
        if (settings.notifySuperviseeWhenCosigned !== false) {
          await resend.emails.send({
            from: 'MentalSpace <notifications@mentalspace.app>',
            to: relationship.supervisee.email,
            subject: 'Note Co-Signed by Supervisor',
            html: `
              <h2>Your Note Has Been Co-Signed</h2>
              <p>Dear ${relationship.supervisee.first_name},</p>
              <p>${relationship.supervisor.first_name} ${relationship.supervisor.last_name} has co-signed your clinical note.</p>
              <p><a href="${supabaseUrl}/dashboard">View Dashboard</a></p>
            `
          });
        }
        break;

      case 'overdue_cosignature':
        if (settings.escalateIfNotCosigned !== false) {
          const escalationDays = settings.escalationDays || 7;
          
          // Get overdue notes
          const { data: overdueNotes } = await supabase
            .from('note_cosignatures')
            .select('*')
            .eq('supervisor_id', relationship.supervisor_id)
            .eq('clinician_id', relationship.supervisee_id)
            .eq('status', 'Overdue');

          if (overdueNotes && overdueNotes.length > 0) {
            await resend.emails.send({
              from: 'MentalSpace <notifications@mentalspace.app>',
              to: relationship.supervisor.email,
              subject: `URGENT: ${overdueNotes.length} Overdue Co-Signatures`,
              html: `
                <h2 style="color: #dc2626;">Urgent: Overdue Co-Signatures</h2>
                <p>Dear ${relationship.supervisor.first_name},</p>
                <p>You have <strong>${overdueNotes.length}</strong> clinical notes that are overdue for co-signature.</p>
                <p>These notes require immediate attention to maintain compliance.</p>
                <p><a href="${supabaseUrl}/dashboard">Review Notes Now</a></p>
              `
            });
          }
        }
        break;
    }

    return new Response(
      JSON.stringify({ success: true }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error('Error in supervision-notifications:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});