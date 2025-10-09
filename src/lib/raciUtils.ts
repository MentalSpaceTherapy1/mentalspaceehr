/**
 * RACI (Responsible, Accountable, Consulted, Informed) Utilities
 * Enforces RACI matrix rules for actions across the application
 */

import { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

export interface RACIPermission {
  responsible: AppRole[];
  accountable: AppRole[];
  consulted: AppRole[];
  informed: AppRole[];
}

export interface RACICheck {
  canPerform: boolean;
  reason?: string;
  requiredRole?: AppRole;
  mustConsult?: AppRole[];
}

/**
 * RACI Matrix Definitions by Module
 */
export const RACI_MATRIX = {
  // Scheduling Module
  scheduling: {
    create_appointment: {
      responsible: ['front_desk', 'administrator'] as AppRole[],
      accountable: ['administrator'] as AppRole[],
      consulted: ['therapist', 'supervisor'] as AppRole[],
      informed: ['therapist', 'supervisor'] as AppRole[]
    },
    cancel_appointment: {
      responsible: ['front_desk', 'therapist', 'administrator'] as AppRole[],
      accountable: ['administrator'] as AppRole[],
      consulted: ['therapist'] as AppRole[],
      informed: ['therapist', 'supervisor'] as AppRole[]
    },
    modify_clinician_schedule: {
      responsible: ['therapist'] as AppRole[],
      accountable: ['administrator'] as AppRole[],
      consulted: ['supervisor'] as AppRole[],
      informed: ['front_desk', 'supervisor'] as AppRole[]
    },
    approve_time_off: {
      responsible: ['supervisor', 'administrator'] as AppRole[],
      accountable: ['administrator'] as AppRole[],
      consulted: [] as AppRole[],
      informed: ['front_desk'] as AppRole[]
    },
    manage_waitlist: {
      responsible: ['front_desk', 'administrator'] as AppRole[],
      accountable: ['administrator'] as AppRole[],
      consulted: ['therapist'] as AppRole[],
      informed: ['therapist', 'supervisor'] as AppRole[]
    }
  },

  // Clinical Notes Module
  clinical_notes: {
    create_note: {
      responsible: ['therapist', 'associate_trainee'] as AppRole[],
      accountable: ['supervisor', 'administrator'] as AppRole[],
      consulted: [] as AppRole[],
      informed: ['supervisor'] as AppRole[]
    },
    edit_note: {
      responsible: ['therapist', 'associate_trainee'] as AppRole[],
      accountable: ['supervisor', 'administrator'] as AppRole[],
      consulted: ['supervisor'] as AppRole[],
      informed: ['supervisor'] as AppRole[]
    },
    lock_note: {
      responsible: [] as AppRole[], // System automated
      accountable: ['administrator'] as AppRole[],
      consulted: [] as AppRole[],
      informed: ['therapist', 'supervisor'] as AppRole[]
    },
    cosign_note: {
      responsible: ['supervisor'] as AppRole[],
      accountable: ['supervisor'] as AppRole[],
      consulted: ['associate_trainee'] as AppRole[],
      informed: ['administrator'] as AppRole[]
    },
    request_unlock: {
      responsible: ['therapist', 'associate_trainee'] as AppRole[],
      accountable: ['administrator'] as AppRole[],
      consulted: ['supervisor'] as AppRole[],
      informed: ['supervisor', 'administrator'] as AppRole[]
    },
    approve_unlock: {
      responsible: ['administrator'] as AppRole[],
      accountable: ['administrator'] as AppRole[],
      consulted: ['supervisor'] as AppRole[],
      informed: ['therapist'] as AppRole[]
    }
  },

  // Billing Module
  billing: {
    create_charge: {
      responsible: ['billing_staff', 'administrator'] as AppRole[],
      accountable: ['administrator'] as AppRole[],
      consulted: ['therapist'] as AppRole[],
      informed: ['therapist', 'supervisor'] as AppRole[]
    },
    post_payment: {
      responsible: ['billing_staff', 'administrator'] as AppRole[],
      accountable: ['administrator'] as AppRole[],
      consulted: [] as AppRole[],
      informed: ['therapist'] as AppRole[]
    },
    generate_statement: {
      responsible: ['billing_staff', 'administrator'] as AppRole[],
      accountable: ['administrator'] as AppRole[],
      consulted: [] as AppRole[],
      informed: [] as AppRole[]
    },
    write_off_balance: {
      responsible: ['administrator'] as AppRole[],
      accountable: ['administrator'] as AppRole[],
      consulted: ['billing_staff'] as AppRole[],
      informed: ['therapist'] as AppRole[]
    }
  },

  // Client Portal Module
  client_portal: {
    enable_portal_access: {
      responsible: ['front_desk', 'administrator'] as AppRole[],
      accountable: ['administrator'] as AppRole[],
      consulted: ['therapist'] as AppRole[],
      informed: ['therapist'] as AppRole[]
    },
    share_document: {
      responsible: ['therapist', 'front_desk'] as AppRole[],
      accountable: ['therapist'] as AppRole[],
      consulted: [] as AppRole[],
      informed: [] as AppRole[]
    },
    assign_form: {
      responsible: ['therapist', 'front_desk'] as AppRole[],
      accountable: ['therapist'] as AppRole[],
      consulted: [] as AppRole[],
      informed: [] as AppRole[]
    },
    review_form_response: {
      responsible: ['therapist'] as AppRole[],
      accountable: ['therapist'] as AppRole[],
      consulted: [] as AppRole[],
      informed: [] as AppRole[]
    }
  },

  // Telehealth Module
  telehealth: {
    start_session: {
      responsible: ['therapist'] as AppRole[],
      accountable: ['therapist'] as AppRole[],
      consulted: [] as AppRole[],
      informed: ['supervisor'] as AppRole[]
    },
    record_session: {
      responsible: ['therapist'] as AppRole[],
      accountable: ['therapist'] as AppRole[],
      consulted: [] as AppRole[],
      informed: ['administrator'] as AppRole[]
    },
    manage_consent: {
      responsible: ['administrator'] as AppRole[],
      accountable: ['administrator'] as AppRole[],
      consulted: ['therapist'] as AppRole[],
      informed: ['therapist'] as AppRole[]
    }
  }
};

/**
 * Check if a user has permission to perform an action based on RACI matrix
 */
export function checkRACIPermission(
  module: keyof typeof RACI_MATRIX,
  action: string,
  userRoles: AppRole[],
  checkType: 'responsible' | 'accountable' = 'responsible'
): RACICheck {
  const moduleActions = RACI_MATRIX[module] as Record<string, RACIPermission>;
  const actionPermissions = moduleActions[action];

  if (!actionPermissions) {
    return {
      canPerform: false,
      reason: `Unknown action: ${action} in module: ${module}`
    };
  }

  const allowedRoles = actionPermissions[checkType];
  const hasPermission = userRoles.some(role => allowedRoles.includes(role));

  if (!hasPermission) {
    return {
      canPerform: false,
      reason: `User does not have ${checkType} role for this action`,
      requiredRole: allowedRoles[0],
      mustConsult: actionPermissions.consulted
    };
  }

  return {
    canPerform: true,
    mustConsult: actionPermissions.consulted
  };
}

/**
 * Get all users that should be informed about an action
 */
export function getInformedRoles(
  module: keyof typeof RACI_MATRIX,
  action: string
): AppRole[] {
  const moduleActions = RACI_MATRIX[module] as Record<string, RACIPermission>;
  const actionPermissions = moduleActions[action];

  if (!actionPermissions) {
    return [];
  }

  return actionPermissions.informed;
}

/**
 * Get all users that should be consulted before an action
 */
export function getConsultedRoles(
  module: keyof typeof RACI_MATRIX,
  action: string
): AppRole[] {
  const moduleActions = RACI_MATRIX[module] as Record<string, RACIPermission>;
  const actionPermissions = moduleActions[action];

  if (!actionPermissions) {
    return [];
  }

  return actionPermissions.consulted;
}

/**
 * Get the accountable role for an action
 */
export function getAccountableRoles(
  module: keyof typeof RACI_MATRIX,
  action: string
): AppRole[] {
  const moduleActions = RACI_MATRIX[module] as Record<string, RACIPermission>;
  const actionPermissions = moduleActions[action];

  if (!actionPermissions) {
    return [];
  }

  return actionPermissions.accountable;
}

/**
 * Generate a human-readable permission message
 */
export function getPermissionMessage(check: RACICheck): string {
  if (check.canPerform) {
    if (check.mustConsult && check.mustConsult.length > 0) {
      return `You can perform this action. Please consult with: ${check.mustConsult.join(', ')}`;
    }
    return 'You have permission to perform this action.';
  }

  let message = check.reason || 'Permission denied';
  
  if (check.requiredRole) {
    message += `. Required role: ${check.requiredRole}`;
  }

  return message;
}

/**
 * Validate RACI matrix consistency
 * Ensures every action has at least one responsible and one accountable role
 */
export function validateRACIMatrix(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  Object.entries(RACI_MATRIX).forEach(([module, actions]) => {
    Object.entries(actions).forEach(([action, permissions]) => {
      if (permissions.responsible.length === 0) {
        errors.push(`${module}.${action}: No responsible roles defined`);
      }
      if (permissions.accountable.length === 0) {
        errors.push(`${module}.${action}: No accountable roles defined`);
      }
    });
  });

  return {
    valid: errors.length === 0,
    errors
  };
}
