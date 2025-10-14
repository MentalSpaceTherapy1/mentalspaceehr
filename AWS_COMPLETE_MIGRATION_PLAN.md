# AWS Complete Migration Plan - ZERO Supabase, ZERO Lovable.dev
**Date**: October 14, 2025
**Goal**: 100% AWS-only architecture

---

## 📊 Current State Analysis

### Supabase Dependencies
- **197 files** import `@/integrations/supabase/client`
- **1 npm package**: `@supabase/supabase-js`
- **143 migrations** in `supabase/migrations/` folder
- **Supabase folder** at root with config files

### Lovable.dev References
- **12 occurrences** in code:
  - AI provider selection (lovable_ai vs twilio)
  - Hardcoded portal URL in ClientChart.tsx
  - AI Note Settings provider dropdown

### What Supabase Was Used For
1. **Database queries**: All CRUD operations
2. **Realtime subscriptions**: Chat, waiting room, appointments
3. **Storage**: File uploads (documents, images, videos)
4. **Auth**: User authentication (already migrated to Cognito ✅)
5. **Edge Functions**: Backend logic (need Lambda equivalents)
6. **RLS Policies**: Row-level security (need Lambda authorization)

---

## 🎯 Migration Strategy

### Phase 1: Create Complete AWS API Client (1 day)
Replace Supabase client with comprehensive AWS API client that mimics Supabase API.

### Phase 2: Create ALL Lambda Functions (2-3 days)
Create Lambda functions for EVERY database table operation.

### Phase 3: Replace ALL Supabase Imports (2 days)
Systematically replace all 197 imports with AWS API client.

### Phase 4: Migrate Database Schema (1 day)
Move all 143 migrations to Aurora PostgreSQL.

### Phase 5: Remove Supabase Completely (1 day)
Delete supabase folder, remove npm package, remove all references.

### Phase 6: Remove Lovable.dev References (2 hours)
Replace with AWS-native solutions.

### Phase 7: Testing (1-2 days)
Test every feature end-to-end.

**Total Timeline**: 7-10 days for complete migration

---

## 📋 Execution Plan

### STEP 1: Enhanced AWS API Client
Create comprehensive client that matches Supabase API 1:1.

**File**: `src/lib/aws-api-client.ts` (already exists, needs enhancement)

Add methods for:
- `from(table).select().eq().single()` - matches Supabase syntax
- `from(table).insert(data)`
- `from(table).update(data).eq()`
- `from(table).delete().eq()`
- `storage.from(bucket).upload()` - direct to S3
- `rpc(function, params)` - calls Lambda functions
- Realtime polling (replace subscriptions)

### STEP 2: Create Lambda Functions for ALL Tables

**Tables Needing Lambda Functions** (from migrations):
- profiles
- clients
- appointments
- blocked_times
- telehealth_sessions
- session_messages
- waiting_room_queue
- session_participants
- notes (progress_notes, clinical_notes, etc.)
- tasks
- supervision_sessions
- supervision_relationships
- insurance_claims
- payments
- billing_*
- portal_*
- audit_logs
- compliance_*
- (100+ more tables)

**Lambda Pattern**:
Each table gets 5 functions:
1. `list-{table}` - SELECT with filters
2. `get-{table}` - SELECT single by ID
3. `create-{table}` - INSERT
4. `update-{table}` - UPDATE by ID
5. `delete-{table}` - DELETE by ID

**Estimate**: ~500-600 Lambda functions total

### STEP 3: Bulk Replace Supabase Imports

**Script Strategy**:
```bash
# Find all files with Supabase imports
find src -name "*.tsx" -o -name "*.ts" | xargs grep -l "from '@/integrations/supabase"

# Replace pattern:
# OLD: import { supabase } from '@/integrations/supabase/client';
# NEW: import { apiClient } from '@/lib/aws-api-client';

# OLD: const { data } = await supabase.from('clients').select('*')
# NEW: const { data } = await apiClient.from('clients').select('*')
```

### STEP 4: Migrate Database Schema

**Move migrations to AWS RDS Data API or direct PostgreSQL**:
```bash
# Connect to Aurora
psql -h mentalspaceehrstack-databaseb269d8bb-edwdzckxbkt7.cluster-ci16iwey2cac.us-east-1.rds.amazonaws.com \
  -U postgres \
  -d mentalspaceehr

# Run each migration file
\i supabase/migrations/00000000000000_initial_schema.sql
\i supabase/migrations/...
```

### STEP 5: Remove Supabase Completely

**Delete**:
- `supabase/` folder (keep migrations for reference)
- `src/integrations/supabase/` folder
- Remove `@supabase/supabase-js` from package.json
- Remove Supabase environment variables

### STEP 6: Remove Lovable.dev References

**Replace**:
1. **AI Provider**: Remove "lovable_ai", use only "aws_bedrock" or "openai"
2. **Portal URL**: Replace hardcoded Lovable URL with environment variable
3. **AI Settings**: Remove Lovable references from dropdowns

### STEP 7: Replace Realtime Subscriptions

**Supabase Realtime → AWS Polling/WebSocket**:
```typescript
// OLD (Supabase Realtime)
supabase.channel('appointments')
  .on('postgres_changes', { event: 'INSERT', ... }, callback)
  .subscribe()

// NEW (AWS Polling)
useEffect(() => {
  const poll = async () => {
    const { data } = await apiClient.get('appointments/poll?since=' + lastCheck);
    if (data) setAppointments(prev => [...prev, ...data]);
  };
  const interval = setInterval(poll, 5000); // every 5 seconds
  return () => clearInterval(interval);
}, []);

// FUTURE (AWS WebSocket - API Gateway WebSocket API)
const ws = new WebSocket('wss://your-websocket-api.amazonaws.com');
ws.onmessage = (event) => {
  const update = JSON.parse(event.data);
  handleRealtimeUpdate(update);
};
```

### STEP 8: Replace Storage Operations

**Supabase Storage → AWS S3 Direct**:
```typescript
// OLD (Supabase Storage)
const { data } = await supabase.storage
  .from('documents')
  .upload(path, file);

// NEW (AWS S3 Direct - using Cognito Identity Pool)
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3 = new S3Client({
  region: 'us-east-1',
  credentials: await cognitoAuth.getCredentials()
});

await s3.send(new PutObjectCommand({
  Bucket: 'mentalspace-ehr-files-706704660887',
  Key: path,
  Body: file,
  ServerSideEncryption: 'AES256'
}));
```

---

## 🚀 Implementation Order

### Day 1: Foundation
✅ Already done:
- AWS infrastructure deployed
- 92+ Lambda functions created
- AWS API client basics exist
- Cognito auth working

⚠️ Need to complete:
- [ ] Enhance AWS API client to fully match Supabase API
- [ ] Create comprehensive Lambda function generator
- [ ] Deploy core Lambda functions

### Day 2-3: Lambda Functions
- [ ] Generate 500+ Lambda functions for all tables
- [ ] Update CDK stack with all functions
- [ ] Deploy to AWS
- [ ] Test basic CRUD operations

### Day 4-5: Code Migration
- [ ] Create automated replacement script
- [ ] Replace all 197 Supabase imports
- [ ] Replace realtime subscriptions with polling
- [ ] Replace storage with S3 direct
- [ ] Test major features

### Day 6: Database & Cleanup
- [ ] Apply all 143 migrations to Aurora
- [ ] Delete Supabase folder
- [ ] Remove Supabase npm package
- [ ] Remove Lovable.dev references
- [ ] Clean up dead code

### Day 7-8: Testing
- [ ] Test all major workflows
- [ ] Test all CRUD operations
- [ ] Test telehealth completely
- [ ] Test billing workflows
- [ ] Fix bugs

### Day 9-10: Production Prep
- [ ] Security audit
- [ ] Performance testing
- [ ] Set up monitoring
- [ ] Documentation
- [ ] Launch

---

## 💻 Automated Migration Script

I'll create a script to automate the bulk replacement:

```bash
#!/bin/bash
# migrate-to-aws.sh

echo "Starting AWS migration..."

# 1. Replace Supabase imports
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i \
  "s/import { supabase } from '@\/integrations\/supabase\/client'/import { apiClient } from '@\/lib\/aws-api-client'/g" {} \;

# 2. Replace supabase.from() calls
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i \
  "s/supabase\.from(/apiClient.from(/g" {} \;

# 3. Replace supabase.rpc() calls
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i \
  "s/supabase\.rpc(/apiClient.rpc(/g" {} \;

# 4. Replace supabase.storage calls
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i \
  "s/supabase\.storage/awsStorage/g" {} \;

# 5. Remove Lovable.dev hardcoded URLs
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i \
  "s/https:\/\/98017cf1-a287-4c75-90bf-f5c01f7922ab\.lovableproject\.com/import.meta.env.VITE_APP_URL/g" {} \;

echo "Migration complete! Review changes before committing."
```

---

## 🎯 Priority Actions NOW

### Immediate (Next 2 Hours)
1. ✅ Enhance AWS API client with full Supabase API compatibility
2. ✅ Create Lambda function generator script
3. ✅ Generate ALL Lambda functions for major tables
4. Deploy core Lambda functions

### Today (Next 8 Hours)
1. Replace Supabase imports in critical files:
   - TelehealthSession.tsx
   - ChatSidebar.tsx
   - All appointment files
   - All client files
   - All notes files
2. Test critical workflows
3. Fix any breaking issues

### This Week
1. Complete all 197 file replacements
2. Deploy all Lambda functions
3. Apply all database migrations
4. Remove Supabase completely
5. Full system testing

---

## 📊 Success Criteria

### 100% AWS Migration Complete When:
- [ ] ZERO imports from `@/integrations/supabase`
- [ ] ZERO `@supabase/supabase-js` in package.json
- [ ] ZERO `supabase/` folder in codebase
- [ ] ZERO Lovable.dev references
- [ ] ALL database operations use AWS Lambda
- [ ] ALL file uploads go to S3 directly
- [ ] ALL realtime use polling or WebSocket
- [ ] ALL authentication uses Cognito only
- [ ] 100% of features work on AWS only
- [ ] All tests pass
- [ ] Production deployment successful

---

## 🚨 Risks & Mitigation

### Risk 1: Breaking Changes
**Mitigation**:
- Create git branches for each phase
- Test thoroughly before merging
- Keep Supabase client mocked as fallback initially

### Risk 2: Too Many Lambda Functions
**Mitigation**:
- Use Lambda layers for shared code
- Optimize cold starts with provisioned concurrency
- Consider API Gateway caching

### Risk 3: Cost Explosion
**Mitigation**:
- Use Aurora Serverless v2 (scales to zero)
- Enable API Gateway caching
- Use S3 lifecycle policies
- Monitor costs daily during migration

### Risk 4: Data Loss
**Mitigation**:
- Backup all data before migration
- Test migrations on staging first
- Keep Supabase read-only during transition

---

## 🎬 Let's Start NOW

I'm ready to execute this complete migration. Which approach do you prefer?

**Option A: Gradual (Safer)**
- Migrate one module at a time (appointments → clients → notes, etc.)
- Test each module completely before moving to next
- Timeline: 10 days

**Option B: Aggressive (Faster)**
- Generate all Lambda functions today
- Bulk replace all imports tomorrow
- Fix all breaking changes after
- Timeline: 7 days

**Option C: Nuclear (Fastest)**
- Delete supabase folder NOW
- Force all errors to surface
- Fix everything that breaks
- Timeline: 5 days (but high risk)

**Which approach do you want to take?**
