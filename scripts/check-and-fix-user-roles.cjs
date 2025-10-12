const AWS = require('aws-sdk');
const lambda = new AWS.Lambda({ region: 'us-east-1' });

// Query to check and fix admin user roles
const queries = [
  {
    name: 'check_admin_profile',
    sql: `
      SELECT
        p.id,
        p.email,
        p.first_name,
        p.last_name,
        p.role,
        p.created_at
      FROM public.profiles p
      WHERE p.email = 'admin@mentalspaceehr.com';
    `
  },
  {
    name: 'ensure_admin_role',
    sql: `
      UPDATE public.profiles
      SET role = 'administrator'
      WHERE email = 'admin@mentalspaceehr.com'
      AND (role IS NULL OR role != 'administrator');
    `
  },
  {
    name: 'verify_admin_after_update',
    sql: `
      SELECT
        p.id,
        p.email,
        p.role,
        p.is_active
      FROM public.profiles p
      WHERE p.email = 'admin@mentalspaceehr.com';
    `
  },
  {
    name: 'check_role_enum_values',
    sql: `
      SELECT enumlabel
      FROM pg_enum
      WHERE enumtypid = 'public.app_role'::regtype
      ORDER BY enumsortorder;
    `
  }
];

console.log('🔍 Checking admin user roles...\n');

async function runQuery(query) {
  return new Promise((resolve, reject) => {
    lambda.invoke({
      FunctionName: 'mentalspace-apply-migrations-to-aurora',
      InvocationType: 'RequestResponse',
      Payload: JSON.stringify({
        migrations: [{
          name: query.name,
          sql: query.sql
        }]
      })
    }, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(JSON.parse(data.Payload));
      }
    });
  });
}

async function main() {
  for (const query of queries) {
    console.log(`📊 Running: ${query.name}...`);
    const result = await runQuery(query);
    const body = JSON.parse(result.body);

    if (body.results) {
      console.log(JSON.stringify(body.results, null, 2));
    }
    console.log('');
  }
}

main().catch(console.error);
