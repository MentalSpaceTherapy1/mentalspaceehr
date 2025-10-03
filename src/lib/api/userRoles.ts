import { supabase } from '@/integrations/supabase/client';
import { AppRole } from '@/hooks/useUserRoles';

export const assignRole = async (userId: string, role: AppRole, assignedBy: string) => {
  const { error } = await supabase
    .from('user_roles')
    .insert({ user_id: userId, role, assigned_by: assignedBy });

  if (error) throw error;
};

export const removeRole = async (userId: string, role: AppRole) => {
  const { error } = await supabase
    .from('user_roles')
    .delete()
    .eq('user_id', userId)
    .eq('role', role);

  if (error) throw error;
};

export const getUserRoles = async (userId: string): Promise<AppRole[]> => {
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId);

  if (error) throw error;
  return data?.map(r => r.role as AppRole) || [];
};

export const getAllUsersWithRoles = async () => {
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, email, first_name, last_name, is_active, last_login_date')
    .order('last_name');

  if (profilesError) throw profilesError;

  const { data: userRoles, error: rolesError } = await supabase
    .from('user_roles')
    .select('user_id, role');

  if (rolesError) throw rolesError;

  return profiles.map(profile => ({
    ...profile,
    roles: userRoles
      ?.filter(ur => ur.user_id === profile.id)
      .map(ur => ur.role as AppRole) || []
  }));
};

export const checkIsLastAdmin = async (userId: string): Promise<boolean> => {
  const { data, error } = await supabase
    .from('user_roles')
    .select('user_id')
    .eq('role', 'administrator');

  if (error) throw error;
  
  const adminCount = data?.length || 0;
  const isThisUserAdmin = data?.some(r => r.user_id === userId);
  
  return adminCount === 1 && isThisUserAdmin;
};
