/**
 * Database-Backed Rate Limiting Utility for Security
 * Tracks operations per user using database persistence
 * HIPAA-compliant with proper audit trail
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from './logger';

interface RateLimitResult {
  isLimited: boolean;
  remainingAttempts: number;
  resetTime?: Date;
}

/**
 * Check if an operation is rate limited using database-backed storage
 * @param userId - User ID performing the operation
 * @param operation - Type of operation (e.g., 'password_reset', 'send_invitation', 'login_attempt')
 * @param maxAttempts - Maximum attempts allowed (default: 10)
 * @param windowMinutes - Time window in minutes (default: 60)
 * @returns Object with isLimited flag, remaining attempts, and reset time
 */
export async function checkRateLimit(
  userId: string,
  operation: string,
  maxAttempts: number = 10,
  windowMinutes: number = 60
): Promise<RateLimitResult> {
  try {
    // Call database function to check and update rate limit
    const { data, error } = await supabase.rpc('check_rate_limit', {
      p_user_id: userId,
      p_operation: operation,
      p_max_attempts: maxAttempts,
      p_window_minutes: windowMinutes
    });

    if (error) {
      logger.error('Rate limit check failed', { error, userId, operation });
      // Fail open - don't block users if rate limiting system is down
      return { isLimited: false, remainingAttempts: maxAttempts };
    }

    if (!data || data.length === 0) {
      return { isLimited: false, remainingAttempts: maxAttempts };
    }

    const result = data[0];
    return {
      isLimited: result.is_limited,
      remainingAttempts: result.remaining_attempts,
      resetTime: result.reset_time ? new Date(result.reset_time) : undefined
    };
  } catch (err) {
    logger.error('Rate limit exception', { error: err, userId, operation });
    // Fail open - don't block users on errors
    return { isLimited: false, remainingAttempts: maxAttempts };
  }
}

/**
 * Reset rate limit for a user and operation
 * Used for administrative override or after successful verification
 */
export async function resetRateLimit(
  userId: string, 
  operation: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('rate_limits')
      .delete()
      .eq('user_id', userId)
      .eq('operation', operation);

    if (error) {
      logger.error('Failed to reset rate limit', { error, userId, operation });
    }
  } catch (err) {
    logger.error('Rate limit reset exception', { error: err, userId, operation });
  }
}
