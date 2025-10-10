# Set Up Twilio Video for Telehealth - Complete Guide

## 🎯 What You Need to Do

Your app is trying to use Twilio Video but the edge function isn't deployed yet. Follow these steps to fix the "Failed to connect to video service" error.

---

## ✅ Step 1: Add Secrets to Supabase

### Go to Your Supabase Dashboard

1. Open: **https://supabase.com/dashboard**
2. Select your project: **mentalspaceehr** (or whatever your project is named)
3. Click on **Edge Functions** in the left sidebar
4. Click on **Manage secrets** button

### Add These 3 Secrets

Copy these values **exactly** (from your **TWILIO_CREDENTIALS_LOCAL.txt** file):

**Secret 1:**
- Name: `TWILIO_ACCOUNT_SID`
- Value: `<Get from TWILIO_CREDENTIALS_LOCAL.txt - starts with AC...>`

**Secret 2:**
- Name: `TWILIO_API_KEY`
- Value: `<Get from TWILIO_CREDENTIALS_LOCAL.txt - starts with SK...>`

**Secret 3:**
- Name: `TWILIO_API_SECRET`
- Value: `<Get from TWILIO_CREDENTIALS_LOCAL.txt - your API secret>`

**Note**: The actual values are in your local `TWILIO_CREDENTIALS_LOCAL.txt` file which is NOT committed to GitHub for security.

Click **Save** after adding each secret.

---

## ✅ Step 2: Deploy the Edge Function

### Option A: Deploy via Supabase Dashboard (Easiest)

1. In Supabase Dashboard, go to **Edge Functions**
2. Click **"Create a new function"**
3. Function name: `get-twilio-token`
4. Copy the entire code from: `supabase/functions/get-twilio-token/index.ts`
5. Paste it into the dashboard editor
6. Click **"Deploy function"**

### Option B: Deploy via CLI (if you have Supabase CLI installed)

```bash
# Make sure you're logged in
npx supabase login

# Link your project (if not already linked)
npx supabase link --project-ref YOUR_PROJECT_REF

# Deploy the function
npx supabase functions deploy get-twilio-token
```

---

## ✅ Step 3: Test the Function

### In Supabase Dashboard:

1. Go to **Edge Functions** > `get-twilio-token`
2. Click on **"Invoke function"** or **"Test"**
3. Use this test payload:

```json
{
  "identity": "Test User",
  "room_name": "test-room-123"
}
```

4. Click **"Run"**

### Expected Response:

✅ **Success** - You should see:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImN0eSI6InR3aWxpby1mcGE7dj0xIn0..."
}
```

❌ **Error** - If you see an error:
- Check that all 3 secrets are set correctly
- Make sure you copied the values exactly (no extra spaces)
- Redeploy the function

---

## ✅ Step 4: Verify Twilio Configuration

### Check Your Twilio Account Settings:

1. Go to: **https://console.twilio.com**
2. Navigate to: **Develop** > **Video** > **Settings** (or **Rooms > Settings**)
3. Verify these settings:

#### Default Room Settings:
- **Recording**: DISABLED (unless you want automatic recording)
- **Maximum Participants**: 50
- **Maximum Participant Duration**: 14400 (4 hours)
- **Media Region**: US East - us1 (or your preferred region)

#### Client-side Room Creation:
- **ENABLED** ✅ (This must be enabled!)

#### Realtime Transcriptions:
- **Decline** (or Accept if you want transcription features)

---

## ✅ Step 5: Test Telehealth in Your App

1. **Clear browser cache** (Ctrl+Shift+Delete)
2. **Hard refresh** (Ctrl+Shift+R)
3. Log in as **staff**
4. Create an appointment for a client
5. Join the telehealth session
6. **Wait for camera/mic permissions**
7. Click **"Grant Access"**

### Expected Behavior:

✅ **Working**:
- You see "Connecting to session..."
- Camera activates
- You see yourself in the video grid
- Status shows "Connected"

❌ **Still Not Working**:
- Check browser console (F12) for errors
- Look for "Failed to get Twilio token" or similar
- Make sure the edge function is deployed and secrets are set

---

## 🐛 Troubleshooting

### Error: "Failed to connect to video service"

**Cause**: Edge function not deployed or secrets not set

**Fix**:
1. Verify all 3 secrets are in Supabase Dashboard
2. Verify edge function is deployed
3. Test the function in dashboard (Step 3)

### Error: "Server configuration error"

**Cause**: Missing Twilio credentials in edge function

**Fix**:
1. Check that secret names are EXACTLY:
   - `TWILIO_ACCOUNT_SID` (not ACCOUNT_SID)
   - `TWILIO_API_KEY` (not API_KEY)
   - `TWILIO_API_SECRET` (not API_SECRET)
2. Redeploy the function after fixing secrets

### Error: "Invalid access token"

**Cause**: Wrong credentials or expired keys

**Fix**:
1. Go to Twilio Console: https://console.twilio.com
2. Navigate to **Account** > **API keys & tokens**
3. Verify your API Key and Secret are still active
4. If needed, create a new API Key and update secrets

### Error: "CORS error"

**Cause**: Edge function CORS headers issue

**Fix**:
- The function should already have CORS headers
- Redeploy the function
- Clear browser cache

### "Waiting for others" - Participants Can't Connect

**Cause**: Both users need to connect to Twilio

**Steps**:
1. Make sure BOTH staff AND client grant camera/mic permissions
2. Both should see their own video
3. Wait 5-10 seconds for connection to establish
4. Check browser console for Twilio connection logs

---

## 📊 How to Verify Everything is Working

### Open Browser Console (F12) and Look For:

```
[Twilio] Connecting to room: session_xxx
[Twilio] Connected to room successfully
[Twilio] Local tracks added
[Twilio] Participant joined: <other-user-name>
[Twilio] Remote tracks received
```

### In Twilio Console:

1. Go to: **Monitor** > **Logs** > **Video Logs**
2. You should see:
   - Room created
   - Participants connected
   - No error messages

---

## 💰 Twilio Costs

**Free Tier Includes:**
- First 15,000 minutes/month FREE
- Additional minutes: $0.001 - $0.004 per participant minute

**Your Usage Estimate:**
- 10 sessions/day × 60 minutes × 2 participants = 1,200 minutes/day
- Monthly: ~36,000 minutes = ~$36-$144/month

**To Monitor Costs:**
1. Twilio Console > **Billing** > **Usage**
2. Set up usage alerts
3. Set spending limits if needed

---

## 🔒 HIPAA Compliance

**Important**: For production use with PHI (Protected Health Information):

1. **Sign BAA with Twilio**:
   - Contact Twilio Sales: https://www.twilio.com/enterprise
   - Request HIPAA-compliant account
   - Sign Business Associate Agreement

2. **Enable Encryption**:
   - Twilio Video uses end-to-end encryption by default
   - Verify in: Twilio Console > Video > Settings

3. **Recording Compliance**:
   - Obtain patient consent before recording
   - Store recordings securely (S3 with encryption)
   - Set automatic deletion policies

---

## ✅ Final Checklist

Before marking this complete:

- [ ] All 3 Twilio secrets added to Supabase
- [ ] Edge function `get-twilio-token` deployed
- [ ] Function test returns valid token
- [ ] Twilio client-side room creation ENABLED
- [ ] Test session: Staff can join
- [ ] Test session: Client can join
- [ ] Both participants can see/hear each other
- [ ] Browser console shows no errors

---

## 🎉 Success!

Once all checklist items are complete:
- Telehealth sessions will work with professional Twilio infrastructure
- 99.99% uptime SLA
- Global TURN servers for NAT traversal
- Automatic reconnection on network issues
- Better quality than custom WebRTC

## 📞 Need Help?

If stuck after following this guide:
1. Take screenshot of browser console errors
2. Check Supabase edge function logs
3. Check Twilio console for error logs
4. Verify all credentials are correct
