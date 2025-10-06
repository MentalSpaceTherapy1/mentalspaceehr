import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { z } from 'zod';
import logo from '@/assets/mentalspace-logo.png';
import { supabase } from '@/integrations/supabase/client';

const passwordSchema = z.object({
  password: z.string()
    .min(12, 'Password must be at least 12 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Must contain at least one special character'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [validSession, setValidSession] = useState(false);
  const [checking, setChecking] = useState(true);
  const [storedTokens, setStoredTokens] = useState<{ access_token: string; refresh_token: string } | null>(null);
  const { updatePassword } = useAuth();
  const navigate = useNavigate();

  // Establish session from recovery link tokens
  useEffect(() => {
    // SEO
    document.title = 'Reset Password | MentalSpace';
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', 'Reset your MentalSpace account password securely.');

    console.log('[ResetPassword] Initializing password reset flow');

    // Parse tokens from both hash and search params
    const hash = window.location.hash.startsWith('#') ? window.location.hash.substring(1) : window.location.hash;
    const hashParams = new URLSearchParams(hash);
    const searchParams = new URLSearchParams(window.location.search);

    // Try to get tokens from either source
    const type = hashParams.get('type') || searchParams.get('type');
    const access_token = hashParams.get('access_token') || searchParams.get('access_token');
    const refresh_token = hashParams.get('refresh_token') || searchParams.get('refresh_token');

    console.log('[ResetPassword] Token discovery:', { 
      type, 
      hasAccessToken: !!access_token, 
      hasRefreshToken: !!refresh_token,
      source: hashParams.get('access_token') ? 'hash' : 'search'
    });

    const finalize = (ok: boolean) => {
      console.log('[ResetPassword] Session validation complete:', ok);
      setValidSession(ok);
      setChecking(false);
      // Clear URL parameters after successful session hydration
      if (ok && (window.location.hash || window.location.search.includes('access_token'))) {
        console.log('[ResetPassword] Clearing URL parameters');
        window.history.replaceState(null, '', window.location.pathname);
      }
    };

    if (type === 'recovery' && access_token && refresh_token) {
      console.log('[ResetPassword] Attempting to set session with recovery tokens');
      // Store tokens for potential retry on form submission
      setStoredTokens({ access_token, refresh_token });
      
      supabase.auth.setSession({ access_token, refresh_token })
        .then(({ data, error }) => {
          console.log('[ResetPassword] setSession result:', { 
            hasSession: !!data.session, 
            error: error?.message 
          });
          finalize(!error && !!data.session);
        })
        .catch((err) => {
          console.error('[ResetPassword] setSession error:', err);
          finalize(false);
        });
      return;
    }

    console.log('[ResetPassword] No recovery tokens found, checking existing session');
    supabase.auth.getSession()
      .then(({ data }) => {
        console.log('[ResetPassword] getSession result:', { hasSession: !!data.session });
        finalize(!!data.session);
      })
      .catch((err) => {
        console.error('[ResetPassword] getSession error:', err);
        finalize(false);
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    try {
      const validatedData = passwordSchema.parse({ password, confirmPassword });
      
      console.log('[ResetPassword] Form submitted, checking session before update');
      
      // Check for active session
      const { data: sessionData } = await supabase.auth.getSession();
      console.log('[ResetPassword] Current session status:', { hasSession: !!sessionData.session });

      // If no session but we have stored tokens, retry setSession
      if (!sessionData.session && storedTokens) {
        console.log('[ResetPassword] No session found, retrying setSession with stored tokens');
        const { data: retryData, error: retryError } = await supabase.auth.setSession(storedTokens);
        console.log('[ResetPassword] Retry setSession result:', { 
          hasSession: !!retryData.session, 
          error: retryError?.message 
        });
        
        if (retryError || !retryData.session) {
          console.error('[ResetPassword] Failed to establish session for password update');
          setErrors({ 
            password: 'Your reset link has expired or is invalid. Please request a new password reset link.' 
          });
          setLoading(false);
          return;
        }
      } else if (!sessionData.session) {
        console.error('[ResetPassword] No session and no stored tokens available');
        setErrors({ 
          password: 'Your reset link has expired or is invalid. Please request a new password reset link.' 
        });
        setLoading(false);
        return;
      }
      
      console.log('[ResetPassword] Session confirmed, proceeding with password update');
      const { error } = await updatePassword(validatedData.password);
      
      if (!error) {
        console.log('[ResetPassword] Password updated successfully');
        navigate('/dashboard');
      } else {
        console.error('[ResetPassword] Password update failed:', error);
      }
    } catch (error) {
      console.error('[ResetPassword] Form submission error:', error);
      if (error instanceof z.ZodError) {
        const fieldErrors: { [key: string]: string } = {};
        error.errors.forEach((err) => {
          if (err.path) {
            fieldErrors[err.path[0]] = err.message;
          }
        });
        setErrors(fieldErrors);
      }
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <img src={logo} alt="MentalSpace logo" className="h-12" />
            </div>
            <CardTitle>Validating Reset Link</CardTitle>
            <CardDescription>Hang tight while we verify your reset link…</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!validSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <img src={logo} alt="MentalSpace logo" className="h-12" />
            </div>
            <CardTitle>Reset Link Invalid or Expired</CardTitle>
            <CardDescription>
              Please request a new password reset link.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full" variant="outline">
              <Link to="/forgot-password">Request New Reset Link</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img src={logo} alt="MentalSpace logo" className="h-12" />
          </div>
          <CardTitle>Create New Password</CardTitle>
          <CardDescription>
            Enter your new password below. Make sure it's at least 12 characters long.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Password must contain:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>At least 12 characters</li>
                  <li>One uppercase letter</li>
                  <li>One lowercase letter</li>
                  <li>One number</li>
                  <li>One special character</li>
                </ul>
              </div>
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">{errors.confirmPassword}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading || !validSession}
            >
              {loading ? 'Updating...' : 'Update Password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
