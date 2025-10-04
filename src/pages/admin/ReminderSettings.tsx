import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Bell, Mail, MessageSquare, Clock, Save } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ReminderSettings {
  id: string;
  enabled: boolean;
  email_enabled: boolean;
  email_timing: number[];
  email_template: string;
  sms_enabled: boolean;
  sms_timing: number[];
  sms_template: string;
  require_confirmation: boolean;
  include_reschedule_link: boolean;
  include_cancel_link: boolean;
}

export default function ReminderSettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<ReminderSettings | null>(null);
  const [testEmail, setTestEmail] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('reminder_settings')
        .select('*')
        .maybeSingle();

      if (error) throw error;
      if (data) setSettings(data);
    } catch (error) {
      console.error('Error loading settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load reminder settings',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!settings) return;

    try {
      setSaving(true);
      const { error } = await supabase
        .from('reminder_settings')
        .upsert({
          ...settings,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Reminder settings saved successfully'
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save reminder settings',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const testReminderSystem = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('send-appointment-reminder');
      
      if (error) throw error;
      
      toast({
        title: 'Test Complete',
        description: `Processed ${data.processed} appointments, sent ${data.sent} reminders`
      });
    } catch (error) {
      console.error('Error testing reminders:', error);
      toast({
        title: 'Error',
        description: 'Failed to test reminder system',
        variant: 'destructive'
      });
    }
  };

  if (loading || !settings) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading reminder settings...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Appointment Reminders</h1>
            <p className="text-muted-foreground">
              Configure automated email and SMS reminders for appointments
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={testReminderSystem}>
              <Clock className="h-4 w-4 mr-2" />
              Test System
            </Button>
            <Button onClick={saveSettings} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Reminder System</CardTitle>
                <CardDescription>Enable or disable the automated reminder system</CardDescription>
              </div>
              <Switch
                checked={settings.enabled}
                onCheckedChange={(enabled) => setSettings({ ...settings, enabled })}
              />
            </div>
          </CardHeader>
        </Card>

        <Tabs defaultValue="email" className="space-y-4">
          <TabsList>
            <TabsTrigger value="email">
              <Mail className="h-4 w-4 mr-2" />
              Email Reminders
            </TabsTrigger>
            <TabsTrigger value="sms">
              <MessageSquare className="h-4 w-4 mr-2" />
              SMS Reminders
            </TabsTrigger>
            <TabsTrigger value="options">
              <Bell className="h-4 w-4 mr-2" />
              Options
            </TabsTrigger>
          </TabsList>

          <TabsContent value="email" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Email Reminders</CardTitle>
                    <CardDescription>Configure email reminder timing and templates</CardDescription>
                  </div>
                  <Switch
                    checked={settings.email_enabled}
                    onCheckedChange={(email_enabled) => setSettings({ ...settings, email_enabled })}
                    disabled={!settings.enabled}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Reminder Timing (hours before appointment)</Label>
                  <div className="flex gap-2 mt-2">
                    {settings.email_timing.map((hours, idx) => (
                      <Badge key={idx} variant="secondary">
                        {hours} hours
                      </Badge>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Current: Reminders sent at 24 hours and 1 hour before
                  </p>
                </div>

                <div>
                  <Label htmlFor="email-template">Email Template</Label>
                  <Textarea
                    id="email-template"
                    value={settings.email_template}
                    onChange={(e) => setSettings({ ...settings, email_template: e.target.value })}
                    rows={8}
                    className="mt-2 font-mono text-sm"
                    disabled={!settings.email_enabled}
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Available variables: {'{client_name}'}, {'{clinician_name}'}, {'{date}'}, {'{time}'}, 
                    {'{location}'}, {'{telehealth_link}'}, {'{confirmation_link}'}, {'{reschedule_link}'}, {'{cancel_link}'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sms" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>SMS Reminders</CardTitle>
                    <CardDescription>
                      Configure SMS reminder timing and templates (requires Twilio)
                    </CardDescription>
                  </div>
                  <Switch
                    checked={settings.sms_enabled}
                    onCheckedChange={(sms_enabled) => setSettings({ ...settings, sms_enabled })}
                    disabled={!settings.enabled}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <p className="text-sm text-yellow-600 dark:text-yellow-400">
                    SMS reminders require Twilio credentials to be configured. Contact your administrator to set up SMS functionality.
                  </p>
                </div>

                <div>
                  <Label>Reminder Timing (hours before appointment)</Label>
                  <div className="flex gap-2 mt-2">
                    {settings.sms_timing.map((hours, idx) => (
                      <Badge key={idx} variant="secondary">
                        {hours} hours
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="sms-template">SMS Template</Label>
                  <Textarea
                    id="sms-template"
                    value={settings.sms_template}
                    onChange={(e) => setSettings({ ...settings, sms_template: e.target.value })}
                    rows={4}
                    className="mt-2 font-mono text-sm"
                    disabled={!settings.sms_enabled}
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Keep SMS messages under 160 characters for best delivery
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="options" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Reminder Options</CardTitle>
                <CardDescription>Configure additional reminder settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Require Confirmation</Label>
                    <p className="text-sm text-muted-foreground">
                      Clients must confirm their appointment via reminder link
                    </p>
                  </div>
                  <Switch
                    checked={settings.require_confirmation}
                    onCheckedChange={(require_confirmation) => 
                      setSettings({ ...settings, require_confirmation })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Include Reschedule Link</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow clients to reschedule from reminder
                    </p>
                  </div>
                  <Switch
                    checked={settings.include_reschedule_link}
                    onCheckedChange={(include_reschedule_link) => 
                      setSettings({ ...settings, include_reschedule_link })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Include Cancel Link</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow clients to cancel from reminder
                    </p>
                  </div>
                  <Switch
                    checked={settings.include_cancel_link}
                    onCheckedChange={(include_cancel_link) => 
                      setSettings({ ...settings, include_cancel_link })
                    }
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
