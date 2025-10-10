# Appointment Save/Edit Troubleshooting Guide

## Recent Fixes (Already Applied)

The latest code from GitHub includes these fixes:
- ✅ Conflict checking before database operations
- ✅ Time normalization (HH:mm → HH:mm:ss)
- ✅ Telehealth session creation for Internal/Twilio platforms
- ✅ Recurring appointment series handling
- ✅ Better error messages for time conflicts

## Common Issues & Solutions

### Issue 1: "Failed to save appointment" with no specific error

**Possible Causes:**
1. Database constraint violation
2. Missing required fields
3. RLS (Row-Level Security) policy blocking the operation
4. Network/Supabase connection issue

**How to Debug:**
1. Open browser console (F12)
2. Try to save an appointment
3. Look for error messages in console

**Expected Console Logs:**
```
[useAppointments] Creating appointment...
[useAppointments] Appointment created successfully
```

**Error Patterns to Look For:**
```
Error: Missing required field...
Error: Time conflict: An appointment already exists...
Error: Daily appointment limit reached...
Error: Invalid time format...
```

### Issue 2: Time Conflict Error

**Error Message:**
```
Time conflict: An appointment (Therapy Session) already exists from 10:00 to 11:00.
Please choose a different time.
```

**Solution:**
1. Check the schedule for the selected date/time
2. Choose a different time slot
3. Or cancel/reschedule the conflicting appointment

### Issue 3: Daily Limit Reached

**Error Message:**
```
Daily appointment limit reached (X/Y). Please choose a different date.
```

**Solution:**
1. Check clinician's daily capacity settings
2. Choose a different date
3. Or increase daily capacity limit (Settings > Clinicians)

### Issue 4: Validation Errors

**Common Validation Errors:**
- "Client is required"
- "Clinician is required"
- "Start time is required"
- "Invalid time format"
- "Appointment type is required"

**Solution:**
- Ensure all required fields are filled
- Time must be in HH:mm format (e.g., "10:00" not "10")
- Select valid options from dropdowns

### Issue 5: Recurring Appointment Issues

**Problem:** Can't save recurring appointments

**Check:**
1. Recurrence pattern is properly set
2. End date/occurrence count is valid
3. No conflicts in the generated series

**To Debug:**
```javascript
// In browser console, check recurrence pattern:
console.log(form.getValues('recurrence_pattern'))
```

### Issue 6: Telehealth Link Not Generated

**Problem:** Telehealth appointments don't have session links

**Check:**
1. Service Location = "Telehealth"
2. Telehealth Platform = "Internal" or "Twilio"
3. Link should auto-generate as `/telehealth/session/session_xxx`

**Expected Behavior:**
- Link is auto-generated on save
- Telehealth session record is created
- Client can click "Join Session" in portal

### Issue 7: Can't Edit Existing Appointments

**Possible Causes:**
1. RLS policy preventing updates
2. User doesn't have permission
3. Appointment is locked (past appointment)

**Check User Permissions:**
```sql
-- In Supabase SQL Editor
SELECT ur.*, r.name
FROM user_roles ur
JOIN roles r ON r.id = ur.role_id
WHERE ur.user_id = auth.uid()
AND ur.is_active = true;
```

**Expected Roles for Editing:**
- Administrator
- Supervisor
- Clinician (own appointments)
- Front Desk

### Issue 8: Database Errors

**Error Pattern:**
```
duplicate key value violates unique constraint
```

**Common Causes:**
- Duplicate CPT code
- Duplicate telehealth session_id

**Solution:**
- Refresh page and try again
- Check for stuck records in database

### Issue 9: No Response When Clicking Save

**Symptoms:**
- Button shows "Saving..." forever
- No error message
- Console shows network error

**Possible Causes:**
1. **Network Issue**: Supabase connection lost
2. **RLS Timeout**: Query taking too long
3. **Edge Function Error**: Token generation failing

**Solutions:**
1. **Check Network:**
   - Open Network tab in DevTools
   - Look for failed requests
   - Check Supabase status

2. **Check RLS Performance:**
   ```sql
   -- Check if RLS is causing slow queries
   EXPLAIN ANALYZE
   SELECT * FROM appointments
   WHERE clinician_id = 'user-id-here'
   AND appointment_date = '2025-10-10';
   ```

3. **Test Supabase Connection:**
   ```javascript
   // In browser console
   const { data, error } = await supabase
     .from('appointments')
     .select('count');
   console.log({ data, error });
   ```

## Step-by-Step Debugging Process

### Step 1: Verify Data

Before saving, check form values in console:

```javascript
// Add to AppointmentDialog.tsx onSubmit (after line 262)
console.log('[AppointmentDialog] Form data:', data);
console.log('[AppointmentDialog] Appointment data:', appointmentData);
```

### Step 2: Check Network Requests

1. Open DevTools → Network tab
2. Filter by "Fetch/XHR"
3. Try to save appointment
4. Look for POST request to Supabase
5. Check response status and body

**Expected Request:**
- URL: `https://...supabase.co/rest/v1/appointments`
- Method: POST
- Status: 201 (Created) or 200 (OK)

**Error Responses:**
- 400: Bad Request (validation error)
- 401: Unauthorized (not logged in)
- 403: Forbidden (RLS blocking)
- 409: Conflict (duplicate/constraint violation)
- 500: Server Error (database issue)

### Step 3: Check RLS Policies

Verify appointments table has correct policies:

```sql
-- In Supabase SQL Editor
SELECT * FROM pg_policies
WHERE tablename = 'appointments';
```

**Required Policies:**
- `appointments_select_policy`: Allow SELECT
- `appointments_insert_policy`: Allow INSERT
- `appointments_update_policy`: Allow UPDATE

### Step 4: Test Direct Insert

Test if you can insert directly:

```javascript
// In browser console
const { data, error } = await supabase
  .from('appointments')
  .insert([{
    client_id: 'client-uuid',
    clinician_id: 'clinician-uuid',
    appointment_date: '2025-10-15',
    start_time: '10:00:00',
    end_time: '11:00:00',
    duration: 60,
    appointment_type: 'Therapy Session',
    service_location: 'Office',
    status: 'Scheduled',
    timezone: 'America/New_York'
  }])
  .select();

console.log({ data, error });
```

If this works, the issue is in the form/validation.
If this fails, the issue is in database/RLS.

## Quick Fixes

### Fix 1: Clear Browser Cache

Sometimes stale JavaScript causes issues:

1. Ctrl+Shift+Delete
2. Select "Cached images and files"
3. Clear data
4. Hard refresh (Ctrl+Shift+R)

### Fix 2: Reset Form State

If form gets stuck:

```javascript
// In browser console
localStorage.clear();
sessionStorage.clear();
location.reload();
```

### Fix 3: Check Supabase Connection

```javascript
// Test connection
const { data, error } = await supabase.auth.getUser();
console.log('Auth status:', { data, error });
```

### Fix 4: Verify Required Fields

Make sure these are populated:
- ✅ Client selected
- ✅ Clinician selected
- ✅ Appointment date set
- ✅ Start time set (HH:mm format)
- ✅ Duration set (15-480 minutes)
- ✅ Appointment type selected
- ✅ Service location selected

## Error Message Reference

| Error Message | Cause | Solution |
|--------------|-------|----------|
| "Client is required" | No client selected | Select a client from dropdown |
| "Time conflict" | Overlapping appointment exists | Choose different time |
| "Daily limit reached" | Max appointments for day | Choose different date |
| "Invalid time format" | Wrong time format | Use HH:mm (e.g., "10:00") |
| "Failed to create appointment" | Database/RLS error | Check console, check permissions |
| "Network error" | Supabase connection lost | Check internet, try again |
| "Session not found" | Telehealth session error | Refresh page, try again |

## Still Not Working?

If none of the above helps:

1. **Take screenshots:**
   - The appointment dialog form
   - Browser console errors (F12)
   - Network tab showing failed request

2. **Get error details:**
   ```javascript
   // In browser console after save fails
   console.log('Last error:', localStorage.getItem('lastError'));
   ```

3. **Check Supabase logs:**
   - Supabase Dashboard → Logs → API
   - Look for 400/500 errors
   - Check error messages

4. **Provide specific error:**
   - What error message do you see?
   - Does it happen for all appointments or specific ones?
   - New appointments only or also edits?
   - Any pattern (time of day, specific client, etc.)?

## Useful Console Commands

```javascript
// Get current user
const user = await supabase.auth.getUser();
console.log('Current user:', user.data);

// Test appointment query
const apts = await supabase.from('appointments').select('*').limit(5);
console.log('Sample appointments:', apts.data);

// Check form state
console.log('Form errors:', form.formState.errors);
console.log('Form values:', form.getValues());

// Force form validation
await form.trigger();
console.log('Validation errors:', form.formState.errors);
```

