import { AlertCircle, CheckCircle, Shield, AlertTriangle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PasswordStrengthIndicatorProps {
  password: string;
  isBreached: boolean;
  breachCount: number | null;
  isChecking: boolean;
  strength: 'weak' | 'fair' | 'good' | 'strong';
  strengthScore: number;
  suggestions: string[];
}

export function PasswordStrengthIndicator({
  password,
  isBreached,
  breachCount,
  isChecking,
  strength,
  strengthScore,
  suggestions,
}: PasswordStrengthIndicatorProps) {
  if (!password) return null;

  const strengthColors = {
    weak: 'bg-destructive',
    fair: 'bg-orange-500',
    good: 'bg-yellow-500',
    strong: 'bg-green-500',
  };

  const strengthLabels = {
    weak: 'Weak',
    fair: 'Fair',
    good: 'Good',
    strong: 'Strong',
  };

  return (
    <div className="space-y-3 mt-2">
      {/* Strength Indicator */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Password Strength</span>
          <span className={`font-medium ${
            strength === 'weak' ? 'text-destructive' :
            strength === 'fair' ? 'text-orange-500' :
            strength === 'good' ? 'text-yellow-500' :
            'text-green-500'
          }`}>
            {strengthLabels[strength]}
          </span>
        </div>
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
          <div 
            className={`h-full transition-all duration-300 ${strengthColors[strength]}`}
            style={{ width: `${(strengthScore / 8) * 100}%` }}
          />
        </div>
      </div>

      {/* Breach Warning */}
      {isChecking && (
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Checking password against known data breaches...
          </AlertDescription>
        </Alert>
      )}

      {isBreached && breachCount !== null && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <strong>Security Warning:</strong> This password has been exposed in {breachCount.toLocaleString()} data breach{breachCount !== 1 ? 'es' : ''}. 
            Please choose a different password.
          </AlertDescription>
        </Alert>
      )}

      {!isBreached && !isChecking && password.length >= 8 && (
        <Alert className="border-green-500/50 bg-green-500/10">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <AlertDescription className="text-xs text-green-700 dark:text-green-400">
            Password has not been found in known data breaches
          </AlertDescription>
        </Alert>
      )}

      {/* Suggestions */}
      {suggestions.length > 0 && strength !== 'strong' && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <div className="font-medium mb-1">Suggestions to strengthen:</div>
            <ul className="list-disc list-inside space-y-0.5">
              {suggestions.slice(0, 3).map((suggestion, i) => (
                <li key={i}>{suggestion}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
