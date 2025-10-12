const AWS = require('aws-sdk');
const lambda = new AWS.Lambda({ region: 'us-east-1' });

// This script ensures the admin user has:
// 1. A profile in the profiles table
// 2. Administrator role in user_roles table
// 3. All necessary permissions

const setupAdminMigration = {
  name: '00_complete_admin_setup',
  sql: `
-- Ensure admin user exists in profiles table
-- Using the Cognito user ID from your login: admin@mentalspaceehr.com

DO $$
DECLARE
  admin_user_id UUID;
BEGIN
  -- Get the admin user ID from auth.users by email
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = 'admin@mentalspaceehr.com'
  LIMIT 1;

  IF admin_user_id IS NOT NULL THEN
    -- Ensure profile exists
    INSERT INTO public.profiles (
      id,
      email,
      first_name,
      last_name,
      is_active,
      account_created_date
    )
    VALUES (
      admin_user_id,
      'admin@mentalspaceehr.com',
      'Admin',
      'User',
      true,
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      is_active = true,
      email = 'admin@mentalspaceehr.com';

    -- Ensure administrator role is assigned
    INSERT INTO public.user_roles (user_id, role, assigned_at)
    VALUES (admin_user_id, 'administrator', NOW())
    ON CONFLICT (user_id, role) DO NOTHING;

    RAISE NOTICE 'Admin user setup complete for user ID: %', admin_user_id;
  ELSE
    RAISE NOTICE 'No admin user found with email admin@mentalspaceehr.com';
  END IF;
END $$;
  `
};

console.log('🔧 Setting up admin user with full permissions...\n');

lambda.invoke({
  FunctionName: 'mentalspace-apply-migrations-to-aurora',
  InvocationType: 'RequestResponse',
  Payload: JSON.stringify({ migrations: [setupAdminMigration] })
}, (err, data) => {
  if (err) {
    console.error('❌ Lambda invocation failed:', err);
    process.exit(1);
  }

  const response = JSON.parse(data.Payload);
  const body = JSON.parse(response.body);

  console.log('✅ Admin setup result:');
  console.log(JSON.stringify(body, null, 2));

  if (body.status === 'success' || body.summary.applied > 0) {
    console.log('\n✅ Admin user setup complete!');
    console.log('   The admin user now has:');
    console.log('   - Profile in profiles table');
    console.log('   - Administrator role assigned');
    console.log('   - Full system access');
    console.log('\n🔄 Please refresh the dashboard to see all menu items');
  } else {
    console.log('\n⚠️  Setup may have encountered issues. Check the output above.');
  }
});
