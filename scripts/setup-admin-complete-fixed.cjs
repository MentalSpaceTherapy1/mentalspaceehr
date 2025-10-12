const AWS = require('aws-sdk');
const lambda = new AWS.Lambda({ region: 'us-east-1' });

const migration = {
  name: 'setup_admin_complete_fixed',
  sql: `
    -- Step 1: Ensure profile exists for admin user
    INSERT INTO public.profiles (
      id, email, first_name, last_name, is_active, account_created_date
    )
    VALUES (
      'f6a46bb7-8bcf-413c-a96f-54a05bf30de0'::uuid,
      'admin@mentalspaceehr.com',
      'Admin',
      'User',
      true,
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      is_active = true;

    -- Step 2: Insert administrator role (delete first to avoid conflicts)
    DELETE FROM public.user_roles WHERE user_id = 'f6a46bb7-8bcf-413c-a96f-54a05bf30de0'::uuid;

    INSERT INTO public.user_roles (id, user_id, role, assigned_at)
    VALUES (
      gen_random_uuid(),
      'f6a46bb7-8bcf-413c-a96f-54a05bf30de0'::uuid,
      'administrator'::public.app_role,
      NOW()
    );

    -- Step 3: Verify the setup
    SELECT
      p.id,
      p.email,
      p.first_name,
      p.last_name,
      ur.role
    FROM public.profiles p
    LEFT JOIN public.user_roles ur ON p.id = ur.user_id
    WHERE p.id = 'f6a46bb7-8bcf-413c-a96f-54a05bf30de0'::uuid;
  `
};

lambda.invoke({
  FunctionName: 'mentalspace-apply-migrations-to-aurora',
  InvocationType: 'RequestResponse',
  Payload: JSON.stringify({ migrations: [migration] })
}, (err, data) => {
  if (err) {
    console.error('❌ Lambda invocation failed:', err);
    process.exit(1);
  }

  const response = JSON.parse(data.Payload);
  console.log('📊 Result:', JSON.stringify(response, null, 2));

  if (response.statusCode === 200) {
    console.log('✅ Admin user setup complete!');
  } else {
    console.log('❌ Setup failed');
  }
});
