const AWS = require('aws-sdk');
const lambda = new AWS.Lambda({ region: 'us-east-1' });

const cognitoUserId = '1438f448-b021-70c9-14cb-c8c724fd34c8';

const migrations = [
  {
    name: 'create_roles_table',
    sql: `
      CREATE TABLE IF NOT EXISTS public.roles (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT
      );

      INSERT INTO public.roles (id, name, description) VALUES
        ('administrator', 'Administrator', 'Full system access'),
        ('therapist', 'Therapist', 'Licensed therapist'),
        ('supervisor', 'Supervisor', 'Clinical supervisor'),
        ('associate_trainee', 'Associate/Trainee', 'Associate or trainee clinician'),
        ('front_desk', 'Front Desk', 'Front desk staff'),
        ('billing_staff', 'Billing Staff', 'Billing personnel')
      ON CONFLICT (id) DO NOTHING;
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
  }
];

console.log('🔧 Creating roles table and fixing admin...\n');

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
    console.log('\n✅ SUCCESS! Admin profile fixed!');
    console.log('\nNow:');
    console.log('1. Refresh browser (Ctrl+Shift+R)');
    console.log('2. Clear localStorage');
    console.log('3. Log out and log back in');
    console.log('4. You should see ALL menu items!');
  }
});
