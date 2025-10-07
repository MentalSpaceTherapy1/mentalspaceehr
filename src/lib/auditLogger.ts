/**
 * HIPAA-Compliant Audit Logging Utility
 * Tracks all PHI access and administrative actions
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from './logger';

export type AuditActionType = 
  | 'phi_access'
  | 'admin_action'
  | 'data_modification'
  | 'login'
  | 'logout'
  | 'authentication_attempt'
  | 'permission_change'
  | 'configuration_change';

export type AuditResourceType = 
  | 'client_chart'
  | 'clinical_note'
  | 'treatment_plan'
  | 'assessment'
  | 'appointment'
  | 'user_management'
  | 'role_assignment'
  | 'settings'
  | 'billing'
  | 'insurance';

export type AuditSeverity = 'info' | 'warning' | 'critical';

interface AuditLogParams {
  userId: string;
  actionType: AuditActionType;
  resourceType: AuditResourceType;
  resourceId?: string;
  actionDescription: string;
  actionDetails?: Record<string, any>;
  severity?: AuditSeverity;
}

/**
 * Log an audit event to the database
 * This function ensures all PHI access and security events are tracked
 */
export async function logAuditEvent(params: AuditLogParams): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('log_audit_event', {
      p_user_id: params.userId,
      p_action_type: params.actionType,
      p_resource_type: params.resourceType,
      p_resource_id: params.resourceId || null,
      p_action_description: params.actionDescription,
      p_action_details: params.actionDetails || null,
      p_severity: params.severity || 'info'
    });

    if (error) {
      logger.error('Failed to log audit event', { error, params });
      return null;
    }

    return data as string;
  } catch (err) {
    logger.error('Audit logging exception', { error: err, params });
    return null;
  }
}

/**
 * Log PHI access - CRITICAL for HIPAA compliance
 * Should be called whenever a user views patient information
 */
export async function logPHIAccess(
  userId: string,
  clientId: string,
  resourceType: AuditResourceType,
  description: string,
  details?: Record<string, any>
): Promise<void> {
  await logAuditEvent({
    userId,
    actionType: 'phi_access',
    resourceType,
    resourceId: clientId,
    actionDescription: description,
    actionDetails: details,
    severity: 'info'
  });
}

/**
 * Log administrative action
 */
export async function logAdminAction(
  userId: string,
  resourceType: AuditResourceType,
  description: string,
  details?: Record<string, any>
): Promise<void> {
  await logAuditEvent({
    userId,
    actionType: 'admin_action',
    resourceType,
    actionDescription: description,
    actionDetails: details,
    severity: 'warning'
  });
}

/**
 * Log data modification
 */
export async function logDataModification(
  userId: string,
  resourceType: AuditResourceType,
  resourceId: string,
  description: string,
  details?: Record<string, any>
): Promise<void> {
  await logAuditEvent({
    userId,
    actionType: 'data_modification',
    resourceType,
    resourceId,
    actionDescription: description,
    actionDetails: details,
    severity: 'info'
  });
}

/**
 * Log authentication event
 */
export async function logAuthEvent(
  userId: string,
  actionType: 'login' | 'logout' | 'authentication_attempt',
  description: string,
  severity: AuditSeverity = 'info'
): Promise<void> {
  await logAuditEvent({
    userId,
    actionType,
    resourceType: 'user_management',
    actionDescription: description,
    severity
  });
}

/**
 * Log critical security event
 */
export async function logSecurityEvent(
  userId: string,
  resourceType: AuditResourceType,
  description: string,
  details?: Record<string, any>
): Promise<void> {
  await logAuditEvent({
    userId,
    actionType: 'admin_action',
    resourceType,
    actionDescription: description,
    actionDetails: details,
    severity: 'critical'
  });
}
