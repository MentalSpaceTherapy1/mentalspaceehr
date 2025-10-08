import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { Resend } from 'https://esm.sh/resend@4.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRule {
  id: string;
  rule_name: string;
  rule_type: string;
  trigger_event: string;
  conditions: Array<{
    field: string;
    operator: string;
    value: any;
  }>;
  recipient_type: string;
  recipients: string[];
  timing_type: string;
  timing_offset?: number;
  message_template: string;
  message_subject?: string;
  send_once: boolean;
  send_repeatedly: boolean;
  repeat_interval?: number;
  max_repeats?: number;
  execution_count: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resend = resendApiKey ? new Resend(resendApiKey) : null;

    const { trigger_event, entity_id, entity_data } = await req.json();

    console.log('Processing notification rules for event:', trigger_event);

    // Fetch active rules for this trigger event
    const { data: rules, error: rulesError } = await supabase
      .from('notification_rules')
      .select('*')
      .eq('is_active', true)
      .eq('trigger_event', trigger_event);

    if (rulesError) {
      throw new Error(`Failed to fetch rules: ${rulesError.message}`);
    }

    if (!rules || rules.length === 0) {
      console.log('No active rules found for event:', trigger_event);
      return new Response(
        JSON.stringify({ message: 'No active rules found', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let processedCount = 0;
    let sentCount = 0;

    for (const rule of rules as NotificationRule[]) {
      console.log('Processing rule:', rule.rule_name);

      // Check if rule conditions are met
      const conditionsMet = evaluateConditions(rule.conditions, entity_data);
      if (!conditionsMet) {
        console.log('Conditions not met for rule:', rule.rule_name);
        continue;
      }

      // Check frequency constraints
      if (rule.send_once && rule.execution_count > 0) {
        console.log('Rule already executed (send_once):', rule.rule_name);
        continue;
      }

      if (rule.send_repeatedly && rule.max_repeats && rule.execution_count >= rule.max_repeats) {
        console.log('Max repeats reached for rule:', rule.rule_name);
        continue;
      }

      // Resolve recipients
      const recipients = await resolveRecipients(supabase, rule, entity_data);
      
      if (recipients.length === 0) {
        console.log('No recipients found for rule:', rule.rule_name);
        continue;
      }

      // Process message template
      const message = processTemplate(rule.message_template, entity_data);
      const subject = rule.message_subject ? processTemplate(rule.message_subject, entity_data) : undefined;

      // Send notifications
      for (const recipient of recipients) {
        try {
          let sentSuccessfully = false;
          let errorMessage = '';

          if (rule.rule_type === 'Email' || rule.rule_type === 'All') {
            if (resend && recipient.email) {
              try {
                await resend.emails.send({
                  from: 'MentalSpace <onboarding@resend.dev>',
                  to: [recipient.email],
                  subject: subject || 'Notification',
                  html: message,
                });
                sentSuccessfully = true;
                sentCount++;
              } catch (emailError: any) {
                errorMessage = emailError.message;
                console.error('Email send error:', emailError);
              }
            }
          }

          if (rule.rule_type === 'Dashboard Alert' || rule.rule_type === 'All') {
            // Create portal notification for dashboard alerts
            const { error: notifError } = await supabase
              .from('portal_notifications')
              .insert({
                client_id: recipient.id,
                notification_type: 'alert',
                title: subject || 'Notification',
                message: stripHtml(message),
                priority: 'normal',
              });

            if (!notifError) {
              sentSuccessfully = true;
              sentCount++;
            } else {
              errorMessage = notifError.message;
            }
          }

          // Log the notification
          await supabase.from('notification_logs').insert({
            rule_id: rule.id,
            recipient_id: recipient.id,
            recipient_type: recipient.type,
            recipient_email: recipient.email,
            recipient_phone: recipient.phone,
            notification_type: rule.rule_type,
            message_content: message,
            message_subject: subject,
            sent_successfully: sentSuccessfully,
            error_message: errorMessage || null,
            related_entity_type: trigger_event.toLowerCase().replace(' ', '_'),
            related_entity_id: entity_id,
          });
        } catch (recipientError: any) {
          console.error('Error processing recipient:', recipientError);
        }
      }

      // Update rule execution count
      await supabase
        .from('notification_rules')
        .update({
          execution_count: rule.execution_count + 1,
          last_executed_at: new Date().toISOString(),
        })
        .eq('id', rule.id);

      processedCount++;
    }

    return new Response(
      JSON.stringify({
        message: 'Notification rules processed',
        processed: processedCount,
        sent: sentCount,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error processing notification rules:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function evaluateConditions(
  conditions: Array<{ field: string; operator: string; value: any }>,
  data: any
): boolean {
  if (!conditions || conditions.length === 0) return true;

  return conditions.every(condition => {
    const fieldValue = getNestedValue(data, condition.field);
    
    switch (condition.operator) {
      case 'equals':
        return fieldValue === condition.value;
      case 'not_equals':
        return fieldValue !== condition.value;
      case 'greater_than':
        return Number(fieldValue) > Number(condition.value);
      case 'less_than':
        return Number(fieldValue) < Number(condition.value);
      case 'contains':
        return String(fieldValue).includes(String(condition.value));
      case 'not_contains':
        return !String(fieldValue).includes(String(condition.value));
      case 'is_null':
        return fieldValue === null || fieldValue === undefined;
      case 'is_not_null':
        return fieldValue !== null && fieldValue !== undefined;
      default:
        return true;
    }
  });
}

async function resolveRecipients(
  supabase: any,
  rule: NotificationRule,
  entityData: any
): Promise<Array<{ id: string; type: string; email?: string; phone?: string }>> {
  const recipients: Array<{ id: string; type: string; email?: string; phone?: string }> = [];

  switch (rule.recipient_type) {
    case 'Specific User':
      for (const userId of rule.recipients) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, email, phone')
          .eq('id', userId)
          .single();
        
        if (profile) {
          recipients.push({
            id: profile.id,
            type: 'User',
            email: profile.email,
            phone: profile.phone,
          });
        }
      }
      break;

    case 'Role':
      for (const roleName of rule.recipients) {
        const { data: userRoles } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('role', roleName);

        if (userRoles) {
          for (const ur of userRoles) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('id, email, phone')
              .eq('id', ur.user_id)
              .single();

            if (profile) {
              recipients.push({
                id: profile.id,
                type: 'User',
                email: profile.email,
                phone: profile.phone,
              });
            }
          }
        }
      }
      break;

    case 'Client':
      if (entityData?.client_id) {
        const { data: client } = await supabase
          .from('clients')
          .select('id, email, phone')
          .eq('id', entityData.client_id)
          .single();

        if (client) {
          recipients.push({
            id: client.id,
            type: 'Client',
            email: client.email,
            phone: client.phone,
          });
        }
      }
      break;

    case 'Clinician':
      if (entityData?.clinician_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, email, phone')
          .eq('id', entityData.clinician_id)
          .single();

        if (profile) {
          recipients.push({
            id: profile.id,
            type: 'User',
            email: profile.email,
            phone: profile.phone,
          });
        }
      }
      break;
  }

  return recipients;
}

function processTemplate(template: string, data: any): string {
  let processed = template;
  
  // Replace variables like {client_name}, {date}, etc.
  const variablePattern = /\{([^}]+)\}/g;
  processed = processed.replace(variablePattern, (match, key) => {
    const value = getNestedValue(data, key);
    return value !== undefined ? String(value) : match;
  });

  return processed;
}

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}