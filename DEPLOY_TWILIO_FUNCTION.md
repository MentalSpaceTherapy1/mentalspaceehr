# Deploy Twilio Edge Function - Step by Step Guide

## Your Twilio Credentials
Get these from your Twilio Console at https://console.twilio.com

**You will need:**
- TWILIO_ACCOUNT_SID (starts with AC...)
- TWILIO_API_KEY (starts with SK...)
- TWILIO_API_SECRET (shown once when creating API key)

---

## Step 1: Set Secrets in Supabase Dashboard

1. Go to: https://supabase.com/dashboard/project/_/settings/functions
   - (Replace _ with your project reference)

2. Click **"Manage secrets"** or **"Add new secret"**

3. Add these 3 secrets with YOUR values:

- **TWILIO_ACCOUNT_SID**: Your Account SID from Twilio
- **TWILIO_API_KEY**: Your API Key SID from Twilio  
- **TWILIO_API_SECRET**: Your API Secret from Twilio

---

## Step 2: Deploy Edge Function

The function code is in: `supabase/functions/get-twilio-token/index.ts`

### Via Supabase Dashboard:

1. Go to: https://supabase.com/dashboard/project/_/functions
2. Click: "Create a new function" 
3. Name: `get-twilio-token`
4. Copy the code from `supabase/functions/get-twilio-token/index.ts`
5. Paste into the dashboard editor
6. Click "Deploy"

---

## Step 3: Test

Test with this request body:
```json
{
  "identity": "Test User",
  "room_name": "test-room-123"  
}
```

Should return:
```json
{
  "token": "eyJ..."
}
```

---

## Step 4: Use in App

Once deployed, telehealth will automatically use Twilio Video!

1. Log in to app
2. Create telehealth appointment
3. Join session
4. Video powered by Twilio ✅

**Ready for production telehealth!** 🎉
