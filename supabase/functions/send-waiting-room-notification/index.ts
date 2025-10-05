import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { waitingRoomId } = await req.json();

    if (!waitingRoomId) {
      return new Response(
        JSON.stringify({ error: 'waitingRoomId is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log(`[Waiting Room Notification] Processing notification for room: ${waitingRoomId}`);

    // Check if notifications are enabled in practice settings
    const { data: settings } = await supabaseClient
      .from('practice_settings')
      .select('telehealth_settings')
      .single();

    const telehealthSettings = (settings?.telehealth_settings as any) || {};
    const notificationsEnabled = telehealthSettings.notify_clinician_on_arrival !== false; // Default to true

    if (!notificationsEnabled) {
      console.log('[Waiting Room Notification] Notifications disabled in settings');
      return new Response(
        JSON.stringify({ message: 'Notifications disabled', skipped: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Fetch waiting room details with appointment and clinician info
    const { data: waitingRoom, error: fetchError } = await supabaseClient
      .from('telehealth_waiting_rooms')
      .select(`
        id,
        session_id,
        client_arrived_time,
        appointment_id,
        appointments:appointment_id (
          id,
          appointment_date,
          start_time,
          appointment_type,
          clinician_id,
          client_id,
          clients:client_id (
            first_name,
            last_name
          )
        )
      `)
      .eq('id', waitingRoomId)
      .single();

    if (fetchError || !waitingRoom) {
      console.error('[Waiting Room Notification] Error fetching waiting room:', fetchError);
      throw new Error('Waiting room not found');
    }

    const appointment = waitingRoom.appointments as any;
    const client = appointment.clients;
    const clinicianId = appointment.clinician_id;

    // Fetch clinician profile for email
    const { data: clinician } = await supabaseClient
      .from('profiles')
      .select('email, first_name, last_name')
      .eq('id', clinicianId)
      .single();

    if (!clinician?.email) {
      console.error('[Waiting Room Notification] Clinician email not found');
      throw new Error('Clinician email not found');
    }

    // Check for custom notification email override
    const notificationEmail = telehealthSettings.waiting_room_notification_email || clinician.email;

    // Calculate wait time
    const waitTime = Math.floor((Date.now() - new Date(waitingRoom.client_arrived_time).getTime()) / 60000);

    // Format appointment date and time
    const appointmentDate = new Date(appointment.appointment_date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Create session link
    const sessionLink = `${Deno.env.get('SUPABASE_URL')?.replace('//', '//app.')}/telehealth/session/${waitingRoom.session_id}`;

    // Send email notification
    const emailResponse = await resend.emails.send({
      from: 'MentalSpace Telehealth <onboarding@resend.dev>',
      to: [notificationEmail],
      subject: `Client Waiting: ${client.first_name} ${client.last_name}`,
      html: `
        <h2>Client Waiting in Virtual Waiting Room</h2>
        <p>Hello Dr. ${clinician.last_name},</p>
        
        <p><strong>${client.first_name} ${client.last_name}</strong> has arrived and is waiting in the virtual waiting room.</p>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Appointment Details:</strong></p>
          <p style="margin: 5px 0;">Type: ${appointment.appointment_type}</p>
          <p style="margin: 5px 0;">Date: ${appointmentDate}</p>
          <p style="margin: 5px 0;">Time: ${appointment.start_time}</p>
          <p style="margin: 5px 0;">Wait Time: ${waitTime} minute${waitTime !== 1 ? 's' : ''}</p>
        </div>
        
        <p>
          <a href="${sessionLink}" style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
            Join Session & Admit Client
          </a>
        </p>
        
        <p style="color: #666; font-size: 12px; margin-top: 20px;">
          You can also send a message to the client from the waiting room if you need a few more minutes.
        </p>
      `,
    });

    console.log('[Waiting Room Notification] Email sent:', emailResponse);

    // Update waiting room with notification status
    await supabaseClient
      .from('telehealth_waiting_rooms')
      .update({
        clinician_notified: true,
        notification_time: new Date().toISOString()
      })
      .eq('id', waitingRoomId);

    return new Response(
      JSON.stringify({
        message: 'Notification sent successfully',
        emailId: emailResponse.data?.id,
        sentTo: notificationEmail
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[Waiting Room Notification] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});