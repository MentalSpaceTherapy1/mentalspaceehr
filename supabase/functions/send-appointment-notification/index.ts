import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const resendApiKey = Deno.env.get("RESEND_API_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const resend = new Resend(resendApiKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  appointmentId: string;
  notificationType: "created" | "updated" | "cancelled";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { appointmentId, notificationType }: NotificationRequest = await req.json();

    console.log(`Processing ${notificationType} notification for appointment ${appointmentId}`);

    // Fetch appointment details with related data
    const { data: appointment, error: appointmentError } = await supabase
      .from("appointments")
      .select(`
        *,
        client:clients!client_id(
          first_name,
          last_name,
          email,
          consents
        ),
        clinician:profiles!clinician_id(
          first_name,
          last_name,
          title
        ),
        location:practice_locations!office_location_id(
          location_name,
          street1,
          city,
          state,
          zip_code
        )
      `)
      .eq("id", appointmentId)
      .single();

    if (appointmentError || !appointment) {
      throw new Error(`Failed to fetch appointment: ${appointmentError?.message}`);
    }

    // Check if client has opted in for appointment reminders
    const clientConsents = appointment.client?.consents as any;
    if (!clientConsents?.appointmentReminders) {
      console.log("Client has not opted in for appointment notifications");
      return new Response(
        JSON.stringify({ message: "Client has not opted in for notifications" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const clientEmail = appointment.client?.email;
    if (!clientEmail) {
      throw new Error("Client email not found");
    }

    // Format date and time
    const appointmentDate = new Date(appointment.appointment_date);
    const formattedDate = appointmentDate.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const formattedTime = appointment.start_time;

    const clinicianName = `${appointment.clinician?.title || ""} ${appointment.clinician?.first_name} ${appointment.clinician?.last_name}`.trim();
    const clientName = `${appointment.client?.first_name} ${appointment.client?.last_name}`;
    
    let locationInfo = "";
    if (appointment.service_location === "Telehealth") {
      locationInfo = `Telehealth Session${appointment.telehealth_link ? `\nJoin Link: ${appointment.telehealth_link}` : ""}`;
    } else if (appointment.location) {
      locationInfo = `${appointment.location.location_name}\n${appointment.location.street1}\n${appointment.location.city}, ${appointment.location.state} ${appointment.location.zip_code}`;
      if (appointment.room) {
        locationInfo += `\nRoom: ${appointment.room}`;
      }
    }

    // Generate email content based on notification type
    let subject = "";
    let htmlContent = "";

    switch (notificationType) {
      case "created":
        subject = `Appointment Scheduled - ${formattedDate}`;
        htmlContent = `
          <h2>Your Appointment Has Been Scheduled</h2>
          <p>Dear ${clientName},</p>
          <p>Your appointment has been successfully scheduled.</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 8px;">
            <h3>Appointment Details:</h3>
            <p><strong>Date:</strong> ${formattedDate}</p>
            <p><strong>Time:</strong> ${formattedTime}</p>
            <p><strong>Provider:</strong> ${clinicianName}</p>
            <p><strong>Type:</strong> ${appointment.appointment_type}</p>
            <p><strong>Location:</strong><br/>${locationInfo.replace(/\n/g, "<br/>")}</p>
          </div>
          
          <p>If you need to make any changes to your appointment, please contact our office.</p>
          <p>We look forward to seeing you!</p>
        `;
        break;

      case "updated":
        subject = `Appointment Updated - ${formattedDate}`;
        htmlContent = `
          <h2>Your Appointment Has Been Updated</h2>
          <p>Dear ${clientName},</p>
          <p>Your appointment details have been changed.</p>
          
          <div style="background-color: #fff3cd; padding: 20px; margin: 20px 0; border-radius: 8px;">
            <h3>Updated Appointment Details:</h3>
            <p><strong>Date:</strong> ${formattedDate}</p>
            <p><strong>Time:</strong> ${formattedTime}</p>
            <p><strong>Provider:</strong> ${clinicianName}</p>
            <p><strong>Type:</strong> ${appointment.appointment_type}</p>
            <p><strong>Location:</strong><br/>${locationInfo.replace(/\n/g, "<br/>")}</p>
          </div>
          
          <p>If you have any questions about these changes, please contact our office.</p>
        `;
        break;

      case "cancelled":
        subject = `Appointment Cancelled - ${formattedDate}`;
        htmlContent = `
          <h2>Your Appointment Has Been Cancelled</h2>
          <p>Dear ${clientName},</p>
          <p>Your appointment scheduled for <strong>${formattedDate}</strong> at <strong>${formattedTime}</strong> with ${clinicianName} has been cancelled.</p>
          
          ${appointment.cancellation_reason ? `<p><strong>Reason:</strong> ${appointment.cancellation_reason}</p>` : ""}
          
          <p>If you would like to reschedule, please contact our office.</p>
        `;
        break;
    }

    // Log notification attempt
    const { data: logEntry } = await supabase
      .from("appointment_notifications")
      .insert({
        appointment_id: appointmentId,
        notification_type: notificationType,
        recipient_email: clientEmail,
        status: "pending",
      })
      .select()
      .single();

    // Send email via Resend
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: "MentalSpace <onboarding@resend.dev>",
      to: [clientEmail],
      subject: subject,
      html: htmlContent,
    });

    if (emailError) {
      // Update log with failure
      if (logEntry) {
        await supabase
          .from("appointment_notifications")
          .update({
            status: "failed",
            error_message: emailError.message,
          })
          .eq("id", logEntry.id);
      }
      throw emailError;
    }

    // Update log with success
    if (logEntry) {
      await supabase
        .from("appointment_notifications")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
          resend_id: emailData?.id,
        })
        .eq("id", logEntry.id);
    }

    console.log(`Email sent successfully via Resend:`, emailData);

    return new Response(
      JSON.stringify({ success: true, emailId: emailData?.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error) {
    console.error("Error sending appointment notification:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
