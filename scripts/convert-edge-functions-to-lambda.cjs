const fs = require('fs');
const path = require('path');

const EDGE_FUNCTIONS_DIR = path.join(__dirname, '..', 'supabase', 'functions');
const LAMBDA_OUTPUT_DIR = path.join(__dirname, '..', 'infrastructure', 'lambda');

// Template for Lambda function
const LAMBDA_TEMPLATE = `/**
 * {{FUNCTION_NAME}} Lambda Function
 * Converted from Supabase Edge Function
 */

const { Client } = require('pg');
const AWS = require('aws-sdk');

const secretsManager = new AWS.SecretsManager({ region: process.env.AWS_REGION || 'us-east-1' });

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, x-amz-date, x-api-key, x-amz-security-token',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

let dbClient = null;

async function getDbClient() {
  if (dbClient) return dbClient;

  const secretResponse = await secretsManager.getSecretValue({
    SecretId: process.env.DATABASE_SECRET_ARN
  }).promise();

  const dbCredentials = JSON.parse(secretResponse.SecretString);

  dbClient = new Client({
    host: dbCredentials.host,
    port: dbCredentials.port || 5432,
    database: process.env.DATABASE_NAME,
    user: dbCredentials.username,
    password: dbCredentials.password,
    ssl: { rejectUnauthorized: false }
  });

  await dbClient.connect();
  return dbClient;
}

// Helper to execute database query
async function query(sql, params = []) {
  const client = await getDbClient();
  return await client.query(sql, params);
}

exports.handler = async (event) => {
  // Handle CORS preflight
  if (event.requestContext?.http?.method === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: ''
    };
  }

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const headers = event.headers || {};

    // Get user from Cognito JWT (passed by API Gateway authorizer)
    const userId = event.requestContext?.authorizer?.jwt?.claims?.sub || null;

{{FUNCTION_BODY}}

  } catch (error) {
    console.error('Lambda error:', error);
    return {
      statusCode: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    };
  }
};
`;

function convertDenoToNode(denoCode) {
  let code = denoCode;

  // Remove Deno imports
  code = code.replace(/import\s+.*from\s+['"]https:\/\/.*?['"]\s*;?\s*/g, '');

  // Convert Deno.serve to Lambda handler structure
  code = code.replace(/Deno\.serve\(async\s*\(req\)\s*=>\s*{/g, '');

  // Convert Deno.env.get to process.env
  code = code.replace(/Deno\.env\.get\(['"]([^'"]+)['"]\)/g, "process.env.$1");

  // Remove corsHeaders constant (already in template)
  code = code.replace(/const\s+corsHeaders\s*=\s*{[^}]+};?\s*/g, '');

  // Replace corsHeaders with CORS_HEADERS
  code = code.replace(/corsHeaders/g, 'CORS_HEADERS');

  // Convert OPTIONS handling (already in template)
  code = code.replace(/if\s*\(req\.method\s*===\s*['"]OPTIONS['"]\)\s*{[^}]+}/g, '');

  // Convert Response to Lambda response format
  code = code.replace(/return\s+new\s+Response\(\s*JSON\.stringify\(([^)]+)\),?\s*{([^}]+)}\s*\)/g,
    (match, bodyContent, options) => {
      // Extract status code
      const statusMatch = options.match(/status:\s*(\d+|[a-zA-Z_]+)/);
      const status = statusMatch ? statusMatch[1] : '200';

      return `return {
      statusCode: ${status},
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify(${bodyContent})
    }`;
    }
  );

  // Convert Supabase client creation to direct database queries
  code = code.replace(/const\s+supabase\s*=\s*createClient\([^)]+\);?\s*/g, '// Using direct database connection\n');

  // Convert supabase.from().select() to SQL
  code = code.replace(/await\s+supabase\.from\(['"]([^'"]+)['"]\)\.select\(([^)]+)\)/g,
    (match, table, columns) => {
      const cols = columns.replace(/['"]/g, '').trim() || '*';
      return `await query('SELECT ${cols} FROM ${table}')`;
    }
  );

  // Convert supabase.from().insert()
  code = code.replace(/await\s+supabase\.from\(['"]([^'"]+)['"]\)\.insert\(([^)]+)\)/g,
    'await query(/* INSERT INTO $1 - TODO: Convert this manually */)');

  // Convert supabase.from().update()
  code = code.replace(/await\s+supabase\.from\(['"]([^'"]+)['"]\)\.update\(([^)]+)\)/g,
    'await query(/* UPDATE $1 - TODO: Convert this manually */)');

  // Convert supabase.from().delete()
  code = code.replace(/await\s+supabase\.from\(['"]([^'"]+)['"]\)\.delete\(\)/g,
    'await query(/* DELETE FROM $1 - TODO: Convert this manually */)');

  // Remove trailing closing braces from Deno.serve
  code = code.replace(/}\s*\)\s*;?\s*$/, '');

  // Clean up extra whitespace
  code = code.trim();

  return code;
}

function convertFunction(functionName) {
  const indexPath = path.join(EDGE_FUNCTIONS_DIR, functionName, 'index.ts');

  if (!fs.existsSync(indexPath)) {
    console.log(`⏭️  SKIP: ${functionName} (no index.ts found)`);
    return false;
  }

  const denoCode = fs.readFileSync(indexPath, 'utf8');
  const convertedBody = convertDenoToNode(denoCode);

  const lambdaCode = LAMBDA_TEMPLATE
    .replace('{{FUNCTION_NAME}}', functionName)
    .replace('{{FUNCTION_BODY}}', '    ' + convertedBody.split('\n').join('\n    '));

  const outputDir = path.join(LAMBDA_OUTPUT_DIR, functionName);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(path.join(outputDir, 'index.js'), lambdaCode);

  console.log(`✅ CONVERTED: ${functionName}`);
  return true;
}

function main() {
  console.log('\n🔄 Converting Edge Functions to Lambda...\n');
  console.log('='.repeat(80));

  const functions = fs.readdirSync(EDGE_FUNCTIONS_DIR)
    .filter(name => {
      const stat = fs.statSync(path.join(EDGE_FUNCTIONS_DIR, name));
      return stat.isDirectory();
    });

  console.log(`📁 Found ${functions.length} Edge Functions\n`);

  let converted = 0;
  let skipped = 0;

  for (const functionName of functions) {
    if (convertFunction(functionName)) {
      converted++;
    } else {
      skipped++;
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('📊 CONVERSION SUMMARY');
  console.log('='.repeat(80));
  console.log(`✅ Converted: ${converted}`);
  console.log(`⏭️  Skipped:   ${skipped}`);
  console.log(`📊 Total:     ${functions.length}`);
  console.log('='.repeat(80));
  console.log('\n⚠️  NOTE: Converted functions may need manual adjustments for:');
  console.log('   - Complex Supabase queries (marked with TODO comments)');
  console.log('   - Auth logic (Cognito JWT extraction)');
  console.log('   - File uploads (use S3 SDK instead of Supabase Storage)');
  console.log('   - External API calls (Twilio, OpenAI, etc.)');
}

main();
