const { Client } = require('pg');
const AWS = require('aws-sdk');

const secretsManager = new AWS.SecretsManager({ region: 'us-east-1' });

async function run() {
  // Get DB credentials
  const secretResponse = await secretsManager.getSecretValue({
    SecretId: 'arn:aws:secretsmanager:us-east-1:706704660887:secret:mentalspace-ehr-db-credentials-al4fLD'
  }).promise();

  const dbCredentials = JSON.parse(secretResponse.SecretString);

  const client = new Client({
    host: dbCredentials.host,
    port: dbCredentials.port || 5432,
    database: 'mentalspaceehr',
    user: dbCredentials.username,
    password: dbCredentials.password,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  console.log('✅ Connected to database');

  // Check if user_roles table exists
  const tableCheck = await client.query(`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_roles'
  `);
  console.log('Tables check:', tableCheck.rows);

  // Check existing roles
  const existingRoles = await client.query(`
    SELECT * FROM public.user_roles WHERE user_id = 'f6a46bb7-8bcf-413c-a96f-54a05bf30de0'
  `);
  console.log('Existing roles:', existingRoles.rows);

  // Insert admin role
  try {
    const result = await client.query(`
      INSERT INTO public.user_roles (id, user_id, role, assigned_at)
      VALUES (
        gen_random_uuid(),
        'f6a46bb7-8bcf-413c-a96f-54a05bf30de0',
        'administrator',
        NOW()
      )
    `);
    console.log('✅ Admin role inserted');
  } catch (err) {
    console.log('Insert error:', err.message);
  }

  // Verify
  const finalCheck = await client.query(`
    SELECT * FROM public.user_roles WHERE user_id = 'f6a46bb7-8bcf-413c-a96f-54a05bf30de0'
  `);
  console.log('Final roles:', finalCheck.rows);

  await client.end();
}

run().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
