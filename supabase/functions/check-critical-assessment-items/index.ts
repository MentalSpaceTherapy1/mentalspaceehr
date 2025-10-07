import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CheckCriticalItemsRequest {
  administrationId: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { administrationId }: CheckCriticalItemsRequest = await req.json();

    // Fetch administration with assessment details
    const { data: administration, error: adminError } = await supabase
      .from("assessment_administrations")
      .select(`
        *,
        assessment:clinical_assessments(*)
      `)
      .eq("id", administrationId)
      .single();

    if (adminError) throw adminError;

    const assessment = administration.assessment;
    const criticalItems = assessment.critical_items || [];

    if (criticalItems.length === 0) {
      return new Response(
        JSON.stringify({ success: true, alertsCreated: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const responses = administration.responses || {};
    const alerts = [];

    // Check each critical item
    for (const criticalItem of criticalItems) {
      const { itemId, threshold, action, notifyRoles, severity } = criticalItem;
      const response = responses[itemId];

      if (response === undefined) continue;

      let isTriggered = false;

      // Check if response exceeds threshold
      if (typeof response === "number" && typeof threshold === "number") {
        isTriggered = response >= threshold;
      } else if (response === threshold) {
        isTriggered = true;
      }

      if (isTriggered) {
        // Find item text from assessment items
        const assessmentItem = assessment.items?.find((i: any) => i.itemId === itemId);
        const itemText = assessmentItem?.itemText || itemId;

        alerts.push({
          administration_id: administrationId,
          assessment_id: assessment.id,
          client_id: administration.client_id,
          critical_item_id: itemId,
          item_text: itemText,
          response_value: response,
          severity: severity || "High",
          action_required: action,
          alert_status: "Active",
        });
      }
    }

    // Insert alerts
    if (alerts.length > 0) {
      const { error: insertError } = await supabase
        .from("assessment_critical_alerts")
        .insert(alerts);

      if (insertError) throw insertError;

      // Get clinician info for notifications
      const { data: client } = await supabase
        .from("clients")
        .select("primary_therapist_id, psychiatrist_id, case_manager_id")
        .eq("id", administration.client_id)
        .single();

      // Notify relevant users
      const usersToNotify = [
        client?.primary_therapist_id,
        client?.psychiatrist_id,
        client?.case_manager_id,
      ].filter(Boolean);

      // TODO: Send notifications (email, dashboard alerts)
    }

    return new Response(
      JSON.stringify({
        success: true,
        alertsCreated: alerts.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: 'Failed to check critical items' }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
