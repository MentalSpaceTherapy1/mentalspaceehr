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
import { usePasswordValidation } from '@/hooks/usePasswordValidation';
import { PasswordStrengthIndicator } from '@/components/PasswordStrengthIndicator';

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
  
  // Password breach checking
  const { 
    isBreached, 
    breachCount, 
    isChecking: isCheckingBreach,
    strength,
    strengthScore,
    suggestions 
  } = usePasswordValidation(password);

  // Establish session from recovery link tokens
  useEffect(() => {
    // SEO
    document.title = 'Reset Password | MentalSpace';
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', 'Reset your MentalSpace account password securely.');

    // Parse tokens from both hash and search params
    const hash = window.location.hash.startsWith('#') ? window.location.hash.substring(1) : window.location.hash;
    const hashParams = new URLSearchParams(hash);
    const searchParams = new URLSearchParams(window.location.search);

    // Try to get tokens from either source
    const type = hashParams.get('type') || searchParams.get('type');
    const access_token = hashParams.get('access_token') || searchParams.get('access_token');
    const refresh_token = hashParams.get('refresh_token') || searchParams.get('refresh_token');

    const finalize = (ok: boolean) => {
      setValidSession(ok);
      setChecking(false);
      // Clear URL parameters after successful session hydration
      if (ok && (window.location.hash || window.location.search.includes('access_token'))) {
        window.history.replaceState(null, '', window.location.pathname);
      }
    };

    if (type === 'recovery' && access_token && refresh_token) {
      // Store tokens for potential retry on form submission
      setStoredTokens({ access_token, refresh_token });
      
      supabase.auth.setSession({ access_token, refresh_token })
        .then(({ data, error }) => {
          finalize(!error && !!data.session);
        })
        .catch(() => {
          finalize(false);
        });
      return;
    }

    supabase.auth.getSession()
      .then(({ data }) => {
        finalize(!!data.session);
      })
      .catch(() => {
        finalize(false);
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    try {
      // Check for breached password
      if (isBreached) {
        setErrors({ 
          password: 'This password has been exposed in data breaches. Please choose a different password.' 
        });
        setLoading(false);
        return;
      }

      const validatedData = passwordSchema.parse({ password, confirmPassword });
      
      // Check for active session
      const { data: sessionData } = await supabase.auth.getSession();

      // If no session but we have stored tokens, retry setSession
      if (!sessionData.session && storedTokens) {
        const { data: retryData, error: retryError } = await supabase.auth.setSession(storedTokens);
        
        if (retryError || !retryData.session) {
          setErrors({ 
            password: 'Your reset link has expired or is invalid. Please request a new password reset link.' 
          });
          setLoading(false);
          return;
        }
      } else if (!sessionData.session) {
        setErrors({ 
          password: 'Your reset link has expired or is invalid. Please request a new password reset link.' 
        });
        setLoading(false);
        return;
      }
      
      const { error } = await updatePassword(validatedData.password);
      
      if (!error) {
        navigate('/dashboard');
      }
    } catch (error) {
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
              
              <PasswordStrengthIndicator
                password={password}
                isBreached={isBreached}
                breachCount={breachCount}
                isChecking={isCheckingBreach}
                strength={strength}
                strengthScore={strengthScore}
                suggestions={suggestions}
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
              disabled={loading || !validSession || isBreached || isCheckingBreach}
            >
              {loading ? 'Updating...' : 'Update Password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
