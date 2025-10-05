import { supabase } from '@/integrations/supabase/client';
import type { PortalAccount, AccountStatus } from '@/types/portal';

/**
 * Generate a secure portal invitation token
 */
export function generateInvitationToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Send portal invitation to a client
 */
export async function sendPortalInvitation(
  clientId: string,
  email: string,
  invitedBy: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const invitationToken = generateInvitationToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 day expiration

    // Update client record with invitation details
    const { error: updateError } = await supabase
      .from('clients')
      .update({
        portal_invitation_sent_at: new Date().toISOString(),
        portal_enabled: true
      })
      .eq('id', clientId);

    if (updateError) throw updateError;

    // TODO: Send invitation email via edge function
    // This would call a send-portal-invitation edge function

    return { success: true };
  } catch (error) {
    console.error('Error sending portal invitation:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to send invitation' 
    };
  }
}

/**
 * Check if account is locked due to failed login attempts
 */
export async function isAccountLocked(clientId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('portal_account_security')
      .select('account_locked_until, failed_login_attempts')
      .eq('client_id', clientId)
      .maybeSingle();

    if (error || !data) return false;

    // Check if lock time has passed
    if (data.account_locked_until) {
      const lockUntil = new Date(data.account_locked_until);
      if (lockUntil > new Date()) {
        return true;
      }
    }

    // Check if too many failed attempts (5 or more)
    if (data.failed_login_attempts >= 5) {
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error checking account lock status:', error);
    return false;
  }
}

/**
 * Reset failed login attempts
 */
export async function resetFailedLoginAttempts(clientId: string): Promise<void> {
  try {
    await supabase
      .from('portal_account_security')
      .update({
        failed_login_attempts: 0,
        account_locked_until: null
      })
      .eq('client_id', clientId);
  } catch (error) {
    console.error('Error resetting failed login attempts:', error);
  }
}

/**
 * Increment failed login attempts
 */
export async function incrementFailedLoginAttempts(clientId: string): Promise<void> {
  try {
    const { data: security } = await supabase
      .from('portal_account_security')
      .select('failed_login_attempts')
      .eq('client_id', clientId)
      .single();

    const newCount = (security?.failed_login_attempts || 0) + 1;

    // Lock account after 5 failed attempts for 30 minutes
    const updates: any = {
      failed_login_attempts: newCount
    };

    if (newCount >= 5) {
      const lockUntil = new Date();
      lockUntil.setMinutes(lockUntil.getMinutes() + 30);
      updates.account_locked_until = lockUntil.toISOString();
    }

    await supabase
      .from('portal_account_security')
      .update(updates)
      .eq('client_id', clientId);
  } catch (error) {
    console.error('Error incrementing failed login attempts:', error);
  }
}

/**
 * Check if user is a guardian for any minors
 */
export async function getGuardianMinors(clientId: string): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('guardian_relationships')
      .select('minor_client_id')
      .eq('guardian_client_id', clientId)
      .eq('status', 'active');

    if (error) throw error;
    return data?.map(r => r.minor_client_id) || [];
  } catch (error) {
    console.error('Error fetching guardian minors:', error);
    return [];
  }
}

/**
 * Verify guardian relationship with legal documentation
 */
export async function verifyGuardianRelationship(
  relationshipId: string,
  verifiedBy: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('guardian_relationships')
      .update({
        legal_document_verified: true,
        verified_by: verifiedBy,
        verified_date: new Date().toISOString(),
        status: 'active'
      })
      .eq('id', relationshipId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error verifying guardian relationship:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to verify relationship'
    };
  }
}

/**
 * Get portal account status based on various factors
 */
export function getAccountStatus(
  portalEnabled: boolean,
  emailVerified: boolean,
  accountLockedUntil?: Date,
  clientStatus?: string
): AccountStatus {
  if (accountLockedUntil && accountLockedUntil > new Date()) {
    return 'Locked';
  }
  
  if (!emailVerified) {
    return 'Pending Verification';
  }
  
  if (!portalEnabled || clientStatus !== 'Active') {
    return 'Inactive';
  }
  
  return 'Active';
}

/**
 * Log portal access for audit trail
 */
export async function logPortalAccess(
  clientId: string,
  portalUserId: string,
  action: string,
  success: boolean,
  failureReason?: string
): Promise<void> {
  try {
    // SECURITY: Use 'client-side' instead of external IP API for HIPAA compliance
    // IP logging should be done server-side via edge functions using request headers
    await supabase.from('portal_access_log').insert({
      client_id: clientId,
      portal_user_id: portalUserId,
      action,
      success,
      failure_reason: failureReason,
      ip_address: 'client-side',
      user_agent: navigator.userAgent
    });
  } catch (error) {
    console.error('Error logging portal access:', error);
    // Never block portal access due to logging failures
  }
}

/**
 * Check if guardian has permission for specific action
 */
export async function checkGuardianPermission(
  guardianClientId: string,
  minorClientId: string,
  permission: 'can_view_notes' | 'can_schedule_appointments' | 'can_view_billing' | 'can_communicate_with_clinician'
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('guardian_relationships')
      .select(permission)
      .eq('guardian_client_id', guardianClientId)
      .eq('minor_client_id', minorClientId)
      .eq('status', 'active')
      .single();

    if (error || !data) return false;
    return data[permission] === true;
  } catch (error) {
    console.error('Error checking guardian permission:', error);
    return false;
  }
}

/**
 * Enable portal access for a client
 */
export async function enablePortalAccess(
  clientId: string,
  grantedBy: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('clients')
      .update({
        portal_enabled: true,
        portal_invitation_sent_at: new Date().toISOString()
      })
      .eq('id', clientId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error enabling portal access:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to enable portal'
    };
  }
}

/**
 * Disable portal access for a client
 */
export async function disablePortalAccess(
  clientId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('clients')
      .update({
        portal_enabled: false
      })
      .eq('id', clientId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error disabling portal access:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to disable portal'
    };
  }
}
