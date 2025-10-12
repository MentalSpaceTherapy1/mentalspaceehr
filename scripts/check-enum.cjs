const AWS = require('aws-sdk');
const lambda = new AWS.Lambda({ region: 'us-east-1' });

const migration = {
  name: 'check_app_role_enum',
  sql: "SELECT typname FROM pg_type WHERE typname = 'app_role';"
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
