import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WorkflowEvent {
  action: 'submit' | 'review' | 'revise' | 'cosign' | 'reject';
  cosignatureId: string;
  noteId: string;
  userId: string;
  data?: any;
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

    const { action, cosignatureId, noteId, userId, data }: WorkflowEvent = await req.json();

    console.log(`Processing workflow action: ${action} for cosignature ${cosignatureId}`);

    // Fetch current cosignature
    const { data: cosignature, error: fetchError } = await supabaseClient
      .from('note_cosignatures')
      .select('*')
      .eq('id', cosignatureId)
      .single();

    if (fetchError) {
      throw new Error(`Failed to fetch cosignature: ${fetchError.message}`);
    }

    let updates: any = {};
    let noteUpdates: any = {};
    let notificationData: any = null;

    // Process workflow based on action
    switch (action) {
      case 'submit':
        // Clinician submits note for cosign
        updates = {
          status: 'Pending Review',
          clinician_signed: true,
          clinician_signed_date: new Date().toISOString(),
          submitted_for_cosign_date: new Date().toISOString(),
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
        };

        noteUpdates = {
          locked: true,
          locked_date: new Date().toISOString(),
          locked_by: userId
        };

        notificationData = {
          type: 'new_cosignature',
          supervisorId: cosignature.supervisor_id,
          clinicianId: userId
        };
        break;

      case 'review':
        // Supervisor opens note for review
        updates = {
          status: 'Under Review',
          reviewed_date: new Date().toISOString()
        };
        break;

      case 'revise':
        // Supervisor requests revisions
        const revisionHistory = Array.isArray(cosignature.revision_history)
          ? cosignature.revision_history
          : [];
        
        revisionHistory.push({
          revisionDate: new Date().toISOString(),
          revisionReason: data?.revisionReason || 'Revisions requested',
          revisionCompleteDate: null
        });

        updates = {
          status: 'Revisions Requested',
          revisions_requested: true,
          revision_details: data?.revisionReason,
          revision_history: revisionHistory,
          reviewed_date: new Date().toISOString()
        };

        noteUpdates = {
          locked: false,
          locked_date: null,
          locked_by: null
        };

        notificationData = {
          type: 'revisions_requested',
          clinicianId: cosignature.clinician_id,
          supervisorId: userId
        };
        break;

      case 'cosign':
        // Supervisor cosigns the note
        updates = {
          status: 'Cosigned',
          supervisor_cosigned: true,
          supervisor_cosigned_date: new Date().toISOString(),
          supervisor_comments: data?.comments,
          time_spent_reviewing: data?.timeSpent,
          is_incident_to: data?.isIncidentTo || false,
          supervisor_attestation: data?.attestation
        };

        noteUpdates = {
          locked: true,
          locked_date: new Date().toISOString(),
          locked_by: userId,
          supervised_by: userId,
          supervision_date: new Date().toISOString()
        };

        notificationData = {
          type: 'cosigned',
          clinicianId: cosignature.clinician_id,
          supervisorId: userId
        };
        break;

      case 'reject':
        // Supervisor rejects the note
        updates = {
          status: 'Returned',
          supervisor_comments: data?.comments,
          reviewed_date: new Date().toISOString()
        };

        noteUpdates = {
          locked: false,
          locked_date: null,
          locked_by: null
        };

        notificationData = {
          type: 'rejected',
          clinicianId: cosignature.clinician_id,
          supervisorId: userId
        };
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    // Update cosignature record
    const { error: updateError } = await supabaseClient
      .from('note_cosignatures')
      .update(updates)
      .eq('id', cosignatureId);

    if (updateError) {
      throw new Error(`Failed to update cosignature: ${updateError.message}`);
    }

    // Update clinical note if needed
    if (Object.keys(noteUpdates).length > 0) {
      const { error: noteError } = await supabaseClient
        .from('clinical_notes')
        .update(noteUpdates)
        .eq('id', noteId);

      if (noteError) {
        console.error('Failed to update note:', noteError);
        // Don't throw - cosignature update is more critical
      }
    }

    // Send notification if needed
    if (notificationData) {
      try {
        await supabaseClient.functions.invoke('supervision-notifications', {
          body: {
            ...notificationData,
            cosignatureId
          }
        });
      } catch (notifError) {
        console.error('Failed to send notification:', notifError);
        // Don't throw - workflow update is more critical
      }
    }

    console.log(`Workflow action ${action} completed successfully`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        action,
        cosignatureId,
        newStatus: updates.status 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in cosignature workflow:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
