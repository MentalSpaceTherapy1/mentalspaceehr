# ⚠️ IMPORTANT: IAM Permissions Issue

## Current Situation

Your AWS CLI is authenticated as:
```
User: arn:aws:iam::706704660887:user/mentalspace-chime-sdk
```

**This user has VERY LIMITED permissions:**
- ❌ Cannot list Lambda functions
- ❌ Cannot create Lambda functions
- ❌ Cannot list VPCs/Subnets/Security Groups
- ❌ Cannot list IAM roles
- ❌ Cannot list Secrets
- ❌ Cannot list Cognito User Pools
- ❌ Cannot list CloudFormation stacks

**This means:**
- ❌ Automated deployment script WILL FAIL
- ❌ Cannot fetch ARN values via CLI
- ✅ Manual AWS Console approach WILL WORK (if you have Console access)

---

## 🎯 Solution: Choose Your Path

### Path A: Fix IAM Permissions (RECOMMENDED)

You need to grant the `mentalspace-chime-sdk` user these permissions:

**Required IAM Policies:**
1. **Lambda Full Access** (or custom policy below)
2. **VPC Read Access**
3. **IAM Read Access**
4. **Secrets Manager Read Access**
5. **Cognito Read Access**

**Custom Policy (Least Privilege):**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "lambda:CreateFunction",
        "lambda:UpdateFunctionCode",
        "lambda:UpdateFunctionConfiguration",
        "lambda:GetFunction",
        "lambda:ListFunctions",
        "lambda:ListLayers",
        "lambda:PublishLayerVersion",
        "lambda:InvokeFunction"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "ec2:DescribeVpcs",
        "ec2:DescribeSubnets",
        "ec2:DescribeSecurityGroups",
        "ec2:CreateNetworkInterface",
        "ec2:DeleteNetworkInterface",
        "ec2:DescribeNetworkInterfaces"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "iam:GetRole",
        "iam:ListRoles",
        "iam:PassRole"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue",
        "secretsmanager:ListSecrets"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "cognito-idp:ListUserPools",
        "cognito-idp:DescribeUserPool"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "cloudformation:DescribeStacks",
        "cloudformation:ListStacks"
      ],
      "Resource": "*"
    }
  ]
}
```

**How to Add Permissions:**

1. **Via AWS Console:**
   - Go to: https://console.aws.amazon.com/iam/home?region=us-east-1#/users/mentalspace-chime-sdk
   - Click "Add permissions" → "Attach policies directly"
   - Search for "AWSLambda_FullAccess" and attach
   - Search for "AmazonVPCReadOnlyAccess" and attach
   - Search for "IAMReadOnlyAccess" and attach

2. **Via AWS CLI (if you have admin access):**
   ```bash
   # Attach managed policies
   aws iam attach-user-policy \
     --user-name mentalspace-chime-sdk \
     --policy-arn arn:aws:iam::aws:policy/AWSLambda_FullAccess

   aws iam attach-user-policy \
     --user-name mentalspace-chime-sdk \
     --policy-arn arn:aws:iam::aws:policy/AmazonVPCReadOnlyAccess

   aws iam attach-user-policy \
     --user-name mentalspace-chime-sdk \
     --policy-arn arn:aws:iam::aws:policy/IAMReadOnlyAccess
   ```

**After adding permissions:**
- Run `get-aws-config.ps1` again
- Then run `deploy-phase1-lambdas.ps1`

---

### Path B: Use a Different IAM User/Role

If you have access to another IAM user or can assume an admin role:

```bash
# Configure different profile
aws configure --profile admin

# Use admin profile for deployment
$env:AWS_PROFILE = "admin"
.\deploy-phase1-lambdas.ps1
```

---

### Path C: Use AWS Console Only (SLOWER but WORKS)

If you can't fix IAM permissions but have AWS Console access:

**Follow the manual guide:**
1. Open [FETCH_ARNS_CHECKLIST.md](FETCH_ARNS_CHECKLIST.md)
2. Copy each ARN value from AWS Console
3. Paste into `deploy-phase1-lambdas.ps1`
4. Run the script (will fail on create, then switch to manual)

**OR go fully manual:**
1. Follow [START_HERE_DEPLOY_PHASE1.md](../START_HERE_DEPLOY_PHASE1.md)
2. Create each function via AWS Console
3. Takes 90-120 minutes but doesn't need CLI permissions

---

### Path D: Use AWS CloudShell (EASIEST!)

AWS CloudShell has permissions pre-configured!

**Steps:**
1. Go to: https://console.aws.amazon.com/cloudshell/home?region=us-east-1
2. Click "Actions" → "Upload file"
3. Upload `deploy-phase1-lambdas.sh` (the bash version)
4. Upload all Lambda function folders (zip them first)
5. Run:
   ```bash
   chmod +x deploy-phase1-lambdas.sh
   ./deploy-phase1-lambdas.sh
   ```

**CloudShell advantages:**
- ✅ Already has IAM permissions
- ✅ No need to configure AWS CLI locally
- ✅ Can run bash scripts
- ✅ Free to use

---

## 🎯 My Recommendation

**Best to Worst:**

1. **Path D (CloudShell)** - Easiest, no IAM changes needed
2. **Path A (Fix IAM)** - Best long-term solution
3. **Path B (Different User)** - If you have admin access
4. **Path C (Manual Console)** - Last resort, very slow

---

## Next Steps Based on Your Choice

### If Path A (Fix IAM):
1. Add permissions to `mentalspace-chime-sdk` user
2. Run: `.\get-aws-config.ps1`
3. Update `deploy-phase1-lambdas.ps1` with values
4. Run: `.\deploy-phase1-lambdas.ps1`

### If Path D (CloudShell):
1. Open AWS CloudShell
2. Upload deployment script and Lambda folders
3. Run the bash script
4. All done!

### If Path C (Manual):
1. Open [FETCH_ARNS_CHECKLIST.md](FETCH_ARNS_CHECKLIST.md)
2. Copy each ARN from Console
3. Follow [START_HERE_DEPLOY_PHASE1.md](../START_HERE_DEPLOY_PHASE1.md)

---

## What Would You Like to Do?

**Tell me which path you want to take and I'll provide detailed instructions!**
