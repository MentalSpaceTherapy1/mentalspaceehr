import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { Resend } from "npm:resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AppointmentDetails {
  id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  service_location: string;
  telehealth_link: string | null;
  client: {
    first_name: string;
    last_name: string;
    email: string;
    primary_phone: string;
  };
  clinician: {
    first_name: string;
    last_name: string;
    title: string;
  };
  location: {
    location_name: string;
    street1: string;
    city: string;
    state: string;
  } | null;
}

function replaceTemplateVariables(
  template: string,
  appointment: AppointmentDetails,
  confirmationUrl: string,
  rescheduleUrl: string,
  cancelUrl: string
): string {
  const { client, clinician, location } = appointment;
  
  const date = new Date(appointment.appointment_date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  const locationText = appointment.service_location === 'Telehealth' 
    ? 'Telehealth (Virtual)' 
    : location 
      ? `${location.location_name}, ${location.street1}, ${location.city}, ${location.state}`
      : appointment.service_location;
  
  const telehealthLink = appointment.telehealth_link 
    ? `\n\nJoin your session: ${supabaseUrl.replace('supabase.co', 'lovableproject.com')}${appointment.telehealth_link}`
    : '';
  
  return template
    .replace(/{client_name}/g, `${client.first_name} ${client.last_name}`)
    .replace(/{clinician_name}/g, `${clinician.title || ''} ${clinician.first_name} ${clinician.last_name}`.trim())
    .replace(/{date}/g, date)
    .replace(/{time}/g, appointment.start_time)
    .replace(/{location}/g, locationText)
    .replace(/{telehealth_link}/g, telehealthLink)
    .replace(/{confirmation_link}/g, confirmationUrl)
    .replace(/{reschedule_link}/g, rescheduleUrl)
    .replace(/{cancel_link}/g, cancelUrl);
}

async function sendEmailReminder(
  appointment: AppointmentDetails,
  settings: any,
  hoursBefor: number
): Promise<void> {
  const confirmationToken = await generateConfirmationToken(appointment.id);
  const baseUrl = supabaseUrl.replace('supabase.co', 'lovableproject.com');
  
  const confirmationUrl = `${baseUrl}/confirm-appointment/${confirmationToken}`;
  const rescheduleUrl = `${baseUrl}/schedule?appointmentId=${appointment.id}`;
  const cancelUrl = `${baseUrl}/cancel-appointment/${confirmationToken}`;
  
  const emailContent = replaceTemplateVariables(
    settings.email_template,
    appointment,
    confirmationUrl,
    rescheduleUrl,
    cancelUrl
  );
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Appointment Reminder</h2>
      <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        ${emailContent.replace(/\n/g, '<br>')}
      </div>
      ${settings.require_confirmation ? `
        <div style="margin: 20px 0;">
          <a href="${confirmationUrl}" style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Confirm Appointment
          </a>
        </div>
      ` : ''}
      <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd;">
        ${settings.include_reschedule_link ? `<a href="${rescheduleUrl}" style="color: #3b82f6; margin-right: 15px;">Reschedule</a>` : ''}
        ${settings.include_cancel_link ? `<a href="${cancelUrl}" style="color: #ef4444;">Cancel Appointment</a>` : ''}
      </div>
      <p style="color: #666; font-size: 12px; margin-top: 20px;">
        This is an automated reminder from your healthcare provider.
      </p>
    </div>
  `;
  
  try {
    const { error } = await resend.emails.send({
      from: "Appointments <onboarding@resend.dev>",
      to: [appointment.client.email],
      subject: `Appointment Reminder - ${new Date(appointment.appointment_date).toLocaleDateString()}`,
      html
    });
    
    if (error) throw error;
    
    // Log successful send
    await supabase.from('reminder_logs').insert({
      appointment_id: appointment.id,
      reminder_type: 'email',
      hours_before: hoursBefor,
      status: 'sent',
      sent_at: new Date().toISOString(),
      recipient: appointment.client.email
    });
    
    console.log(`Email reminder sent to ${appointment.client.email}`);
  } catch (error) {
    console.error('Error sending email:', error);
    
    await supabase.from('reminder_logs').insert({
      appointment_id: appointment.id,
      reminder_type: 'email',
      hours_before: hoursBefor,
      status: 'failed',
      error_message: error.message,
      recipient: appointment.client.email
    });
    
    throw error;
  }
}

async function generateConfirmationToken(appointmentId: string): Promise<string> {
  const token = crypto.randomUUID();
  
  await supabase
    .from('appointments')
    .update({ reminder_confirmation_token: token })
    .eq('id', appointmentId);
  
  return token;
}

async function processReminders(): Promise<any> {
  console.log('Processing appointment reminders...');
  
  // Get reminder settings
  const { data: settings } = await supabase
    .from('reminder_settings')
    .select('*')
    .single();
  
  if (!settings || !settings.enabled) {
    console.log('Reminders disabled');
    return { processed: 0, message: 'Reminders disabled' };
  }
  
  const results = {
    processed: 0,
    sent: 0,
    failed: 0,
    errors: [] as string[]
  };
  
  // Process email reminders
  if (settings.email_enabled && settings.email_timing) {
    for (const hours of settings.email_timing) {
      const targetTime = new Date();
      targetTime.setHours(targetTime.getHours() + hours);
      
      // Get appointments that need reminders
      const { data: appointments, error } = await supabase
        .from('appointments')
        .select(`
          *,
          client:clients!inner(first_name, last_name, email, primary_phone),
          clinician:profiles!appointments_clinician_id_fkey(first_name, last_name, title),
          location:practice_locations(location_name, street1, city, state)
        `)
        .eq('status', 'Scheduled')
        .gte('appointment_date', targetTime.toISOString().split('T')[0])
        .lte('appointment_date', targetTime.toISOString().split('T')[0]);
      
      if (error) {
        console.error('Error fetching appointments:', error);
        results.errors.push(error.message);
        continue;
      }
      
      for (const appointment of appointments || []) {
        // Check if reminder already sent
        const { data: existingLog } = await supabase
          .from('reminder_logs')
          .select('id')
          .eq('appointment_id', appointment.id)
          .eq('reminder_type', 'email')
          .eq('hours_before', hours)
          .eq('status', 'sent')
          .maybeSingle();
        
        if (existingLog) {
          console.log(`Reminder already sent for appointment ${appointment.id}`);
          continue;
        }
        
        try {
          await sendEmailReminder(appointment as AppointmentDetails, settings, hours);
          results.sent++;
        } catch (error) {
          console.error(`Failed to send reminder for appointment ${appointment.id}:`, error);
          results.failed++;
          results.errors.push(`Appointment ${appointment.id}: ${error.message}`);
        }
        
        results.processed++;
      }
    }
  }
  
  console.log('Reminder processing complete:', results);
  return results;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const results = await processReminders();
    
    return new Response(JSON.stringify(results), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-appointment-reminder:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
