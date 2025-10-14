# AWS Telehealth Lambda Functions - Deployment Guide
**Date**: October 14, 2025
**Purpose**: Deploy telehealth Lambda functions to complete AWS migration

---

## 📋 Overview

This guide covers deploying **12 new telehealth Lambda functions** to enable professional telehealth features using AWS-only architecture (no Supabase dependencies).

### New Lambda Functions Created

✅ **Session Management** (3 functions):
1. `get-telehealth-session` - Fetch session by session_id
2. `create-telehealth-session` - Bootstrap new session
3. `update-telehealth-session` - Update status (waiting→active→ended)

✅ **Chat Messages** (2 functions):
4. `list-session-messages` - Get chat history (supports polling)
5. `create-session-message` - Send chat message

✅ **Waiting Room** (3 functions):
6. `create-waiting-room-entry` - Client joins waiting room
7. `admit-from-waiting-room` - Clinician admits client
8. `list-waiting-room-queue` - Clinician sees waiting clients

✅ **Session Participants** (3 functions):
9. `create-session-participant` - Track participant join
10. `update-session-participant` - Update connection state
11. `list-session-participants` - Get active participants

✅ **Already Exists**:
12. `get-twilio-token` - Generate Twilio Video token (exists, needs deployment)

---

## 🚀 Deployment Steps

### Option 1: Manual Deployment (CDK Update Required)

**Step 1: Update CDK Stack**

You need to add the 12 new Lambda functions to [infrastructure/lib/infrastructure-stack.ts](infrastructure/lib/infrastructure-stack.ts).

Add after the existing health check Lambda (around line 427):

```typescript
// ========================================
// TELEHEALTH LAMBDA FUNCTIONS
// ========================================

// 1. Get Telehealth Session
const getTelehealthSessionFunction = new lambda.Function(this, 'GetTelehealthSessionFunction', {
  runtime: lambda.Runtime.NODEJS_20_X,
  handler: 'index.handler',
  code: lambda.Code.fromAsset('lambda/get-telehealth-session'),
  role: lambdaExecutionRole,
  vpc,
  vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
  securityGroups: [lambdaSecurityGroup],
  timeout: cdk.Duration.seconds(30),
  memorySize: 256,
  environment: {
    DATABASE_SECRET_ARN: dbSecret.secretArn,
    DATABASE_NAME: 'mentalspaceehr',
  },
  layers: [databaseLayer],
});

const telehealthSession = api.root.addResource('telehealth-session');
const telehealthSessionById = telehealthSession.addResource('{sessionId}');
telehealthSessionById.addMethod('GET', new apigateway.LambdaIntegration(getTelehealthSessionFunction), {
  authorizer: authorizer,
  authorizationType: apigateway.AuthorizationType.COGNITO,
});

// 2. Create Telehealth Session
const createTelehealthSessionFunction = new lambda.Function(this, 'CreateTelehealthSessionFunction', {
  runtime: lambda.Runtime.NODEJS_20_X,
  handler: 'index.handler',
  code: lambda.Code.fromAsset('lambda/create-telehealth-session'),
  role: lambdaExecutionRole,
  vpc,
  vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
  securityGroups: [lambdaSecurityGroup],
  timeout: cdk.Duration.seconds(30),
  memorySize: 256,
  environment: {
    DATABASE_SECRET_ARN: dbSecret.secretArn,
    DATABASE_NAME: 'mentalspaceehr',
  },
  layers: [databaseLayer],
});

telehealthSession.addMethod('POST', new apigateway.LambdaIntegration(createTelehealthSessionFunction), {
  authorizer: authorizer,
  authorizationType: apigateway.AuthorizationType.COGNITO,
});

// 3. Update Telehealth Session
const updateTelehealthSessionFunction = new lambda.Function(this, 'UpdateTelehealthSessionFunction', {
  runtime: lambda.Runtime.NODEJS_20_X,
  handler: 'index.handler',
  code: lambda.Code.fromAsset('lambda/update-telehealth-session'),
  role: lambdaExecutionRole,
  vpc,
  vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
  securityGroups: [lambdaSecurityGroup],
  timeout: cdk.Duration.seconds(30),
  memorySize: 256,
  environment: {
    DATABASE_SECRET_ARN: dbSecret.secretArn,
    DATABASE_NAME: 'mentalspaceehr',
  },
  layers: [databaseLayer],
});

telehealthSessionById.addMethod('PUT', new apigateway.LambdaIntegration(updateTelehealthSessionFunction), {
  authorizer: authorizer,
  authorizationType: apigateway.AuthorizationType.COGNITO,
});

// 4. List Session Messages
const listSessionMessagesFunction = new lambda.Function(this, 'ListSessionMessagesFunction', {
  runtime: lambda.Runtime.NODEJS_20_X,
  handler: 'index.handler',
  code: lambda.Code.fromAsset('lambda/list-session-messages'),
  role: lambdaExecutionRole,
  vpc,
  vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
  securityGroups: [lambdaSecurityGroup],
  timeout: cdk.Duration.seconds(30),
  memorySize: 256,
  environment: {
    DATABASE_SECRET_ARN: dbSecret.secretArn,
    DATABASE_NAME: 'mentalspaceehr',
  },
  layers: [databaseLayer],
});

const sessionMessages = telehealthSessionById.addResource('messages');
sessionMessages.addMethod('GET', new apigateway.LambdaIntegration(listSessionMessagesFunction), {
  authorizer: authorizer,
  authorizationType: apigateway.AuthorizationType.COGNITO,
});

// 5. Create Session Message
const createSessionMessageFunction = new lambda.Function(this, 'CreateSessionMessageFunction', {
  runtime: lambda.Runtime.NODEJS_20_X,
  handler: 'index.handler',
  code: lambda.Code.fromAsset('lambda/create-session-message'),
  role: lambdaExecutionRole,
  vpc,
  vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
  securityGroups: [lambdaSecurityGroup],
  timeout: cdk.Duration.seconds(30),
  memorySize: 256,
  environment: {
    DATABASE_SECRET_ARN: dbSecret.secretArn,
    DATABASE_NAME: 'mentalspaceehr',
  },
  layers: [databaseLayer],
});

sessionMessages.addMethod('POST', new apigateway.LambdaIntegration(createSessionMessageFunction), {
  authorizer: authorizer,
  authorizationType: apigateway.AuthorizationType.COGNITO,
});

// 6. Create Waiting Room Entry
const createWaitingRoomEntryFunction = new lambda.Function(this, 'CreateWaitingRoomEntryFunction', {
  runtime: lambda.Runtime.NODEJS_20_X,
  handler: 'index.handler',
  code: lambda.Code.fromAsset('lambda/create-waiting-room-entry'),
  role: lambdaExecutionRole,
  vpc,
  vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
  securityGroups: [lambdaSecurityGroup],
  timeout: cdk.Duration.seconds(30),
  memorySize: 256,
  environment: {
    DATABASE_SECRET_ARN: dbSecret.secretArn,
    DATABASE_NAME: 'mentalspaceehr',
  },
  layers: [databaseLayer],
});

const waitingRoom = api.root.addResource('waiting-room');
waitingRoom.addMethod('POST', new apigateway.LambdaIntegration(createWaitingRoomEntryFunction), {
  authorizer: authorizer,
  authorizationType: apigateway.AuthorizationType.COGNITO,
});

// 7. Admit From Waiting Room
const admitFromWaitingRoomFunction = new lambda.Function(this, 'AdmitFromWaitingRoomFunction', {
  runtime: lambda.Runtime.NODEJS_20_X,
  handler: 'index.handler',
  code: lambda.Code.fromAsset('lambda/admit-from-waiting-room'),
  role: lambdaExecutionRole,
  vpc,
  vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
  securityGroups: [lambdaSecurityGroup],
  timeout: cdk.Duration.seconds(30),
  memorySize: 256,
  environment: {
    DATABASE_SECRET_ARN: dbSecret.secretArn,
    DATABASE_NAME: 'mentalspaceehr',
  },
  layers: [databaseLayer],
});

const waitingRoomAdmit = waitingRoom.addResource('admit');
waitingRoomAdmit.addMethod('POST', new apigateway.LambdaIntegration(admitFromWaitingRoomFunction), {
  authorizer: authorizer,
  authorizationType: apigateway.AuthorizationType.COGNITO,
});

// 8. List Waiting Room Queue
const listWaitingRoomQueueFunction = new lambda.Function(this, 'ListWaitingRoomQueueFunction', {
  runtime: lambda.Runtime.NODEJS_20_X,
  handler: 'index.handler',
  code: lambda.Code.fromAsset('lambda/list-waiting-room-queue'),
  role: lambdaExecutionRole,
  vpc,
  vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
  securityGroups: [lambdaSecurityGroup],
  timeout: cdk.Duration.seconds(30),
  memorySize: 256,
  environment: {
    DATABASE_SECRET_ARN: dbSecret.secretArn,
    DATABASE_NAME: 'mentalspaceehr',
  },
  layers: [databaseLayer],
});

waitingRoom.addMethod('GET', new apigateway.LambdaIntegration(listWaitingRoomQueueFunction), {
  authorizer: authorizer,
  authorizationType: apigateway.AuthorizationType.COGNITO,
});

// 9. Create Session Participant
const createSessionParticipantFunction = new lambda.Function(this, 'CreateSessionParticipantFunction', {
  runtime: lambda.Runtime.NODEJS_20_X,
  handler: 'index.handler',
  code: lambda.Code.fromAsset('lambda/create-session-participant'),
  role: lambdaExecutionRole,
  vpc,
  vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
  securityGroups: [lambdaSecurityGroup],
  timeout: cdk.Duration.seconds(30),
  memorySize: 256,
  environment: {
    DATABASE_SECRET_ARN: dbSecret.secretArn,
    DATABASE_NAME: 'mentalspaceehr',
  },
  layers: [databaseLayer],
});

const sessionParticipants = telehealthSessionById.addResource('participants');
sessionParticipants.addMethod('POST', new apigateway.LambdaIntegration(createSessionParticipantFunction), {
  authorizer: authorizer,
  authorizationType: apigateway.AuthorizationType.COGNITO,
});

// 10. Update Session Participant
const updateSessionParticipantFunction = new lambda.Function(this, 'UpdateSessionParticipantFunction', {
  runtime: lambda.Runtime.NODEJS_20_X,
  handler: 'index.handler',
  code: lambda.Code.fromAsset('lambda/update-session-participant'),
  role: lambdaExecutionRole,
  vpc,
  vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
  securityGroups: [lambdaSecurityGroup],
  timeout: cdk.Duration.seconds(30),
  memorySize: 256,
  environment: {
    DATABASE_SECRET_ARN: dbSecret.secretArn,
    DATABASE_NAME: 'mentalspaceehr',
  },
  layers: [databaseLayer],
});

sessionParticipants.addMethod('PUT', new apigateway.LambdaIntegration(updateSessionParticipantFunction), {
  authorizer: authorizer,
  authorizationType: apigateway.AuthorizationType.COGNITO,
});

// 11. List Session Participants
const listSessionParticipantsFunction = new lambda.Function(this, 'ListSessionParticipantsFunction', {
  runtime: lambda.Runtime.NODEJS_20_X,
  handler: 'index.handler',
  code: lambda.Code.fromAsset('lambda/list-session-participants'),
  role: lambdaExecutionRole,
  vpc,
  vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
  securityGroups: [lambdaSecurityGroup],
  timeout: cdk.Duration.seconds(30),
  memorySize: 256,
  environment: {
    DATABASE_SECRET_ARN: dbSecret.secretArn,
    DATABASE_NAME: 'mentalspaceehr',
  },
  layers: [databaseLayer],
});

sessionParticipants.addMethod('GET', new apigateway.LambdaIntegration(listSessionParticipantsFunction), {
  authorizer: authorizer,
  authorizationType: apigateway.AuthorizationType.COGNITO,
});

// 12. Get Twilio Token (already exists, add to API Gateway)
const getTwilioTokenFunction = new lambda.Function(this, 'GetTwilioTokenFunction', {
  runtime: lambda.Runtime.NODEJS_20_X,
  handler: 'index.handler',
  code: lambda.Code.fromAsset('lambda/get-twilio-token'),
  role: lambdaExecutionRole,
  timeout: cdk.Duration.seconds(30),
  memorySize: 256,
  environment: {
    TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID || '',
    TWILIO_API_KEY: process.env.TWILIO_API_KEY || '',
    TWILIO_API_SECRET: process.env.TWILIO_API_SECRET || '',
  },
});

const twilioToken = api.root.addResource('twilio-token');
twilioToken.addMethod('POST', new apigateway.LambdaIntegration(getTwilioTokenFunction), {
  authorizer: authorizer,
  authorizationType: apigateway.AuthorizationType.COGNITO,
});
```

**Step 2: Add Twilio Secrets to AWS Secrets Manager**

```bash
# Add Twilio credentials to Secrets Manager
aws secretsmanager create-secret \
  --name mentalspace-twilio-credentials \
  --description "Twilio Video API credentials" \
  --secret-string '{
    "account_sid": "YOUR_TWILIO_ACCOUNT_SID",
    "api_key": "YOUR_TWILIO_API_KEY",
    "api_secret": "YOUR_TWILIO_API_SECRET"
  }' \
  --region us-east-1
```

**Step 3: Deploy Infrastructure**

```bash
cd infrastructure
npm install
npm run cdk deploy
```

This will:
- Create 12 new Lambda functions
- Add API Gateway endpoints
- Output new API Gateway URL

**Step 4: Update Frontend Environment Variables**

After deployment, update [.env](../.env):

```env
VITE_API_ENDPOINT=https://YOUR_NEW_API_ID.execute-api.us-east-1.amazonaws.com/prod
```

---

### Option 2: Quick Manual Lambda Deployment (Console)

If you want to deploy just one function to test:

1. Go to AWS Lambda Console
2. Click "Create function"
3. Choose "Author from scratch"
4. Name: `mentalspace-get-telehealth-session`
5. Runtime: Node.js 20.x
6. Execution role: Use existing `LambdaExecutionRole` (from CDK stack)
7. VPC: Select MentalSpaceVPC
8. Security group: LambdaSecurityGroup
9. Copy code from [infrastructure/lambda/get-telehealth-session/index.js](infrastructure/lambda/get-telehealth-session/index.js)
10. Environment variables:
    - `DATABASE_SECRET_ARN`: (from CDK outputs)
    - `DATABASE_NAME`: `mentalspaceehr`
11. Add Layer: DatabaseLayer (pg library)
12. Test with sample event

---

## 📊 API Endpoints (After Deployment)

### Session Management
- `GET /telehealth-session/{sessionId}` - Get session details
- `POST /telehealth-session` - Create new session
- `PUT /telehealth-session/{sessionId}` - Update session status

### Chat Messages
- `GET /telehealth-session/{sessionId}/messages?since={timestamp}` - List messages (polling)
- `POST /telehealth-session/{sessionId}/messages` - Send message

### Waiting Room
- `POST /waiting-room` - Create waiting room entry
- `POST /waiting-room/admit` - Admit client
- `GET /waiting-room?clinician_id={id}` - List waiting clients

### Session Participants
- `POST /telehealth-session/{sessionId}/participants` - Track participant
- `PUT /telehealth-session/{sessionId}/participants` - Update participant
- `GET /telehealth-session/{sessionId}/participants` - List participants

### Twilio Video
- `POST /twilio-token` - Generate Twilio Video token

---

## 🧪 Testing

### Test Get Session

```bash
# Get access token from Cognito
TOKEN="YOUR_COGNITO_ACCESS_TOKEN"

# Test get session
curl -X GET \
  "https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/prod/telehealth-session/session_abc123" \
  -H "Authorization: Bearer $TOKEN"
```

### Test Create Message

```bash
curl -X POST \
  "https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/prod/telehealth-session/session_abc123/messages" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "session_abc123",
    "user_id": "user-uuid",
    "user_name": "Dr. Smith",
    "message": "Hello from AWS Lambda!"
  }'
```

### Test Polling Messages

```bash
# Get new messages since last check
curl -X GET \
  "https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/prod/telehealth-session/session_abc123/messages?since=2025-10-14T10:00:00Z" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🔄 Next Steps (Frontend Migration)

After deploying Lambda functions, update frontend components:

### 1. Update TelehealthSession.tsx

Replace Supabase calls with AWS API:

```typescript
// OLD (Supabase)
const { data, error } = await supabase
  .from('telehealth_sessions')
  .select('*')
  .eq('session_id', sessionId)
  .single();

// NEW (AWS API)
import { apiClient } from '@/lib/aws-api-client';
const { data, error } = await apiClient.get(`telehealth-session/${sessionId}`);
```

### 2. Update ChatSidebar.tsx

Replace Supabase realtime with polling:

```typescript
// OLD (Supabase Realtime)
const channel = supabase
  .channel(`session-messages-${sessionId}`)
  .on('postgres_changes', { ... }, callback)
  .subscribe();

// NEW (AWS API Polling)
const pollMessages = async () => {
  const { data } = await apiClient.get(
    `telehealth-session/${sessionId}/messages?since=${lastMessageTimestamp}`
  );
  if (data && data.length > 0) {
    setMessages(prev => [...prev, ...data]);
    setLastMessageTimestamp(data[data.length - 1].created_at);
  }
};

// Poll every 3 seconds
useEffect(() => {
  const interval = setInterval(pollMessages, 3000);
  return () => clearInterval(interval);
}, [sessionId, lastMessageTimestamp]);
```

### 3. Update Waiting Room Components

Replace Supabase calls with AWS API client calls.

---

## ✅ Deployment Checklist

- [ ] Update CDK stack with 12 new Lambda functions
- [ ] Add Twilio secrets to Secrets Manager
- [ ] Deploy infrastructure: `npm run cdk deploy`
- [ ] Test all 12 endpoints with Postman/curl
- [ ] Update `.env` with new API endpoint
- [ ] Apply telehealth migration to Aurora database
- [ ] Update TelehealthSession.tsx to use AWS API
- [ ] Update ChatSidebar.tsx to use polling
- [ ] Update waiting room components
- [ ] Test complete telehealth flow
- [ ] Verify chat persistence
- [ ] Verify waiting room enforcement
- [ ] Load test with 10+ concurrent users

---

## 🚨 Common Issues & Solutions

### Issue: Lambda can't connect to Aurora
**Solution**: Verify Lambda security group has access to database security group on port 5432.

### Issue: "Access Denied" when calling Lambda
**Solution**: Ensure Cognito authorizer is attached and you're passing valid Bearer token.

### Issue: Messages not appearing in chat
**Solution**:
1. Check if `session_messages` table exists in Aurora
2. Apply migration: `supabase/migrations/20251010020000_professional_telehealth_features.sql`
3. Verify RLS policies allow insert/select

### Issue: Twilio token generation fails
**Solution**:
1. Check Twilio credentials in Secrets Manager
2. Verify Twilio account is active
3. Check Lambda function has correct environment variables

---

## 📞 Support

If deployment fails:
1. Check CloudWatch Logs for Lambda errors
2. Check API Gateway logs
3. Verify database connectivity
4. Check IAM permissions

**Deployment time**: 30-45 minutes for full stack update.

**I'm ready to help with deployment when you're ready!**
