# Enterprise Deployment Plan: MentalSpace EHR
**Version**: 1.0
**Date**: October 11, 2025
**Architecture**: Hybrid (Supabase Auth + AWS Aurora Data)
**Status**: Pre-Production → Production Migration

---

## 🎯 CORE ARCHITECTURE (MEMORIZE THIS)

```
┌─────────────────────────────────────────────────────────────┐
│                     MENTALSPACE EHR                         │
│                  Production Architecture                     │
└─────────────────────────────────────────────────────────────┘

Frontend (React/TypeScript)
    │
    ├─→ SUPABASE (Auth ONLY) ──────────────────┐
    │   • Login/Signup/Logout                  │
    │   • Password Reset                        │
    │   • Session Management                    │
    │   • MFA (if enabled)                      │
    │   • Tables: auth.users, auth.sessions     │
    │   • Cost: $25/month                       │
    │                                           │
    └─→ EDGE FUNCTIONS ────────────────────────┤
        (59 functions on Supabase)             │
            │                                   │
            ├─→ AWS AURORA PostgreSQL ─────────┤
            │   • ALL APPLICATION DATA         │
            │   • Clients, Appointments        │
            │   • Notes, Billing, Claims       │
            │   • PHI (Protected Health Info)  │
            │   • 143 tables                   │
            │   • Cost: $50-80/month           │
            │   • HIPAA: AWS BAA ✅            │
            │                                   │
            └─→ AWS S3 ───────────────────────┤
                • Files: Documents, Images     │
                • Videos: Telehealth Recordings│
                • CloudFront CDN               │
                • Cost: $35-90/month           │
                • HIPAA: Encrypted ✅          │
                                               │
                      TOTAL: ~$110-195/month   │
                      vs. Supabase Team: $600  │
└───────────────────────────────────────────────┘
```

---

## 📋 ENTERPRISE DEPLOYMENT PHASES

### **Phase 0: Pre-Migration Verification** ✅ COMPLETE
- [x] AWS Infrastructure deployed
- [x] AWS BAA signed
- [x] Database deletion protection enabled
- [x] Supabase migrations (143) applied
- [x] Architecture decision made (Supabase Auth + AWS Aurora)

### **Phase 1: Database Migration** (Day 1 - 4 hours)
### **Phase 2: Edge Functions Migration** (Day 1-2 - 6 hours)
### **Phase 3: Application Configuration** (Day 2 - 3 hours)
### **Phase 4: Security & Testing** (Day 2-3 - 8 hours)
### **Phase 5: Monitoring & Alerts** (Day 3 - 4 hours)
### **Phase 6: Production Deployment** (Day 4 - 4 hours)
### **Phase 7: Post-Launch Operations** (Ongoing)

**Total Timeline**: 4 days to production-ready

---

# PHASE 1: DATABASE MIGRATION (Day 1 - 4 hours)

## Objective
Migrate all 143 migrations from Supabase PostgreSQL → AWS Aurora PostgreSQL

## Current State
- **Supabase DB**: 143 migrations applied (all tables exist)
- **Aurora DB**: Empty (freshly deployed)

---

## 1.1 Pre-Migration Tasks (30 minutes)

### Task 1.1.1: Retrieve Aurora Credentials
```bash
# Get database password from AWS Secrets Manager
aws secretsmanager get-secret-value \
  --secret-id mentalspace-ehr-db-credentials \
  --region us-east-1 \
  --query SecretString \
  --output text > aurora-creds.json

# Extract password
cat aurora-creds.json | jq -r .password

# Export for use
export PGPASSWORD=$(cat aurora-creds.json | jq -r .password)
export PGHOST="mentalspaceehrstack-databaseb269d8bb-edwdzckxbkt7.cluster-ci16iwey2cac.us-east-1.rds.amazonaws.com"
export PGUSER="postgres"
export PGDATABASE="mentalspaceehr"
export PGPORT="5432"
```

**✅ Success Criteria**: Can connect to Aurora
```bash
psql -h $PGHOST -U $PGUSER -d $PGDATABASE -c "SELECT version();"
```

---

### Task 1.1.2: Verify Aurora is Empty
```bash
# Check if any tables exist (should be empty)
psql -h $PGHOST -U $PGUSER -d $PGDATABASE -c "\dt"

# Should only show system tables or nothing
```

**✅ Success Criteria**: No application tables exist

---

### Task 1.1.3: Test Supabase Connection
```bash
# Verify Supabase migrations are all applied
cd infrastructure
export SUPABASE_ACCESS_TOKEN=sbp_7dab8310a749b81bcdd743d41dab744d22822569
npx supabase migration list --linked

# Should show all 143 migrations as applied
```

**✅ Success Criteria**: 143/143 migrations shown as applied

---

## 1.2 Migration Execution (2 hours)

### Task 1.2.1: Apply All Migrations to Aurora

**Strategy**: Re-run all 143 migration files directly against Aurora

```bash
# Navigate to migrations directory
cd supabase/migrations

# Set Aurora connection
export PGPASSWORD=$(aws secretsmanager get-secret-value \
  --secret-id mentalspace-ehr-db-credentials \
  --region us-east-1 \
  --query SecretString \
  --output text | jq -r .password)

export PGHOST="mentalspaceehrstack-databaseb269d8bb-edwdzckxbkt7.cluster-ci16iwey2cac.us-east-1.rds.amazonaws.com"
export PGUSER="postgres"
export PGDATABASE="mentalspaceehr"

# Apply each migration in order
for migration in *.sql; do
  echo "Applying $migration..."
  psql -h $PGHOST -U $PGUSER -d $PGDATABASE -f "$migration"

  if [ $? -eq 0 ]; then
    echo "✅ $migration applied successfully"
  else
    echo "❌ $migration FAILED"
    exit 1
  fi
done

echo "🎉 All migrations applied to Aurora!"
```

**⚠️ Expected Issues**:
- Some migrations may reference Supabase-specific features
- RLS policies may need adjustment
- Extensions may need to be enabled first

**Fallback Strategy**: If automated migration fails:
1. Use `pg_dump` from Supabase
2. Clean dump file (remove Supabase-specific items)
3. Apply to Aurora

---

### Task 1.2.2: Enable Required PostgreSQL Extensions

```bash
# Connect to Aurora
psql -h $PGHOST -U $PGUSER -d $PGDATABASE

# Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

# Verify extensions
\dx

# Exit
\q
```

**✅ Success Criteria**: All extensions enabled

---

### Task 1.2.3: Verify Schema Migration

```bash
# Count tables in Aurora
psql -h $PGHOST -U $PGUSER -d $PGDATABASE -c "
  SELECT schemaname, COUNT(*) as table_count
  FROM pg_tables
  WHERE schemaname = 'public'
  GROUP BY schemaname;
"

# Should show ~140+ tables

# List all tables
psql -h $PGHOST -U $PGUSER -d $PGDATABASE -c "\dt public.*" | wc -l

# Should be close to 143

# Check critical tables exist
psql -h $PGHOST -U $PGUSER -d $PGDATABASE -c "
  SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN (
      'clients', 'appointments', 'clinical_notes',
      'profiles', 'user_roles', 'advancedmd_claims'
    )
  ORDER BY table_name;
"
```

**✅ Success Criteria**: All critical tables exist

---

## 1.3 Data Validation (1 hour)

### Task 1.3.1: Verify Table Structures

```bash
# Create validation script
cat > validate-schema.sql <<'EOF'
-- Check all tables have primary keys
SELECT
  t.table_name,
  COUNT(kcu.column_name) as pk_count
FROM information_schema.tables t
LEFT JOIN information_schema.table_constraints tc
  ON t.table_name = tc.table_name
  AND tc.constraint_type = 'PRIMARY KEY'
LEFT JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
WHERE t.table_schema = 'public'
  AND t.table_type = 'BASE TABLE'
GROUP BY t.table_name
HAVING COUNT(kcu.column_name) = 0;

-- Should return 0 rows (all tables have PKs)

-- Check foreign key relationships
SELECT
  COUNT(*) as fk_count
FROM information_schema.table_constraints
WHERE constraint_type = 'FOREIGN KEY'
  AND table_schema = 'public';

-- Should show ~200+ foreign keys

-- Check indexes exist
SELECT
  schemaname,
  COUNT(*) as index_count
FROM pg_indexes
WHERE schemaname = 'public'
GROUP BY schemaname;

-- Should show ~200+ indexes
EOF

# Run validation
psql -h $PGHOST -U $PGUSER -d $PGDATABASE -f validate-schema.sql
```

**✅ Success Criteria**:
- All tables have primary keys
- ~200+ foreign keys exist
- ~200+ indexes exist

---

### Task 1.3.2: Verify RLS Policies

```bash
# Check RLS is enabled on tables
psql -h $PGHOST -U $PGUSER -d $PGDATABASE -c "
  SELECT
    schemaname,
    tablename,
    rowsecurity
  FROM pg_tables
  WHERE schemaname = 'public'
    AND rowsecurity = true;
"

# Should show ~100+ tables with RLS enabled

# Count total policies
psql -h $PGHOST -U $PGUSER -d $PGDATABASE -c "
  SELECT COUNT(*) as policy_count
  FROM pg_policies
  WHERE schemaname = 'public';
"

# Should show ~150+ policies
```

**✅ Success Criteria**: RLS enabled on critical tables

---

### Task 1.3.3: Verify Functions and Triggers

```bash
# Count functions
psql -h $PGHOST -U $PGUSER -d $PGDATABASE -c "
  SELECT COUNT(*) as function_count
  FROM pg_proc
  WHERE pronamespace = 'public'::regnamespace;
"

# Should show ~50+ functions

# Count triggers
psql -h $PGHOST -U $PGUSER -d $PGDATABASE -c "
  SELECT COUNT(*) as trigger_count
  FROM pg_trigger
  WHERE NOT tgisinternal;
"

# Should show ~20+ triggers
```

**✅ Success Criteria**: Functions and triggers exist

---

## 1.4 Post-Migration Cleanup (30 minutes)

### Task 1.4.1: Create Migration Tracking

```bash
# Create migration history table in Aurora
psql -h $PGHOST -U $PGUSER -d $PGDATABASE <<'EOF'
CREATE TABLE IF NOT EXISTS _migrations (
  id SERIAL PRIMARY KEY,
  migration_file TEXT NOT NULL UNIQUE,
  applied_at TIMESTAMPTZ DEFAULT NOW()
);

-- Record all applied migrations
DO $$
BEGIN
  -- Add each migration file name here
  INSERT INTO _migrations (migration_file) VALUES
    ('20251003160738_59f4860b-2337-4039-9e51-ddd366bc5b69.sql'),
    -- ... (all 143 migrations)
  ON CONFLICT (migration_file) DO NOTHING;
END $$;

SELECT COUNT(*) as total_migrations FROM _migrations;
EOF
```

**✅ Success Criteria**: Migration history recorded

---

### Task 1.4.2: Grant Permissions

```bash
# Ensure proper permissions for application user
psql -h $PGHOST -U $PGUSER -d $PGDATABASE <<'EOF'
-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO postgres;

-- Grant access to all tables
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO postgres;

-- Grant sequence access
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO postgres;

-- Grant function execution
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO postgres;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO postgres;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO postgres;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT EXECUTE ON FUNCTIONS TO postgres;
EOF
```

**✅ Success Criteria**: Permissions granted

---

## 1.5 Phase 1 Completion Checklist

- [ ] Aurora credentials retrieved and verified
- [ ] All 143 migrations applied to Aurora
- [ ] All extensions enabled
- [ ] ~140+ tables created
- [ ] Primary keys exist on all tables
- [ ] ~200+ foreign keys created
- [ ] ~200+ indexes created
- [ ] ~150+ RLS policies applied
- [ ] ~50+ functions created
- [ ] ~20+ triggers created
- [ ] Migration history recorded
- [ ] Permissions granted

**Phase 1 Output**: Aurora database fully configured with complete schema

**Handoff to Phase 2**: Database ready for Edge Function connections

---

# PHASE 2: EDGE FUNCTIONS MIGRATION (Day 1-2 - 6 hours)

## Objective
Configure all 59 Edge Functions to connect to AWS Aurora instead of Supabase DB

## Current State
- **Edge Functions**: 59 functions exist locally
- **Database**: Aurora schema ready, Supabase still has auth.users
- **Connection**: Functions currently connect to Supabase DB

---

## 2.1 Database Connection Configuration (1 hour)

### Task 2.1.1: Add Aurora Credentials to Supabase Secrets

```bash
# Get Aurora password
export AURORA_PASSWORD=$(aws secretsmanager get-secret-value \
  --secret-id mentalspace-ehr-db-credentials \
  --region us-east-1 \
  --query SecretString \
  --output text | jq -r .password)

# Add secrets via Supabase CLI
cd infrastructure

export SUPABASE_ACCESS_TOKEN=sbp_7dab8310a749b81bcdd743d41dab744d22822569

# Add database secrets (these will be available to Edge Functions)
npx supabase secrets set \
  DATABASE_URL="postgresql://postgres:${AURORA_PASSWORD}@mentalspaceehrstack-databaseb269d8bb-edwdzckxbkt7.cluster-ci16iwey2cac.us-east-1.rds.amazonaws.com:5432/mentalspaceehr" \
  --project-ref ljxzdzgvytkazjrsafte

npx supabase secrets set \
  DATABASE_HOST="mentalspaceehrstack-databaseb269d8bb-edwdzckxbkt7.cluster-ci16iwey2cac.us-east-1.rds.amazonaws.com" \
  --project-ref ljxzdzgvytkazjrsafte

npx supabase secrets set \
  DATABASE_PORT="5432" \
  --project-ref ljxzdzgvytkazjrsafte

npx supabase secrets set \
  DATABASE_NAME="mentalspaceehr" \
  --project-ref ljxzdzgvytkazjrsafte

npx supabase secrets set \
  DATABASE_USER="postgres" \
  --project-ref ljxzdzgvytkazjrsafte

npx supabase secrets set \
  DATABASE_PASSWORD="${AURORA_PASSWORD}" \
  --project-ref ljxzdzgvytkazjrsafte

# Verify secrets are set
npx supabase secrets list --project-ref ljxzdzgvytkazjrsafte
```

**✅ Success Criteria**: 6 database secrets visible in Supabase

---

### Task 2.1.2: Create Database Connection Utility

```bash
# Create shared database utility for Edge Functions
cat > supabase/functions/_shared/aurora-db.ts <<'EOF'
import { Pool, PoolClient } from 'https://deno.land/x/postgres@v0.17.0/mod.ts';

// CRITICAL: This connects to AWS Aurora, NOT Supabase DB
// Supabase is ONLY used for auth (auth.users table)

let pool: Pool | null = null;

export function getAuroraPool(): Pool {
  if (!pool) {
    const databaseUrl = Deno.env.get('DATABASE_URL');

    if (!databaseUrl) {
      throw new Error('DATABASE_URL not configured in Supabase secrets');
    }

    pool = new Pool(databaseUrl, 3, true); // 3 connections, lazy

    console.log('✅ Aurora connection pool created');
  }

  return pool;
}

export async function getAuroraClient(): Promise<PoolClient> {
  const pool = getAuroraPool();
  return await pool.connect();
}

// Query helper with automatic connection management
export async function queryAurora<T = any>(
  sql: string,
  params: any[] = []
): Promise<T[]> {
  const client = await getAuroraClient();

  try {
    const result = await client.queryObject<T>(sql, params);
    return result.rows;
  } finally {
    client.release();
  }
}

// For Supabase Auth queries ONLY
export function getSupabaseAuthClient() {
  // This is for auth.users table only
  // Returns Supabase client configured for auth schema
  return {
    from: (table: string) => {
      if (!table.startsWith('auth.')) {
        throw new Error('Supabase client should ONLY access auth.* tables');
      }
      // Return Supabase client for auth
    }
  };
}
EOF
```

**✅ Success Criteria**: Database utility created

---

## 2.2 Function Migration Strategy (2 hours)

### Task 2.2.1: Identify Functions Needing Migration

```bash
# Scan all functions for database calls
cd supabase/functions

# Find functions using Supabase DB (need to migrate to Aurora)
for func in */index.ts; do
  echo "Checking $func..."

  # Check if function queries database
  if grep -q "supabase.from\|createClient" "$func"; then
    echo "  ⚠️  Uses Supabase DB - needs migration"
  else
    echo "  ✅ No DB calls"
  fi
done > function-audit.txt

# Count functions needing migration
echo "Functions needing database migration:"
grep "⚠️" function-audit.txt | wc -l
```

**✅ Success Criteria**: List of functions to migrate

---

### Task 2.2.2: Migration Pattern Template

**Pattern for ALL data queries** (not auth):

**BEFORE** (Supabase DB):
```typescript
// ❌ WRONG - queries Supabase DB
const { data, error } = await supabase
  .from('clients')
  .select('*')
  .eq('id', clientId);
```

**AFTER** (Aurora):
```typescript
// ✅ CORRECT - queries AWS Aurora
import { queryAurora } from '../_shared/aurora-db.ts';

const clients = await queryAurora(
  'SELECT * FROM clients WHERE id = $1',
  [clientId]
);
```

**Exception - Auth queries stay on Supabase**:
```typescript
// ✅ CORRECT - auth stays on Supabase
const { data: { user } } = await supabase.auth.getUser();

// This is fine - auth.users is on Supabase
```

---

### Task 2.2.3: Migrate High-Priority Functions (batch 1)

**Priority 1 Functions** (must work first):
1. `health-check` - System health
2. `create-user` - User management
3. `generate-clinical-note` - Core functionality
4. `confirm-appointment` - Core functionality
5. `process-payment` - Billing

```bash
# For each function:
cd supabase/functions/health-check

# 1. Update imports
# 2. Replace Supabase DB queries with Aurora queries
# 3. Keep auth queries on Supabase
# 4. Test locally if possible

# Example for health-check function:
cat > index.ts <<'EOF'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { queryAurora } from '../_shared/aurora-db.ts';

serve(async (req) => {
  try {
    // Test Aurora connection
    const result = await queryAurora('SELECT NOW() as current_time');

    return new Response(
      JSON.stringify({
        status: 'healthy',
        database: 'connected',
        timestamp: result[0].current_time
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ status: 'unhealthy', error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
EOF
```

**Repeat for all 5 priority functions**

**✅ Success Criteria**: 5 core functions migrated to Aurora

---

## 2.3 Function Deployment (2 hours)

### Task 2.3.1: Deploy Shared Utilities

```bash
# Deploy database utility first
cd supabase/functions

# Ensure _shared directory is properly structured
mkdir -p _shared
# (aurora-db.ts already created in Task 2.1.2)

# Shared utilities are automatically included when functions are deployed
```

---

### Task 2.3.2: Deploy Priority Functions (Batch 1)

```bash
cd infrastructure

export SUPABASE_ACCESS_TOKEN=sbp_7dab8310a749b81bcdd743d41dab744d22822569

# Deploy each priority function
npx supabase functions deploy health-check --project-ref ljxzdzgvytkazjrsafte
npx supabase functions deploy create-user --project-ref ljxzdzgvytkazjrsafte
npx supabase functions deploy generate-clinical-note --project-ref ljxzdzgvytkazjrsafte
npx supabase functions deploy confirm-appointment --project-ref ljxzdzgvytkazjrsafte
npx supabase functions deploy process-payment --project-ref ljxzdzgvytkazjrsafte

# Test each function after deployment
echo "Testing health-check..."
curl -X POST \
  https://ljxzdzgvytkazjrsafte.supabase.co/functions/v1/health-check \
  -H "Authorization: Bearer YOUR_ANON_KEY"

# Should return: {"status":"healthy","database":"connected",...}
```

**✅ Success Criteria**: 5 functions deployed and tested

---

### Task 2.3.3: Deploy Remaining Functions (Batch 2-12)

**Strategy**: Deploy in batches of 5-10 functions at a time

```bash
# Batch 2: Authentication & User Management (6 functions)
npx supabase functions deploy log-auth-attempt --project-ref ljxzdzgvytkazjrsafte
npx supabase functions deploy create-portal-user --project-ref ljxzdzgvytkazjrsafte
npx supabase functions deploy reset-user-password --project-ref ljxzdzgvytkazjrsafte
npx supabase functions deploy send-password-reset --project-ref ljxzdzgvytkazjrsafte
npx supabase functions deploy send-admin-password-reset --project-ref ljxzdzgvytkazjrsafte
npx supabase functions deploy create-test-portal-user --project-ref ljxzdzgvytkazjrsafte

# Batch 3: Appointments & Scheduling (4 functions)
npx supabase functions deploy send-appointment-reminder --project-ref ljxzdzgvytkazjrsafte
npx supabase functions deploy send-appointment-notification --project-ref ljxzdzgvytkazjrsafte
npx supabase functions deploy notify-waitlist-slots --project-ref ljxzdzgvytkazjrsafte
npx supabase functions deploy send-waitlist-email --project-ref ljxzdzgvytkazjrsafte

# Batch 4: Clinical Notes & Documentation (6 functions)
npx supabase functions deploy generate-intake-note --project-ref ljxzdzgvytkazjrsafte
npx supabase functions deploy generate-treatment-plan --project-ref ljxzdzgvytkazjrsafte
npx supabase functions deploy generate-section-content --project-ref ljxzdzgvytkazjrsafte
npx supabase functions deploy suggest-clinical-content --project-ref ljxzdzgvytkazjrsafte
npx supabase functions deploy generate-document-from-template --project-ref ljxzdzgvytkazjrsafte
npx supabase functions deploy cosignature-workflow --project-ref ljxzdzgvytkazjrsafte

# Batch 5: Telehealth & Video (7 functions)
npx supabase functions deploy get-twilio-token --project-ref ljxzdzgvytkazjrsafte
npx supabase functions deploy transcribe-session --project-ref ljxzdzgvytkazjrsafte
npx supabase functions deploy analyze-session-audio --project-ref ljxzdzgvytkazjrsafte
npx supabase functions deploy transcribe-and-generate-note --project-ref ljxzdzgvytkazjrsafte
npx supabase functions deploy generate-note-from-transcript --project-ref ljxzdzgvytkazjrsafte
npx supabase functions deploy enable-twilio-transcription --project-ref ljxzdzgvytkazjrsafte
npx supabase functions deploy disable-twilio-transcription --project-ref ljxzdzgvytkazjrsafte

# Batch 6: Compliance & Monitoring (8 functions)
npx supabase functions deploy check-compliance --project-ref ljxzdzgvytkazjrsafte
npx supabase functions deploy daily-compliance-check --project-ref ljxzdzgvytkazjrsafte
npx supabase functions deploy verify-incident-to-compliance --project-ref ljxzdzgvytkazjrsafte
npx supabase functions deploy check-critical-assessment-items --project-ref ljxzdzgvytkazjrsafte
npx supabase functions deploy security-audit --project-ref ljxzdzgvytkazjrsafte
npx supabase functions deploy cosignature-status-monitor --project-ref ljxzdzgvytkazjrsafte
npx supabase functions deploy sunday-lockout --project-ref ljxzdzgvytkazjrsafte
npx supabase functions deploy telehealth-consent-renewal --project-ref ljxzdzgvytkazjrsafte

# Batch 7: Notifications & Communications (7 functions)
npx supabase functions deploy send-portal-invitation --project-ref ljxzdzgvytkazjrsafte
npx supabase functions deploy send-portal-form-notification --project-ref ljxzdzgvytkazjrsafte
npx supabase functions deploy send-portal-form-bulk-notification --project-ref ljxzdzgvytkazjrsafte
npx supabase functions deploy send-staff-invitation --project-ref ljxzdzgvytkazjrsafte
npx supabase functions deploy send-schedule-exception-notification --project-ref ljxzdzgvytkazjrsafte
npx supabase functions deploy supervision-notifications --project-ref ljxzdzgvytkazjrsafte
npx supabase functions deploy process-notification-rules --project-ref ljxzdzgvytkazjrsafte

# Batch 8: Waiting Room & Sessions (2 functions)
npx supabase functions deploy send-waiting-room-notification --project-ref ljxzdzgvytkazjrsafte
npx supabase functions deploy waiting-room-timeout --project-ref ljxzdzgvytkazjrsafte

# Batch 9: AdvancedMD Integration (3 functions)
npx supabase functions deploy advancedmd-auth --project-ref ljxzdzgvytkazjrsafte
npx supabase functions deploy advancedmd-proxy --project-ref ljxzdzgvytkazjrsafte
npx supabase functions deploy extract-insurance-card --project-ref ljxzdzgvytkazjrsafte

# Batch 10: Analytics & Monitoring (7 functions)
npx supabase functions deploy calculate-clinical-analytics --project-ref ljxzdzgvytkazjrsafte
npx supabase functions deploy collect-performance-metrics --project-ref ljxzdzgvytkazjrsafte
npx supabase functions deploy collect-release-metrics --project-ref ljxzdzgvytkazjrsafte
npx supabase functions deploy data-quality-check --project-ref ljxzdzgvytkazjrsafte
npx supabase functions deploy integration-health-check --project-ref ljxzdzgvytkazjrsafte
npx supabase functions deploy backup-health-check --project-ref ljxzdzgvytkazjrsafte
npx supabase functions deploy reminder-capabilities --project-ref ljxzdzgvytkazjrsafte

# Batch 11: Security & Validation (2 functions)
npx supabase functions deploy scan-uploaded-file --project-ref ljxzdzgvytkazjrsafte
npx supabase functions deploy check-openai-key --project-ref ljxzdzgvytkazjrsafte

# Batch 12: Cleanup (1 function)
npx supabase functions deploy cleanup-rate-limits --project-ref ljxzdzgvytkazjrsafte
```

**✅ Success Criteria**: All 59 functions deployed

---

### Task 2.3.4: Verify All Functions Deployed

```bash
# List all deployed functions
npx supabase functions list --project-ref ljxzdzgvytkazjrsafte

# Should show all 59 functions

# Count deployed functions
npx supabase functions list --project-ref ljxzdzgvytkazjrsafte | grep -c "│"

# Should return 59
```

**✅ Success Criteria**: 59 functions visible in Supabase dashboard

---

## 2.4 Function Testing (1 hour)

### Task 2.4.1: Test Critical Functions

```bash
# Get anon key from .env
export SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqeHpkemd2eXRrYXpqcnNhZnRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyMzIyNzQsImV4cCI6MjA3NTgwODI3NH0.RY_3-9x2Cdp4_5AExnwxaxh-Z0EC0kpnZ5Moxvm6AMg"

# Test 1: Health Check (must work)
curl -X POST \
  https://ljxzdzgvytkazjrsafte.supabase.co/functions/v1/health-check \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}"

# Expected: {"status":"healthy","database":"connected"}

# Test 2: Integration Health Check
curl -X POST \
  https://ljxzdzgvytkazjrsafte.supabase.co/functions/v1/integration-health-check \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}"

# Expected: {"status":"healthy","integrations":{...}}

# Test 3: Backup Health Check
curl -X POST \
  https://ljxzdzgvytkazjrsafte.supabase.co/functions/v1/backup-health-check \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}"

# Expected: {"status":"healthy","backup":true}
```

**✅ Success Criteria**: All 3 health checks pass

---

## 2.5 Phase 2 Completion Checklist

- [ ] Aurora credentials added to Supabase secrets (6 secrets)
- [ ] Database connection utility created (`_shared/aurora-db.ts`)
- [ ] All 59 functions audited for database calls
- [ ] Migration pattern documented
- [ ] 5 priority functions migrated to Aurora
- [ ] All 59 functions deployed to Supabase
- [ ] Functions appear in Supabase dashboard
- [ ] 3 health check functions tested and passing
- [ ] No functions query Supabase DB (except auth.users)

**Phase 2 Output**: All Edge Functions operational and connected to Aurora

**Handoff to Phase 3**: Backend API ready for frontend integration

---

# PHASE 3: APPLICATION CONFIGURATION (Day 2 - 3 hours)

## Objective
Update frontend application to use Aurora via Edge Functions, keep Supabase for auth only

## Current State
- **Frontend**: React app configured for Supabase
- **Backend**: Edge Functions connected to Aurora
- **Auth**: Supabase Auth configured

---

## 3.1 Environment Configuration (30 minutes)

### Task 3.1.1: Update Production .env

```bash
# Edit .env file with production values
cat > .env.production <<'EOF'
# ============================================
# SUPABASE (Auth ONLY - NO DATA QUERIES)
# ============================================
VITE_SUPABASE_PROJECT_ID="ljxzdzgvytkazjrsafte"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqeHpkemd2eXRrYXpqcnNhZnRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyMzIyNzQsImV4cCI6MjA3NTgwODI3NH0.RY_3-9x2Cdp4_5AExnwxaxh-Z0EC0kpnZ5Moxvm6AMg"
VITE_SUPABASE_URL="https://ljxzdzgvytkazjrsafte.supabase.co"

# ⚠️ CRITICAL: Supabase client must NEVER query database directly
# All data queries go through Edge Functions → Aurora

# ============================================
# AWS SERVICES (Storage)
# ============================================
VITE_AWS_REGION="us-east-1"
VITE_COGNITO_IDENTITY_POOL_ID="us-east-1:b90f8d7d-ae3c-4de6-9fb3-05af044c378c"
VITE_FILES_BUCKET="mentalspace-ehr-files-706704660887"
VITE_VIDEOS_BUCKET="mentalspace-ehr-videos-706704660887"
VITE_VIDEO_CDN="https://d33wpxg6ve4byx.cloudfront.net"

# ============================================
# API ENDPOINTS
# ============================================
# Edge Functions base URL (all API calls go here)
VITE_API_BASE_URL="https://ljxzdzgvytkazjrsafte.supabase.co/functions/v1"

# AWS API Gateway (for future direct Lambda calls)
VITE_API_GATEWAY="https://xmbq984faa.execute-api.us-east-1.amazonaws.com/prod"

# ============================================
# FEATURE FLAGS
# ============================================
VITE_USE_EDGE_FUNCTIONS="true"
VITE_USE_AURORA_DB="true"
VITE_USE_SUPABASE_DB="false"  # ⚠️ CRITICAL: Set to false

# ============================================
# EXTERNAL SERVICES
# ============================================
# Twilio (for telehealth)
VITE_TWILIO_ACCOUNT_SID="your-twilio-account-sid"

# OpenAI (for AI features)
# OPENAI_API_KEY is in Supabase secrets, not here
EOF

# Copy to .env
cp .env.production .env
```

**✅ Success Criteria**: .env.production created with correct values

---

### Task 3.1.2: Create Database Client Wrapper

**Critical**: Prevent accidental Supabase DB queries from frontend

```bash
cat > src/lib/database.ts <<'EOF'
/**
 * Database Client
 *
 * ⚠️ CRITICAL ARCHITECTURE NOTE:
 * - Supabase is ONLY used for authentication (auth.users)
 * - ALL application data is in AWS Aurora
 * - ALL data queries MUST go through Edge Functions
 *
 * DO NOT use supabase.from() for any data queries!
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase URL and key must be configured');
}

// Supabase client for AUTH ONLY
export const supabaseAuth = createClient(supabaseUrl, supabaseKey);

/**
 * Call Edge Function (which queries Aurora)
 */
export async function callEdgeFunction<T = any>(
  functionName: string,
  payload?: any
): Promise<T> {
  const { data: { session } } = await supabaseAuth.auth.getSession();

  if (!session) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(
    `${supabaseUrl}/functions/v1/${functionName}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    throw new Error(`Edge function error: ${response.statusText}`);
  }

  return response.json();
}

/**
 * ⚠️ DEPRECATED: Do not use for data queries!
 * This is kept only for auth operations
 */
export const supabase = {
  auth: supabaseAuth.auth,

  // Prevent accidental database queries
  from: () => {
    throw new Error(
      'Direct Supabase DB queries are disabled. ' +
      'Use callEdgeFunction() instead. ' +
      'Data is stored in AWS Aurora, not Supabase DB.'
    );
  },
};

/**
 * Query Aurora via Edge Functions
 *
 * Example:
 *   const clients = await queryAurora('get-clients', { limit: 10 });
 */
export async function queryAurora<T = any>(
  operation: string,
  params?: any
): Promise<T> {
  return callEdgeFunction(operation, params);
}

// Re-export auth for convenience
export const auth = supabaseAuth.auth;
EOF
```

**✅ Success Criteria**: Database wrapper prevents accidental Supabase DB queries

---

### Task 3.1.3: Update Application Imports

```bash
# Find all files importing Supabase
grep -r "from '@supabase/supabase-js'" src/ --include="*.ts" --include="*.tsx" > supabase-imports.txt

# For each file, update to use new wrapper
# BEFORE:
#   import { supabase } from '@/lib/supabase'
#   const { data } = await supabase.from('clients').select()

# AFTER:
#   import { queryAurora } from '@/lib/database'
#   const clients = await queryAurora('get-clients')

# This is a manual process that needs careful review
echo "⚠️ Files using Supabase client:"
cat supabase-imports.txt
echo "Total files: $(wc -l < supabase-imports.txt)"
```

**✅ Success Criteria**: List of files needing updates identified

---

## 3.2 Frontend Migration (1.5 hours)

### Task 3.2.1: Update API Service Layer

```bash
# Create API service for each domain
cat > src/services/clients.ts <<'EOF'
import { queryAurora } from '@/lib/database';

export interface Client {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  // ... other fields
}

export async function getClients(): Promise<Client[]> {
  // Queries Aurora via Edge Function
  return queryAurora('get-clients');
}

export async function getClient(id: string): Promise<Client> {
  return queryAurora('get-client', { id });
}

export async function createClient(client: Partial<Client>): Promise<Client> {
  return queryAurora('create-client', { client });
}

export async function updateClient(id: string, updates: Partial<Client>): Promise<Client> {
  return queryAurora('update-client', { id, updates });
}

export async function deleteClient(id: string): Promise<void> {
  return queryAurora('delete-client', { id });
}
EOF

# Repeat for other domains:
# - src/services/appointments.ts
# - src/services/notes.ts
# - src/services/billing.ts
# - src/services/staff.ts
# etc.
```

**✅ Success Criteria**: Service layer uses Edge Functions

---

### Task 3.2.2: Update React Hooks

```bash
# Update custom hooks to use new services
cat > src/hooks/useClients.ts <<'EOF'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getClients, getClient, createClient, updateClient, deleteClient } from '@/services/clients';

export function useClients() {
  return useQuery({
    queryKey: ['clients'],
    queryFn: getClients,
  });
}

export function useClient(id: string) {
  return useQuery({
    queryKey: ['clients', id],
    queryFn: () => getClient(id),
    enabled: !!id,
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}

// Similar for update and delete...
EOF
```

**✅ Success Criteria**: Hooks use service layer

---

## 3.3 Build & Test (1 hour)

### Task 3.3.1: Build Production Bundle

```bash
# Install dependencies
npm install

# Type check
npm run type-check

# Build for production
npm run build

# Check bundle size
ls -lh dist/assets/*.js | awk '{print $5, $9}'

# Should be < 1MB for main bundle
```

**✅ Success Criteria**: Production build succeeds

---

### Task 3.3.2: Test Locally

```bash
# Run dev server
npm run dev

# In browser, test:
# 1. Login (should work - uses Supabase Auth)
# 2. Navigate to dashboard (should work)
# 3. Open browser console, verify no Supabase DB errors
# 4. Try loading clients list (should call Edge Function)
# 5. Check Network tab - should see calls to /functions/v1/...

# Look for errors in console
```

**✅ Success Criteria**: App runs locally without errors

---

## 3.4 Phase 3 Completion Checklist

- [ ] .env.production created with correct values
- [ ] Database wrapper created (prevents Supabase DB queries)
- [ ] All Supabase imports audited
- [ ] API service layer created for each domain
- [ ] React hooks updated to use services
- [ ] Production build succeeds
- [ ] App runs locally
- [ ] No Supabase DB queries in console
- [ ] Edge Function calls visible in Network tab
- [ ] Auth still works (Supabase Auth)

**Phase 3 Output**: Frontend configured to use Aurora via Edge Functions

**Handoff to Phase 4**: Application ready for security testing

---

# PHASE 4: SECURITY & TESTING (Day 2-3 - 8 hours)

## Objective
Validate security, test all functionality, ensure HIPAA compliance

---

## 4.1 Security Validation (3 hours)

### Task 4.1.1: Database Security Audit

```bash
# Run security checks on Aurora
psql -h $PGHOST -U $PGUSER -d $PGDATABASE <<'EOF'
-- Check 1: RLS is enabled on all PHI tables
SELECT
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'clients', 'clinical_notes', 'appointments',
    'client_insurance', 'billing_codes', 'claims'
  )
  AND rowsecurity = false;

-- Should return 0 rows (all have RLS)

-- Check 2: No tables have public permissions
SELECT
  tablename,
  has_table_privilege('public', schemaname||'.'||tablename, 'SELECT') as public_select
FROM pg_tables
WHERE schemaname = 'public'
  AND has_table_privilege('public', schemaname||'.'||tablename, 'SELECT');

-- Should return 0 rows

-- Check 3: All RLS policies reference user auth
SELECT
  schemaname,
  tablename,
  policyname,
  CASE WHEN qual LIKE '%auth.uid()%' THEN 'OK' ELSE 'WARNING' END as uses_auth
FROM pg_policies
WHERE schemaname = 'public'
  AND qual NOT LIKE '%auth.uid()%'
  AND qual NOT LIKE '%has_role%';

-- Review any policies not using auth.uid() or has_role()
EOF
```

**✅ Success Criteria**:
- All PHI tables have RLS enabled
- No public access to tables
- All policies use auth checks

---

### Task 4.1.2: Network Security Validation

```bash
# Check Aurora is NOT publicly accessible
aws rds describe-db-clusters \
  --db-cluster-identifier mentalspaceehrstack-databaseb269d8bb-edwdzckxbkt7 \
  --region us-east-1 \
  --query 'DBClusters[0].PubliclyAccessible'

# Should return: false

# Check S3 buckets block public access
aws s3api get-public-access-block \
  --bucket mentalspace-ehr-files-706704660887 \
  --query 'PublicAccessBlockConfiguration'

# Should show all blocked

aws s3api get-public-access-block \
  --bucket mentalspace-ehr-videos-706704660887 \
  --query 'PublicAccessBlockConfiguration'

# Should show all blocked

# Check S3 bucket encryption
aws s3api get-bucket-encryption \
  --bucket mentalspace-ehr-files-706704660887

# Should show SSE-S3 or SSE-KMS

aws s3api get-bucket-encryption \
  --bucket mentalspace-ehr-videos-706704660887

# Should show SSE-S3 or SSE-KMS
```

**✅ Success Criteria**:
- Aurora not publicly accessible
- S3 buckets block public access
- S3 buckets encrypted at rest

---

### Task 4.1.3: Application Security Testing

```bash
# Test 1: Unauthorized access prevention
curl -X POST \
  https://ljxzdzgvytkazjrsafte.supabase.co/functions/v1/get-clients

# Should return: 401 Unauthorized

# Test 2: Cross-tenant data access prevention
# Login as User A, try to access User B's data
# (Manual test - requires 2 test users)

# Test 3: SQL injection prevention
curl -X POST \
  https://ljxzdzgvytkazjrsafte.supabase.co/functions/v1/get-client \
  -H "Authorization: Bearer $USER_TOKEN" \
  -d '{"id": "1; DROP TABLE clients;--"}'

# Should return error, not execute SQL
```

**✅ Success Criteria**: All security tests pass

---

## 4.2 Functional Testing (3 hours)

### Task 4.2.1: Create Test Users

```bash
# Create 3 test accounts via Supabase Dashboard:
# 1. admin@test.mentalspaceehr.com (admin role)
# 2. therapist@test.mentalspaceehr.com (therapist role)
# 3. patient@test.mentalspaceehr.com (patient portal user)

# For each user, add custom claims in Supabase Auth:
# - custom:role
# - custom:organizationId
# - custom:practiceId
```

---

### Task 4.2.2: End-to-End Test Scenarios

**Test Scenario 1: Admin Workflow**
```
1. Login as admin@test.mentalspaceehr.com
2. Navigate to Dashboard
3. Create new client
4. Upload client photo to S3
5. Schedule appointment
6. Verify appointment appears in calendar
7. Create clinical note
8. Submit billing claim
9. Logout
```

**Test Scenario 2: Therapist Workflow**
```
1. Login as therapist@test.mentalspaceehr.com
2. View assigned clients only (not other therapists' clients)
3. Join telehealth session
4. Upload session recording to S3
5. Generate AI note from session
6. Review note and save
7. Logout
```

**Test Scenario 3: Patient Portal**
```
1. Login as patient@test.mentalspaceehr.com
2. View own appointments only
3. Complete intake form
4. Upload insurance card image
5. View own clinical notes
6. Should NOT see other patients' data
7. Logout
```

**Execute each scenario, document results**

**✅ Success Criteria**: All scenarios pass without errors

---

### Task 4.2.3: Integration Testing

**Test AdvancedMD Integration** (if configured):
```bash
# Test eligibility check
curl -X POST \
  https://ljxzdzgvytkazjrsafte.supabase.co/functions/v1/advancedmd-proxy \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"action": "check_eligibility", "patient_id": "test-patient"}'

# Should return eligibility response or error if not configured
```

**Test Twilio Integration** (if configured):
```bash
# Test getting video token
curl -X POST \
  https://ljxzdzgvytkazjrsafte.supabase.co/functions/v1/get-twilio-token \
  -H "Authorization: Bearer $USER_TOKEN" \
  -d '{"identity": "test-user", "room": "test-room"}'

# Should return token or error if not configured
```

**Test OpenAI Integration** (if configured):
```bash
# Test AI note generation
curl -X POST \
  https://ljxzdzgvytkazjrsafte.supabase.co/functions/v1/generate-clinical-note \
  -H "Authorization: Bearer $THERAPIST_TOKEN" \
  -d '{"session_notes": "Patient discussed anxiety symptoms..."}'

# Should return generated note or error if not configured
```

**✅ Success Criteria**: Integrations respond appropriately

---

## 4.3 Performance Testing (2 hours)

### Task 4.3.1: Load Testing

```bash
# Install artillery (load testing tool)
npm install -g artillery

# Create load test config
cat > load-test.yml <<'EOF'
config:
  target: 'https://ljxzdzgvytkazjrsafte.supabase.co'
  phases:
    - duration: 60
      arrivalRate: 5  # 5 users per second
      name: "Warm up"
    - duration: 120
      arrivalRate: 10  # 10 users per second
      name: "Sustained load"
    - duration: 60
      arrivalRate: 20  # 20 users per second
      name: "Peak load"
scenarios:
  - name: "Health check"
    flow:
      - post:
          url: "/functions/v1/health-check"
          headers:
            Authorization: "Bearer ${ANON_KEY}"
EOF

# Run load test
artillery run load-test.yml

# Monitor Aurora scaling
watch -n 5 'aws rds describe-db-clusters \
  --db-cluster-identifier mentalspaceehrstack-databaseb269d8bb-edwdzckxbkt7 \
  --query "DBClusters[0].ServerlessV2ScalingConfiguration" \
  --region us-east-1'
```

**✅ Success Criteria**:
- P95 latency < 500ms
- Error rate < 1%
- Aurora scales appropriately

---

## 4.4 Phase 4 Completion Checklist

- [ ] Database RLS verified on all PHI tables
- [ ] No public database access
- [ ] S3 buckets block public access
- [ ] S3 buckets encrypted
- [ ] Unauthorized access blocked
- [ ] SQL injection prevented
- [ ] 3 test users created
- [ ] Admin workflow tested (8 steps)
- [ ] Therapist workflow tested (7 steps)
- [ ] Patient portal tested (7 steps)
- [ ] AdvancedMD integration tested
- [ ] Twilio integration tested
- [ ] OpenAI integration tested
- [ ] Load testing completed
- [ ] Performance metrics acceptable

**Phase 4 Output**: Application security validated, all functionality tested

**Handoff to Phase 5**: Application ready for monitoring setup

---

# PHASE 5: MONITORING & ALERTS (Day 3 - 4 hours)

## Objective
Setup comprehensive monitoring and alerting for production operations

---

## 5.1 CloudWatch Dashboards (2 hours)

### Task 5.1.1: Create Aurora Monitoring Dashboard

```bash
# Create CloudWatch dashboard
aws cloudwatch put-dashboard \
  --dashboard-name MentalSpaceEHR-Aurora \
  --region us-east-1 \
  --dashboard-body file://aurora-dashboard.json

# Dashboard config file
cat > aurora-dashboard.json <<'EOF'
{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/RDS", "ServerlessDatabaseCapacity", {"stat": "Average"}]
        ],
        "period": 300,
        "stat": "Average",
        "region": "us-east-1",
        "title": "Aurora Capacity (ACU)",
        "yAxis": {"left": {"min": 0, "max": 8}}
      }
    },
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/RDS", "CPUUtilization", {"stat": "Average"}],
          [".", "DatabaseConnections", {"stat": "Average"}]
        ],
        "period": 300,
        "stat": "Average",
        "region": "us-east-1",
        "title": "Database Health"
      }
    },
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/RDS", "ReadLatency", {"stat": "Average"}],
          [".", "WriteLatency", {"stat": "Average"}]
        ],
        "period": 300,
        "stat": "Average",
        "region": "us-east-1",
        "title": "Database Latency (ms)"
      }
    }
  ]
}
EOF
```

**✅ Success Criteria**: Dashboard visible in AWS Console

---

### Task 5.1.2: Create API Monitoring Dashboard

```bash
# Dashboard for API Gateway and Edge Functions
aws cloudwatch put-dashboard \
  --dashboard-name MentalSpaceEHR-API \
  --region us-east-1 \
  --dashboard-body file://api-dashboard.json

cat > api-dashboard.json <<'EOF'
{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/ApiGateway", "Count", {"stat": "Sum"}],
          [".", "4XXError", {"stat": "Sum"}],
          [".", "5XXError", {"stat": "Sum"}]
        ],
        "period": 300,
        "stat": "Sum",
        "region": "us-east-1",
        "title": "API Requests & Errors"
      }
    },
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/ApiGateway", "Latency", {"stat": "Average"}]
        ],
        "period": 300,
        "stat": "Average",
        "region": "us-east-1",
        "title": "API Latency (ms)"
      }
    }
  ]
}
EOF
```

**✅ Success Criteria**: API dashboard visible

---

### Task 5.1.3: Create S3 Monitoring Dashboard

```bash
# Dashboard for S3 uploads/downloads
aws cloudwatch put-dashboard \
  --dashboard-name MentalSpaceEHR-Storage \
  --region us-east-1 \
  --dashboard-body file://storage-dashboard.json

cat > storage-dashboard.json <<'EOF'
{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/S3", "BucketSizeBytes", {"stat": "Average"}]
        ],
        "period": 86400,
        "stat": "Average",
        "region": "us-east-1",
        "title": "Storage Usage (Bytes)"
      }
    },
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/S3", "NumberOfObjects", {"stat": "Average"}]
        ],
        "period": 86400,
        "stat": "Average",
        "region": "us-east-1",
        "title": "Object Count"
      }
    }
  ]
}
EOF
```

**✅ Success Criteria**: Storage dashboard visible

---

## 5.2 CloudWatch Alarms (1.5 hours)

### Task 5.2.1: Create SNS Topic for Alerts

```bash
# Create SNS topic
aws sns create-topic \
  --name MentalSpaceEHR-Alerts \
  --region us-east-1

# Get topic ARN
export SNS_TOPIC_ARN=$(aws sns list-topics \
  --region us-east-1 \
  --query 'Topics[?contains(TopicArn, `MentalSpaceEHR-Alerts`)].TopicArn' \
  --output text)

# Subscribe your email
aws sns subscribe \
  --topic-arn $SNS_TOPIC_ARN \
  --protocol email \
  --notification-endpoint your-email@example.com \
  --region us-east-1

# Confirm subscription via email
echo "⚠️ Check your email and confirm SNS subscription"
```

**✅ Success Criteria**: Email subscription confirmed

---

### Task 5.2.2: Create Database Alarms

```bash
# Alarm 1: High CPU
aws cloudwatch put-metric-alarm \
  --alarm-name MentalSpaceEHR-Aurora-HighCPU \
  --alarm-description "Aurora CPU > 80%" \
  --metric-name CPUUtilization \
  --namespace AWS/RDS \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --alarm-actions $SNS_TOPIC_ARN \
  --region us-east-1

# Alarm 2: High connections
aws cloudwatch put-metric-alarm \
  --alarm-name MentalSpaceEHR-Aurora-HighConnections \
  --alarm-description "Aurora connections > 50" \
  --metric-name DatabaseConnections \
  --namespace AWS/RDS \
  --statistic Average \
  --period 300 \
  --threshold 50 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --alarm-actions $SNS_TOPIC_ARN \
  --region us-east-1

# Alarm 3: Max capacity reached
aws cloudwatch put-metric-alarm \
  --alarm-name MentalSpaceEHR-Aurora-MaxCapacity \
  --alarm-description "Aurora at max capacity (8 ACU)" \
  --metric-name ServerlessDatabaseCapacity \
  --namespace AWS/RDS \
  --statistic Average \
  --period 300 \
  --threshold 7.5 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 3 \
  --alarm-actions $SNS_TOPIC_ARN \
  --region us-east-1
```

**✅ Success Criteria**: 3 database alarms created

---

### Task 5.2.3: Create API Alarms

```bash
# Alarm 1: High error rate
aws cloudwatch put-metric-alarm \
  --alarm-name MentalSpaceEHR-API-HighErrorRate \
  --alarm-description "API 5XX errors > 5% of requests" \
  --metrics file://api-error-rate-metric.json \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --alarm-actions $SNS_TOPIC_ARN \
  --region us-east-1

cat > api-error-rate-metric.json <<'EOF'
[
  {
    "Id": "error_rate",
    "Expression": "(errors / requests) * 100",
    "Label": "Error Rate %"
  },
  {
    "Id": "errors",
    "MetricStat": {
      "Metric": {
        "Namespace": "AWS/ApiGateway",
        "MetricName": "5XXError"
      },
      "Period": 300,
      "Stat": "Sum"
    },
    "ReturnData": false
  },
  {
    "Id": "requests",
    "MetricStat": {
      "Metric": {
        "Namespace": "AWS/ApiGateway",
        "MetricName": "Count"
      },
      "Period": 300,
      "Stat": "Sum"
    },
    "ReturnData": false
  }
]
EOF

# Alarm 2: High latency
aws cloudwatch put-metric-alarm \
  --alarm-name MentalSpaceEHR-API-HighLatency \
  --alarm-description "API latency > 1000ms" \
  --metric-name Latency \
  --namespace AWS/ApiGateway \
  --statistic Average \
  --period 300 \
  --threshold 1000 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --alarm-actions $SNS_TOPIC_ARN \
  --region us-east-1
```

**✅ Success Criteria**: API alarms created

---

## 5.3 Application Monitoring (30 minutes)

### Task 5.3.1: Setup Frontend Error Tracking (Optional)

```bash
# Option 1: Sentry (recommended)
npm install @sentry/react

# Add to main.tsx
cat >> src/main.tsx <<'EOF'
import * as Sentry from "@sentry/react";

if (import.meta.env.PROD) {
  Sentry.init({
    dsn: "YOUR_SENTRY_DSN",
    environment: "production",
    tracesSampleRate: 0.1,
  });
}
EOF

# Option 2: CloudWatch RUM (AWS native)
# Add to index.html via AWS Console
```

**✅ Success Criteria**: Error tracking configured

---

## 5.4 Phase 5 Completion Checklist

- [ ] Aurora monitoring dashboard created
- [ ] API monitoring dashboard created
- [ ] Storage monitoring dashboard created
- [ ] SNS topic created for alerts
- [ ] Email subscription confirmed
- [ ] 3 database alarms created
- [ ] 2 API alarms created
- [ ] Frontend error tracking configured (optional)
- [ ] All dashboards tested and visible
- [ ] Test alarm triggers (optional)

**Phase 5 Output**: Comprehensive monitoring and alerting operational

**Handoff to Phase 6**: Ready for production deployment

---

# PHASE 6: PRODUCTION DEPLOYMENT (Day 4 - 4 hours)

## Objective
Deploy application to production with custom domain

---

## 6.1 Domain & SSL Setup (2 hours)

### Task 6.1.1: Request SSL Certificate

```bash
# Request certificate for mentalspaceehr.com and *.mentalspaceehr.com
aws acm request-certificate \
  --domain-name mentalspaceehr.com \
  --subject-alternative-names '*.mentalspaceehr.com' \
  --validation-method DNS \
  --region us-east-1

# Get certificate ARN
export CERT_ARN=$(aws acm list-certificates \
  --region us-east-1 \
  --query 'CertificateSummaryList[?DomainName==`mentalspaceehr.com`].CertificateArn' \
  --output text)

# Get validation CNAME records
aws acm describe-certificate \
  --certificate-arn $CERT_ARN \
  --region us-east-1 \
  --query 'Certificate.DomainValidationOptions[0].ResourceRecord'

# Output will show:
# {
#   "Name": "_xyz.mentalspaceehr.com",
#   "Type": "CNAME",
#   "Value": "_xyz.acm-validations.aws"
# }
```

**Manual Step**: Add CNAME record to your DNS provider
- Wait 5-30 minutes for validation

**✅ Success Criteria**: Certificate status = ISSUED

---

### Task 6.1.2: Create CloudFront Distribution for Frontend

```bash
# First, upload frontend build to S3
aws s3 mb s3://mentalspace-ehr-frontend-706704660887 --region us-east-1

# Upload build
cd dist
aws s3 sync . s3://mentalspace-ehr-frontend-706704660887/ \
  --region us-east-1 \
  --cache-control "public, max-age=31536000, immutable"

# Create CloudFront distribution
aws cloudfront create-distribution \
  --origin-domain-name mentalspace-ehr-frontend-706704660887.s3.amazonaws.com \
  --default-root-object index.html \
  --distribution-config file://cloudfront-config.json

cat > cloudfront-config.json <<'EOF'
{
  "CallerReference": "mentalspace-ehr-frontend",
  "Comment": "MentalSpace EHR Frontend",
  "Enabled": true,
  "Origins": {
    "Quantity": 1,
    "Items": [
      {
        "Id": "S3-mentalspace-ehr-frontend",
        "DomainName": "mentalspace-ehr-frontend-706704660887.s3.amazonaws.com",
        "S3OriginConfig": {
          "OriginAccessIdentity": ""
        }
      }
    ]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "S3-mentalspace-ehr-frontend",
    "ViewerProtocolPolicy": "redirect-to-https",
    "AllowedMethods": {
      "Quantity": 2,
      "Items": ["GET", "HEAD"]
    },
    "ForwardedValues": {
      "QueryString": false,
      "Cookies": {"Forward": "none"}
    },
    "MinTTL": 0
  },
  "ViewerCertificate": {
    "ACMCertificateArn": "'$CERT_ARN'",
    "SSLSupportMethod": "sni-only",
    "MinimumProtocolVersion": "TLSv1.2_2021"
  },
  "Aliases": {
    "Quantity": 1,
    "Items": ["app.mentalspaceehr.com"]
  }
}
EOF
```

**✅ Success Criteria**: CloudFront distribution created

---

### Task 6.1.3: Configure DNS

```bash
# Get CloudFront distribution domain
export CF_DOMAIN=$(aws cloudfront list-distributions \
  --query 'DistributionList.Items[?Comment==`MentalSpace EHR Frontend`].DomainName' \
  --output text)

echo "CloudFront Domain: $CF_DOMAIN"

# Option 1: Using Route 53 (if domain is in Route 53)
aws route53 change-resource-record-sets \
  --hosted-zone-id YOUR_ZONE_ID \
  --change-batch file://dns-changes.json

cat > dns-changes.json <<EOF
{
  "Changes": [
    {
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "app.mentalspaceehr.com",
        "Type": "CNAME",
        "TTL": 300,
        "ResourceRecords": [{"Value": "$CF_DOMAIN"}]
      }
    },
    {
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "api.mentalspaceehr.com",
        "Type": "CNAME",
        "TTL": 300,
        "ResourceRecords": [{"Value": "xmbq984faa.execute-api.us-east-1.amazonaws.com"}]
      }
    }
  ]
}
EOF

# Option 2: Manual DNS (if using external DNS provider)
echo "Add these DNS records:"
echo "app.mentalspaceehr.com CNAME $CF_DOMAIN"
echo "api.mentalspaceehr.com CNAME xmbq984faa.execute-api.us-east-1.amazonaws.com"
```

**✅ Success Criteria**: DNS records added, wait for propagation (2-48 hours)

---

## 6.2 Production Configuration (1 hour)

### Task 6.2.1: Update CORS for Production Domain

```bash
# Update S3 CORS for production domain
aws s3api put-bucket-cors \
  --bucket mentalspace-ehr-files-706704660887 \
  --cors-configuration file://s3-cors-production.json

cat > s3-cors-production.json <<'EOF'
{
  "CORSRules": [
    {
      "AllowedOrigins": [
        "https://app.mentalspaceehr.com",
        "http://localhost:8081"
      ],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
      "AllowedHeaders": ["*"],
      "ExposeHeaders": ["ETag"],
      "MaxAgeSeconds": 3000
    }
  ]
}
EOF

# Repeat for videos bucket
aws s3api put-bucket-cors \
  --bucket mentalspace-ehr-videos-706704660887 \
  --cors-configuration file://s3-cors-production.json
```

**✅ Success Criteria**: CORS updated

---

### Task 6.2.2: Update Supabase Auth Redirect URLs

```bash
# Go to Supabase Dashboard
# Project Settings → Authentication → URL Configuration
# Add:
# - Site URL: https://app.mentalspaceehr.com
# - Redirect URLs:
#   - https://app.mentalspaceehr.com/auth/callback
#   - http://localhost:8081/auth/callback (keep for dev)
```

**✅ Success Criteria**: Auth redirects configured

---

## 6.3 Final Deployment (1 hour)

### Task 6.3.1: Build Production Bundle

```bash
# Update .env for production
cat > .env.production <<'EOF'
VITE_SUPABASE_URL="https://ljxzdzgvytkazjrsafte.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqeHpkemd2eXRrYXpqcnNhZnRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyMzIyNzQsImV4cCI6MjA3NTgwODI3NH0.RY_3-9x2Cdp4_5AExnwxaxh-Z0EC0kpnZ5Moxvm6AMg"
VITE_AWS_REGION="us-east-1"
VITE_COGNITO_IDENTITY_POOL_ID="us-east-1:b90f8d7d-ae3c-4de6-9fb3-05af044c378c"
VITE_FILES_BUCKET="mentalspace-ehr-files-706704660887"
VITE_VIDEOS_BUCKET="mentalspace-ehr-videos-706704660887"
VITE_VIDEO_CDN="https://d33wpxg6ve4byx.cloudfront.net"
VITE_APP_URL="https://app.mentalspaceehr.com"
EOF

# Build
npm run build

# Deploy to S3
aws s3 sync dist/ s3://mentalspace-ehr-frontend-706704660887/ \
  --region us-east-1 \
  --delete \
  --cache-control "public, max-age=31536000, immutable"

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --paths "/*"
```

**✅ Success Criteria**: Production build deployed

---

### Task 6.3.2: Smoke Test Production

```bash
# Wait for CloudFront invalidation to complete (1-5 minutes)

# Test 1: Check site loads
curl -I https://app.mentalspaceehr.com

# Should return 200 OK

# Test 2: Check SSL certificate
curl -vI https://app.mentalspaceehr.com 2>&1 | grep "SSL certificate"

# Should show valid certificate

# Test 3: Login and test core functionality
# Manual browser test:
# 1. Go to https://app.mentalspaceehr.com
# 2. Login
# 3. Navigate to dashboard
# 4. Load clients list
# 5. Upload file
# 6. Check Network tab - should call Edge Functions
```

**✅ Success Criteria**: All smoke tests pass

---

## 6.4 Phase 6 Completion Checklist

- [ ] SSL certificate requested and validated
- [ ] CloudFront distribution created for frontend
- [ ] DNS records added (app.mentalspaceehr.com, api.mentalspaceehr.com)
- [ ] S3 CORS updated for production domain
- [ ] Supabase auth redirects updated
- [ ] Production build created
- [ ] Frontend deployed to S3
- [ ] CloudFront cache invalidated
- [ ] HTTPS loads successfully
- [ ] SSL certificate valid
- [ ] Login works
- [ ] Core functionality tested

**Phase 6 Output**: Application live on production domain

**Handoff to Phase 7**: Post-launch operations and monitoring

---

# PHASE 7: POST-LAUNCH OPERATIONS (Ongoing)

## Objective
Maintain system health, monitor performance, respond to incidents

---

## 7.1 Daily Operations

### Daily Checklist
```
[ ] Check CloudWatch dashboards for anomalies
[ ] Review CloudWatch alarms (any triggered?)
[ ] Check Aurora capacity usage
[ ] Review S3 storage growth
[ ] Check Edge Function error rates
[ ] Review application error logs
[ ] Verify backups completed successfully
```

---

## 7.2 Weekly Operations

### Weekly Checklist
```
[ ] Review performance metrics trends
[ ] Check for AWS service limit warnings
[ ] Review security audit logs
[ ] Test backup restoration (monthly)
[ ] Update dependencies (security patches)
[ ] Review cost allocation
[ ] Check certificate expiration dates (90 days out)
```

---

## 7.3 Monthly Operations

### Monthly Checklist
```
[ ] Full disaster recovery test
[ ] Review and rotate secrets
[ ] Security audit
[ ] Performance optimization review
[ ] Cost optimization review
[ ] User feedback analysis
[ ] Update documentation
[ ] Compliance review (HIPAA)
```

---

## 7.4 Incident Response Procedures

### Severity 1: System Down
```
1. Check CloudWatch dashboards
2. Check Aurora database status
3. Check Edge Functions status
4. Check S3/CloudFront status
5. Check DNS resolution
6. Review recent deployments
7. Rollback if necessary
8. Notify users via status page
9. Document incident
10. Post-mortem meeting
```

### Severity 2: Degraded Performance
```
1. Check Aurora capacity (scaling?)
2. Check Edge Function throttling
3. Check CloudFront cache hit rate
4. Review slow query logs
5. Optimize if needed
6. Monitor for improvement
```

### Severity 3: Feature Bug
```
1. Reproduce issue
2. Log bug in tracking system
3. Prioritize fix
4. Deploy hotfix if critical
5. Notify affected users
```

---

## 7.5 Scaling Considerations

**When to scale Aurora:**
- Consistently hitting 6+ ACU
- Query latency > 100ms P95
- Connection count > 40

**When to scale Edge Functions:**
- Error rate > 1%
- Latency > 1000ms P95
- Throttling occurring

**When to scale S3:**
- No scaling needed (automatic)
- Monitor costs if > 1TB

---

## 7.6 Backup & Disaster Recovery

### Aurora Backups
- **Automated**: Daily snapshots (30 days retention) ✅
- **Manual**: Weekly full backup (90 days retention)
- **Point-in-Time Recovery**: Enabled (5 minutes)

### Recovery Time Objectives (RTO)
- **Database**: 30 minutes (restore from snapshot)
- **Application**: 15 minutes (redeploy frontend)
- **Full System**: 1 hour (worst case)

### Recovery Point Objectives (RPO)
- **Database**: 5 minutes (PITR)
- **Files/Videos**: 24 hours (S3 versioning)

---

## 7.7 Cost Management

### Monthly Cost Targets
- **AWS**: $120-180/month
- **Supabase**: $25/month
- **Total**: $145-205/month

### Cost Optimization Tips
- Archive old videos to Glacier (90 days)
- Delete unused S3 versions (30 days)
- Right-size Aurora ACU if underutilized
- Review CloudFront usage (switch to cheaper regions if possible)
- Optimize Edge Function execution time

---

## 7.8 Security Maintenance

### Quarterly Security Review
```
[ ] Review IAM policies (least privilege)
[ ] Rotate database credentials
[ ] Review S3 bucket policies
[ ] Check for unencrypted data
[ ] Review RLS policies
[ ] Update security dependencies
[ ] Penetration testing (optional)
[ ] HIPAA compliance audit
```

---

# APPENDIX: REFERENCE INFORMATION

## A. Environment Variables Reference

**Frontend (.env)**
```
VITE_SUPABASE_URL=https://ljxzdzgvytkazjrsafte.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_AWS_REGION=us-east-1
VITE_COGNITO_IDENTITY_POOL_ID=us-east-1:b90f8d7d-ae3c-4de6-9fb3-05af044c378c
VITE_FILES_BUCKET=mentalspace-ehr-files-706704660887
VITE_VIDEOS_BUCKET=mentalspace-ehr-videos-706704660887
VITE_VIDEO_CDN=https://d33wpxg6ve4byx.cloudfront.net
VITE_APP_URL=https://app.mentalspaceehr.com
```

**Edge Functions (Supabase Secrets)**
```
DATABASE_URL=postgresql://postgres:PASSWORD@HOST:5432/mentalspaceehr
DATABASE_HOST=mentalspaceehrstack-databaseb269d8bb-edwdzckxbkt7.cluster-ci16iwey2cac.us-east-1.rds.amazonaws.com
DATABASE_PORT=5432
DATABASE_NAME=mentalspaceehr
DATABASE_USER=postgres
DATABASE_PASSWORD=[from AWS Secrets Manager]
```

---

## B. Key AWS Resources

| Resource | Value |
|----------|-------|
| AWS Account | 706704660887 |
| Region | us-east-1 |
| VPC | vpc-00829756378f4c9f9 |
| Aurora Cluster | mentalspaceehrstack-databaseb269d8bb-edwdzckxbkt7 |
| Aurora Endpoint | mentalspaceehrstack-databaseb269d8bb-edwdzckxbkt7.cluster-ci16iwey2cac.us-east-1.rds.amazonaws.com |
| Files Bucket | mentalspace-ehr-files-706704660887 |
| Videos Bucket | mentalspace-ehr-videos-706704660887 |
| Video CDN | d33wpxg6ve4byx.cloudfront.net |
| API Gateway | xmbq984faa.execute-api.us-east-1.amazonaws.com |
| Cognito Identity Pool | us-east-1:b90f8d7d-ae3c-4de6-9fb3-05af044c378c |
| Secrets Manager Secret | mentalspace-ehr-db-credentials |

---

## C. Supabase Resources

| Resource | Value |
|----------|-------|
| Project ID | ljxzdzgvytkazjrsafte |
| Project URL | https://ljxzdzgvytkazjrsafte.supabase.co |
| Region | US East (AWS us-east-1) |
| Plan | Pro ($25/month) |
| Edge Functions | 59 deployed |
| Purpose | Auth + Edge Functions ONLY |

---

## D. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      USER TRAFFIC                           │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
                 ┌──────────────────┐
                 │  CloudFront CDN  │
                 │ (app.mentalspace │
                 │   ehr.com)       │
                 └────────┬─────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │   React Frontend      │
              │   (S3 Static Host)    │
              └───────┬───────────────┘
                      │
        ┌─────────────┴─────────────┐
        │                           │
        ▼                           ▼
┌───────────────┐          ┌────────────────┐
│ Supabase Auth │          │ Edge Functions │
│ (Login/MFA)   │          │ (59 functions) │
└───────────────┘          └────────┬───────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
                    ▼                               ▼
           ┌─────────────────┐           ┌──────────────────┐
           │  AWS Aurora     │           │   AWS S3         │
           │  PostgreSQL     │           │   (Files/Videos) │
           │  (All PHI Data) │           │   + CloudFront   │
           └─────────────────┘           └──────────────────┘
```

---

## E. Contact & Support

**AWS Support**: AWS Console → Support Center
**Supabase Support**: https://supabase.com/dashboard/support
**Domain/DNS**: [Your DNS provider]
**Emergency Contact**: [Your email/phone]

---

## F. Disaster Recovery Contacts

| Role | Contact | When to Call |
|------|---------|--------------|
| AWS Support | AWS Console | AWS service outage |
| Supabase Support | Supabase Dashboard | Auth/Edge Function issues |
| DNS Provider | Provider support | DNS issues |
| System Admin | [Your contact] | Application issues |

---

# END OF DEPLOYMENT PLAN

**Plan Version**: 1.0
**Last Updated**: October 11, 2025
**Next Review**: After Phase 1 completion

**Total Estimated Time**: 4 days (29 hours)
- Phase 1: 4 hours
- Phase 2: 6 hours
- Phase 3: 3 hours
- Phase 4: 8 hours
- Phase 5: 4 hours
- Phase 6: 4 hours
- Phase 7: Ongoing

**Status**: Ready to begin Phase 1
