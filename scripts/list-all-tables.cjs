const AWS = require('aws-sdk');
const lambda = new AWS.Lambda({ region: 'us-east-1' });

const migration = {
  name: 'list_all_tables',
  sql: `
    -- List all tables in public schema
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename;
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
