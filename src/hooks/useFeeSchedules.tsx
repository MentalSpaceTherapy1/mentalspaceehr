import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface FeeScheduleFee {
  cptCode: string;
  cptDescription: string;
  fee: number;
  units?: number;
  modifiers?: Array<{
    modifier: string;
    feeAdjustment: number;
  }>;
}

export interface FeeSchedule {
  id: string;
  schedule_name: string;
  schedule_type: 'Standard' | 'Insurance Contract' | 'Sliding Scale' | 'Custom';
  effective_date: string;
  end_date?: string;
  insurance_company_id?: string;
  insurance_company_name?: string;
  contract_number?: string;
  fees: FeeScheduleFee[];
  is_default_schedule: boolean;
  applicable_to: 'All Clients' | 'Specific Insurance' | 'Self-Pay' | 'Specific Group';
  created_date: string;
  created_by?: string;
}

export function useFeeSchedules() {
  const queryClient = useQueryClient();

  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ['fee-schedules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fee_schedules')
        .select('*')
        .order('effective_date', { ascending: false });

      if (error) throw error;
      return (data || []).map(d => ({
        ...d,
        fees: d.fees as unknown as FeeScheduleFee[]
      })) as FeeSchedule[];
    },
  });

  const createSchedule = useMutation({
    mutationFn: async (schedule: Omit<FeeSchedule, 'id' | 'created_date' | 'created_by'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('fee_schedules')
        .insert([{
          ...schedule,
          fees: schedule.fees as any,
          created_by: user?.id
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fee-schedules'] });
      toast.success('Fee schedule created successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to create fee schedule: ' + error.message);
    },
  });

  const updateSchedule = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<FeeSchedule> & { id: string }) => {
      const updateData: any = { ...updates };
      if (updateData.fees) {
        updateData.fees = updateData.fees as any;
      }
      
      const { data, error } = await supabase
        .from('fee_schedules')
        .update(updateData as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fee-schedules'] });
      toast.success('Fee schedule updated successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to update fee schedule: ' + error.message);
    },
  });

  const deleteSchedule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('fee_schedules')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fee-schedules'] });
      toast.success('Fee schedule deleted successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to delete fee schedule: ' + error.message);
    },
  });

  return {
    schedules,
    isLoading,
    createSchedule: createSchedule.mutate,
    updateSchedule: updateSchedule.mutate,
    deleteSchedule: deleteSchedule.mutate,
    isCreating: createSchedule.isPending,
    isUpdating: updateSchedule.isPending,
    isDeleting: deleteSchedule.isPending,
  };
}
