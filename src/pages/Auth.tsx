import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Activity, Shield, Users } from 'lucide-react';
import { z } from 'zod';
import logo from '@/assets/mentalspace-logo.png';
import { usePasswordValidation } from '@/hooks/usePasswordValidation';
import { PasswordStrengthIndicator } from '@/components/PasswordStrengthIndicator';

const signUpSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(12, 'Password must be at least 12 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Must contain at least one special character'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const signInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export default function Auth() {
  const navigate = useNavigate();
  const { signIn, signUp, verifyMFA, setNewPassword, user, needsMFA, needsPasswordChange } = useAuth();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [mfaCode, setMFACode] = useState('');
  const [rememberDevice, setRememberDevice] = useState(false);
  const [signupPassword, setSignupPassword] = useState('');
  const [newPassword, setNewPasswordState] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');

  const passwordValidation = usePasswordValidation(signupPassword);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      // Role-based navigation is handled by useAuth
      const role = user['custom:role'];
      if (role === 'client') {
        navigate('/portal');
      } else {
        navigate('/dashboard');
      }
    }
  }, [user, navigate]);

  if (user) {
    return null;
  }

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      email: formData.get('email') as string,
      password: formData.get('password') as string,
    };

    try {
      signInSchema.parse(data);

      // Attempt to sign in via Cognito
      const { error } = await signIn(data.email, data.password);

      if (error) {
        throw error;
      }

      // If needsMFA is true, the MFA UI will show automatically
      // Navigation is handled by useAuth hook after successful auth
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(fieldErrors);
      } else {
        setErrors({ email: error.message || 'Invalid email or password' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMFAVerify = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    try {
      const { error } = await verifyMFA(mfaCode);

      if (error) {
        setErrors({ mfa: error.message || 'Invalid MFA code' });
      }
      // Navigation is handled by useAuth hook after successful MFA
    } catch (error: any) {
      setErrors({ mfa: error.message || 'MFA verification failed' });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});

    if (newPassword !== confirmPassword) {
      setErrors({ confirmPassword: "Passwords don't match" });
      return;
    }

    if (newPassword.length < 12) {
      setErrors({ newPassword: 'Password must be at least 12 characters' });
      return;
    }

    if (!fullName.trim()) {
      setErrors({ fullName: 'Full name is required' });
      return;
    }

    setLoading(true);

    try {
      const { error } = await setNewPassword(newPassword, fullName);

      if (error) {
        setErrors({ newPassword: error.message || 'Failed to change password' });
      }
      // Navigation is handled by useAuth hook after successful password change
    } catch (error: any) {
      setErrors({ newPassword: error.message || 'Failed to change password' });
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      firstName: formData.get('firstName') as string,
      lastName: formData.get('lastName') as string,
      email: formData.get('email') as string,
      password: formData.get('password') as string,
      confirmPassword: formData.get('confirmPassword') as string,
    };

    try {
      signUpSchema.parse(data);

      // Check for breached password
      if (passwordValidation.isBreached) {
        setErrors({ password: 'This password has been exposed in data breaches. Please choose a different password.' });
        setLoading(false);
        return;
      }

      // Sign up is disabled for HIPAA compliance - admins must create accounts
      const { error } = await signUp(data.email, data.password, {
        firstName: data.firstName,
        lastName: data.lastName,
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(fieldErrors);
      } else if (error instanceof Error) {
        setErrors({ email: error.message });
      }
    } finally {
      setLoading(false);
    }
  };

  // Show password change form if needed
  if (needsPasswordChange) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--gradient-hero)' }}>
        <Card className="w-full max-w-md shadow-xl">
          <form onSubmit={handlePasswordChange}>
            <CardHeader>
              <CardTitle>Change Password Required</CardTitle>
              <CardDescription>
                You must set a new password before continuing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  name="fullName"
                  type="text"
                  placeholder="Enter your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  autoFocus
                />
                {errors.fullName && <p className="text-sm text-destructive">{errors.fullName}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  placeholder="Enter new password (min 12 characters)"
                  value={newPassword}
                  onChange={(e) => setNewPasswordState(e.target.value)}
                  required
                />
                {errors.newPassword && <p className="text-sm text-destructive">{errors.newPassword}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword}</p>}
              </div>
            </CardContent>
            <CardFooter className="flex gap-2">
              <Button
                type="submit"
                className="flex-1"
                disabled={loading}
              >
                {loading ? 'Changing Password...' : 'Change Password'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => window.location.reload()}
              >
                Cancel
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    );
  }

  // Show MFA verification if needed
  if (needsMFA) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--gradient-hero)' }}>
        <Card className="w-full max-w-md shadow-xl">
          <form onSubmit={handleMFAVerify}>
            <CardHeader>
              <CardTitle>Multi-Factor Authentication</CardTitle>
              <CardDescription>
                Enter the verification code from your authenticator app
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="mfa-code">Verification Code</Label>
                <Input
                  id="mfa-code"
                  name="mfaCode"
                  type="text"
                  placeholder="000000"
                  value={mfaCode}
                  onChange={(e) => setMFACode(e.target.value)}
                  maxLength={6}
                  required
                  autoFocus
                />
                {errors.mfa && <p className="text-sm text-destructive">{errors.mfa}</p>}
              </div>
            </CardContent>
            <CardFooter className="flex gap-2">
              <Button
                type="submit"
                className="flex-1"
                disabled={loading || mfaCode.length !== 6}
              >
                {loading ? 'Verifying...' : 'Verify'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => window.location.reload()}
              >
                Cancel
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--gradient-hero)' }}>
      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center">
        {/* Left side - Branding */}
        <div className="hidden lg:block space-y-6 text-foreground">
          <div className="flex items-center gap-3 mb-8">
            <img src={logo} alt="MentalSpace" className="h-16" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-[hsl(190,95%,45%)] to-[hsl(170,85%,50%)] bg-clip-text text-transparent">
              MentalSpace EHR
            </h1>
          </div>
          
          <h2 className="text-3xl font-semibold">
            Streamline Your Mental Health Practice
          </h2>
          
          <p className="text-xl text-muted-foreground">
            Comprehensive electronic health records designed specifically for mental health professionals.
          </p>

          <div className="space-y-4 mt-8">
            <div className="flex items-start gap-3">
              <Shield className="h-6 w-6 text-accent mt-1" />
              <div>
                <h3 className="font-semibold">HIPAA Compliant</h3>
                <p className="text-muted-foreground">End-to-end encryption and secure data storage</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Users className="h-6 w-6 text-accent mt-1" />
              <div>
                <h3 className="font-semibold">Supervision Ready</h3>
                <p className="text-muted-foreground">Built-in supervision workflows and co-signing</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Activity className="h-6 w-6 text-accent mt-1" />
              <div>
                <h3 className="font-semibold">AI-Powered Documentation</h3>
                <p className="text-muted-foreground">Reduce administrative burden with smart note generation</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Auth Forms */}
        <Card className="w-full shadow-xl">
          <Tabs defaultValue="signin" className="w-full">
            <CardHeader>
              <div className="flex flex-col items-center lg:hidden mb-4 gap-2">
                <img src={logo} alt="MentalSpace" className="h-12" />
                <h1 className="text-2xl font-bold bg-gradient-to-r from-[hsl(190,95%,45%)] to-[hsl(170,85%,50%)] bg-clip-text text-transparent">
                  MentalSpace EHR
                </h1>
              </div>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
            </CardHeader>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn}>
                <CardContent className="space-y-4">
                  <CardTitle>Welcome Back</CardTitle>
                  <CardDescription>
                    Enter your credentials to access your account
                  </CardDescription>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <Input 
                      id="signin-email"
                      name="email"
                      type="email" 
                      placeholder="your.email@example.com"
                      autoComplete="email"
                      required 
                    />
                    {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Password</Label>
                    <Input 
                      id="signin-password"
                      name="password"
                      type="password"
                      placeholder="••••••••••••"
                      autoComplete="current-password"
                      required 
                    />
                    {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                  </div>

                </CardContent>
                
                <CardFooter className="flex flex-col gap-4">
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={loading}
                  >
                    {loading ? 'Signing In...' : 'Sign In'}
                  </Button>
                  
                  <Button 
                    type="button"
                    variant="link" 
                    className="text-sm"
                    onClick={() => navigate('/forgot-password')}
                  >
                    Forgot Password?
                  </Button>
                </CardFooter>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp}>
                <CardContent className="space-y-4">
                  <CardTitle>Create Account</CardTitle>
                  <CardDescription>
                    Enter your information to get started
                  </CardDescription>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input 
                        id="firstName"
                        name="firstName"
                        placeholder="John"
                        required 
                      />
                      {errors.firstName && <p className="text-sm text-destructive">{errors.firstName}</p>}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input 
                        id="lastName"
                        name="lastName"
                        placeholder="Doe"
                        required 
                      />
                      {errors.lastName && <p className="text-sm text-destructive">{errors.lastName}</p>}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input 
                      id="signup-email"
                      name="email"
                      type="email" 
                      placeholder="your.email@example.com"
                      autoComplete="email"
                      required 
                    />
                    {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input 
                      id="signup-password"
                      name="password"
                      type="password"
                      placeholder="••••••••••••"
                      autoComplete="new-password"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      required 
                    />
                    <PasswordStrengthIndicator
                      password={signupPassword}
                      isBreached={passwordValidation.isBreached}
                      breachCount={passwordValidation.breachCount}
                      isChecking={passwordValidation.isChecking}
                      strength={passwordValidation.strength}
                      strengthScore={passwordValidation.strengthScore}
                      suggestions={passwordValidation.suggestions}
                    />
                    {errors.password && <p className="text-sm text-destructive mt-2">{errors.password}</p>}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input 
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      placeholder="••••••••••••"
                      autoComplete="new-password"
                      required 
                    />
                    {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword}</p>}
                  </div>
                </CardContent>
                
                <CardFooter>
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={loading}
                  >
                    {loading ? 'Creating Account...' : 'Create Account'}
                  </Button>
                </CardFooter>
              </form>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
