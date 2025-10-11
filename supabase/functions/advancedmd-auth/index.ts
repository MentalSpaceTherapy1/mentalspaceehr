import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

interface AuthRequest {
  environment: 'sandbox' | 'production';
  grant_type: 'client_credentials' | 'refresh_token';
  client_id: string;
  client_secret: string;
  refresh_token?: string;
}

serve(async (req) => {
  // CORS headers
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    const { environment, grant_type, client_id, client_secret, refresh_token }: AuthRequest = await req.json();

    // Validate environment
    if (environment !== 'sandbox' && environment !== 'production') {
      throw new Error('Invalid environment');
    }

    // Get base URL from environment
    const baseUrl = environment === 'production'
      ? Deno.env.get('ADVANCEDMD_PROD_BASE_URL') || 'https://api.advancedmd.com/v1'
      : Deno.env.get('ADVANCEDMD_SANDBOX_BASE_URL') || 'https://api-sandbox.advancedmd.com/v1';

    // Build request body
    const body: Record<string, string> = {
      grant_type,
      client_id,
      client_secret,
    };

    if (grant_type === 'refresh_token' && refresh_token) {
      body.refresh_token = refresh_token;
    }

    // Make OAuth request to AdvancedMD
    const response = await fetch(`${baseUrl}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: new URLSearchParams(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[AdvancedMD Auth] Error:', errorText);
      throw new Error(`Authentication failed: ${response.status} ${errorText}`);
    }

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    console.error('[AdvancedMD Auth] Error:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Authentication failed',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});
