import { supabase } from '@/integrations/supabase/client';

export const toggleUserActive = async (userId: string, isActive: boolean) => {
  const { error } = await supabase
    .from('profiles')
    .update({ is_active: isActive })
    .eq('id', userId);

  if (error) throw error;
};
