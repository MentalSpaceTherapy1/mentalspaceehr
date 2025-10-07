import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Validation schema
const requestSchema = z.object({
  clientId: z.string().uuid('Invalid client ID format'),
  email: z.string().email('Invalid email format').max(255),
  clientName: z.string().min(1).max(200),
});

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rawBody = await req.json();
    
    // Validate input
    const validation = requestSchema.safeParse(rawBody);
    if (!validation.success) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid input',
          details: validation.error.issues 
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const { clientId, email, clientName } = validation.data;

    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users.find(u => u.email === email);

    let userId: string;
    let isNewUser = false;

    if (existingUser) {
      userId = existingUser.id;
      
      // Update metadata to mark as portal user
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: {
          ...existingUser.user_metadata,
          client_id: clientId,
          is_portal_user: true,
        },
      });
    } else {
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

      if (authError) throw authError;

      userId = authData.user.id;
      isNewUser = true;
    }

    // Assign client_user role (check if it exists first)
    const { data: existingRole } = await supabaseAdmin
      .from('user_roles')
      .select('*')
      .eq('user_id', userId)
      .eq('role', 'client_user')
      .single();

    if (!existingRole) {
      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .insert({ user_id: userId, role: 'client_user' });

      if (roleError) throw roleError;
    }

    // Update client with portal_user_id
    const { error: updateError } = await supabaseAdmin
      .from('clients')
      .update({ 
        portal_user_id: userId, 
        portal_enabled: true,
        email: email
      })
      .eq('id', clientId);

    if (updateError) throw updateError;

    // SECURITY: Never return passwords in API response
    // Password should only be sent via email
    return new Response(
      JSON.stringify({ 
        success: true, 
        userId: userId,
        isNewUser: isNewUser,
        message: isNewUser 
          ? 'Portal user created successfully. Credentials sent via email.'
          : 'Portal access enabled for existing user.'
      }), 
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: 'Failed to create portal user' }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
