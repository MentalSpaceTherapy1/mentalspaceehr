import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Mail, RefreshCw } from 'lucide-react';

interface EmailVerificationNoticeProps {
  email: string;
}

export const EmailVerificationNotice = ({ email }: EmailVerificationNoticeProps) => {
  const [loading, setLoading] = useState(false);

  const handleResendEmail = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Verification email sent! Please check your inbox.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to resend email',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6 max-w-md mx-auto">
      <div className="flex flex-col items-center text-center space-y-4">
        <div className="p-3 bg-primary/10 rounded-full">
          <Mail className="h-8 w-8 text-primary" />
        </div>
        
        <div>
          <h2 className="text-xl font-bold mb-2">Verify Your Email</h2>
          <p className="text-sm text-muted-foreground">
            We've sent a verification email to <strong>{email}</strong>
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Please check your inbox and click the verification link to activate your account.
          </p>
        </div>

        <Button 
          variant="outline" 
          onClick={handleResendEmail} 
          disabled={loading}
          className="w-full"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Sending...' : 'Resend Verification Email'}
        </Button>
      </div>
    </Card>
  );
};
