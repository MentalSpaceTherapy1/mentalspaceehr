import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const resendApiKey = Deno.env.get("RESEND_API_KEY")!;

// Helper: send SMS via Twilio (if configured)
const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID");
const twilioAuth = Deno.env.get("TWILIO_AUTH_TOKEN");
const twilioFrom = Deno.env.get("TWILIO_PHONE_NUMBER");
const canSendSms = !!(twilioSid && twilioAuth && twilioFrom);

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

  const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  console.log(`[${executionId}] === NOTIFICATION FUNCTION STARTED ===`);
  
  try {
    const { appointmentId, notificationType }: NotificationRequest = await req.json();
    console.log(`[${executionId}] Request: appointmentId=${appointmentId}, type=${notificationType}`);

    // Validate environment variables
    if (!resendApiKey) {
      console.error(`[${executionId}] CRITICAL: RESEND_API_KEY not configured`);
      throw new Error("Email service not configured");
    }
    console.log(`[${executionId}] RESEND_API_KEY: configured`);
    console.log(`[${executionId}] Twilio SMS: ${canSendSms ? 'configured' : 'NOT configured'}`);

    // Check notification settings
    const { data: notificationSettings, error: settingsError } = await supabase
      .from("appointment_notification_settings")
      .select("*")
      .maybeSingle();
    
    console.log(`[${executionId}] Notification settings loaded:`, {
      found: !!notificationSettings,
      send_on_create: notificationSettings?.send_on_create,
      send_on_update: notificationSettings?.send_on_update,
      send_on_cancel: notificationSettings?.send_on_cancel,
      respect_client_preferences: notificationSettings?.respect_client_preferences
    });

    // Check if this notification type is enabled
    const isEnabled = notificationSettings 
      ? (notificationType === 'created' && notificationSettings.send_on_create) ||
        (notificationType === 'updated' && notificationSettings.send_on_update) ||
        (notificationType === 'cancelled' && notificationSettings.send_on_cancel)
      : true; // Default to enabled if no settings found

    if (!isEnabled) {
      console.log(`[${executionId}] Notifications for ${notificationType} are DISABLED in settings`);
      return new Response(
        JSON.stringify({ message: `Notifications for ${notificationType} are disabled`, executionId }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }
    
    console.log(`[${executionId}] Notification type ${notificationType} is ENABLED`);

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
          title,
          email,
          phone_number
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
      console.error(`[${executionId}] Failed to fetch appointment:`, appointmentError);
      throw new Error(`Failed to fetch appointment: ${appointmentError?.message}`);
    }
    
    console.log(`[${executionId}] Appointment loaded:`, {
      id: appointment.id,
      client: `${appointment.client?.first_name} ${appointment.client?.last_name}`,
      clientEmail: appointment.client?.email,
      clinician: `${appointment.clinician?.first_name} ${appointment.clinician?.last_name}`,
      clinicianEmail: appointment.clinician?.email,
      date: appointment.appointment_date,
      time: appointment.start_time
    });

    // Check client consent for appointment notifications
    // NOTE: Transactional appointment notifications (create/update/cancel) should generally be sent
    // regardless of "reminder" preferences, as they're critical communications about scheduled care
    const respectPreferences = notificationSettings?.respect_client_preferences !== false;
    let clientAllows = true;
    
    if (respectPreferences) {
      const clientConsents = appointment.client?.consents as any;
      // For now, we respect appointmentReminders setting, but this should ideally be separated
      // into "appointment notifications" (transactional) vs "reminders" (marketing)
      if (clientConsents && clientConsents.appointmentReminders === false) {
        clientAllows = false;
        console.log(`[${executionId}] Client has OPTED OUT - blocking notification per preference`);
      } else {
        console.log(`[${executionId}] Client consent check: ALLOWED`);
      }
    } else {
      // If respect_client_preferences is false, always send (treat as transactional)
      console.log(`[${executionId}] Client consent check: SKIPPED (sending transactional notification)`);
    }

    const clientEmail = appointment.client?.email || null;

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

    // Use custom templates if available
    const useCustomTemplate = notificationSettings !== null;
    let subject = "";
    let htmlContent = "";

    if (useCustomTemplate && notificationSettings) {
      // Replace template variables
      const replaceVars = (template: string) => {
        return template
          .replace(/{client_name}/g, clientName)
          .replace(/{clinician_name}/g, clinicianName)
          .replace(/{date}/g, formattedDate)
          .replace(/{time}/g, formattedTime)
          .replace(/{location}/g, locationInfo.replace(/\n/g, '<br/>'))
          .replace(/{appointment_type}/g, appointment.appointment_type)
          .replace(/{telehealth_link}/g, appointment.telehealth_link || '')
          .replace(/{cancellation_reason}/g, appointment.cancellation_reason || '');
      };

      switch (notificationType) {
        case "created":
          subject = replaceVars(notificationSettings.created_subject);
          htmlContent = `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            ${replaceVars(notificationSettings.created_template).replace(/\n/g, '<br/>')}
          </div>`;
          break;
        case "updated":
          subject = replaceVars(notificationSettings.updated_subject);
          htmlContent = `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            ${replaceVars(notificationSettings.updated_template).replace(/\n/g, '<br/>')}
          </div>`;
          break;
        case "cancelled":
          subject = replaceVars(notificationSettings.cancelled_subject);
          htmlContent = `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            ${replaceVars(notificationSettings.cancelled_template).replace(/\n/g, '<br/>')}
          </div>`;
          break;
      }
    } else {
      // Default templates
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
    }

    // Determine recipients from settings
    const notifyRecipients: string[] = Array.isArray(notificationSettings?.notify_recipients)
      ? (notificationSettings!.notify_recipients as string[])
      : ["client"]; // default

    const notifyClient = notifyRecipients.includes("client") && clientAllows;
    const notifyClinician = notifyRecipients.includes("clinician");
    
    console.log(`[${executionId}] Notification recipients:`, {
      notifyClient,
      notifyClinician,
      clientAllows,
      configuredRecipients: notifyRecipients
    });

    // Attempt to get phone numbers for SMS (optional)
    let clientPhone: string | null = null;
    let clinicianPhone: string | null = null;
    try {
      const { data: clientRow } = await supabase
        .from("clients")
        .select("primary_phone")
        .eq("id", appointment.client_id)
        .single();
      if (clientRow) {
        clientPhone = clientRow.primary_phone as string | null;
        console.log(`[${executionId}] Client phone lookup: ${clientPhone || 'not found'}`);
      }
      const { data: clinicianRow } = await supabase
        .from("profiles")
        .select("phone_number")
        .eq("id", appointment.clinician_id)
        .single();
      if (clinicianRow) {
        clinicianPhone = clinicianRow.phone_number as string | null;
        console.log(`[${executionId}] Clinician phone lookup: ${clinicianPhone || 'not found'}`);
      }
    } catch (e) {
      console.error(`[${executionId}] Phone lookup error:`, e);
    }

    // Helper: normalize US/E.164 phone
    const normalizePhone = (phone: string): string | null => {
      if (!phone) return null;
      const raw = phone.trim();
      if (raw.startsWith('+') && raw.length > 8) return raw;
      const digits = raw.replace(/\D/g, '');
      if (digits.length === 10) return `+1${digits}`;
      if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
      return null;
    };

    // Helper: send email via Resend with role-specific content
    const sendEmail = async (to: string, recipientType: 'client' | 'clinician') => {
      let roleSubject = subject;
      let roleHtmlContent = htmlContent;
      
      // Create clinician-specific content if needed
      if (recipientType === 'clinician') {
        const dashboardLink = `${Deno.env.get('SITE_URL') || 'https://app.chctherapy.com'}/clients/${appointment.client_id}`;
        
        switch (notificationType) {
          case "created":
            roleSubject = `New Appointment: ${clientName} - ${formattedDate}`;
            roleHtmlContent = `
              <h2>New Appointment Scheduled</h2>
              <p>A new appointment has been scheduled with your client.</p>
              
              <div style="background-color: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 8px;">
                <h3>Appointment Details:</h3>
                <p><strong>Client:</strong> ${clientName}</p>
                <p><strong>Date:</strong> ${formattedDate}</p>
                <p><strong>Time:</strong> ${formattedTime}</p>
                <p><strong>Type:</strong> ${appointment.appointment_type}</p>
                <p><strong>Location:</strong><br/>${locationInfo.replace(/\n/g, "<br/>")}</p>
                ${appointment.notes ? `<p><strong>Notes:</strong> ${appointment.notes}</p>` : ''}
              </div>
              
              <p><a href="${dashboardLink}" style="display: inline-block; background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 10px;">View Client Chart</a></p>
            `;
            break;
          case "updated":
            roleSubject = `Appointment Updated: ${clientName} - ${formattedDate}`;
            roleHtmlContent = `
              <h2>Appointment Updated</h2>
              <p>An appointment with your client has been updated.</p>
              
              <div style="background-color: #fff3cd; padding: 20px; margin: 20px 0; border-radius: 8px;">
                <h3>Updated Details:</h3>
                <p><strong>Client:</strong> ${clientName}</p>
                <p><strong>Date:</strong> ${formattedDate}</p>
                <p><strong>Time:</strong> ${formattedTime}</p>
                <p><strong>Type:</strong> ${appointment.appointment_type}</p>
                <p><strong>Location:</strong><br/>${locationInfo.replace(/\n/g, "<br/>")}</p>
              </div>
              
              <p><a href="${dashboardLink}" style="display: inline-block; background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 10px;">View Client Chart</a></p>
            `;
            break;
          case "cancelled":
            roleSubject = `Appointment Cancelled: ${clientName} - ${formattedDate}`;
            roleHtmlContent = `
              <h2>Appointment Cancelled</h2>
              <p>An appointment with your client has been cancelled.</p>
              
              <div style="background-color: #fee; padding: 20px; margin: 20px 0; border-radius: 8px;">
                <p><strong>Client:</strong> ${clientName}</p>
                <p><strong>Date:</strong> ${formattedDate}</p>
                <p><strong>Time:</strong> ${formattedTime}</p>
                ${appointment.cancellation_reason ? `<p><strong>Reason:</strong> ${appointment.cancellation_reason}</p>` : ""}
              </div>
              
              <p><a href="${dashboardLink}" style="display: inline-block; background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 10px;">View Client Chart</a></p>
            `;
            break;
        }
      } else {
        // Client-specific content - add telehealth join link if applicable
        // ✅ FIX: Only add telehealth link for created/updated, NOT for cancelled appointments
        if (notificationType !== 'cancelled' && appointment.service_location === "Telehealth" && appointment.telehealth_link) {
          const sessionId = appointment.telehealth_link.split('/').pop();
          const joinLink = `${Deno.env.get('SITE_URL') || 'https://app.chctherapy.com'}/portal/telehealth/session/${sessionId}`;

          roleHtmlContent = roleHtmlContent.replace(
            '</div>',
            `<p style="margin-top: 15px;"><a href="${joinLink}" style="display: inline-block; background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Join Telehealth Session</a></p></div>`
          );
        }
      }
      
      const { data, error } = await resend.emails.send({
        from: "CHC Therapy <support@chctherapy.com>",
        to: [to],
        subject: roleSubject,
        html: roleHtmlContent,
      });
      if (error) throw error;
      return data?.id as string | undefined;
    };

    const sendSms = async (to: string, body: string) => {
      if (!canSendSms) return null;
      const url = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
      const params = new URLSearchParams({ To: to, From: twilioFrom!, Body: body });
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + btoa(`${twilioSid}:${twilioAuth}`),
        },
        body: params.toString(),
      });
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`Twilio SMS failed: ${resp.status} ${text}`);
      }
      const json = await resp.json();
      return json?.sid as string | undefined;
    };

    // Build recipients
    const emailTargets: Array<{ type: 'client' | 'clinician'; email: string }> = [];
    if (notifyClient && clientEmail) emailTargets.push({ type: 'client', email: clientEmail });
    if (notifyClinician && appointment.clinician?.email) emailTargets.push({ type: 'clinician', email: appointment.clinician.email });
    
    console.log(`[${executionId}] Email targets:`, emailTargets.map(t => `${t.type}: ${t.email}`));

    // Send emails and log each (non-blocking - don't stop portal messages if email fails)
    for (const target of emailTargets) {
      const { data: log } = await supabase
        .from("appointment_notifications")
        .insert({
          appointment_id: appointmentId,
          notification_type: notificationType,
          recipient_email: target.email,
          status: "pending",
        })
        .select()
        .single();

      try {
        const emailId = await sendEmail(target.email, target.type);
        console.log(`[${executionId}] ✓ Email sent to ${target.type}: ${target.email} (Resend ID: ${emailId})`);
        if (log) {
          await supabase
            .from("appointment_notifications")
            .update({
              status: "sent",
              sent_at: new Date().toISOString(),
              resend_id: emailId,
            })
            .eq("id", log.id);
        }
      } catch (e: any) {
        const errorDetails = e?.message || JSON.stringify(e) || String(e);
        console.error(`[${executionId}] ✗ Failed to send email to ${target.type}: ${target.email}`);
        console.error(`[${executionId}] Email error details:`, JSON.stringify({
          message: e?.message,
          name: e?.name,
          statusCode: e?.statusCode,
          error: e
        }));
        if (log) {
          await supabase
            .from("appointment_notifications")
            .update({ status: "failed", error_message: errorDetails })
            .eq("id", log.id);
        }
        // Continue processing - don't throw
      }
    }

    // Build SMS content (concise)
    const smsTextBase = (() => {
      switch (notificationType) {
        case 'created':
          return `Appt scheduled ${formattedDate} ${formattedTime} with ${clinicianName}. ${appointment.service_location === 'Telehealth' ? 'Telehealth' : appointment.location?.location_name || ''}`.trim();
        case 'updated':
          return `Appt updated ${formattedDate} ${formattedTime} with ${clinicianName}.`;
        case 'cancelled':
          return `Appt cancelled ${formattedDate} ${formattedTime} with ${clinicianName}.`;
      }
    })();

    const smsTargets: Array<{ type: 'client' | 'clinician'; phone: string }> = [];
    const nClient = clientPhone ? normalizePhone(clientPhone) : null;
    const nClin = clinicianPhone ? normalizePhone(clinicianPhone) : null;
    if (notifyClient && nClient) smsTargets.push({ type: 'client', phone: nClient });
    if (notifyClinician && nClin) smsTargets.push({ type: 'clinician', phone: nClin });
    
    console.log(`[${executionId}] SMS targets:`, smsTargets.map(t => `${t.type}: ${t.phone}`));

    // Send SMS (if configured) and log
    if (canSendSms) {
      console.log(`[${executionId}] Twilio SMS enabled, sending ${smsTargets.length} messages`);
      for (const target of smsTargets) {
        const { data: log } = await supabase
          .from("appointment_notifications")
          .insert({
            appointment_id: appointmentId,
            notification_type: `${notificationType}_sms`,
            recipient_email: target.phone, // storing phone for traceability
            status: "pending",
          })
          .select()
          .single();

        try {
          const smsSid = await sendSms(target.phone, smsTextBase);
          console.log(`[${executionId}] ✓ SMS sent to ${target.type}: ${target.phone} (Twilio SID: ${smsSid})`);
          if (log) {
            await supabase
              .from("appointment_notifications")
              .update({ status: "sent", sent_at: new Date().toISOString() })
              .eq("id", log.id);
          }
        } catch (e: any) {
          console.error(`[${executionId}] ✗ Failed to send SMS to ${target.type}: ${target.phone}`, e);
          console.error(`[${executionId}] SMS error details:`, {
            message: e?.message,
            name: e?.name
          });
          if (log) {
            await supabase
              .from("appointment_notifications")
              .update({ status: "failed", error_message: e?.message || String(e) })
              .eq("id", log.id);
          }
          // Continue processing - don't throw
        }
      }
    } else {
      console.log(`[${executionId}] Twilio SMS NOT configured - skipping ${smsTargets.length} SMS messages`);
    }

    // Send in-app message to client portal (always send this, even if email/SMS fail)
    if (notifyClient) {
      try {
        let messageSubject = "";
        let messageBody = "";

        switch (notificationType) {
          case "created":
            messageSubject = "Appointment Scheduled";
            messageBody = `Your appointment has been scheduled for ${formattedDate} at ${formattedTime} with ${clinicianName}.\n\nType: ${appointment.appointment_type}\nLocation: ${locationInfo}`;
            break;
          case "updated":
            messageSubject = "Appointment Updated";
            messageBody = `Your appointment has been updated.\n\nNew Details:\nDate: ${formattedDate}\nTime: ${formattedTime}\nProvider: ${clinicianName}\nType: ${appointment.appointment_type}\nLocation: ${locationInfo}`;
            break;
          case "cancelled":
            messageSubject = "Appointment Cancelled";
            messageBody = `Your appointment scheduled for ${formattedDate} at ${formattedTime} with ${clinicianName} has been cancelled.${appointment.cancellation_reason ? `\n\nReason: ${appointment.cancellation_reason}` : ""}`;
            break;
        }

        // Insert portal message
        const { error: msgError } = await supabase.from("client_portal_messages").insert({
          client_id: appointment.client_id,
          clinician_id: appointment.clinician_id,
          sender_id: appointment.clinician_id,
          subject: messageSubject,
          message: messageBody,
          priority: notificationType === "cancelled" ? "high" : "normal",
          status: "Sent",
          sent_date: new Date().toISOString(),
        });
        
        if (msgError) {
          console.error("Failed to insert portal message:", msgError);
        } else {
          console.log(`Portal message created for client: ${appointment.client_id}`);
        }
      } catch (messageError) {
        console.error("Exception sending in-app message:", messageError);
        // Don't fail the entire notification if in-app message fails
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Notification failed' }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
