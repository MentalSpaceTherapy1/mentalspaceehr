#!/bin/bash

# Apply All Remaining Migrations to Aurora PostgreSQL
# Run from project root: bash scripts/apply-all-migrations.sh

DB_HOST="mentalspaceehrstack-databaseb269d8bb-edwdzckxbkt7.cluster-ci16iwey2cac.us-east-1.rds.amazonaws.com"
DB_NAME="mentalspaceehr"
DB_USER="postgres"
DB_PASSWORD="ROInARVcjyQQZvqMqNgJ1835qzenNNxQ"

echo "🚀 Applying All Database Migrations"
echo "===================================="
echo ""

# Export password for psql
export PGPASSWORD="$DB_PASSWORD"

# Count total migrations
TOTAL=$(ls -1 supabase/migrations/*.sql | wc -l)
echo "📊 Total migrations found: $TOTAL"
echo ""

APPLIED=0
FAILED=0
SKIPPED=0

# Apply each migration in order
for migration_file in supabase/migrations/*.sql; do
  migration_name=$(basename "$migration_file")

  echo "📦 Applying: $migration_name"

  # Try to apply migration
  if psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -f "$migration_file" > /dev/null 2>&1; then
    echo "   ✅ SUCCESS"
    ((APPLIED++))
  else
    # Check if it failed because it already exists
    ERROR=$(psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -f "$migration_file" 2>&1)
    if [[ "$ERROR" == *"already exists"* ]] || [[ "$ERROR" == *"duplicate"* ]]; then
      echo "   ⏭️  SKIPPED (already applied)"
      ((SKIPPED++))
    else
      echo "   ❌ FAILED: $ERROR"
      ((FAILED++))
    fi
  fi

  echo ""
done

echo "===================================="
echo "📊 Migration Summary:"
echo "   ✅ Applied: $APPLIED"
echo "   ⏭️  Skipped: $SKIPPED"
echo "   ❌ Failed: $FAILED"
echo "   📊 Total: $TOTAL"
echo ""

if [ $FAILED -eq 0 ]; then
  echo "🎉 All migrations completed successfully!"
else
  echo "⚠️  Some migrations failed. Check errors above."
  exit 1
fi
