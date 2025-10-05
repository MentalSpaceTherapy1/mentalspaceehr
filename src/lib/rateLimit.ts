/**
 * Rate Limiting Utility for Security
 * Tracks operations per user and enforces limits
 */

interface RateLimitRecord {
  count: number;
  firstAttempt: number;
  lastAttempt: number;
}

const rateLimits = new Map<string, RateLimitRecord>();

/**
 * Check if an operation is rate limited
 * @param userId - User ID performing the operation
 * @param operation - Type of operation (e.g., 'password_reset', 'send_invitation')
 * @param maxAttempts - Maximum attempts allowed
 * @param windowMs - Time window in milliseconds
 * @returns Object with isLimited flag and remaining attempts
 */
export function checkRateLimit(
  userId: string,
  operation: string,
  maxAttempts: number = 10,
  windowMs: number = 60 * 60 * 1000 // 1 hour default
): { isLimited: boolean; remainingAttempts: number; resetTime?: Date } {
  const key = `${userId}:${operation}`;
  const now = Date.now();
  
  const record = rateLimits.get(key);
  
  // No previous attempts or window expired
  if (!record || now - record.firstAttempt > windowMs) {
    rateLimits.set(key, {
      count: 1,
      firstAttempt: now,
      lastAttempt: now,
    });
    return { isLimited: false, remainingAttempts: maxAttempts - 1 };
  }
  
  // Within the time window
  if (record.count >= maxAttempts) {
    const resetTime = new Date(record.firstAttempt + windowMs);
    return { 
      isLimited: true, 
      remainingAttempts: 0,
      resetTime 
    };
  }
  
  // Increment count
  record.count++;
  record.lastAttempt = now;
  rateLimits.set(key, record);
  
  return { 
    isLimited: false, 
    remainingAttempts: maxAttempts - record.count 
  };
}

/**
 * Reset rate limit for a user and operation
 */
export function resetRateLimit(userId: string, operation: string): void {
  const key = `${userId}:${operation}`;
  rateLimits.delete(key);
}

/**
 * Clean up expired rate limit records (call periodically)
 */
export function cleanupExpiredRateLimits(): void {
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;
  
  for (const [key, record] of rateLimits.entries()) {
    if (now - record.firstAttempt > oneHour) {
      rateLimits.delete(key);
    }
  }
}

// Clean up every 15 minutes
if (typeof window !== 'undefined') {
  setInterval(cleanupExpiredRateLimits, 15 * 60 * 1000);
}
