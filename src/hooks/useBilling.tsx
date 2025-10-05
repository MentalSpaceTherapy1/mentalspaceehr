import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ChargeEntry {
  id: string;
  clientId: string;
  appointmentId?: string;
  noteId?: string;
  serviceDate: string;
  providerId: string;
  supervisingProviderId?: string;
  cptCode: string;
  cptDescription: string;
  modifiers?: string[];
  units: number;
  diagnosisCodes: Array<{
    icdCode: string;
    diagnosisDescription: string;
    pointerOrder: number;
  }>;
  placeOfService: string;
  locationId?: string;
  chargeAmount: number;
  allowedAmount?: number;
  adjustmentAmount: number;
  paymentAmount: number;
  clientResponsibility: number;
  primaryInsuranceId?: string;
  secondaryInsuranceId?: string;
  chargeStatus: 'Unbilled' | 'Billed' | 'Paid' | 'Partially Paid' | 'Denied' | 'Write-off';
  claimId?: string;
  claimStatus?: string;
  billedDate?: string;
  denialCode?: string;
  denialReason?: string;
  appealFiled: boolean;
  appealDate?: string;
  writeOffAmount?: number;
  writeOffReason?: string;
  writeOffDate?: string;
  createdDate: string;
  createdBy?: string;
}

export interface InsuranceClaim {
  id: string;
  claimNumber: string;
  clientId: string;
  primaryInsuranceId: string;
  secondaryInsuranceId?: string;
  renderingProviderId: string;
  billingProviderId: string;
  supervisingProviderId?: string;
  serviceDateFrom: string;
  serviceDateTo: string;
  claimDate: string;
  totalChargeAmount: number;
  totalAllowedAmount?: number;
  totalPaidAmount: number;
  totalAdjustmentAmount: number;
  patientResponsibility: number;
  claimStatus: 'Draft' | 'Ready to Submit' | 'Submitted' | 'Accepted' | 'Rejected' | 'Paid' | 'Partially Paid' | 'Denied' | 'Appeal';
  submissionMethod: string;
  submittedDate?: string;
  submittedBy?: string;
  denialCode?: string;
  denialReason?: string;
  notes?: string;
  createdAt: string;
}

export const useBilling = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch charges
  const { data: charges = [], isLoading: chargesLoading } = useQuery({
    queryKey: ['charge-entries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('charge_entries')
        .select(`
          *,
          client:clients(first_name, last_name, medical_record_number),
          provider:profiles!charge_entries_provider_id_fkey(first_name, last_name)
        `)
        .order('service_date', { ascending: false });

      if (error) throw error;

      return (data || []).map(charge => ({
        id: charge.id,
        clientId: charge.client_id,
        appointmentId: charge.appointment_id,
        noteId: charge.note_id,
        serviceDate: charge.service_date,
        providerId: charge.provider_id,
        supervisingProviderId: charge.supervising_provider_id,
        cptCode: charge.cpt_code,
        cptDescription: charge.cpt_description,
        modifiers: charge.modifiers,
        units: charge.units,
        diagnosisCodes: charge.diagnosis_codes,
        placeOfService: charge.place_of_service,
        locationId: charge.location_id,
        chargeAmount: Number(charge.charge_amount),
        allowedAmount: charge.allowed_amount ? Number(charge.allowed_amount) : undefined,
        adjustmentAmount: Number(charge.adjustment_amount),
        paymentAmount: Number(charge.payment_amount),
        clientResponsibility: Number(charge.client_responsibility),
        primaryInsuranceId: charge.primary_insurance_id,
        secondaryInsuranceId: charge.secondary_insurance_id,
        chargeStatus: charge.charge_status,
        claimId: charge.claim_id,
        claimStatus: charge.claim_status,
        billedDate: charge.billed_date,
        denialCode: charge.denial_code,
        denialReason: charge.denial_reason,
        appealFiled: charge.appeal_filed,
        appealDate: charge.appeal_date,
        writeOffAmount: charge.write_off_amount ? Number(charge.write_off_amount) : undefined,
        writeOffReason: charge.write_off_reason,
        writeOffDate: charge.write_off_date,
        createdDate: charge.created_date,
        createdBy: charge.created_by,
        client: charge.client,
        provider: charge.provider,
      }));
    },
  });

  // Fetch claims
  const { data: claims = [], isLoading: claimsLoading } = useQuery({
    queryKey: ['insurance-claims'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('insurance_claims')
        .select(`
          *,
          client:clients(first_name, last_name, medical_record_number),
          rendering_provider:profiles!insurance_claims_rendering_provider_id_fkey(first_name, last_name)
        `)
        .order('claim_date', { ascending: false });

      if (error) throw error;

      return (data || []).map(claim => ({
        id: claim.id,
        claimNumber: claim.claim_number,
        clientId: claim.client_id,
        primaryInsuranceId: claim.primary_insurance_id,
        secondaryInsuranceId: claim.secondary_insurance_id,
        renderingProviderId: claim.rendering_provider_id,
        billingProviderId: claim.billing_provider_id,
        supervisingProviderId: claim.supervising_provider_id,
        serviceDateFrom: claim.service_date_from,
        serviceDateTo: claim.service_date_to,
        claimDate: claim.claim_date,
        totalChargeAmount: Number(claim.total_charge_amount),
        totalAllowedAmount: claim.total_allowed_amount ? Number(claim.total_allowed_amount) : undefined,
        totalPaidAmount: Number(claim.total_paid_amount),
        totalAdjustmentAmount: Number(claim.total_adjustment_amount),
        patientResponsibility: Number(claim.patient_responsibility),
        claimStatus: claim.claim_status,
        submissionMethod: claim.submission_method,
        submittedDate: claim.submitted_date,
        submittedBy: claim.submitted_by,
        denialCode: claim.denial_code,
        denialReason: claim.denial_reason,
        notes: claim.notes,
        createdAt: claim.created_at,
        client: claim.client,
        renderingProvider: claim.rendering_provider,
      }));
    },
  });

  // Create charge mutation
  const createCharge = useMutation({
    mutationFn: async (charge: Partial<ChargeEntry>) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('charge_entries')
        .insert({
          client_id: charge.clientId,
          appointment_id: charge.appointmentId,
          note_id: charge.noteId,
          service_date: charge.serviceDate,
          provider_id: charge.providerId,
          supervising_provider_id: charge.supervisingProviderId,
          cpt_code: charge.cptCode,
          cpt_description: charge.cptDescription,
          modifiers: charge.modifiers,
          units: charge.units,
          diagnosis_codes: charge.diagnosisCodes,
          place_of_service: charge.placeOfService,
          charge_amount: charge.chargeAmount,
          primary_insurance_id: charge.primaryInsuranceId,
          secondary_insurance_id: charge.secondaryInsuranceId,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['charge-entries'] });
      toast({
        title: 'Success',
        description: 'Charge entry created successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to create charge: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Create claim mutation
  const createClaim = useMutation({
    mutationFn: async (claim: Partial<InsuranceClaim>) => {
      const { data: { user } } = await supabase.auth.getUser();

      // Generate claim number
      const claimNumber = `CLM-${Date.now()}`;
      
      const { data, error } = await supabase
        .from('insurance_claims')
        .insert({
          claim_number: claimNumber,
          client_id: claim.clientId,
          primary_insurance_id: claim.primaryInsuranceId,
          secondary_insurance_id: claim.secondaryInsuranceId,
          rendering_provider_id: claim.renderingProviderId,
          billing_provider_id: claim.billingProviderId,
          supervising_provider_id: claim.supervisingProviderId,
          service_date_from: claim.serviceDateFrom,
          service_date_to: claim.serviceDateTo,
          total_charge_amount: claim.totalChargeAmount,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insurance-claims'] });
      toast({
        title: 'Success',
        description: 'Insurance claim created successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to create claim: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  return {
    charges,
    claims,
    isLoading: chargesLoading || claimsLoading,
    createCharge: createCharge.mutateAsync,
    createClaim: createClaim.mutateAsync,
  };
};
