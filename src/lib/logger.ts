/**
 * HIPAA-Compliant Logging Utility
 * 
 * This logger automatically:
 * - Suppresses all logs in production
 * - Redacts PHI (Protected Health Information) patterns
 * - Provides structured logging for development debugging
 * - Never logs full error objects that might contain PHI
 * 
 * CRITICAL: Use this instead of console.log/error in production code
 */

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

interface LogContext {
  operation?: string;
  component?: string;
  [key: string]: unknown;
}

// PHI patterns to redact from any logged data
const PHI_PATTERNS = [
  // Identifiers
  /client_id/gi,
  /clientId/gi,
  /patient_id/gi,
  /medical_record_number/gi,
  /mrn/gi,
  
  // Personal information
  /ssn/gi,
  /social_security_number/gi,
  /date_of_birth/gi,
  /dob/gi,
  
  // Contact information
  /email/gi,
  /phone/gi,
  /address/gi,
  /primary_phone/gi,
  
  // Clinical data
  /diagnosis/gi,
  /symptoms/gi,
  /treatment/gi,
  /medications/gi,
  /chief_complaint/gi,
  
  // Insurance
  /insurance/gi,
  /policy_number/gi,
  /subscriber_id/gi,
  /member_id/gi,
  
  // Authentication
  /password/gi,
  /token/gi,
  /access_token/gi,
  /refresh_token/gi,
  /api_key/gi,
  
  // Session data
  /session_id/gi,
  /appointment_id/gi,
];

/**
 * Redacts PHI from log messages and context
 */
function redactPHI(data: unknown): unknown {
  if (typeof data === 'string') {
    let redacted = data;
    PHI_PATTERNS.forEach(pattern => {
      redacted = redacted.replace(pattern, '[REDACTED]');
    });
    return redacted;
  }
  
  if (typeof data === 'object' && data !== null) {
    const redacted: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      // Check if key itself contains PHI
      const isPHIKey = PHI_PATTERNS.some(pattern => pattern.test(key));
      if (isPHIKey) {
        redacted[key] = '[REDACTED]';
      } else {
        redacted[key] = redactPHI(value);
      }
    }
    return redacted;
  }
  
  return data;
}

/**
 * Creates a safe log message with PHI redaction
 */
function createSafeLogMessage(level: LogLevel, message: string, context?: LogContext): void {
  // CRITICAL: Never log anything in production
  if (import.meta.env.PROD) {
    return;
  }
  
  const timestamp = new Date().toISOString();
  const redactedMessage = redactPHI(message);
  const redactedContext = context ? redactPHI(context) : undefined;
  
  const logData = {
    timestamp,
    level,
    message: redactedMessage,
    ...(redactedContext && { context: redactedContext }),
  };
  
  // Use appropriate console method based on level
  switch (level) {
    case 'error':
      console.error(`[${timestamp}] ERROR:`, redactedMessage, redactedContext || '');
      break;
    case 'warn':
      console.warn(`[${timestamp}] WARN:`, redactedMessage, redactedContext || '');
      break;
    case 'info':
      console.info(`[${timestamp}] INFO:`, redactedMessage, redactedContext || '');
      break;
    case 'debug':
      console.log(`[${timestamp}] DEBUG:`, redactedMessage, redactedContext || '');
      break;
  }
}

/**
 * HIPAA-compliant logger
 * 
 * Usage:
 * ```typescript
 * import { logger } from '@/lib/logger';
 * 
 * // Development-only logging
 * if (import.meta.env.DEV) {
 *   logger.error('Operation failed', { operation: 'loadClient' });
 * }
 * ```
 */
export const logger = {
  error: (message: string, context?: LogContext) => {
    createSafeLogMessage('error', message, context);
  },
  
  warn: (message: string, context?: LogContext) => {
    createSafeLogMessage('warn', message, context);
  },
  
  info: (message: string, context?: LogContext) => {
    createSafeLogMessage('info', message, context);
  },
  
  debug: (message: string, context?: LogContext) => {
    createSafeLogMessage('debug', message, context);
  },
};

/**
 * Safe error handler that never logs PHI
 * 
 * Usage:
 * ```typescript
 * try {
 *   await riskyOperation();
 * } catch (error) {
 *   logSafeError('Operation failed', error, { operation: 'riskyOperation' });
 *   toast.error('Operation failed. Please try again.');
 * }
 * ```
 */
export function logSafeError(
  userMessage: string,
  error: unknown,
  context?: LogContext
): void {
  if (import.meta.env.DEV) {
    logger.error(userMessage, {
      ...context,
      errorType: error instanceof Error ? error.name : 'Unknown',
      // Never log the actual error message as it might contain PHI
    });
  }
}
