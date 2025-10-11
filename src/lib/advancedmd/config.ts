/**
 * AdvancedMD API Configuration
 *
 * Manages environment-specific settings for AdvancedMD integration
 * Supports both sandbox and production environments
 */

export type AdvancedMDEnvironment = 'sandbox' | 'production';

export interface AdvancedMDConfig {
  environment: AdvancedMDEnvironment;
  baseUrl: string;
  officeKey: string;
  apiUsername: string;
  apiPassword: string;
  clientId: string;
  clientSecret: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
}

/**
 * Get AdvancedMD configuration based on current environment
 */
export function getAdvancedMDConfig(): AdvancedMDConfig {
  const environment = (import.meta.env.VITE_ADVANCEDMD_ENVIRONMENT || 'sandbox') as AdvancedMDEnvironment;

  const baseConfig = {
    timeout: 30000, // 30 seconds
    retryAttempts: 3,
    retryDelay: 1000, // 1 second
  };

  if (environment === 'production') {
    return {
      ...baseConfig,
      environment: 'production',
      baseUrl: import.meta.env.VITE_ADVANCEDMD_PROD_BASE_URL || 'https://api.advancedmd.com/v1',
      officeKey: import.meta.env.VITE_ADVANCEDMD_PROD_OFFICE_KEY || '',
      apiUsername: import.meta.env.VITE_ADVANCEDMD_PROD_API_USERNAME || '',
      apiPassword: import.meta.env.VITE_ADVANCEDMD_PROD_API_PASSWORD || '',
      clientId: import.meta.env.VITE_ADVANCEDMD_PROD_CLIENT_ID || '',
      clientSecret: import.meta.env.VITE_ADVANCEDMD_PROD_CLIENT_SECRET || '',
    };
  }

  // Sandbox environment (default)
  return {
    ...baseConfig,
    environment: 'sandbox',
    baseUrl: import.meta.env.VITE_ADVANCEDMD_SANDBOX_BASE_URL || 'https://api-sandbox.advancedmd.com/v1',
    officeKey: import.meta.env.VITE_ADVANCEDMD_SANDBOX_OFFICE_KEY || '',
    apiUsername: import.meta.env.VITE_ADVANCEDMD_SANDBOX_API_USERNAME || '',
    apiPassword: import.meta.env.VITE_ADVANCEDMD_SANDBOX_API_PASSWORD || '',
    clientId: import.meta.env.VITE_ADVANCEDMD_SANDBOX_CLIENT_ID || '',
    clientSecret: import.meta.env.VITE_ADVANCEDMD_SANDBOX_CLIENT_SECRET || '',
  };
}

/**
 * Validate that all required configuration is present
 */
export function validateConfig(config: AdvancedMDConfig): void {
  const required = ['officeKey', 'apiUsername', 'apiPassword', 'clientId', 'clientSecret'];
  const missing = required.filter(key => !config[key as keyof AdvancedMDConfig]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required AdvancedMD configuration: ${missing.join(', ')}. ` +
      `Please check your environment variables.`
    );
  }
}

/**
 * API Endpoints
 */
export const ADVANCEDMD_ENDPOINTS = {
  // Authentication
  AUTH_TOKEN: '/oauth/token',

  // Eligibility
  ELIGIBILITY_CHECK: '/eligibility/verify',
  ELIGIBILITY_HISTORY: '/eligibility/history',

  // Claims
  CLAIM_SUBMIT: '/claims/submit',
  CLAIM_STATUS: '/claims/status',
  CLAIM_DETAIL: '/claims/detail',

  // ERA (Electronic Remittance Advice)
  ERA_LIST: '/remittance/list',
  ERA_DETAIL: '/remittance/detail',

  // Patient Management
  PATIENT_CREATE: '/patients/create',
  PATIENT_UPDATE: '/patients/update',
  PATIENT_SEARCH: '/patients/search',
  PATIENT_DETAIL: '/patients/detail',

  // Provider Management
  PROVIDER_LIST: '/providers/list',
  PROVIDER_DETAIL: '/providers/detail',

  // Fee Schedules
  FEE_SCHEDULE_LIST: '/fee-schedules/list',
  FEE_SCHEDULE_DETAIL: '/fee-schedules/detail',
} as const;

/**
 * Rate Limits (as per AdvancedMD documentation)
 * These will be updated once the API limit document is received
 */
export const RATE_LIMITS = {
  // Per second limits
  REQUESTS_PER_SECOND: 10,

  // Per minute limits
  REQUESTS_PER_MINUTE: 100,

  // Per hour limits
  REQUESTS_PER_HOUR: 1000,

  // Per day limits
  REQUESTS_PER_DAY: 10000,

  // Endpoint-specific limits (if any)
  ELIGIBILITY_PER_DAY: 500,
  CLAIMS_PER_BATCH: 100, // Maximum batch size for claim submission
} as const;

/**
 * Error Codes
 */
export const ERROR_CODES = {
  // Authentication Errors
  AUTH_FAILED: 'AUTH_001',
  TOKEN_EXPIRED: 'AUTH_002',
  INVALID_CREDENTIALS: 'AUTH_003',

  // Rate Limit Errors
  RATE_LIMIT_EXCEEDED: 'RATE_001',
  QUOTA_EXCEEDED: 'RATE_002',

  // Request Errors
  INVALID_REQUEST: 'REQ_001',
  MISSING_PARAMETER: 'REQ_002',
  INVALID_PARAMETER: 'REQ_003',

  // Network Errors
  NETWORK_ERROR: 'NET_001',
  TIMEOUT: 'NET_002',

  // Business Logic Errors
  PAYER_NOT_FOUND: 'BIZ_001',
  PATIENT_NOT_COVERED: 'BIZ_002',
  CLAIM_VALIDATION_FAILED: 'BIZ_003',
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];
