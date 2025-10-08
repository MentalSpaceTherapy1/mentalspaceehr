# Console.log Cleanup Plan

## Overview
This document outlines the plan to remove 207 `console.log` statements across 111 files and replace them with proper structured logging using the existing `logger.ts` utility.

## Current State
- **Total console.log statements**: 207
- **Files affected**: 111
- **Existing logger utility**: `src/lib/logger.ts` (production-safe with PHI redaction)

## Strategy
We'll clean up console statements incrementally by feature area, ensuring each change is tested before moving to the next area.

## Priority Phases

### Phase 1: Critical Security Areas (Priority: HIGH)
**Timeline**: Day 1-2

Files with authentication, PHI, or sensitive data:
- `src/hooks/useAuth.tsx`
- `src/pages/Auth.tsx`
- `src/pages/ResetPassword.tsx`
- `src/pages/ForgotPassword.tsx`
- `src/pages/ConfirmPasswordReset.tsx`
- `src/components/MFAVerification.tsx`
- `src/lib/api/users.ts`
- `src/lib/api/userRoles.ts`
- `src/lib/api/trustedDevices.ts`

**Actions**:
```typescript
// Replace patterns like:
console.log('Login successful:', user);
console.error('Authentication failed:', error);

// With:
import { logSafeError } from '@/lib/logger';
logSafeError('Login successful', null, { userId: user.id });
logSafeError('Authentication failed', error, { component: 'Auth' });
```

### Phase 2: Client Data & Clinical Notes (Priority: HIGH)
**Timeline**: Day 3-4

Files handling client/patient data:
- `src/components/clients/**`
- `src/components/intake/**`
- `src/components/progress-note/**`
- `src/components/treatment-plan/**`
- `src/hooks/useClinicalDocuments.tsx`
- `src/hooks/useClinicalAssessments.tsx`
- `src/hooks/useClientDocuments.tsx`

**Actions**:
```typescript
// Replace:
console.log('Fetched client data:', clientData);

// With:
logSafeError('Fetched client data', null, { 
  clientId: clientData.id, 
  component: 'ClientChart' 
});
```

### Phase 3: Billing & Payment Processing (Priority: HIGH)
**Timeline**: Day 5-6

Files handling financial data:
- `src/components/billing/**`
- `src/hooks/useBilling.tsx`
- `src/hooks/usePayments.tsx`
- `src/hooks/useInsuranceClaims.tsx`
- `src/pages/admin/BillingManagement.tsx`

### Phase 4: Scheduling & Appointments (Priority: MEDIUM)
**Timeline**: Day 7-8

Files for scheduling functionality:
- `src/components/schedule/**`
- `src/hooks/useAppointments.tsx`
- `src/hooks/useAvailableSlots.tsx`
- `src/hooks/useWaitlist.tsx`
- `src/pages/Schedule.tsx`

### Phase 5: Telehealth & Real-time Features (Priority: MEDIUM)
**Timeline**: Day 9-10

Files with WebRTC and real-time communication:
- `src/components/telehealth/**`
- `src/hooks/useWebRTC.tsx`
- `src/hooks/useTelehealthConsent.tsx`
- `src/pages/TelehealthSession.tsx`

### Phase 6: Admin & Portal Features (Priority: LOW)
**Timeline**: Day 11-12

Administrative and portal features:
- `src/pages/admin/**`
- `src/pages/portal/**`
- `src/components/admin/**`
- `src/components/portal/**`

### Phase 7: UI Components & Utilities (Priority: LOW)
**Timeline**: Day 13-14

General UI components and utilities:
- `src/components/ui/**` (minimal logging needed)
- `src/lib/utils.ts`
- `src/components/layout/**`

## Implementation Guidelines

### 1. Use Appropriate Logger Methods

```typescript
// For errors
logSafeError('Operation failed', error, { 
  component: 'ComponentName', 
  operation: 'operationName' 
});

// For success (only in development, avoid in production)
if (import.meta.env.DEV) {
  console.log('✓ Operation successful');
}

// For debugging (use sparingly, only in dev)
if (import.meta.env.DEV) {
  console.log('[Debug]', data);
}
```

### 2. Never Log Sensitive Data

**Never log**:
- Full names, SSN, DOB
- Email addresses, phone numbers
- Medical records, clinical notes
- Payment information, credit card numbers
- Authentication tokens, passwords
- IP addresses, session IDs

**Safe to log**:
- Record IDs (UUIDs)
- Timestamps
- Component names
- Operation types
- Error codes (non-sensitive)

### 3. Conditional Logging

```typescript
// Only log in development
if (import.meta.env.DEV) {
  console.log('[Dev] Component mounted');
}

// Production logging through logger
logSafeError('Critical operation', error, { 
  severity: 'high',
  component: 'ComponentName' 
});
```

## Testing Strategy

After each phase:
1. **Manual Testing**: Test the feature area affected
2. **Error Monitoring**: Check that errors are still captured
3. **Development Experience**: Ensure dev debugging isn't hindered
4. **Production Verification**: Confirm no sensitive data in logs

## Edge Functions Console Cleanup

Separate plan for Supabase Edge Functions (38 functions):
- Edge functions use Deno's console, not the client-side logger
- Replace `console.log` with structured logging:
  ```typescript
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'info',
    message: 'Operation completed',
    metadata: { operationId: 'xyz' }
  }));
  ```

## Tracking Progress

Create checkboxes for each phase:

- [ ] Phase 1: Critical Security (Auth, PHI)
- [ ] Phase 2: Client Data & Clinical Notes
- [ ] Phase 3: Billing & Payment
- [ ] Phase 4: Scheduling & Appointments
- [ ] Phase 5: Telehealth & Real-time
- [ ] Phase 6: Admin & Portal
- [ ] Phase 7: UI Components & Utilities
- [ ] Edge Functions Cleanup

## Automation Opportunities

Consider creating a script to:
1. Scan for `console.log` patterns
2. Generate reports by file/feature area
3. Suggest safe replacements
4. Validate no sensitive data in logs

## Success Criteria

- [ ] Zero `console.log` statements in production builds
- [ ] All errors properly logged via `logger.ts`
- [ ] No PHI or sensitive data in any logs
- [ ] Development debugging experience maintained
- [ ] Production monitoring functioning correctly

## Rollback Plan

If issues arise during cleanup:
1. Each phase is committed separately
2. Can revert specific phase without affecting others
3. Keep original console statements commented for 1 sprint
4. Remove comments after verification

## Resources

- Logger utility: `src/lib/logger.ts`
- Audit logger: `src/lib/auditLogger.ts` (for compliance events)
- Production logging: Supabase logs (Edge Functions)
- Error tracking: Console errors in production still captured by browser

## Notes

- The `vite.config.ts` already drops console statements in production builds
- This cleanup is primarily for code quality and explicit logging control
- Some development-only console.logs can remain if wrapped in `import.meta.env.DEV`
- Focus on removing logs that could expose sensitive data or clutter production
