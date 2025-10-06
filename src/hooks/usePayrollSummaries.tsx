import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SessionBreakdown {
  individual: { count: number; hours: number };
  couples: { count: number; hours: number };
  family: { count: number; hours: number };
  group: { count: number; hours: number };
  evaluation: { count: number; hours: number };
}

export interface PayrollSummary {
  id: string;
  clinician_id: string;
  payroll_period_id: string;
  period_start_date: string;
  period_end_date: string;
  total_sessions: number;
  total_hours: number;
  session_breakdown: SessionBreakdown;
  total_earnings: number;
  bonuses?: number;
  deductions?: number;
  net_earnings: number;
  status: 'Draft' | 'Pending Approval' | 'Approved' | 'Paid';
  approved_by?: string;
  approved_date?: string;
  paid_date?: string;
  payment_method: 'Check' | 'Direct Deposit' | 'Other';
  check_number?: string;
  generated_date: string;
}

export function usePayrollSummaries(clinicianId?: string) {
  const queryClient = useQueryClient();

  const { data: summaries = [], isLoading } = useQuery({
    queryKey: ['payroll-summaries', clinicianId],
    queryFn: async () => {
      let query = supabase
        .from('payroll_summaries')
        .select('*')
        .order('period_start_date', { ascending: false });

      if (clinicianId) {
        query = query.eq('clinician_id', clinicianId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []).map(d => ({
        ...d,
        session_breakdown: d.session_breakdown as unknown as SessionBreakdown
      })) as PayrollSummary[];
    },
  });

  const createSummary = useMutation({
    mutationFn: async (summary: Omit<PayrollSummary, 'id' | 'generated_date'>) => {
      const { data, error } = await supabase
        .from('payroll_summaries')
        .insert([{
          ...summary,
          session_breakdown: summary.session_breakdown as any
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-summaries'] });
      toast.success('Payroll summary created successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to create payroll summary: ' + error.message);
    },
  });

  const updateSummary = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PayrollSummary> & { id: string }) => {
      const updateData: any = { ...updates };
      if (updateData.session_breakdown) {
        updateData.session_breakdown = updateData.session_breakdown as any;
      }

      const { data, error } = await supabase
        .from('payroll_summaries')
        .update(updateData as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-summaries'] });
      toast.success('Payroll summary updated successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to update payroll summary: ' + error.message);
    },
  });

  const approveSummary = useMutation({
    mutationFn: async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('payroll_summaries')
        .update({
          status: 'Approved',
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
      queryClient.invalidateQueries({ queryKey: ['payroll-summaries'] });
      toast.success('Payroll summary approved');
    },
    onError: (error: any) => {
      toast.error('Failed to approve summary: ' + error.message);
    },
  });

  const markAsPaid = useMutation({
    mutationFn: async ({ id, paymentDate, checkNumber }: { id: string; paymentDate: string; checkNumber?: string }) => {
      const { data, error } = await supabase
        .from('payroll_summaries')
        .update({
          status: 'Paid',
          paid_date: paymentDate,
          check_number: checkNumber
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-summaries'] });
      toast.success('Payroll marked as paid');
    },
    onError: (error: any) => {
      toast.error('Failed to mark as paid: ' + error.message);
    },
  });

  return {
    summaries,
    isLoading,
    createSummary: createSummary.mutate,
    updateSummary: updateSummary.mutate,
    approveSummary: approveSummary.mutate,
    markAsPaid: markAsPaid.mutate,
    isCreating: createSummary.isPending,
    isUpdating: updateSummary.isPending,
    isApproving: approveSummary.isPending,
    isMarkingPaid: markAsPaid.isPending,
  };
}
