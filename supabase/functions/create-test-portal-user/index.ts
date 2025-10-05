import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('VITE_SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Create test user credentials
    const testEmail = `testclient${Date.now()}@example.com`;
    const testPassword = 'TestClient123!';

    // Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: {
        first_name: 'Test',
        last_name: 'Client'
      }
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('No user created');

    // Generate MRN
    const { data: mrnData, error: mrnError } = await supabaseAdmin.rpc('generate_mrn');
    if (mrnError) throw mrnError;

    // Create client record
    const { data: clientData, error: clientError } = await supabaseAdmin
      .from('clients')
      .insert({
        first_name: 'Test',
        last_name: 'Client',
        medical_record_number: mrnData,
        date_of_birth: '1990-01-01',
        email: testEmail,
        primary_phone: '555-0100',
        primary_phone_type: 'Mobile',
        street1: '123 Test St',
        city: 'Test City',
        state: 'CA',
        zip_code: '90001',
        portal_enabled: true,
        portal_user_id: authData.user.id,
        status: 'Active'
      })
      .select()
      .single();

    if (clientError) throw clientError;

    // Assign client_user role
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: authData.user.id,
        role: 'client_user',
        assigned_by: authData.user.id
      });

    if (roleError) throw roleError;

    return new Response(
      JSON.stringify({
        success: true,
        credentials: {
          email: testEmail,
          password: testPassword,
          userId: authData.user.id,
          clientId: clientData.id
        },
        message: 'Test portal user created successfully. Use these credentials to log in.'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error creating test portal user:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error occurred' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
