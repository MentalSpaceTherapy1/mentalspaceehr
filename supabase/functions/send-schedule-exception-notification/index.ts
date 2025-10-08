import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  exceptionId: string;
  clinicianId: string;
  exceptionType: string;
  startDate: string;
  endDate: string;
  reason: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { exceptionId, clinicianId, exceptionType, startDate, endDate, reason }: NotificationRequest = await req.json();

    console.log("Processing schedule exception notification:", { exceptionId, clinicianId });

    // Get clinician details
    const { data: clinician, error: clinicianError } = await supabase
      .from("profiles")
      .select("first_name, last_name, email")
      .eq("id", clinicianId)
      .single();

    if (clinicianError) {
      console.error("Error fetching clinician:", clinicianError);
      throw clinicianError;
    }

    // Get admin emails for approval notifications
    const { data: adminRoles, error: adminError } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "administrator");

    if (adminError) {
      console.error("Error fetching admins:", adminError);
      throw adminError;
    }

    const adminIds = adminRoles?.map(r => r.user_id) || [];
    
    const { data: admins, error: adminsError } = await supabase
      .from("profiles")
      .select("email, first_name, last_name")
      .in("id", adminIds);

    if (adminsError) {
      console.error("Error fetching admin profiles:", adminsError);
      throw adminsError;
    }

    // Log notification (email sending would require Resend API key)
    console.log("Would send notifications to admins:", admins?.map(a => a.email));
    console.log("Exception details:", {
      clinician: `${clinician.first_name} ${clinician.last_name}`,
      type: exceptionType,
      dates: `${startDate} to ${endDate}`,
      reason
    });

    // Log notification in database
    await supabase.from("notification_logs").insert({
      notification_type: "schedule_exception_request",
      recipient_type: "Administrator",
      recipient_ids: adminIds,
      subject: "Schedule Exception Approval Needed",
      sent_date: new Date().toISOString(),
      status: "Sent",
      related_record_id: exceptionId,
      related_record_type: "schedule_exception"
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Notification logged successfully",
        adminCount: admins?.length || 0
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error: any) {
    console.error("Error processing schedule exception notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
};

serve(handler);