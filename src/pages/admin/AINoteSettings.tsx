import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Brain, Save, Shield, Sparkles, AlertTriangle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AISettings {
  id: string;
  enabled: boolean;
  provider: string;
  model: string;
  voice_to_text_enabled: boolean;
  text_expansion_enabled: boolean;
  template_completion_enabled: boolean;
  suggestion_engine_enabled: boolean;
  risk_assessment_enabled: boolean;
  data_sharing_consent: boolean;
  anonymize_before_sending: boolean;
  retain_ai_logs: boolean;
  retention_days: number;
  minimum_confidence_threshold: number;
  auto_approve_high_confidence: boolean;
  require_clinician_review: boolean;
}

export default function AINoteSettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<AISettings | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('ai_note_settings')
        .select('*')
        .maybeSingle();

      if (error) throw error;
      if (data) setSettings(data);
    } catch (error) {
      console.error('Error loading AI settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load AI settings',
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
        .from('ai_note_settings')
        .upsert({
          ...settings,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'AI note settings saved successfully'
      });
    } catch (error) {
      console.error('Error saving AI settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save AI settings',
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
          <div className="text-muted-foreground">Loading AI settings...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Brain className="h-8 w-8" />
              AI-Powered Clinical Notes
            </h1>
            <p className="text-muted-foreground mt-1">
              Configure AI assistance for clinical documentation
            </p>
          </div>
          <Button onClick={saveSettings} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>

        {!settings.enabled && (
          <Alert>
            <Sparkles className="h-4 w-4" />
            <AlertDescription>
              AI-powered note generation is currently disabled. Enable it below to start using AI assistance for clinical documentation.
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>AI Note Generation System</CardTitle>
                <CardDescription>Enable or disable AI-powered clinical documentation</CardDescription>
              </div>
              <Switch
                checked={settings.enabled}
                onCheckedChange={(enabled) => setSettings({ ...settings, enabled })}
              />
            </div>
          </CardHeader>
          {settings.enabled && (
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>AI Provider</Label>
                  <Select
                    value={settings.provider}
                    onValueChange={(provider) => setSettings({ ...settings, provider })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lovable_ai">Lovable AI (Recommended)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>AI Model</Label>
                  <Select
                    value={settings.model}
                    onValueChange={(model) => setSettings({ ...settings, model })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="google/gemini-2.5-flash">Gemini 2.5 Flash (Recommended)</SelectItem>
                      <SelectItem value="google/gemini-2.5-pro">Gemini 2.5 Pro (High Quality)</SelectItem>
                      <SelectItem value="google/gemini-2.5-flash-lite">Gemini 2.5 Flash Lite (Fast)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        <Tabs defaultValue="features" className="space-y-4">
          <TabsList>
            <TabsTrigger value="features">
              <Sparkles className="h-4 w-4 mr-2" />
              AI Features
            </TabsTrigger>
            <TabsTrigger value="privacy">
              <Shield className="h-4 w-4 mr-2" />
              Privacy & Compliance
            </TabsTrigger>
            <TabsTrigger value="quality">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Quality Control
            </TabsTrigger>
          </TabsList>

          <TabsContent value="features" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>AI Features</CardTitle>
                <CardDescription>Control which AI features are enabled</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Voice-to-Text from Telehealth Sessions</Label>
                    <p className="text-sm text-muted-foreground">
                      Convert session recordings to structured clinical notes
                    </p>
                  </div>
                  <Switch
                    checked={settings.voice_to_text_enabled}
                    onCheckedChange={(voice_to_text_enabled) => 
                      setSettings({ ...settings, voice_to_text_enabled })
                    }
                    disabled={!settings.enabled}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Text Expansion</Label>
                    <p className="text-sm text-muted-foreground">
                      Expand brief notes into full clinical documentation
                    </p>
                  </div>
                  <Switch
                    checked={settings.text_expansion_enabled}
                    onCheckedChange={(text_expansion_enabled) => 
                      setSettings({ ...settings, text_expansion_enabled })
                    }
                    disabled={!settings.enabled}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Template Completion</Label>
                    <p className="text-sm text-muted-foreground">
                      AI fills in template fields based on free-text input
                    </p>
                  </div>
                  <Switch
                    checked={settings.template_completion_enabled}
                    onCheckedChange={(template_completion_enabled) => 
                      setSettings({ ...settings, template_completion_enabled })
                    }
                    disabled={!settings.enabled}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Suggestion Engine</Label>
                    <p className="text-sm text-muted-foreground">
                      AI suggests diagnoses and interventions based on content
                    </p>
                  </div>
                  <Switch
                    checked={settings.suggestion_engine_enabled}
                    onCheckedChange={(suggestion_engine_enabled) => 
                      setSettings({ ...settings, suggestion_engine_enabled })
                    }
                    disabled={!settings.enabled}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Risk Assessment</Label>
                    <p className="text-sm text-muted-foreground">
                      AI flags potential risk indicators (SI, HI, abuse)
                    </p>
                  </div>
                  <Switch
                    checked={settings.risk_assessment_enabled}
                    onCheckedChange={(risk_assessment_enabled) => 
                      setSettings({ ...settings, risk_assessment_enabled })
                    }
                    disabled={!settings.enabled}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="privacy" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Privacy & HIPAA Compliance</CardTitle>
                <CardDescription>Configure data handling and privacy settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    All AI processing is HIPAA-compliant. Patient data is encrypted in transit and at rest.
                  </AlertDescription>
                </Alert>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Data Sharing Consent</Label>
                    <p className="text-sm text-muted-foreground">
                      Consent obtained for using de-identified data for AI improvement
                    </p>
                  </div>
                  <Switch
                    checked={settings.data_sharing_consent}
                    onCheckedChange={(data_sharing_consent) => 
                      setSettings({ ...settings, data_sharing_consent })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Anonymize Before Sending</Label>
                    <p className="text-sm text-muted-foreground">
                      Remove identifiable information before AI processing
                    </p>
                  </div>
                  <Switch
                    checked={settings.anonymize_before_sending}
                    onCheckedChange={(anonymize_before_sending) => 
                      setSettings({ ...settings, anonymize_before_sending })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Retain AI Processing Logs</Label>
                    <p className="text-sm text-muted-foreground">
                      Keep logs of AI processing for audit purposes
                    </p>
                  </div>
                  <Switch
                    checked={settings.retain_ai_logs}
                    onCheckedChange={(retain_ai_logs) => 
                      setSettings({ ...settings, retain_ai_logs })
                    }
                  />
                </div>

                {settings.retain_ai_logs && (
                  <div>
                    <Label htmlFor="retention-days">Log Retention Period (Days)</Label>
                    <Input
                      id="retention-days"
                      type="number"
                      value={settings.retention_days}
                      onChange={(e) => setSettings({ 
                        ...settings, 
                        retention_days: parseInt(e.target.value) || 90 
                      })}
                      className="mt-2 max-w-xs"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="quality" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Quality Control</CardTitle>
                <CardDescription>Configure AI accuracy and review requirements</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="confidence-threshold">
                    Minimum Confidence Threshold ({Math.round(settings.minimum_confidence_threshold * 100)}%)
                  </Label>
                  <Input
                    id="confidence-threshold"
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={settings.minimum_confidence_threshold}
                    onChange={(e) => setSettings({ 
                      ...settings, 
                      minimum_confidence_threshold: parseFloat(e.target.value) 
                    })}
                    className="mt-2"
                  />
                  <p className="text-sm text-muted-foreground mt-2">
                    Notes below this confidence level will be flagged for review
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto-Approve High Confidence Notes</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically approve notes above confidence threshold
                    </p>
                  </div>
                  <Switch
                    checked={settings.auto_approve_high_confidence}
                    onCheckedChange={(auto_approve_high_confidence) => 
                      setSettings({ ...settings, auto_approve_high_confidence })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Require Clinician Review</Label>
                    <p className="text-sm text-muted-foreground">
                      All AI-generated notes must be reviewed by clinician
                    </p>
                  </div>
                  <Switch
                    checked={settings.require_clinician_review}
                    onCheckedChange={(require_clinician_review) => 
                      setSettings({ ...settings, require_clinician_review })
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
