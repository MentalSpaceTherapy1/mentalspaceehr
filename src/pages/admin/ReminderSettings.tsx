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
import { Bell, Mail, MessageSquare, Clock, Save, Plus, X } from 'lucide-react';
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
  const [newEmailTiming, setNewEmailTiming] = useState('');
  const [newSmsTiming, setNewSmsTiming] = useState('');

  const [capabilities, setCapabilities] = useState<{ twilioConfigured: boolean; resendConfigured: boolean }>({ twilioConfigured: false, resendConfigured: false });

  useEffect(() => {
    loadSettings();
    supabase.functions.invoke('reminder-capabilities').then(({ data }) => {
      if (data) setCapabilities(data as any);
    }).catch(() => {});
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

  const addEmailTiming = () => {
    if (!settings || !newEmailTiming) return;
    const hours = parseInt(newEmailTiming);
    if (isNaN(hours) || hours <= 0) {
      toast({
        title: 'Invalid timing',
        description: 'Please enter a positive number of hours',
        variant: 'destructive'
      });
      return;
    }
    if (settings.email_timing.includes(hours)) {
      toast({
        title: 'Duplicate timing',
        description: 'This timing already exists',
        variant: 'destructive'
      });
      return;
    }
    setSettings({
      ...settings,
      email_timing: [...settings.email_timing, hours].sort((a, b) => b - a)
    });
    setNewEmailTiming('');
  };

  const removeEmailTiming = (hours: number) => {
    if (!settings) return;
    setSettings({
      ...settings,
      email_timing: settings.email_timing.filter(h => h !== hours)
    });
  };

  const addSmsTiming = () => {
    if (!settings || !newSmsTiming) return;
    const hours = parseInt(newSmsTiming);
    if (isNaN(hours) || hours <= 0) {
      toast({
        title: 'Invalid timing',
        description: 'Please enter a positive number of hours',
        variant: 'destructive'
      });
      return;
    }
    if (settings.sms_timing.includes(hours)) {
      toast({
        title: 'Duplicate timing',
        description: 'This timing already exists',
        variant: 'destructive'
      });
      return;
    }
    setSettings({
      ...settings,
      sms_timing: [...settings.sms_timing, hours].sort((a, b) => b - a)
    });
    setNewSmsTiming('');
  };

  const removeSmsTiming = (hours: number) => {
    if (!settings) return;
    setSettings({
      ...settings,
      sms_timing: settings.sms_timing.filter(h => h !== hours)
    });
  };

  const formatHours = (hours: number): string => {
    if (hours >= 168) return `${hours / 168} week${hours / 168 > 1 ? 's' : ''}`;
    if (hours >= 24) return `${hours / 24} day${hours / 24 > 1 ? 's' : ''}`;
    return `${hours} hour${hours > 1 ? 's' : ''}`;
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
                  <div className="flex flex-wrap gap-2 mt-2 mb-3">
                    {settings.email_timing.map((hours) => (
                      <Badge key={hours} variant="secondary" className="gap-2">
                        {formatHours(hours)}
                        <button
                          onClick={() => removeEmailTiming(hours)}
                          className="ml-1 hover:text-destructive"
                          disabled={!settings.email_enabled}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Hours before (e.g., 168 for 1 week)"
                      value={newEmailTiming}
                      onChange={(e) => setNewEmailTiming(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addEmailTiming()}
                      disabled={!settings.email_enabled}
                      className="max-w-xs"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addEmailTiming}
                      disabled={!settings.email_enabled || !newEmailTiming}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Suggested: 168 (1 week), 72 (3 days), 24 (1 day), 1 (1 hour)
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
                      Configure SMS reminder timing and templates {capabilities.twilioConfigured ? '(Twilio connected)' : '(requires Twilio)'}
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
                {!capabilities.twilioConfigured && (
                  <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                    <p className="text-sm text-yellow-600 dark:text-yellow-400">
                      SMS reminders require Twilio credentials to be configured. Contact your administrator to set up SMS functionality.
                    </p>
                  </div>
                )}

                <div>
                  <Label>Reminder Timing (hours before appointment)</Label>
                  <div className="flex flex-wrap gap-2 mt-2 mb-3">
                    {settings.sms_timing.map((hours) => (
                      <Badge key={hours} variant="secondary" className="gap-2">
                        {formatHours(hours)}
                        <button
                          onClick={() => removeSmsTiming(hours)}
                          className="ml-1 hover:text-destructive"
                          disabled={!settings.sms_enabled}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Hours before (e.g., 24 for 1 day)"
                      value={newSmsTiming}
                      onChange={(e) => setNewSmsTiming(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addSmsTiming()}
                      disabled={!settings.sms_enabled}
                      className="max-w-xs"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addSmsTiming}
                      disabled={!settings.sms_enabled || !newSmsTiming}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Suggested: 24 (1 day), 1 (1 hour) - Keep SMS minimal for cost control
                  </p>
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
