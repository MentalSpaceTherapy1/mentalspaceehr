import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
}

interface ConsentFormData {
  clientId: string;
  
  // Understanding
  understoodLimitations: boolean;
  understoodRisks: boolean;
  understoodBenefits: boolean;
  understoodAlternatives: boolean;
  risksAcknowledged: string[];
  
  // Emergency
  emergencyContact: EmergencyContact;
  currentPhysicalLocation: string;
  localEmergencyNumber: string;
  
  // Privacy
  privacyPolicyReviewed: boolean;
  confidentialityLimitsUnderstood: boolean;
  
  // Technical
  adequateConnectionConfirmed: boolean;
  privateLocationConfirmed: boolean;
  
  // Recording & Final
  consentsToRecording: boolean;
  signature: string;
  clientStateOfResidence: string;
}

export const useTelehealthConsent = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const createConsent = async (formData: ConsentFormData) => {
    setLoading(true);
    try {
      // Check state licensure
      const { data: licensureValid } = await supabase.rpc(
        'validate_telehealth_licensure',
        {
          _client_id: formData.clientId,
          _clinician_id: user?.id,
        }
      );

      const expirationDate = new Date();
      expirationDate.setFullYear(expirationDate.getFullYear() + 1);

      const { data, error } = await supabase
        .from('telehealth_consents')
        .insert([{
          client_id: formData.clientId,
          clinician_id: user?.id,
          
          understood_limitations: formData.understoodLimitations,
          understood_risks: formData.understoodRisks,
          understood_benefits: formData.understoodBenefits,
          understood_alternatives: formData.understoodAlternatives,
          risks_acknowledged: formData.risksAcknowledged,
          
          emergency_protocol_understood: true,
          emergency_contact_provided: true,
          emergency_contact: formData.emergencyContact as any,
          current_physical_location: formData.currentPhysicalLocation,
          local_emergency_number: formData.localEmergencyNumber,
          
          privacy_policy_reviewed: formData.privacyPolicyReviewed,
          secure_platform_understood: true,
          confidentiality_limits_understood: formData.confidentialityLimitsUnderstood,
          
          client_state_of_residence: formData.clientStateOfResidence,
          clinician_licensed_in_state: licensureValid ?? false,
          
          technical_requirements_understood: true,
          adequate_connection_confirmed: formData.adequateConnectionConfirmed,
          private_location_confirmed: formData.privateLocationConfirmed,
          
          understands_recording_policy: true,
          consents_to_recording: formData.consentsToRecording,
          
          consent_given: true,
          consent_date: new Date().toISOString(),
          client_signature: formData.signature,
          expiration_date: expirationDate.toISOString().split('T')[0],
        }])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Consent Created',
        description: 'Telehealth consent has been successfully recorded.',
      });

      return { data, error: null };
    } catch (error: any) {
      toast({
        title: 'Error Creating Consent',
        description: error.message,
        variant: 'destructive',
      });
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  };

  const getActiveConsent = async (clientId: string) => {
    const { data, error } = await supabase
      .from('telehealth_consents')
      .select('*')
      .eq('client_id', clientId)
      .eq('consent_given', true)
      .eq('consent_revoked', false)
      .gte('expiration_date', new Date().toISOString().split('T')[0])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return { data, error };
  };

  const checkConsentExpiration = async (clientId: string) => {
    const { data } = await getActiveConsent(clientId);
    
    if (!data) {
      return { status: 'missing', daysUntilExpiration: 0 };
    }

    const expirationDate = new Date(data.expiration_date);
    const today = new Date();
    const daysUntilExpiration = Math.floor(
      (expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilExpiration < 0) {
      return { status: 'expired', daysUntilExpiration: 0 };
    } else if (daysUntilExpiration <= 30) {
      return { status: 'expiring_soon', daysUntilExpiration };
    }

    return { status: 'active', daysUntilExpiration };
  };

  const revokeConsent = async (consentId: string, reason: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('telehealth_consents')
        .update({
          consent_revoked: true,
          revocation_date: new Date().toISOString(),
          revocation_reason: reason,
        })
        .eq('id', consentId);

      if (error) throw error;

      toast({
        title: 'Consent Revoked',
        description: 'The telehealth consent has been revoked.',
      });

      return { error: null };
    } catch (error: any) {
      toast({
        title: 'Error Revoking Consent',
        description: error.message,
        variant: 'destructive',
      });
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const renewConsent = async (oldConsentId: string, newFormData: ConsentFormData) => {
    // Revoke old consent
    await revokeConsent(oldConsentId, 'Renewed with updated consent');
    
    // Create new consent
    return await createConsent(newFormData);
  };

  return {
    createConsent,
    getActiveConsent,
    checkConsentExpiration,
    revokeConsent,
    renewConsent,
    loading,
  };
};
