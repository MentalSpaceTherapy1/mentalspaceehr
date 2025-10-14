import { AppRole } from '@/hooks/useUserRoles';

export const assignRole = async (userId: string, role: AppRole, assignedBy: string) => {
  // HARDCODED for now to bypass environment variable caching issues
  const apiEndpoint = 'https://cyf1w472y8.execute-api.us-east-1.amazonaws.com';

  console.log('[assignRole] Assigning role:', { userId, role, assignedBy });

  try {
    const response = await fetch(`${apiEndpoint}/users/role`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ user_id: userId, role, assigned_by: assignedBy }),
    });

    console.log('[assignRole] Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[assignRole] Error response:', errorText);
      throw new Error(`Failed to assign role: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('[assignRole] Result:', result);
    return result;
  } catch (error) {
    console.error('[assignRole] Caught error:', error);
    throw error;
  }
};

export const removeRole = async (userId: string, role: AppRole) => {
  // For now, removing a role means setting it to null/empty
  // We'll treat this as assigning no role (empty string or null)
  const apiEndpoint = 'https://cyf1w472y8.execute-api.us-east-1.amazonaws.com';

  console.log('[removeRole] Removing role:', { userId, role });

  try {
    const response = await fetch(`${apiEndpoint}/users/role`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ user_id: userId, role: null, assigned_by: userId }),
    });

    console.log('[removeRole] Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[removeRole] Error response:', errorText);
      throw new Error(`Failed to remove role: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('[removeRole] Result:', result);
    return result;
  } catch (error) {
    console.error('[removeRole] Caught error:', error);
    throw error;
  }
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
