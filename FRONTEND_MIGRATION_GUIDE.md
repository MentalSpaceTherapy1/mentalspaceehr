# Frontend Migration Guide: Supabase → AWS Cognito + API Gateway

This guide explains how to migrate the frontend from Supabase to AWS Cognito authentication and API Gateway.

---

## Overview

**Before (Supabase):**
```typescript
import { supabase } from './lib/supabase';

// Auth
const { data, error } = await supabase.auth.signInWithPassword({ email, password });

// Database
const { data, error } = await supabase.from('clients').select('*');
```

**After (AWS):**
```typescript
import { cognitoAuth } from './lib/aws-cognito';
import { apiClient } from './lib/aws-api-client';

// Auth
const { session, error } = await cognitoAuth.signIn(email, password);

// Database
const { data, error } = await apiClient.from('clients').select('*').execute();
```

---

## Step 1: Install Dependencies

Already completed ✅
- `@aws-sdk/client-cognito-identity-provider`
- `@aws-sdk/credential-providers`

---

## Step 2: Update Environment Variables

Already completed ✅ - See `.env` file:
- `VITE_AWS_REGION`
- `VITE_COGNITO_USER_POOL_ID`
- `VITE_COGNITO_CLIENT_ID`
- `VITE_API_ENDPOINT`

---

## Step 3: Replace Auth Context

### Find: `src/contexts/AuthContext.tsx` or similar

### Replace Supabase imports:
```typescript
// OLD
import { supabase } from '@/lib/supabase';

// NEW
import { cognitoAuth } from '@/lib/aws-cognito';
```

### Update sign in method:
```typescript
// OLD
const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data.session;
};

// NEW
const signIn = async (email: string, password: string) => {
  const { session, error } = await cognitoAuth.signIn(email, password);

  if (error) {
    if (error.message === 'MFA_REQUIRED') {
      // Handle MFA flow
      setNeedsMFA(true);
      return null;
    }
    throw error;
  }

  return session;
};
```

### Update sign out method:
```typescript
// OLD
const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

// NEW
const signOut = async () => {
  const { error } = await cognitoAuth.signOut();
  if (error) throw error;
};
```

### Update get user method:
```typescript
// OLD
const getUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

// NEW
const getUser = async () => {
  const { user, error } = await cognitoAuth.getUser();
  if (error) throw error;
  return user;
};
```

### Update session check:
```typescript
// OLD
const isAuthenticated = () => {
  return supabase.auth.getSession() !== null;
};

// NEW
const isAuthenticated = () => {
  return cognitoAuth.isAuthenticated();
};
```

---

## Step 4: Add MFA Support

Cognito requires MFA. Add MFA verification UI:

```typescript
// In your sign-in component
const [needsMFA, setNeedsMFA] = useState(false);
const [mfaCode, setMFACode] = useState('');

const handleSignIn = async () => {
  try {
    const { session, error } = await cognitoAuth.signIn(email, password);

    if (error?.message === 'MFA_REQUIRED') {
      setNeedsMFA(true);
      return;
    }

    if (error) throw error;

    // Success - redirect to dashboard
  } catch (error) {
    // Handle error
  }
};

const handleMFAVerify = async () => {
  try {
    const { session, error } = await cognitoAuth.verifyMFA(mfaCode);

    if (error) throw error;

    // Success - redirect to dashboard
  } catch (error) {
    // Handle error
  }
};

// Render MFA input if needed
{needsMFA && (
  <div>
    <input
      type="text"
      value={mfaCode}
      onChange={(e) => setMFACode(e.target.value)}
      placeholder="Enter MFA code"
    />
    <button onClick={handleMFAVerify}>Verify</button>
  </div>
)}
```

---

## Step 5: Replace Database Queries

### Pattern 1: Simple SELECT
```typescript
// OLD
const { data: clients, error } = await supabase
  .from('clients')
  .select('*');

// NEW
const { data: clients, error } = await apiClient
  .from('clients')
  .select('*')
  .execute();
```

### Pattern 2: SELECT with filters
```typescript
// OLD
const { data, error } = await supabase
  .from('clients')
  .select('*')
  .eq('is_active', true)
  .order('last_name', { ascending: true })
  .limit(10);

// NEW
const { data, error } = await apiClient
  .from('clients')
  .select('*')
  .eq('is_active', true)
  .order('last_name', { ascending: true })
  .limit(10)
  .execute();
```

### Pattern 3: INSERT
```typescript
// OLD
const { data, error } = await supabase
  .from('clients')
  .insert({ first_name: 'John', last_name: 'Doe' });

// NEW
const { data, error } = await apiClient
  .from('clients')
  .insert({ first_name: 'John', last_name: 'Doe' });
```

### Pattern 4: UPDATE
```typescript
// OLD
const { data, error } = await supabase
  .from('clients')
  .update({ is_active: false })
  .eq('id', clientId);

// NEW
const { data, error } = await apiClient
  .from('clients')
  .eq('id', clientId)
  .update({ is_active: false });
```

### Pattern 5: DELETE
```typescript
// OLD
const { error } = await supabase
  .from('clients')
  .delete()
  .eq('id', clientId);

// NEW
const { error } = await apiClient
  .from('clients')
  .eq('id', clientId)
  .delete();
```

### Pattern 6: Single record
```typescript
// OLD
const { data, error } = await supabase
  .from('clients')
  .select('*')
  .eq('id', clientId)
  .single();

// NEW
const { data, error } = await apiClient
  .from('clients')
  .select('*')
  .eq('id', clientId)
  .single();
```

---

## Step 6: Replace Edge Function Calls

### OLD (Supabase Functions):
```typescript
const { data, error } = await supabase.functions.invoke('create-user', {
  body: { email, password, role }
});
```

### NEW (Lambda via API Gateway):
```typescript
const { data, error } = await apiClient.post('create-user', {
  email,
  password,
  role
});
```

---

## Step 7: File Uploads (S3)

File uploads already work with S3 ✅ - No changes needed if using the AWS S3 integration.

---

## Step 8: Real-time Subscriptions

**Important:** API Gateway + Lambda doesn't support real-time subscriptions like Supabase.

**Options:**
1. **Use polling** for now (check for updates every N seconds)
2. **Add AWS AppSync** later for GraphQL subscriptions
3. **Add WebSocket API** for real-time features

### Example: Convert real-time to polling
```typescript
// OLD (Supabase real-time)
useEffect(() => {
  const subscription = supabase
    .channel('appointments')
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'appointments' },
      (payload) => {
        // Handle change
        refreshAppointments();
      }
    )
    .subscribe();

  return () => {
    subscription.unsubscribe();
  };
}, []);

// NEW (Polling)
useEffect(() => {
  const interval = setInterval(() => {
    refreshAppointments();
  }, 5000); // Poll every 5 seconds

  return () => clearInterval(interval);
}, []);
```

---

## Step 9: Find and Replace All Occurrences

Use your IDE to find and replace:

1. **Find:** `supabase.auth` → **Replace with:** `cognitoAuth`
2. **Find:** `supabase.from` → **Replace with:** `apiClient.from`
3. **Find:** `supabase.functions.invoke` → **Replace with:** `apiClient.post`

---

## Step 10: Update Authorization Headers

The API client automatically includes the Cognito JWT in the Authorization header.

No manual header management needed! ✅

---

## Step 11: Error Handling

```typescript
// Cognito errors are more detailed
try {
  const { session, error } = await cognitoAuth.signIn(email, password);
  if (error) {
    // Handle specific errors
    switch (error.message) {
      case 'MFA_REQUIRED':
        // Show MFA input
        break;
      case 'NEW_PASSWORD_REQUIRED':
        // Force password change
        break;
      default:
        // Show generic error
    }
  }
} catch (error) {
  console.error('Sign in failed:', error);
}
```

---

## Step 12: Testing Checklist

After migration, test these flows:

### Authentication
- [ ] Sign in with email/password
- [ ] MFA verification (if enabled)
- [ ] Sign out
- [ ] Password reset request
- [ ] Password reset confirmation
- [ ] Session persistence (refresh page)
- [ ] Automatic token refresh

### Database Operations
- [ ] Fetch data (SELECT)
- [ ] Create records (INSERT)
- [ ] Update records (UPDATE)
- [ ] Delete records (DELETE)
- [ ] Filtering (WHERE clauses)
- [ ] Sorting (ORDER BY)
- [ ] Pagination (LIMIT/OFFSET)

### API Functions
- [ ] User creation
- [ ] Appointment confirmation
- [ ] Email notifications
- [ ] File uploads

---

## Common Issues & Solutions

### Issue: "Not authenticated" errors
**Solution:** Ensure `cognitoAuth.isAuthenticated()` returns true before API calls.

### Issue: CORS errors
**Solution:** Lambda functions already have CORS configured. Check browser console for details.

### Issue: Token expired
**Solution:** Automatic refresh should handle this. If not, call `cognitoAuth.getUser()` to trigger refresh.

### Issue: MFA not working
**Solution:** Users must have MFA enabled in Cognito. Check AWS Console → Cognito → User Pool → MFA settings.

---

## Migration Timeline

**Estimated time: 6-8 hours**

1. Update Auth Context (2 hours)
2. Add MFA UI (1 hour)
3. Replace database queries (2-3 hours)
4. Replace function calls (1 hour)
5. Testing (2 hours)

---

## Rollback Plan

If you need to rollback:

1. Restore `.env` file from backup
2. Restore `src/lib/supabase.ts`
3. Revert auth context changes
4. Restart dev server

---

## Support

- AWS Cognito Docs: https://docs.aws.amazon.com/cognito/
- API Gateway Docs: https://docs.aws.amazon.com/apigateway/
- Lambda Docs: https://docs.aws.amazon.com/lambda/

---

**Status**: ✅ All backend Lambda functions being deployed
**Next**: Start frontend migration once deployment completes
