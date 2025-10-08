import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let assignmentIds: string[] = [];
  let clientId = '';

  try {
    const body = await req.json();
    assignmentIds = body.assignmentIds;
    clientId = body.clientId;
    
    if (!assignmentIds || assignmentIds.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No assignment IDs provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Fetch all assignments with their templates
    const { data: assignments, error } = await supabase
      .from('portal_form_assignments')
      .select(`
        *,
        template:portal_form_templates(*),
        client:clients(first_name, last_name, email)
      `)
      .in('id', assignmentIds);

    if (error || !assignments || assignments.length === 0) {
      throw new Error('Failed to fetch assignments');
    }

    const client = assignments[0].client;
    const siteUrl = Deno.env.get('SITE_URL') || 'https://your-site.com';

    // Build forms list HTML
    const formsHtml = assignments.map((a: any, index: number) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${index + 1}. ${a.template.title}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${a.template.form_type}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${a.template.estimated_minutes ? `~${a.template.estimated_minutes} min` : 'N/A'}</td>
      </tr>
    `).join('');

    const totalMinutes = assignments.reduce((sum: number, a: any) => sum + (a.template.estimated_minutes || 0), 0);

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #4f46e5; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 20px; }
            .button { display: inline-block; padding: 12px 24px; background: #4f46e5; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            table { width: 100%; border-collapse: collapse; background: white; margin: 20px 0; }
            th { background: #f3f4f6; padding: 12px; text-align: left; font-weight: 600; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">New Forms Assigned</h1>
            </div>
            <div class="content">
              <p>Dear ${client.first_name} ${client.last_name},</p>
              <p>You have been assigned <strong>${assignments.length} new form${assignments.length > 1 ? 's' : ''}</strong> to complete in your client portal.</p>
              
              <table>
                <thead>
                  <tr>
                    <th>Form Name</th>
                    <th>Type</th>
                    <th>Est. Time</th>
                  </tr>
                </thead>
                <tbody>
                  ${formsHtml}
                </tbody>
              </table>

              <p><strong>Total estimated time: ~${totalMinutes} minutes</strong></p>
              
              <a href="${siteUrl}/portal/login" class="button">Access Portal</a>
              
              <p style="color: #6b7280; font-size: 14px;">
                If you have any questions, please contact your provider.
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send via SendGrid
    const sendGridApiKey = Deno.env.get('SENDGRID_API_KEY');
    if (!sendGridApiKey) {
      console.error('SENDGRID_API_KEY not configured');
      
      // Log all notifications as failed
      const notifications = assignmentIds.map(id => ({
        assignment_id: id,
        recipient_email: client.email,
        status: 'failed',
        error_message: 'SENDGRID_API_KEY not configured',
        sent_at: new Date().toISOString(),
      }));
      
      await supabase.from('portal_form_notifications').insert(notifications);
      
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const sgResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sendGridApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email: client.email }],
        }],
        from: { email: 'noreply@mentalspace.com', name: 'MentalSpace' },
        subject: `${assignments.length} New Form${assignments.length > 1 ? 's' : ''} Available`,
        content: [{ type: 'text/html', value: html }],
      }),
    });

    if (!sgResponse.ok) {
      const errorText = await sgResponse.text();
      throw new Error(`SendGrid error: ${sgResponse.statusText} - ${errorText}`);
    }

    // Log all notifications as sent
    const notifications = assignmentIds.map(id => ({
      assignment_id: id,
      recipient_email: client.email,
      status: 'sent',
      sent_at: new Date().toISOString(),
    }));

    await supabase.from('portal_form_notifications').insert(notifications);

    console.log(`Bulk notification sent for ${assignments.length} forms to ${client.email}`);

    return new Response(
      JSON.stringify({ success: true, formCount: assignments.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Bulk notification error:', error);
    
    // Try to log errors for all assignments
    if (assignmentIds && assignmentIds.length > 0) {
      try {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );
        
        const { data: client } = await supabase
          .from('clients')
          .select('email')
          .eq('id', clientId)
          .single();
        
        if (client) {
          const notifications = assignmentIds.map(id => ({
            assignment_id: id,
            recipient_email: client.email,
            status: 'failed',
            error_message: error?.message || 'Unknown error',
            sent_at: new Date().toISOString(),
          }));
          
          await supabase.from('portal_form_notifications').insert(notifications);
        }
      } catch (logError) {
        console.error('Failed to log errors:', logError);
      }
    }
    
    return new Response(
      JSON.stringify({ error: error?.message || 'Failed to send bulk notification' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
