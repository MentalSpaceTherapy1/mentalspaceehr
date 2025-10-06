import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface InsuranceClaim {
  id: string;
  claim_id: string;
  client_id: string;
  claim_type: 'Primary' | 'Secondary' | 'Tertiary';
  claim_status: 'Draft' | 'Ready to Bill' | 'Submitted' | 'Accepted' | 'Rejected' | 'Paid' | 'Denied' | 'Pending';
  claim_created_date: string;
  claim_submitted_date?: string;
  claim_received_date?: string;
  claim_processed_date?: string;
  claim_paid_date?: string;
  payer_id: string;
  payer_name: string;
  payer_address?: any;
  billing_provider_id: string;
  billing_provider_npi: string;
  billing_provider_tax_id: string;
  total_charge_amount: number;
  diagnoses: any[];
  prior_auth_required: boolean;
  prior_auth_number?: string;
  clearinghouse_id?: string;
  claim_control_number?: string;
  payer_claim_number?: string;
  submission_method?: 'Electronic' | 'Paper' | 'Portal';
  batch_id?: string;
  allowed_amount?: number;
  paid_amount?: number;
  adjustment_amount?: number;
  deductible_amount?: number;
  coinsurance_amount?: number;
  copay_amount?: number;
  client_responsibility?: number;
  era_received: boolean;
  era_date?: string;
  eob_received: boolean;
  eob_date?: string;
  check_number?: string;
  check_amount?: number;
  check_date?: string;
  denial_codes?: string[];
  denial_reasons?: string[];
  appeal_required: boolean;
  appeal_deadline?: string;
  appeal_filed: boolean;
  appeal_date?: string;
  appeal_outcome?: 'Approved' | 'Denied' | 'Pending';
  corrected_claim_id?: string;
  original_claim_id?: string;
  billing_notes?: string;
  created_date: string;
  created_by?: string;
  last_modified: string;
  last_modified_by?: string;
}

export function useInsuranceClaims() {
  const queryClient = useQueryClient();

  const { data: claims, isLoading } = useQuery({
    queryKey: ['insurance-claims'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('insurance_claims')
        .select('*')
        .order('created_date', { ascending: false });

      if (error) throw error;
      return data as InsuranceClaim[];
    },
  });

  const createClaim = useMutation({
    mutationFn: async (claim: any) => {
      const { data, error } = await supabase
        .from('insurance_claims')
        .insert([claim])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insurance-claims'] });
      toast.success('Insurance claim created successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to create claim: ' + error.message);
    },
  });

  const updateClaim = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<InsuranceClaim> & { id: string }) => {
      const { data, error } = await supabase
        .from('insurance_claims')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insurance-claims'] });
      toast.success('Insurance claim updated successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to update claim: ' + error.message);
    },
  });

  const deleteClaim = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('insurance_claims')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insurance-claims'] });
      toast.success('Insurance claim deleted successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to delete claim: ' + error.message);
    },
  });

  return {
    claims,
    isLoading,
    createClaim: createClaim.mutate,
    updateClaim: updateClaim.mutate,
    deleteClaim: deleteClaim.mutate,
    isCreating: createClaim.isPending,
    isUpdating: updateClaim.isPending,
    isDeleting: deleteClaim.isPending,
  };
}
