# AWS CloudShell Deployment Guide

**🎯 Deploy all 15 Phase 1 Lambda functions in ~15 minutes**

CloudShell is a browser-based shell with AWS CLI pre-configured and all necessary permissions. No local setup required!

---

## Step 1: Prepare the Upload Package

On your local machine, create a ZIP file with all Lambda functions:

### Windows (PowerShell):

```powershell
# Navigate to infrastructure folder
cd infrastructure

# Create ZIP with all Lambda functions
Compress-Archive -Path lambda -DestinationPath lambda-functions.zip -Force

# Verify ZIP was created
ls lambda-functions.zip
```

### Mac/Linux (Bash):

```bash
# Navigate to infrastructure folder
cd infrastructure

# Create ZIP with all Lambda functions
zip -r lambda-functions.zip lambda/

# Verify ZIP was created
ls -lh lambda-functions.zip
```

**Expected output:** `lambda-functions.zip` (~100-500 KB)

---

## Step 2: Open AWS CloudShell

1. **Go to AWS Console:**
   https://console.aws.amazon.com/

2. **Switch to us-east-1 region:**
   - Top right corner → Select **N. Virginia (us-east-1)**

3. **Open CloudShell:**
   - Click the **>_** icon in the top navigation bar
   - OR go directly to: https://console.aws.amazon.com/cloudshell/home?region=us-east-1

4. **Wait for CloudShell to initialize** (10-15 seconds)

---

## Step 3: Upload Files to CloudShell

In the CloudShell window:

1. **Click "Actions" → "Upload file"**

2. **Upload these 2 files:**
   - `lambda-functions.zip` (from Step 1)
   - `cloudshell-deploy.sh` (in infrastructure folder)

3. **Wait for uploads to complete**
   - You'll see "Successfully uploaded" messages

4. **Verify uploads:**
   ```bash
   ls -lh
   ```

   **Expected output:**
   ```
   -rw-r--r-- 1 cloudshell-user cloudshell-user  15K cloudshell-deploy.sh
   -rw-r--r-- 1 cloudshell-user cloudshell-user 500K lambda-functions.zip
   ```

---

## Step 4: Extract Lambda Functions

```bash
# Unzip Lambda functions
unzip lambda-functions.zip

# Verify extraction
ls -la lambda/
```

**Expected output:** You should see 95 Lambda function directories

---

## Step 5: Run Deployment Script

```bash
# Make script executable
chmod +x cloudshell-deploy.sh

# Run deployment
./cloudshell-deploy.sh
```

**What happens:**

1. **Auto-fetches all AWS configuration** (10-15 seconds)
   - Account ID
   - VPC ID
   - Subnets
   - Security groups
   - IAM role
   - Database secret
   - Cognito user pool

2. **Creates missing resources** (if needed)
   - Lambda execution role
   - Database layer (with pg library)

3. **Deploys 15 functions** (~5-10 minutes)
   - Creates deployment packages
   - Uploads to Lambda
   - Configures VPC, environment variables
   - Attaches database layer

4. **Shows deployment summary**

---

## Step 6: Expected Output

You should see output like this:

```
========================================
  MentalSpace EHR - Lambda Deployment
  Phase 1: 15 Critical Functions
========================================

Step 1: Auto-fetching AWS Configuration...

→ Getting Account ID...
✅ Account: 706704660887

→ Finding Database Secret...
✅ Secret: arn:aws:secretsmanager:us-east-1:706704660887:secret:mentalspace-ehr-db-credentials-al4fLD

→ Finding VPC...
✅ VPC: vpc-0abc123def

→ Finding Private Subnets...
✅ Subnet 1: subnet-0abc123
✅ Subnet 2: subnet-0def456

→ Finding Lambda Security Group...
✅ Security Group: sg-0abc123

→ Finding Lambda Execution Role...
✅ Role: arn:aws:iam::706704660887:role/MentalSpaceLambdaExecutionRole

→ Finding Database Layer...
✅ Layer: arn:aws:lambda:us-east-1:706704660887:layer:MentalSpaceEhrStack-DatabaseLayer:1

→ Finding Cognito User Pool...
✅ User Pool: us-east-1_ABC123DEF

========================================
  Configuration Complete!
========================================

========================================
  Deploying Functions
========================================

[1/15] Deploying create-user...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Deploying: mentalspace-create-user
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 Creating deployment package...
✅ Package created: 2.4K
🆕 Creating new function...
✅ Function created
📚 Adding database layer...
✅ Layer attached
✅ mentalspace-create-user deployed successfully

[2/15] Deploying list-users...
...
[15/15] Deploying get-dashboard-stats...

========================================
  Deployment Summary
========================================
✅ Succeeded: 15
Total: 15

🎉 All Phase 1 functions deployed successfully!

Next steps:
1. Configure API Gateway endpoints
2. Test endpoints with authentication
3. Update frontend .env file
```

---

## Step 7: Verify Deployment

List all deployed functions:

```bash
aws lambda list-functions --region us-east-1 \
  --query "Functions[?starts_with(FunctionName, 'mentalspace-')].FunctionName" \
  --output table
```

**Expected output:**

```
-----------------------------------
|        ListFunctions           |
+--------------------------------+
|  mentalspace-create-user       |
|  mentalspace-list-users        |
|  mentalspace-get-user-roles    |
|  mentalspace-update-user-role  |
|  mentalspace-toggle-user-active|
|  mentalspace-list-clients      |
|  mentalspace-get-client        |
|  mentalspace-create-client     |
|  mentalspace-update-client     |
|  mentalspace-list-appointments |
|  mentalspace-create-appointment|
|  mentalspace-update-appointment|
|  mentalspace-get-profile       |
|  mentalspace-update-profile    |
|  mentalspace-get-dashboard-stats|
+--------------------------------+
```

**Count:** Should be exactly **15 functions**

---

## Step 8: Test a Function

Test the `list-users` function:

```bash
aws lambda invoke \
  --function-name mentalspace-list-users \
  --region us-east-1 \
  --payload '{}' \
  /tmp/output.json

# View response
cat /tmp/output.json
```

**Expected response:**
```json
{
  "statusCode": 200,
  "body": "{\"success\":true,\"data\":[...]}"
}
```

---

## Troubleshooting

### Error: "cloudshell-deploy.sh: Permission denied"

**Fix:**
```bash
chmod +x cloudshell-deploy.sh
```

---

### Error: "lambda/create-user/index.js not found"

**Cause:** ZIP file wasn't extracted properly

**Fix:**
```bash
# Remove and re-extract
rm -rf lambda
unzip lambda-functions.zip
ls lambda/
```

---

### Error: "Role cannot be assumed by Lambda"

**Cause:** IAM role was just created and needs time to propagate

**Fix:** Script already includes 10-second wait. If still failing:
```bash
# Wait 30 more seconds
sleep 30

# Re-run script
./cloudshell-deploy.sh
```

---

### Error: "Subnet not found" or "Invalid VPC configuration"

**Cause:** Script couldn't auto-detect VPC settings

**Fix:** Edit script to hardcode values:

```bash
# Edit script
nano cloudshell-deploy.sh

# Find these lines (around line 30-50) and replace with your values:
VPC_ID="vpc-YOUR_VPC_ID"
SUBNET_ID_1="subnet-YOUR_SUBNET_1"
SUBNET_ID_2="subnet-YOUR_SUBNET_2"
SECURITY_GROUP_ID="sg-YOUR_SG_ID"

# Save (Ctrl+X, Y, Enter)

# Re-run
./cloudshell-deploy.sh
```

---

### Error: "Function already exists"

**Not an error!** Script will update the existing function instead.

---

### Deployment stuck or very slow?

**Cause:** VPC ENI creation takes time on first deployment

**What to do:** Wait patiently. First function may take 2-3 minutes. Subsequent functions are faster (~30 seconds each).

---

## After Successful Deployment

### Next Steps:

1. **Configure API Gateway** (see [MANUAL_LAMBDA_DEPLOYMENT_GUIDE.md](../MANUAL_LAMBDA_DEPLOYMENT_GUIDE.md) - Section 6)

2. **Test endpoints:**
   ```bash
   # Get API Gateway URL
   aws apigatewayv2 get-apis --region us-east-1 \
     --query "Items[?Name=='MentalSpace EHR API'].ApiEndpoint" \
     --output text
   ```

3. **Update frontend `.env`:**
   ```env
   VITE_API_ENDPOINT=https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/prod
   ```

---

## CloudShell Tips

### Save Your Work

CloudShell automatically saves files in your home directory (`~/`). They persist across sessions.

### Download Files from CloudShell

If you need to download logs or outputs:

1. Click "Actions" → "Download file"
2. Enter file path (e.g., `/tmp/deployment.log`)

### CloudShell Limitations

- **Session timeout:** 20 minutes of inactivity
- **Storage:** 1 GB persistent storage per region
- **Upload size:** 1 MB per file (our ZIP should be under this)

### Re-run Deployment

If you need to re-deploy (e.g., after code changes):

1. Upload new `lambda-functions.zip`
2. Extract: `unzip -o lambda-functions.zip` (overwrites existing)
3. Run: `./cloudshell-deploy.sh`

---

## Summary

**Total Time:** ~15-20 minutes

| Step | Time |
|------|------|
| Prepare ZIP | 2 min |
| Open CloudShell | 1 min |
| Upload files | 2 min |
| Extract ZIP | 30 sec |
| Run deployment | 10-15 min |
| Verify | 1 min |

**After this:**
- ✅ 15 Lambda functions deployed
- ✅ VPC configured
- ✅ Database layer attached
- ✅ Environment variables set
- ⏳ Need to configure API Gateway
- ⏳ Need to test endpoints

---

## Ready to Deploy?

1. **Create ZIP:** `Compress-Archive -Path lambda -DestinationPath lambda-functions.zip`
2. **Open CloudShell:** https://console.aws.amazon.com/cloudshell/home?region=us-east-1
3. **Upload:** `lambda-functions.zip` and `cloudshell-deploy.sh`
4. **Run:** `./cloudshell-deploy.sh`
5. **Celebrate!** 🎉

---

**Need help?** Check the Troubleshooting section or review the deployment logs in CloudShell.
