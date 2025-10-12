const AWS = require('aws-sdk');
const lambda = new AWS.Lambda({ region: 'us-east-1' });

// Final comprehensive list of all remaining prerequisites
const migrations = [
  {
    name: '00_add_host_id_to_telehealth',
    sql: `
      ALTER TABLE public.telehealth_sessions
      ADD COLUMN IF NOT EXISTS host_id UUID REFERENCES public.profiles(id);

      CREATE INDEX IF NOT EXISTS idx_telehealth_sessions_host
      ON public.telehealth_sessions(host_id);
    `
  },
  {
    name: '01_add_priority_to_waitlist',
    sql: `
      ALTER TABLE public.appointment_waitlist
      ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 0;
    `
  },
  {
    name: '02_add_clinician_id_to_portal_forms',
    sql: `
      ALTER TABLE public.portal_form_assignments
      ADD COLUMN IF NOT EXISTS clinician_id UUID REFERENCES public.profiles(id);

      CREATE INDEX IF NOT EXISTS idx_portal_form_assignments_clinician
      ON public.portal_form_assignments(clinician_id);
    `
  },
  {
    name: '03_add_appointment_notification_settings',
    sql: `
      CREATE TABLE IF NOT EXISTS public.appointment_notification_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        practice_id UUID,
        notification_type TEXT,
        hours_before INTEGER,
        is_enabled BOOLEAN DEFAULT TRUE,
        message_template TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `
  },
  {
    name: '04_add_portal_form_template_fields',
    sql: `
      ALTER TABLE public.portal_form_templates
      ADD COLUMN IF NOT EXISTS requires_signature BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS estimated_minutes INTEGER,
      ADD COLUMN IF NOT EXISTS form_category TEXT;
    `
  },
  {
    name: '05_add_client_additional_fields',
    sql: `
      ALTER TABLE public.clients
      ADD COLUMN IF NOT EXISTS referral_source TEXT,
      ADD COLUMN IF NOT EXISTS emergency_contact_relationship TEXT,
      ADD COLUMN IF NOT EXISTS preferred_contact_method TEXT;
    `
  },
  {
    name: '06_add_appointment_additional_fields',
    sql: `
      ALTER TABLE public.appointments
      ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS recurrence_rule TEXT,
      ADD COLUMN IF NOT EXISTS parent_appointment_id UUID REFERENCES public.appointments(id);
    `
  },
  {
    name: '07_create_integration_health_logs',
    sql: `
      CREATE TABLE IF NOT EXISTS public.integration_health_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        integration_name TEXT NOT NULL,
        check_date TIMESTAMPTZ DEFAULT NOW(),
        status TEXT,
        severity TEXT,
        error_message TEXT,
        response_time_ms INTEGER,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_integration_health_logs_date
      ON public.integration_health_logs(check_date DESC);
    `
  },
  {
    name: '08_add_billing_additional_fields',
    sql: `
      ALTER TABLE public.billing_transactions
      ADD COLUMN IF NOT EXISTS payment_method TEXT,
      ADD COLUMN IF NOT EXISTS transaction_reference TEXT,
      ADD COLUMN IF NOT EXISTS reconciled BOOLEAN DEFAULT FALSE;
    `
  },
  {
    name: '09_create_clinical_note_templates',
    sql: `
      CREATE TABLE IF NOT EXISTS public.clinical_note_templates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        template_name TEXT NOT NULL,
        note_format TEXT,
        template_content JSONB,
        created_by UUID REFERENCES public.profiles(id),
        is_shared BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `
  },
  {
    name: '10_add_supervision_log_fields',
    sql: `
      CREATE TABLE IF NOT EXISTS public.supervision_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        supervision_relationship_id UUID REFERENCES public.supervision_relationships(id),
        session_date DATE NOT NULL,
        duration_minutes INTEGER,
        topics_discussed TEXT,
        notes TEXT,
        created_by UUID REFERENCES public.profiles(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `
  },
  {
    name: '11_create_insurance_verification_log',
    sql: `
      CREATE TABLE IF NOT EXISTS public.insurance_verification_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        client_id UUID REFERENCES public.clients(id),
        insurance_id UUID,
        verification_date TIMESTAMPTZ DEFAULT NOW(),
        verified_by UUID REFERENCES public.profiles(id),
        status TEXT,
        coverage_details JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_insurance_verification_client
      ON public.insurance_verification_log(client_id);
    `
  },
  {
    name: '12_add_telehealth_recording_fields',
    sql: `
      ALTER TABLE public.telehealth_sessions
      ADD COLUMN IF NOT EXISTS recording_enabled BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS recording_url TEXT,
      ADD COLUMN IF NOT EXISTS recording_consent_obtained BOOLEAN DEFAULT FALSE;
    `
  },
  {
    name: '13_create_audit_log_table',
    sql: `
      CREATE TABLE IF NOT EXISTS public.audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES public.profiles(id),
        action TEXT NOT NULL,
        table_name TEXT,
        record_id UUID,
        old_values JSONB,
        new_values JSONB,
        ip_address TEXT,
        user_agent TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id
      ON public.audit_logs(user_id);

      CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
      ON public.audit_logs(created_at DESC);

      CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record
      ON public.audit_logs(table_name, record_id);
    `
  },
  {
    name: '14_add_task_priority_and_category',
    sql: `
      ALTER TABLE public.tasks
      ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium',
      ADD COLUMN IF NOT EXISTS category TEXT,
      ADD COLUMN IF NOT EXISTS estimated_minutes INTEGER;
    `
  },
  {
    name: '15_create_compliance_rules',
    sql: `
      CREATE TABLE IF NOT EXISTS public.compliance_rules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        rule_name TEXT NOT NULL,
        rule_type TEXT,
        description TEXT,
        severity TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        check_frequency TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
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
