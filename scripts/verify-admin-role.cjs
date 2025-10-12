const AWS = require('aws-sdk');

const lambda = new AWS.Lambda({ region: 'us-east-1' });

const migration = {
  name: 'verify_admin_role',
  sql: `
DO $$
BEGIN
  -- Insert role if missing
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = 'f6a46bb7-8bcf-413c-a96f-54a05bf30de0'
    AND role = 'administrator'::public.app_role
  ) THEN
    INSERT INTO public.user_roles (user_id, role, assigned_at)
    VALUES ('f6a46bb7-8bcf-413c-a96f-54a05bf30de0', 'administrator'::public.app_role, NOW());
    RAISE NOTICE 'Administrator role added';
  ELSE
    RAISE NOTICE 'Administrator role already exists';
  END IF;
END $$;
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
});
