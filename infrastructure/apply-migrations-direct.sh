#!/bin/bash
# Apply Database Migrations Directly to Aurora PostgreSQL
# Uses psql to connect and apply migrations one by one

set -e

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Apply Database Migrations (Direct)${NC}"
echo -e "${BLUE}  Aurora PostgreSQL${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

AWS_REGION="us-east-1"
DATABASE_SECRET_ARN="arn:aws:secretsmanager:us-east-1:706704660887:secret:mentalspace-ehr-db-credentials-al4fLD"

# Get database credentials from Secrets Manager
echo -e "${BLUE}→ Getting database credentials...${NC}"
DB_SECRET=$(aws secretsmanager get-secret-value \
  --secret-id $DATABASE_SECRET_ARN \
  --region $AWS_REGION \
  --query SecretString \
  --output text)

DB_HOST=$(echo $DB_SECRET | jq -r .host)
DB_PORT=$(echo $DB_SECRET | jq -r .port)
DB_NAME=$(echo $DB_SECRET | jq -r .database)
DB_USER=$(echo $DB_SECRET | jq -r .username)
DB_PASS=$(echo $DB_SECRET | jq -r .password)

echo -e "${GREEN}✅ Database: $DB_HOST:$DB_PORT/$DB_NAME${NC}"

# Check if psql is installed
if ! command -v psql &> /dev/null; then
  echo -e "${YELLOW}→ Installing PostgreSQL client...${NC}"
  sudo yum install -y postgresql15
fi

echo -e "${GREEN}✅ PostgreSQL client ready${NC}"

# Find migration files
echo -e "${BLUE}→ Finding migration files...${NC}"
MIGRATION_DIR="./supabase/migrations"

if [ ! -d "$MIGRATION_DIR" ]; then
  echo -e "${RED}❌ ERROR: Migration directory not found: $MIGRATION_DIR${NC}"
  exit 1
fi

MIGRATION_FILES=$(ls -1 $MIGRATION_DIR/*.sql 2>/dev/null | sort)
MIGRATION_COUNT=$(echo "$MIGRATION_FILES" | grep -c ".sql" || echo "0")

if [ $MIGRATION_COUNT -eq 0 ]; then
  echo -e "${RED}❌ ERROR: No migration files found${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Found $MIGRATION_COUNT migration files${NC}"
echo ""

# Create schema_migrations table if it doesn't exist
echo -e "${BLUE}→ Creating schema_migrations table...${NC}"
PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMP DEFAULT NOW()
);" > /dev/null 2>&1

echo -e "${GREEN}✅ Schema migrations table ready${NC}"
echo ""

# Ask for confirmation
echo -e "${YELLOW}⚠️  This will apply up to $MIGRATION_COUNT migrations${NC}"
read -p "Continue? (y/n): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Cancelled."
  exit 0
fi

echo ""
echo -e "${BLUE}→ Applying migrations...${NC}"
echo ""

APPLIED=0
SKIPPED=0
FAILED=0

for MIGRATION_FILE in $MIGRATION_FILES; do
  BASENAME=$(basename "$MIGRATION_FILE")
  MIGRATION_VERSION="${BASENAME%.sql}"

  # Check if already applied
  ALREADY_APPLIED=$(PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c \
    "SELECT COUNT(*) FROM schema_migrations WHERE version = '$MIGRATION_VERSION';" 2>/dev/null | tr -d ' ')

  if [ "$ALREADY_APPLIED" = "1" ]; then
    echo -e "${YELLOW}⏭️  Skipped: $BASENAME (already applied)${NC}"
    SKIPPED=$((SKIPPED + 1))
    continue
  fi

  # Apply migration
  echo -e "${BLUE}→ Applying: $BASENAME${NC}"

  if PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f "$MIGRATION_FILE" > /dev/null 2>&1; then
    # Mark as applied
    PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c \
      "INSERT INTO schema_migrations (version) VALUES ('$MIGRATION_VERSION');" > /dev/null 2>&1

    echo -e "${GREEN}✅ Applied: $BASENAME${NC}"
    APPLIED=$((APPLIED + 1))
  else
    echo -e "${RED}❌ Failed: $BASENAME${NC}"
    FAILED=$((FAILED + 1))
  fi
done

# Summary
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Migration Results${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Total migrations:${NC} $MIGRATION_COUNT"
echo -e "${GREEN}✅ Applied:${NC} $APPLIED"
echo -e "${YELLOW}⏭️  Skipped:${NC} $SKIPPED"
echo -e "${RED}❌ Failed:${NC} $FAILED"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}🎉 All migrations completed successfully!${NC}"
else
  echo -e "${YELLOW}⚠️  Some migrations failed. Check errors above.${NC}"
fi

echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Refresh your app at http://localhost:8080"
echo "2. Test creating clients, appointments, notes"
echo ""
