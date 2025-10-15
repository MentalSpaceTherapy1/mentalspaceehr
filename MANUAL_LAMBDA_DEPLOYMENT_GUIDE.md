# Manual Lambda Deployment Guide - Phase 1
**15 Critical Functions for Core EHR**

---

## 📋 Prerequisites

Before we start, gather this information from your AWS account:

### 1. Get CDK Stack Outputs
```bash
cd infrastructure
npx cdk outputs
```

You need:
- ✅ **VPC ID**: `vpc-xxxxx`
- ✅ **Database Secret ARN**: `arn:aws:secretsmanager:us-east-1:706704660887:secret:mentalspace-ehr-db-credentials-xxxxx`
- ✅ **User Pool ID**: `us-east-1_xxxxx`
- ✅ **API Gateway ID**: From `ApiEndpoint` output
- ✅ **Lambda Execution Role ARN**: `arn:aws:iam::706704660887:role/MentalSpaceEhrStack-LambdaExecutionRole-xxxxx`
- ✅ **Database Layer ARN**: `arn:aws:lambda:us-east-1:706704660887:layer:MentalSpaceEhrStack-DatabaseLayer-xxxxx`

### 2. Verify Lambda Code Files Exist
```bash
# Check that all Lambda functions have code
ls infrastructure/lambda/create-user/
ls infrastructure/lambda/list-clients/
# etc.
```

---

## 🚀 Phase 1: Deploy 15 Critical Functions

We'll deploy in this order:
1. **Users** (5 functions)
2. **Clients** (4 functions)
3. **Appointments** (3 functions)
4. **Profiles** (2 functions)
5. **Dashboard** (1 function)

---

## 👤 STEP 1: User Management Functions

### Function 1: create-user

**1. Go to AWS Lambda Console**
- https://console.aws.amazon.com/lambda/home?region=us-east-1#/functions

**2. Click "Create function"**
- Function name: `mentalspace-create-user`
- Runtime: **Node.js 20.x**
- Architecture: **x86_64**
- Permissions: **Use an existing role**
  - Select: `MentalSpaceEhrStack-LambdaExecutionRole-xxxxx`

**3. Click "Create function"**

**4. Upload Code**
- Method A (Preferred): Copy-paste from file
  ```bash
  cat infrastructure/lambda/create-user/index.js
  ```
  - Click "Code" tab
  - Double-click `index.mjs` in file explorer
  - Delete all content
  - Paste code from your local file
  - Click "Deploy"

- Method B: Upload ZIP
  - Create ZIP: `cd infrastructure/lambda/create-user && zip -r function.zip . && cd ../../..`
  - Click "Upload from" → ".zip file"
  - Upload `function.zip`

**5. Configure Environment Variables**
- Click "Configuration" → "Environment variables" → "Edit"
- Add variables:
  - `DATABASE_SECRET_ARN`: (paste from CDK outputs)
  - `DATABASE_NAME`: `mentalspaceehr`
  - `COGNITO_USER_POOL_ID`: (paste from CDK outputs)
- Click "Save"

**6. Configure VPC**
- Click "Configuration" → "VPC" → "Edit"
- **VPC**: Select `MentalSpaceVPC` or the VPC from CDK outputs
- **Subnets**: Select BOTH subnets named `MentalSpaceVPC/Private...`
- **Security groups**: Select `MentalSpaceEhrStack-LambdaSecurityGroup-xxxxx`
- Click "Save"

**7. Add Database Layer**
- Click "Code" tab → Scroll down to "Layers"
- Click "Add a layer"
- Choose: **Specify an ARN**
- ARN: (paste Database Layer ARN from CDK outputs)
- Click "Add"

**8. Configure Timeout & Memory**
- Click "Configuration" → "General configuration" → "Edit"
- Memory: **256 MB**
- Timeout: **30 seconds**
- Click "Save"

**9. Test the Function** (Optional)
- Click "Test" tab
- Event name: `test-create-user`
- Event JSON:
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
- Click "Test"
- Should see: `"success": true` in response

✅ **Function 1 DONE!** Now repeat for Functions 2-5...

---

### Function 2: list-users

**Same steps as Function 1, but with these changes:**
- Function name: `mentalspace-list-users`
- Code from: `infrastructure/lambda/list-users/index.js`
- Environment variables: Same as Function 1
- VPC: Same as Function 1
- Layer: Same as Function 1

---

### Function 3: get-user-roles

- Function name: `mentalspace-get-user-roles`
- Code from: `infrastructure/lambda/get-user-roles/index.js`
- Environment variables: Same as Function 1
- VPC: Same as Function 1
- Layer: Same as Function 1

---

### Function 4: update-user-role

- Function name: `mentalspace-update-user-role`
- Code from: `infrastructure/lambda/update-user-role/index.js`
- Environment variables: Same as Function 1
- VPC: Same as Function 1
- Layer: Same as Function 1

---

### Function 5: toggle-user-active

- Function name: `mentalspace-toggle-user-active`
- Code from: `infrastructure/lambda/toggle-user-active/index.js`
- Environment variables: Same as Function 1
- VPC: Same as Function 1
- Layer: Same as Function 1

✅ **USER FUNCTIONS COMPLETE!** (5/15)

---

## 👥 STEP 2: Client Management Functions

### Function 6: list-clients

- Function name: `mentalspace-list-clients`
- Code from: `infrastructure/lambda/list-clients/index.js`
- Environment variables: `DATABASE_SECRET_ARN`, `DATABASE_NAME`
- VPC: Same as before
- Layer: Same as before

---

### Function 7: get-client

- Function name: `mentalspace-get-client`
- Code from: `infrastructure/lambda/get-client/index.js`
- Environment variables: Same as Function 6
- VPC: Same
- Layer: Same

---

### Function 8: create-client

- Function name: `mentalspace-create-client`
- Code from: `infrastructure/lambda/create-client/index.js`
- Environment variables: Same as Function 6
- VPC: Same
- Layer: Same

---

### Function 9: update-client

- Function name: `mentalspace-update-client`
- Code from: `infrastructure/lambda/update-client/index.js`
- Environment variables: Same as Function 6
- VPC: Same
- Layer: Same

✅ **CLIENT FUNCTIONS COMPLETE!** (9/15)

---

## 📅 STEP 3: Appointment Functions

### Function 10: list-appointments

- Function name: `mentalspace-list-appointments`
- Code from: `infrastructure/lambda/list-appointments/index.js`
- Environment variables: `DATABASE_SECRET_ARN`, `DATABASE_NAME`
- VPC: Same
- Layer: Same

---

### Function 11: create-appointment

- Function name: `mentalspace-create-appointment`
- Code from: `infrastructure/lambda/create-appointment/index.js`
- Environment variables: Same as Function 10
- VPC: Same
- Layer: Same

---

### Function 12: update-appointment

- Function name: `mentalspace-update-appointment`
- Code from: `infrastructure/lambda/update-appointment/index.js`
- Environment variables: Same as Function 10
- VPC: Same
- Layer: Same

✅ **APPOINTMENT FUNCTIONS COMPLETE!** (12/15)

---

## 👤 STEP 4: Profile Functions

### Function 13: get-profile

- Function name: `mentalspace-get-profile`
- Code from: `infrastructure/lambda/get-profile/index.js`
- Environment variables: `DATABASE_SECRET_ARN`, `DATABASE_NAME`
- VPC: Same
- Layer: Same

---

### Function 14: update-profile

- Function name: `mentalspace-update-profile`
- Code from: `infrastructure/lambda/update-profile/index.js`
- Environment variables: Same as Function 13
- VPC: Same
- Layer: Same

✅ **PROFILE FUNCTIONS COMPLETE!** (14/15)

---

## 📊 STEP 5: Dashboard Function

### Function 15: get-dashboard-stats

- Function name: `mentalspace-get-dashboard-stats`
- Code from: `infrastructure/lambda/get-dashboard-stats/index.js`
- Environment variables: `DATABASE_SECRET_ARN`, `DATABASE_NAME`
- VPC: Same
- Layer: Same

✅ **ALL 15 FUNCTIONS DEPLOYED!** 🎉

---

## 🔗 STEP 6: Configure API Gateway

Now we connect these Lambda functions to API Gateway so your frontend can call them.

### 1. Go to API Gateway Console
- https://console.aws.amazon.com/apigateway/home?region=us-east-1

### 2. Select Your API
- Click on **"MentalSpace EHR API"** (or the API from your CDK stack)

### 3. Get Authorizer ID
- Click "Authorizers" in left menu
- Find "CognitoAuthorizer"
- Copy the **Authorizer ID** (you'll need this)

### 4. Create Resources & Methods

#### Users Endpoint (`/users`)

**Create /users resource:**
- Click "Resources" in left menu
- Click "Actions" → "Create Resource"
- Resource Name: `users`
- Resource Path: `users`
- Enable CORS: ✅ Checked
- Click "Create Resource"

**Add GET method:**
- Select `/users` resource
- Click "Actions" → "Create Method" → Choose **GET**
- Integration type: **Lambda Function**
- Lambda Function: `mentalspace-list-users`
- Use Lambda Proxy integration: ✅ Checked
- Click "Save" → Click "OK" on permission dialog

**Add POST method:**
- Select `/users` resource
- Click "Actions" → "Create Method" → Choose **POST**
- Lambda Function: `mentalspace-create-user`
- Click "Save" → "OK"

**Add Authorizer to GET:**
- Click on `GET` method under `/users`
- Click "Method Request"
- Click pencil icon next to "Authorization"
- Select: **CognitoAuthorizer**
- Click checkmark to save

**Add Authorizer to POST:**
- Same steps for POST method

**Create /users/{id} resource:**
- Select `/users`
- Click "Actions" → "Create Resource"
- Resource Name: `{id}`
- Resource Path: `{id}`
- Enable CORS: ✅ Checked
- Click "Create Resource"

**Add GET method to /users/{id}:**
- Select `/users/{id}`
- Create Method: **GET**
- Lambda Function: `mentalspace-get-user-roles`
- Authorizer: CognitoAuthorizer

**Create /users/{id}/role:**
- Select `/users/{id}`
- Create Resource: `role`
- Add PUT method
- Lambda Function: `mentalspace-update-user-role`
- Authorizer: CognitoAuthorizer

**Create /users/{id}/active:**
- Select `/users/{id}`
- Create Resource: `active`
- Add PUT method
- Lambda Function: `mentalspace-toggle-user-active`
- Authorizer: CognitoAuthorizer

---

#### Clients Endpoint (`/clients`)

**Create /clients:**
- Root → Create Resource → `clients`
- Add GET: `mentalspace-list-clients` (with auth)
- Add POST: `mentalspace-create-client` (with auth)

**Create /clients/{id}:**
- `/clients` → Create Resource → `{id}`
- Add GET: `mentalspace-get-client` (with auth)
- Add PUT: `mentalspace-update-client` (with auth)

---

#### Appointments Endpoint (`/appointments`)

**Create /appointments:**
- Root → Create Resource → `appointments`
- Add GET: `mentalspace-list-appointments` (with auth)
- Add POST: `mentalspace-create-appointment` (with auth)

**Create /appointments/{id}:**
- `/appointments` → Create Resource → `{id}`
- Add PUT: `mentalspace-update-appointment` (with auth)

---

#### Profiles Endpoint (`/profiles`)

**Create /profiles/{id}:**
- Root → Create Resource → `profiles`
- Create Resource → `{id}`
- Add GET: `mentalspace-get-profile` (with auth)
- Add PUT: `mentalspace-update-profile` (with auth)

---

#### Dashboard Endpoint (`/dashboard`)

**Create /dashboard/stats:**
- Root → Create Resource → `dashboard`
- Create Resource → `stats`
- Add GET: `mentalspace-get-dashboard-stats` (with auth)

---

### 5. Deploy API

**CRITICAL: Deploy your changes!**
- Click "Actions" → "Deploy API"
- Deployment stage: **prod**
- Deployment description: "Phase 1 - 15 critical functions"
- Click "Deploy"

**Get your API URL:**
- Click "Stages" → "prod"
- Copy the **Invoke URL**
- Example: `https://cyf1w472y8.execute-api.us-east-1.amazonaws.com/prod`

---

## ✅ STEP 7: Test Your API

### Update Frontend Environment Variable

Edit `.env`:
```env
VITE_API_ENDPOINT=https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/prod
```

### Test Endpoints

**Get Cognito Token First:**
```bash
# Login via your app and get the token from localStorage
# Or use AWS CLI:
aws cognito-idp admin-initiate-auth \
  --user-pool-id YOUR_USER_POOL_ID \
  --client-id YOUR_CLIENT_ID \
  --auth-flow ADMIN_NO_SRP_AUTH \
  --auth-parameters USERNAME=your@email.com,PASSWORD=YourPassword
```

**Test List Users:**
```bash
curl -X GET \
  https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/prod/users \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Test Create Client:**
```bash
curl -X POST \
  https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/prod/clients \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"first_name":"John","last_name":"Doe","email":"john@example.com"}'
```

---

## 📊 Progress Tracker

**Lambda Functions:**
- [x] create-user
- [x] list-users
- [x] get-user-roles
- [x] update-user-role
- [x] toggle-user-active
- [x] list-clients
- [x] get-client
- [x] create-client
- [x] update-client
- [x] list-appointments
- [x] create-appointment
- [x] update-appointment
- [x] get-profile
- [x] update-profile
- [x] get-dashboard-stats

**API Gateway Endpoints:**
- [ ] POST /users
- [ ] GET /users
- [ ] GET /users/{id}/roles
- [ ] PUT /users/{id}/role
- [ ] PUT /users/{id}/active
- [ ] GET /clients
- [ ] POST /clients
- [ ] GET /clients/{id}
- [ ] PUT /clients/{id}
- [ ] GET /appointments
- [ ] POST /appointments
- [ ] PUT /appointments/{id}
- [ ] GET /profiles/{id}
- [ ] PUT /profiles/{id}
- [ ] GET /dashboard/stats

---

## 🎉 SUCCESS!

Once all 15 endpoints are working, your **Core EHR functionality is operational**:
- ✅ User management
- ✅ Client management
- ✅ Appointment scheduling
- ✅ Profile management
- ✅ Dashboard statistics

**Next**: Deploy Phase 2 (Telehealth functions) tomorrow!

---

## 🆘 Troubleshooting

### Lambda Function Times Out
- Check VPC configuration (must have NAT Gateway)
- Check security group allows outbound HTTPS
- Check database secret ARN is correct

### "User is not authorized" Error
- Verify Cognito authorizer is attached to method
- Check token is valid and not expired
- Verify user has correct permissions

### "Internal Server Error"
- Check Lambda CloudWatch Logs
- Go to Lambda → Monitor → View logs in CloudWatch
- Look for error messages

### Database Connection Fails
- Verify database secret ARN is correct
- Check Lambda has database layer attached
- Verify security group allows Lambda → Database connection

---

**Estimated Total Time**: 90-120 minutes

**Let's start! Are you ready to begin with Function 1 (create-user)?**
