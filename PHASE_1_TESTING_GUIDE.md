# Phase 1 Testing Guide

## Quick Testing Checklist

### Prerequisites
✅ Migration applied (see `APPLY_PHASE_1_MIGRATION.md`)
✅ Application running locally or deployed
✅ Two browsers/devices for multi-participant testing

---

## Test 1: Persistent Chat

### Setup
1. Start a telehealth session as clinician
2. Open the same session as client in incognito/different browser

### Test Steps
1. **Send Messages**
   - [ ] Clinician sends message "Hello from clinician"
   - [ ] Client sends message "Hello from client"
   - [ ] Messages appear in real-time for both users
   - [ ] Messages show correct sender name and timestamp

2. **Test Persistence**
   - [ ] Refresh the page (both clinician and client)
   - [ ] Chat panel shows loading spinner briefly
   - [ ] All previous messages reappear
   - [ ] Order is preserved (oldest to newest)

3. **Test Multi-Message**
   - [ ] Send 10 messages rapidly
   - [ ] All messages appear without duplicates
   - [ ] No console errors

4. **Test Empty State**
   - [ ] Start new session with no messages
   - [ ] Chat shows "No messages yet" placeholder

### Expected Results
✅ Messages persist across refresh
✅ Real-time delivery works
✅ No duplicate messages
✅ Correct sender identification

---

## Test 2: Video Fullscreen & Picture-in-Picture

### Test Fullscreen Mode

1. **Test Local Video**
   - [ ] Hover over your own video tile
   - [ ] Fullscreen button appears (top-right)
   - [ ] Click fullscreen button
   - [ ] Video expands to fill entire screen
   - [ ] Controls overlay visible
   - [ ] Exit button visible (top-right)
   - [ ] Click exit or press ESC
   - [ ] Returns to normal grid view

2. **Test Remote Video**
   - [ ] Hover over remote participant video
   - [ ] Click fullscreen button
   - [ ] Remote video fills screen
   - [ ] Exit returns to grid

3. **Test Edge Cases**
   - [ ] Fullscreen with video disabled (shows avatar)
   - [ ] Fullscreen during connection issues
   - [ ] Multiple fullscreen toggles

### Test Picture-in-Picture Mode

1. **Test PiP**
   - [ ] Hover over video tile
   - [ ] Click PiP button (picture-in-picture icon)
   - [ ] Video opens in floating window
   - [ ] Can move PiP window around screen
   - [ ] Can resize PiP window
   - [ ] Audio continues playing
   - [ ] Click PiP button again to exit

2. **Browser Support**
   - [ ] Chrome/Edge: PiP works
   - [ ] Safari: PiP works
   - [ ] Firefox: Shows fallback message (not supported)

3. **Test Interactions**
   - [ ] Can switch tabs while PiP active
   - [ ] Can click other windows while PiP shows
   - [ ] Closing PiP doesn't end session

### Expected Results
✅ Fullscreen works for all videos
✅ PiP works on supported browsers
✅ Smooth transitions and animations
✅ Exit mechanisms work (button + ESC)

---

## Test 3: Waiting Room Experience

### Test Client Waiting Room

1. **Join as Client**
   - [ ] Client joins session URL
   - [ ] Automatically enters waiting room
   - [ ] Sees animated loading spinner
   - [ ] Shows clinician name
   - [ ] Shows appointment time
   - [ ] Wait time counter starts (0:00, 0:01, 0:02...)

2. **Test Wait Room Features**
   - [ ] Connection status shows "Connected" with green pulse
   - [ ] Can send message to clinician (optional)
   - [ ] Message appears in clinician's view
   - [ ] Page refresh - returns to waiting room
   - [ ] Wait time continues from previous value

3. **Test Admission**
   - [ ] Clinician clicks "Admit" button
   - [ ] Client sees "Session Starting" toast
   - [ ] Client automatically joins video session
   - [ ] Video and audio connect properly

### Test Clinician Waiting Room

1. **Clinician View**
   - [ ] Waiting room panel appears (top-right corner)
   - [ ] Shows "Waiting Room (1)" badge
   - [ ] Badge animates/pulses
   - [ ] Shows client name and info
   - [ ] Shows wait time (e.g., "2m")

2. **Test Actions**
   - [ ] Click "Admit" button
   - [ ] Client joins immediately
   - [ ] Waiting room panel disappears
   - [ ] Toast shows "Client Admitted"

3. **Test Messaging**
   - [ ] Click message icon (speech bubble)
   - [ ] Dialog opens with message history
   - [ ] Can send message to waiting client
   - [ ] Message delivers in real-time
   - [ ] Client can reply

4. **Test Multiple Clients**
   - [ ] Two clients join and wait
   - [ ] Badge shows "Waiting Room (2)"
   - [ ] Each client listed separately
   - [ ] Can admit clients individually
   - [ ] Wait times shown for each

### Expected Results
✅ Waiting room prevents direct session join
✅ Real-time notifications work
✅ Admit flow seamless
✅ Message system functional
✅ Professional UI with animations

---

## Test 4: Integration Testing

### End-to-End Session Flow

1. **Complete Session Test**
   - [ ] Client joins → enters waiting room
   - [ ] Clinician sees notification
   - [ ] Clinician admits client
   - [ ] Both connect to video
   - [ ] Send chat messages back and forth
   - [ ] Open fullscreen on remote video
   - [ ] Test PiP mode
   - [ ] End session gracefully

2. **Test Session Refresh**
   - [ ] Mid-session, client refreshes page
   - [ ] Client reconnects to same session
   - [ ] Chat history loads
   - [ ] Video reconnects
   - [ ] Clinician sees brief disconnect/reconnect

3. **Test Network Issues** (Optional)
   - [ ] Disable network briefly
   - [ ] Connection quality indicator updates
   - [ ] Re-enable network
   - [ ] Session recovers automatically

### Expected Results
✅ Complete flow works without errors
✅ Graceful handling of reconnection
✅ Data persists through interruptions

---

## Test 5: Edge Cases & Error Handling

### Test Error Scenarios

1. **Invalid Session**
   - [ ] Navigate to non-existent session ID
   - [ ] Shows error message
   - [ ] Provides "Return to Schedule" button

2. **Permission Errors**
   - [ ] Join session without camera/mic permission
   - [ ] Shows permission prompt
   - [ ] Graceful fallback if denied

3. **Database Errors** (Manual)
   - [ ] Temporarily disable Supabase real-time
   - [ ] Chat shows error toast
   - [ ] Waiting room shows connection issues

4. **Concurrent Sessions**
   - [ ] Open same session in 3+ tabs/devices
   - [ ] All receive same messages
   - [ ] No message duplication
   - [ ] Clean handling of multiple connections

### Expected Results
✅ Errors shown with helpful messages
✅ No crashes or blank screens
✅ Graceful degradation when features unavailable

---

## Test 6: Performance & UX

### Test Performance

1. **Message Load Time**
   - [ ] Session with 50+ messages
   - [ ] Chat loads within 1 second
   - [ ] Smooth scrolling
   - [ ] No UI lag

2. **Video Performance**
   - [ ] Fullscreen transitions smooth (no flicker)
   - [ ] PiP activation instant
   - [ ] Hover effects responsive

3. **Real-time Latency**
   - [ ] Message sent → received < 500ms
   - [ ] Waiting room admission < 1s

### Test UX/UI

1. **Visual Polish**
   - [ ] Animations smooth and professional
   - [ ] Loading states show appropriately
   - [ ] Icons align and scale correctly
   - [ ] Colors consistent with theme

2. **Accessibility**
   - [ ] Buttons have hover states
   - [ ] Focus indicators visible
   - [ ] Text readable (contrast)
   - [ ] Icons have tooltips/labels

3. **Mobile Responsive** (if applicable)
   - [ ] Chat panel works on mobile
   - [ ] Video grid adapts to screen
   - [ ] Fullscreen works on mobile
   - [ ] Waiting room displays properly

### Expected Results
✅ Fast and responsive
✅ Professional appearance
✅ Good accessibility
✅ Mobile-friendly

---

## Browser Compatibility Testing

| Feature | Chrome | Edge | Safari | Firefox |
|---------|--------|------|--------|---------|
| Persistent Chat | ✅ | ✅ | ✅ | ✅ |
| Fullscreen | ✅ | ✅ | ✅ | ✅ |
| Picture-in-Picture | ✅ | ✅ | ✅ | ⚠️ Not supported |
| Waiting Room | ✅ | ✅ | ✅ | ✅ |
| Real-time | ✅ | ✅ | ✅ | ✅ |

---

## Regression Testing

After Phase 1 changes, verify existing features still work:

### Core Telehealth Features
- [ ] Video connection establishes
- [ ] Audio works both ways
- [ ] Mute/unmute functions
- [ ] Video on/off works
- [ ] Session recording (if enabled)
- [ ] End session gracefully
- [ ] Post-session notes

### Appointment Features
- [ ] Create appointment with telehealth
- [ ] Telehealth link generated
- [ ] Client can access link
- [ ] Session tied to appointment

### Security & Privacy
- [ ] RLS policies enforced
- [ ] Users can't see other sessions
- [ ] Screen protection active
- [ ] HIPAA compliance maintained

---

## Sign-Off Checklist

### Development
- [x] TypeScript compiles with no errors
- [x] No console errors in browser
- [x] All components render correctly
- [x] Migration file created

### Testing
- [ ] All Test 1-6 scenarios passed
- [ ] Browser compatibility verified
- [ ] Performance acceptable
- [ ] No regressions found

### Documentation
- [x] Implementation summary created
- [x] Migration guide created
- [x] Testing guide created
- [ ] User guide updated (optional)

### Deployment
- [ ] Migration applied to staging
- [ ] Tested on staging environment
- [ ] Migration applied to production
- [ ] Tested on production
- [ ] Monitoring enabled

---

## Issue Reporting Template

If you find issues during testing:

```markdown
### Issue: [Brief Description]

**Severity:** Critical / High / Medium / Low

**Steps to Reproduce:**
1.
2.
3.

**Expected Behavior:**

**Actual Behavior:**

**Browser/Device:**

**Screenshots/Logs:**

**Related Feature:**
- [ ] Persistent Chat
- [ ] Fullscreen/PiP
- [ ] Waiting Room
- [ ] Other: ___
```

---

## Success Criteria

Phase 1 is considered complete when:

✅ All test scenarios pass
✅ No critical or high-severity bugs
✅ Performance meets expectations (<500ms message latency)
✅ Works on Chrome, Edge, Safari (Firefox PiP known limitation)
✅ Migration applied successfully
✅ Documentation complete

**Next:** Proceed to Phase 2 implementation
**Reference:** `TELEHEALTH_PROFESSIONAL_UPGRADE_PLAN.md`

---

**Created:** October 9, 2025
**Version:** 1.0
**Phase:** 1 Testing Guide
