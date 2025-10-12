const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');

const lambda = new AWS.Lambda({ region: 'us-east-1' });

// Migrations that need the supervision_relationships table created first
const fixMigrations = [
  {
    name: '00_create_supervision_relationships',
    sql: `
CREATE TABLE IF NOT EXISTS public.supervision_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supervisor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  supervisee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(supervisor_id, supervisee_id, start_date)
);

CREATE INDEX IF NOT EXISTS idx_supervision_supervisor ON public.supervision_relationships(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_supervision_supervisee ON public.supervision_relationships(supervisee_id);
CREATE INDEX IF NOT EXISTS idx_supervision_status ON public.supervision_relationships(status);

ALTER TABLE public.supervision_relationships ENABLE ROW LEVEL SECURITY;
    `
  },
  {
    name: '01_create_emergency_contacts',
    sql: `
CREATE TABLE IF NOT EXISTS public.emergency_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  relationship TEXT,
  phone_number TEXT,
  email TEXT,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_emergency_contacts_client ON public.emergency_contacts(client_id);
    `
  },
  {
    name: '02_add_missing_client_columns',
    sql: `
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS primary_therapist_id UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS portal_user_id UUID REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_clients_therapist ON public.clients(primary_therapist_id);
CREATE INDEX IF NOT EXISTS idx_clients_portal_user ON public.clients(portal_user_id);
    `
  },
  {
    name: '03_update_app_role_enum',
    sql: `
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'therapist' AND enumtypid = 'app_role'::regtype) THEN
    ALTER TYPE app_role ADD VALUE 'therapist';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'front_desk' AND enumtypid = 'app_role'::regtype) THEN
    ALTER TYPE app_role ADD VALUE 'front_desk';
  END IF;
END $$;
    `
  }
];

const payload = { migrations: fixMigrations };

console.log('Applying prerequisite migrations...');

lambda.invoke({
  FunctionName: 'mentalspace-apply-migrations-to-aurora',
  InvocationType: 'RequestResponse',
  Payload: JSON.stringify(payload)
}, (err, data) => {
  if (err) {
    console.error('Failed:', err);
    process.exit(1);
  }

  const response = JSON.parse(data.Payload);
  console.log(JSON.stringify(JSON.parse(response.body), null, 2));

  if (response.statusCode === 200) {
    console.log('\n✅ Prerequisites applied. Re-running main migrations...');

    // Now re-run the main migration script
    const { execSync } = require('child_process');
    execSync('node scripts/apply-migrations-via-lambda.cjs', { stdio: 'inherit' });
  }
});
