# 🚀 Next: Setup API Gateway

You've successfully deployed **80 Lambda functions**! Now let's create the API Gateway so your frontend can call them.

---

## 📦 File Location

The API Gateway automation script is here:

```
C:\Users\Elize\mentalspaceehr-fresh\infrastructure\setup-api-gateway.sh
```

---

## ⚡ Quick Steps (10 minutes)

### Step 1: Upload Script to CloudShell

In your **AWS CloudShell** window (still open from before):

1. Click **"Actions"** → **"Upload file"**
2. Navigate to: `C:\Users\Elize\mentalspaceehr-fresh\infrastructure\`
3. Select **`setup-api-gateway.sh`**
4. Click Upload

---

### Step 2: Run API Gateway Setup

Copy-paste these commands into CloudShell:

```bash
# Make script executable
chmod +x setup-api-gateway.sh

# Run API Gateway setup
./setup-api-gateway.sh
```

---

## 📺 What You'll See

The script will:

1. **Find Cognito User Pool** (for authentication)
2. **Create REST API** (MentalSpace EHR API)
3. **Create Cognito Authorizer** (secure all endpoints)
4. **Create API Resources** (~20 endpoints)
   - /users
   - /clients
   - /appointments
   - /profile
   - /dashboard/stats
   - /notes
   - /tasks
   - etc.
5. **Connect Lambda Functions** (integrate all endpoints)
6. **Enable CORS** (allow frontend to call API)
7. **Deploy to Production** (prod stage)

**Total time:** 5-10 minutes

---

## ✅ Success Output

At the end, you'll see:

```
========================================
  🎉 API Gateway Setup Complete!
========================================

API Endpoint:
https://abc123xyz.execute-api.us-east-1.amazonaws.com/prod

Example endpoints:
  GET  https://abc123xyz.execute-api.us-east-1.amazonaws.com/prod/users
  POST https://abc123xyz.execute-api.us-east-1.amazonaws.com/prod/users
  GET  https://abc123xyz.execute-api.us-east-1.amazonaws.com/prod/clients
  ...

Next steps:
1. Update your frontend .env file:
   VITE_API_ENDPOINT=https://abc123xyz.execute-api.us-east-1.amazonaws.com/prod
```

---

## 🎯 After API Gateway Setup

### Step 3: Update Frontend

Copy the API endpoint URL from the output, then:

**On your local machine:**

1. Open `.env` file in your project root
2. Add or update this line:
   ```env
   VITE_API_ENDPOINT=https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/prod
   ```
3. Save the file

---

### Step 4: Restart Frontend

```bash
npm run dev
```

Your app should now connect to the AWS Lambda backend!

---

## 🧪 Testing the API

### Option 1: Test in CloudShell (No Auth)

If Cognito isn't configured, you can test directly:

```bash
API_URL="https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/prod"
curl $API_URL/users
```

---

### Option 2: Test with Authentication

If Cognito is configured, you'll need a JWT token:

1. Login to your app
2. Open browser DevTools → Console
3. Get token:
   ```javascript
   localStorage.getItem('token')
   ```
4. Test:
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" $API_URL/users
   ```

---

## 🎊 What Gets Created

| Endpoint | Method | Lambda Function |
|----------|--------|-----------------|
| /users | GET | mentalspace-list-users |
| /users | POST | mentalspace-create-user |
| /users/roles | GET | mentalspace-get-user-roles |
| /users/{id} | PUT | mentalspace-update-user-role |
| /users/{id}/toggle | POST | mentalspace-toggle-user-active |
| /clients | GET | mentalspace-list-clients |
| /clients | POST | mentalspace-create-client |
| /clients/{id} | GET | mentalspace-get-client |
| /clients/{id} | PUT | mentalspace-update-client |
| /appointments | GET | mentalspace-list-appointments |
| /appointments | POST | mentalspace-create-appointment |
| /appointments/{id} | PUT | mentalspace-update-appointment |
| /profile | GET | mentalspace-get-profile |
| /profile | PUT | mentalspace-update-profile |
| /dashboard/stats | GET | mentalspace-get-dashboard-stats |
| /notes | GET | mentalspace-list-notes |
| /notes | POST | mentalspace-create-note |
| /tasks | GET | mentalspace-list-tasks |
| /tasks | POST | mentalspace-create-task |
| /tasks/{id} | PUT | mentalspace-update-task |

**Total:** 20+ endpoints

---

## 🔧 Troubleshooting

### Error: "REST API already exists"

The script will fail if an API with the same name exists.

**Fix:**
```bash
# Delete existing API
aws apigateway get-rest-apis --region us-east-1 \
  --query "items[?name=='MentalSpace EHR API'].id" --output text

# Delete it (replace API_ID)
aws apigateway delete-rest-api --rest-api-id API_ID --region us-east-1

# Run script again
./setup-api-gateway.sh
```

---

### Error: "Permission denied"

```bash
chmod +x setup-api-gateway.sh
```

---

### Script runs but no output?

Check CloudShell logs:
```bash
./setup-api-gateway.sh 2>&1 | tee api-setup.log
cat api-setup.log
```

---

## 📊 Progress Summary

✅ **Completed:**
- 80 Lambda functions deployed
- Database layer attached
- VPC configured
- Environment variables set

⏳ **Next (You are here):**
- Upload `setup-api-gateway.sh` to CloudShell
- Run the script
- Get API endpoint URL

⏭️ **After that:**
- Update frontend `.env`
- Test the app
- Deploy remaining features

---

## 🚀 Ready?

1. **Upload:** `infrastructure/setup-api-gateway.sh` to CloudShell
2. **Run:**
   ```bash
   chmod +x setup-api-gateway.sh
   ./setup-api-gateway.sh
   ```
3. **Copy the API URL** from the output
4. **Update `.env`** on your local machine

Let's create your API! 🎉
