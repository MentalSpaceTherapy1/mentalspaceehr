import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useCurrentUserRoles } from '@/hooks/useUserRoles';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Heart, Lock, Clock, MessageSquare } from 'lucide-react';
import { z } from 'zod';
import logo from '@/assets/mentalspace-logo.png';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const signInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export default function PortalLogin() {
  const navigate = useNavigate();
  const { signIn, user } = useAuth();
  const { roles } = useCurrentUserRoles();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Redirect if already logged in
  useEffect(() => {
    if (user && roles.length > 0) {
      if (roles.includes('client_user')) {
        navigate('/portal');
      } else {
        navigate('/dashboard');
      }
    }
  }, [user, roles, navigate]);

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
      
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) throw error;

      // Check if email is verified
      if (!authData.user.email_confirmed_at) {
        await supabase.auth.signOut();
        toast.error('Please verify your email before logging in. Check your inbox for the verification link.');
        setLoading(false);
        return;
      }

      // Verify user has client_user role
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', authData.user.id);

      if (!roles?.some(r => r.role === 'client_user')) {
        await supabase.auth.signOut();
        throw new Error('This account does not have portal access.');
      }

      // Success - navigation will be handled by useEffect above
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
        toast.error(error.message || 'Invalid email or password');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-primary/5">
      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center">
        {/* Left side - Client-friendly messaging */}
        <div className="hidden lg:block space-y-6 text-foreground">
          <div className="flex items-center gap-3 mb-8">
            <img src={logo} alt="MentalSpace" className="h-16" />
          </div>
          
          <h2 className="text-3xl font-semibold">
            Welcome to Your Client Portal
          </h2>
          
          <p className="text-xl text-muted-foreground">
            Access your appointments, messages, and resources in one secure place.
          </p>

          <div className="space-y-4 mt-8">
            <div className="flex items-start gap-3">
              <Clock className="h-6 w-6 text-primary mt-1" />
              <div>
                <h3 className="font-semibold">Manage Appointments</h3>
                <p className="text-muted-foreground">View upcoming sessions and confirm appointments</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <MessageSquare className="h-6 w-6 text-primary mt-1" />
              <div>
                <h3 className="font-semibold">Secure Messaging</h3>
                <p className="text-muted-foreground">Communicate with your care team privately</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Heart className="h-6 w-6 text-primary mt-1" />
              <div>
                <h3 className="font-semibold">Track Your Progress</h3>
                <p className="text-muted-foreground">Access resources and monitor your wellness journey</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Lock className="h-6 w-6 text-primary mt-1" />
              <div>
                <h3 className="font-semibold">HIPAA Compliant</h3>
                <p className="text-muted-foreground">Your information is secure and private</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Login Form */}
        <Card className="w-full shadow-xl">
          <form onSubmit={handleSignIn}>
            <CardHeader>
              <div className="flex justify-center lg:hidden mb-4">
                <img src={logo} alt="MentalSpace" className="h-12" />
              </div>
              <CardTitle className="text-2xl">Client Portal Login</CardTitle>
              <CardDescription>
                Enter your credentials to access your portal
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input 
                  id="email"
                  name="email"
                  type="email" 
                  placeholder="your.email@example.com"
                  autoComplete="email"
                  required 
                />
                {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input 
                  id="password"
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
              
              <div className="text-sm text-center space-y-2">
                <div>
                  <Link to="/portal/forgot-password" className="text-primary hover:underline">
                    Forgot your password?
                  </Link>
                </div>
                <div className="text-muted-foreground">
                  Need help?{' '}
                  <a href="mailto:support@example.com" className="text-primary hover:underline">
                    Contact Support
                  </a>
                </div>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
