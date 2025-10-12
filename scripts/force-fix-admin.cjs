const AWS = require('aws-sdk');
const lambda = new AWS.Lambda({ region: 'us-east-1' });

const cognitoUserId = '1438f448-b021-70c9-14cb-c8c724fd34c8';

const migration = {
  name: 'force_fix_admin_profile',
  sql: `
    -- Disable triggers temporarily
    ALTER TABLE public.profiles DISABLE TRIGGER ALL;

    -- Delete old profiles
    DELETE FROM public.profiles
    WHERE email = 'admin@mentalspaceehr.com';

    -- Insert new profile
    INSERT INTO public.profiles (
      id,
      email,
      first_name,
      last_name,
      role,
      is_active,
      account_created_date,
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
      NOW(),
      NOW()
    );

    -- Re-enable triggers
    ALTER TABLE public.profiles ENABLE TRIGGER ALL;

    -- Verify
    SELECT id, email, role FROM public.profiles WHERE email = 'admin@mentalspaceehr.com';
  `
};

console.log('🔧 Force fixing admin profile...\n');

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

  if (body.summary.failed === 0) {
    console.log('✅ SUCCESS!');
    console.log('\nNow:');
    console.log('1. Hard refresh (Ctrl+Shift+R)');
    console.log('2. Clear localStorage');
    console.log('3. Log out and back in');
  } else {
    console.log('Result:', JSON.stringify(body, null, 2));
  }
});
