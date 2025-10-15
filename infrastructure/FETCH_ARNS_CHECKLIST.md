# AWS ARN Values Checklist
**Account:** 706704660887 | **Region:** us-east-1

Copy each value as you find it. These will go into `deploy-phase1-lambdas.ps1`.

---

## ✅ Already Known (No Action Needed)

```powershell
$AWS_REGION = "us-east-1"
$DATABASE_SECRET_ARN = "arn:aws:secretsmanager:us-east-1:706704660887:secret:mentalspace-ehr-db-credentials-al4fLD"
$DATABASE_NAME = "mentalspaceehr"
```

---

## 🔍 Need to Find (7 values)

### 1️⃣ VPC ID

**Direct Link:** https://console.aws.amazon.com/vpc/home?region=us-east-1#vpcs

**What to do:**
1. Look for VPC with "MentalSpace" in the Name column
2. If not found, look for your main VPC (usually named after the stack)
3. Copy the VPC ID (starts with `vpc-`)

**Paste here:**
```
VPC ID: vpc-_____________________
```

---

### 2️⃣ Private Subnet 1

**Direct Link:** https://console.aws.amazon.com/vpc/home?region=us-east-1#subnets

**What to do:**
1. In the filter box, paste your VPC ID to see only subnets in that VPC
2. Look for subnets with "Private" in the Name
3. Find the FIRST private subnet
4. Copy its Subnet ID (starts with `subnet-`)

**Paste here:**
```
Subnet 1: subnet-_____________________
```

---

### 3️⃣ Private Subnet 2

**Same page as above**

**What to do:**
1. Find the SECOND private subnet (must be in a different Availability Zone)
2. Copy its Subnet ID

**Paste here:**
```
Subnet 2: subnet-_____________________
```

---

### 4️⃣ Lambda Security Group

**Direct Link:** https://console.aws.amazon.com/vpc/home?region=us-east-1#SecurityGroups

**What to do:**
1. Look for security group with "Lambda" in the name
2. If not found, look for one that allows database access (description might mention RDS/Aurora)
3. Copy the Security Group ID (starts with `sg-`)

**Paste here:**
```
Security Group: sg-_____________________
```

---

### 5️⃣ Lambda Execution Role ARN

**Direct Link:** https://console.aws.amazon.com/iam/home?region=us-east-1#/roles

**What to do:**
1. In the search box, type: `LambdaExecutionRole`
2. Click on the role name
3. Copy the entire ARN from the top of the page

**Paste here:**
```
Role ARN: arn:aws:iam::706704660887:role/_____________________
```

---

### 6️⃣ Database Layer ARN

**Direct Link:** https://console.aws.amazon.com/lambda/home?region=us-east-1#/layers

**What to do:**
1. Look for layer named "DatabaseLayer" or "MentalSpaceEhrStack-DatabaseLayer"
2. Click on it
3. Copy the ARN from the latest version (should end with `:1` or `:2`)

**Paste here:**
```
Layer ARN: arn:aws:lambda:us-east-1:706704660887:layer/_____________________:_
```

---

### 7️⃣ Cognito User Pool ID

**Direct Link:** https://console.aws.amazon.com/cognito/v2/idp/user-pools?region=us-east-1

**What to do:**
1. Look for user pool with "mentalspace" in the name
2. Click on it
3. Copy the User Pool ID (format: `us-east-1_XXXXXXXXX`)

**Paste here:**
```
User Pool ID: us-east-1_____________________
```

---

## 📝 All Values Together

Once you have all 7 values, they should look like this:

```powershell
# Values you found:
$VPC_ID = "vpc-0abc123def456789"
$SUBNET_ID_1 = "subnet-0abc123def"
$SUBNET_ID_2 = "subnet-0ghi789jkl"
$SECURITY_GROUP_ID = "sg-0mno345pqr"
$LAMBDA_ROLE_ARN = "arn:aws:iam::706704660887:role/MentalSpaceEhrStack-LambdaExecutionRole-ABC123"
$DATABASE_LAYER_ARN = "arn:aws:lambda:us-east-1:706704660887:layer:MentalSpaceEhrStack-DatabaseLayer-ABC123:1"
$COGNITO_USER_POOL_ID = "us-east-1_ABC123DEF"

# Already known:
$AWS_REGION = "us-east-1"
$DATABASE_SECRET_ARN = "arn:aws:secretsmanager:us-east-1:706704660887:secret:mentalspace-ehr-db-credentials-al4fLD"
$DATABASE_NAME = "mentalspaceehr"
```

---

## ⚠️ Troubleshooting

### Can't find VPC with "MentalSpace" name?
- Look for the default VPC or any VPC you created for this project
- Check the VPC ID in your CDK stack output or CloudFormation

### Can't find Private Subnets?
- They might be named differently (e.g., "PrivateSubnet1", "AppSubnet", etc.)
- Look for subnets that DON'T have "Public" in the name
- Check Route Table - private subnets route to NAT Gateway, not Internet Gateway

### Can't find Lambda Security Group?
- Look for any security group in your VPC
- Check CloudFormation stack outputs
- Might be named after the stack (e.g., "MentalSpaceEhrStack-LambdaSG-ABC123")

### Can't find Lambda Execution Role?
- Search for any role with "Lambda" in the name
- Check CloudFormation stack resources
- Look for role with policies: AWSLambdaVPCAccessExecutionRole

### Can't find Database Layer?
- Go to Lambda → Layers
- If none exist, you may need to create one first (see note below)
- Layer should contain the `pg` (PostgreSQL) library

### Can't find Cognito User Pool?
- Switch to "Legacy" Cognito console if using new version
- Search for any user pool
- Check CloudFormation outputs

---

## 🚨 If Database Layer Doesn't Exist

You'll need to create it first. Quick commands:

```powershell
# Create layer directory
mkdir -p lambda-layer/nodejs
cd lambda-layer/nodejs

# Install pg library
npm init -y
npm install pg

# Go back and zip
cd ..
Compress-Archive -Path nodejs -DestinationPath database-layer.zip

# Upload to AWS
aws lambda publish-layer-version `
  --layer-name MentalSpaceEhrStack-DatabaseLayer `
  --description "PostgreSQL driver for Lambda functions" `
  --zip-file fileb://database-layer.zip `
  --compatible-runtimes nodejs20.x `
  --region us-east-1
```

This will output the Layer ARN - copy it!

---

## ✅ When You Have All Values

Proceed to: **Step 2** in this guide (update deploy-phase1-lambdas.ps1)
