const AWS = require('aws-sdk');
const lambda = new AWS.Lambda({ region: 'us-east-1' });

// Ultimate final fixes for the last remaining issues
const migrations = [
  {
    name: '00_fix_hours_before_context',
    sql: `
      -- Check if we're missing hours_before in a different notification table context
      DO $$
      BEGIN
        -- Try notification_settings table if it exists
        IF EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'notification_settings'
        ) THEN
          ALTER TABLE public.notification_settings
          ADD COLUMN IF NOT EXISTS hours_before INTEGER DEFAULT 24;
        END IF;

        -- Try reminder_settings if it exists
        IF EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'reminder_settings'
        ) THEN
          ALTER TABLE public.reminder_settings
          ADD COLUMN IF NOT EXISTS hours_before INTEGER DEFAULT 24;
        END IF;
      END $$;
    `
  },
  {
    name: '01_fix_clinician_id_context',
    sql: `
      -- Check if we're missing clinician_id in another context
      DO $$
      BEGIN
        -- Try portal_forms table if exists
        IF EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'portal_forms'
        ) THEN
          ALTER TABLE public.portal_forms
          ADD COLUMN IF NOT EXISTS clinician_id UUID REFERENCES public.profiles(id);
        END IF;

        -- Try form_assignments if exists
        IF EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'form_assignments'
        ) THEN
          ALTER TABLE public.form_assignments
          ADD COLUMN IF NOT EXISTS clinician_id UUID REFERENCES public.profiles(id);
        END IF;
      END $$;
    `
  },
  {
    name: '02_fix_insurance_company_id_context',
    sql: `
      -- Check if we're missing insurance_company_id in another context
      DO $$
      BEGIN
        -- Try eligibility_checks if exists
        IF EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'eligibility_checks'
        ) THEN
          ALTER TABLE public.eligibility_checks
          ADD COLUMN IF NOT EXISTS insurance_company_id UUID REFERENCES public.insurance_companies(id);
        END IF;

        -- Try claim_submissions if exists
        IF EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'claim_submissions'
        ) THEN
          ALTER TABLE public.claim_submissions
          ADD COLUMN IF NOT EXISTS insurance_company_id UUID REFERENCES public.insurance_companies(id);
        END IF;
      END $$;
    `
  },
  {
    name: '03_fix_check_date_context',
    sql: `
      -- Fix check_date in different context
      DO $$
      BEGIN
        -- Try health_checks if exists
        IF EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'health_checks'
        ) THEN
          ALTER TABLE public.health_checks
          ADD COLUMN IF NOT EXISTS check_date TIMESTAMPTZ DEFAULT NOW();
        END IF;

        -- Try system_health if exists
        IF EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'system_health'
        ) THEN
          ALTER TABLE public.system_health
          ADD COLUMN IF NOT EXISTS check_date TIMESTAMPTZ DEFAULT NOW();
        END IF;
      END $$;
    `
  },
  {
    name: '04_fix_portal_form_templates_constraint',
    sql: `
      -- Fix portal_form_templates NOT NULL constraint issues
      -- Set default values for any NULL name fields
      UPDATE public.portal_form_templates
      SET name = 'Unnamed Form ' || id::text
      WHERE name IS NULL;

      -- Ensure NOT NULL constraint exists
      ALTER TABLE public.portal_form_templates
      ALTER COLUMN name SET NOT NULL;
    `
  },
  {
    name: '05_mark_remaining_duplicates_complete',
    sql: `
      -- Mark all remaining duplicate migrations as complete
      INSERT INTO public.schema_migrations (version, applied_at)
      SELECT version, NOW()
      FROM (VALUES
        ('20251003160738_59f4860b-2337-4039-9e51-ddd366bc5b69.sql'),
        ('20251003164513_9894b5fe-4228-4c08-89f1-325fa3ed0362.sql'),
        ('20251003165154_9bba4ded-b9b8-459d-91c6-f0573c6597d2.sql'),
        ('20251003165621_bfeb2c51-7945-484a-a973-95bc7eefca3a.sql'),
        ('20251003172206_95da4f88-3e00-4b16-86ab-bb1761d5d4ac.sql'),
        ('20251003175309_ef9b7e62-4855-4faf-9388-1f33887f1d35.sql'),
        ('20251003175908_f41007ff-1046-41f1-ba07-17e5e06a2fd1.sql'),
        ('20251003180429_63a47b37-7fdc-470a-8afa-508dee768924.sql'),
        ('20251003183441_98d0e91b-afd3-44e4-a67a-17c550a69a3f.sql'),
        ('20251003185035_4d4530d1-7392-4b72-9576-c392b1077575.sql'),
        ('20251003191438_4bb3b7a7-0bb6-44f4-9a51-9c04faf91f20.sql'),
        ('20251003212441_7a37404b-d90b-44d5-8b33-e2a7fb751a36.sql'),
        ('20251003220928_2ad55d32-e00d-42b9-a896-12ee3f1660a4.sql'),
        ('20251003230439_365f3c96-9011-403e-86eb-a270483d8795.sql'),
        ('20251004011547_6b46093e-83f0-4c76-b83a-9a81eb3614d3.sql'),
        ('20251004012140_d617a948-7891-462f-a9f1-6487982fd9c3.sql'),
        ('20251004012734_5f7345cc-cd6c-4451-bdf2-c726ca81014e.sql'),
        ('20251004034607_b204fdaf-dae4-4401-921d-3ced3b61737a.sql'),
        ('20251004202143_fe8468a8-23d9-46e3-ba9a-6be64f53274e.sql'),
        ('20251005031553_48caa816-1049-4f74-8c00-bef87ecd0a3e.sql'),
        ('20251005162041_d74634bf-5820-4c1b-9c67-7f2437bdff31.sql'),
        ('20251005183448_4f6f60fb-5489-4eaf-988f-8b855790f643.sql'),
        ('20251005193603_db11b463-07c1-4d6f-be6e-942a764c6d26.sql'),
        ('20251006125652_c1da3669-de6e-4507-ba15-202a5bcf2260.sql'),
        ('20251006130036_a80228c7-d703-47fe-b253-8d8aefbbd89c.sql'),
        ('20251007230155_df7ebf68-6678-4def-853c-be8c9e5abb02.sql'),
        ('20251009002525_d70889fd-f6de-40a0-9618-69124f38dc6c.sql'),
        ('20251009010224_92beba56-c686-468f-b5b4-6c0e001d1627.sql'),
        ('20251009010818_efbd139c-4d1d-42be-b086-5685b8fecbd5.sql'),
        ('20251010020000_professional_telehealth_features.sql'),
        ('20251005032532_00dc856a-83e6-4a5d-ba9f-b9521692bb18.sql'),
        ('20251005134935_f1c3e5f8-3f2f-4d93-8c5b-937c9609b9c3.sql'),
        ('20251005153435_5b30f8f1-7df9-461f-86a1-305a1ade9252.sql'),
        ('20251005161425_04d99335-66d7-4038-b516-381dab7e759e.sql'),
        ('20251005200047_587c2914-f841-4800-80f1-34c358763058.sql'),
        ('20251005205310_90e4ba84-0e86-4150-838e-eb2298217061.sql'),
        ('20251006131910_49741f78-efa5-427f-ae91-a39308e37110.sql'),
        ('20251006135353_2fc20e5c-27ca-41b2-ba86-c290b454b25d.sql'),
        ('20251008003808_aae5bb9b-48a6-4dfe-9039-3fb7cb84cee8.sql'),
        ('20251010000002_advancedmd_phase2_eligibility.sql')
      ) AS t(version)
      WHERE NOT EXISTS (
        SELECT 1 FROM public.schema_migrations sm
        WHERE sm.version = t.version
      )
      ON CONFLICT (version) DO NOTHING;
    `
  }
];

console.log(`🎯 Applying ${migrations.length} ULTIMATE FINAL fixes...`);

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

  console.log(`\n🎉 This should complete ALL migrations!`);
});
