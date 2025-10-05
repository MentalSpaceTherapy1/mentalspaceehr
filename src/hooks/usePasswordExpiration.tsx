import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { differenceInDays } from 'date-fns';

const PASSWORD_EXPIRATION_DAYS = 90;
const WARNING_DAYS_BEFORE_EXPIRATION = 7;

export function usePasswordExpiration() {
  const { user } = useAuth();
  const [daysUntilExpiration, setDaysUntilExpiration] = useState<number | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const checkExpiration = async () => {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('last_password_change')
          .eq('id', user.id)
          .single();

        if (!profile?.last_password_change) {
          // No password change recorded - set to account creation date
          const accountCreated = new Date(user.created_at);
          await supabase
            .from('profiles')
            .update({ last_password_change: accountCreated.toISOString() })
            .eq('id', user.id);

          const daysSinceCreation = differenceInDays(new Date(), accountCreated);
          const daysLeft = PASSWORD_EXPIRATION_DAYS - daysSinceCreation;

          setDaysUntilExpiration(daysLeft);
          setIsExpired(daysLeft <= 0);
          setShowWarning(daysLeft <= WARNING_DAYS_BEFORE_EXPIRATION && daysLeft > 0);
        } else {
          const lastChange = new Date(profile.last_password_change);
          const daysSinceChange = differenceInDays(new Date(), lastChange);
          const daysLeft = PASSWORD_EXPIRATION_DAYS - daysSinceChange;

          setDaysUntilExpiration(daysLeft);
          setIsExpired(daysLeft <= 0);
          setShowWarning(daysLeft <= WARNING_DAYS_BEFORE_EXPIRATION && daysLeft > 0);
        }
      } catch (error) {
        console.error('Error checking password expiration:', error);
      } finally {
        setLoading(false);
      }
    };

    checkExpiration();

    // Check daily
    const interval = setInterval(checkExpiration, 24 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user]);

  return { daysUntilExpiration, isExpired, showWarning, loading };
}
