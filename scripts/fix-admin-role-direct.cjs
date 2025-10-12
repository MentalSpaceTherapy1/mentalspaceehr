const AWS = require('aws-sdk');
const lambda = new AWS.Lambda({ region: 'us-east-1' });

// Direct SQL to update admin role
const migration = {
  name: 'fix_admin_role_direct',
  sql: `
    -- First, check current state
    DO $$
    DECLARE
      admin_profile RECORD;
    BEGIN
      -- Find the admin user profile
      SELECT * INTO admin_profile
      FROM public.profiles
      WHERE email = 'admin@mentalspaceehr.com'
      LIMIT 1;

      IF FOUND THEN
        RAISE NOTICE 'Found admin profile: id=%, email=%, current_role=%',
          admin_profile.id, admin_profile.email, admin_profile.role;

        -- Update to administrator role
        UPDATE public.profiles
        SET role = 'administrator',
            is_active = TRUE,
            updated_at = NOW()
        WHERE id = admin_profile.id;

        RAISE NOTICE 'Updated admin role to administrator';
      ELSE
        RAISE NOTICE 'Admin profile not found!';
      END IF;
    END $$;

    -- Verify the update
    SELECT
      id,
      email,
      first_name,
      last_name,
      role,
      is_active,
      created_at
    FROM public.profiles
    WHERE email = 'admin@mentalspaceehr.com';
  `
};

console.log('🔧 Fixing admin role directly...\n');

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
  console.log('Response:', JSON.stringify(response, null, 2));

  const body = JSON.parse(response.body);
  console.log('\n📊 Result:');
  console.log(JSON.stringify(body, null, 2));

  console.log('\n✅ Admin role update complete!');
  console.log('\nNext steps:');
  console.log('1. Clear browser cache and localStorage');
  console.log('2. Log out and log back in');
  console.log('3. The sidebar should now show all menu items');
});
