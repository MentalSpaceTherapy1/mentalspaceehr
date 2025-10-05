import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Video, Shield, Camera, Clock, Bell, Users } from 'lucide-react';

interface TelehealthSettings {
  enforce_state_licensure: boolean;
  require_bandwidth_test: boolean;
  recording_feature_enabled: boolean;
  auto_record_sessions: boolean;
  session_timeout_minutes: number;
  consent_renewal_reminder_days: number;
  max_participants: number;
  require_consent: boolean;
  ai_note_generation_enabled: boolean;
}

export default function TelehealthSettings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<TelehealthSettings>({
    enforce_state_licensure: false,
    require_bandwidth_test: true,
    recording_feature_enabled: false,
    auto_record_sessions: false,
    session_timeout_minutes: 120,
    consent_renewal_reminder_days: 30,
    max_participants: 10,
    require_consent: false,
    ai_note_generation_enabled: false,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('practice_settings')
        .select('telehealth_settings')
        .single();

      if (error) throw error;

      if (data?.telehealth_settings) {
        setSettings(data.telehealth_settings as unknown as TelehealthSettings);
      }
    } catch (error) {
      console.error('Error fetching telehealth settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load telehealth settings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('practice_settings')
        .update({ telehealth_settings: settings as any })
        .eq('id', (await supabase.from('practice_settings').select('id').single()).data?.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Telehealth settings saved successfully',
      });
    } catch (error) {
      console.error('Error saving telehealth settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save telehealth settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key: keyof TelehealthSettings, value: boolean | number) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="flex items-center justify-center min-h-96">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Telehealth Settings</h1>
          <p className="text-muted-foreground">Configure telehealth session requirements and behavior</p>
        </div>
        
        <div className="space-y-6 max-w-4xl">
        {/* Consent Requirement */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Consent Requirement
            </CardTitle>
            <CardDescription>
              Control whether telehealth sessions require signed consent forms
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="require-consent">Require Telehealth Consent</Label>
                <p className="text-sm text-muted-foreground">
                  When enabled, clients must complete and sign a consent form before joining telehealth sessions
                </p>
              </div>
              <Switch
                id="require-consent"
                checked={settings.require_consent}
                onCheckedChange={(checked) => updateSetting('require_consent', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* State Licensure Verification */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              State Licensure Verification
            </CardTitle>
            <CardDescription>
              Control whether telehealth sessions require clinicians to be licensed in the client's state of residence
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="enforce-licensure">Enforce State Licensure</Label>
                <p className="text-sm text-muted-foreground">
                  When enabled, clinicians must have an active license in the client's state to conduct telehealth sessions
                </p>
              </div>
              <Switch
                id="enforce-licensure"
                checked={settings.enforce_state_licensure}
                onCheckedChange={(checked) => updateSetting('enforce_state_licensure', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Session Quality */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5" />
              Session Quality & Performance
            </CardTitle>
            <CardDescription>
              Configure quality checks and performance settings for telehealth sessions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="bandwidth-test">Require Bandwidth Test</Label>
                <p className="text-sm text-muted-foreground">
                  Test network connection before joining sessions
                </p>
              </div>
              <Switch
                id="bandwidth-test"
                checked={settings.require_bandwidth_test}
                onCheckedChange={(checked) => updateSetting('require_bandwidth_test', checked)}
              />
            </div>

            <div className="flex items-center justify-between pt-4">
              <div className="space-y-1 flex-1">
                <Label htmlFor="session-timeout" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Session Timeout (minutes)
                </Label>
                <p className="text-sm text-muted-foreground">
                  Maximum duration before session automatically ends
                </p>
              </div>
              <Input
                id="session-timeout"
                type="number"
                min="30"
                max="480"
                value={settings.session_timeout_minutes}
                onChange={(e) => updateSetting('session_timeout_minutes', parseInt(e.target.value))}
                className="w-24"
              />
            </div>
          </CardContent>
        </Card>

        {/* Recording Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Recording Settings
            </CardTitle>
            <CardDescription>
              Configure automatic recording options for telehealth sessions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="recording-enabled">Enable Session Recording</Label>
                <p className="text-sm text-muted-foreground">
                  Show recording control and allow recording during sessions
                </p>
              </div>
              <Switch
                id="recording-enabled"
                checked={settings.recording_feature_enabled}
                onCheckedChange={(checked) => updateSetting('recording_feature_enabled', checked)}
              />
            </div>

            <div className="flex items-center justify-between mt-4">
              <div className="space-y-1">
                <Label htmlFor="auto-record">Auto-Record Sessions</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically start recording when sessions begin (requires client consent)
                </p>
              </div>
              <Switch
                id="auto-record"
                checked={settings.auto_record_sessions}
                onCheckedChange={(checked) => updateSetting('auto_record_sessions', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* AI Note Generation */}
        <Card>
          <CardHeader>
            <CardTitle>AI Note Generation</CardTitle>
            <CardDescription>Enable converting recordings into clinical notes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="ai-notes-enabled">Enable AI Note Generation</Label>
                <p className="text-sm text-muted-foreground">
                  Controls AI note option in post-session dialog. Also requires AI to be enabled in AI Note Settings.
                </p>
              </div>
              <Switch
                id="ai-notes-enabled"
                checked={settings.ai_note_generation_enabled}
                onCheckedChange={(checked) => updateSetting('ai_note_generation_enabled', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Group Sessions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Group Sessions
            </CardTitle>
            <CardDescription>
              Configure maximum participant limits for group telehealth sessions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-1 flex-1">
                <Label htmlFor="max-participants">Maximum Participants</Label>
                <p className="text-sm text-muted-foreground">
                  Maximum number of participants allowed in group sessions
                </p>
              </div>
              <Input
                id="max-participants"
                type="number"
                min="2"
                max="50"
                value={settings.max_participants}
                onChange={(e) => updateSetting('max_participants', parseInt(e.target.value))}
                className="w-24"
              />
            </div>
          </CardContent>
        </Card>

        {/* Consent Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Consent Management
            </CardTitle>
            <CardDescription>
              Configure when to send consent renewal reminders
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-1 flex-1">
                <Label htmlFor="renewal-reminder">Renewal Reminder (days before expiration)</Label>
                <p className="text-sm text-muted-foreground">
                  Send renewal reminders this many days before consent expires
                </p>
              </div>
              <Input
                id="renewal-reminder"
                type="number"
                min="1"
                max="90"
                value={settings.consent_renewal_reminder_days}
                onChange={(e) => updateSetting('consent_renewal_reminder_days', parseInt(e.target.value))}
                className="w-24"
              />
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-end gap-4">
          <Button variant="outline" onClick={() => navigate('/admin/telehealth-consents')}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Settings
          </Button>
        </div>
      </div>
      </div>
    </DashboardLayout>
  );
}