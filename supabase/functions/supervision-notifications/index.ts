import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationEvent {
  type: 'new_cosignature' | 'cosigned' | 'revisions_requested' | 'rejected' | 'overdue_cosignature';
  cosignatureId: string;
  supervisorId?: string;
  clinicianId?: string;
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

    // Get cosignature record
    const { data: cosignature, error: cosigError } = await supabase
      .from('note_cosignatures')
      .select(`
        *,
        clinician:profiles!note_cosignatures_clinician_id_fkey(id, first_name, last_name, email),
        supervisor:profiles!note_cosignatures_supervisor_id_fkey(id, first_name, last_name, email),
        client:clients!note_cosignatures_client_id_fkey(first_name, last_name)
      `)
      .eq('id', event.cosignatureId)
      .single();

    if (cosigError || !cosignature) {
      throw new Error('Cosignature record not found');
    }

    // Get practice settings for notification preferences
    const { data: practiceSettings } = await supabase
      .from('practice_settings')
      .select('cosign_settings')
      .single();

    const notificationSettings = (practiceSettings?.cosign_settings as any)?.notification_settings || {};
    
    // Initialize notification log
    const notificationLog = Array.isArray(cosignature.notification_log) 
      ? cosignature.notification_log 
      : [];

    // Handle different notification types
    let emailSent = false;
    let recipient = '';
    
    switch (event.type) {
      case 'new_cosignature':
        if (notificationSettings.send_new_note_notification !== false) {
          await resend.emails.send({
            from: 'MentalSpace <notifications@mentalspace.app>',
            to: cosignature.supervisor.email,
            subject: `New Note Awaiting Co-Signature - ${cosignature.client.first_name} ${cosignature.client.last_name}`,
            html: `
              <h2>New Note Requires Your Co-Signature</h2>
              <p>Dear ${cosignature.supervisor.first_name},</p>
              <p><strong>${cosignature.clinician.first_name} ${cosignature.clinician.last_name}</strong> has submitted a new clinical note for client <strong>${cosignature.client.first_name} ${cosignature.client.last_name}</strong> that requires your co-signature.</p>
              <p><strong>Note Type:</strong> ${cosignature.note_type}</p>
              <p><strong>Date of Service:</strong> ${new Date(cosignature.note_date).toLocaleDateString()}</p>
              <p><strong>Due Date:</strong> ${new Date(cosignature.due_date).toLocaleDateString()}</p>
              <p>Please review and sign the note to maintain compliance.</p>
              <p><a href="${supabaseUrl}/dashboard" style="background-color: #3B82F6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">View Dashboard</a></p>
            `
          });
          emailSent = true;
          recipient = cosignature.supervisor.email;
        }
        break;

      case 'cosigned':
        if (notificationSettings.send_cosigned_notification !== false) {
          await resend.emails.send({
            from: 'MentalSpace <notifications@mentalspace.app>',
            to: cosignature.clinician.email,
            subject: `Note Co-Signed - ${cosignature.client.first_name} ${cosignature.client.last_name}`,
            html: `
              <h2 style="color: #10B981;">Your Note Has Been Co-Signed</h2>
              <p>Dear ${cosignature.clinician.first_name},</p>
              <p><strong>${cosignature.supervisor.first_name} ${cosignature.supervisor.last_name}</strong> has co-signed your clinical note for client <strong>${cosignature.client.first_name} ${cosignature.client.last_name}</strong>.</p>
              <p><strong>Note Type:</strong> ${cosignature.note_type}</p>
              <p><strong>Date of Service:</strong> ${new Date(cosignature.note_date).toLocaleDateString()}</p>
              <p>The note is now complete and locked.</p>
              <p><a href="${supabaseUrl}/dashboard" style="background-color: #10B981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">View Dashboard</a></p>
            `
          });
          emailSent = true;
          recipient = cosignature.clinician.email;
        }
        break;

      case 'revisions_requested':
        if (notificationSettings.send_revision_notification !== false) {
          await resend.emails.send({
            from: 'MentalSpace <notifications@mentalspace.app>',
            to: cosignature.clinician.email,
            subject: `Revisions Requested - ${cosignature.client.first_name} ${cosignature.client.last_name}`,
            html: `
              <h2 style="color: #F59E0B;">Revisions Requested for Your Note</h2>
              <p>Dear ${cosignature.clinician.first_name},</p>
              <p><strong>${cosignature.supervisor.first_name} ${cosignature.supervisor.last_name}</strong> has requested revisions on your clinical note for client <strong>${cosignature.client.first_name} ${cosignature.client.last_name}</strong>.</p>
              <p><strong>Note Type:</strong> ${cosignature.note_type}</p>
              <p><strong>Date of Service:</strong> ${new Date(cosignature.note_date).toLocaleDateString()}</p>
              <p><strong>Revision Reason:</strong> ${cosignature.revision_details || 'See supervisor comments'}</p>
              <p>Please make the requested changes and resubmit for co-signature.</p>
              <p><a href="${supabaseUrl}/notes" style="background-color: #F59E0B; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">Edit Note</a></p>
            `
          });
          emailSent = true;
          recipient = cosignature.clinician.email;
        }
        break;

      case 'rejected':
        if (notificationSettings.send_rejection_notification !== false) {
          await resend.emails.send({
            from: 'MentalSpace <notifications@mentalspace.app>',
            to: cosignature.clinician.email,
            subject: `Note Returned - ${cosignature.client.first_name} ${cosignature.client.last_name}`,
            html: `
              <h2 style="color: #DC2626;">Note Returned by Supervisor</h2>
              <p>Dear ${cosignature.clinician.first_name},</p>
              <p><strong>${cosignature.supervisor.first_name} ${cosignature.supervisor.last_name}</strong> has returned your clinical note for client <strong>${cosignature.client.first_name} ${cosignature.client.last_name}</strong>.</p>
              <p><strong>Note Type:</strong> ${cosignature.note_type}</p>
              <p><strong>Date of Service:</strong> ${new Date(cosignature.note_date).toLocaleDateString()}</p>
              <p><strong>Comments:</strong> ${cosignature.supervisor_comments || 'No comments provided'}</p>
              <p>Please review the feedback and resubmit when ready.</p>
              <p><a href="${supabaseUrl}/notes" style="background-color: #DC2626; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">View Note</a></p>
            `
          });
          emailSent = true;
          recipient = cosignature.clinician.email;
        }
        break;

      case 'overdue_cosignature':
        if (notificationSettings.send_overdue_notification !== false) {
          // Send to supervisor
          await resend.emails.send({
            from: 'MentalSpace <notifications@mentalspace.app>',
            to: cosignature.supervisor.email,
            subject: `OVERDUE: Co-Signature Required - ${cosignature.client.first_name} ${cosignature.client.last_name}`,
            html: `
              <h2 style="color: #DC2626;">⚠️ Overdue Co-Signature</h2>
              <p>Dear ${cosignature.supervisor.first_name},</p>
              <p>A clinical note submitted by <strong>${cosignature.clinician.first_name} ${cosignature.clinician.last_name}</strong> is now overdue for co-signature.</p>
              <p><strong>Client:</strong> ${cosignature.client.first_name} ${cosignature.client.last_name}</p>
              <p><strong>Note Type:</strong> ${cosignature.note_type}</p>
              <p><strong>Date of Service:</strong> ${new Date(cosignature.note_date).toLocaleDateString()}</p>
              <p><strong>Due Date:</strong> ${new Date(cosignature.due_date).toLocaleDateString()}</p>
              <p><strong>Days Overdue:</strong> ${Math.floor((Date.now() - new Date(cosignature.due_date).getTime()) / (1000 * 60 * 60 * 24))}</p>
              <p style="color: #DC2626; font-weight: bold;">This note requires immediate attention to maintain compliance.</p>
              <p><a href="${supabaseUrl}/dashboard" style="background-color: #DC2626; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">Review Now</a></p>
            `
          });
          emailSent = true;
          recipient = cosignature.supervisor.email;

          // Escalate to admins if enabled
          const escalationThreshold = (practiceSettings?.cosign_settings as any)?.auto_escalate_after_days_overdue || 3;
          const daysOverdue = Math.floor((Date.now() - new Date(cosignature.due_date).getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysOverdue >= escalationThreshold && notificationSettings.escalate_to_admins !== false) {
            // Get admin emails
            const { data: adminUsers } = await supabase
              .from('user_roles')
              .select('user_id, profiles!inner(email, first_name, last_name)')
              .eq('role', 'administrator');

            if (adminUsers && adminUsers.length > 0) {
              for (const admin of adminUsers) {
                const profile = (admin as any).profiles;
                await resend.emails.send({
                  from: 'MentalSpace <notifications@mentalspace.app>',
                  to: profile.email,
                  subject: `🚨 ESCALATION: Overdue Co-Signature - ${daysOverdue} Days`,
                  html: `
                    <h2 style="color: #DC2626;">🚨 Compliance Alert: Overdue Co-Signature</h2>
                    <p>Dear ${profile.first_name},</p>
                    <p>A clinical note has been overdue for co-signature for <strong>${daysOverdue} days</strong>, exceeding the escalation threshold.</p>
                    <p><strong>Supervisor:</strong> ${cosignature.supervisor.first_name} ${cosignature.supervisor.last_name}</p>
                    <p><strong>Clinician:</strong> ${cosignature.clinician.first_name} ${cosignature.clinician.last_name}</p>
                    <p><strong>Client:</strong> ${cosignature.client.first_name} ${cosignature.client.last_name}</p>
                    <p><strong>Note Type:</strong> ${cosignature.note_type}</p>
                    <p><strong>Date of Service:</strong> ${new Date(cosignature.note_date).toLocaleDateString()}</p>
                    <p><strong>Due Date:</strong> ${new Date(cosignature.due_date).toLocaleDateString()}</p>
                    <p style="color: #DC2626; font-weight: bold;">Administrative intervention may be required.</p>
                    <p><a href="${supabaseUrl}/admin/supervision-management" style="background-color: #DC2626; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">Review Supervision Records</a></p>
                  `
                });
                
                notificationLog.push({
                  date: new Date().toISOString(),
                  type: 'escalation',
                  recipient: profile.email,
                  status: 'sent'
                });
              }
            }
          }
        }
        break;
    }

    // Log the notification
    if (emailSent) {
      notificationLog.push({
        date: new Date().toISOString(),
        type: event.type,
        recipient: recipient,
        status: 'sent'
      });

      // Update cosignature with notification log
      await supabase
        .from('note_cosignatures')
        .update({ notification_log: notificationLog })
        .eq('id', event.cosignatureId);
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