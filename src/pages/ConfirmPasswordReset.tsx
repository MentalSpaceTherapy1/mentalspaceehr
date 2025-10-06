import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, ArrowRight } from 'lucide-react';
import logo from '@/assets/mentalspace-logo.png';
import { supabase } from '@/integrations/supabase/client';

export default function ConfirmPasswordReset() {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleContinue = async () => {
    setLoading(true);
    
    try {
      // Get the token from URL - Supabase adds it as hash params
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const type = hashParams.get('type');

      if (type !== 'recovery' || !accessToken) {
        throw new Error('Invalid or expired reset link');
      }

      // Set the session using the tokens
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken || '',
      });

      if (error) throw error;

      // Navigate to the reset password page
      navigate('/reset-password');
    } catch (error: any) {
      console.error('Error processing reset link:', error);
      // Redirect to login with error
      navigate('/auth?error=' + encodeURIComponent(error.message || 'Invalid reset link'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img src={logo} alt="MentalSpace" className="h-12" />
          </div>
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Shield className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle>Confirm Password Reset</CardTitle>
          <CardDescription>
            Click the button below to continue resetting your password. This extra step helps keep your account secure.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleContinue}
            className="w-full"
            size="lg"
            disabled={loading}
          >
            {loading ? (
              'Processing...'
            ) : (
              <>
                Continue to Reset Password
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
          
          <div className="mt-6 p-4 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground text-center">
              <strong>Security Note:</strong> This confirmation step prevents automated email scanners from consuming your reset link before you can use it.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
