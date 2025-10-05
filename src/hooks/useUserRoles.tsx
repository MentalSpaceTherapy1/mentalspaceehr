import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type AppRole = 'administrator' | 'supervisor' | 'therapist' | 'billing_staff' | 'front_desk' | 'associate_trainee' | 'client_user';

export const useUserRoles = (userId?: string) => {
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchRoles = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId);

        if (error) throw error;
        setRoles(data?.map(r => r.role as AppRole) || []);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch roles'));
      } finally {
        setLoading(false);
      }
    };

    fetchRoles();

    // Subscribe to role changes
    const channel = supabase
      .channel(`user_roles_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_roles',
          filter: `user_id=eq.${userId}`
        },
        () => {
          fetchRoles();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return { roles, loading, error };
};

export const useCurrentUserRoles = () => {
  const { user } = useAuth();
  return useUserRoles(user?.id);
};
