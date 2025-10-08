import { useState, useEffect } from 'react';
import { toast } from 'sonner';

interface PasswordValidationResult {
  isBreached: boolean;
  breachCount: number | null;
  isChecking: boolean;
  strength: 'weak' | 'fair' | 'good' | 'strong';
  strengthScore: number;
  suggestions: string[];
}

/**
 * Hook to check if a password has been exposed in data breaches using HIBP API
 * Uses k-anonymity to protect privacy - only sends first 5 chars of SHA-1 hash
 */
export function usePasswordValidation(password: string) {
  const [result, setResult] = useState<PasswordValidationResult>({
    isBreached: false,
    breachCount: null,
    isChecking: false,
    strength: 'weak',
    strengthScore: 0,
    suggestions: [],
  });

  useEffect(() => {
    if (!password || password.length < 8) {
      setResult({
        isBreached: false,
        breachCount: null,
        isChecking: false,
        strength: 'weak',
        strengthScore: 0,
        suggestions: ['Password must be at least 8 characters'],
      });
      return;
    }

    const checkPassword = async () => {
      setResult(prev => ({ ...prev, isChecking: true }));

      try {
        // Calculate password strength
        const strengthResult = calculatePasswordStrength(password);

        // Check for breaches using HIBP k-anonymity API
        const sha1Hash = await sha1(password);
        const hashPrefix = sha1Hash.substring(0, 5).toUpperCase();
        const hashSuffix = sha1Hash.substring(5).toUpperCase();

        const response = await fetch(
          `https://api.pwnedpasswords.com/range/${hashPrefix}`,
          {
            headers: {
              'Add-Padding': 'true', // Extra privacy protection
            },
          }
        );

        if (!response.ok) {
          throw new Error('Failed to check password');
        }

        const text = await response.text();
        const hashes = text.split('\n');
        
        let breachCount = 0;
        let isBreached = false;

        for (const line of hashes) {
          const [suffix, count] = line.split(':');
          if (suffix === hashSuffix) {
            breachCount = parseInt(count, 10);
            isBreached = true;
            break;
          }
        }

        setResult({
          isBreached,
          breachCount,
          isChecking: false,
          ...strengthResult,
        });
      } catch (error) {
        // Fail open - don't block user if API is down
        const strengthResult = calculatePasswordStrength(password);
        setResult({
          isBreached: false,
          breachCount: null,
          isChecking: false,
          ...strengthResult,
        });
      }
    };

    // Debounce the check to avoid too many API calls
    const timeoutId = setTimeout(checkPassword, 500);
    return () => clearTimeout(timeoutId);
  }, [password]);

  return result;
}

/**
 * Calculate SHA-1 hash of password using Web Crypto API
 */
async function sha1(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Calculate password strength based on various criteria
 */
function calculatePasswordStrength(password: string): {
  strength: 'weak' | 'fair' | 'good' | 'strong';
  strengthScore: number;
  suggestions: string[];
} {
  let score = 0;
  const suggestions: string[] = [];

  // Length
  if (password.length >= 12) score += 2;
  else if (password.length >= 8) score += 1;
  else suggestions.push('Use at least 12 characters');

  // Uppercase
  if (/[A-Z]/.test(password)) score += 1;
  else suggestions.push('Add uppercase letters');

  // Lowercase
  if (/[a-z]/.test(password)) score += 1;
  else suggestions.push('Add lowercase letters');

  // Numbers
  if (/[0-9]/.test(password)) score += 1;
  else suggestions.push('Add numbers');

  // Special characters
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  else suggestions.push('Add special characters (!@#$%^&*)');

  // No common patterns
  if (!/(.)\1{2,}/.test(password)) score += 1;
  else suggestions.push('Avoid repeated characters');

  // Diversity bonus
  const charTypes = [
    /[A-Z]/.test(password),
    /[a-z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length;

  if (charTypes >= 3) score += 1;

  let strength: 'weak' | 'fair' | 'good' | 'strong';
  if (score <= 3) strength = 'weak';
  else if (score <= 5) strength = 'fair';
  else if (score <= 7) strength = 'good';
  else strength = 'strong';

  return { strength, strengthScore: Math.min(score, 8), suggestions };
}
