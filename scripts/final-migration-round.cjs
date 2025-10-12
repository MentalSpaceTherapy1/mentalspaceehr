const AWS = require('aws-sdk');
const lambda = new AWS.Lambda({ region: 'us-east-1' });

const migrations = [
  {
    name: '00_add_missing_profiles_columns',
    sql: `
      ALTER TABLE public.profiles
      ADD COLUMN IF NOT EXISTS npi_number TEXT,
      ADD COLUMN IF NOT EXISTS license_number TEXT,
      ADD COLUMN IF NOT EXISTS license_state TEXT;
    `
  },
  {
    name: '01_add_appointment_notification_columns',
    sql: `
      ALTER TABLE public.appointment_notification_settings
      ADD COLUMN IF NOT EXISTS hours_before INTEGER DEFAULT 24;
    `
  },
  {
    name: '02_create_appointment_change_logs',
    sql: `
      CREATE TABLE IF NOT EXISTS public.appointment_change_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        appointment_id UUID REFERENCES public.appointments(id) ON DELETE CASCADE,
        changed_by UUID REFERENCES public.profiles(id),
        change_type TEXT,
        old_value TEXT,
        new_value TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `
  },
  {
    name: '03_create_appointment_waitlist',
    sql: `
      CREATE TABLE IF NOT EXISTS public.appointment_waitlist (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
        therapist_id UUID REFERENCES public.profiles(id),
        preferred_date DATE,
        preferred_time TIME,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `
  },
  {
    name: '04_add_enum_note_formats',
    sql: `
      DO $$
      BEGIN
        -- Create note_format enum if doesn't exist
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'note_format') THEN
          CREATE TYPE public.note_format AS ENUM ('SOAP', 'DAP', 'BIRP', 'GIRP');
        END IF;
      END $$;
    `
  },
  {
    name: '05_add_client_insurance_columns',
    sql: `
      ALTER TABLE public.client_insurance
      ADD COLUMN IF NOT EXISTS insurance_company_id UUID;
    `
  },
  {
    name: '06_add_telehealth_columns',
    sql: `
      ALTER TABLE public.telehealth_sessions
      ADD COLUMN IF NOT EXISTS clinician_id UUID REFERENCES public.profiles(id);
    `
  },
  {
    name: '07_create_portal_form_tables',
    sql: `
      CREATE TABLE IF NOT EXISTS public.portal_form_templates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        form_name TEXT NOT NULL,
        form_content JSONB,
        requires_signature BOOLEAN DEFAULT FALSE,
        estimated_minutes INTEGER,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS public.portal_form_responses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        template_id UUID REFERENCES public.portal_form_templates(id),
        client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
        response_data JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS public.portal_form_assignments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        template_id UUID REFERENCES public.portal_form_templates(id),
        client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
        assigned_by UUID REFERENCES public.profiles(id),
        due_date TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `
  },
  {
    name: '08_create_document_templates',
    sql: `
      CREATE TABLE IF NOT EXISTS public.document_templates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        template_name TEXT NOT NULL,
        template_content TEXT,
        template_type TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `
  },
  {
    name: '09_create_clinical_assessments',
    sql: `
      CREATE TABLE IF NOT EXISTS public.clinical_assessments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
        therapist_id UUID REFERENCES public.profiles(id),
        assessment_type TEXT,
        assessment_data JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `
  },
  {
    name: '10_create_client_resources',
    sql: `
      CREATE TABLE IF NOT EXISTS public.client_resource_assignments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
        resource_name TEXT,
        resource_url TEXT,
        assigned_by UUID REFERENCES public.profiles(id),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `
  },
  {
    name: '11_add_audit_log_columns',
    sql: `
      ALTER TABLE public.audit_logs
      ADD COLUMN IF NOT EXISTS action_type TEXT;
    `
  },
  {
    name: '12_create_reminder_logs',
    sql: `
      CREATE TABLE IF NOT EXISTS public.reminder_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        appointment_id UUID REFERENCES public.appointments(id),
        reminder_type TEXT,
        sent_at TIMESTAMPTZ DEFAULT NOW(),
        status TEXT
      );
    `
  },
  {
    name: '13_create_ai_note_settings',
    sql: `
      CREATE TABLE IF NOT EXISTS public.ai_note_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES public.profiles(id),
        ai_enabled BOOLEAN DEFAULT FALSE,
        ai_model TEXT,
        settings JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `
  }
];

console.log(`🚀 Applying ${migrations.length} final prerequisite migrations...`);

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

  console.log(`\n✅ Final round complete!`);
});
