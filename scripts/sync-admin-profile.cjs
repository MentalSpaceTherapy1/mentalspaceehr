const AWS = require('aws-sdk');
const lambda = new AWS.Lambda({ region: 'us-east-1' });

// Cognito user ID for admin@mentalspaceehr.com
const cognitoUserId = '1438f448-b021-70c9-14cb-c8c724fd34c8';

const migration = {
  name: 'sync_admin_profile_with_cognito',
  sql: `
    DO $$
    DECLARE
      profile_exists BOOLEAN;
    BEGIN
      -- Check if profile exists with this Cognito ID
      SELECT EXISTS(
        SELECT 1 FROM public.profiles WHERE id = '${cognitoUserId}'
      ) INTO profile_exists;

      IF profile_exists THEN
        -- Update existing profile
        UPDATE public.profiles
        SET
          email = 'admin@mentalspaceehr.com',
          role = 'administrator',
          first_name = 'MentalSpace',
          last_name = 'Admin',
          is_active = TRUE,
          updated_at = NOW()
        WHERE id = '${cognitoUserId}';

        RAISE NOTICE 'Updated existing profile with Cognito ID';
      ELSE
        -- Create new profile or update by email
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
        ON CONFLICT (email)
        DO UPDATE SET
          id = '${cognitoUserId}',
          role = 'administrator',
          first_name = 'MentalSpace',
          last_name = 'Admin',
          is_active = TRUE,
          updated_at = NOW();

        RAISE NOTICE 'Created/updated profile with Cognito ID';
      END IF;
    END $$;

    -- Verify the result
    SELECT
      id,
      email,
      role,
      first_name,
      last_name,
      is_active
    FROM public.profiles
    WHERE id = '${cognitoUserId}' OR email = 'admin@mentalspaceehr.com';
  `
};

console.log('🔄 Syncing admin profile with Cognito ID...\n');
console.log('Cognito User ID:', cognitoUserId);
console.log('');

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

  console.log('✅ Result:', body.status);

  if (body.summary) {
    console.log(`   Applied: ${body.summary.applied}`);
    console.log(`   Failed: ${body.summary.failed}`);
  }

  console.log('\n✅ Admin profile synced!');
  console.log('\nNext steps:');
  console.log('1. Clear browser cache and localStorage');
  console.log('2. Log out and log back in');
  console.log('3. The sidebar should now show all menu items');
});
