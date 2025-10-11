import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface ProxyRequest {
  environment: 'sandbox' | 'production';
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: Record<string, any>;
  headers?: Record<string, string>;
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
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { environment, endpoint, method, body, headers }: ProxyRequest = await req.json();

    // Validate environment
    if (environment !== 'sandbox' && environment !== 'production') {
      throw new Error('Invalid environment');
    }

    // Get base URL from environment
    const baseUrl = environment === 'production'
      ? Deno.env.get('ADVANCEDMD_PROD_BASE_URL') || 'https://api.advancedmd.com/v1'
      : Deno.env.get('ADVANCEDMD_SANDBOX_BASE_URL') || 'https://api-sandbox.advancedmd.com/v1';

    // Build full URL
    const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;

    console.log(`[AdvancedMD Proxy] ${method} ${url}`);

    // Prepare headers
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...headers,
    };

    // Make request to AdvancedMD
    const requestOptions: RequestInit = {
      method,
      headers: requestHeaders,
    };

    if (body && (method === 'POST' || method === 'PUT')) {
      requestOptions.body = JSON.stringify(body);
    }

    const response = await fetch(url, requestOptions);

    // Get response data
    const contentType = response.headers.get('content-type');
    let responseData: any;

    if (contentType?.includes('application/json')) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
    }

    // Log to database
    try {
      await supabase.from('advancedmd_api_logs').insert({
        id: crypto.randomUUID(),
        endpoint,
        method,
        request_body: body,
        response_body: responseData,
        status_code: response.status,
        environment,
        created_at: new Date().toISOString(),
      });
    } catch (logError) {
      console.error('[AdvancedMD Proxy] Failed to log request:', logError);
    }

    if (!response.ok) {
      console.error('[AdvancedMD Proxy] Error response:', response.status, responseData);
      throw new Error(`API request failed: ${response.status}`);
    }

    return new Response(JSON.stringify(responseData), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    console.error('[AdvancedMD Proxy] Error:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'API request failed',
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
