import { Client } from 'https://deno.land/x/postgres@v0.17.0/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Connect to Aurora
    const client = new Client({
      hostname: Deno.env.get('DATABASE_HOST')!,
      port: parseInt(Deno.env.get('DATABASE_PORT') || '5432'),
      database: Deno.env.get('DATABASE_NAME')!,
      user: Deno.env.get('DATABASE_USER')!,
      password: Deno.env.get('DATABASE_PASSWORD')!,
      tls: {
        enabled: true,
        enforce: false,
        caCertificates: [],
      },
    });

    await client.connect();
    console.log('✅ Connected to Aurora');

    // Create migrations tracking table
    await client.queryObject(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Get list of already applied migrations
    const appliedResult = await client.queryObject<{ version: string }>(
      'SELECT version FROM schema_migrations ORDER BY version'
    );
    const appliedMigrations = new Set(appliedResult.rows.map(r => r.version));

    await client.end();

    return new Response(
      JSON.stringify({
        status: 'ready',
        message: 'Aurora connection successful. Ready to apply migrations.',
        appliedMigrations: appliedMigrations.size,
        note: 'Migrations must be applied individually via Supabase CLI or through SQL scripts'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Aurora connection error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
