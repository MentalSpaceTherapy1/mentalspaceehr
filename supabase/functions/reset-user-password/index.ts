import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ResetPasswordRequest {
  userId: string;
  newPassword: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, newPassword }: ResetPasswordRequest = await req.json();

    // Validate input
    if (!userId || !newPassword) {
      throw new Error('Missing userId or newPassword');
    }

    // Validate password complexity
    if (newPassword.length < 12) {
      throw new Error('Password must be at least 12 characters long');
    }
    if (!/[A-Z]/.test(newPassword)) {
      throw new Error('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(newPassword)) {
      throw new Error('Password must contain at least one lowercase letter');
    }
    if (!/[0-9]/.test(newPassword)) {
      throw new Error('Password must contain at least one number');
    }
    if (!/[^A-Za-z0-9]/.test(newPassword)) {
      throw new Error('Password must contain at least one special character');
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
    let callerId: string | null = null;
    try {
      const [, payloadB64] = token.split('.');
      const json = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'));
      const payload = JSON.parse(json);
      callerId = payload?.sub ?? null;
    } catch (e) {
      // Invalid token format
    }

    if (!callerId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const { data: isAdmin, error: roleErr } = await supabaseUser.rpc('has_role', { _user_id: callerId, _role: 'administrator' });
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

    // Update user password using admin API
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    if (error) throw error;

    return new Response(
      JSON.stringify({ success: true, message: 'Password reset successfully' }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: 'Password reset failed' }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
