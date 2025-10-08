import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useNotificationRules } from '@/hooks/useNotificationRules';
import { supabase } from '@/integrations/supabase/client';

const formSchema = z.object({
  rule_name: z.string().min(1, 'Rule name is required'),
  rule_type: z.enum(['Email', 'SMS', 'Dashboard Alert', 'All']),
  trigger_event: z.string().min(1, 'Trigger event is required'),
  recipient_type: z.enum(['Specific User', 'Client', 'Clinician', 'Supervisor', 'Administrator', 'Role']),
  recipients: z.array(z.string()).min(1, 'At least one recipient is required'),
  timing_type: z.enum(['Immediate', 'Scheduled', 'Before Event', 'After Event']),
  timing_offset: z.coerce.number().optional(),
  message_template: z.string().min(1, 'Message template is required'),
  message_subject: z.string().optional(),
  send_once: z.boolean(),
  send_repeatedly: z.boolean(),
  repeat_interval: z.coerce.number().optional(),
  max_repeats: z.coerce.number().optional(),
  is_active: z.boolean(),
});

interface NotificationRuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ruleId?: string | null;
}

export function NotificationRuleDialog({ open, onOpenChange, ruleId }: NotificationRuleDialogProps) {
  const { rules, createRule, updateRule } = useNotificationRules();
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      rule_name: '',
      rule_type: 'Email',
      trigger_event: 'Note Due',
      recipient_type: 'Administrator',
      recipients: [] as string[],
      timing_type: 'Immediate',
      message_template: '',
      message_subject: '',
      send_once: false,
      send_repeatedly: false,
      is_active: true,
    },
  });

  useEffect(() => {
    if (ruleId && open) {
      const rule = rules.find(r => r.id === ruleId);
      if (rule) {
        form.reset({
          rule_name: rule.rule_name,
          rule_type: rule.rule_type as any,
          trigger_event: rule.trigger_event,
          recipient_type: rule.recipient_type as any,
          recipients: rule.recipients,
          timing_type: rule.timing_type as any,
          timing_offset: rule.timing_offset,
          message_template: rule.message_template,
          message_subject: rule.message_subject || '',
          send_once: rule.send_once,
          send_repeatedly: rule.send_repeatedly,
          repeat_interval: rule.repeat_interval,
          max_repeats: rule.max_repeats,
          is_active: rule.is_active,
        });
      }
    } else if (!open) {
      form.reset();
    }
  }, [ruleId, open, rules, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setLoading(true);
      if (ruleId) {
        await updateRule(ruleId, values);
      } else {
        await createRule(values as any);
      }
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save rule:', error);
    } finally {
      setLoading(false);
    }
  };

  const triggerEvents = [
    'Note Due',
    'Note Overdue',
    'Note Locked',
    'Supervisor Review Needed',
    'Appointment Reminder',
    'Payment Due',
    'License Expiring',
    'Form Completed',
    'Message Received',
    'Critical Assessment Score',
    'Document Uploaded',
    'Client Registered',
    'Insurance Expiring',
    'Authorization Needed',
    'Other',
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{ruleId ? 'Edit' : 'Create'} Notification Rule</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="rule_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rule Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter rule name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="trigger_event"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Trigger Event</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select trigger event" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {triggerEvents.map((event) => (
                        <SelectItem key={event} value={event}>
                          {event}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="rule_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notification Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Email">Email</SelectItem>
                      <SelectItem value="SMS">SMS</SelectItem>
                      <SelectItem value="Dashboard Alert">Dashboard Alert</SelectItem>
                      <SelectItem value="All">All</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="recipient_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Recipient Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select recipient type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Specific User">Specific User</SelectItem>
                      <SelectItem value="Client">Client</SelectItem>
                      <SelectItem value="Clinician">Clinician</SelectItem>
                      <SelectItem value="Supervisor">Supervisor</SelectItem>
                      <SelectItem value="Administrator">Administrator</SelectItem>
                      <SelectItem value="Role">Role</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Who should receive this notification
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="message_subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message Subject</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter message subject" {...field} />
                  </FormControl>
                  <FormDescription>
                    Use variables like {'{client_name}'}, {'{date}'}, {'{clinician_name}'}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="message_template"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message Template</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter message template"
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Use variables like {'{client_name}'}, {'{date}'}, {'{clinician_name}'}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="timing_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Timing</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select timing" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Immediate">Immediate</SelectItem>
                      <SelectItem value="Scheduled">Scheduled</SelectItem>
                      <SelectItem value="Before Event">Before Event</SelectItem>
                      <SelectItem value="After Event">After Event</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="send_once"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Send Once</FormLabel>
                      <FormDescription>
                        Only send notification once
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Active</FormLabel>
                      <FormDescription>
                        Enable this rule
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : ruleId ? 'Update' : 'Create'} Rule
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}