import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Bell, Save, Mail, Calendar, X, UserCheck } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

interface NotificationSettings {
  id: string;
  send_on_create: boolean;
  send_on_update: boolean;
  send_on_cancel: boolean;
  created_subject: string;
  created_template: string;
  updated_subject: string;
  updated_template: string;
  cancelled_subject: string;
  cancelled_template: string;
  respect_client_preferences: boolean;
  notify_recipients: string[];
}

export default function AppointmentNotificationSettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('appointment_notification_settings')
        .select('*')
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setSettings({
          ...data,
          notify_recipients: data.notify_recipients as string[]
        });
      } else {
        // Create default settings
        const { data: newSettings, error: createError } = await supabase
          .from('appointment_notification_settings')
          .insert({
            send_on_create: true,
            send_on_update: true,
            send_on_cancel: true,
            respect_client_preferences: true,
            notify_recipients: ['client']
          })
          .select()
          .single();

        if (createError) throw createError;
        setSettings({
          ...newSettings,
          notify_recipients: newSettings.notify_recipients as string[]
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load notification settings',
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
        .from('appointment_notification_settings')
        .upsert({
          ...settings,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Notification settings saved successfully'
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save notification settings',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading notification settings...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Appointment Notifications</h1>
            <p className="text-muted-foreground">
              Configure instant notifications sent when appointments are created, updated, or cancelled
            </p>
          </div>
          <Button onClick={saveSettings} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Notification Types</CardTitle>
            <CardDescription>Control which events trigger notifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  New Appointment Created
                </Label>
                <p className="text-sm text-muted-foreground">
                  Send notification when an appointment is scheduled
                </p>
              </div>
              <Switch
                checked={settings.send_on_create}
                onCheckedChange={(send_on_create) => setSettings({ ...settings, send_on_create })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  Appointment Updated
                </Label>
                <p className="text-sm text-muted-foreground">
                  Send notification when appointment details change
                </p>
              </div>
              <Switch
                checked={settings.send_on_update}
                onCheckedChange={(send_on_update) => setSettings({ ...settings, send_on_update })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  <X className="h-4 w-4" />
                  Appointment Cancelled
                </Label>
                <p className="text-sm text-muted-foreground">
                  Send notification when an appointment is cancelled
                </p>
              </div>
              <Switch
                checked={settings.send_on_cancel}
                onCheckedChange={(send_on_cancel) => setSettings({ ...settings, send_on_cancel })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4" />
                  Respect Client Preferences
                </Label>
                <p className="text-sm text-muted-foreground">
                  Only send if client has opted in for appointment notifications
                </p>
              </div>
              <Switch
                checked={settings.respect_client_preferences}
                onCheckedChange={(respect_client_preferences) => 
                  setSettings({ ...settings, respect_client_preferences })
                }
              />
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="created" className="space-y-4">
          <TabsList>
            <TabsTrigger value="created">
              <Calendar className="h-4 w-4 mr-2" />
              Created
            </TabsTrigger>
            <TabsTrigger value="updated">
              <Bell className="h-4 w-4 mr-2" />
              Updated
            </TabsTrigger>
            <TabsTrigger value="cancelled">
              <X className="h-4 w-4 mr-2" />
              Cancelled
            </TabsTrigger>
          </TabsList>

          <TabsContent value="created" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Appointment Created Notification</CardTitle>
                <CardDescription>Email sent when a new appointment is scheduled</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="created-subject">Email Subject</Label>
                  <Input
                    id="created-subject"
                    value={settings.created_subject}
                    onChange={(e) => setSettings({ ...settings, created_subject: e.target.value })}
                    className="mt-2"
                    disabled={!settings.send_on_create}
                  />
                </div>

                <div>
                  <Label htmlFor="created-template">Email Template</Label>
                  <Textarea
                    id="created-template"
                    value={settings.created_template}
                    onChange={(e) => setSettings({ ...settings, created_template: e.target.value })}
                    rows={10}
                    className="mt-2 font-mono text-sm"
                    disabled={!settings.send_on_create}
                  />
                  <div className="mt-2 flex flex-wrap gap-1">
                    <Badge variant="outline" className="text-xs">{'{client_name}'}</Badge>
                    <Badge variant="outline" className="text-xs">{'{clinician_name}'}</Badge>
                    <Badge variant="outline" className="text-xs">{'{date}'}</Badge>
                    <Badge variant="outline" className="text-xs">{'{time}'}</Badge>
                    <Badge variant="outline" className="text-xs">{'{location}'}</Badge>
                    <Badge variant="outline" className="text-xs">{'{appointment_type}'}</Badge>
                    <Badge variant="outline" className="text-xs">{'{telehealth_link}'}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="updated" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Appointment Updated Notification</CardTitle>
                <CardDescription>Email sent when appointment details are changed</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="updated-subject">Email Subject</Label>
                  <Input
                    id="updated-subject"
                    value={settings.updated_subject}
                    onChange={(e) => setSettings({ ...settings, updated_subject: e.target.value })}
                    className="mt-2"
                    disabled={!settings.send_on_update}
                  />
                </div>

                <div>
                  <Label htmlFor="updated-template">Email Template</Label>
                  <Textarea
                    id="updated-template"
                    value={settings.updated_template}
                    onChange={(e) => setSettings({ ...settings, updated_template: e.target.value })}
                    rows={10}
                    className="mt-2 font-mono text-sm"
                    disabled={!settings.send_on_update}
                  />
                  <div className="mt-2 flex flex-wrap gap-1">
                    <Badge variant="outline" className="text-xs">{'{client_name}'}</Badge>
                    <Badge variant="outline" className="text-xs">{'{clinician_name}'}</Badge>
                    <Badge variant="outline" className="text-xs">{'{date}'}</Badge>
                    <Badge variant="outline" className="text-xs">{'{time}'}</Badge>
                    <Badge variant="outline" className="text-xs">{'{location}'}</Badge>
                    <Badge variant="outline" className="text-xs">{'{appointment_type}'}</Badge>
                    <Badge variant="outline" className="text-xs">{'{telehealth_link}'}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cancelled" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Appointment Cancelled Notification</CardTitle>
                <CardDescription>Email sent when an appointment is cancelled</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="cancelled-subject">Email Subject</Label>
                  <Input
                    id="cancelled-subject"
                    value={settings.cancelled_subject}
                    onChange={(e) => setSettings({ ...settings, cancelled_subject: e.target.value })}
                    className="mt-2"
                    disabled={!settings.send_on_cancel}
                  />
                </div>

                <div>
                  <Label htmlFor="cancelled-template">Email Template</Label>
                  <Textarea
                    id="cancelled-template"
                    value={settings.cancelled_template}
                    onChange={(e) => setSettings({ ...settings, cancelled_template: e.target.value })}
                    rows={10}
                    className="mt-2 font-mono text-sm"
                    disabled={!settings.send_on_cancel}
                  />
                  <div className="mt-2 flex flex-wrap gap-1">
                    <Badge variant="outline" className="text-xs">{'{client_name}'}</Badge>
                    <Badge variant="outline" className="text-xs">{'{clinician_name}'}</Badge>
                    <Badge variant="outline" className="text-xs">{'{date}'}</Badge>
                    <Badge variant="outline" className="text-xs">{'{time}'}</Badge>
                    <Badge variant="outline" className="text-xs">{'{cancellation_reason}'}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
