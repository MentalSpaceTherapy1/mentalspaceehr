const AWS = require('aws-sdk');
const lambda = new AWS.Lambda({ region: 'us-east-1' });

const cognitoUserId = '1438f448-b021-70c9-14cb-c8c724fd34c8';

const migrations = [
  {
    name: 'create_auth_schema_if_needed',
    sql: `
      CREATE SCHEMA IF NOT EXISTS auth;

      CREATE TABLE IF NOT EXISTS auth.users (
        id UUID PRIMARY KEY,
        email TEXT UNIQUE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `
  },
  {
    name: 'insert_auth_user',
    sql: `
      INSERT INTO auth.users (id, email, created_at)
      VALUES ('${cognitoUserId}', 'admin@mentalspaceehr.com', NOW())
      ON CONFLICT (id) DO UPDATE SET email = 'admin@mentalspaceehr.com';
    `
  },
  {
    name: 'delete_old_admin_profiles',
    sql: `
      DELETE FROM public.profiles
      WHERE email = 'admin@mentalspaceehr.com'
      AND id != '${cognitoUserId}';
    `
  },
  {
    name: 'upsert_admin_profile',
    sql: `
      INSERT INTO public.profiles (
        id,
        email,
        first_name,
        last_name,
        role,
        is_active,
        created_at,
        updated_at
      ) VALUES (
        '${cognitoUserId}',
        'admin@mentalspaceehr.com',
        'MentalSpace',
        'Admin',
        'administrator',
        TRUE,
        NOW(),
        NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        email = 'admin@mentalspaceehr.com',
        role = 'administrator',
        first_name = 'MentalSpace',
        last_name = 'Admin',
        is_active = TRUE,
        updated_at = NOW();
    `
  }
];

console.log('🔧 Fixing admin profile completely...\n');
console.log('Cognito User ID:', cognitoUserId, '\n');

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
  console.log(`   ⏭️  Skipped: ${body.summary.skipped}`);
  console.log(`   ❌ Failed: ${body.summary.failed}`);

  if (body.results.failed && body.results.failed.length > 0) {
    console.log('\n❌ Failures:');
    body.results.failed.forEach(f => {
      console.log(`   - ${f.name}: ${f.error}`);
    });
  }

  if (body.summary.failed === 0) {
    console.log('\n✅ SUCCESS! Admin profile is now properly configured!');
    console.log('\nNext steps:');
    console.log('1. Hard refresh browser (Ctrl+Shift+R)');
    console.log('2. Clear localStorage (F12 → Application → Local Storage → Clear)');
    console.log('3. Log out and log back in with admin@mentalspaceehr.com');
    console.log('4. You should now see ALL menu items in the sidebar!');
  } else {
    console.log('\n⚠️  Some steps failed. Check errors above.');
  }
});
