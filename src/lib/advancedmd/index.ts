/**
 * AdvancedMD Integration Module
 *
 * Main entry point for AdvancedMD API integration
 */

// Export configuration
export {
  getAdvancedMDConfig,
  ADVANCEDMD_ENDPOINTS,
  RATE_LIMITS,
  ErrorCode,
  type AdvancedMDEnvironment,
  type AdvancedMDConfig
} from './config';

// Export types
export type {
  AuthToken,
  AuthResponse,
  APIResponse,
  APIError,
  EligibilityRequest,
  EligibilityResponse,
  CoverageStatus,
  Benefit,
  ClaimSubmissionRequest,
  ClaimSubmissionResponse,
  ClaimStatusResponse,
  ClaimServiceLine,
  ClaimDiagnosis,
  ClaimAttachment,
  ClaimStatus,
  ClaimType,
  ValidationError,
  ClaimStatusHistoryItem,
  ERARequest,
  ERAResponse,
  ERAClaimPayment,
  ERAServiceLine,
  ERAdjustment,
  PatientSyncRequest,
  PatientSyncResponse,
  PatientInsurance,
  DuplicatePatient,
  Provider,
  PayerEnrollment,
  RateLimitInfo,
  RateLimitStatus,
  APIAuditLog
} from './types';

// Export API client
export { AdvancedMDClient, getAdvancedMDClient } from './api-client';

// Export test utilities
export {
  testAuthentication,
  testEligibilityCheck,
  testClaimSubmission,
  testPatientSync,
  testERARetrieval,
  testRateLimits,
  runAllTests,
  generateSampleEligibilityResponse,
  generateSampleClaim
} from './test-utils';
