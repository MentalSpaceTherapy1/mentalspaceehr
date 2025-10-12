/**
 * Apply all migrations by packaging them into a Lambda and invoking it
 * This works because Lambda runs inside the VPC and can access Aurora
 */

const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');

const lambda = new AWS.Lambda({ region: 'us-east-1' });

// Read all migration files
const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
const migrations = fs.readdirSync(migrationsDir)
  .filter(f => f.endsWith('.sql'))
  .sort()
  .map(filename => ({
    name: filename,
    sql: fs.readFileSync(path.join(migrationsDir, filename), 'utf8')
  }));

console.log(`📦 Loaded ${migrations.length} migrations`);

// Create Lambda payload with migrations
const payload = {
  migrations: migrations
};

console.log('📤 Invoking Lambda to apply migrations...');
console.log(`   Payload size: ${(JSON.stringify(payload).length / 1024).toFixed(2)} KB`);

// Invoke the apply-migrations Lambda
lambda.invoke({
  FunctionName: 'mentalspace-apply-migrations-to-aurora',
  InvocationType: 'RequestResponse',
  Payload: JSON.stringify(payload)
}, (err, data) => {
  if (err) {
    console.error('❌ Lambda invocation failed:', err);
    process.exit(1);
  }

  const response = JSON.parse(data.Payload);
  console.log('\n📊 Migration Results:');
  console.log(JSON.stringify(response, null, 2));

  if (response.statusCode === 200) {
    console.log('\n✅ All migrations applied successfully!');
  } else {
    console.log('\n❌ Some migrations failed');
    process.exit(1);
  }
});
