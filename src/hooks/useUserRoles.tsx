import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/aws-api-client';
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
        console.log('[useUserRoles] Fetching roles for user:', userId);

        // Direct API call to get-user-roles endpoint
        const response = await apiClient.get(`get-user-roles?user_id=${userId}`);

        console.log('[useUserRoles] Response:', response);

        if (response.error) {
          throw response.error;
        }

        const rolesData = response.data as { roles?: AppRole[] };
        setRoles(rolesData?.roles || []);

        console.log('[useUserRoles] Roles set:', rolesData?.roles);
      } catch (err) {
        console.error('[useUserRoles] Error fetching roles:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch roles'));
        // Fallback: if error, assume no roles
        setRoles([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRoles();

    // Note: Real-time subscriptions will need to be implemented with WebSocket API
    // For now, we'll poll or rely on page refreshes
  }, [userId]);

  return { roles, loading, error };
};

export const useCurrentUserRoles = () => {
  const { user } = useAuth();
  return useUserRoles(user?.id);
};
