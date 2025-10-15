# 🚀 START HERE: Deploy Phase 1 Lambda Functions
**Quick Start Guide - 15 Critical Functions**

---

## ✅ Step 0: Information You'll Need

**AWS Account**: `706704660887`
**Region**: `us-east-1`

**You'll need to find these in AWS Console:**
1. VPC ID (search for "MentalSpaceVPC")
2. Lambda Execution Role ARN (search for "MentalSpaceEhrStack-LambdaExecutionRole")
3. Database Layer ARN (search for "DatabaseLayer")
4. Database Secret ARN (search for "mentalspace-ehr-db-credentials")
5. Cognito User Pool ID (search for "mentalspace-ehr-users")

---

## 🎯 Quick Start: Your First Lambda Function

### Function 1: create-user (Takes ~7 minutes)

**1. Open AWS Lambda Console**
→ https://console.aws.amazon.com/lambda/home?region=us-east-1#/create/function

**2. Configure Basic Settings**
- **Function name**: `mentalspace-create-user`
- **Runtime**: Node.js 20.x
- **Architecture**: x86_64
- Click **"Change default execution role"**
- Select **"Use an existing role"**
- **Role**: Search and select the role with "LambdaExecutionRole" in the name
- Click **"Create function"**

**3. Add Code**
- Wait for function to be created
- In the **Code** tab, you'll see `index.mjs`
- Click the **📄 file icon** to see the code editor
- **DELETE ALL** the sample code
- Copy this code path: `C:\Users\Elize\mentalspaceehr-fresh\infrastructure\lambda\create-user\index.js`
- Open the file in Notepad, copy ALL content
- Paste into AWS console
- Click **"Deploy"** button (top right)

**4. Add Environment Variables**
- Click **"Configuration"** tab
- Click **"Environment variables"** in left menu
- Click **"Edit"**
- Click **"Add environment variable"** (repeat 3 times):

  Variable 1:
  - Key: `DATABASE_SECRET_ARN`
  - Value: `arn:aws:secretsmanager:us-east-1:706704660887:secret:mentalspace-ehr-db-credentials-al4fLD`

  Variable 2:
  - Key: `DATABASE_NAME`
  - Value: `mentalspaceehr`

  Variable 3:
  - Key: `COGNITO_USER_POOL_ID`
  - Value: (Find this: Go to Cognito → User Pools → copy the Pool ID)

- Click **"Save"**

**5. Configure VPC** (IMPORTANT!)
- Still in **Configuration** tab
- Click **"VPC"** in left menu
- Click **"Edit"**
- **VPC**: Select the VPC (should see "MentalSpaceVPC" or similar)
- **Subnets**: Check BOTH boxes for subnets with "Private" in the name
- **Security groups**: Select the group with "LambdaSecurityGroup" in the name
- Click **"Save"** (this takes 1-2 minutes)

**6. Add Database Layer**
- Click **"Code"** tab
- Scroll down to **"Layers"** section
- Click **"Add a layer"**
- Select **"Specify an ARN"**
- ARN: `arn:aws:lambda:us-east-1:706704660887:layer:MentalSpaceEhrStack-DatabaseLayer-xxxxx`
  - (Find exact ARN: Go to Lambda → Layers → Find "DatabaseLayer" → Copy ARN)
- Click **"Add"**

**7. Increase Timeout**
- Click **"Configuration"** → **"General configuration"** → **"Edit"**
- **Memory**: 256 MB
- **Timeout**: 30 seconds
- Click **"Save"**

**8. Test It!** (Optional)
- Click **"Test"** tab
- **Event name**: `test`
- **Event JSON**:
```json
{
  "body": "{\"email\":\"test@example.com\",\"password\":\"Test123!@#\",\"profile\":{\"first_name\":\"Test\",\"last_name\":\"User\"}}",
  "requestContext": {
    "http": {
      "method": "POST"
    }
  }
}
```
- Click **"Test"**
- Look for: `"success": true` in the response

✅ **FUNCTION 1 COMPLETE!**

---

## 📝 Quick Reference: All 15 Functions

Copy this checklist and track your progress:

### Users (5 functions)
- [ ] `mentalspace-create-user` (from `/infrastructure/lambda/create-user/index.js`)
- [ ] `mentalspace-list-users` (from `/infrastructure/lambda/list-users/index.js`)
- [ ] `mentalspace-get-user-roles` (from `/infrastructure/lambda/get-user-roles/index.js`)
- [ ] `mentalspace-update-user-role` (from `/infrastructure/lambda/update-user-role/index.js`)
- [ ] `mentalspace-toggle-user-active` (from `/infrastructure/lambda/toggle-user-active/index.js`)

### Clients (4 functions)
- [ ] `mentalspace-list-clients` (from `/infrastructure/lambda/list-clients/index.js`)
- [ ] `mentalspace-get-client` (from `/infrastructure/lambda/get-client/index.js`)
- [ ] `mentalspace-create-client` (from `/infrastructure/lambda/create-client/index.js`)
- [ ] `mentalspace-update-client` (from `/infrastructure/lambda/update-client/index.js`)

### Appointments (3 functions)
- [ ] `mentalspace-list-appointments` (from `/infrastructure/lambda/list-appointments/index.js`)
- [ ] `mentalspace-create-appointment` (from `/infrastructure/lambda/create-appointment/index.js`)
- [ ] `mentalspace-update-appointment` (from `/infrastructure/lambda/update-appointment/index.js`)

### Profiles (2 functions)
- [ ] `mentalspace-get-profile` (from `/infrastructure/lambda/get-profile/index.js`)
- [ ] `mentalspace-update-profile` (from `/infrastructure/lambda/update-profile/index.js`)

### Dashboard (1 function)
- [ ] `mentalspace-get-dashboard-stats` (from `/infrastructure/lambda/get-dashboard-stats/index.js`)

**All functions use the SAME configuration as Function 1!**
- Same environment variables
- Same VPC settings
- Same security groups
- Same layer
- Same timeout (30s) and memory (256MB)

---

## ⏭️ What's Next?

**After all 15 functions are created:**
1. Configure API Gateway (I'll guide you)
2. Test endpoints
3. Update frontend `.env` file
4. Test the app!

---

## 📞 Ready to Start?

**Begin now:**
1. Open AWS Lambda Console: https://console.aws.amazon.com/lambda/home?region=us-east-1#/create/function
2. Follow **Function 1** steps above
3. When done, repeat for Functions 2-15

**I'm here to help if you get stuck!**

Tell me when you've completed Function 1 and I'll guide you through the next steps.
