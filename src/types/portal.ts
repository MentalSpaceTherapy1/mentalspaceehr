// ============================================
// PORTAL DATA MODELS
// ============================================

export type AccountStatus = 'Active' | 'Inactive' | 'Locked' | 'Pending Verification';
export type MFAMethod = 'sms' | 'email' | 'authenticator';
export type PreferredContactMethod = 'email' | 'sms' | 'phone' | 'portal';
export type Theme = 'light' | 'dark' | 'system';
export type RelationshipType = 'parent' | 'legal_guardian' | 'foster_parent' | 'custodial_grandparent' | 'other';
export type GuardianStatus = 'active' | 'inactive' | 'pending_verification';

/**
 * Portal User Account
 * Comprehensive model for client portal access
 */
export interface PortalAccount {
  portalUserId: string;
  clientId: string;
  
  // Login Credentials (managed by Supabase Auth)
  email: string;
  emailVerified: boolean;
  
  // Account Status
  accountStatus: AccountStatus;
  portalEnabled: boolean;
  portalInvitationSentAt?: Date;
  
  // Security
  lastLoginDate?: Date;
  failedLoginAttempts: number;
  accountLockedUntil?: Date;
  
  // MFA
  mfaEnabled: boolean;
  mfaMethod?: MFAMethod;
  
  // Preferences
  preferences: PortalPreferences;
  
  // Access
  portalAccessGranted: boolean;
  grantedBy?: string;
  grantedDate?: Date;
  
  // Guardian Account
  isGuardianAccount: boolean;
  minorClientIds?: string[];
  guardianRelationships?: GuardianRelationship[];
  
  // Metadata
  createdDate: Date;
  lastModifiedDate: Date;
}

/**
 * Portal Preferences
 * User customization and notification settings
 */
export interface PortalPreferences {
  id: string;
  clientId: string;
  
  // Notification Settings
  emailNotifications: boolean;
  smsNotifications: boolean;
  appointmentReminders: boolean;
  billingReminders: boolean;
  messageNotifications: boolean;
  
  // Communication Preferences
  preferredContactMethod: PreferredContactMethod;
  reminderHoursBefore: number;
  
  // Display Settings
  theme: Theme;
  language: string;
  timezone: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Guardian Relationship
 * Links guardian accounts to minor client accounts
 */
export interface GuardianRelationship {
  id: string;
  guardianClientId: string;
  minorClientId: string;
  
  // Relationship Details
  relationshipType: RelationshipType;
  
  // Legal Documentation
  legalDocumentPath?: string;
  legalDocumentVerified: boolean;
  verifiedBy?: string;
  verifiedDate?: Date;
  
  // Access Permissions
  canViewNotes: boolean;
  canScheduleAppointments: boolean;
  canViewBilling: boolean;
  canCommunicateWithClinician: boolean;
  
  // Status
  status: GuardianStatus;
  notes?: string;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}

/**
 * Portal Account Security
 * Security settings and authentication data
 */
export interface PortalAccountSecurity {
  id: string;
  clientId: string;
  portalUserId?: string;
  
  // MFA Settings
  mfaEnabled: boolean;
  mfaMethod?: MFAMethod;
  mfaPhone?: string;
  mfaSecret?: string;
  mfaBackupCodes?: string[];
  
  // Login Tracking
  failedLoginAttempts: number;
  accountLockedUntil?: Date;
  lastPasswordChange?: Date;
  passwordResetToken?: string;
  passwordResetTokenExpires?: Date;
  
  // Security Questions
  securityQuestions: SecurityQuestion[];
  
  // Session Management
  maxConcurrentSessions: number;
  activeSessionTokens: string[];
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Security Question
 * For additional account verification
 */
export interface SecurityQuestion {
  question: string;
  answer: string; // Hashed
}

/**
 * Portal Access Log
 * Audit trail of portal access
 */
export interface PortalAccessLog {
  id: string;
  clientId: string;
  portalUserId?: string;
  
  action: string;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  success: boolean;
  failureReason?: string;
  
  createdAt: Date;
}

/**
 * Client Portal Context
 * Full context for a portal user session
 */
export interface ClientPortalContext {
  account: PortalAccount;
  client: ClientInfo;
  preferences: PortalPreferences;
  security: PortalAccountSecurity;
  guardianRelationships?: GuardianRelationship[];
  minorClients?: ClientInfo[];
}

/**
 * Client Info (simplified for portal)
 * Essential client information for portal display
 */
export interface ClientInfo {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  email?: string;
  phone?: string;
  medicalRecordNumber: string;
  primaryTherapist?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  status: string;
}

/**
 * Portal Invitation
 * For inviting clients to create portal accounts
 */
export interface PortalInvitation {
  clientId: string;
  email: string;
  invitationToken: string;
  expiresAt: Date;
  sentBy: string;
  sentAt: Date;
  acceptedAt?: Date;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
}

/**
 * Portal Statistics
 * Dashboard metrics for portal usage
 */
export interface PortalStatistics {
  totalAccounts: number;
  activeAccounts: number;
  pendingInvitations: number;
  guardianAccounts: number;
  accountsWithMFA: number;
  recentLogins: number;
  failedLoginAttempts: number;
}
