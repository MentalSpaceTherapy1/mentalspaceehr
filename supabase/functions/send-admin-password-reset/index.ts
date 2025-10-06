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

    console.log('Generating password reset link for:', email);

    if (!email) {
      throw new Error('Email is required');
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

    // Generate password reset link using admin API
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email,
    });

    if (error) {
      console.error('Error generating reset link:', error);
      throw error;
    }

    if (!data.properties?.action_link) {
      throw new Error('Failed to generate reset link');
    }

    console.log('Reset link generated successfully');

    // Call the existing send-password-reset function to send the email
    const { error: emailError } = await supabaseAdmin.functions.invoke('send-password-reset', {
      body: {
        email: email,
        resetUrl: data.properties.action_link,
        firstName: firstName,
      },
    });

    if (emailError) {
      console.error('Error sending reset email:', emailError);
      throw emailError;
    }

    console.log('Password reset email sent successfully to:', email);

    return new Response(
      JSON.stringify({ success: true, message: 'Password reset email sent successfully' }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-admin-password-reset function:", error);
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
