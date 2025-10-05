import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreatePortalUserRequest {
  clientId: string;
  email: string;
  clientName: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { clientId, email, clientName }: CreatePortalUserRequest = await req.json();

    console.log('Creating portal user for client:', clientId);

    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Generate temporary password
    const tempPassword = `Temp${Math.random().toString(36).slice(-8)}!1A`;

    // Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: false,
      user_metadata: {
        client_id: clientId,
        is_portal_user: true,
      },
    });

    if (authError) {
      console.error('Auth error:', authError);
      throw authError;
    }

    console.log('User created:', authData.user.id);

    // Assign client_user role
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({ user_id: authData.user.id, role: 'client_user' });

    if (roleError) {
      console.error('Role assignment error:', roleError);
      throw roleError;
    }

    console.log('Role assigned successfully');

    // Update client with portal_user_id
    const { error: updateError } = await supabaseAdmin
      .from('clients')
      .update({ 
        portal_user_id: authData.user.id, 
        portal_enabled: true,
        email: email
      })
      .eq('id', clientId);

    if (updateError) {
      console.error('Client update error:', updateError);
      throw updateError;
    }

    console.log('Client updated successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        userId: authData.user.id,
        tempPassword: tempPassword 
      }), 
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error creating portal user:", error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to create portal user' }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
