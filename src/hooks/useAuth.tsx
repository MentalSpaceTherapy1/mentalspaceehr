import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, userData: SignUpData) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<ProfileData>) => Promise<{ error: Error | null }>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
}

interface SignUpData {
  firstName: string;
  lastName: string;
}

interface ProfileData {
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  [key: string]: any;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Defer profile fetch with setTimeout to avoid deadlock
        if (session?.user && event === 'SIGNED_IN') {
          setTimeout(() => {
            updateLastLogin(session.user.id);
          }, 0);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const updateLastLogin = async (userId: string) => {
    await supabase
      .from('profiles')
      .update({ last_login_date: new Date().toISOString() })
      .eq('id', userId);
  };

  const logLoginAttempt = async (email: string, success: boolean, failureReason?: string) => {
    try {
      // SECURITY: Log via edge function to capture real server-side IP from request headers
      await supabase.functions.invoke('log-auth-attempt', {
        body: { 
          email: email.toLowerCase(), 
          success, 
          error_message: failureReason || null 
        }
      });
    } catch (error) {
      // Never block authentication due to logging failures
    }
  };

  const checkAccountLockout = async (email: string) => {
    try {
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      
      const { data, error } = await supabase
        .from('login_attempts')
        .select('*')
        .eq('email', email)
        .eq('success', false)
        .gte('attempt_time', thirtyMinutesAgo)
        .order('attempt_time', { ascending: false });

      if (error) throw error;

      if (data && data.length >= 5) {
        const oldestFailedAttempt = data[data.length - 1];
        const lockoutEndsAt = new Date(new Date(oldestFailedAttempt.attempt_time).getTime() + 30 * 60 * 1000);
        const minutesRemaining = Math.max(0, (lockoutEndsAt.getTime() - Date.now()) / (60 * 1000));
        
        return { isLocked: true, minutesRemaining };
      }

      return { isLocked: false, minutesRemaining: 0 };
    } catch (error) {
      return { isLocked: false, minutesRemaining: 0 };
    }
  };

  const signUp = async (email: string, password: string, userData: SignUpData) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            first_name: userData.firstName,
            last_name: userData.lastName,
          }
        }
      });

      if (error) throw error;

      toast.success('Account created successfully!');
      return { error: null };
    } catch (error) {
      const err = error as Error;
      toast.error(err.message || 'Failed to create account');
      return { error: err };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      // Check if account is locked due to failed attempts
      const lockoutCheck = await checkAccountLockout(email);
      if (lockoutCheck.isLocked) {
        const minutesLeft = Math.ceil(lockoutCheck.minutesRemaining || 0);
        toast.error(`Account locked due to too many failed attempts. Try again in ${minutesLeft} minutes.`);
        return { error: new Error('Account locked') };
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Log failed attempt
        await logLoginAttempt(email, false, error.message);
        throw error;
      }

      // Log successful attempt
      await logLoginAttempt(email, true);

      // Check user roles and redirect appropriately
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        // Check password expiration
        const { data: profile } = await supabase
          .from('profiles')
          .select('last_password_change, created_at, password_requires_change')
          .eq('id', authUser.id)
          .single();

        if (profile) {
          // Check if password change is explicitly required
          if (profile.password_requires_change) {
            toast.error('Password change required before continuing');
            navigate('/reset-password?required=true');
            return { error: null };
          }

          // Calculate days since last password change
          const lastChange = profile.last_password_change
            ? new Date(profile.last_password_change)
            : new Date(profile.created_at);

          const daysSinceChange = Math.floor((Date.now() - lastChange.getTime()) / (1000 * 60 * 60 * 24));

          // Password expired (>90 days)
          if (daysSinceChange > 90) {
            toast.error('Your password has expired. Please change it now.');
            navigate('/reset-password?expired=true');
            return { error: null };
          }

          // Warn if expiring soon (< 7 days)
          const daysRemaining = 90 - daysSinceChange;
          if (daysRemaining <= 7 && daysRemaining > 0) {
            toast.warning(`Your password will expire in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}. Please change it soon.`);
          }
        }

        const { data: roles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', authUser.id);

        const userRoles = roles?.map(r => r.role) || [];

        // If user only has client_user role, redirect to portal
        if (userRoles.length === 1 && userRoles[0] === 'client_user') {
          toast.success('Welcome back!');
          navigate('/portal');
        } else {
        // Staff user - redirect to dashboard or return URL
        const returnUrl = localStorage.getItem('returnUrl');
        if (returnUrl && returnUrl !== '/auth') {
          localStorage.removeItem('returnUrl');
          toast.success('Welcome back!');
          navigate(returnUrl);
        } else {
          toast.success('Welcome back!');
          navigate('/dashboard');
        }
        }
      } else {
        navigate('/dashboard');
      }
      
      return { error: null };
    } catch (error) {
      const err = error as Error;
      toast.error(err.message || 'Failed to sign in');
      return { error: err };
    }
  };

  const resetPassword = async (email: string) => {
    try {
      // Let Supabase use the configured Site URL for redirect
      const { error } = await supabase.auth.resetPasswordForEmail(email);

      if (error) throw error;

      toast.success('Password reset email sent! Check your inbox.');
      return { error: null };
    } catch (error) {
      const err = error as Error;
      toast.error(err.message || 'Failed to send reset email');
      return { error: err };
    }
  };

  const updatePassword = async (newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      // Update last_password_change timestamp and clear password_requires_change flag
      if (user) {
        await supabase
          .from('profiles')
          .update({
            last_password_change: new Date().toISOString(),
            password_requires_change: false
          })
          .eq('id', user.id);
      }

      toast.success('Password updated successfully');
      return { error: null };
    } catch (error) {
      const err = error as Error;
      toast.error(err.message || 'Failed to update password');
      return { error: err };
    }
  };

  const signOut = async () => {
    // Store current URL for redirect after login
    const currentPath = window.location.pathname + window.location.search;
    if (currentPath !== '/auth') {
      localStorage.setItem('returnUrl', currentPath);
    }
    
    try {
      const { error } = await supabase.auth.signOut();
      
      // Ignore session-related errors - these are expected when session already expired
      if (error && !error.message?.toLowerCase().includes('session')) {
        throw error;
      }
      
      // Clear local state regardless of API response
      setUser(null);
      setSession(null);
      
      toast.success('Signed out successfully');
      navigate('/auth');
    } catch (error) {
      const err = error as Error;
      // Still clear state even if there was an error
      setUser(null);
      setSession(null);
      toast.error(err.message || 'Failed to sign out');
      navigate('/auth');
    }
  };

  const updateProfile = async (data: Partial<ProfileData>) => {
    if (!user) return { error: new Error('No user logged in') };

    try {
      const { error } = await supabase
        .from('profiles')
        .update(data)
        .eq('id', user.id);

      if (error) throw error;

      toast.success('Profile updated successfully');
      return { error: null };
    } catch (error) {
      const err = error as Error;
      toast.error(err.message || 'Failed to update profile');
      return { error: err };
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut, updateProfile, resetPassword, updatePassword }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
