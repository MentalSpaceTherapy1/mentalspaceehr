const AWS = require('aws-sdk');
const lambda = new AWS.Lambda({ region: 'us-east-1' });

const migrations = [
  {
    name: '00_add_missing_columns_psychiatrist',
    sql: `
      -- Add missing psychiatrist_id column to clients table
      ALTER TABLE public.clients
      ADD COLUMN IF NOT EXISTS psychiatrist_id UUID REFERENCES public.profiles(id);

      CREATE INDEX IF NOT EXISTS idx_clients_psychiatrist
      ON public.clients(psychiatrist_id);
    `
  },
  {
    name: '01_add_enum_associate_trainee',
    sql: `
      -- Add associate_trainee to app_role enum if not exists
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_enum
          WHERE enumlabel = 'associate_trainee'
          AND enumtypid = 'public.app_role'::regtype
        ) THEN
          ALTER TYPE public.app_role ADD VALUE 'associate_trainee';
        END IF;
      END $$;
    `
  },
  {
    name: '02_add_enum_note_types',
    sql: `
      -- Add missing note types to enum
      DO $$
      BEGIN
        -- Add intake_assessment
        IF NOT EXISTS (
          SELECT 1 FROM pg_enum
          WHERE enumlabel = 'intake_assessment'
          AND enumtypid = 'public.note_type'::regtype
        ) THEN
          ALTER TYPE public.note_type ADD VALUE 'intake_assessment';
        END IF;

        -- Add crisis_assessment
        IF NOT EXISTS (
          SELECT 1 FROM pg_enum
          WHERE enumlabel = 'crisis_assessment'
          AND enumtypid = 'public.note_type'::regtype
        ) THEN
          ALTER TYPE public.note_type ADD VALUE 'crisis_assessment';
        END IF;
      END $$;
    `
  },
  {
    name: '03_create_insurance_claims',
    sql: `
      CREATE TABLE IF NOT EXISTS public.insurance_claims (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
        appointment_id UUID REFERENCES public.appointments(id),
        claim_number TEXT,
        claim_status TEXT,
        submitted_date TIMESTAMPTZ,
        paid_date TIMESTAMPTZ,
        paid_amount DECIMAL(10,2),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_insurance_claims_client
      ON public.insurance_claims(client_id);
    `
  },
  {
    name: '04_create_client_portal_messages',
    sql: `
      CREATE TABLE IF NOT EXISTS public.client_portal_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
        from_user_id UUID REFERENCES public.profiles(id),
        subject TEXT,
        message_text TEXT,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_portal_messages_client
      ON public.client_portal_messages(client_id);
    `
  },
  {
    name: '05_add_clients_portal_columns',
    sql: `
      ALTER TABLE public.clients
      ADD COLUMN IF NOT EXISTS portal_enabled BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS account_created_date TIMESTAMPTZ;
    `
  },
  {
    name: '06_create_missing_note_tables',
    sql: `
      CREATE TABLE IF NOT EXISTS public.contact_notes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
        therapist_id UUID REFERENCES public.profiles(id),
        note_date TIMESTAMPTZ DEFAULT NOW(),
        contact_type TEXT,
        note_content TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS public.miscellaneous_notes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
        therapist_id UUID REFERENCES public.profiles(id),
        note_date TIMESTAMPTZ DEFAULT NOW(),
        note_content TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `
  },
  {
    name: '07_add_appointments_columns',
    sql: `
      ALTER TABLE public.appointments
      ADD COLUMN IF NOT EXISTS host_id UUID REFERENCES public.profiles(id),
      ADD COLUMN IF NOT EXISTS appointment_date DATE,
      ADD COLUMN IF NOT EXISTS telehealth_platform TEXT,
      ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
      ADD COLUMN IF NOT EXISTS date_of_service DATE;
    `
  },
  {
    name: '08_add_profiles_first_last_names',
    sql: `
      ALTER TABLE public.profiles
      ADD COLUMN IF NOT EXISTS first_name TEXT,
      ADD COLUMN IF NOT EXISTS last_name TEXT,
      ADD COLUMN IF NOT EXISTS account_created_date TIMESTAMPTZ DEFAULT NOW();
    `
  }
];

console.log(`🚀 Applying ${migrations.length} critical prerequisite migrations...`);

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

  console.log('📊 Results:');
  console.log(`   ✅ Applied: ${body.summary.applied}`);
  console.log(`   ⏭️  Skipped: ${body.summary.skipped}`);
  console.log(`   ❌ Failed: ${body.summary.failed}`);

  if (body.results.failed && body.results.failed.length > 0) {
    console.log('\n❌ Failed migrations:');
    body.results.failed.forEach(f => {
      console.log(`   - ${f.name}: ${f.error}`);
    });
  }

  if (body.summary.failed > 0) {
    process.exit(1);
  }

  console.log('\n✅ Prerequisites complete! Run main migrations now.');
});
