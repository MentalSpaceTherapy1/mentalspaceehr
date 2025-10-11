/**
 * AdvancedMD API Type Definitions
 *
 * Comprehensive type system for AdvancedMD integration
 */

import { ErrorCode } from './config';

// ============================================================================
// Authentication Types
// ============================================================================

export interface AuthToken {
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
  tokenType: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: APIError;
  metadata?: {
    requestId: string;
    timestamp: string;
    duration: number;
  };
}

export interface APIError {
  code: ErrorCode | string;
  message: string;
  details?: Record<string, any>;
  retryable: boolean;
}

// ============================================================================
// Eligibility Types
// ============================================================================

export type CoverageStatus = 'Active' | 'Inactive' | 'Pending' | 'Terminated';

export interface EligibilityRequest {
  clientId: string;
  insuranceId: string;
  serviceDate: string; // YYYY-MM-DD
  serviceType?: string;
  cptCode?: string;
}

export interface EligibilityResponse {
  coverageStatus: CoverageStatus;

  // Financial Information
  copay?: number;
  coinsurance?: number;
  deductibleTotal?: number;
  deductibleMet?: number;
  deductibleRemaining?: number;
  oopMaxTotal?: number;
  oopMaxMet?: number;
  oopMaxRemaining?: number;

  // Coverage Details
  payerName: string;
  payerId: string;
  memberId: string;
  groupNumber?: string;
  planName?: string;
  effectiveDate?: string;
  terminationDate?: string;

  // Service-Specific
  serviceType?: string;
  cptCode?: string;
  priorAuthRequired?: boolean;
  priorAuthNumber?: string;

  // Additional Information
  benefits?: Benefit[];
  limitations?: string[];

  // Metadata
  checkDate: string;
  responseCode: string;
  rawResponse?: Record<string, any>;
}

export interface Benefit {
  serviceType: string;
  coverageLevel: string;
  inNetwork: boolean;
  copay?: number;
  coinsurance?: number;
  limitationType?: string;
  limitationAmount?: number;
  limitationPeriod?: string;
}

// ============================================================================
// Claim Types
// ============================================================================

export type ClaimStatus =
  | 'Draft'
  | 'Ready'
  | 'Submitted'
  | 'Accepted'
  | 'Rejected'
  | 'In Process'
  | 'Paid'
  | 'Denied'
  | 'Appealed'
  | 'Void';

export type ClaimType = 'Original' | 'Replacement' | 'Void';

export interface ClaimSubmissionRequest {
  claimId: string;
  claimType: ClaimType;

  // Patient Information
  patientId: string;
  subscriberId?: string;

  // Insurance Information
  insuranceId: string;

  // Provider Information
  billingProviderId: string;
  renderingProviderId: string;
  serviceFacilityId?: string;

  // Service Information
  statementFromDate: string;
  statementToDate: string;
  serviceLines: ClaimServiceLine[];
  diagnoses: ClaimDiagnosis[];

  // Attachments
  attachments?: ClaimAttachment[];

  // Additional Information
  notes?: string;
  priorAuthNumber?: string;
}

export interface ClaimServiceLine {
  lineNumber: number;
  serviceDate: string;
  placeOfService: string;
  cptCode: string;
  modifiers?: string[];
  units: number;
  unitCharge: number;
  diagnosisPointers: number[];
}

export interface ClaimDiagnosis {
  diagnosisCode: string;
  diagnosisPointer: number;
  diagnosisType?: 'primary' | 'secondary';
}

export interface ClaimAttachment {
  attachmentType: string;
  fileName: string;
  fileContent: string; // Base64 encoded
  fileType: string;
}

export interface ClaimSubmissionResponse {
  claimId: string;
  claimControlNumber: string;
  submissionDate: string;
  status: ClaimStatus;
  clearinghouseStatus?: string;
  validationErrors?: ValidationError[];
  rawResponse?: Record<string, any>;
}

export interface ValidationError {
  field: string;
  code: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ClaimStatusResponse {
  claimId: string;
  claimControlNumber: string;
  payerClaimControlNumber?: string;
  status: ClaimStatus;
  submissionDate: string;
  acceptedDate?: string;
  paidDate?: string;

  // Financial
  billedAmount: number;
  allowedAmount?: number;
  paidAmount?: number;
  patientResponsibility?: number;

  // Status Details
  clearinghouseStatus?: string;
  payerStatus?: string;
  denialCode?: string;
  denialReason?: string;

  statusHistory?: ClaimStatusHistoryItem[];
}

export interface ClaimStatusHistoryItem {
  status: ClaimStatus;
  statusDate: string;
  notes?: string;
}

// ============================================================================
// ERA (Electronic Remittance Advice) Types
// ============================================================================

export interface ERARequest {
  startDate: string;
  endDate: string;
  payerId?: string;
  checkNumber?: string;
}

export interface ERAResponse {
  eraId: string;
  eraFileId: string;

  // Payer Information
  payerName: string;
  payerId: string;

  // Payment Information
  checkNumber: string;
  checkDate: string;
  checkAmount: number;
  paymentMethod: 'CHK' | 'ACH' | 'EFT' | 'WIRE';

  // Claims
  claimPayments: ERAClaimPayment[];

  // Raw Data
  edi835Content?: string;
  rawData?: Record<string, any>;
}

export interface ERAClaimPayment {
  claimId?: string;
  claimControlNumber: string;
  payerClaimControlNumber?: string;

  // Patient Information
  patientName: string;
  patientAccountNumber?: string;

  // Financial
  billedAmount: number;
  allowedAmount?: number;
  paidAmount: number;
  patientResponsibility: number;

  // Service Lines
  serviceLines: ERAServiceLine[];

  // Status
  claimStatus: string;
}

export interface ERAServiceLine {
  serviceDate: string;
  cptCode: string;
  modifiers?: string[];

  // Financial
  billedAmount: number;
  allowedAmount?: number;
  paidAmount: number;

  // Patient Responsibility Breakdown
  deductibleAmount: number;
  coinsuranceAmount: number;
  copayAmount: number;

  // Adjustments
  adjustments: ERAdjustment[];
}

export interface ERAdjustment {
  groupCode: string; // CO, PR, OA, PI
  reasonCode: string; // CARC code
  amount: number;
  quantity?: number;
}

// ============================================================================
// Patient Types
// ============================================================================

export interface PatientSyncRequest {
  // Demographics
  firstName: string;
  lastName: string;
  middleName?: string;
  dateOfBirth: string;
  gender: string;
  ssn?: string;

  // Contact Information
  address1: string;
  address2?: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  email?: string;

  // Insurance
  insurances?: PatientInsurance[];

  // Internal IDs
  medicalRecordNumber?: string;
  internalPatientId: string;
}

export interface PatientInsurance {
  rank: 'Primary' | 'Secondary' | 'Tertiary';
  insuranceCompany: string;
  payerId: string;
  memberId: string;
  groupNumber?: string;
  subscriberRelationship: string;
  subscriberFirstName?: string;
  subscriberLastName?: string;
  subscriberDateOfBirth?: string;
}

export interface PatientSyncResponse {
  advancedMDPatientId: string;
  internalPatientId: string;
  status: 'created' | 'updated' | 'duplicate_found';
  duplicates?: DuplicatePatient[];
}

export interface DuplicatePatient {
  advancedMDPatientId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  matchScore: number;
}

// ============================================================================
// Provider Types
// ============================================================================

export interface Provider {
  providerId: string;
  npi: string;
  taxonomyCode?: string;
  licenseNumber?: string;

  // Name
  firstName: string;
  lastName: string;
  middleName?: string;
  credentials?: string;

  // Contact
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  phone?: string;

  // Payer Enrollment
  payerEnrollments?: PayerEnrollment[];
}

export interface PayerEnrollment {
  payerId: string;
  payerName: string;
  enrollmentStatus: 'Enrolled' | 'Pending' | 'Not Enrolled';
  enrollmentDate?: string;
  providerNumber?: string;
}

// ============================================================================
// Rate Limit Types
// ============================================================================

export interface RateLimitInfo {
  endpoint: string;
  requestsRemaining: number;
  resetTime: Date;
  retryAfter?: number; // seconds
}

export interface RateLimitStatus {
  withinLimit: boolean;
  limitInfo: RateLimitInfo;
}

// ============================================================================
// Audit Log Types
// ============================================================================

export interface APIAuditLog {
  id: string;
  endpoint: string;
  method: string;
  requestBody?: Record<string, any>;
  responseBody?: Record<string, any>;
  statusCode: number;
  duration: number;
  error?: string;
  userId?: string;
  timestamp: Date;
}
