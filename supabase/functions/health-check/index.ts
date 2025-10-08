import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const checks = {
      timestamp: new Date().toISOString(),
      status: 'healthy',
      checks: {} as Record<string, any>,
    };

    // Check database connectivity
    try {
      const { error } = await supabase.from('profiles').select('count').limit(1);
      checks.checks.database = {
        status: error ? 'unhealthy' : 'healthy',
        message: error ? error.message : 'Connected',
      };
      if (error) checks.status = 'degraded';
    } catch (e) {
      checks.checks.database = {
        status: 'unhealthy',
        message: e instanceof Error ? e.message : 'Unknown error',
      };
      checks.status = 'unhealthy';
    }

    // Check auth service
    try {
      const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
      checks.checks.auth = {
        status: error ? 'unhealthy' : 'healthy',
        message: error ? error.message : 'Connected',
      };
      if (error) checks.status = 'degraded';
    } catch (e) {
      checks.checks.auth = {
        status: 'unhealthy',
        message: e instanceof Error ? e.message : 'Unknown error',
      };
      checks.status = 'unhealthy';
    }

    // Check storage
    try {
      const { data, error } = await supabase.storage.listBuckets();
      checks.checks.storage = {
        status: error ? 'unhealthy' : 'healthy',
        message: error ? error.message : `${data?.length || 0} buckets available`,
      };
      if (error) checks.status = 'degraded';
    } catch (e) {
      checks.checks.storage = {
        status: 'unhealthy',
        message: e instanceof Error ? e.message : 'Unknown error',
      };
      checks.status = 'unhealthy';
    }

    const statusCode = checks.status === 'healthy' ? 200 : checks.status === 'degraded' ? 207 : 503;

    return new Response(JSON.stringify(checks, null, 2), {
      status: statusCode,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      }),
      {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
