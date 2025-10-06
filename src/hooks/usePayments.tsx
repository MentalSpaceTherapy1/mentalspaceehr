import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AppliedPayment {
  chargeId: string;
  amountApplied: number;
  serviceDate: string;
  cptCode: string;
}

export interface Adjustment {
  adjustmentAmount: number;
  adjustmentReason: string;
  adjustmentCode?: string;
}

export interface PaymentRecord {
  id: string;
  payment_id: string;
  client_id: string;
  payment_date: string;
  payment_amount: number;
  payment_source: 'Insurance' | 'Client' | 'Guarantor' | 'Third Party';
  payment_method: 'Check' | 'Credit Card' | 'Debit Card' | 'Cash' | 'ACH' | 'EFT' | 'Portal Payment';
  check_number?: string;
  card_last_4?: string;
  transaction_id?: string;
  applied_payments: AppliedPayment[];
  eob_date?: string;
  eob_attachment?: string;
  claim_number?: string;
  adjustments: Adjustment[];
  overpayment_amount: number;
  refund_issued: boolean;
  refund_date?: string;
  refund_amount?: number;
  unapplied_amount: number;
  deposit_id?: string;
  deposit_date?: string;
  payment_status: 'Posted' | 'Pending' | 'Reversed' | 'Refunded';
  posted_by?: string;
  posted_date: string;
  notes?: string;
  created_date: string;
  client?: {
    id: string;
    first_name: string;
    last_name: string;
    medical_record_number: string;
  };
}

export function usePayments(clientId?: string) {
  const queryClient = useQueryClient();

  // Fetch payments
  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['payments', clientId],
    queryFn: async () => {
      let query = supabase
        .from('payment_records')
        .select(`
          *,
          client:clients(id, first_name, last_name, medical_record_number)
        `)
        .order('payment_date', { ascending: false });

      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as any;
    },
  });

  // Generate payment ID
  const generatePaymentId = async (): Promise<string> => {
    const { data, error } = await supabase.rpc('generate_payment_id' as any);
    if (error) throw error;
    return data as string;
  };

  // Create payment
  const createPayment = useMutation({
    mutationFn: async (payment: Partial<PaymentRecord>) => {
      const paymentId = await generatePaymentId();
      
      const { data, error } = await supabase
        .from('payment_records')
        .insert({
          ...payment,
          payment_id: paymentId,
          posted_by: (await supabase.auth.getUser()).data.user?.id,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      toast.success('Payment posted successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to post payment: ' + error.message);
    },
  });

  // Update payment
  const updatePayment = useMutation({
    mutationFn: async ({ id, ...payment }: Partial<PaymentRecord> & { id: string }) => {
      const { data, error } = await supabase
        .from('payment_records')
        .update(payment as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      toast.success('Payment updated successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to update payment: ' + error.message);
    },
  });

  // Reverse payment
  const reversePayment = useMutation({
    mutationFn: async (paymentId: string) => {
      const { data, error } = await supabase
        .from('payment_records')
        .update({ payment_status: 'Reversed' })
        .eq('id', paymentId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      toast.success('Payment reversed successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to reverse payment: ' + error.message);
    },
  });

  // Issue refund
  const issueRefund = useMutation({
    mutationFn: async ({ 
      paymentId, 
      refundAmount,
      refundDate 
    }: { 
      paymentId: string; 
      refundAmount: number;
      refundDate: string;
    }) => {
      const { data, error } = await supabase
        .from('payment_records')
        .update({
          refund_issued: true,
          refund_amount: refundAmount,
          refund_date: refundDate,
          payment_status: 'Refunded',
        })
        .eq('id', paymentId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      toast.success('Refund issued successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to issue refund: ' + error.message);
    },
  });

  return {
    payments,
    isLoading,
    createPayment,
    updatePayment,
    reversePayment,
    issueRefund,
  };
}
