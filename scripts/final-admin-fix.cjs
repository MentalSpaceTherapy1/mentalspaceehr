const AWS = require('aws-sdk');
const lambda = new AWS.Lambda({ region: 'us-east-1' });

const cognitoUserId = '1438f448-b021-70c9-14cb-c8c724fd34c8';

const migration = {
  name: 'final_admin_fix',
  sql: `
    -- Delete old admin profiles
    DELETE FROM public.profiles WHERE email = 'admin@mentalspaceehr.com';

    -- Insert with all required fields
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
};

console.log('🔧 Final admin fix...\n');

lambda.invoke({
  FunctionName: 'mentalspace-apply-migrations-to-aurora',
  InvocationType: 'RequestResponse',
  Payload: JSON.stringify({ migrations: [migration] })
}, (err, data) => {
  if (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }

  const response = JSON.parse(data.Payload);
  const body = JSON.parse(response.body);

  console.log('Result:', JSON.stringify(body, null, 2));

  if (body.summary.failed === 0) {
    console.log('\n✅ SUCCESS! Now refresh and log back in.');
  }
});
