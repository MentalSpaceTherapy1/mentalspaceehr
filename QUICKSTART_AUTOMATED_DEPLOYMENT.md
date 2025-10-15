# Quick Start: Automated Lambda Deployment

**🎯 Goal:** Deploy all 15 Phase 1 Lambda functions in ~10 minutes (vs 90+ minutes manual)

---

## Option 1: Fully Automated (RECOMMENDED)

### Step 1: Get AWS Configuration Values

Open PowerShell in the `infrastructure` folder and run:

```powershell
cd infrastructure
.\get-aws-config.ps1
```

**What this does:**
- Automatically finds all required ARNs and IDs
- Saves them to `aws-config-values.txt`
- Shows you what values were found

**Example output:**
```
✅ Account ID: 706704660887
✅ VPC ID: vpc-0abc123 (MentalSpaceVPC)
✅ Subnet 1: subnet-0def456 (MentalSpaceVPC/PrivateSubnet1)
✅ Subnet 2: subnet-0ghi789 (MentalSpaceVPC/PrivateSubnet2)
✅ Security Group: sg-0jkl012 (LambdaSecurityGroup)
✅ Role ARN: arn:aws:iam::706704660887:role/MentalSpaceEhrStack-LambdaExecutionRole-xxxxx
✅ Secret ARN: arn:aws:secretsmanager:us-east-1:706704660887:secret:mentalspace-ehr-db-credentials-xxxxx
✅ Layer ARN: arn:aws:lambda:us-east-1:706704660887:layer:MentalSpaceEhrStack-DatabaseLayer-xxxxx
✅ User Pool ID: us-east-1_xxxxx

🎉 All configuration values found successfully!
```

---

### Step 2: Update Deployment Script

Open `deploy-phase1-lambdas.ps1` and replace the configuration section (lines 8-18) with the values from `aws-config-values.txt`.

**Before:**
```powershell
$AWS_REGION = "us-east-1"
$LAMBDA_ROLE_ARN = "arn:aws:iam::706704660887:role/MentalSpaceEhrStack-LambdaExecutionRole-xxxxx"
$DATABASE_SECRET_ARN = "arn:aws:secretsmanager:us-east-1:706704660887:secret:mentalspace-ehr-db-credentials-al4fLD"
$DATABASE_NAME = "mentalspaceehr"
$COGNITO_USER_POOL_ID = "us-east-1_xxxxx"  # UPDATE THIS
$VPC_ID = "vpc-xxxxx"  # UPDATE THIS
$SUBNET_ID_1 = "subnet-xxxxx"  # UPDATE THIS
$SUBNET_ID_2 = "subnet-xxxxx"  # UPDATE THIS
$SECURITY_GROUP_ID = "sg-xxxxx"  # UPDATE THIS
$DATABASE_LAYER_ARN = "arn:aws:lambda:us-east-1:706704660887:layer:MentalSpaceEhrStack-DatabaseLayer-xxxxx"  # UPDATE THIS
```

**After** (paste from `aws-config-values.txt`):
```powershell
$AWS_REGION = "us-east-1"
$LAMBDA_ROLE_ARN = "arn:aws:iam::706704660887:role/MentalSpaceEhrStack-LambdaExecutionRole-ABC123"
$DATABASE_SECRET_ARN = "arn:aws:secretsmanager:us-east-1:706704660887:secret:mentalspace-ehr-db-credentials-al4fLD"
$DATABASE_NAME = "mentalspaceehr"
$COGNITO_USER_POOL_ID = "us-east-1_ABC123DEF"
$VPC_ID = "vpc-0abc123def"
$SUBNET_ID_1 = "subnet-0def456ghi"
$SUBNET_ID_2 = "subnet-0ghi789jkl"
$SECURITY_GROUP_ID = "sg-0jkl012mno"
$DATABASE_LAYER_ARN = "arn:aws:lambda:us-east-1:706704660887:layer:MentalSpaceEhrStack-DatabaseLayer-ABC123"
```

---

### Step 3: Deploy All Functions

Run the deployment script:

```powershell
.\deploy-phase1-lambdas.ps1
```

**What happens:**
```
========================================
  Phase 1 Lambda Deployment
  15 Critical Functions
========================================

✅ AWS CLI authenticated

[1/15] Deploying create-user...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Deploying: mentalspace-create-user
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 Creating deployment package...
✅ Package created: 2.4 KB
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
4. Deploy Phase 2 functions
```

**Timeline:** ~5-10 minutes (vs 90+ minutes manual)

---

## Option 2: Manual Deployment (AWS Console)

If you prefer the manual approach or the automated script fails, follow:

📖 **[START_HERE_DEPLOY_PHASE1.md](START_HERE_DEPLOY_PHASE1.md)**

This guide walks you through creating each function via AWS Console with screenshots and step-by-step instructions.

---

## Verification

After deployment (automated or manual), verify all functions exist:

```powershell
aws lambda list-functions --region us-east-1 --query "Functions[?starts_with(FunctionName, 'mentalspace-')].FunctionName" --output table
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

---

## Troubleshooting

### Error: "AWS CLI not configured"

**Solution:**
```powershell
aws configure
```

Enter:
- AWS Access Key ID
- AWS Secret Access Key
- Default region: `us-east-1`
- Default output format: `json`

---

### Error: "get-aws-config.ps1 cannot be loaded"

**Solution:**
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

Then run the script again.

---

### Error: "Some values are UNKNOWN"

**Solution:** Manually find the missing values:

1. **VPC ID:**
   - Go to: https://console.aws.amazon.com/vpc/home?region=us-east-1#vpcs
   - Look for VPC with "MentalSpace" in the name
   - Copy the VPC ID (starts with `vpc-`)

2. **Subnets:**
   - Go to: https://console.aws.amazon.com/vpc/home?region=us-east-1#subnets
   - Filter by VPC ID
   - Find TWO subnets with "Private" in the name
   - Copy both subnet IDs

3. **Security Group:**
   - Go to: https://console.aws.amazon.com/vpc/home?region=us-east-1#SecurityGroups
   - Look for "LambdaSecurityGroup"
   - Copy the security group ID (starts with `sg-`)

4. **Lambda Role:**
   - Go to: https://console.aws.amazon.com/iam/home?region=us-east-1#/roles
   - Search for "LambdaExecutionRole"
   - Click the role → Copy ARN

5. **Database Secret:**
   - Go to: https://console.aws.amazon.com/secretsmanager/home?region=us-east-1#!/listSecrets
   - Find "mentalspace-ehr-db-credentials"
   - Copy the ARN

6. **Database Layer:**
   - Go to: https://console.aws.amazon.com/lambda/home?region=us-east-1#/layers
   - Find "DatabaseLayer"
   - Copy the latest version ARN

7. **Cognito User Pool:**
   - Go to: https://console.aws.amazon.com/cognito/v2/idp/user-pools?region=us-east-1
   - Find "mentalspace-ehr-users" pool
   - Copy the User Pool ID (starts with `us-east-1_`)

---

### Error: "Function already exists"

This is fine! The script will update the existing function instead of creating a new one.

---

### Error: "Timeout" or "Cannot connect to database"

**Possible causes:**
1. VPC configuration incorrect
2. Security group doesn't allow Lambda → Database
3. Database secret ARN wrong

**Solution:** Verify VPC settings in AWS Console:
- Lambda → Your function → Configuration → VPC
- Should show 2 private subnets
- Should show Lambda security group

---

## Next Steps

Once all 15 functions are deployed:

### 1. Configure API Gateway

See: **[MANUAL_LAMBDA_DEPLOYMENT_GUIDE.md](MANUAL_LAMBDA_DEPLOYMENT_GUIDE.md)** - Section "STEP 6: Configure API Gateway"

Or use this quick command to create all endpoints (coming soon).

---

### 2. Test an Endpoint

```powershell
# Get your API Gateway URL
aws apigatewayv2 get-apis --region us-east-1 --query "Items[?Name=='MentalSpace EHR API'].ApiEndpoint" --output text

# Test list-users (requires auth token)
$API_URL = "https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/prod"
$TOKEN = "YOUR_COGNITO_JWT_TOKEN"

curl -X GET "$API_URL/users" -H "Authorization: Bearer $TOKEN"
```

**Expected response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "profile": {
        "first_name": "John",
        "last_name": "Doe"
      }
    }
  ]
}
```

---

### 3. Update Frontend

Edit `.env`:
```env
VITE_API_ENDPOINT=https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/prod
```

Restart dev server:
```powershell
npm run dev
```

---

### 4. Deploy Phase 2 (Telehealth)

Once Phase 1 is working, deploy the 11 telehealth functions:

```powershell
.\deploy-phase2-lambdas.ps1  # (to be created)
```

---

## Summary

| Method | Time | Difficulty | Use When |
|--------|------|------------|----------|
| **Automated** | 10 min | Easy | You trust scripts and want speed |
| **Manual** | 90 min | Medium | You want to learn or scripts fail |

**Recommendation:** Try automated first. If it fails, fall back to manual.

---

## Support

If you get stuck:

1. Check CloudWatch Logs:
   - Go to: https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#logsV2:log-groups
   - Find: `/aws/lambda/mentalspace-FUNCTION-NAME`
   - Look for error messages

2. Test individual function:
   - Go to Lambda → Your function → Test tab
   - Create test event (see examples in guides)
   - Click "Test"
   - Check response for errors

3. Verify IAM permissions:
   - Lambda role should have:
     - `AWSLambdaVPCAccessExecutionRole`
     - Secrets Manager read access
     - CloudWatch Logs write access

---

**Ready to deploy?**

Run: `.\get-aws-config.ps1` to get started!
