import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export default function PortalResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validSession, setValidSession] = useState(false);
  const [checking, setChecking] = useState(true);
  const [storedTokens, setStoredTokens] = useState<{ access_token: string; refresh_token: string } | null>(null);

  useEffect(() => {
    // SEO
    document.title = 'Portal Reset Password | MentalSpace';

    console.log('[PortalResetPassword] Initializing password reset flow');

    // Parse tokens from both hash and search params
    const hash = window.location.hash.startsWith('#') ? window.location.hash.substring(1) : window.location.hash;
    const hashParams = new URLSearchParams(hash);
    const searchParams = new URLSearchParams(window.location.search);

    // Try to get tokens from either source
    const type = hashParams.get('type') || searchParams.get('type');
    const access_token = hashParams.get('access_token') || searchParams.get('access_token');
    const refresh_token = hashParams.get('refresh_token') || searchParams.get('refresh_token');

    console.log('[PortalResetPassword] Token discovery:', { 
      type, 
      hasAccessToken: !!access_token, 
      hasRefreshToken: !!refresh_token,
      source: hashParams.get('access_token') ? 'hash' : 'search'
    });

    const handleInvalid = () => {
      console.log('[PortalResetPassword] Invalid or expired link detected');
      toast({
        title: 'Invalid or expired link',
        description: 'Please request a new password reset.',
        variant: 'destructive',
      });
      navigate('/portal/forgot-password');
    };

    const finalize = (ok: boolean) => {
      console.log('[PortalResetPassword] Session validation complete:', ok);
      setValidSession(ok);
      setChecking(false);
      // Clear URL parameters after successful session hydration
      if (ok && (window.location.hash || window.location.search.includes('access_token'))) {
        console.log('[PortalResetPassword] Clearing URL parameters');
        window.history.replaceState(null, '', window.location.pathname);
      }
      if (!ok) {
        handleInvalid();
      }
    };

    if (type === 'recovery' && access_token && refresh_token) {
      console.log('[PortalResetPassword] Attempting to set session with recovery tokens');
      // Store tokens for potential retry on form submission
      setStoredTokens({ access_token, refresh_token });
      
      supabase.auth.setSession({ access_token, refresh_token })
        .then(({ data, error }) => {
          console.log('[PortalResetPassword] setSession result:', { 
            hasSession: !!data.session, 
            error: error?.message 
          });
          finalize(!error && !!data.session);
        })
        .catch((err) => {
          console.error('[PortalResetPassword] setSession error:', err);
          finalize(false);
        });
      return;
    }

    console.log('[PortalResetPassword] No recovery tokens found, checking existing session');
    supabase.auth.getSession().then(({ data }) => {
      console.log('[PortalResetPassword] getSession result:', { hasSession: !!data.session });
      finalize(!!data.session);
    }).catch((err) => {
      console.error('[PortalResetPassword] getSession error:', err);
      finalize(false);
    });
  }, [navigate]);

  const passwordRequirements = [
    { label: 'At least 12 characters', test: (p: string) => p.length >= 12 },
    { label: 'Contains uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
    { label: 'Contains lowercase letter', test: (p: string) => /[a-z]/.test(p) },
    { label: 'Contains number', test: (p: string) => /\d/.test(p) },
    { label: 'Contains special character', test: (p: string) => /[!@#$%^&*]/.test(p) },
  ];

  const isPasswordValid = passwordRequirements.every(req => req.test(password));
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isPasswordValid) {
      toast({
        title: 'Invalid password',
        description: 'Please meet all password requirements.',
        variant: 'destructive',
      });
      return;
    }

    if (!passwordsMatch) {
      toast({
        title: 'Passwords do not match',
        description: 'Please ensure both passwords are identical.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      console.log('[PortalResetPassword] Form submitted, checking session before update');
      
      // Check for active session
      const { data: sessionData } = await supabase.auth.getSession();
      console.log('[PortalResetPassword] Current session status:', { hasSession: !!sessionData.session });

      // If no session but we have stored tokens, retry setSession
      if (!sessionData.session && storedTokens) {
        console.log('[PortalResetPassword] No session found, retrying setSession with stored tokens');
        const { data: retryData, error: retryError } = await supabase.auth.setSession(storedTokens);
        console.log('[PortalResetPassword] Retry setSession result:', { 
          hasSession: !!retryData.session, 
          error: retryError?.message 
        });
        
        if (retryError || !retryData.session) {
          console.error('[PortalResetPassword] Failed to establish session for password update');
          toast({
            title: 'Session expired',
            description: 'Your reset link has expired. Please request a new password reset link.',
            variant: 'destructive',
          });
          setLoading(false);
          setTimeout(() => navigate('/portal/forgot-password'), 2000);
          return;
        }
      } else if (!sessionData.session) {
        console.error('[PortalResetPassword] No session and no stored tokens available');
        toast({
          title: 'Session expired',
          description: 'Your reset link has expired. Please request a new password reset link.',
          variant: 'destructive',
        });
        setLoading(false);
        setTimeout(() => navigate('/portal/forgot-password'), 2000);
        return;
      }

      console.log('[PortalResetPassword] Session confirmed, proceeding with password update');
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      console.log('[PortalResetPassword] Password updated successfully');
      toast({
        title: 'Password updated successfully',
        description: 'You can now sign in with your new password.',
      });

      // Sign out and redirect to login
      await supabase.auth.signOut();
      navigate('/portal/login');
    } catch (error: any) {
      console.error('[PortalResetPassword] Password update error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update password. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Validating Reset Link</CardTitle>
            <CardDescription>Please wait while we verify your reset link...</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!validSession) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create New Password</CardTitle>
          <CardDescription>
            Choose a strong password to secure your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {password && (
              <div className="space-y-2 p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium">Password Requirements:</p>
                <ul className="space-y-1">
                  {passwordRequirements.map((req, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm">
                      {req.test(password) ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className={req.test(password) ? 'text-green-600' : 'text-muted-foreground'}>
                        {req.label}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={loading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {confirmPassword && (
                <p className="text-sm flex items-center gap-2">
                  {passwordsMatch ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span className="text-green-600">Passwords match</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 text-destructive" />
                      <span className="text-destructive">Passwords do not match</span>
                    </>
                  )}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading || !isPasswordValid || !passwordsMatch}
            >
              {loading ? 'Updating Password...' : 'Update Password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
