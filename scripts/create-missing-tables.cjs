const AWS = require('aws-sdk');
const lambda = new AWS.Lambda({ region: 'us-east-1' });

const missingTableMigrations = [
  {
    name: '00_create_insurance_claims',
    sql: `
CREATE TABLE IF NOT EXISTS public.insurance_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  claim_number TEXT UNIQUE,
  insurance_company_id UUID,
  service_date DATE NOT NULL,
  diagnosis_codes TEXT[],
  procedure_codes TEXT[],
  billed_amount DECIMAL(10,2),
  allowed_amount DECIMAL(10,2),
  paid_amount DECIMAL(10,2),
  patient_responsibility DECIMAL(10,2),
  status TEXT NOT NULL DEFAULT 'pending',
  submitted_date DATE,
  processed_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_insurance_claims_client ON public.insurance_claims(client_id);
CREATE INDEX IF NOT EXISTS idx_insurance_claims_appointment ON public.insurance_claims(appointment_id);
CREATE INDEX IF NOT EXISTS idx_insurance_claims_status ON public.insurance_claims(status);
    `
  },
  {
    name: '01_add_psychiatrist_id_to_clients',
    sql: `
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS psychiatrist_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_clients_psychiatrist ON public.clients(psychiatrist_id);
    `
  },
  {
    name: '02_create_insurance_companies',
    sql: `
CREATE TABLE IF NOT EXISTS public.insurance_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  payer_id TEXT,
  phone TEXT,
  fax TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_insurance_companies_name ON public.insurance_companies(name);
CREATE INDEX IF NOT EXISTS idx_insurance_companies_active ON public.insurance_companies(is_active);
    `
  },
  {
    name: '03_create_client_documents',
    sql: `
CREATE TABLE IF NOT EXISTS public.client_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  uploaded_by UUID REFERENCES auth.users(id),
  upload_date TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_documents_client ON public.client_documents(client_id);
CREATE INDEX IF NOT EXISTS idx_client_documents_type ON public.client_documents(document_type);
    `
  },
  {
    name: '04_create_document_templates',
    sql: `
CREATE TABLE IF NOT EXISTS public.document_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  template_type TEXT NOT NULL,
  content TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_document_templates_type ON public.document_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_document_templates_active ON public.document_templates(is_active);
    `
  },
  {
    name: '05_create_clinical_assessments',
    sql: `
CREATE TABLE IF NOT EXISTS public.clinical_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  clinician_id UUID NOT NULL REFERENCES auth.users(id),
  assessment_type TEXT NOT NULL,
  assessment_date DATE NOT NULL,
  findings TEXT,
  recommendations TEXT,
  risk_level TEXT,
  follow_up_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clinical_assessments_client ON public.clinical_assessments(client_id);
CREATE INDEX IF NOT EXISTS idx_clinical_assessments_clinician ON public.clinical_assessments(clinician_id);
CREATE INDEX IF NOT EXISTS idx_clinical_assessments_date ON public.clinical_assessments(assessment_date);
    `
  },
  {
    name: '06_create_client_resource_assignments',
    sql: `
CREATE TABLE IF NOT EXISTS public.client_resource_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL,
  assigned_by UUID REFERENCES auth.users(id),
  assigned_date TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'assigned',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_resource_assignments_client ON public.client_resource_assignments(client_id);
CREATE INDEX IF NOT EXISTS idx_client_resource_assignments_resource ON public.client_resource_assignments(resource_id);
    `
  },
  {
    name: '07_create_portal_form_templates',
    sql: `
CREATE TABLE IF NOT EXISTS public.portal_form_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  form_schema JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portal_form_templates_active ON public.portal_form_templates(is_active);
    `
  },
  {
    name: '08_create_portal_form_responses',
    sql: `
CREATE TABLE IF NOT EXISTS public.portal_form_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_template_id UUID NOT NULL REFERENCES public.portal_form_templates(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  response_data JSONB NOT NULL,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'submitted',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portal_form_responses_template ON public.portal_form_responses(form_template_id);
CREATE INDEX IF NOT EXISTS idx_portal_form_responses_client ON public.portal_form_responses(client_id);
CREATE INDEX IF NOT EXISTS idx_portal_form_responses_status ON public.portal_form_responses(status);
    `
  },
  {
    name: '09_create_reminder_logs',
    sql: `
CREATE TABLE IF NOT EXISTS public.reminder_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  delivery_method TEXT NOT NULL,
  delivery_status TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reminder_logs_appointment ON public.reminder_logs(appointment_id);
CREATE INDEX IF NOT EXISTS idx_reminder_logs_client ON public.reminder_logs(client_id);
CREATE INDEX IF NOT EXISTS idx_reminder_logs_sent_at ON public.reminder_logs(sent_at);
    `
  },
  {
    name: '10_create_ai_note_settings',
    sql: `
CREATE TABLE IF NOT EXISTS public.ai_note_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  default_template TEXT,
  auto_generate BOOLEAN DEFAULT false,
  include_assessment BOOLEAN DEFAULT true,
  include_treatment_plan BOOLEAN DEFAULT true,
  custom_prompts JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_ai_note_settings_user ON public.ai_note_settings(user_id);
    `
  },
  {
    name: '11_create_portal_form_assignments',
    sql: `
CREATE TABLE IF NOT EXISTS public.portal_form_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_template_id UUID NOT NULL REFERENCES public.portal_form_templates(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  due_date DATE,
  completed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'assigned',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portal_form_assignments_template ON public.portal_form_assignments(form_template_id);
CREATE INDEX IF NOT EXISTS idx_portal_form_assignments_client ON public.portal_form_assignments(client_id);
CREATE INDEX IF NOT EXISTS idx_portal_form_assignments_status ON public.portal_form_assignments(status);
    `
  },
  {
    name: '12_add_missing_columns_to_clients',
    sql: `
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS portal_enabled BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_clients_portal_enabled ON public.clients(portal_enabled);
    `
  },
  {
    name: '13_add_columns_to_appointments',
    sql: `
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS telehealth_platform TEXT,
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
  ADD COLUMN IF NOT EXISTS host_id UUID REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_appointments_host ON public.appointments(host_id);
    `
  },
  {
    name: '14_add_columns_to_audit_logs',
    sql: `
ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS action_type TEXT,
  ADD COLUMN IF NOT EXISTS severity TEXT;

CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON public.audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON public.audit_logs(severity);
    `
  }
];

console.log('🔧 Creating missing tables and columns...');

lambda.invoke({
  FunctionName: 'mentalspace-apply-migrations-to-aurora',
  InvocationType: 'RequestResponse',
  Payload: JSON.stringify({ migrations: missingTableMigrations })
}, (err, data) => {
  if (err) {
    console.error('❌ Lambda invocation failed:', err);
    process.exit(1);
  }

  const response = JSON.parse(data.Payload);
  const body = JSON.parse(response.body);

  console.log('✅ Missing tables created:');
  console.log(JSON.stringify(body, null, 2));

  if (body.summary.failed > 0) {
    console.log('\n⚠️  Some migrations failed. Check the errors above.');
    process.exit(1);
  }

  console.log('\n✅ All prerequisite tables created successfully!');
  console.log('📤 Re-running all migrations...\n');

  // Now re-run the main migration script
  const { execSync } = require('child_process');
  try {
    execSync('node scripts/apply-migrations-via-lambda.cjs', { stdio: 'inherit' });
  } catch (error) {
    console.error('❌ Migration re-run failed');
    process.exit(1);
  }
});
