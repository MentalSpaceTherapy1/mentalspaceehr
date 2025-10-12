const AWS = require('aws-sdk');
const lambda = new AWS.Lambda({ region: 'us-east-1' });

const cognitoUserId = '1438f448-b021-70c9-14cb-c8c724fd34c8';

const migrations = [
  {
    name: 'delete_old_admin_profile',
    sql: `
      DELETE FROM public.profiles
      WHERE email = 'admin@mentalspaceehr.com'
      AND id != '${cognitoUserId}';
    `
  },
  {
    name: 'insert_admin_profile',
    sql: `
      INSERT INTO public.profiles (
        id,
        email,
        role,
        first_name,
        last_name,
        is_active,
        created_at,
        updated_at
      ) VALUES (
        '${cognitoUserId}',
        'admin@mentalspaceehr.com',
        'administrator',
        'MentalSpace',
        'Admin',
        TRUE,
        NOW(),
        NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        email = 'admin@mentalspaceehr.com',
        role = 'administrator',
        is_active = TRUE,
        updated_at = NOW();
    `
  }
];

console.log('🔄 Upserting admin profile...\n');

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

  console.log('Result:', JSON.stringify(body, null, 2));

  console.log('\n✅ Done! Now:');
  console.log('1. Refresh browser (Ctrl+Shift+R)');
  console.log('2. Log out and log back in');
});
