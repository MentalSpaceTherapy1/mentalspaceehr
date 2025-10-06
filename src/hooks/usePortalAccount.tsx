import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import type { 
  PortalAccount, 
  PortalPreferences, 
  PortalAccountSecurity,
  ClientPortalContext,
  MFAMethod
} from '@/types/portal';

export const usePortalAccount = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [portalContext, setPortalContext] = useState<ClientPortalContext | null>(null);

  useEffect(() => {
    if (user) {
      fetchPortalContext();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchPortalContext = async () => {
    if (!user) return;

    try {
      setLoading(true);

      console.log('[usePortalAccount] Fetching context for user:', user.id);

      // Fetch client record (no cross-table joins to avoid RLS issues)
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select(`*`)
        .eq('portal_user_id', user.id)
        .maybeSingle();

      console.log('[usePortalAccount] Client query result:', { client, clientError });

      if (clientError) {
        console.error('[usePortalAccount] Error fetching client:', clientError);
        throw clientError;
      }

      if (!client) {
        console.error('[usePortalAccount] No client record found for portal user');
        // Check if user has staff roles - they might be logged in with wrong account
        const { data: roles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);
        
        const isStaff = roles?.some(r => 
          ['administrator', 'supervisor', 'therapist', 'front_desk', 'billing_staff'].includes(r.role)
        );
        
        if (isStaff) {
          toast.error('You are logged in with a staff account. Please sign out and log in with your client portal credentials.');
        } else {
          toast.error('Your portal account is not properly configured. Please contact your therapist.');
        }
        setLoading(false);
        return;
      }

      if (!client.portal_enabled) {
        console.error('[usePortalAccount] Portal access not enabled for client:', client.id);
        toast.error('Portal access is not enabled for your account. Please contact your therapist.');
        return;
      }

      // Fetch preferences
      const { data: preferences, error: prefError } = await supabase
        .from('portal_preferences')
        .select('*')
        .eq('client_id', client.id)
        .maybeSingle();

      console.log('[usePortalAccount] Preferences query result:', { preferences, prefError });

      if (prefError) {
        console.error('[usePortalAccount] Error fetching preferences:', prefError);
      }

      // If none, use in-memory defaults; do not auto-insert to avoid RLS issues
      if (!preferences) {
        console.warn('[usePortalAccount] No portal_preferences row found; using defaults');
      }

      // Fetch security settings
      const { data: security, error: secError } = await supabase
        .from('portal_account_security')
        .select('*')
        .eq('client_id', client.id)
        .maybeSingle();

      console.log('[usePortalAccount] Security query result:', { security, secError });

      if (secError) {
        console.error('[usePortalAccount] Error fetching security:', secError);
      }

      // If none, use in-memory defaults; do not auto-insert to avoid RLS issues
      if (!security) {
        console.warn('[usePortalAccount] No portal_account_security row found; using defaults');
      }

      // Fetch guardian relationships if this is a guardian account
      const { data: guardianRelationships, error: guardianError } = await supabase
        .from('guardian_relationships')
        .select(`
          *,
          minor_client:clients!guardian_relationships_minor_client_id_fkey(
            id,
            first_name,
            last_name,
            date_of_birth,
            medical_record_number
          )
        `)
        .eq('guardian_client_id', client.id)
        .eq('status', 'active');

      console.log('[usePortalAccount] Guardian relationships query result:', { guardianRelationships, guardianError });

      // Build portal context
      const context: ClientPortalContext = {
        account: {
          portalUserId: user.id,
          clientId: client.id,
          email: user.email!,
          emailVerified: !!user.email_confirmed_at,
          accountStatus: client.status === 'Active' ? 'Active' : 'Inactive',
          portalEnabled: client.portal_enabled,
          portalInvitationSentAt: client.portal_invitation_sent_at ? new Date(client.portal_invitation_sent_at) : undefined,
          lastLoginDate: client.portal_last_login ? new Date(client.portal_last_login) : undefined,
          failedLoginAttempts: security?.failed_login_attempts || 0,
          accountLockedUntil: security?.account_locked_until ? new Date(security.account_locked_until) : undefined,
          mfaEnabled: security?.mfa_enabled || false,
          mfaMethod: security?.mfa_method as MFAMethod | undefined,
          preferences: preferences ? mapPreferences(preferences) : getDefaultPreferences(client.id),
          portalAccessGranted: client.portal_enabled,
          isGuardianAccount: (guardianRelationships?.length || 0) > 0,
          minorClientIds: guardianRelationships?.map((r: any) => r.minor_client_id) || [],
          guardianRelationships: guardianRelationships?.map(mapGuardianRelationship) || [],
          createdDate: new Date(client.created_at),
          lastModifiedDate: new Date(client.updated_at)
        },
        client: {
          id: client.id,
          firstName: client.first_name,
          lastName: client.last_name,
          dateOfBirth: new Date(client.date_of_birth),
          email: client.email,
          phone: client.primary_phone,
          medicalRecordNumber: client.medical_record_number,
          primaryTherapist: undefined,
          status: client.status
        },
        preferences: preferences ? mapPreferences(preferences) : getDefaultPreferences(client.id),
        security: security ? mapSecurity(security) : getDefaultSecurity(client.id, user.id),
        guardianRelationships: guardianRelationships?.map(mapGuardianRelationship) || [],
        minorClients: guardianRelationships?.map((r: any) => ({
          id: r.minor_client.id,
          firstName: r.minor_client.first_name,
          lastName: r.minor_client.last_name,
          dateOfBirth: new Date(r.minor_client.date_of_birth),
          medicalRecordNumber: r.minor_client.medical_record_number,
          status: 'Active'
        })) || []
      };

      setPortalContext(context);

      // Update last login timestamp (suppress RLS errors if client can't update own row)
      try {
        const { error: updateError } = await supabase
          .from('clients')
          .update({ portal_last_login: new Date().toISOString() })
          .eq('id', client.id);

        if (updateError) {
          console.warn('[usePortalAccount] Could not update last login (likely RLS):', updateError);
        }
      } catch (err) {
        console.warn('[usePortalAccount] Exception updating last login:', err);
      }

    } catch (error) {
      console.error('Error fetching portal context:', error);
      toast.error('Failed to load portal information');
    } finally {
      setLoading(false);
    }
  };

  const updatePreferences = async (updates: Partial<PortalPreferences>) => {
    if (!portalContext) return;

    try {
      const { error } = await supabase
        .from('portal_preferences')
        .update(updates)
        .eq('client_id', portalContext.client.id);

      if (error) throw error;

      toast.success('Preferences updated successfully');
      await fetchPortalContext();
    } catch (error) {
      console.error('Error updating preferences:', error);
      toast.error('Failed to update preferences');
    }
  };

  const updateSecurity = async (updates: Partial<PortalAccountSecurity>) => {
    if (!portalContext) return;

    try {
      const { error } = await supabase
        .from('portal_account_security')
        .update(updates)
        .eq('client_id', portalContext.client.id);

      if (error) throw error;

      toast.success('Security settings updated');
      await fetchPortalContext();
    } catch (error) {
      console.error('Error updating security:', error);
      toast.error('Failed to update security settings');
    }
  };

  const logPortalAccess = async (action: string, success: boolean, failureReason?: string) => {
    if (!portalContext) return;

    try {
      await supabase.from('portal_access_log').insert({
        client_id: portalContext.client.id,
        portal_user_id: user?.id,
        action,
        success,
        failure_reason: failureReason,
        user_agent: navigator.userAgent
      });
    } catch (error) {
      console.error('Error logging portal access:', error);
    }
  };

  return {
    portalContext,
    loading,
    updatePreferences,
    updateSecurity,
    logPortalAccess,
    refreshContext: fetchPortalContext
  };
};

// Helper functions
function mapPreferences(data: any): PortalPreferences {
  return {
    id: data.id,
    clientId: data.client_id,
    emailNotifications: data.email_notifications,
    smsNotifications: data.sms_notifications,
    appointmentReminders: data.appointment_reminders,
    billingReminders: data.billing_reminders,
    messageNotifications: data.message_notifications,
    preferredContactMethod: data.preferred_contact_method,
    reminderHoursBefore: data.reminder_hours_before,
    theme: data.theme,
    language: data.language,
    timezone: data.timezone,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at)
  };
}

function mapSecurity(data: any): PortalAccountSecurity {
  return {
    id: data.id,
    clientId: data.client_id,
    portalUserId: data.portal_user_id,
    mfaEnabled: data.mfa_enabled,
    mfaMethod: data.mfa_method,
    mfaPhone: data.mfa_phone,
    mfaSecret: data.mfa_secret,
    mfaBackupCodes: data.mfa_backup_codes || [],
    failedLoginAttempts: data.failed_login_attempts,
    accountLockedUntil: data.account_locked_until ? new Date(data.account_locked_until) : undefined,
    lastPasswordChange: data.last_password_change ? new Date(data.last_password_change) : undefined,
    passwordResetToken: data.password_reset_token,
    passwordResetTokenExpires: data.password_reset_token_expires ? new Date(data.password_reset_token_expires) : undefined,
    securityQuestions: data.security_questions || [],
    maxConcurrentSessions: data.max_concurrent_sessions,
    activeSessionTokens: data.active_session_tokens || [],
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at)
  };
}

function mapGuardianRelationship(data: any): any {
  return {
    id: data.id,
    guardianClientId: data.guardian_client_id,
    minorClientId: data.minor_client_id,
    relationshipType: data.relationship_type,
    legalDocumentPath: data.legal_document_path,
    legalDocumentVerified: data.legal_document_verified,
    verifiedBy: data.verified_by,
    verifiedDate: data.verified_date ? new Date(data.verified_date) : undefined,
    canViewNotes: data.can_view_notes,
    canScheduleAppointments: data.can_schedule_appointments,
    canViewBilling: data.can_view_billing,
    canCommunicateWithClinician: data.can_communicate_with_clinician,
    status: data.status,
    notes: data.notes,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
    createdBy: data.created_by
  };
}

function getDefaultPreferences(clientId: string): PortalPreferences {
  return {
    id: '',
    clientId,
    emailNotifications: true,
    smsNotifications: false,
    appointmentReminders: true,
    billingReminders: true,
    messageNotifications: true,
    preferredContactMethod: 'email',
    reminderHoursBefore: 24,
    theme: 'system',
    language: 'en',
    timezone: 'America/New_York',
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

function getDefaultSecurity(clientId: string, userId: string): PortalAccountSecurity {
  return {
    id: '',
    clientId,
    portalUserId: userId,
    mfaEnabled: false,
    failedLoginAttempts: 0,
    securityQuestions: [],
    maxConcurrentSessions: 3,
    activeSessionTokens: [],
    createdAt: new Date(),
    updatedAt: new Date()
  };
}
