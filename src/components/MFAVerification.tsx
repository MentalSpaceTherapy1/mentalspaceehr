import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Shield } from 'lucide-react';

interface MFAVerificationProps {
  onVerified: () => void;
  onCancel: () => void;
}

export const MFAVerification = ({ onVerified, onCancel }: MFAVerificationProps) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) return;

    setLoading(true);
    try {
      const factors = await supabase.auth.mfa.listFactors();
      if (factors.error) throw factors.error;

      const totpFactor = factors.data.totp?.[0];
      if (!totpFactor) {
        throw new Error('No MFA factor found');
      }

      const challenge = await supabase.auth.mfa.challenge({ factorId: totpFactor.id });
      if (challenge.error) throw challenge.error;

      const verify = await supabase.auth.mfa.verify({
        factorId: totpFactor.id,
        challengeId: challenge.data.id,
        code,
      });

      if (verify.error) throw verify.error;

      toast({
        title: 'Success',
        description: 'MFA verification successful',
      });

      onVerified();
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

  return (
    <Card className="p-6 max-w-md mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="h-8 w-8 text-primary" />
        <div>
          <h2 className="text-xl font-bold">Two-Factor Authentication</h2>
          <p className="text-sm text-muted-foreground">
            Enter the code from your authenticator app
          </p>
        </div>
      </div>

      <form onSubmit={handleVerify} className="space-y-4">
        <div>
          <Label htmlFor="mfa_code">Verification Code</Label>
          <Input
            id="mfa_code"
            placeholder="000000"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            autoFocus
          />
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={loading || code.length !== 6} className="flex-1">
            {loading ? 'Verifying...' : 'Verify'}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
};
