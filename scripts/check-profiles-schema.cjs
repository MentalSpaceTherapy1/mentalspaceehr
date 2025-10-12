const AWS = require('aws-sdk');
const lambda = new AWS.Lambda({ region: 'us-east-1' });

const migration = {
  name: 'check_profiles_schema',
  sql: `
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles'
    ORDER BY ordinal_position;
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
