import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Save, RotateCcw, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface EmailTemplate {
  invitation_subject: string;
  invitation_body: string;
  password_reset_subject: string;
  password_reset_body: string;
}

const DEFAULT_TEMPLATES: EmailTemplate = {
  invitation_subject: 'Your Client Portal Account is Ready!',
  invitation_body: `Hello {firstName} {lastName},

Your client portal account has been activated. You now have secure access to:

• View and manage appointments
• Communicate with your care team
• Access your billing information
• View treatment progress and resources
• Update your profile and preferences

Login Credentials:
Email: {email}
Temporary Password: {tempPassword}

⚠️ Important: You'll be required to verify your email and change your password on first login.

Portal URL: {portalUrl}

If you didn't request this account, please contact our office immediately.`,
  
  password_reset_subject: 'Reset Your Client Portal Password',
  password_reset_body: `Hello {firstName} {lastName},

We received a request to reset your client portal password.

Click the link below to reset your password:
{resetLink}

This link will expire in 24 hours.

If you didn't request this password reset, please contact our office immediately and ignore this email.`,
};

export function PortalEmailTemplates() {
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<EmailTemplate>(DEFAULT_TEMPLATES);
  const [settingsId, setSettingsId] = useState<string | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('practice_settings')
        .select('id, portal_email_templates')
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettingsId(data.id);
        if (data.portal_email_templates) {
          const savedTemplates = data.portal_email_templates as any;
          setTemplates({ ...DEFAULT_TEMPLATES, ...savedTemplates });
        }
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const payload: any = {
        portal_email_templates: templates,
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

      toast.success('Email templates saved successfully');
    } catch (error) {
      console.error('Error saving templates:', error);
      toast.error('Failed to save email templates');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setTemplates(DEFAULT_TEMPLATES);
    toast.success('Templates reset to defaults');
  };

  return (
    <div className="space-y-6">
      <Alert>
        <Mail className="h-4 w-4" />
        <AlertDescription>
          Customize the email templates sent to clients. Available variables: {'{firstName}'}, {'{lastName}'}, {'{email}'}, {'{tempPassword}'}, {'{portalUrl}'}, {'{resetLink}'}
        </AlertDescription>
      </Alert>

      {/* Invitation Email */}
      <Card>
        <CardHeader>
          <CardTitle>Portal Invitation Email</CardTitle>
          <CardDescription>
            Sent when a client is granted portal access for the first time
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="invitation_subject">Subject Line</Label>
            <Input
              id="invitation_subject"
              value={templates.invitation_subject}
              onChange={(e) => setTemplates({ ...templates, invitation_subject: e.target.value })}
              placeholder="Email subject"
            />
          </div>
          <div>
            <Label htmlFor="invitation_body">Email Body</Label>
            <Textarea
              id="invitation_body"
              value={templates.invitation_body}
              onChange={(e) => setTemplates({ ...templates, invitation_body: e.target.value })}
              placeholder="Email content"
              rows={15}
              className="font-mono text-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* Password Reset Email */}
      <Card>
        <CardHeader>
          <CardTitle>Password Reset Email</CardTitle>
          <CardDescription>
            Sent when a client requests a password reset
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="password_reset_subject">Subject Line</Label>
            <Input
              id="password_reset_subject"
              value={templates.password_reset_subject}
              onChange={(e) => setTemplates({ ...templates, password_reset_subject: e.target.value })}
              placeholder="Email subject"
            />
          </div>
          <div>
            <Label htmlFor="password_reset_body">Email Body</Label>
            <Textarea
              id="password_reset_body"
              value={templates.password_reset_body}
              onChange={(e) => setTemplates({ ...templates, password_reset_body: e.target.value })}
              placeholder="Email content"
              rows={12}
              className="font-mono text-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-end gap-4">
        <Button variant="outline" onClick={handleReset}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset to Defaults
        </Button>
        <Button onClick={handleSave} disabled={loading}>
          <Save className="h-4 w-4 mr-2" />
          {loading ? 'Saving...' : 'Save Templates'}
        </Button>
      </div>
    </div>
  );
}
