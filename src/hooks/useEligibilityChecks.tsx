import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CoverageDetails {
  mentalHealthCovered: boolean;
  effectiveDate: string;
  terminationDate?: string;
  deductible: {
    individual: number;
    family: number;
    individualMet: number;
    familyMet: number;
    individualRemaining: number;
    familyRemaining: number;
  };
  outOfPocketMax: {
    individual: number;
    family: number;
    individualMet: number;
    familyMet: number;
    individualRemaining: number;
    familyRemaining: number;
  };
  copay: number;
  coinsurance: number;
  priorAuthRequired: boolean;
  referralRequired: boolean;
  coverageLimits: {
    sessionsPerYear: number;
    sessionsRemaining: number;
    dollarsPerYear?: number;
    dollarsRemaining?: number;
  };
}

export interface EligibilityCheck {
  id: string;
  client_id: string;
  insurance_id: string;
  check_date: string;
  check_performed_by?: string;
  service_date: string;
  service_type: string;
  eligibility_status: 'Active' | 'Inactive' | 'Pending' | 'Unknown';
  coverage_details: CoverageDetails;
  provider_in_network: boolean;
  provider_npi?: string;
  errors?: string[];
  warning_messages?: string[];
  source: 'Manual' | 'API' | 'Phone' | 'Portal';
  valid_until: string;
  created_date: string;
}

export function useEligibilityChecks(clientId?: string) {
  const queryClient = useQueryClient();

  const { data: checks = [], isLoading } = useQuery({
    queryKey: ['eligibility-checks', clientId],
    queryFn: async () => {
      let query = supabase
        .from('eligibility_checks')
        .select('*')
        .order('check_date', { ascending: false });

      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []).map(d => ({
        ...d,
        coverage_details: d.coverage_details as unknown as CoverageDetails,
        errors: d.errors as unknown as string[],
        warning_messages: d.warning_messages as unknown as string[]
      })) as EligibilityCheck[];
    },
  });

  const createCheck = useMutation({
    mutationFn: async (check: Omit<EligibilityCheck, 'id' | 'created_date' | 'check_performed_by'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('eligibility_checks')
        .insert([{
          ...check,
          coverage_details: check.coverage_details as any,
          errors: check.errors as any,
          warning_messages: check.warning_messages as any,
          check_performed_by: user?.id
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eligibility-checks'] });
      toast.success('Eligibility check created successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to create eligibility check: ' + error.message);
    },
  });

  const updateCheck = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<EligibilityCheck> & { id: string }) => {
      const updateData: any = { ...updates };
      if (updateData.coverage_details) {
        updateData.coverage_details = updateData.coverage_details as any;
      }
      if (updateData.errors) {
        updateData.errors = updateData.errors as any;
      }
      if (updateData.warning_messages) {
        updateData.warning_messages = updateData.warning_messages as any;
      }
      
      const { data, error } = await supabase
        .from('eligibility_checks')
        .update(updateData as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eligibility-checks'] });
      toast.success('Eligibility check updated successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to update eligibility check: ' + error.message);
    },
  });

  return {
    checks,
    isLoading,
    createCheck: createCheck.mutate,
    updateCheck: updateCheck.mutate,
    isCreating: createCheck.isPending,
    isUpdating: updateCheck.isPending,
  };
}
