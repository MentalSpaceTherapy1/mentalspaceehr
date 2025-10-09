/**
 * Hook for easy audit logging across components
 * Automatically includes user context and handles errors gracefully
 */

import { useAuth } from './useAuth';
import { 
  logAuditEvent, 
  logPHIAccess,
  logAdminAction,
  logDataModification,
  logAuthEvent,
  logSecurityEvent,
  logBulkExport,
  logCriticalAccess,
  logAfterHoursAccess,
  AuditActionType, 
  AuditResourceType,
  AuditSeverity 
} from '@/lib/auditLogger';

export const useAuditLog = () => {
  const { user } = useAuth();

  const logAction = async (
    actionType: AuditActionType,
    resourceType: AuditResourceType,
    description: string,
    details?: Record<string, any>,
    resourceId?: string,
    severity?: AuditSeverity
  ) => {
    if (!user?.id) {
      console.warn('Cannot log audit event: No authenticated user');
      return;
    }

    try {
      await logAuditEvent({
        userId: user.id,
        actionType,
        resourceType,
        resourceId,
        actionDescription: description,
        actionDetails: details,
        severity: severity || getSeverityForAction(actionType, resourceType)
      });
    } catch (error) {
      console.error('Failed to log audit event:', error);
      // Don't throw - audit logging should never break app functionality
    }
  };

  const logPHI = async (
    clientId: string,
    resourceType: AuditResourceType,
    description: string,
    details?: Record<string, any>
  ) => {
    if (!user?.id) return;
    
    try {
      await logPHIAccess(user.id, clientId, resourceType, description, details);
      // Also log after-hours access if applicable
      await logAfterHoursAccess(user.id, resourceType, clientId, description, details);
    } catch (error) {
      console.error('Failed to log PHI access:', error);
    }
  };

  const logAdmin = async (
    resourceType: AuditResourceType,
    description: string,
    details?: Record<string, any>
  ) => {
    if (!user?.id) return;
    
    try {
      await logAdminAction(user.id, resourceType, description, details);
    } catch (error) {
      console.error('Failed to log admin action:', error);
    }
  };

  const logModification = async (
    resourceType: AuditResourceType,
    resourceId: string,
    description: string,
    details?: Record<string, any>
  ) => {
    if (!user?.id) return;
    
    try {
      await logDataModification(user.id, resourceType, resourceId, description, details);
    } catch (error) {
      console.error('Failed to log data modification:', error);
    }
  };

  const logAuth = async (
    actionType: 'login' | 'logout' | 'authentication_attempt',
    description: string,
    severity?: AuditSeverity
  ) => {
    if (!user?.id) return;
    
    try {
      await logAuthEvent(user.id, actionType, description, severity);
    } catch (error) {
      console.error('Failed to log auth event:', error);
    }
  };

  const logSecurity = async (
    resourceType: AuditResourceType,
    description: string,
    details?: Record<string, any>
  ) => {
    if (!user?.id) return;
    
    try {
      await logSecurityEvent(user.id, resourceType, description, details);
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  };

  const logExport = async (
    resourceType: AuditResourceType,
    description: string,
    recordCount: number,
    details?: Record<string, any>
  ) => {
    if (!user?.id) return;
    
    try {
      await logBulkExport(user.id, resourceType, description, recordCount, details);
    } catch (error) {
      console.error('Failed to log bulk export:', error);
    }
  };

  return {
    logAction,
    logPHI,
    logAdmin,
    logModification,
    logAuth,
    logSecurity,
    logExport
  };
};

/**
 * Helper to determine severity based on action type
 */
function getSeverityForAction(
  actionType: AuditActionType,
  resourceType: AuditResourceType
): AuditSeverity {
  // Critical actions
  if (actionType === 'admin_action' && 
      (resourceType === 'role_assignment' || resourceType === 'user_management')) {
    return 'critical';
  }
  
  if (actionType === 'permission_change' || actionType === 'configuration_change') {
    return 'critical';
  }
  
  // Warning actions
  if (actionType === 'data_modification') {
    return 'warning';
  }
  
  // Default to info
  return 'info';
}
