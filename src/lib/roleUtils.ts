import { AppRole } from '@/hooks/useUserRoles';

export const hasRole = (roles: AppRole[], targetRole: AppRole): boolean => {
  return roles.includes(targetRole);
};

export const isAdmin = (roles: AppRole[]): boolean => {
  return hasRole(roles, 'administrator');
};

export const canManageUsers = (roles: AppRole[]): boolean => {
  return isAdmin(roles);
};

export const roleDisplayNames: Record<AppRole, string> = {
  administrator: 'Administrator',
  supervisor: 'Supervisor',
  therapist: 'Therapist/Clinician',
  billing_staff: 'Billing Staff',
  front_desk: 'Front Desk/Scheduler',
  associate_trainee: 'Associate/Trainee'
};

export const roleDescriptions: Record<AppRole, string> = {
  administrator: 'Full system access, user management, practice settings',
  supervisor: 'View and co-sign supervisee notes, track supervision hours',
  therapist: 'Manage schedule, document notes, view assigned patients',
  billing_staff: 'Access billing module, process claims and payments',
  front_desk: 'Manage appointments, check-in/out patients, send reminders',
  associate_trainee: 'Limited access, requires supervisor co-signature on all notes'
};

export const roleColors: Record<AppRole, string> = {
  administrator: 'destructive',
  supervisor: 'default',
  therapist: 'secondary',
  billing_staff: 'outline',
  front_desk: 'outline',
  associate_trainee: 'outline'
};
