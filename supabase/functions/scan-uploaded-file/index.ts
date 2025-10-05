import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { filePath, bucket } = await req.json();

    console.log(`Scanning file: ${filePath} in bucket: ${bucket}`);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Download file from storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .download(filePath);

    if (error) {
      console.error('Error downloading file:', error);
      throw error;
    }

    // TODO: Integrate with virus scanning service
    // Options for production:
    // 1. VirusTotal API (https://www.virustotal.com/gui/home/upload)
    // 2. ClamAV REST API (open-source)
    // 3. AWS GuardDuty Malware Protection
    // 4. Google Cloud Security Command Center

    // For now, perform basic security checks
    const fileBuffer = await data.arrayBuffer();
    const bytes = new Uint8Array(fileBuffer);

    // Check for executable file signatures
    const suspiciousPatterns = [
      { pattern: [0x4D, 0x5A], name: 'Windows Executable (MZ)' }, // EXE
      { pattern: [0x7F, 0x45, 0x4C, 0x46], name: 'Linux Executable (ELF)' },
      { pattern: [0x50, 0x4B, 0x03, 0x04], name: 'ZIP Archive' }, // Could contain malware
      { pattern: [0x52, 0x61, 0x72, 0x21], name: 'RAR Archive' },
    ];

    for (const { pattern, name } of suspiciousPatterns) {
      if (bytes.length >= pattern.length) {
        const matches = pattern.every((byte, i) => bytes[i] === byte);
        if (matches) {
          console.warn(`Suspicious file detected: ${name}`);
          
          // Delete the file
          await supabase.storage.from(bucket).remove([filePath]);
          
          // Log security incident
          await supabase.from('security_incidents').insert({
            incident_type: 'Malicious File Upload Attempt',
            severity: 'High',
            description: `Suspicious file type detected: ${name} - File: ${filePath}`,
            ip_address: req.headers.get('x-forwarded-for') || 'unknown',
          });

          return new Response(
            JSON.stringify({
              success: false,
              error: 'File failed security scan: Suspicious file type detected',
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 403,
            }
          );
        }
      }
    }

    console.log('File passed basic security checks');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'File passed security scan',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in scan-uploaded-file function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
