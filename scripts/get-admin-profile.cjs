const AWS = require('aws-sdk');
const lambda = new AWS.Lambda({ region: 'us-east-1' });

const query = {
  name: 'get_admin_profile',
  sql: `
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

console.log('🔍 Fetching admin profile from database...\n');

lambda.invoke({
  FunctionName: 'mentalspace-apply-migrations-to-aurora',
  InvocationType: 'RequestResponse',
  Payload: JSON.stringify({ migrations: [query] })
}, (err, data) => {
  if (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }

  const response = JSON.parse(data.Payload);
  console.log('Full Response:', JSON.stringify(response, null, 2));
});
