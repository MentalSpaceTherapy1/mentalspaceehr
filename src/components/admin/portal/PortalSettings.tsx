import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Save, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface PortalSettingsData {
  require_email_verification: boolean;
  password_min_length: number;
  session_timeout_minutes: number;
  max_login_attempts: number;
  lockout_duration_minutes: number;
  allow_self_registration: boolean;
  require_2fa: boolean;
  password_expiry_days: number;
}

const DEFAULT_SETTINGS: PortalSettingsData = {
  require_email_verification: true,
  password_min_length: 8,
  session_timeout_minutes: 30,
  max_login_attempts: 5,
  lockout_duration_minutes: 30,
  allow_self_registration: false,
  require_2fa: false,
  password_expiry_days: 90,
};

export function PortalSettings() {
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<PortalSettingsData>(DEFAULT_SETTINGS);
  const [settingsId, setSettingsId] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('practice_settings')
        .select('id, portal_settings')
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettingsId(data.id);
        if (data.portal_settings) {
          setSettings({ ...DEFAULT_SETTINGS, ...data.portal_settings });
        }
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const payload = {
        portal_settings: settings,
      };

      if (settingsId) {
        const { error } = await supabase
          .from('practice_settings')
          .update(payload)
          .eq('id', settingsId);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('practice_settings')
          .insert([payload])
          .select()
          .single();

        if (error) throw error;
        setSettingsId(data.id);
      }

      toast.success('Portal settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save portal settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Security Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            <CardTitle>Security Settings</CardTitle>
          </div>
          <CardDescription>
            Configure security and authentication requirements for the client portal
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Require Email Verification</Label>
              <p className="text-sm text-muted-foreground">
                Clients must verify their email before accessing the portal
              </p>
            </div>
            <Switch
              checked={settings.require_email_verification}
              onCheckedChange={(checked) => 
                setSettings({ ...settings, require_email_verification: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Require Two-Factor Authentication</Label>
              <p className="text-sm text-muted-foreground">
                Require 2FA for all client portal accounts
              </p>
            </div>
            <Switch
              checked={settings.require_2fa}
              onCheckedChange={(checked) => 
                setSettings({ ...settings, require_2fa: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Allow Self Registration</Label>
              <p className="text-sm text-muted-foreground">
                Allow clients to register for portal access themselves
              </p>
            </div>
            <Switch
              checked={settings.allow_self_registration}
              onCheckedChange={(checked) => 
                setSettings({ ...settings, allow_self_registration: checked })
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="password_min_length">Minimum Password Length</Label>
              <Input
                id="password_min_length"
                type="number"
                min="8"
                max="32"
                value={settings.password_min_length}
                onChange={(e) => 
                  setSettings({ ...settings, password_min_length: parseInt(e.target.value) || 8 })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password_expiry_days">Password Expiry (Days)</Label>
              <Input
                id="password_expiry_days"
                type="number"
                min="0"
                value={settings.password_expiry_days}
                onChange={(e) => 
                  setSettings({ ...settings, password_expiry_days: parseInt(e.target.value) || 90 })
                }
              />
              <p className="text-xs text-muted-foreground">Set to 0 for no expiry</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="max_login_attempts">Max Login Attempts</Label>
              <Input
                id="max_login_attempts"
                type="number"
                min="3"
                max="10"
                value={settings.max_login_attempts}
                onChange={(e) => 
                  setSettings({ ...settings, max_login_attempts: parseInt(e.target.value) || 5 })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lockout_duration_minutes">Lockout Duration (Minutes)</Label>
              <Input
                id="lockout_duration_minutes"
                type="number"
                min="5"
                value={settings.lockout_duration_minutes}
                onChange={(e) => 
                  setSettings({ ...settings, lockout_duration_minutes: parseInt(e.target.value) || 30 })
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="session_timeout_minutes">Session Timeout (Minutes)</Label>
            <Input
              id="session_timeout_minutes"
              type="number"
              min="5"
              max="480"
              value={settings.session_timeout_minutes}
              onChange={(e) => 
                setSettings({ ...settings, session_timeout_minutes: parseInt(e.target.value) || 30 })
              }
            />
            <p className="text-xs text-muted-foreground">
              Clients will be automatically logged out after this period of inactivity
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-end">
        <Button onClick={handleSave} disabled={loading}>
          <Save className="h-4 w-4 mr-2" />
          {loading ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
}
