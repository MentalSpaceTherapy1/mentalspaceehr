import { AppRole } from '@/hooks/useUserRoles';

export const assignRole = async (userId: string, role: AppRole, assignedBy: string) => {
  // TODO: Implement AWS API call for assigning roles
  console.log('[assignRole] TODO: Implement AWS API', { userId, role, assignedBy });
  throw new Error('Role assignment not yet implemented with AWS');
};

export const removeRole = async (userId: string, role: AppRole) => {
  // TODO: Implement AWS API call for removing roles
  console.log('[removeRole] TODO: Implement AWS API', { userId, role });
  throw new Error('Role removal not yet implemented with AWS');
};

export const getUserRoles = async (userId: string): Promise<AppRole[]> => {
  // TODO: Implement AWS API call for getting user roles
  console.log('[getUserRoles] TODO: Implement AWS API', { userId });
  return [];
};

export const getAllUsersWithRoles = async () => {
  // HARDCODED for now to bypass environment variable caching issues
  const apiEndpoint = 'https://cyf1w472y8.execute-api.us-east-1.amazonaws.com';

  console.log('[getAllUsersWithRoles] HARDCODED URL - Fetching from:', `${apiEndpoint}/users`);
  console.log('[getAllUsersWithRoles] env value was:', import.meta.env.VITE_API_ENDPOINT);

  try {
    const response = await fetch(`${apiEndpoint}/users`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('[getAllUsersWithRoles] Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[getAllUsersWithRoles] Error response:', errorText);
      throw new Error(`Failed to fetch users: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('[getAllUsersWithRoles] Result:', result);
    return result.data || [];
  } catch (error) {
    console.error('[getAllUsersWithRoles] Caught error:', error);
    throw error;
  }
};

export const checkIsLastAdmin = async (userId: string): Promise<boolean> => {
  // TODO: Implement AWS API call for checking last admin
  console.log('[checkIsLastAdmin] TODO: Implement AWS API', { userId });
  return false;
};
