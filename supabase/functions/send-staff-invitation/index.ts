import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
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
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const { userId, tempPassword } = await req.json();

    console.log('Sending staff invitation for user:', userId);

    // Get user details
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('first_name, last_name, email')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('Profile error:', profileError);
      throw profileError;
    }

    // Get practice settings for email templates
    const { data: settings } = await supabaseAdmin
      .from('practice_settings')
      .select('portal_email_templates')
      .maybeSingle();

    const portalUrl = `${Deno.env.get('SUPABASE_URL')?.replace('https://', 'https://mental-space-ai.lovable.app') || 'https://mental-space-ai.lovable.app'}`;
    
    // Default staff invitation template
    const defaultSubject = 'Your Staff Account is Ready - Mental Space AI';
    const defaultBody = `Hello ${profile.first_name} ${profile.last_name},

Your staff account for Mental Space AI has been created. You now have access to the clinical management system.

Login Credentials:
Email: ${profile.email}
Temporary Password: ${tempPassword}

⚠️ Important: You'll be required to change your password upon first login for security purposes.

Login URL: ${portalUrl}

If you have any questions or need assistance, please contact your administrator.

Best regards,
Mental Space AI Team`;

    // Use custom template if available
    const templates = settings?.portal_email_templates as any;
    const subject = templates?.staff_invitation_subject || defaultSubject;
    let body = templates?.staff_invitation_body || defaultBody;

    // Replace template variables
    body = body
      .replace(/{firstName}/g, profile.first_name)
      .replace(/{lastName}/g, profile.last_name)
      .replace(/{email}/g, profile.email)
      .replace(/{tempPassword}/g, tempPassword)
      .replace(/{portalUrl}/g, portalUrl);

    console.log('Sending email to:', profile.email);

    const emailResponse = await resend.emails.send({
      from: "Mental Space AI <onboarding@resend.dev>",
      to: [profile.email],
      subject: subject,
      text: body,
    });

    console.log('Email sent successfully:', emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Invitation email sent successfully' 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in send-staff-invitation function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
