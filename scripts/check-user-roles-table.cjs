const AWS = require('aws-sdk');
const lambda = new AWS.Lambda({ region: 'us-east-1' });

const migration = {
  name: 'check_user_roles_table',
  sql: `
    -- Check if table exists
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_roles';

    -- Check table structure
    SELECT column_name, data_type FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_roles';

    -- Check all rows
    SELECT * FROM public.user_roles LIMIT 10;
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
