export const toggleUserActive = async (userId: string, isActive: boolean) => {
  // HARDCODED for now to bypass environment variable caching issues
  const apiEndpoint = 'https://cyf1w472y8.execute-api.us-east-1.amazonaws.com';

  console.log('[toggleUserActive] Toggling active status:', { userId, isActive });

  try {
    const response = await fetch(`${apiEndpoint}/users/toggle-active`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ user_id: userId, is_active: isActive }),
    });

    console.log('[toggleUserActive] Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[toggleUserActive] Error response:', errorText);
      throw new Error(`Failed to toggle user active status: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('[toggleUserActive] Result:', result);
    return result;
  } catch (error) {
    console.error('[toggleUserActive] Caught error:', error);
    throw error;
  }
};
