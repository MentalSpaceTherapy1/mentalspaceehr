import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PayrollSession {
  id: string;
  clinician_id: string;
  session_date: string;
  session_start_time: string;
  session_end_time: string;
  session_duration: number;
  client_id: string;
  appointment_id?: string;
  session_type: 'Individual' | 'Couples' | 'Family' | 'Group' | 'Evaluation' | 'Other';
  payroll_rate: number;
  payroll_amount: number;
  is_salaried: boolean;
  count_toward_productivity: boolean;
  session_completed: boolean;
  note_completed: boolean;
  note_signed: boolean;
  approved_for_payroll: boolean;
  approved_date?: string;
  approved_by?: string;
  billed_amount?: number;
  paid_amount?: number;
  payroll_period_id?: string;
  payroll_period_start_date: string;
  payroll_period_end_date: string;
  paid: boolean;
  payment_date?: string;
  payment_check_number?: string;
  notes?: string;
  created_date: string;
}

export function usePayrollSessions(clinicianId?: string) {
  const queryClient = useQueryClient();

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['payroll-sessions', clinicianId],
    queryFn: async () => {
      let query = supabase
        .from('payroll_sessions')
        .select('*')
        .order('session_date', { ascending: false });

      if (clinicianId) {
        query = query.eq('clinician_id', clinicianId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as PayrollSession[];
    },
  });

  const createSession = useMutation({
    mutationFn: async (session: Omit<PayrollSession, 'id' | 'created_date'>) => {
      const { data, error } = await supabase
        .from('payroll_sessions')
        .insert([session])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-sessions'] });
      toast.success('Payroll session created successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to create payroll session: ' + error.message);
    },
  });

  const updateSession = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PayrollSession> & { id: string }) => {
      const { data, error } = await supabase
        .from('payroll_sessions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-sessions'] });
      toast.success('Payroll session updated successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to update payroll session: ' + error.message);
    },
  });

  const approveSession = useMutation({
    mutationFn: async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('payroll_sessions')
        .update({
          approved_for_payroll: true,
          approved_date: new Date().toISOString().split('T')[0],
          approved_by: user?.id
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-sessions'] });
      toast.success('Session approved for payroll');
    },
    onError: (error: any) => {
      toast.error('Failed to approve session: ' + error.message);
    },
  });

  return {
    sessions,
    isLoading,
    createSession: createSession.mutate,
    updateSession: updateSession.mutate,
    approveSession: approveSession.mutate,
    isCreating: createSession.isPending,
    isUpdating: updateSession.isPending,
    isApproving: approveSession.isPending,
  };
}
