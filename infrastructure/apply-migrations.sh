#!/bin/bash
# Apply Database Migrations to Aurora PostgreSQL
# Reads all migration files and applies them via Lambda

set -e

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Apply Database Migrations${NC}"
echo -e "${BLUE}  Aurora PostgreSQL${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

AWS_REGION="us-east-1"
LAMBDA_FUNCTION="mentalspace-apply-migrations-to-aurora"

# Check if Lambda function exists
echo -e "${BLUE}→ Checking Lambda function...${NC}"
aws lambda get-function --function-name $LAMBDA_FUNCTION --region $AWS_REGION > /dev/null 2>&1

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ ERROR: Lambda function '$LAMBDA_FUNCTION' not found${NC}"
  echo "Make sure you deployed the apply-migrations-to-aurora function"
  exit 1
fi

echo -e "${GREEN}✅ Lambda function exists${NC}"

# Find all migration files
echo -e "${BLUE}→ Finding migration files...${NC}"
MIGRATION_DIR="../supabase/migrations"

if [ ! -d "$MIGRATION_DIR" ]; then
  echo -e "${RED}❌ ERROR: Migration directory not found: $MIGRATION_DIR${NC}"
  exit 1
fi

MIGRATION_FILES=$(ls -1 $MIGRATION_DIR/*.sql 2>/dev/null | sort)
MIGRATION_COUNT=$(echo "$MIGRATION_FILES" | wc -l)

if [ $MIGRATION_COUNT -eq 0 ]; then
  echo -e "${RED}❌ ERROR: No migration files found in $MIGRATION_DIR${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Found $MIGRATION_COUNT migration files${NC}"
echo ""

# Ask for confirmation
echo -e "${YELLOW}⚠️  This will apply $MIGRATION_COUNT migrations to Aurora PostgreSQL${NC}"
read -p "Continue? (y/n): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Cancelled."
  exit 0
fi

echo ""
echo -e "${BLUE}→ Reading migration files...${NC}"

# Create JSON payload with all migrations
echo "{\"migrations\": [" > /tmp/migrations-payload.json

FIRST=true
for MIGRATION_FILE in $MIGRATION_FILES; do
  BASENAME=$(basename "$MIGRATION_FILE")
  MIGRATION_NAME="${BASENAME%.sql}"

  # Read SQL content and escape for JSON
  SQL_CONTENT=$(cat "$MIGRATION_FILE" | jq -Rs .)

  if [ "$FIRST" = true ]; then
    FIRST=false
  else
    echo "," >> /tmp/migrations-payload.json
  fi

  echo "{\"name\": \"$BASENAME\", \"sql\": $SQL_CONTENT}" >> /tmp/migrations-payload.json
done

echo "]}" >> /tmp/migrations-payload.json

echo -e "${GREEN}✅ Prepared $MIGRATION_COUNT migrations${NC}"
echo ""

# Invoke Lambda function
echo -e "${BLUE}→ Applying migrations via Lambda...${NC}"
echo -e "${YELLOW}This may take 5-10 minutes for 143 migrations...${NC}"
echo ""

INVOKE_OUTPUT=$(aws lambda invoke \
  --function-name $LAMBDA_FUNCTION \
  --payload file:///tmp/migrations-payload.json \
  --region $AWS_REGION \
  --cli-read-timeout 600 \
  --cli-connect-timeout 600 \
  /tmp/migration-response.json 2>&1)

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ ERROR: Lambda invocation failed${NC}"
  echo "$INVOKE_OUTPUT"
  exit 1
fi

# Parse response
RESPONSE=$(cat /tmp/migration-response.json)

# Check for errors in response
if echo "$RESPONSE" | jq -e '.errorMessage' > /dev/null 2>&1; then
  echo -e "${RED}❌ Lambda function returned an error:${NC}"
  echo "$RESPONSE" | jq -r '.errorMessage'
  exit 1
fi

# Display results
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Migration Results${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

STATUS=$(echo "$RESPONSE" | jq -r '.status')
TOTAL=$(echo "$RESPONSE" | jq -r '.summary.total')
APPLIED=$(echo "$RESPONSE" | jq -r '.summary.applied')
SKIPPED=$(echo "$RESPONSE" | jq -r '.summary.skipped')
FAILED=$(echo "$RESPONSE" | jq -r '.summary.failed')

echo -e "${BLUE}Status:${NC} $STATUS"
echo -e "${BLUE}Total migrations:${NC} $TOTAL"
echo -e "${GREEN}✅ Applied:${NC} $APPLIED"
echo -e "${YELLOW}⏭️  Skipped (already applied):${NC} $SKIPPED"
echo -e "${RED}❌ Failed:${NC} $FAILED"
echo ""

if [ "$FAILED" != "0" ]; then
  echo -e "${RED}Failed migrations:${NC}"
  echo "$RESPONSE" | jq -r '.results.failed[] | "  - \(.name): \(.error)"'
  echo ""
fi

if [ "$STATUS" = "success" ]; then
  echo -e "${GREEN}🎉 All migrations applied successfully!${NC}"
elif [ "$STATUS" = "partial" ]; then
  echo -e "${YELLOW}⚠️  Some migrations failed. Check errors above.${NC}"
fi

echo ""

# Clean up
rm -f /tmp/migrations-payload.json /tmp/migration-response.json

echo -e "${BLUE}Next steps:${NC}"
echo "1. Refresh your app at http://localhost:8080"
echo "2. All database tables should now be available"
echo "3. Test creating clients, appointments, notes, etc."
echo ""
