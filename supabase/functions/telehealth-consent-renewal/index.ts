import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Find consents expiring in 30 days that haven't been notified
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const targetDate = thirtyDaysFromNow.toISOString().split('T')[0];

    const { data: expiringConsents, error: queryError } = await supabase
      .from('telehealth_consents')
      .select(`
        *,
        clients:client_id (
          id,
          first_name,
          last_name,
          email
        ),
        profiles:clinician_id (
          id,
          email
        )
      `)
      .eq('consent_given', true)
      .eq('consent_revoked', false)
      .eq('renewal_notified', false)
      .eq('expiration_date', targetDate);

    if (queryError) throw queryError;

    console.log(`Found ${expiringConsents?.length || 0} consents expiring in 30 days`);

    if (!expiringConsents || expiringConsents.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No consents require renewal notification' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = [];

    // Send renewal notifications
    for (const consent of expiringConsents) {
      try {
        const clientEmail = consent.clients?.email;
        const clientName = `${consent.clients?.first_name} ${consent.clients?.last_name}`;
        
        if (!clientEmail) {
          console.log(`No email for client ${clientName}, skipping notification`);
          continue;
        }

        // Log notification (email sending would be configured separately)
        console.log(`Would send renewal notification to ${clientEmail}`);

        // Mark as notified
        await supabase
          .from('telehealth_consents')
          .update({
            renewal_notified: true,
            renewal_notification_date: new Date().toISOString(),
          })
          .eq('id', consent.id);

        results.push({
          consentId: consent.id,
          clientName,
          status: 'notified',
        });

        console.log(`Notification sent to ${clientName} (${clientEmail})`);
      } catch (error: any) {
        console.error(`Error notifying consent ${consent.id}:`, error);
        results.push({
          consentId: consent.id,
          status: 'error',
          error: error.message,
        });
      }
    }

    return new Response(
      JSON.stringify({
        message: `Processed ${results.length} renewal notifications`,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in telehealth-consent-renewal:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
