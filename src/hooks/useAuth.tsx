import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { cognitoAuth, CognitoUser, CognitoSession } from '@/lib/aws-cognito';
import { apiClient } from '@/lib/aws-api-client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface AuthContextType {
  user: CognitoUser | null;
  session: CognitoSession | null;
  loading: boolean;
  needsMFA: boolean;
  needsPasswordChange: boolean;
  signUp: (email: string, password: string, userData: SignUpData) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  verifyMFA: (code: string) => Promise<{ error: Error | null }>;
  setNewPassword: (newPassword: string, name: string) => Promise<{ error: Error | null }>;
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
  const [user, setUser] = useState<CognitoUser | null>(null);
  const [session, setSession] = useState<CognitoSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsMFA, setNeedsMFA] = useState(false);
  const [needsPasswordChange, setNeedsPasswordChange] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check for existing session on mount
    const existingSession = cognitoAuth.getSession();
    if (existingSession) {
      setSession(existingSession);
      setUser(existingSession.user);

      // Update last login
      updateLastLogin(existingSession.user.id).catch(console.error);
    }
    setLoading(false);

    // Set up periodic token refresh (every 30 minutes)
    const refreshInterval = setInterval(async () => {
      if (cognitoAuth.isAuthenticated()) {
        const { user, error } = await cognitoAuth.getUser();
        if (error) {
          // Session expired or invalid
          setUser(null);
          setSession(null);
          navigate('/auth');
        } else if (user) {
          const currentSession = cognitoAuth.getSession();
          setUser(user);
          setSession(currentSession);
        }
      }
    }, 30 * 60 * 1000); // 30 minutes

    return () => clearInterval(refreshInterval);
  }, [navigate]);

  const updateLastLogin = async (userId: string) => {
    try {
      await apiClient.from('profiles')
        .eq('id', userId)
        .update({ last_login_date: new Date().toISOString() });
    } catch (error) {
      // Non-critical, don't block auth
      console.error('Failed to update last login:', error);
    }
  };

  const logLoginAttempt = async (email: string, success: boolean, failureReason?: string) => {
    try {
      // TEMPORARY: Disable login attempt logging during AWS migration
      // TODO: Re-implement using authenticated API call after login
      return;

      // await apiClient.post('log-auth-attempt', {
      //   email: email.toLowerCase(),
      //   success,
      //   error_message: failureReason || null
      // });
    } catch (error) {
      // Never block authentication due to logging failures
      console.error('Failed to log auth attempt:', error);
    }
  };

  const checkAccountLockout = async (email: string) => {
    try {
      // TEMPORARY: Disable lockout check during AWS migration
      // The login_attempts table doesn't exist yet and API requires auth
      // TODO: Implement lockout check using Cognito/API Gateway
      return { isLocked: false, minutesRemaining: 0 };

      // const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

      // const { data, error } = await apiClient
      //   .from('login_attempts')
      //   .select('*')
      //   .eq('email', email)
      //   .eq('success', false)
      //   .order('attempt_time', { ascending: false })
      //   .execute();

      // if (error) throw error;

      // // Filter client-side for attempts in last 30 minutes
      // const recentAttempts = data?.filter(attempt =>
      //   new Date(attempt.attempt_time).getTime() >= new Date(thirtyMinutesAgo).getTime()
      // ) || [];

      // if (recentAttempts.length >= 5) {
      //   const oldestFailedAttempt = recentAttempts[recentAttempts.length - 1];
      //   const lockoutEndsAt = new Date(new Date(oldestFailedAttempt.attempt_time).getTime() + 30 * 60 * 1000);
      //   const minutesRemaining = Math.max(0, (lockoutEndsAt.getTime() - Date.now()) / (60 * 1000));

      //   return { isLocked: true, minutesRemaining };
      // }

      // return { isLocked: false, minutesRemaining: 0 };
    } catch (error) {
      console.error('Failed to check lockout:', error);
      return { isLocked: false, minutesRemaining: 0 };
    }
  };

  const signUp = async (email: string, password: string, userData: SignUpData) => {
    try {
      // Note: With Cognito, sign-up is typically done by admins via create-user Lambda
      // Self-registration is disabled for HIPAA compliance
      toast.error('Please contact your administrator to create an account');
      return { error: new Error('Self-registration not allowed') };
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

      const { session: cognitoSession, error } = await cognitoAuth.signIn(email, password);

      if (error) {
        // Handle MFA required
        if (error.message === 'MFA_REQUIRED') {
          setNeedsMFA(true);
          toast.info('Please enter your MFA code');
          return { error: null }; // Not actually an error, just needs MFA
        }

        // Handle password change required
        if (error.message === 'NEW_PASSWORD_REQUIRED') {
          setNeedsPasswordChange(true);
          toast.info('Please set a new password');
          return { error: null };
        }

        // Log failed attempt
        await logLoginAttempt(email, false, error.message);
        throw error;
      }

      // Log successful attempt
      await logLoginAttempt(email, true);

      // Update state
      if (cognitoSession) {
        setSession(cognitoSession);
        setUser(cognitoSession.user);
        setNeedsMFA(false);

        // Update last login
        await updateLastLogin(cognitoSession.user.id);

        // Handle navigation based on role
        await handlePostLoginNavigation(cognitoSession.user);
      }

      return { error: null };
    } catch (error) {
      const err = error as Error;
      toast.error(err.message || 'Failed to sign in');
      return { error: err };
    }
  };

  const verifyMFA = async (code: string) => {
    try {
      const { session: cognitoSession, error } = await cognitoAuth.verifyMFA(code);

      if (error) {
        toast.error('Invalid MFA code');
        return { error };
      }

      if (cognitoSession) {
        setSession(cognitoSession);
        setUser(cognitoSession.user);
        setNeedsMFA(false);

        // Update last login
        await updateLastLogin(cognitoSession.user.id);

        // Handle navigation
        await handlePostLoginNavigation(cognitoSession.user);

        toast.success('Welcome back!');
      }

      return { error: null };
    } catch (error) {
      const err = error as Error;
      toast.error(err.message || 'MFA verification failed');
      return { error: err };
    }
  };

  const setNewPassword = async (newPassword: string, name: string) => {
    try {
      const { session: cognitoSession, error } = await cognitoAuth.setNewPassword(newPassword, { name });

      if (error) {
        toast.error(error.message || 'Failed to set new password');
        return { error };
      }

      if (cognitoSession) {
        setSession(cognitoSession);
        setUser(cognitoSession.user);
        setNeedsPasswordChange(false);

        // Update last login
        await updateLastLogin(cognitoSession.user.id);

        // Handle navigation
        await handlePostLoginNavigation(cognitoSession.user);

        toast.success('Password changed successfully!');
      }

      return { error: null };
    } catch (error) {
      const err = error as Error;
      toast.error(err.message || 'Failed to change password');
      return { error: err };
    }
  };

  const handlePostLoginNavigation = async (cognitoUser: CognitoUser) => {
    try {
      // Get user role from custom attribute
      const role = cognitoUser['custom:role'];

      // TEMPORARY: Disable password expiration check during AWS migration
      // TODO: Re-implement password expiration check using Cognito/API Gateway
      // const { data: profile } = await apiClient
      //   .from('profiles')
      //   .select('last_password_change, created_at, password_requires_change')
      //   .eq('id', cognitoUser.id)
      //   .single();

      // if (profile) {
      //   // Check if password change is explicitly required
      //   if (profile.password_requires_change) {
      //     toast.error('Password change required before continuing');
      //     navigate('/reset-password?required=true');
      //     return;
      //   }

      //   // Calculate days since last password change
      //   const lastChange = profile.last_password_change
      //     ? new Date(profile.last_password_change)
      //     : new Date(profile.created_at);

      //   const daysSinceChange = Math.floor((Date.now() - lastChange.getTime()) / (1000 * 60 * 60 * 24));

      //   // Password expired (>90 days)
      //   if (daysSinceChange > 90) {
      //     toast.error('Your password has expired. Please change it now.');
      //     navigate('/reset-password?expired=true');
      //     return;
      //   }

      //   // Warn if expiring soon (< 7 days)
      //   const daysRemaining = 90 - daysSinceChange;
      //   if (daysRemaining <= 7 && daysRemaining > 0) {
      //     toast.warning(`Your password will expire in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}. Please change it soon.`);
      //   }
      // }

      // Navigate based on role
      if (role === 'client') {
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
    } catch (error) {
      console.error('Post-login navigation error:', error);
      // Fallback to dashboard
      navigate('/dashboard');
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await cognitoAuth.resetPassword(email);

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
      // Get current password from form (Cognito requires it)
      const { error } = await cognitoAuth.changePassword(
        '', // This needs to be passed from the form
        newPassword
      );

      if (error) throw error;

      // Update last_password_change timestamp in database
      if (user) {
        await apiClient
          .from('profiles')
          .eq('id', user.id)
          .update({
            last_password_change: new Date().toISOString(),
            password_requires_change: false
          });
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
      const { error } = await cognitoAuth.signOut();

      if (error) {
        console.error('Sign out error:', error);
      }

      // Clear local state
      setUser(null);
      setSession(null);
      setNeedsMFA(false);
      setNeedsPasswordChange(false);

      toast.success('Signed out successfully');
      navigate('/auth');
    } catch (error) {
      const err = error as Error;
      // Still clear state even if there was an error
      setUser(null);
      setSession(null);
      setNeedsMFA(false);
      setNeedsPasswordChange(false);
      toast.error(err.message || 'Failed to sign out');
      navigate('/auth');
    }
  };

  const updateProfile = async (data: Partial<ProfileData>) => {
    if (!user) return { error: new Error('No user logged in') };

    try {
      const { error } = await apiClient
        .from('profiles')
        .eq('id', user.id)
        .update(data);

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
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        needsMFA,
        needsPasswordChange,
        signUp,
        signIn,
        verifyMFA,
        setNewPassword,
        signOut,
        updateProfile,
        resetPassword,
        updatePassword
      }}
    >
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
