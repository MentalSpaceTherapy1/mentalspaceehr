const AWS = require('aws-sdk');
const lambda = new AWS.Lambda({ region: 'us-east-1' });

const cognitoUserId = '1438f448-b021-70c9-14cb-c8c724fd34c8';

const migrations = [
  {
    name: 'create_user_roles_table',
    sql: `
      CREATE TABLE IF NOT EXISTS public.user_roles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        role_id TEXT NOT NULL REFERENCES public.roles(id),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, role_id)
      );

      CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON public.user_roles(role_id);
    `
  },
  {
    name: 'delete_old_admin',
    sql: `
      DELETE FROM public.profiles WHERE email = 'admin@mentalspaceehr.com';
    `
  },
  {
    name: 'insert_admin_profile',
    sql: `
      INSERT INTO public.profiles (
        id, email, first_name, last_name, role, is_active,
        account_created_date, created_at, updated_at
      ) VALUES (
        '${cognitoUserId}'::uuid,
        'admin@mentalspaceehr.com',
        'MentalSpace',
        'Admin',
        'administrator'::public.app_role,
        TRUE,
        NOW(),
        NOW(),
        NOW()
      );
    `
  },
  {
    name: 'insert_admin_user_role',
    sql: `
      INSERT INTO public.user_roles (user_id, role_id, is_active)
      VALUES ('${cognitoUserId}'::uuid, 'administrator', TRUE)
      ON CONFLICT (user_id, role_id) DO UPDATE SET is_active = TRUE;
    `
  }
];

console.log('🔧 Complete user role fix...\n');

lambda.invoke({
  FunctionName: 'mentalspace-apply-migrations-to-aurora',
  InvocationType: 'RequestResponse',
  Payload: JSON.stringify({ migrations })
}, (err, data) => {
  if (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }

  const response = JSON.parse(data.Payload);
  const body = JSON.parse(response.body);

  console.log('📊 Results:');
  console.log(`   ✅ Applied: ${body.summary.applied}`);
  console.log(`   ❌ Failed: ${body.summary.failed}`);

  if (body.results.failed && body.results.failed.length > 0) {
    console.log('\nFailures:');
    body.results.failed.forEach(f => console.log(`   - ${f.name}: ${f.error}`));
  }

  if (body.summary.failed === 0) {
    console.log('\n✅ SUCCESS! Everything is configured!');
    console.log('\nNow:');
    console.log('1. Hard refresh browser (Ctrl+Shift+R)');
    console.log('2. Clear localStorage (F12 → Application → Local Storage → Clear)');
    console.log('3. Log out and log back in');
    console.log('4. ALL MENU ITEMS SHOULD NOW APPEAR!');
  }
});
