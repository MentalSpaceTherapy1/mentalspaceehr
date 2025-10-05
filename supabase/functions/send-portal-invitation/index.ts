import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvitationRequest {
  clientId: string;
  email: string;
  firstName: string;
  lastName: string;
  tempPassword: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { clientId, email, firstName, lastName, tempPassword }: InvitationRequest = await req.json();

    console.log('Sending portal invitation to:', email);

    const portalUrl = `${supabaseUrl.replace('supabase.co', 'lovable.app')}/portal/login`;

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .credentials { background: white; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #667eea; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
            .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to Your Client Portal!</h1>
            </div>
            <div class="content">
              <p>Hello ${firstName} ${lastName},</p>
              
              <p>Your client portal account has been activated. You now have secure access to:</p>
              
              <ul>
                <li>View and manage appointments</li>
                <li>Communicate with your care team</li>
                <li>Access your billing information</li>
                <li>View treatment progress and resources</li>
                <li>Update your profile and preferences</li>
              </ul>

              <div class="credentials">
                <h3>Your Login Credentials</h3>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Temporary Password:</strong> ${tempPassword}</p>
              </div>

              <div class="warning">
                <strong>⚠️ Important:</strong> You'll be required to verify your email and change your password on first login.
              </div>

              <div style="text-align: center;">
                <a href="${portalUrl}" class="button">Access Your Portal</a>
              </div>

              <p><strong>Portal URL:</strong> <a href="${portalUrl}">${portalUrl}</a></p>

              <div class="footer">
                <p>If you didn't request this account, please contact our office immediately.</p>
                <p>For assistance, please reach out to your care team.</p>
                <p>&copy; ${new Date().getFullYear()} Mental Health Practice. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    const emailResponse = await resend.emails.send({
      from: "CHC Therapy Client Portal <support@chctherapy.com>",
      to: [email],
      subject: "Your Client Portal Account is Ready!",
      html: emailHtml,
    });

    console.log("Invitation email sent successfully:", emailResponse);

    // Log the invitation
    const supabase = createClient(supabaseUrl, supabaseKey);
    await supabase.from('portal_access_log').insert({
      client_id: clientId,
      user_id: null,
      action: 'invitation_sent',
      success: true,
      ip_address: req.headers.get('x-forwarded-for') || 'unknown',
    });

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending invitation:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
