import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const siteUrl = Deno.env.get("SITE_URL") || supabaseUrl;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  assignmentId: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { assignmentId }: NotificationRequest = await req.json();
    console.log("Processing notification for assignment:", assignmentId);

    // Create Supabase client with service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch assignment details with template and client info
    const { data: assignment, error: assignmentError } = await supabase
      .from("portal_form_assignments")
      .select(`
        *,
        template:portal_form_templates(*),
        client:clients(
          id,
          first_name,
          last_name,
          email,
          portal_user_id
        )
      `)
      .eq("id", assignmentId)
      .single();

    if (assignmentError || !assignment) {
      throw new Error(`Assignment not found: ${assignmentError?.message}`);
    }

    if (!assignment.client?.email) {
      throw new Error("Client email not found");
    }

    if (!assignment.client.portal_user_id) {
      throw new Error("Client does not have portal access");
    }

    // Format the email content
    const clientName = `${assignment.client.first_name} ${assignment.client.last_name}`;
    const formTitle = assignment.template?.title || "Form";
    const formType = assignment.template?.form_type || "";
    const estimatedMinutes = assignment.template?.estimated_minutes;
    const dueDate = assignment.due_date 
      ? new Date(assignment.due_date).toLocaleDateString('en-US', { 
          month: 'long', 
          day: 'numeric', 
          year: 'numeric' 
        })
      : null;

    // Build priority badge HTML
    let priorityBadge = '';
    if (assignment.priority === 'urgent' || assignment.priority === 'high') {
      const bgColor = assignment.priority === 'urgent' ? '#ef4444' : '#f59e0b';
      priorityBadge = `
        <div style="display: inline-block; padding: 4px 12px; background-color: ${bgColor}; color: white; border-radius: 4px; font-size: 12px; font-weight: 600; text-transform: uppercase; margin-bottom: 16px;">
          ${assignment.priority} Priority
        </div>
      `;
    }

    // Create portal login link
    const portalLink = `${siteUrl}/portal/login`;

    // Email HTML content
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">New Form Assignment</h1>
          </div>
          
          <div style="background-color: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            ${priorityBadge}
            
            <p style="font-size: 16px; margin-bottom: 20px;">
              Hello ${clientName},
            </p>
            
            <p style="font-size: 16px; margin-bottom: 20px;">
              You have been assigned a new form to complete in your client portal.
            </p>
            
            <div style="background-color: #f9fafb; border-left: 4px solid #667eea; padding: 20px; margin: 24px 0; border-radius: 4px;">
              <h2 style="margin: 0 0 8px 0; font-size: 18px; color: #667eea;">
                ${formTitle}
              </h2>
              ${formType ? `<p style="margin: 4px 0; color: #6b7280; font-size: 14px;"><strong>Type:</strong> ${formType}</p>` : ''}
              ${estimatedMinutes ? `<p style="margin: 4px 0; color: #6b7280; font-size: 14px;"><strong>Estimated time:</strong> ~${estimatedMinutes} minutes</p>` : ''}
              ${dueDate ? `<p style="margin: 4px 0; color: #6b7280; font-size: 14px;"><strong>Due date:</strong> ${dueDate}</p>` : ''}
              ${assignment.priority ? `<p style="margin: 4px 0; color: #6b7280; font-size: 14px;"><strong>Priority:</strong> ${assignment.priority.charAt(0).toUpperCase() + assignment.priority.slice(1)}</p>` : ''}
            </div>
            
            ${assignment.instructions ? `
              <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0; border-radius: 4px;">
                <h3 style="margin: 0 0 8px 0; font-size: 14px; color: #92400e;">Special Instructions:</h3>
                <p style="margin: 0; color: #78350f; font-size: 14px;">${assignment.instructions}</p>
              </div>
            ` : ''}
            
            <div style="text-align: center; margin: 32px 0;">
              <a href="${portalLink}" 
                 style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);">
                Access Client Portal
              </a>
            </div>
            
            <p style="font-size: 14px; color: #6b7280; margin-top: 24px;">
              Log in to your client portal to complete this form. If you have any questions, please contact your care team.
            </p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
            
            <p style="font-size: 12px; color: #9ca3af; margin: 0;">
              This is an automated message from your mental health care provider. Please do not reply to this email.
            </p>
          </div>
        </body>
      </html>
    `;

    // Send email using SendGrid
    const sendGridApiKey = Deno.env.get('SENDGRID_API_KEY');
    if (!sendGridApiKey) {
      throw new Error('SENDGRID_API_KEY is not configured');
    }

    const emailResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sendGridApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email: assignment.client.email }],
          subject: `New Form Assignment${assignment.priority === 'urgent' ? ' [URGENT]' : ''}: ${formTitle}`,
        }],
        from: {
          email: 'noreply@mentalspace.com',
          name: 'MentalSpace EHR'
        },
        content: [{
          type: 'text/html',
          value: emailHtml,
        }],
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      throw new Error(`SendGrid error: ${errorText}`);
    }

    console.log("Email sent successfully via SendGrid");

    // Log the notification
    const { error: logError } = await supabase
      .from("portal_form_notifications")
      .insert({
        assignment_id: assignmentId,
        recipient_email: assignment.client.email,
        status: "sent",
        resend_id: null,
      });

    if (logError) {
      console.error("Error logging notification:", logError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Notification sent successfully"
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error sending notification:", error);

    // Try to log the failed notification
    try {
      const { assignmentId } = await req.json();
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      await supabase
        .from("portal_form_notifications")
        .insert({
          assignment_id: assignmentId,
          recipient_email: "unknown@error.com",
          status: "failed",
          error_message: error.message,
        });
    } catch (logError) {
      console.error("Error logging failed notification:", logError);
    }

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
