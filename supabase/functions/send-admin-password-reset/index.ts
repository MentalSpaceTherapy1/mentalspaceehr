import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PasswordResetEmailRequest {
  email: string;
  firstName?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, firstName }: PasswordResetEmailRequest = await req.json();

    if (!email) {
      throw new Error('Email is required');
    }

    // Get authorization token from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    // Extract JWT token from Authorization header
    const token = authHeader.replace('Bearer ', '');

    // Create client that uses caller's JWT for RLS checks
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    // Decode JWT to get user id (verify_jwt=true already ensured validity)
    let userId: string | null = null;
    try {
      const [, payloadB64] = token.split('.');
      const json = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'));
      const payload = JSON.parse(json);
      userId = payload?.sub ?? null;
    } catch (e) {
      // Invalid token
    }

    if (!userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const { data: isAdmin, error: roleErr } = await supabaseUser.rpc('has_role', { _user_id: userId, _role: 'administrator' });
    if (roleErr) {
      return new Response(JSON.stringify({ error: 'Permission check failed' }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }
    
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    // Create Supabase admin client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Prepare redirect URL to take user straight to the Reset Password page
    const site = Deno.env.get("SITE_URL") ?? '';
    const finalRedirect = site ? `${site.replace(/\/$/, '')}/reset-password` : '';

    // Generate password reset link using admin API
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: finalRedirect ? { redirectTo: finalRedirect } : undefined,
    });

    if (error) throw error;

    if (!data.properties?.action_link) {
      throw new Error('Failed to generate reset link');
    }

    // Call the existing send-password-reset function to send the email
    const { error: emailError } = await supabaseAdmin.functions.invoke('send-password-reset', {
      body: {
        email: email,
        resetUrl: data.properties.action_link,
        firstName: firstName,
      },
    });

    if (emailError) throw emailError;

    return new Response(
      JSON.stringify({ success: true, message: 'Password reset email sent successfully' }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: 'Admin password reset failed' }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
