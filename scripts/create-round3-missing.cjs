const AWS = require('aws-sdk');
const lambda = new AWS.Lambda({ region: 'us-east-1' });

const round3Migrations = [
  {
    name: '00_add_supervisor_id_to_profiles',
    sql: `
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS supervisor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_supervisor ON public.profiles(supervisor_id);
    `
  },
  {
    name: '01_add_note_format_soap_enum',
    sql: `
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'SOAP' AND enumtypid = 'note_format'::regtype) THEN
    ALTER TYPE note_format ADD VALUE 'SOAP';
  END IF;
EXCEPTION
  WHEN undefined_object THEN
    CREATE TYPE note_format AS ENUM ('SOAP', 'DAP', 'BIRP', 'narrative');
END $$;
    `
  },
  {
    name: '02_create_telehealth_consents',
    sql: `
CREATE TABLE IF NOT EXISTS public.telehealth_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL,
  consented_at TIMESTAMPTZ DEFAULT NOW(),
  consented_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ,
  document_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_telehealth_consents_client ON public.telehealth_consents(client_id);
    `
  },
  {
    name: '03_create_telehealth_waiting_rooms',
    sql: `
CREATE TABLE IF NOT EXISTS public.telehealth_waiting_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.telehealth_sessions(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  admitted_at TIMESTAMPTZ,
  status TEXT DEFAULT 'waiting',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_telehealth_waiting_rooms_session ON public.telehealth_waiting_rooms(session_id);
CREATE INDEX IF NOT EXISTS idx_telehealth_waiting_rooms_client ON public.telehealth_waiting_rooms(client_id);
    `
  },
  {
    name: '04_add_columns_to_telehealth_sessions',
    sql: `
ALTER TABLE public.telehealth_sessions
  ADD COLUMN IF NOT EXISTS max_participants INTEGER DEFAULT 2,
  ADD COLUMN IF NOT EXISTS clinician_id UUID REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_telehealth_sessions_clinician ON public.telehealth_sessions(clinician_id);
    `
  },
  {
    name: '05_add_title_to_portal_forms',
    sql: `
ALTER TABLE public.portal_form_templates
  ADD COLUMN IF NOT EXISTS title TEXT;
    `
  },
  {
    name: '06_add_columns_to_portal_responses',
    sql: `
ALTER TABLE public.portal_form_responses
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
    `
  },
  {
    name: '07_add_billing_columns',
    sql: `
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS account_created_date TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.insurance_claims
  ADD COLUMN IF NOT EXISTS rendering_provider_id UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS date_of_service DATE;

CREATE INDEX IF NOT EXISTS idx_insurance_claims_rendering_provider ON public.insurance_claims(rendering_provider_id);
CREATE INDEX IF NOT EXISTS idx_insurance_claims_date_of_service ON public.insurance_claims(date_of_service);
    `
  }
];

console.log('🔧 Creating round 3 missing columns and tables...');

lambda.invoke({
  FunctionName: 'mentalspace-apply-migrations-to-aurora',
  InvocationType: 'RequestResponse',
  Payload: JSON.stringify({ migrations: round3Migrations })
}, (err, data) => {
  if (err) {
    console.error('❌ Lambda invocation failed:', err);
    process.exit(1);
  }

  const response = JSON.parse(data.Payload);
  const body = JSON.parse(response.body);

  console.log('✅ Round 3 prerequisites created:');
  console.log(JSON.stringify(body, null, 2));

  if (body.summary.failed > 0) {
    console.log('\n⚠️  Some migrations failed. Check the errors above.');
    process.exit(1);
  }

  console.log('\n✅ All round 3 prerequisites created successfully!');
  console.log('\n📊 Migration Progress Summary:');
  console.log('   Applied in this round: ' + body.summary.applied);
  console.log('   Continuing with final migration run...\n');

  const { execSync } = require('child_process');
  try {
    execSync('node scripts/apply-migrations-via-lambda.cjs', { stdio: 'inherit' });
  } catch (error) {
    console.error('❌ Migration re-run failed');
    process.exit(1);
  }
});
