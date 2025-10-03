import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function MFASetup() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [factorId, setFactorId] = useState('');
  const [mfaEnabled, setMfaEnabled] = useState(false);

  useEffect(() => {
    checkMFAStatus();
  }, []);

  const checkMFAStatus = async () => {
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      
      const totpFactor = data?.totp?.find((f) => f.status === 'verified');
      setMfaEnabled(!!totpFactor);
    } catch (error) {
      console.error('Error checking MFA status:', error);
    }
  };

  const handleEnrollMFA = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Authenticator App',
      });

      if (error) throw error;

      setQrCode(data.totp.qr_code);
      setSecret(data.totp.secret);
      setFactorId(data.id);

      toast({
        title: 'MFA Enrollment Started',
        description: 'Scan the QR code with your authenticator app',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to enroll MFA',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyMFA = async () => {
    if (!verifyCode || !factorId) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.mfa.challengeAndVerify({
        factorId,
        code: verifyCode,
      });

      if (error) throw error;

      // Update profile to mark MFA as enabled
      await supabase
        .from('profiles')
        .update({ mfa_enabled: true })
        .eq('id', user?.id);

      toast({
        title: 'Success',
        description: 'MFA has been enabled successfully',
      });

      setMfaEnabled(true);
      setQrCode('');
      setSecret('');
      setVerifyCode('');
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Invalid verification code',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDisableMFA = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.auth.mfa.listFactors();
      const factor = data?.totp?.[0];

      if (factor) {
        await supabase.auth.mfa.unenroll({ factorId: factor.id });
        await supabase
          .from('profiles')
          .update({ mfa_enabled: false })
          .eq('id', user?.id);

        toast({
          title: 'Success',
          description: 'MFA has been disabled',
        });

        setMfaEnabled(false);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to disable MFA',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">Multi-Factor Authentication</h1>
                <p className="text-sm text-muted-foreground">
                  Add an extra layer of security to your account
                </p>
              </div>
            </div>
            {mfaEnabled && (
              <Badge variant="default">
                <CheckCircle className="h-3 w-3 mr-1" />
                Enabled
              </Badge>
            )}
          </div>

          {mfaEnabled ? (
            <div className="space-y-4">
              <div className="p-4 bg-primary/10 rounded-lg">
                <p className="text-sm">
                  MFA is currently enabled on your account. You'll need to enter a code from your
                  authenticator app each time you log in.
                </p>
              </div>
              <Button variant="destructive" onClick={handleDisableMFA} disabled={loading}>
                {loading ? 'Disabling...' : 'Disable MFA'}
              </Button>
            </div>
          ) : qrCode ? (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2">Step 1: Scan QR Code</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
                </p>
                <div className="flex justify-center p-4 bg-white rounded-lg">
                  <img src={qrCode} alt="MFA QR Code" className="w-48 h-48" />
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Step 2: Manual Entry (Optional)</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Or enter this code manually:
                </p>
                <code className="block p-3 bg-muted rounded text-sm font-mono">{secret}</code>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Step 3: Verify</h3>
                <Label htmlFor="verify_code">Enter verification code from your app</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    id="verify_code"
                    placeholder="000000"
                    maxLength={6}
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                  />
                  <Button onClick={handleVerifyMFA} disabled={loading || verifyCode.length !== 6}>
                    {loading ? 'Verifying...' : 'Verify'}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <h3 className="font-semibold">What is MFA?</h3>
                <p className="text-sm text-muted-foreground">
                  Multi-Factor Authentication adds an extra layer of security by requiring a
                  verification code from your phone in addition to your password when logging in.
                </p>
              </div>
              <Button onClick={handleEnrollMFA} disabled={loading}>
                {loading ? 'Setting up...' : 'Enable MFA'}
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
