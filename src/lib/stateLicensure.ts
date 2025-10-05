import { supabase } from '@/integrations/supabase/client';

export const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

export interface LicensureValidation {
  isValid: boolean;
  clientState: string;
  clinicianStates: string[];
  message: string;
}

export const validateTelehealthLicensure = async (
  clientId: string,
  clinicianId: string
): Promise<LicensureValidation> => {
  try {
    // Check if licensure enforcement is enabled
    const { data: settings } = await supabase
      .from('practice_settings')
      .select('telehealth_settings')
      .single();
    
    const enforceStateLicensure = (settings?.telehealth_settings as any)?.enforce_state_licensure ?? false;
    
    // If enforcement is disabled, always return valid
    if (!enforceStateLicensure) {
      return {
        isValid: true,
        clientState: '',
        clinicianStates: [],
        message: 'State licensure verification is disabled',
      };
    }

    // Get client state
    const { data: client } = await supabase
      .from('clients')
      .select('state')
      .eq('id', clientId)
      .single();

    if (!client?.state) {
      return {
        isValid: false,
        clientState: '',
        clinicianStates: [],
        message: 'Client state not found',
      };
    }

    // Get clinician licensed states
    const { data: clinician } = await supabase
      .from('profiles')
      .select('licensed_states')
      .eq('id', clinicianId)
      .single();

    const licensedStates = clinician?.licensed_states || [];

    const isValid = licensedStates.includes(client.state);

    return {
      isValid,
      clientState: client.state,
      clinicianStates: licensedStates,
      message: isValid
        ? 'Clinician is licensed in client state'
        : `Clinician is not licensed in ${client.state}. Licensed states: ${licensedStates.join(', ')}`,
    };
  } catch (error) {
    console.error('Error validating licensure:', error);
    return {
      isValid: false,
      clientState: '',
      clinicianStates: [],
      message: 'Error validating licensure',
    };
  }
};
