/**
 * AdvancedMD API Client
 *
 * Handles all communication with AdvancedMD API including:
 * - OAuth 2.0 authentication and token rotation
 * - Rate limiting and quota management
 * - Request/response handling with retries
 * - Error handling and logging
 */

import { supabase } from '@/integrations/supabase/client';
import { getAdvancedMDConfig, ADVANCEDMD_ENDPOINTS, RATE_LIMITS, ERROR_CODES } from './config';
import type {
  AuthToken,
  AuthResponse,
  APIResponse,
  APIError,
  EligibilityRequest,
  EligibilityResponse,
  ClaimSubmissionRequest,
  ClaimSubmissionResponse,
  ClaimStatusResponse,
  ERARequest,
  ERAResponse,
  PatientSyncRequest,
  PatientSyncResponse,
  RateLimitInfo,
  RateLimitStatus,
  APIAuditLog
} from './types';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: Record<string, any>;
  headers?: Record<string, string>;
  skipAuth?: boolean;
  retryAttempts?: number;
}

interface RateLimitBucket {
  requests: number;
  resetTime: Date;
}

export class AdvancedMDClient {
  private config = getAdvancedMDConfig();
  private currentToken: AuthToken | null = null;
  private tokenRefreshPromise: Promise<AuthToken> | null = null;

  // Rate limit tracking
  private rateLimits: Map<string, RateLimitBucket> = new Map();

  constructor() {
    this.initializeRateLimits();
  }

  // ============================================================================
  // Authentication
  // ============================================================================

  /**
   * Authenticate with AdvancedMD OAuth 2.0
   */
  async authenticate(): Promise<AuthToken> {
    try {
      console.log('[AdvancedMD] Authenticating with OAuth 2.0...');

      // Call Supabase Edge Function to securely authenticate
      const { data, error } = await supabase.functions.invoke('advancedmd-auth', {
        body: {
          environment: this.config.environment,
          grant_type: 'client_credentials',
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret
        }
      });

      if (error) {
        throw this.createError(
          ERROR_CODES.AUTH_FAILED,
          'Failed to authenticate with AdvancedMD',
          { error },
          true
        );
      }

      const authResponse: AuthResponse = data;
      const token: AuthToken = {
        accessToken: authResponse.access_token,
        refreshToken: authResponse.refresh_token,
        expiresAt: new Date(Date.now() + authResponse.expires_in * 1000),
        tokenType: authResponse.token_type
      };

      this.currentToken = token;

      // Store token in database for server-side use
      await this.storeToken(token);

      // Schedule token refresh (rotate 1 hour before expiry)
      this.scheduleTokenRefresh(authResponse.expires_in - 3600);

      console.log('[AdvancedMD] Authentication successful, token expires at:', token.expiresAt);
      return token;

    } catch (error) {
      console.error('[AdvancedMD] Authentication error:', error);
      throw error;
    }
  }

  /**
   * Refresh the access token
   */
  private async refreshToken(): Promise<AuthToken> {
    if (this.tokenRefreshPromise) {
      return this.tokenRefreshPromise;
    }

    this.tokenRefreshPromise = (async () => {
      try {
        console.log('[AdvancedMD] Refreshing access token...');

        if (!this.currentToken?.refreshToken) {
          return this.authenticate();
        }

        const { data, error } = await supabase.functions.invoke('advancedmd-auth', {
          body: {
            environment: this.config.environment,
            grant_type: 'refresh_token',
            refresh_token: this.currentToken.refreshToken,
            client_id: this.config.clientId,
            client_secret: this.config.clientSecret
          }
        });

        if (error) {
          console.warn('[AdvancedMD] Token refresh failed, re-authenticating...');
          return this.authenticate();
        }

        const authResponse: AuthResponse = data;
        const token: AuthToken = {
          accessToken: authResponse.access_token,
          refreshToken: authResponse.refresh_token,
          expiresAt: new Date(Date.now() + authResponse.expires_in * 1000),
          tokenType: authResponse.token_type
        };

        this.currentToken = token;
        await this.storeToken(token);
        this.scheduleTokenRefresh(authResponse.expires_in - 3600);

        console.log('[AdvancedMD] Token refreshed successfully');
        return token;

      } finally {
        this.tokenRefreshPromise = null;
      }
    })();

    return this.tokenRefreshPromise;
  }

  /**
   * Get valid access token (refresh if needed)
   */
  private async getValidToken(): Promise<string> {
    if (!this.currentToken) {
      await this.authenticate();
    }

    // Check if token is expired or will expire in next 5 minutes
    const expiresAt = this.currentToken!.expiresAt.getTime();
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;

    if (expiresAt - now < fiveMinutes) {
      await this.refreshToken();
    }

    return this.currentToken!.accessToken;
  }

  /**
   * Schedule automatic token refresh
   */
  private scheduleTokenRefresh(seconds: number): void {
    setTimeout(() => {
      this.refreshToken().catch(err => {
        console.error('[AdvancedMD] Scheduled token refresh failed:', err);
      });
    }, seconds * 1000);
  }

  /**
   * Store token in database
   */
  private async storeToken(token: AuthToken): Promise<void> {
    try {
      const sb = supabase as any;
      const { error } = await sb
        .from('advancedmd_auth_tokens')
        .upsert({
          environment: this.config.environment,
          access_token: token.accessToken,
          refresh_token: token.refreshToken,
          expires_at: token.expiresAt.toISOString(),
          token_type: token.tokenType,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'environment'
        });

      if (error) {
        console.error('[AdvancedMD] Failed to store token:', error);
      }
    } catch (error) {
      console.error('[AdvancedMD] Token storage error:', error);
    }
  }

  // ============================================================================
  // Rate Limiting
  // ============================================================================

  /**
   * Initialize rate limit buckets
   */
  private initializeRateLimits(): void {
    const now = new Date();

    this.rateLimits.set('second', {
      requests: 0,
      resetTime: new Date(now.getTime() + 1000)
    });

    this.rateLimits.set('minute', {
      requests: 0,
      resetTime: new Date(now.getTime() + 60000)
    });

    this.rateLimits.set('hour', {
      requests: 0,
      resetTime: new Date(now.getTime() + 3600000)
    });

    this.rateLimits.set('day', {
      requests: 0,
      resetTime: new Date(now.setHours(23, 59, 59, 999))
    });
  }

  /**
   * Check if request is within rate limits
   */
  private checkRateLimit(endpoint: string): RateLimitStatus {
    const now = new Date();

    // Check each time bucket
    for (const [period, bucket] of this.rateLimits) {
      if (now >= bucket.resetTime) {
        // Reset bucket
        bucket.requests = 0;
        bucket.resetTime = this.getNextResetTime(period);
      }

      const limit = this.getRateLimit(period);
      if (bucket.requests >= limit) {
        return {
          withinLimit: false,
          limitInfo: {
            endpoint,
            requestsRemaining: 0,
            resetTime: bucket.resetTime,
            retryAfter: Math.ceil((bucket.resetTime.getTime() - now.getTime()) / 1000)
          }
        };
      }
    }

    // All limits OK
    const secondBucket = this.rateLimits.get('second')!;
    return {
      withinLimit: true,
      limitInfo: {
        endpoint,
        requestsRemaining: RATE_LIMITS.REQUESTS_PER_SECOND - secondBucket.requests,
        resetTime: secondBucket.resetTime
      }
    };
  }

  /**
   * Increment rate limit counters
   */
  private incrementRateLimits(): void {
    for (const bucket of this.rateLimits.values()) {
      bucket.requests++;
    }
  }

  /**
   * Get rate limit for time period
   */
  private getRateLimit(period: string): number {
    switch (period) {
      case 'second': return RATE_LIMITS.REQUESTS_PER_SECOND;
      case 'minute': return RATE_LIMITS.REQUESTS_PER_MINUTE;
      case 'hour': return RATE_LIMITS.REQUESTS_PER_HOUR;
      case 'day': return RATE_LIMITS.REQUESTS_PER_DAY;
      default: return RATE_LIMITS.REQUESTS_PER_SECOND;
    }
  }

  /**
   * Get next reset time for period
   */
  private getNextResetTime(period: string): Date {
    const now = new Date();

    switch (period) {
      case 'second':
        return new Date(now.getTime() + 1000);
      case 'minute':
        return new Date(now.getTime() + 60000);
      case 'hour':
        return new Date(now.getTime() + 3600000);
      case 'day':
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        return tomorrow;
      default:
        return new Date(now.getTime() + 1000);
    }
  }

  // ============================================================================
  // HTTP Requests
  // ============================================================================

  /**
   * Make HTTP request to AdvancedMD API
   */
  private async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<APIResponse<T>> {
    const startTime = Date.now();
    const requestId = crypto.randomUUID();

    try {
      // Check rate limits
      const rateLimitStatus = this.checkRateLimit(endpoint);
      if (!rateLimitStatus.withinLimit) {
        throw this.createError(
          ERROR_CODES.RATE_LIMIT_EXCEEDED,
          'Rate limit exceeded',
          { limitInfo: rateLimitStatus.limitInfo },
          true
        );
      }

      // Get access token if needed
      let headers = options.headers || {};
      if (!options.skipAuth) {
        const token = await this.getValidToken();
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Call Supabase Edge Function (secure proxy)
      const { data, error } = await supabase.functions.invoke('advancedmd-proxy', {
        body: {
          environment: this.config.environment,
          endpoint,
          method: options.method || 'GET',
          body: options.body,
          headers
        }
      });

      // Increment rate limit counters
      this.incrementRateLimits();

      const duration = Date.now() - startTime;

      // Log API call
      await this.logAPICall({
        id: requestId,
        endpoint,
        method: options.method || 'GET',
        requestBody: options.body,
        responseBody: data,
        statusCode: error ? 500 : 200,
        duration,
        error: error?.message,
        timestamp: new Date()
      });

      if (error) {
        throw this.createError(
          ERROR_CODES.NETWORK_ERROR,
          'API request failed',
          { error, endpoint },
          this.isRetryable(error)
        );
      }

      return {
        success: true,
        data: data as T,
        metadata: {
          requestId,
          timestamp: new Date().toISOString(),
          duration
        }
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;

      await this.logAPICall({
        id: requestId,
        endpoint,
        method: options.method || 'GET',
        requestBody: options.body,
        statusCode: 500,
        duration,
        error: error.message,
        timestamp: new Date()
      });

      // Handle retries
      const retryAttempts = options.retryAttempts ?? this.config.retryAttempts;
      if (retryAttempts > 0 && this.isRetryable(error)) {
        console.log(`[AdvancedMD] Retrying request (${retryAttempts} attempts remaining)...`);
        await this.delay(this.config.retryDelay);
        return this.request<T>(endpoint, {
          ...options,
          retryAttempts: retryAttempts - 1
        });
      }

      throw error;
    }
  }

  // ============================================================================
  // Public API Methods
  // ============================================================================

  /**
   * Check insurance eligibility
   */
  async checkEligibility(request: EligibilityRequest): Promise<APIResponse<EligibilityResponse>> {
    console.log('[AdvancedMD] Checking eligibility for client:', request.clientId);

    return this.request<EligibilityResponse>(ADVANCEDMD_ENDPOINTS.ELIGIBILITY_CHECK, {
      method: 'POST',
      body: request
    });
  }

  /**
   * Submit insurance claim
   */
  async submitClaim(request: ClaimSubmissionRequest): Promise<APIResponse<ClaimSubmissionResponse>> {
    console.log('[AdvancedMD] Submitting claim:', request.claimId);

    return this.request<ClaimSubmissionResponse>(ADVANCEDMD_ENDPOINTS.CLAIM_SUBMIT, {
      method: 'POST',
      body: request
    });
  }

  /**
   * Get claim status
   */
  async getClaimStatus(claimId: string): Promise<APIResponse<ClaimStatusResponse>> {
    console.log('[AdvancedMD] Getting claim status:', claimId);

    return this.request<ClaimStatusResponse>(`${ADVANCEDMD_ENDPOINTS.CLAIM_STATUS}/${claimId}`, {
      method: 'GET'
    });
  }

  /**
   * Get ERAs (Electronic Remittance Advice)
   */
  async getERAs(request: ERARequest): Promise<APIResponse<ERAResponse[]>> {
    console.log('[AdvancedMD] Fetching ERAs from', request.startDate, 'to', request.endDate);

    return this.request<ERAResponse[]>(ADVANCEDMD_ENDPOINTS.ERA_LIST, {
      method: 'POST',
      body: request
    });
  }

  /**
   * Sync patient to AdvancedMD
   */
  async syncPatient(request: PatientSyncRequest): Promise<APIResponse<PatientSyncResponse>> {
    console.log('[AdvancedMD] Syncing patient:', request.internalPatientId);

    return this.request<PatientSyncResponse>(ADVANCEDMD_ENDPOINTS.PATIENT_CREATE, {
      method: 'POST',
      body: request
    });
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Create standardized API error
   */
  private createError(
    code: string,
    message: string,
    details?: Record<string, any>,
    retryable: boolean = false
  ): APIError {
    return {
      code,
      message,
      details,
      retryable
    };
  }

  /**
   * Check if error is retryable
   */
  private isRetryable(error: any): boolean {
    const retryableCodes = [
      ERROR_CODES.RATE_LIMIT_EXCEEDED,
      ERROR_CODES.TIMEOUT,
      ERROR_CODES.NETWORK_ERROR
    ];

    return retryableCodes.includes(error.code) ||
           error.retryable === true ||
           error.message?.includes('timeout') ||
           error.message?.includes('network');
  }

  /**
   * Delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Log API call to database
   */
  private async logAPICall(log: APIAuditLog): Promise<void> {
    try {
      const sb = supabase as any;
      const { error } = await sb
        .from('advancedmd_api_logs')
        .insert({
          id: log.id,
          endpoint: log.endpoint,
          method: log.method,
          request_body: log.requestBody,
          response_body: log.responseBody,
          status_code: log.statusCode,
          duration_ms: log.duration,
          error_message: log.error,
          environment: this.config.environment,
          created_at: log.timestamp.toISOString()
        });

      if (error) {
        console.error('[AdvancedMD] Failed to log API call:', error);
      }
    } catch (error) {
      console.error('[AdvancedMD] API logging error:', error);
    }
  }

  /**
   * Get current rate limit status
   */
  getRateLimitStatus(): Record<string, RateLimitInfo> {
    const status: Record<string, RateLimitInfo> = {};

    for (const [period, bucket] of this.rateLimits) {
      const limit = this.getRateLimit(period);
      status[period] = {
        endpoint: 'global',
        requestsRemaining: limit - bucket.requests,
        resetTime: bucket.resetTime,
        retryAfter: bucket.requests >= limit
          ? Math.ceil((bucket.resetTime.getTime() - Date.now()) / 1000)
          : undefined
      };
    }

    return status;
  }
}

// Singleton instance
let clientInstance: AdvancedMDClient | null = null;

/**
 * Get shared AdvancedMD client instance
 */
export function getAdvancedMDClient(): AdvancedMDClient {
  if (!clientInstance) {
    clientInstance = new AdvancedMDClient();
  }
  return clientInstance;
}
