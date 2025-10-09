# Telehealth Session Troubleshooting Guide

## Problem: "Waiting for others" - Video Not Connecting

### Quick Checks

1. **Both users must be in the SAME session**
   - Staff and client should join using links from the same appointment
   - Check browser console for "WebRTC will connect to room:" - should show same ID

2. **Check browser console for WebRTC logs**
   Open Developer Tools (F12) and look for these messages:

   **Expected flow:**
   ```
   WebRTC will connect to room: session_xxx
   [WebRTC] Announcing presence: <user-id>
   [WebRTC] Peer joined: <other-user-id> Creating offer...
   [WebRTC] Received offer from: <user-id>
   [WebRTC] Received answer from: <user-id>
   ```

3. **Camera/Microphone permissions**
   - Both users must grant camera/microphone access
   - Check browser address bar for blocked permissions
   - Try refreshing and granting permissions again

### Detailed Troubleshooting Steps

#### Step 1: Verify Session IDs Match

**Staff side:**
1. Open browser console (F12)
2. Look for: `WebRTC will connect to room: session_xxx`
3. Copy the session ID

**Client side:**
1. Open browser console (F12)
2. Look for: `WebRTC will connect to room: session_xxx`
3. Compare with staff's session ID - **must be identical**

**If IDs don't match:**
- Staff and client are in different sessions
- Make sure both joined from the same appointment
- Try having staff create a new appointment and share the link

#### Step 2: Check WebRTC Channel Subscription

Look for these console messages:

```
[WebRTC] Announcing presence: <user-id>
```

**If you DON'T see this:**
- The WebRTC channel didn't subscribe properly
- Try refreshing the page
- Check network tab for Supabase Realtime connection errors

#### Step 3: Check for Peer Detection

**On the side that joined FIRST (usually staff):**
```
[WebRTC] Peer joined: <client-user-id> Creating offer...
```

**If you DON'T see this:**
- The first user didn't detect the second user joining
- The `peer-joined` broadcast might not be working
- Check Supabase Realtime is enabled in your project

**On the side that joined SECOND (usually client):**
```
[WebRTC] Received offer from: <staff-user-id>
```

**If you DON'T see this:**
- The offer wasn't sent or received
- Could be a Supabase Realtime broadcast issue

#### Step 4: Check for Answer

**On the side that sent the offer (usually staff):**
```
[WebRTC] Received answer from: <client-user-id>
```

**If you DON'T see this:**
- The client didn't send an answer
- Could be an ICE candidate exchange problem
- Check for firewall/network restrictions

### Common Issues and Solutions

#### Issue: "Cannot read properties of undefined (reading 'send')"

**Cause**: WebRTC channel not initialized before trying to broadcast

**Solution**:
1. Make sure `localStream` is initialized before WebRTC hook runs
2. Check that `normalizedSessionId` is set before WebRTC connects
3. Verify media permissions granted

#### Issue: ICE connection fails

**Symptoms**:
- Logs show "ICE connection failed" or "ICE disconnected"
- Connection state shows "failed"

**Solutions**:
1. **Check network/firewall**: Some corporate networks block WebRTC
2. **Try different network**: Test on mobile hotspot
3. **Check TURN servers**: Cloudflare TURN might be blocked
4. **Update browser**: Use latest Chrome/Firefox/Edge

#### Issue: One-way video (only one person can see)

**Cause**: Asymmetric NAT or firewall

**Solutions**:
1. Check that BOTH users granted camera permissions
2. Look for errors in console about getUserMedia
3. Try swapping who joins first

#### Issue: No audio/video tracks

**Check console for**:
```javascript
DOMException: Permission denied
```

**Solution**:
1. Click shield/lock icon in address bar
2. Allow camera and microphone
3. Refresh page

### Network Requirements

**Ports needed:**
- UDP 3478 (STUN)
- UDP 49152-65535 (Media)
- TCP 443 (Signaling via Supabase)

**Bandwidth requirements:**
- Minimum: 1 Mbps up/down
- Recommended: 3+ Mbps up/down
- HD video: 5+ Mbps up/down

### Testing Locally

1. **Open two browser windows**:
   - Window 1: Log in as staff
   - Window 2: Log in as client (incognito mode)

2. **Create appointment** (Window 1)
3. **Join from staff side** (Window 1)
4. **Join from client side** (Window 2)
5. **Watch console logs** in both windows

### Supabase Configuration

Ensure Supabase Realtime is enabled:

1. Go to Supabase Dashboard
2. Navigate to Database > Realtime
3. Ensure `telehealth_sessions` table has Realtime enabled
4. Check that Realtime is enabled for your project

### Edge Function Issues

If get-twilio-token is configured:

**Check that function is deployed:**
```bash
supabase functions list
```

**Should show:**
```
get-twilio-token
```

**Check secrets are set:**
```bash
supabase secrets list
```

**Should show:**
```
TWILIO_ACCOUNT_SID
TWILIO_API_KEY
TWILIO_API_SECRET
```

### Still Not Working?

1. **Check browser compatibility**:
   - Chrome 90+
   - Firefox 88+
   - Safari 14+
   - Edge 90+

2. **Disable browser extensions**:
   - Ad blockers can interfere with WebRTC
   - VPN extensions can block connections
   - Try in incognito/private mode

3. **Check Supabase status**:
   - Visit status.supabase.com
   - Ensure Realtime service is operational

4. **Review recent commits**:
   ```bash
   git log --oneline -5
   ```
   Should show:
   ```
   7084a6a fix: Critical telehealth session WebRTC peer connection and UX issues
   ```

5. **Verify code is deployed**:
   - Clear browser cache (Ctrl+Shift+Delete)
   - Hard refresh (Ctrl+Shift+R)
   - Check if production build is updated

### Debug Mode

Add this to localStorage to enable verbose logging:

```javascript
// In browser console:
localStorage.setItem('DEBUG_WEBRTC', 'true');
```

Then refresh and check console for detailed WebRTC stats.

### Contact Support

If still having issues, provide:
1. Browser console logs from BOTH users
2. Network tab showing Realtime connection
3. Screenshot of "Waiting for others" screen
4. Browser version and OS
5. Network type (WiFi, Corporate, Mobile)
