import { supabase } from '@/integrations/supabase/client';

/**
 * Check if a supervisee is eligible for incident-to billing
 */
export async function checkIncidentToEligibility(
  superviseeId: string,
  supervisorId: string
): Promise<{
  eligible: boolean;
  relationship?: any;
  reason?: string;
}> {
  try {
    // Get the supervision relationship
    const { data: relationship, error } = await supabase
      .from('supervision_relationships')
      .select('*')
      .eq('supervisee_id', superviseeId)
      .eq('supervisor_id', supervisorId)
      .eq('status', 'Active')
      .maybeSingle();

    if (error) throw error;

    if (!relationship) {
      return {
        eligible: false,
        reason: 'No active supervision relationship found'
      };
    }

    if (!relationship.can_bill_incident_to) {
      return {
        eligible: false,
        relationship,
        reason: 'Supervisee not qualified for incident-to billing'
      };
    }

    // Check if the start date has passed
    if (relationship.incident_to_start_date) {
      const startDate = new Date(relationship.incident_to_start_date);
      const today = new Date();
      
      if (startDate > today) {
        return {
          eligible: false,
          relationship,
          reason: `Incident-to billing eligibility starts on ${startDate.toLocaleDateString()}`
        };
      }
    }

    return {
      eligible: true,
      relationship
    };
  } catch (error) {
    console.error('Error checking incident-to eligibility:', error);
    return {
      eligible: false,
      reason: 'Error checking eligibility'
    };
  }
}

/**
 * Get all supervisees eligible for incident-to billing under a supervisor
 */
export async function getIncidentToEligibleSupervisees(supervisorId: string) {
  try {
    const { data, error } = await supabase
      .from('supervision_relationships')
      .select(`
        *,
        supervisee:profiles!supervision_relationships_supervisee_id_fkey(
          id,
          first_name,
          last_name,
          email
        )
      `)
      .eq('supervisor_id', supervisorId)
      .eq('status', 'Active')
      .eq('can_bill_incident_to', true)
      .lte('incident_to_start_date', new Date().toISOString());

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting incident-to eligible supervisees:', error);
    return [];
  }
}

/**
 * Verify incident-to requirements for a supervisee
 */
export async function verifyIncidentToRequirements(
  relationshipId: string,
  verifiedBy: string,
  verificationNotes: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('supervision_relationships')
      .update({
        incident_to_requirements_verified: {
          verifiedBy,
          verifiedDate: new Date().toISOString(),
          verificationNotes
        }
      })
      .eq('id', relationshipId);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error('Error verifying incident-to requirements:', error);
    return {
      success: false,
      error: error.message || 'Failed to verify requirements'
    };
  }
}
