import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Payload {
  waitlist_id: string;
  custom_message?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { waitlist_id, custom_message }: Payload = await req.json();
    if (!waitlist_id) {
      return new Response(
        JSON.stringify({ success: false, message: "waitlist_id is required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseKey);
    const resend = new Resend(resendApiKey);

    // Fetch waitlist entry
    const { data: entry, error: entryError } = await supabase
      .from("appointment_waitlist")
      .select("id, client_id, clinician_id, appointment_type, preferred_days, preferred_times")
      .eq("id", waitlist_id)
      .maybeSingle();

    if (entryError) throw entryError;
    if (!entry) {
      return new Response(
        JSON.stringify({ success: false, message: "Waitlist entry not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    // Fetch client and clinician
    const [{ data: client }, { data: clinician }] = await Promise.all([
      supabase.from("clients").select("first_name, last_name, email, primary_phone").eq("id", entry.client_id).maybeSingle(),
      supabase.from("profiles").select("first_name, last_name").eq("id", entry.clinician_id).maybeSingle(),
    ]);

    if (!client?.email) {
      return new Response(
        JSON.stringify({ success: false, message: "Client has no email on file" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const preferredDays = (entry.preferred_days || []) as string[];
    const preferredTimes = (entry.preferred_times || []) as string[];

    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const preferredDaysText = preferredDays.length
      ? preferredDays.map((d) => dayNames[parseInt(d)]).join(", ")
      : "Any";
    const preferredTimesText = preferredTimes.length ? preferredTimes.join(", ") : "Any";

    const html = `
      <div>
        <h2 style="margin:0 0 12px 0">Appointment Availability</h2>
        <p>Hi ${client.first_name},</p>
        <p>${custom_message || "A time may be available that matches your preferences. Please confirm if you'd like to book this appointment."}</p>
        <div style="background:#f5f7fb;padding:12px;border-radius:8px;margin:16px 0">
          <p style="margin:4px 0"><strong>Type:</strong> ${entry.appointment_type}</p>
          <p style="margin:4px 0"><strong>Preferred Days:</strong> ${preferredDaysText}</p>
          <p style="margin:4px 0"><strong>Preferred Times:</strong> ${preferredTimesText}</p>
          <p style="margin:4px 0"><strong>Clinician:</strong> ${clinician?.first_name ?? ""} ${clinician?.last_name ?? ""}</p>
        </div>
        <p>Reply to this email to confirm, or call our office to schedule.</p>
        <p style="margin-top:16px">Best regards,<br/>MentalSpace Team</p>
      </div>
    `;

    const emailResult = await resend.emails.send({
      from: "MentalSpace <onboarding@resend.dev>",
      to: [client.email],
      subject: "Waitlist Update: Appointment Availability",
      html,
    });

    console.log("Email sent via Resend:", emailResult);

    // Update entry as notified
    await supabase
      .from("appointment_waitlist")
      .update({ notified: true, notified_date: new Date().toISOString() })
      .eq("id", waitlist_id);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("send-waitlist-email error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
