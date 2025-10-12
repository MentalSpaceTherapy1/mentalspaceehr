const AWS = require('aws-sdk');
const lambda = new AWS.Lambda({ region: 'us-east-1' });

const cognitoUserId = '1438f448-b021-70c9-14cb-c8c724fd34c8';

const migrations = [
  {
    name: 'drop_existing_user_roles',
    sql: `
      DROP TABLE IF EXISTS public.user_roles CASCADE;
    `
  },
  {
    name: 'create_user_roles_fresh',
    sql: `
      CREATE TABLE public.user_roles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        role_id TEXT NOT NULL REFERENCES public.roles(id),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, role_id)
      );
    `
  },
  {
    name: 'delete_old_admin',
    sql: `DELETE FROM public.profiles WHERE email = 'admin@mentalspaceehr.com';`
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
      VALUES ('${cognitoUserId}'::uuid, 'administrator', TRUE);
    `
  }
];

console.log('🔧 Dropping and recreating tables...\n');

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
    console.log('\n🎉 SUCCESS! Everything fixed!');
    console.log('\nFinal steps:');
    console.log('1. Refresh browser');
    console.log('2. Log out and back in');
    console.log('3. You should see ALL menu items!');
  }
});
