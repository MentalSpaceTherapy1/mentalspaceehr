import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { Resend } from 'https://esm.sh/resend@4.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

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
        const clinicianEmail = consent.profiles?.email;
        const clientName = `${consent.clients?.first_name} ${consent.clients?.last_name}`;
        const clinicianName = `${consent.profiles?.first_name || ''} ${consent.profiles?.last_name || ''}`.trim();
        
        if (!clientEmail) {
          continue;
        }

        // Send email to client
        const appUrl = Deno.env.get('APP_URL') || 'https://your-app-url.com';
        
        await resend.emails.send({
          from: 'MentalSpace <noreply@resend.dev>',
          to: [clientEmail],
          subject: 'Telehealth Consent Renewal Required',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">Telehealth Consent Renewal</h2>
              <p>Hi ${consent.clients.first_name},</p>
              <p>Your telehealth consent is expiring on <strong>${new Date(consent.expiration_date).toLocaleDateString()}</strong> (in 30 days).</p>
              <p>To continue receiving telehealth services, please complete the renewal form before your next session.</p>
              <p style="margin: 30px 0;">
                <a href="${appUrl}/telehealth/consent-renewal/${consent.id}" 
                   style="background-color: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
                  Renew Consent Now
                </a>
              </p>
              <p style="color: #666; font-size: 14px;">If you have any questions, please contact your clinician.</p>
              <p>Best regards,<br>Your MentalSpace Team</p>
            </div>
          `,
        });

        // Send notification to clinician
        if (clinicianEmail) {
          await resend.emails.send({
            from: 'MentalSpace <noreply@resend.dev>',
            to: [clinicianEmail],
            subject: `Client Consent Expiring: ${clientName}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Telehealth Consent Expiration Notice</h2>
                <p>Hi ${clinicianName},</p>
                <p>This is a reminder that <strong>${clientName}</strong>'s telehealth consent will expire on <strong>${new Date(consent.expiration_date).toLocaleDateString()}</strong>.</p>
                <p>A renewal notification has been sent to the client. Please follow up if they have not renewed the consent before their next scheduled telehealth session.</p>
                <p style="color: #666; font-size: 14px;">Client Email: ${clientEmail}</p>
              </div>
            `,
          });
        }

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
      } catch (error: any) {
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
    return new Response(
      JSON.stringify({ error: 'Renewal check failed' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
