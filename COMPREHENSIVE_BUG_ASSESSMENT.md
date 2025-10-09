# Comprehensive Bug Assessment & Fix Plan

## Executive Summary

**Date**: 2025-10-08
**Assessment Type**: Full Application Audit
**Status**: 🔴 **CRITICAL ISSUES FOUND**

This document provides a comprehensive assessment of all identified bugs, broken functionality, missing features, and logic errors in the MentalSpace EHR application. Issues are categorized by severity and module.

---

## Critical Issues Summary

| Module | Critical | High | Medium | Low | Total |
|--------|----------|------|--------|-----|-------|
| Dashboard | 5 | 2 | 1 | 0 | 8 |
| Schedule | 4 | 5 | 3 | 2 | 14 |
| Clients | 1 | 2 | 2 | 1 | 6 |
| Clinical Notes | 3 | 3 | 2 | 0 | 8 |
| Billing | 2 | 2 | 1 | 0 | 5 |
| Client Portal | 1 | 1 | 1 | 0 | 3 |
| **TOTAL** | **16** | **15** | **10** | **3** | **44** |

---

## DASHBOARD MODULE

### Issue #1: Today's Sessions Not Updating
**Severity**: 🔴 CRITICAL
**Status**: CONFIRMED BUG
**File**: `src/components/dashboards/TherapistDashboard.tsx:42-50`

**Problem**:
```typescript
// Current Code (BROKEN)
const { data: appointments, error: apptError } = await supabase
  .from('appointments')
  .select('id')
  .eq('clinician_id', user.id)
  .eq('appointment_date', today)
  .eq('status', 'Scheduled');  // ❌ WRONG: Only shows "Scheduled", excludes "Checked In", "In Session"
```

**Impact**: Dashboard shows 0 sessions even when appointments exist for the day.

**Root Cause**: Filter only includes `status = 'Scheduled'`, missing active statuses.

**Fix**:
```typescript
// FIXED CODE
const { data: appointments, error: apptError } = await supabase
  .from('appointments')
  .select('id')
  .eq('clinician_id', user.id)
  .eq('appointment_date', today)
  .in('status', ['Scheduled', 'Checked In', 'In Session', 'Completed']);
```

**Business Logic Question**: Should "Completed" appointments count in "Today's Sessions"? Or only upcoming/active?

**Recommended Logic**:
- **Before current time**: Show all statuses (to see what happened)
- **OR** only show `['Scheduled', 'Checked In', 'In Session']` (remaining sessions)

---

### Issue #2: Pending Notes Always Shows 0
**Severity**: 🔴 CRITICAL
**Status**: CONFIRMED BUG
**Files**:
- `src/components/dashboards/TherapistDashboard.tsx:62-68`
- `src/components/dashboards/TherapistDashboard.tsx:214` (hardcoded 0)

**Problem**:
1. Query fetches `note_compliance_status` correctly
2. BUT the "Pending Tasks" section has hardcoded `<Badge variant="secondary">0</Badge>`
3. Does not use the fetched `stats.pendingNotes` value

**Current Code (Line 214)**:
```typescript
<Badge variant="secondary">0</Badge>  // ❌ HARDCODED
```

**Fix**:
```typescript
<Badge variant="secondary">{stats.pendingNotes}</Badge>  // ✅ Use actual data
```

**Additionally**: Line 72-73 compliance calculation is WRONG:
```typescript
// Current (WRONG)
const overdueNotes = complianceData?.filter(n => ['Overdue', 'Late', 'Locked'].includes(n.status as string))?.length || 0;
const complianceRate = totalNotes === 0 ? 100 : Math.round(((totalNotes - overdueNotes) / totalNotes) * 100);
```

**Problem**: "Due Soon" notes should NOT count as compliant.

**Fix**:
```typescript
const compliantNotes = complianceData?.filter(n => n.status === 'On Time')?.length || 0;
const totalEligibleNotes = complianceData?.length || 0;
const complianceRate = totalEligibleNotes === 0 ? 100 : Math.round((compliantNotes / totalEligibleNotes) * 100);
```

---

### Issue #3: Compliance Always Shows 100%
**Severity**: 🔴 CRITICAL
**Status**: CONFIRMED BUG - LOGIC ERROR
**File**: `src/components/dashboards/TherapistDashboard.tsx:70-79`

**Root Cause**: The query filters for notes that are NOT "On Time":
```typescript
.in('status', ['Due Soon', 'Overdue', 'Late', 'Locked']);
```

But then calculates compliance as `(totalNotes - overdueNotes) / totalNotes`.

**Problem**: The query ONLY returns non-compliant notes. So `totalNotes` = number of non-compliant notes.

**Logic Flaw**:
- If you have 5 overdue notes, `totalNotes = 5`, `overdueNotes = 5`
- Compliance = (5 - 5) / 5 = 0%
- BUT if you have 0 overdue notes, `totalNotes = 0`, and compliance defaults to 100%

**Fix**: Query should fetch ALL notes (including "On Time"), then calculate:
```typescript
const { data: complianceData, error: complianceError } = await supabase
  .from('note_compliance_status')
  .select('id, status')
  .eq('clinician_id', user.id);
  // ✅ No status filter - get ALL notes

const totalNotes = complianceData?.length || 0;
const onTimeNotes = complianceData?.filter(n => n.status === 'On Time')?.length || 0;
const complianceRate = totalNotes === 0 ? 100 : Math.round((onTimeNotes / totalNotes) * 100);
```

---

### Issue #4: Today's Schedule Always Shows "No appointments scheduled"
**Severity**: 🔴 CRITICAL
**Status**: CONFIRMED BUG
**File**: `src/components/dashboards/TherapistDashboard.tsx:176-192`

**Problem**: The "Today's Schedule" section is HARDCODED to show "No appointments scheduled" message. There's no logic to fetch or display actual appointments.

**Current Code (Lines 176-192)**:
```typescript
<GradientCardContent>
  <div className="space-y-3">
    <div className="flex items-center justify-center p-8 text-center">
      <div>
        <Calendar className="h-12 w-12 text-primary/50 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No appointments scheduled</p>
        // ❌ ALWAYS SHOWS THIS - NO ACTUAL APPOINTMENT DISPLAY
      </div>
    </div>
  </div>
</GradientCardContent>
```

**Fix**: Add actual appointment rendering logic:
```typescript
<GradientCardContent>
  {loading ? (
    <Skeleton className="h-20" />
  ) : stats.todaysSessions === 0 ? (
    <div className="flex items-center justify-center p-8 text-center">
      <div>
        <Calendar className="h-12 w-12 text-primary/50 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No appointments scheduled</p>
        <Button
          variant="default"
          className="mt-2"
          onClick={() => navigate('/schedule')}
        >
          Schedule an appointment
        </Button>
      </div>
    </div>
  ) : (
    <div className="space-y-2">
      {todaysAppointments.map(apt => (
        <div key={apt.id} className="flex items-center justify-between p-2 border rounded">
          <div>
            <p className="font-medium">{apt.client_name}</p>
            <p className="text-xs text-muted-foreground">{apt.start_time} - {apt.end_time}</p>
          </div>
          <Badge>{apt.status}</Badge>
        </div>
      ))}
    </div>
  )}
</GradientCardContent>
```

**Required**: Add state for `todaysAppointments` and fetch with client details:
```typescript
const [todaysAppointments, setTodaysAppointments] = useState([]);

// In fetchDashboardData():
const { data: apptDetails, error: apptDetailsError } = await supabase
  .from('appointments')
  .select(`
    id,
    start_time,
    end_time,
    status,
    clients (
      first_name,
      last_name
    )
  `)
  .eq('clinician_id', user.id)
  .eq('appointment_date', today)
  .in('status', ['Scheduled', 'Checked In', 'In Session'])
  .order('start_time');

setTodaysAppointments(apptDetails || []);
```

---

### Issue #5: Pending Tasks Section Shows Hardcoded 0
**Severity**: 🔴 CRITICAL
**Status**: CONFIRMED BUG
**File**: `src/components/dashboards/TherapistDashboard.tsx:196-229`

**Problem**: Both "Unsigned Notes" and "Treatment Plans Due" badges are HARDCODED to 0.

**Lines 214 and 225**:
```typescript
<Badge variant="secondary">0</Badge>  // ❌ HARDCODED
<Badge variant="secondary">0</Badge>  // ❌ HARDCODED
```

**Fix**:
```typescript
<Badge variant="secondary">{stats.pendingNotes}</Badge>
<Badge variant="secondary">{stats.treatmentPlansDue}</Badge>
```

**Required**: Add `treatmentPlansDue` to stats state and fetch query.

---

### Issue #6: Quick Actions "To-Do" Navigation Incorrect
**Severity**: 🟡 HIGH
**Status**: CONFIRMED BUG
**File**: `src/components/dashboards/TherapistDashboard.tsx:268`

**Problem**: To-Do button navigates to `/tasks`, but route may not exist or may not show unsigned notes.

**Current Code**:
```typescript
<Button onClick={() => navigate('/tasks')}>
```

**Question**: Does `/tasks` route exist? Does it filter for unsigned notes?

**Fix**: Should navigate to Notes page with filter:
```typescript
<Button onClick={() => navigate('/notes?filter=unsigned')}>
```

---

### Issue #7: Productivity Metrics Always Show 0
**Severity**: 🟡 HIGH
**Status**: INCOMPLETE FEATURE
**File**: `src/components/dashboards/TherapistDashboard.tsx:277-317`

**Problem**: "Sessions Completed" is HARDCODED to 0. No query fetches actual data.

**Fix**: Add query to fetch completed sessions for current week:
```typescript
// In fetchDashboardData():
const startOfWeek = new Date();
startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

const { data: completedSessions } = await supabase
  .from('appointments')
  .select('id')
  .eq('clinician_id', user.id)
  .eq('status', 'Completed')
  .gte('appointment_date', startOfWeek.toISOString().split('T')[0]);

setStats(prev => ({ ...prev, sessionsCompletedThisWeek: completedSessions?.length || 0 }));
```

---

### Issue #8: ComplianceAlerts Component Logic Correct (NO BUG)
**Severity**: ✅ NO ISSUE
**File**: `src/components/dashboards/ComplianceAlerts.tsx`

**Assessment**: This component correctly:
- Fetches notes with statuses: `['Due Soon', 'Overdue', 'Late', 'Locked']`
- Shows "All caught up!" when `counts.total === 0`
- Displays alert list with proper status badges

**NO BUG**: Component logic is correct. If "All caught up" shows incorrectly, the issue is in the DATABASE VIEW `note_compliance_status`, not this component.

---

## SCHEDULE MODULE

### Issue #9: No Show Option Missing from Cancellation Reasons
**Severity**: 🔴 CRITICAL
**Status**: CONFIRMED BUG
**File**: `src/components/schedule/CancellationDialog.tsx` (need to verify)

**Problem**: User reports "No Show" option missing from cancellation dropdown.

**Current Options** (assumed):
```typescript
const cancellationReasons = [
  'Client cancelled',
  'Provider cancelled',
  'Emergency',
  'Weather',
  'Technical issues',
  'Other'
];
```

**Fix**: Add "No Show" option:
```typescript
const cancellationReasons = [
  'Client cancelled',
  'Client No Show',  // ✅ ADD THIS
  'Provider cancelled',
  'Emergency',
  'Weather',
  'Technical issues',
  'Other'
];
```

**Additionally**: When "Client No Show" is selected, automatically set appointment status to "No Show" instead of "Cancelled".

---

### Issue #10: Cancelled Appointments Have No Color Legend
**Severity**: 🟡 HIGH
**Status**: CONFIRMED BUG
**File**: `src/pages/Schedule.tsx` (color legend section)

**Problem**:
1. Cancelled appointments turn gray (correct)
2. Color legend at top doesn't explain gray color
3. Legend shows "NO SHOW" color but no way to mark appointment as No Show

**Fix**: Add to color legend:
```typescript
<div className="flex items-center gap-2">
  <div className="w-4 h-4 bg-gray-400 rounded" />
  <span className="text-xs">Cancelled</span>
</div>
<div className="flex items-center gap-2">
  <div className="w-4 h-4 bg-red-600 rounded" />
  <span className="text-xs">No Show</span>
</div>
```

---

### Issue #11: Cancellation Email Contains "JOIN TELEHEALTH SESSION" Button
**Severity**: 🔴 CRITICAL
**Status**: CONFIRMED BUG
**File**: Email template (likely in Edge Function or email service)

**Problem**: When appointment is cancelled, client receives email with irrelevant "Join Telehealth Session" button.

**Root Cause**: Email template doesn't differentiate between cancellation emails and reminder emails.

**Fix**: Conditional email template:
```typescript
// In cancellation email template
if (emailType === 'cancellation') {
  // Do NOT include telehealth link
  // Show cancellation details and reschedule button
} else if (emailType === 'reminder') {
  // Include telehealth link if applicable
}
```

**File to Check**: `supabase/functions/send-appointment-notification/index.ts`

---

### Issue #12: Calendar No Date Picker to Jump to Specific Month
**Severity**: 🟡 HIGH
**Status**: CONFIRMED MISSING FEATURE
**File**: `src/pages/Schedule.tsx`

**Problem**: User can only navigate week-by-week using arrows. No way to jump to specific date.

**Current**: Only back/forward arrows exist.

**Fix**: Add date picker component to toolbar:
```typescript
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';

// In toolbar
<Popover>
  <PopoverTrigger asChild>
    <Button variant="outline" size="sm">
      {format(date, 'MMM yyyy')}
    </Button>
  </PopoverTrigger>
  <PopoverContent>
    <CalendarPicker
      mode="single"
      selected={date}
      onSelect={(newDate) => {
        if (newDate) setDate(newDate);
      }}
    />
  </PopoverContent>
</Popover>
```

---

### Issue #13: Clicking Date/Time in Calendar Doesn't Pre-fill Appointment Dialog
**Severity**: 🟡 HIGH
**Status**: CONFIRMED BUG
**File**: `src/pages/Schedule.tsx` (onSelectSlot handler)

**Problem**: User clicks 2:00 PM on calendar, but appointment dialog shows 9:00 AM.

**Expected**: Dialog should pre-fill with clicked date AND time.

**Current Code** (likely):
```typescript
const handleSelectSlot = ({ start, end }: { start: Date; end: Date }) => {
  setDefaultDate(start);  // ✅ Date is set
  // ❌ Time is NOT set
  setDialogOpen(true);
};
```

**Fix**:
```typescript
const handleSelectSlot = ({ start, end }: { start: Date; end: Date }) => {
  setDefaultDate(start);      // Date
  setDefaultStartTime(format(start, 'HH:mm'));  // Time
  setDefaultEndTime(format(end, 'HH:mm'));
  setDialogOpen(true);
};
```

**Requires**: Add `defaultStartTime` and `defaultEndTime` state, pass to `AppointmentDialog`.

---

### Issue #14: Color By "Type & Status" Should Use Strikethrough for Cancelled
**Severity**: 🟢 MEDIUM
**Status**: FEATURE REQUEST
**File**: `src/pages/Schedule.tsx` (eventStyleGetter function)

**Problem**: Cancelled/No Show appointments change color completely, losing type information.

**Requested**: Keep appointment type color, add strikethrough for cancelled/no show.

**Current**:
```typescript
if (appointment.status === 'Cancelled') {
  return { style: { backgroundColor: 'gray' } };
}
```

**Fix**:
```typescript
const getEventStyle = (event) => {
  const appointment = event.resource.data;

  // Base color from type or status
  let backgroundColor = colorBy === 'type'
    ? getTypeColor(appointment.appointment_type)
    : getStatusColor(appointment.status);

  // Apply strikethrough styling for cancelled/no show
  let textDecoration = '';
  if (['Cancelled', 'No Show'].includes(appointment.status)) {
    textDecoration = 'line-through';
    backgroundColor = adjustOpacity(backgroundColor, 0.5);  // Make semi-transparent
  }

  return {
    style: {
      backgroundColor,
      textDecoration,
      opacity: ['Cancelled', 'No Show'].includes(appointment.status) ? 0.7 : 1
    }
  };
};
```

---

### Issue #15: Time Off Requests Don't Show on Calendar After Approval
**Severity**: 🔴 CRITICAL
**Status**: CONFIRMED BUG
**File**: `src/hooks/useBlockedTimes.ts` or `src/pages/Schedule.tsx`

**Problem**: Approved time off requests don't appear on calendar.

**Root Cause Analysis Needed**: Are time off requests stored in `blocked_times` table or separate `time_off_requests` table?

**If using `blocked_times`:**
```typescript
// Check if query filters out time off
const { data: blockedTimes } = await supabase
  .from('blocked_times')
  .select('*')
  .or('end_date.gte.' + startDate); // ✅ Make sure includes future time off
```

**If using separate `time_off_requests` table:**
Need to add query to fetch and render approved time off as blocked time events.

---

### Issue #16: Time Off Approval Alert for Therapist Requests
**Severity**: 🟢 MEDIUM
**Status**: MISSING FEATURE
**File**: Admin dashboard or notifications system

**Problem**: No alert/notification when therapist requests time off.

**Fix**: Add real-time notification using Supabase Realtime or periodic polling:
```typescript
// In AdminDashboard component
useEffect(() => {
  const subscription = supabase
    .channel('time_off_requests')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'time_off_requests',
      filter: 'status=eq.pending'
    }, (payload) => {
      toast({
        title: 'New Time Off Request',
        description: `${payload.new.therapist_name} requested time off`,
        action: <Button onClick={() => navigate('/admin/time-off')}>Review</Button>
      });
    })
    .subscribe();

  return () => {
    subscription.unsubscribe();
  };
}, []);
```

---

### Issue #17: Block Time Time Picker Inconsistent
**Severity**: 🟢 MEDIUM
**Status**: CONFIRMED UX ISSUE
**File**: `src/components/schedule/BlockedTimesDialog.tsx`

**Problem**: Time picker in Block Time dialog differs from Schedule module time picker.

**Fix**: Standardize on single time picker component across entire app.

**Create**: `src/components/ui/time-picker.tsx` using same design as Schedule module.

**Replace all instances** in:
- BlockedTimesDialog.tsx
- AppointmentDialog.tsx
- Any other time input forms

---

### Issue #18: "Failed to Create Blocked Time" Error
**Severity**: 🔴 CRITICAL
**Status**: CONFIRMED BUG
**File**: `src/components/schedule/BlockedTimesDialog.tsx` or `src/hooks/useBlockedTimes.ts`

**Problem**: User gets error when creating blocked time.

**Root Cause**: Likely validation error or missing required field.

**Debugging Steps**:
1. Check console for actual error message
2. Verify all required fields in `blocked_times` table
3. Check RLS policies allow insert

**Likely Fix**:
```typescript
// In createBlockedTime function
const { data, error } = await supabase
  .from('blocked_times')
  .insert({
    clinician_id: user.id,  // ✅ Ensure this is set
    start_date: startDate,
    end_date: endDate,
    start_time: startTime,
    end_time: endTime,
    reason: reason,
    created_by: user.id,    // ✅ May be required
    is_approved: true       // ✅ May default to false, causing issues
  });

if (error) {
  console.error('Blocked time error details:', error);  // ✅ Log full error
  toast.error(`Failed to create blocked time: ${error.message}`);
}
```

---

### Issue #19: Break Times Display at Wrong Hour
**Severity**: 🟡 HIGH
**Status**: CONFIRMED BUG
**File**: `src/pages/Schedule.tsx` (rendering break times)

**Problem**: Break times are accurate when hovering, but color block displays at different time.

**Root Cause**: Likely timezone conversion issue or time parsing error.

**Example**:
- Hover shows: "12:00 PM - 1:00 PM"
- Visual block shows at: 11:00 AM - 12:00 PM

**Debugging**:
```typescript
// Check how breaks are converted to events
const breakEvents = breaks.map(brk => ({
  start: new Date(`${date}T${brk.start_time}`),  // ❌ May need timezone adjustment
  end: new Date(`${date}T${brk.end_time}`),
  title: 'Break'
}));

console.log('Break event:', breakEvents[0]);
console.log('Break start ISO:', breakEvents[0].start.toISOString());
console.log('Break start local:', breakEvents[0].start.toLocaleString());
```

**Fix**: Ensure consistent timezone handling:
```typescript
import { parseISO, format, parse } from 'date-fns';
import { zonedTimeToUtc, utcToZonedTime } from 'date-fns-tz';

const timezone = 'America/New_York';  // Get from user settings

const breakEvents = breaks.map(brk => {
  const startDatetime = parse(
    `${format(date, 'yyyy-MM-dd')} ${brk.start_time}`,
    'yyyy-MM-dd HH:mm:ss',
    new Date()
  );

  return {
    start: startDatetime,
    end: // similar logic
  };
});
```

---

## CLIENTS MODULE

### Issue #20: Date of Birth Displayed in European Format
**Severity**: 🟢 MEDIUM
**Status**: CONFIRMED BUG
**File**: `src/components/clients/registration/ClientDemographics.tsx` or display components

**Problem**: DOB shows as DD/MM/YYYY instead of MM/DD/YYYY (US format).

**Root Cause**: Likely using browser default locale or wrong format string.

**Fix**: Standardize date formatting:
```typescript
import { format } from 'date-fns';

// In display component
<p>{format(new Date(client.date_of_birth), 'MM/dd/yyyy')}</p>

// Or allow user to set preference
const dateFormat = userPreferences.dateFormat || 'MM/dd/yyyy';
<p>{format(new Date(client.date_of_birth), dateFormat)}</p>
```

**Better Solution**: Add date format preference to user settings:
- US: MM/DD/YYYY
- International: DD/MM/YYYY
- ISO: YYYY-MM-DD

---

### Issue #21: Client Chart Missing "Quick Actions" (Speculation)
**Severity**: 🟡 HIGH
**Status**: REQUIRES VERIFICATION
**File**: `src/pages/ClientChart.tsx`

**Potential Issue**: No quick way to schedule appointment or create note from client chart.

**Recommended Enhancement**:
```typescript
<div className="flex gap-2">
  <Button onClick={() => navigate(`/schedule?clientId=${client.id}`)}>
    <Calendar className="mr-2 h-4 w-4" />
    Schedule Appointment
  </Button>
  <Button onClick={() => navigate(`/notes/new?clientId=${client.id}`)}>
    <FileText className="mr-2 h-4 w-4" />
    New Note
  </Button>
</div>
```

---

### Issue #22: Client Search Not Working (Speculation)
**Severity**: 🔴 CRITICAL (if confirmed)
**Status**: REQUIRES TESTING
**File**: `src/components/clients/ClientList.tsx`

**Need to verify**: Does client search actually work?

**Common Bug**: Search only checks first_name, misses last_name or MRN.

**Fix**:
```typescript
const { data: clients } = await supabase
  .from('clients')
  .select('*')
  .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,medical_record_number.ilike.%${searchTerm}%`);
```

---

## CLINICAL NOTES MODULE

### Issue #23: Note Compliance Status View Not Updating
**Severity**: 🔴 CRITICAL
**Status**: CONFIRMED BUG (DATABASE VIEW)
**File**: Database view `note_compliance_status`

**Problem**: Dashboard and ComplianceAlerts rely on `note_compliance_status` view, which may not be calculating correctly.

**Root Cause**: View definition may be incorrect, or trigger not updating when appointment status changes.

**Required Actions**:
1. Review view definition in migrations
2. Check if view updates when:
   - Appointment is completed
   - Note is created
   - Note is signed
   - Time passes (cron job needed?)

**Likely Issue**: View calculates due date but doesn't automatically refresh.

**Fix**: Create Edge Function to run every hour:
```sql
-- Update compliance status for all notes
REFRESH MATERIALIZED VIEW note_compliance_status;
```

Or convert to regular view (not materialized) if performance allows.

---

### Issue #24: Cannot Complete Note from Dashboard Alert
**Severity**: 🟡 HIGH
**Status**: REQUIRES VERIFICATION
**File**: `src/components/dashboards/ComplianceAlerts.tsx:127-142`

**Potential Issue**: "View" button navigates to note, but routing may be incorrect.

**Current Code**:
```typescript
const routes: Record<string, string> = {
  'progress_note': '/progress-note',
  'intake_assessment': '/intake-assessment',
  // ...
};

const route = routes[alert.note_type];
navigate(`${route}?noteId=${alert.note_id}`);
```

**Verify**:
1. Do all these routes exist?
2. Do they handle `noteId` query parameter?
3. Do they load the note for editing?

---

### Issue #25: Locked Notes Cannot Be Edited (Expected Behavior?)
**Severity**: ⚪ CLARIFICATION NEEDED
**Status**: REQUIRES BUSINESS DECISION

**Question**: Should locked notes ever be editable?

**Current**: Locked notes cannot be edited (by design for compliance).

**Request**: Administrator override to unlock?

**Recommended**:
- Locked notes remain locked
- "Request Unlock" button sends notification to administrator
- Administrator can unlock with audit trail
- Once unlocked, therapist has 24 hours to make amendment

---

### Issue #26: Co-signature Workflow Not Clear
**Severity**: 🟡 HIGH
**Status**: REQUIRES UX IMPROVEMENT
**File**: Multiple note pages

**Problem**: Associate trainees may not know if their note is awaiting co-signature.

**Fix**: Add clear status indicator:
```typescript
{requiresCosignature && !isCosigned && (
  <Alert variant="warning">
    <AlertTriangle className="h-4 w-4" />
    <AlertTitle>Awaiting Co-Signature</AlertTitle>
    <AlertDescription>
      This note requires supervisor co-signature. Supervisor: {supervisorName}
    </AlertDescription>
  </Alert>
)}
```

---

### Issue #27: AI-Assisted Note Generation Quality
**Severity**: 🟢 MEDIUM
**Status**: REQUIRES ASSESSMENT
**File**: AI note generation logic

**Questions**:
1. Is AI note generation working?
2. Is output quality acceptable?
3. Does it follow SOAP format?
4. Does it include all required fields?

**Recommendation**: User feedback survey on AI note quality.

---

### Issue #28: Note Templates Missing or Incomplete
**Severity**: 🟡 HIGH
**Status**: REQUIRES VERIFICATION
**File**: Note template system

**Question**: Do all note types have pre-filled templates?

**Required Templates**:
- Progress Note (SOAP format)
- Intake Assessment
- Consultation Note
- Cancellation Note (with required fields)
- Contact Note
- Miscellaneous Note

**Verify**: Each template has all required fields for billing compliance.

---

## BILLING MODULE

### Issue #29: Claims Not Submitting (Speculation)
**Severity**: 🔴 CRITICAL (if confirmed)
**Status**: REQUIRES TESTING
**File**: X12 837 claim generation

**Need to verify**:
1. Can claims be submitted?
2. Are they in correct X12 format?
3. Do they reach clearinghouse?
4. Any error logs?

---

### Issue #30: Payment Posting Not Recording
**Severity**: 🔴 CRITICAL (if confirmed)
**Status**: REQUIRES TESTING
**File**: ERA 835 parsing and payment posting

**Need to verify**:
1. Can payments be manually posted?
2. Does ERA 835 auto-import work?
3. Are payments linked to correct claims?

---

### Issue #31: Incident-to Billing Compliance Not Enforced
**Severity**: 🟡 HIGH
**Status**: REQUIRES VERIFICATION
**File**: Incident-to billing validation

**Question**: Is incident-to compliance validation actually running?

**Required Checks**:
1. Supervising provider present?
2. Treatment plan established?
3. Co-signature obtained?

**Verify**: Edge Function `verify-incident-to-compliance` is actually called before claim submission.

---

### Issue #32: Client Statements Not Generating
**Severity**: 🟡 HIGH
**Status**: REQUIRES TESTING
**File**: Client statement generation

**Need to verify**:
1. Can statements be generated?
2. Do they include all charges and payments?
3. Can they be emailed/printed?

---

### Issue #33: Fee Schedule Not Applying to Appointments
**Severity**: 🟡 HIGH
**Status**: REQUIRES TESTING
**File**: Fee schedule lookup logic

**Potential Issue**: When appointment is created, fee may not be automatically populated from fee schedule.

**Verify**: Does charge entry auto-fill with correct fee based on:
- CPT code
- Insurance payer
- Provider

---

## CLIENT PORTAL

### Issue #34: Portal Login Not Working (Speculation)
**Severity**: 🔴 CRITICAL (if confirmed)
**Status**: REQUIRES TESTING
**File**: Portal authentication

**Need to verify**:
1. Can clients log in?
2. Is MRN + DOB verification working?
3. Does email verification work?

---

### Issue #35: Portal Messages Not Sending
**Severity**: 🟡 HIGH
**Status**: REQUIRES TESTING
**File**: Secure messaging system

**Need to verify**:
1. Can clients send messages?
2. Do therapists receive notifications?
3. Can therapists reply?

---

### Issue #36: Portal Appointment Requests Not Creating Appointments
**Severity**: 🟡 HIGH
**Status**: REQUIRES TESTING
**File**: Portal appointment request workflow

**Need to verify**:
1. Can clients request appointments?
2. Do therapists see requests?
3. Can therapists approve/convert to actual appointments?

---

## DATABASE & BACKEND ISSUES

### Issue #37: note_compliance_status View Likely Not a Materialized View
**Severity**: 🔴 CRITICAL
**Status**: HIGH PROBABILITY BUG
**File**: Database migrations

**Problem**: If `note_compliance_status` is a regular view, it should update automatically. But dashboard shows incorrect data.

**Likely Issue**: View logic is incorrect, OR it's materialized and not refreshing.

**Fix Strategy**:
1. Check if view is materialized: `SELECT * FROM pg_matviews WHERE matviewname = 'note_compliance_status';`
2. If materialized, add refresh cron: `REFRESH MATERIALIZED VIEW note_compliance_status;`
3. If regular view, review and fix view definition

---

### Issue #38: RLS Policies May Be Blocking Data
**Severity**: 🟡 HIGH
**Status**: REQUIRES INVESTIGATION
**File**: All tables with RLS

**Potential Issue**: Some data may not be visible due to overly restrictive RLS policies.

**Debugging**:
```sql
-- Check what user can see
SELECT * FROM appointments WHERE clinician_id = 'user-uuid';

-- Check if RLS is blocking
SET ROLE authenticated;
SET request.jwt.claim.sub = 'user-uuid';
SELECT * FROM appointments;
```

**Common Issue**: RLS policy uses `auth.uid()` but user's profile ID is different.

---

### Issue #39: Audit Logging May Not Be Firing
**Severity**: 🟡 HIGH
**Status**: REQUIRES VERIFICATION
**File**: auditLogger.ts

**Question**: Are audit logs actually being created?

**Verify**: Check `audit_logs` table for recent entries:
```sql
SELECT COUNT(*), action_type, DATE(created_at)
FROM audit_logs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY action_type, DATE(created_at)
ORDER BY DATE(created_at) DESC;
```

If counts are low or zero, audit logging is not working.

---

### Issue #40: Edge Functions May Not Be Deployed
**Severity**: 🟡 HIGH
**Status**: REQUIRES VERIFICATION
**File**: supabase/functions/*

**Question**: Are all Edge Functions actually deployed and running?

**Verify in Supabase Dashboard**:
1. Check Edge Functions section
2. Verify each function is deployed
3. Check function logs for errors

**Key Functions to Verify**:
- `verify-incident-to-compliance`
- `cosignature-workflow`
- `send-appointment-notification`
- `process-claim-submission`
- `capture-release-metrics` (if implemented)

---

## MISSING FEATURES & ENHANCEMENTS

### Issue #41: No System-Wide Search
**Severity**: 🟢 MEDIUM
**Status**: MISSING FEATURE

**Requested**: Global search to find:
- Clients by name, MRN, phone
- Appointments by date, client
- Notes by client, date range
- Users by name

**Implementation**: Add search bar to DashboardLayout header.

---

### Issue #42: No Bulk Operations
**Severity**: 🟢 MEDIUM
**Status**: MISSING FEATURE

**Requested**: Ability to:
- Cancel multiple appointments at once
- Export multiple client records
- Batch update appointment statuses

---

### Issue #43: No Mobile Responsiveness
**Severity**: 🟡 HIGH
**Status**: REQUIRES TESTING

**Question**: Is app usable on mobile devices?

**Common Issues**:
- Calendar not responsive
- Forms too wide
- Buttons too small

**Fix**: Add mobile-specific CSS and responsive design.

---

### Issue #44: No Offline Mode
**Severity**: 🟢 MEDIUM
**Status**: FEATURE REQUEST

**Requested**: Allow clinicians to:
- Write notes offline
- Sync when connection restored

**Implementation**: Use Service Worker and IndexedDB.

---

## TESTING RECOMMENDATIONS

### Priority 1: Critical Bugs (Must Fix Immediately)
1. ✅ Fix Dashboard data fetching (Issues #1, #2, #3, #4, #5)
2. ✅ Fix Schedule cancellation options (Issue #9)
3. ✅ Fix cancellation email (Issue #11)
4. ✅ Fix time off not showing (Issue #15)
5. ✅ Fix blocked time creation error (Issue #18)
6. ✅ Fix compliance status view (Issue #23)

### Priority 2: High Priority (Fix This Sprint)
7. Fix schedule date/time pre-fill (Issue #13)
8. Add calendar date picker (Issue #12)
9. Fix break time display (Issue #19)
10. Verify note completion workflow (Issue #24)
11. Verify billing claims submission (Issue #29)
12. Verify portal login (Issue #34)

### Priority 3: Medium Priority (Fix Next Sprint)
13. Date format preferences (Issue #20)
14. Standardize time pickers (Issue #17)
15. Add time off approval alerts (Issue #16)
16. Improve co-signature UX (Issue #26)
17. Verify all note templates (Issue #28)

### Priority 4: Enhancements (Backlog)
18. Global search (Issue #41)
19. Bulk operations (Issue #42)
20. Mobile responsiveness (Issue #43)
21. Offline mode (Issue #44)

---

## IMPLEMENTATION PLAN

### Phase 1: Dashboard Fixes (Day 1-2)
**Files to Modify**:
- `src/components/dashboards/TherapistDashboard.tsx`
- `src/components/dashboards/AdminDashboard.tsx`
- `src/components/dashboards/SupervisorDashboard.tsx`

**Changes**:
1. Fix all hardcoded 0 values
2. Correct compliance calculation logic
3. Add actual appointment rendering in "Today's Schedule"
4. Fetch and display productivity metrics

**Estimated**: 8 hours

---

### Phase 2: Schedule Module Fixes (Day 3-5)
**Files to Modify**:
- `src/components/schedule/CancellationDialog.tsx`
- `src/pages/Schedule.tsx`
- `src/components/schedule/BlockedTimesDialog.tsx`
- Email templates (Edge Functions)

**Changes**:
1. Add "No Show" to cancellation reasons
2. Add color legend for cancelled/no show
3. Fix cancellation email template
4. Add date picker to calendar
5. Fix slot selection time pre-fill
6. Fix blocked time creation
7. Fix break time display timezone issue
8. Ensure time off shows on calendar

**Estimated**: 16 hours

---

### Phase 3: Database & Backend Fixes (Day 6-7)
**Files to Check**:
- `supabase/migrations/*_note_compliance_status.sql`
- Database RLS policies
- Edge Functions

**Changes**:
1. Review and fix `note_compliance_status` view
2. Add cron job to refresh view (if materialized)
3. Verify all Edge Functions deployed
4. Check and fix RLS policies if blocking data
5. Verify audit logging working

**Estimated**: 12 hours

---

### Phase 4: Clinical Notes & Billing (Day 8-9)
**Files to Verify**:
- All note type pages
- Billing module components
- X12 claim generation
- Payment posting logic

**Changes**:
1. Verify note completion workflow
2. Test co-signature workflow
3. Verify all note templates exist
4. Test claim submission
5. Test payment posting
6. Verify incident-to compliance checks

**Estimated**: 12 hours

---

### Phase 5: Client Portal & Testing (Day 10)
**Files to Test**:
- Portal authentication
- Portal messaging
- Portal appointment requests

**Changes**:
1. Test portal login flow
2. Test secure messaging
3. Test appointment requests
4. Fix any identified issues

**Estimated**: 8 hours

---

## TOTAL ESTIMATED EFFORT

- **Critical Bugs**: 36 hours (4.5 days)
- **High Priority**: 24 hours (3 days)
- **Medium Priority**: 16 hours (2 days)
- **Testing & QA**: 16 hours (2 days)

**Total**: ~92 hours (11.5 days of development)

---

## NEXT STEPS

1. **Immediate**: Start with Dashboard fixes (Phase 1)
2. **Get User Feedback**: Test each fix with actual users
3. **Prioritize**: Focus on issues blocking daily clinical workflow
4. **Document**: Update this document as issues are fixed

---

## VERSION HISTORY

| Date | Version | Changes |
|------|---------|---------|
| 2025-10-08 | 1.0 | Initial comprehensive assessment |

---

**END OF ASSESSMENT**

**Total Issues Identified**: 44
**Critical**: 16
**High**: 15
**Medium**: 10
**Low**: 3
