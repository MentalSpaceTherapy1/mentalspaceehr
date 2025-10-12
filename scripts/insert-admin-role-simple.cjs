const AWS = require('aws-sdk');
const lambda = new AWS.Lambda({ region: 'us-east-1' });

const migration = {
  name: 'insert_admin_role_simple',
  sql: `
    -- Delete any existing admin role first (in case of duplicates)
    DELETE FROM public.user_roles
    WHERE user_id = 'f6a46bb7-8bcf-413c-a96f-54a05bf30de0';

    -- Insert administrator role
    INSERT INTO public.user_roles (id, user_id, role, assigned_at)
    VALUES (
      'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'::uuid,
      'f6a46bb7-8bcf-413c-a96f-54a05bf30de0'::uuid,
      'administrator',
      NOW()
    );

    -- Verify
    SELECT * FROM public.user_roles WHERE user_id = 'f6a46bb7-8bcf-413c-a96f-54a05bf30de0';
  `
};

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
  console.log('Result:', JSON.stringify(response, null, 2));
});
