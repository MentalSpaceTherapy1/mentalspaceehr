import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token } = await req.json();

    if (!token) {
      return new Response(
        JSON.stringify({ error: "Confirmation token required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Find appointment by confirmation token
    const { data: appointment, error: findError } = await supabase
      .from('appointments')
      .select('id, client_id, status')
      .eq('reminder_confirmation_token', token)
      .maybeSingle();

    if (findError || !appointment) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired confirmation token" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Update appointment as confirmed
    const { error: updateError } = await supabase
      .from('appointments')
      .update({
        reminder_confirmed: true,
        reminder_confirmed_at: new Date().toISOString(),
        status: 'Confirmed'
      })
      .eq('id', appointment.id);

    if (updateError) throw updateError;

    // Update reminder log
    await supabase
      .from('reminder_logs')
      .update({
        status: 'confirmed',
        confirmed_at: new Date().toISOString()
      })
      .eq('appointment_id', appointment.id)
      .eq('status', 'sent');

    return new Response(
      JSON.stringify({ 
        success: true,
        message: "Appointment confirmed successfully" 
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in confirm-appointment:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
