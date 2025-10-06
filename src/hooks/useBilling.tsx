import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useBilling() {
  const queryClient = useQueryClient();

  // Fetch charge entries with client info
  const { data: charges = [], isLoading: chargesLoading } = useQuery({
    queryKey: ['billing-charges'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('charge_entries')
        .select(`
          *,
          client:clients(id, first_name, last_name, medical_record_number)
        `)
        .order('service_date', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch insurance claims (new structure)
  const { data: claims = [], isLoading: claimsLoading } = useQuery({
    queryKey: ['billing-claims'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('insurance_claims')
        .select('*')
        .order('claim_created_date', { ascending: false});

      if (error) throw error;
      return data || [];
    },
  });

  // Create charge entry
  const createCharge = useMutation({
    mutationFn: async (charge: any) => {
      const { data, error } = await supabase
        .from('charge_entries')
        .insert([charge])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-charges'] });
      toast.success('Charge entry created successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to create charge: ' + error.message);
    },
  });

  // Update charge entry
  const updateCharge = useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { data, error } = await supabase
        .from('charge_entries')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-charges'] });
      toast.success('Charge entry updated successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to update charge: ' + error.message);
    },
  });

  // Delete charge entry
  const deleteCharge = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('charge_entries')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-charges'] });
      toast.success('Charge entry deleted successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to delete charge: ' + error.message);
    },
  });

  return {
    charges,
    claims,
    isLoading: chargesLoading || claimsLoading,
    createCharge: createCharge.mutate,
    updateCharge: updateCharge.mutate,
    deleteCharge: deleteCharge.mutate,
    isCreating: createCharge.isPending,
    isUpdating: updateCharge.isPending,
    isDeleting: deleteCharge.isPending,
  };
}
