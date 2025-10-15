# 🔧 Fix API Errors ("Failed to fetch")

Your application is showing "Error fetching schedule - Failed to fetch" because the CRUD Lambda functions aren't deployed yet.

---

## 🎯 The Problem

The frontend calls generic database endpoints like:
```
GET /query/clinician_schedules
GET /query/appointments
POST /insert/clients
PUT /update/tasks
```

But these Lambda functions don't exist yet! You only deployed 80 specific functions (like `get-user-roles`, `list-clients`) but not the generic CRUD handlers.

---

## ✅ The Solution

Deploy 4 new Lambda functions that handle all database operations:

1. **query-database** - Handles all SELECT queries
2. **insert-database** - Handles all INSERT operations
3. **update-database** - Handles all UPDATE operations
4. **delete-database** - Handles all DELETE operations

---

## ⚡ Quick Fix (10 minutes)

### Step 1: Upload Files to CloudShell

**Files to upload:**
1. `infrastructure/deploy-crud-lambdas.sh`
2. `infrastructure/update-api-gateway-routes.sh`
3. Entire `infrastructure/lambda/` folder (contains the 4 new functions)

**How to upload folder to CloudShell:**

1. Open AWS CloudShell (us-east-1)
2. Create lambda directory:
   ```bash
   mkdir -p lambda
   ```
3. Upload each function folder:
   - Click **"Actions"** → **"Upload file"**
   - Navigate to `C:\Users\Elize\mentalspaceehr-fresh\infrastructure\lambda\query-database\`
   - Select `index.js`
   - Repeat for: `insert-database`, `update-database`, `delete-database`

Or zip them locally first:
```powershell
# On your local machine
cd C:\Users\Elize\mentalspaceehr-fresh\infrastructure
Compress-Archive -Path lambda/query-database,lambda/insert-database,lambda/update-database,lambda/delete-database -DestinationPath crud-lambdas.zip
```

Then upload `crud-lambdas.zip` to CloudShell and extract:
```bash
unzip crud-lambdas.zip
```

---

### Step 2: Run Deployment Script

In CloudShell:

```bash
# Make scripts executable
chmod +x deploy-crud-lambdas.sh
chmod +x update-api-gateway-routes.sh

# Deploy the 4 CRUD Lambda functions
./deploy-crud-lambdas.sh
```

This will:
- ✅ Get database credentials from Secrets Manager
- ✅ Package each Lambda function with dependencies
- ✅ Create/update the 4 functions in AWS Lambda
- ✅ Configure environment variables (database connection)
- ✅ Set up VPC networking

**Expected output:**
```
========================================
  Deploy CRUD Lambda Functions
========================================

→ Getting database credentials from Secrets Manager...
✅ Retrieved database credentials

========================================
  Deploying: mentalspace-query-database
========================================

→ Creating deployment package...
✅ Package created: query-database.zip

→ Checking if function exists...
⚠️  Function doesn't exist, creating...
✅ Function created
✅ Function active

[... repeat for insert, update, delete ...]

🎉 All CRUD Functions Deployed!

Functions deployed:
  • mentalspace-query-database   (GET /query/{table})
  • mentalspace-insert-database  (POST /insert/{table})
  • mentalspace-update-database  (PUT /update/{table})
  • mentalspace-delete-database  (POST /delete/{table})
```

---

### Step 3: Update API Gateway Routes

Still in CloudShell:

```bash
# Add routes to API Gateway
./update-api-gateway-routes.sh
```

This will:
- ✅ Create API Gateway integrations for each Lambda
- ✅ Add the 4 new routes (query, insert, update, delete)
- ✅ Configure JWT authorization
- ✅ Grant API Gateway permissions to invoke Lambdas
- ✅ Deploy API to 'prod' stage

**Expected output:**
```
========================================
  Update API Gateway Routes
========================================

→ Getting API Gateway details...
✅ API: mentalspace-api (g4fv3te9nf)

========================================
  Route: GET /query/{table}
  Lambda: mentalspace-query-database
========================================

✅ Lambda ARN: arn:aws:lambda:us-east-1:...
✅ Integration ID: abc123
✅ Route created
✅ Permission granted

[... repeat for insert, update, delete ...]

========================================
  Deploying API to 'prod' stage
========================================

✅ API deployed!

🎉 API Gateway Updated Successfully!

Your API is now ready at:
https://g4fv3te9nf.execute-api.us-east-1.amazonaws.com/prod

New CRUD routes available:
  • GET    /query/{table}     - Query any table
  • POST   /insert/{table}    - Insert into any table
  • PUT    /update/{table}    - Update any table
  • POST   /delete/{table}    - Delete from any table

✅ Your application should now work!
```

---

### Step 4: Test the Application

Go back to your browser at http://localhost:8080:

1. **Hard refresh:** Press **Ctrl+Shift+R**
2. Navigate to **My Schedule** in the sidebar
3. The "Error fetching schedule" should be GONE! ✅
4. Try navigating to:
   - **Clients** - Should load without errors
   - **Tasks** - Should load your tasks
   - **Schedule** - Should show calendar

---

## 🧪 Verify Deployment

Check if functions were created:

```bash
aws lambda list-functions \
  --region us-east-1 \
  --query 'Functions[?contains(FunctionName, `database`)].FunctionName' \
  --output table
```

Should show:
```
----------------------------------
|        ListFunctions          |
+---------------------------------+
|  mentalspace-query-database    |
|  mentalspace-insert-database   |
|  mentalspace-update-database   |
|  mentalspace-delete-database   |
+--------------------------------+
```

Check API Gateway routes:

```bash
aws apigatewayv2 get-routes \
  --api-id g4fv3te9nf \
  --region us-east-1 \
  --query 'Items[?contains(RouteKey, `table`)].RouteKey' \
  --output table
```

Should show:
```
------------------------------
|         GetRoutes          |
+----------------------------+
|  GET /query/{table}       |
|  POST /insert/{table}     |
|  PUT /update/{table}      |
|  POST /delete/{table}     |
+----------------------------+
```

---

## ❓ Troubleshooting

### Error: "Lambda function already exists"

This is fine! The script will update the existing function code.

---

### Error: "VPC subnet not found"

Update the VPC configuration in `deploy-crud-lambdas.sh`:

```bash
# Get your VPC config
aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=*lambda*" \
  --query 'SecurityGroups[0].GroupId' \
  --output text

aws ec2 describe-subnets \
  --filters "Name=vpc-id,Values=YOUR_VPC_ID" \
  --query 'Subnets[*].SubnetId' \
  --output text
```

Update lines in script:
```bash
VPC_SECURITY_GROUP_ID="sg-YOUR-SECURITY-GROUP"
VPC_SUBNET_IDS="subnet-123,subnet-456"
```

---

### Error: "Permission denied to get secret"

Your Lambda role needs Secrets Manager permissions. Add this policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": "secretsmanager:GetSecretValue",
    "Resource": "arn:aws:secretsmanager:us-east-1:706704660887:secret:mentalspace-ehr-db-credentials-*"
  }]
}
```

---

### Still Getting "Failed to fetch"

1. **Check Lambda logs:**
   ```bash
   aws logs tail /aws/lambda/mentalspace-query-database \
     --follow \
     --region us-east-1
   ```

2. **Test Lambda directly:**
   ```bash
   aws lambda invoke \
     --function-name mentalspace-query-database \
     --payload '{"pathParameters":{"table":"users"},"queryStringParameters":{}}' \
     --region us-east-1 \
     response.json && cat response.json
   ```

3. **Check API Gateway logs:**
   - Go to API Gateway console
   - Select your API
   - Go to "Stages" → "prod" → "Logs"
   - Enable CloudWatch logging

4. **Check browser console:**
   - Press F12
   - Go to "Network" tab
   - Refresh page
   - Click on failed request
   - Check "Response" tab for error details

---

## 🎊 Summary

**Files to upload to CloudShell:**
1. `deploy-crud-lambdas.sh`
2. `update-api-gateway-routes.sh`
3. `lambda/query-database/index.js`
4. `lambda/insert-database/index.js`
5. `lambda/update-database/index.js`
6. `lambda/delete-database/index.js`

**Commands to run:**
```bash
chmod +x *.sh
./deploy-crud-lambdas.sh
./update-api-gateway-routes.sh
```

**Result:**
- ✅ 4 new Lambda functions deployed
- ✅ API Gateway routes added
- ✅ All database operations working
- ✅ No more "Failed to fetch" errors!

---

**Ready to deploy?** Upload the files to CloudShell and run the scripts! 🚀
