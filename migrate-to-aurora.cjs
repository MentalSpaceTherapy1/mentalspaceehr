const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const client = new Client({
  host: 'mentalspaceehrstack-databaseb269d8bb-edwdzckxbkt7.cluster-ci16iwey2cac.us-east-1.rds.amazonaws.com',
  port: 5432,
  database: 'mentalspaceehr',
  user: 'postgres',
  password: 'ROInARVcjyQQZvqMqNgJ1835qzenNNxQ',
  ssl: {
    rejectUnauthorized: false
  }
});

async function applyMigrations() {
  try {
    await client.connect();
    console.log('✅ Connected to Aurora PostgreSQL');

    // Create migrations tracking table
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ Migrations tracking table ready');

    // Get all migration files
    const migrationsDir = path.join(__dirname, 'supabase', 'migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    console.log(`\n📁 Found ${files.length} migration files\n`);

    let applied = 0;
    let skipped = 0;
    let failed = 0;

    for (const file of files) {
      const version = file;

      // Check if already applied
      const { rows } = await client.query(
        'SELECT version FROM schema_migrations WHERE version = $1',
        [version]
      );

      if (rows.length > 0) {
        console.log(`⏭️  SKIP: ${file} (already applied)`);
        skipped++;
        continue;
      }

      // Read and apply migration
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations (version) VALUES ($1)',
          [version]
        );
        await client.query('COMMIT');
        console.log(`✅ APPLIED: ${file}`);
        applied++;
      } catch (error) {
        await client.query('ROLLBACK');
        console.error(`❌ FAILED: ${file}`);
        console.error(`   Error: ${error.message}`);
        failed++;

        // Continue with next migration instead of stopping
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Applied: ${applied}`);
    console.log(`⏭️  Skipped: ${skipped}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📊 Total: ${files.length}`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('💥 Fatal error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

applyMigrations();
