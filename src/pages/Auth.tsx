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
import { MFAVerification } from '@/components/MFAVerification';
import { EmailVerificationNotice } from '@/components/EmailVerificationNotice';
import { supabase } from '@/integrations/supabase/client';
import { checkTrustedDevice, addTrustedDevice } from '@/lib/api/trustedDevices';

const signUpSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(12, 'Password must be at least 12 characters'),
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
  const { signIn, signUp, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showMFA, setShowMFA] = useState(false);
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  const [rememberDevice, setRememberDevice] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
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
      
      // Check if user has MFA enabled
      const { data: { user: authUser }, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) {
        if (error.message.includes('MFA')) {
          // Check if device is trusted - skip MFA if it is
          if (authUser && await checkTrustedDevice(authUser.id)) {
            await signIn(data.email, data.password);
            return;
          }
          setShowMFA(true);
          return;
        }
        throw error;
      }

      // Check for email verification
      if (authUser && !authUser.email_confirmed_at) {
        setPendingEmail(data.email);
        setShowEmailVerification(true);
        await supabase.auth.signOut();
        return;
      }

      // Add trusted device if "remember me" is checked
      if (rememberDevice && authUser) {
        try {
          await addTrustedDevice(authUser.id);
        } catch (err) {
          console.error('Failed to add trusted device:', err);
        }
      }

      await signIn(data.email, data.password);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(fieldErrors);
      }
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
      const { error } = await signUp(data.email, data.password, {
        firstName: data.firstName,
        lastName: data.lastName,
      });
      
      if (!error) {
        // Show email verification notice
        setPendingEmail(data.email);
        setShowEmailVerification(true);
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
      }
    } finally {
      setLoading(false);
    }
  };

  // Show MFA verification if needed
  if (showMFA) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--gradient-hero)' }}>
        <MFAVerification
          onVerified={() => navigate('/dashboard')}
          onCancel={() => setShowMFA(false)}
        />
      </div>
    );
  }

  // Show email verification notice if needed
  if (showEmailVerification) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--gradient-hero)' }}>
        <EmailVerificationNotice email={pendingEmail} />
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
              <div className="flex justify-center lg:hidden mb-4">
                <img src={logo} alt="MentalSpace" className="h-12" />
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
                      required 
                    />
                    {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="remember"
                      checked={rememberDevice}
                      onCheckedChange={(checked) => setRememberDevice(checked as boolean)}
                    />
                    <Label htmlFor="remember" className="text-sm cursor-pointer">
                      Remember this device for 30 days
                    </Label>
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
                      required 
                    />
                    <p className="text-xs text-muted-foreground">Minimum 12 characters</p>
                    {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input 
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      placeholder="••••••••••••"
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
