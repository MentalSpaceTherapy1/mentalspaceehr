# Ready-to-Deploy Lambda Functions

**Status:** ✅ All 95 Lambda functions ready
**Phase 1:** 15 critical functions (Users, Clients, Appointments, Profiles, Dashboard)

---

## Current Situation

Your AWS IAM user (`mentalspace-chime-sdk`) has **limited permissions**:
- ✅ Can call Lambda API
- ✅ Can deploy functions
- ❌ Cannot describe VPCs
- ❌ Cannot list secrets
- ❌ Cannot list Cognito pools

**This means:**
- ✅ Automated deployment scripts will work
- ❌ Config retrieval script cannot auto-fetch ARNs
- ⚠️ You need to manually fill in ARNs

---

## 3 Deployment Options

### Option A: Manual AWS Console (SAFEST)
**Time:** 90-120 minutes
**Risk:** Low
**Best for:** Learning the process, first-time deployment

📖 **Guide:** [START_HERE_DEPLOY_PHASE1.md](../START_HERE_DEPLOY_PHASE1.md)

**Steps:**
1. Open AWS Lambda Console
2. Create 15 functions one by one
3. Copy code from `lambda/` folders
4. Configure VPC, environment variables, layers
5. Test each function

---

### Option B: Semi-Automated (RECOMMENDED)
**Time:** 30-45 minutes
**Risk:** Medium
**Best for:** Faster deployment with control

**Steps:**

1. **Get missing ARNs manually** (one time, ~15 min):
   - Open [AWS Console](https://console.aws.amazon.com/)
   - Find these values (see "How to Find ARNs" below)
   - Fill in `deploy-phase1-lambdas.ps1`

2. **Run deployment script** (~15 min):
   ```powershell
   cd infrastructure
   .\deploy-phase1-lambdas.ps1
   ```

3. **Verify deployment** (~5 min):
   ```powershell
   aws lambda list-functions --region us-east-1 | grep mentalspace
   ```

---

### Option C: CDK Deployment (MOST AUTOMATED)
**Time:** 60-90 minutes (includes CDK stack update)
**Risk:** High (single point of failure)
**Best for:** Deploying all 95 functions at once

**Status:** Not ready yet (CDK stack needs updating)

---

## How to Find ARNs (For Option B)

Since your IAM user can't auto-fetch these, here's where to find them:

### 1. VPC ID
**URL:** https://console.aws.amazon.com/vpc/home?region=us-east-1#vpcs

**Look for:** VPC with "MentalSpace" in the name
**Copy:** VPC ID (e.g., `vpc-0abc123def456789`)

---

### 2. Private Subnets (need 2)
**URL:** https://console.aws.amazon.com/vpc/home?region=us-east-1#subnets

**Filter by:** Your VPC ID
**Look for:** Subnets with "Private" in name
**Copy:** 2 subnet IDs (e.g., `subnet-0abc123`, `subnet-0def456`)

---

### 3. Lambda Security Group
**URL:** https://console.aws.amazon.com/vpc/home?region=us-east-1#SecurityGroups

**Look for:** Security group with "Lambda" in name
**Copy:** Security group ID (e.g., `sg-0abc123def`)

---

### 4. Lambda Execution Role
**URL:** https://console.aws.amazon.com/iam/home?region=us-east-1#/roles

**Search:** "LambdaExecutionRole"
**Click the role** → **Copy ARN**
**Example:** `arn:aws:iam::706704660887:role/MentalSpaceEhrStack-LambdaExecutionRole-ABC123`

---

### 5. Database Secret
**URL:** https://console.aws.amazon.com/secretsmanager/home?region=us-east-1#!/listSecrets

**Look for:** "mentalspace-ehr-db-credentials"
**Copy ARN** (we already know this one):
`arn:aws:secretsmanager:us-east-1:706704660887:secret:mentalspace-ehr-db-credentials-al4fLD`

---

### 6. Database Layer
**URL:** https://console.aws.amazon.com/lambda/home?region=us-east-1#/layers

**Look for:** "DatabaseLayer" or "MentalSpaceEhrStack-DatabaseLayer"
**Copy the latest version ARN:**
**Example:** `arn:aws:lambda:us-east-1:706704660887:layer:MentalSpaceEhrStack-DatabaseLayer-ABC123:1`

---

### 7. Cognito User Pool ID
**URL:** https://console.aws.amazon.com/cognito/v2/idp/user-pools?region=us-east-1

**Look for:** "mentalspace-ehr-users"
**Copy:** User Pool ID
**Example:** `us-east-1_ABC123DEF`

---

## Pre-Filled Template (Option B)

Once you have the values, paste them into `deploy-phase1-lambdas.ps1`:

```powershell
# AWS Configuration
$AWS_REGION = "us-east-1"
$LAMBDA_ROLE_ARN = "arn:aws:iam::706704660887:role/MentalSpaceEhrStack-LambdaExecutionRole-????"  # GET FROM IAM
$DATABASE_SECRET_ARN = "arn:aws:secretsmanager:us-east-1:706704660887:secret:mentalspace-ehr-db-credentials-al4fLD"  # ALREADY KNOWN
$DATABASE_NAME = "mentalspaceehr"  # ALREADY KNOWN
$COGNITO_USER_POOL_ID = "us-east-1_????"  # GET FROM COGNITO
$VPC_ID = "vpc-????"  # GET FROM VPC
$SUBNET_ID_1 = "subnet-????"  # GET FROM VPC → SUBNETS (Private 1)
$SUBNET_ID_2 = "subnet-????"  # GET FROM VPC → SUBNETS (Private 2)
$SECURITY_GROUP_ID = "sg-????"  # GET FROM VPC → SECURITY GROUPS
$DATABASE_LAYER_ARN = "arn:aws:lambda:us-east-1:706704660887:layer:MentalSpaceEhrStack-DatabaseLayer-????:?"  # GET FROM LAMBDA → LAYERS
```

---

## What's Deployed in Phase 1

### User Management (5 functions)
- ✅ `mentalspace-create-user` - Create new staff user
- ✅ `mentalspace-list-users` - List all users
- ✅ `mentalspace-get-user-roles` - Get user roles
- ✅ `mentalspace-update-user-role` - Update user role
- ✅ `mentalspace-toggle-user-active` - Enable/disable user

### Client Management (4 functions)
- ✅ `mentalspace-list-clients` - List all clients
- ✅ `mentalspace-get-client` - Get single client
- ✅ `mentalspace-create-client` - Create new client
- ✅ `mentalspace-update-client` - Update client info

### Appointments (3 functions)
- ✅ `mentalspace-list-appointments` - List appointments
- ✅ `mentalspace-create-appointment` - Create appointment
- ✅ `mentalspace-update-appointment` - Update appointment

### Profiles (2 functions)
- ✅ `mentalspace-get-profile` - Get user profile
- ✅ `mentalspace-update-profile` - Update profile

### Dashboard (1 function)
- ✅ `mentalspace-get-dashboard-stats` - Dashboard statistics

**Total: 15 functions**

---

## After Deployment

### 1. Configure API Gateway

You'll need to connect these Lambda functions to your API Gateway so the frontend can call them.

**Guide:** See `MANUAL_LAMBDA_DEPLOYMENT_GUIDE.md` - Section "STEP 6: Configure API Gateway"

**Quick setup:**
- Create API resources (`/users`, `/clients`, etc.)
- Add HTTP methods (GET, POST, PUT)
- Connect to Lambda functions
- Add Cognito authorizer
- Deploy to `prod` stage

---

### 2. Test Endpoints

```powershell
# Get API URL
$API_URL = "https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/prod"

# Test (requires Cognito token)
$TOKEN = "YOUR_JWT_TOKEN"
curl -X GET "$API_URL/users" -H "Authorization: Bearer $TOKEN"
```

**Expected response:**
```json
{
  "success": true,
  "data": [...]
}
```

---

### 3. Update Frontend

Edit `.env`:
```env
VITE_API_ENDPOINT=https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/prod
```

Restart:
```bash
npm run dev
```

---

### 4. Deploy Phase 2 (Telehealth)

11 telehealth functions ready to deploy:
- `get-telehealth-session`
- `create-telehealth-session`
- `update-telehealth-session`
- `list-session-messages`
- `create-session-message`
- `create-waiting-room-entry`
- `admit-from-waiting-room`
- `list-waiting-room-queue`
- `create-session-participant`
- `update-session-participant`
- `list-session-participants`

---

## Troubleshooting

### Script Error: "cannot be loaded because running scripts is disabled"

**Fix:**
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

---

### Deployment Error: "Invalid role ARN"

**Check:**
- Role ARN format: `arn:aws:iam::706704660887:role/...`
- Role exists in IAM console
- Role has Lambda execution permissions

---

### Function Error: "Cannot connect to database"

**Check:**
- VPC ID is correct
- 2 private subnets selected
- Security group allows Lambda → Database
- Database secret ARN is correct

---

### Test Fails: "Function not found"

**Check:**
- Function name starts with `mentalspace-`
- Function is in `us-east-1` region
- Deployment succeeded without errors

---

## Status Check

Run these commands to verify your setup:

```powershell
# Check AWS authentication
aws sts get-caller-identity

# Count Lambda functions
aws lambda list-functions --region us-east-1 --query "length(Functions[?starts_with(FunctionName, 'mentalspace-')])"

# List deployed functions
aws lambda list-functions --region us-east-1 --query "Functions[?starts_with(FunctionName, 'mentalspace-')].FunctionName" --output table
```

---

## Summary

| Approach | Time | ARN Fetch | Deploy | Risk |
|----------|------|-----------|--------|------|
| **Option A: Manual** | 90-120 min | Manual via Console | Manual via Console | Low |
| **Option B: Semi-Auto** | 30-45 min | Manual via Console | Automated script | Medium |
| **Option C: CDK** | 60-90 min | CDK auto | CDK auto | High |

**Recommendation:**

1. **First deployment:** Option A (Manual) - Learn the process
2. **Subsequent deployments:** Option B (Semi-Auto) - Faster updates
3. **Future:** Option C (CDK) - Full automation after testing

---

## Ready to Start?

### For Option A (Manual):
1. Open [START_HERE_DEPLOY_PHASE1.md](../START_HERE_DEPLOY_PHASE1.md)
2. Follow step-by-step instructions
3. Takes 90-120 minutes

### For Option B (Semi-Auto):
1. Find 7 ARN values (see "How to Find ARNs" above)
2. Update `deploy-phase1-lambdas.ps1`
3. Run: `.\deploy-phase1-lambdas.ps1`
4. Takes 30-45 minutes

---

**Questions? Need help?** Check [MANUAL_LAMBDA_DEPLOYMENT_GUIDE.md](MANUAL_LAMBDA_DEPLOYMENT_GUIDE.md) for detailed troubleshooting.
