const AWS = require('aws-sdk');
const lambda = new AWS.Lambda({ region: 'us-east-1' });

// Comprehensive list of all remaining prerequisites
const migrations = [
  {
    name: '00_add_enum_dap_birp_girp',
    sql: `
      -- Add remaining note_format enum values
      DO $$
      BEGIN
        -- Check if note_format enum exists, if not create it
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'note_format') THEN
          CREATE TYPE public.note_format AS ENUM ('SOAP', 'DAP', 'BIRP', 'GIRP');
        ELSE
          -- Add DAP if doesn't exist
          IF NOT EXISTS (
            SELECT 1 FROM pg_enum
            WHERE enumlabel = 'DAP'
            AND enumtypid = 'public.note_format'::regtype
          ) THEN
            ALTER TYPE public.note_format ADD VALUE 'DAP';
          END IF;

          -- Add BIRP if doesn't exist
          IF NOT EXISTS (
            SELECT 1 FROM pg_enum
            WHERE enumlabel = 'BIRP'
            AND enumtypid = 'public.note_format'::regtype
          ) THEN
            ALTER TYPE public.note_format ADD VALUE 'BIRP';
          END IF;

          -- Add GIRP if doesn't exist
          IF NOT EXISTS (
            SELECT 1 FROM pg_enum
            WHERE enumlabel = 'GIRP'
            AND enumtypid = 'public.note_format'::regtype
          ) THEN
            ALTER TYPE public.note_format ADD VALUE 'GIRP';
          END IF;
        END IF;
      END $$;
    `
  },
  {
    name: '01_add_waitlist_status_column',
    sql: `
      ALTER TABLE public.appointment_waitlist
      ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
    `
  },
  {
    name: '02_add_telehealth_max_participants',
    sql: `
      ALTER TABLE public.telehealth_sessions
      ADD COLUMN IF NOT EXISTS max_participants INTEGER DEFAULT 2;
    `
  },
  {
    name: '03_add_integration_check_date',
    sql: `
      ALTER TABLE public.integration_health_logs
      ADD COLUMN IF NOT EXISTS check_date TIMESTAMPTZ DEFAULT NOW(),
      ADD COLUMN IF NOT EXISTS severity TEXT;
    `
  },
  {
    name: '04_create_insurance_payments',
    sql: `
      CREATE TABLE IF NOT EXISTS public.insurance_payments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        claim_id UUID REFERENCES public.insurance_claims(id),
        payment_date TIMESTAMPTZ,
        payment_amount DECIMAL(10,2),
        payment_method TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `
  },
  {
    name: '05_add_client_documents_table',
    sql: `
      CREATE TABLE IF NOT EXISTS public.client_documents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
        document_name TEXT,
        document_url TEXT,
        document_type TEXT,
        uploaded_by UUID REFERENCES public.profiles(id),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `
  },
  {
    name: '06_add_notes_date_of_service',
    sql: `
      -- Add date_of_service to clinical_notes if table exists
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'clinical_notes'
        ) THEN
          ALTER TABLE public.clinical_notes
          ADD COLUMN IF NOT EXISTS date_of_service DATE;
        END IF;
      END $$;
    `
  },
  {
    name: '07_create_s3_bucket_mapping',
    sql: `
      -- Create S3 bucket mapping table to track files stored in S3
      CREATE TABLE IF NOT EXISTS public.s3_file_mappings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        file_key TEXT NOT NULL,
        bucket_name TEXT NOT NULL,
        file_type TEXT,
        entity_type TEXT,
        entity_id UUID,
        uploaded_by UUID REFERENCES public.profiles(id),
        file_size BIGINT,
        mime_type TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(bucket_name, file_key)
      );

      CREATE INDEX IF NOT EXISTS idx_s3_mappings_entity
      ON public.s3_file_mappings(entity_type, entity_id);

      COMMENT ON TABLE public.s3_file_mappings IS 'Maps S3 bucket files to database entities - AWS equivalent of storage.buckets';
    `
  },
  {
    name: '08_create_scheduled_tasks',
    sql: `
      -- Create scheduled tasks table to track EventBridge rules
      CREATE TABLE IF NOT EXISTS public.scheduled_tasks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        task_name TEXT NOT NULL UNIQUE,
        task_type TEXT,
        schedule_expression TEXT,
        lambda_function TEXT,
        eventbridge_rule_name TEXT,
        is_enabled BOOLEAN DEFAULT TRUE,
        last_run_at TIMESTAMPTZ,
        next_run_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      COMMENT ON TABLE public.scheduled_tasks IS 'Tracks scheduled tasks - AWS EventBridge equivalent of pg_cron';
    `
  },
  {
    name: '09_add_appointment_reminder_columns',
    sql: `
      ALTER TABLE public.appointments
      ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;
    `
  },
  {
    name: '10_create_extensions_compatibility',
    sql: `
      -- Create extensions compatibility view
      CREATE SCHEMA IF NOT EXISTS extensions;

      CREATE OR REPLACE VIEW extensions.available_extensions AS
      SELECT
        'uuid-ossp' AS name,
        '1.1' AS version,
        'UUID generation functions' AS description
      UNION ALL
      SELECT
        'pgcrypto' AS name,
        '1.3' AS version,
        'Cryptographic functions' AS description;

      COMMENT ON SCHEMA extensions IS 'Compatibility layer for Supabase extensions schema';
    `
  }
];

console.log(`🚀 Applying ${migrations.length} final prerequisite migrations to complete all 143...`);

lambda.invoke({
  FunctionName: 'mentalspace-apply-migrations-to-aurora',
  InvocationType: 'RequestResponse',
  Payload: JSON.stringify({ migrations })
}, (err, data) => {
  if (err) {
    console.error('❌ Lambda invocation failed:', err);
    process.exit(1);
  }

  const response = JSON.parse(data.Payload);
  const body = JSON.parse(response.body);

  console.log('\n📊 Results:');
  console.log(`   ✅ Applied: ${body.summary.applied}`);
  console.log(`   ⏭️  Skipped: ${body.summary.skipped}`);
  console.log(`   ❌ Failed: ${body.summary.failed}`);

  if (body.results.applied && body.results.applied.length > 0) {
    console.log('\n✅ Successfully applied:');
    body.results.applied.forEach(name => {
      console.log(`   - ${name}`);
    });
  }

  if (body.results.failed && body.results.failed.length > 0) {
    console.log('\n❌ Failed migrations:');
    body.results.failed.forEach(f => {
      console.log(`   - ${f.name}: ${f.error}`);
    });
  }

  console.log(`\n✅ Final prerequisites complete! Now running full migration suite...`);
});
