const AWS = require('aws-sdk');
const lambda = new AWS.Lambda({ region: 'us-east-1' });

const round2Migrations = [
  {
    name: '00_add_case_manager_to_clients',
    sql: `
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS case_manager_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_clients_case_manager ON public.clients(case_manager_id);
    `
  },
  {
    name: '01_create_claim_line_items',
    sql: `
CREATE TABLE IF NOT EXISTS public.claim_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL REFERENCES public.insurance_claims(id) ON DELETE CASCADE,
  service_date DATE NOT NULL,
  procedure_code TEXT NOT NULL,
  diagnosis_codes TEXT[],
  units INTEGER DEFAULT 1,
  unit_charge DECIMAL(10,2),
  total_charge DECIMAL(10,2),
  allowed_amount DECIMAL(10,2),
  paid_amount DECIMAL(10,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_claim_line_items_claim ON public.claim_line_items(claim_id);
    `
  },
  {
    name: '02_create_insurance_payments',
    sql: `
CREATE TABLE IF NOT EXISTS public.insurance_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID REFERENCES public.insurance_claims(id) ON DELETE CASCADE,
  payment_date DATE NOT NULL,
  payment_amount DECIMAL(10,2) NOT NULL,
  payment_method TEXT,
  check_number TEXT,
  reference_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_insurance_payments_claim ON public.insurance_payments(claim_id);
CREATE INDEX IF NOT EXISTS idx_insurance_payments_date ON public.insurance_payments(payment_date);
    `
  },
  {
    name: '03_create_client_portal_messages',
    sql: `
CREATE TABLE IF NOT EXISTS public.client_portal_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  message_body TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  parent_message_id UUID REFERENCES public.client_portal_messages(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_portal_messages_client ON public.client_portal_messages(client_id);
CREATE INDEX IF NOT EXISTS idx_client_portal_messages_sender ON public.client_portal_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_client_portal_messages_parent ON public.client_portal_messages(parent_message_id);
    `
  },
  {
    name: '04_create_assessment_administrations',
    sql: `
CREATE TABLE IF NOT EXISTS public.assessment_administrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  assessment_id UUID NOT NULL,
  administered_by UUID REFERENCES auth.users(id),
  administration_date DATE NOT NULL,
  scores JSONB,
  interpretation TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assessment_administrations_client ON public.assessment_administrations(client_id);
CREATE INDEX IF NOT EXISTS idx_assessment_administrations_assessment ON public.assessment_administrations(assessment_id);
    `
  },
  {
    name: '05_add_columns_to_portal_form_templates',
    sql: `
ALTER TABLE public.portal_form_templates
  ADD COLUMN IF NOT EXISTS form_type TEXT;

CREATE INDEX IF NOT EXISTS idx_portal_form_templates_type ON public.portal_form_templates(form_type);
    `
  },
  {
    name: '06_add_columns_to_portal_form_responses',
    sql: `
ALTER TABLE public.portal_form_responses
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS assignment_id UUID;

CREATE INDEX IF NOT EXISTS idx_portal_form_responses_assignment ON public.portal_form_responses(assignment_id);
    `
  },
  {
    name: '07_add_columns_to_client_documents',
    sql: `
ALTER TABLE public.client_documents
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

CREATE INDEX IF NOT EXISTS idx_client_documents_status ON public.client_documents(status);
    `
  },
  {
    name: '08_add_columns_to_billing',
    sql: `
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS account_created_date DATE,
  ADD COLUMN IF NOT EXISTS rendering_provider_id UUID REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_clients_rendering_provider ON public.clients(rendering_provider_id);
    `
  },
  {
    name: '09_add_enum_associate_trainee',
    sql: `
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'associate_trainee' AND enumtypid = 'app_role'::regtype) THEN
    ALTER TYPE app_role ADD VALUE 'associate_trainee';
  END IF;
END $$;
    `
  },
  {
    name: '10_add_check_date_to_payments',
    sql: `
ALTER TABLE public.insurance_payments
  ADD COLUMN IF NOT EXISTS check_date DATE;

CREATE INDEX IF NOT EXISTS idx_insurance_payments_check_date ON public.insurance_payments(check_date);
    `
  }
];

console.log('🔧 Creating round 2 missing tables and columns...');

lambda.invoke({
  FunctionName: 'mentalspace-apply-migrations-to-aurora',
  InvocationType: 'RequestResponse',
  Payload: JSON.stringify({ migrations: round2Migrations })
}, (err, data) => {
  if (err) {
    console.error('❌ Lambda invocation failed:', err);
    process.exit(1);
  }

  const response = JSON.parse(data.Payload);
  const body = JSON.parse(response.body);

  console.log('✅ Round 2 prerequisites created:');
  console.log(JSON.stringify(body, null, 2));

  if (body.summary.failed > 0) {
    console.log('\n⚠️  Some migrations failed. Check the errors above.');
    process.exit(1);
  }

  console.log('\n✅ All round 2 prerequisites created successfully!');
  console.log('📤 Re-running all migrations...\n');

  const { execSync } = require('child_process');
  try {
    execSync('node scripts/apply-migrations-via-lambda.cjs', { stdio: 'inherit' });
  } catch (error) {
    console.error('❌ Migration re-run failed');
    process.exit(1);
  }
});
