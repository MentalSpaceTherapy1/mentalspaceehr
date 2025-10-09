import { useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useToast } from './use-toast';
import { differenceInDays } from 'date-fns';

export const usePasswordExpiration = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isExpired, setIsExpired] = useState(false);
  const [daysUntilExpiration, setDaysUntilExpiration] = useState<number | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    checkPasswordExpiration();
  }, [user]);

  const checkPasswordExpiration = async () => {
    try {
      // Get user's profile
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('last_password_change, created_at, password_requires_change')
        .eq('id', user!.id)
        .single();

      if (error) throw error;

      // Check if password change is explicitly required
      if (profile.password_requires_change) {
        setIsExpired(true);
        toast({
          title: 'Password Change Required',
          description: 'You must change your password before continuing.',
          variant: 'destructive',
        });
        navigate('/reset-password?required=true');
        return;
      }

      // Calculate days since last password change
      const lastChange = profile.last_password_change 
        ? new Date(profile.last_password_change)
        : new Date(profile.created_at);
      
      const daysSinceChange = differenceInDays(new Date(), lastChange);
      const daysRemaining = 90 - daysSinceChange;

      setDaysUntilExpiration(daysRemaining);

      // Password expired (>90 days)
      if (daysSinceChange > 90) {
        setIsExpired(true);
        toast({
          title: 'Password Expired',
          description: 'Your password has expired. Please change it now.',
          variant: 'destructive',
        });
        navigate('/reset-password?expired=true');
        return;
      }

      // Warn if expiring soon (< 7 days)
      const shouldShowWarning = daysRemaining <= 7 && daysRemaining > 0;
      if (shouldShowWarning) {
        toast({
          title: 'Password Expiring Soon',
          description: `Your password will expire in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}. Please change it soon.`,
          variant: 'default',
        });
      }

      setLoading(false);
    } catch (error) {
      console.error('Error checking password expiration:', error);
      setLoading(false);
    }
  };

  return {
    loading,
    isExpired,
    daysUntilExpiration,
    showWarning: daysUntilExpiration !== null && daysUntilExpiration <= 7 && daysUntilExpiration > 0,
    checkPasswordExpiration
  };
};
