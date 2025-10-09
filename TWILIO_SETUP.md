# Twilio Video Setup Guide for MentalSpace EHR

## Overview

This application has been migrated from a custom WebRTC implementation to Twilio Video for improved reliability, HIPAA compliance, and professional support.

## Why Twilio Video?

- ✅ HIPAA-compliant with BAA available
- ✅ 99.99% uptime SLA
- ✅ Built-in reconnection and error handling
- ✅ Adaptive bitrate and quality optimization
- ✅ Professional support and documentation
- ✅ Recording and transcription capabilities
- ✅ ~$270/month for typical small practice

## Setup Instructions

### Step 1: Create Twilio Account

1. Go to https://www.twilio.com/try-twilio
2. Sign up for a free trial account
3. Verify your email and phone number
4. Navigate to the Console: https://console.twilio.com

### Step 2: Get Your Credentials

#### Account SID
1. In the Twilio Console dashboard
2. Copy your **Account SID** from the Project Info section

#### API Key & Secret
1. Go to **Account** > **API keys & tokens**
2. Click **Create API key**
3. Give it a name like "MentalSpace EHR Video"
4. Select **Standard** as the key type
5. Click **Create API Key**
6. **IMPORTANT:** Copy the **SID** (API Key) and **Secret** immediately
   - The secret will only be shown once!
   - Store them securely (password manager recommended)

### Step 3: Sign HIPAA Business Associate Agreement (BAA)

**CRITICAL for healthcare applications:**

1. Contact Twilio Sales: https://www.twilio.com/legal/sales-contact
2. Request a HIPAA Business Associate Agreement
3. Or email: sales@twilio.com with subject "HIPAA BAA Request"
4. Mention you're using Twilio Video for telehealth
5. They will send you the BAA to review and sign
6. This is **REQUIRED** before using in production with PHI

### Step 4: Configure Supabase Edge Function

Add the following secrets to your Supabase project:

```bash
# Via Supabase CLI
supabase secrets set TWILIO_ACCOUNT_SID=your-account-sid
supabase secrets set TWILIO_API_KEY=your-api-key-sid
supabase secrets set TWILIO_API_SECRET=your-api-secret

# Or via Supabase Dashboard
# Go to: Project Settings > Edge Functions > Secrets
# Add each secret manually
```

### Step 5: Deploy Edge Function

```bash
# Deploy the Twilio token generator function
supabase functions deploy get-twilio-token
```

### Step 6: Test the Integration

1. Start your development server
2. Log in to the application
3. Create a test telehealth appointment
4. Click "Join Session" from the appointment
5. You should see:
   - Camera and microphone prompt
   - Successful connection to Twilio
   - Your video feed
   - Ability to toggle mute/video

## Cost Estimate

### Twilio Pricing (as of 2025)

**Group Rooms (what you're using):**
- $0.004 per participant-minute

**Example Monthly Cost:**
- 10 sessions/day × 50 minutes × 2 participants = 1,000 participant-minutes/day
- 1,000 × 30 days = 30,000 participant-minutes/month
- 30,000 × $0.004 = **$120/month**

**Additional Services (optional):**
- Recording: $0.004/min recorded
- Composition (multi-party recording): $0.020/min
- Transcription: Via third-party or OpenAI Whisper

**Free Trial:**
- Twilio provides trial credit to test
- Upgrade to paid account for production

## Features Included

### ✅ What Twilio Provides

1. **Reliable Infrastructure**
   - Global edge network
   - Automatic failover
   - Load balancing

2. **Quality Optimization**
   - Adaptive bitrate
   - Network resilience
   - Automatic quality adjustments

3. **Built-in Features**
   - Screen sharing
   - Recording (with consent)
   - Network quality indicators
   - Reconnection handling

4. **HIPAA Compliance**
   - Encrypted connections (TLS/SRTP)
   - PHI protection
   - Audit logs
   - BAA available

### 🔧 What You Still Manage

1. **Session Management**
   - Your excellent database schema
   - Consent tracking
   - Waiting room
   - Appointment integration

2. **UI/UX**
   - VideoGrid component
   - Session controls
   - Chat sidebar
   - Quality indicators

3. **Security**
   - User authentication
   - Access control
   - Audit logging
   - Consent verification

## Migration Complete

### What Was Replaced

❌ **Old (Custom WebRTC):**
- Manual peer connections
- Public STUN/TURN servers
- Custom signaling via Supabase Realtime
- Complex error handling
- No vendor support

✅ **New (Twilio Video):**
- Managed peer connections
- Professional TURN infrastructure
- Built-in signaling
- Automatic error recovery
- 24/7 vendor support

### What Was Kept

✅ **Your Architecture:**
- Database schema (telehealth_sessions, etc.)
- Consent workflow
- Waiting room management
- Security event logging
- Session lifecycle management
- Post-session workflows

## Troubleshooting

### Token Generation Fails

**Error:** "Server configuration error"

**Solution:**
- Verify Supabase secrets are set correctly
- Check edge function logs: `supabase functions logs get-twilio-token`
- Ensure API key has proper permissions

### Connection Fails

**Error:** "Connection Error"

**Solution:**
- Check browser console for detailed errors
- Verify room name is valid (alphanumeric, hyphens, underscores)
- Test with Twilio's Video Quickstart: https://www.twilio.com/docs/video/javascript-getting-started

### No Video/Audio

**Solution:**
- Check browser permissions (Settings > Privacy > Camera/Microphone)
- Ensure HTTPS is used (required for media access)
- Try different browser (Chrome/Edge recommended)

### Poor Quality

**Check:**
- Network connection (run bandwidth test first)
- Number of participants (recommend max 4 for group sessions)
- Browser compatibility (update to latest version)

## Support Resources

- **Twilio Docs:** https://www.twilio.com/docs/video
- **Twilio Support:** https://support.twilio.com
- **HIPAA Compliance:** https://www.twilio.com/legal/tos/hipaa-baa
- **Status Page:** https://status.twilio.com

## Next Steps

1. ✅ Sign up for Twilio account
2. ✅ Get API credentials
3. ✅ Sign HIPAA BAA (for production)
4. ✅ Configure Supabase secrets
5. ✅ Deploy edge function
6. ✅ Test thoroughly
7. ✅ Go live!

## Production Checklist

Before going live:

- [ ] HIPAA BAA signed with Twilio
- [ ] Secrets configured in production Supabase
- [ ] Edge function deployed to production
- [ ] Tested with multiple browsers
- [ ] Tested with poor network conditions
- [ ] Verified recording consent workflow
- [ ] Confirmed audit logging works
- [ ] Load tested with expected concurrent users
- [ ] Monitoring and alerting configured

---

**Questions?** Refer to the production readiness assessment or Twilio documentation.

**Estimated Setup Time:** 2-3 hours (including Twilio account setup and BAA request)
