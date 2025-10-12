const https = require('https');
const fs = require('fs');
const path = require('path');

const API_ENDPOINT = 'https://xmbq984faa.execute-api.us-east-1.amazonaws.com/prod/migrate';

async function applyMigration(migrationName, migrationSQL, dryRun = false) {
  const payload = JSON.stringify({
    migrationName,
    migrationSQL,
    dryRun
  });

  return new Promise((resolve, reject) => {
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = https.request(API_ENDPOINT, options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve(result);
        } catch (error) {
          resolve({ status: 'error', message: `Parse error: ${data}` });
        }
      });
    });

    req.on('error', (error) => {
      resolve({ status: 'error', message: error.message });
    });

    req.write(payload);
    req.end();
  });
}

async function main() {
  const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  console.log(`\n📁 Found ${files.length} migration files\n`);
  console.log('='.repeat(80));

  let applied = 0;
  let skipped = 0;
  let failed = 0;

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf8');

    process.stdout.write(`${file}... `);

    const result = await applyMigration(file, sql);

    if (result.status === 'success') {
      console.log('✅ APPLIED');
      applied++;
    } else if (result.status === 'skipped') {
      console.log('⏭️  SKIPPED (already applied)');
      skipped++;
    } else {
      console.log(`❌ FAILED: ${result.message}`);
      failed++;
    }
  }

  console.log('='.repeat(80));
  console.log('\n📊 MIGRATION SUMMARY');
  console.log('='.repeat(80));
  console.log(`✅ Applied:  ${applied}`);
  console.log(`⏭️  Skipped:  ${skipped}`);
  console.log(`❌ Failed:   ${failed}`);
  console.log(`📊 Total:    ${files.length}`);
  console.log('='.repeat(80));

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
