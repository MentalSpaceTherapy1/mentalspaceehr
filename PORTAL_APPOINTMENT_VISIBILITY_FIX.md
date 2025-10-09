# Portal Appointment Visibility Fix

## Problem
Clients cannot see appointments created by staff in their client portal.

## Root Cause Analysis

The issue likely stems from one of these scenarios:

1. **Missing Portal User Link**: The client record doesn't have `portal_user_id` set
2. **Portal Not Enabled**: The `portal_enabled` flag is false on the client record
3. **RLS Policy Not Matching**: The Row-Level Security policy wasn't explicitly checking `portal_enabled`

## Solution Implemented

### 1. Enhanced RLS Policy (`20251009130000_fix_client_portal_appointment_visibility.sql`)

Updated the appointments RLS policy to:
- Explicitly check that `portal_enabled = true` when matching portal users
- Add an index on `clients(portal_user_id)` for better query performance
- Add helpful comments for future maintenance

```sql
CREATE POLICY "Users can view appointments they're involved in"
ON appointments
FOR SELECT
USING (
  -- Portal user can see their own appointments (direct match on client's portal_user_id)
  (client_id IN (
    SELECT clients.id
    FROM clients
    WHERE clients.portal_user_id = auth.uid()
      AND clients.portal_enabled = true
  ))
  -- ... other conditions
);
```

### 2. Diagnostic Function (`20251009130001_add_portal_diagnostic_function.sql`)

Created `check_client_portal_config(client_id)` function to help diagnose portal setup issues:

```sql
SELECT * FROM check_client_portal_config('client-uuid-here');
```

This returns:
- Whether portal is enabled
- Portal user ID and email
- Whether the client has appointments
- Count of appointments

### 3. Code Improvements

**PortalAppointments.tsx**:
- Removed redundant client filtering (was filtering twice)
- Added detailed console logging for debugging
- Now logs client ID, user ID, portal_user_id, and portal_enabled status

**useAppointments.tsx**:
- Added detailed logging to track query execution
- Logs filter parameters and results
- Shows sample appointment data when results are returned

## How to Deploy

### 1. Apply Database Migrations

Run the migrations in order:

```bash
# Using Supabase CLI
npx supabase db push

# Or manually in Supabase Dashboard > SQL Editor
```

Apply these two migration files:
1. `20251009130000_fix_client_portal_appointment_visibility.sql`
2. `20251009130001_add_portal_diagnostic_function.sql`

### 2. Verify Client Portal Setup

For each client that should have portal access, ensure:

```sql
-- Check client portal configuration
SELECT
  id,
  first_name,
  last_name,
  portal_enabled,
  portal_user_id
FROM clients
WHERE id = 'your-client-id';
```

The client record must have:
- `portal_enabled` = `true`
- `portal_user_id` = UUID of the auth user for that client

### 3. Link Portal User to Client

If a client doesn't have `portal_user_id` set, you need to:

**Option A: Through the application** (if portal invitation flow is implemented)
- Go to Clients page
- Find the client
- Click "Send Portal Invitation" or similar action

**Option B: Manually in database** (for testing)
```sql
-- First, find or create the auth user
-- Then link it to the client
UPDATE clients
SET portal_user_id = 'auth-user-uuid-here',
    portal_enabled = true,
    portal_invitation_sent_at = now()
WHERE id = 'client-uuid-here';
```

## Testing Steps

### 1. Check Client Configuration

```sql
-- Run diagnostic for your test client
SELECT * FROM check_client_portal_config('client-uuid-here');
```

Expected output:
```
client_id    | <uuid>
client_name  | John Doe
portal_enabled | true
portal_user_id | <uuid>
portal_user_email | john.doe@example.com
has_appointments | true
appointment_count | 3
```

### 2. Create Test Appointment

1. Log in as staff member
2. Go to Schedule page
3. Create a new appointment for the test client
4. Note the appointment details

### 3. Verify in Client Portal

1. Log out of staff account
2. Log in with client portal credentials
3. Navigate to portal Appointments page
4. Open browser console (F12)
5. Look for log messages:

```
[PortalAppointments] Client ID loaded: <uuid>
[PortalAppointments] Current user ID: <uuid>
[PortalAppointments] Client portal_user_id: <uuid>
[PortalAppointments] Portal enabled: true
[useAppointments] Filtering by client_id: <uuid>
[useAppointments] Appointments fetched: 3 appointments
```

6. Verify the newly created appointment is visible in the list

### 4. Check RLS Policy Directly

You can test the RLS policy by running this as the portal user:

```sql
-- This should return the client's appointments
SELECT * FROM appointments WHERE client_id = 'client-uuid-here';
```

## Troubleshooting

### No Appointments Showing

1. **Check console logs** - Look for error messages
2. **Verify portal_user_id match**:
   ```sql
   SELECT
     c.id as client_id,
     c.portal_user_id,
     auth.uid() as current_user_id,
     c.portal_user_id = auth.uid() as ids_match
   FROM clients c
   WHERE c.id = 'client-uuid';
   ```
3. **Verify RLS policy**:
   ```sql
   SELECT * FROM pg_policies
   WHERE tablename = 'appointments'
   AND policyname = 'Users can view appointments they''re involved in';
   ```

### Portal User Not Set

If `portal_user_id` is NULL:
1. Check if portal invitation was sent
2. Manually link the user (see above)
3. Ensure the auth user exists

### Portal Not Enabled

If `portal_enabled` is false:
```sql
UPDATE clients
SET portal_enabled = true
WHERE id = 'client-uuid-here';
```

## Code Changes Summary

### Database
- ✅ Enhanced RLS policy with explicit portal_enabled check
- ✅ Added index for portal_user_id lookups
- ✅ Created diagnostic function

### Frontend
- ✅ Removed redundant filtering in PortalAppointments
- ✅ Added detailed logging for debugging
- ✅ Improved error visibility

## Next Steps

After verifying the fix works:

1. **Remove debug logging** - The console.log statements can be removed once confirmed working
2. **Document portal invitation flow** - Ensure staff knows how to enable portal access
3. **Add UI feedback** - Consider showing a message if portal is not enabled
4. **Monitor logs** - Watch for any RLS policy errors in production

## Support

If issues persist, check:
1. Browser console for JavaScript errors
2. Supabase logs for RLS policy errors
3. Database query logs for slow queries
4. Client configuration using the diagnostic function
