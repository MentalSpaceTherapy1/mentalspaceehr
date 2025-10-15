#!/bin/bash
# Apply migrations in small batches to avoid Lambda payload limits

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Apply Migrations (Batch Mode)${NC}"
echo -e "${BLUE}  10 migrations per batch${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

AWS_REGION="us-east-1"
LAMBDA_FUNCTION="mentalspace-apply-migrations-to-aurora"
MIGRATION_DIR="./supabase/migrations"
BATCH_SIZE=10

# Find all migrations
MIGRATION_FILES=($(ls -1 $MIGRATION_DIR/*.sql 2>/dev/null | sort))
TOTAL_MIGRATIONS=${#MIGRATION_FILES[@]}

if [ $TOTAL_MIGRATIONS -eq 0 ]; then
  echo -e "${RED}❌ No migration files found${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Found $TOTAL_MIGRATIONS migration files${NC}"
echo -e "${YELLOW}⚠️  Will apply in batches of $BATCH_SIZE${NC}"
echo ""

read -p "Continue? (y/n): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Cancelled."
  exit 0
fi

echo ""

TOTAL_APPLIED=0
TOTAL_SKIPPED=0
TOTAL_FAILED=0
BATCH_NUM=0

# Process in batches
for ((i=0; i<$TOTAL_MIGRATIONS; i+=BATCH_SIZE)); do
  BATCH_NUM=$((BATCH_NUM + 1))
  BATCH_FILES=("${MIGRATION_FILES[@]:i:BATCH_SIZE}")
  BATCH_COUNT=${#BATCH_FILES[@]}

  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}Batch $BATCH_NUM: Processing $BATCH_COUNT migrations${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

  # Build JSON payload
  echo "[" > /tmp/batch-payload.json
  FIRST=true

  for MIGRATION_FILE in "${BATCH_FILES[@]}"; do
    BASENAME=$(basename "$MIGRATION_FILE")
    SQL_CONTENT=$(cat "$MIGRATION_FILE" | jq -Rs .)

    if [ "$FIRST" = true ]; then
      FIRST=false
    else
      echo "," >> /tmp/batch-payload.json
    fi

    echo "{\"name\": \"$BASENAME\", \"sql\": $SQL_CONTENT}" >> /tmp/batch-payload.json
  done

  echo "]" >> /tmp/batch-payload.json

  # Create wrapper payload
  echo "{\"migrations\": $(cat /tmp/batch-payload.json)}" > /tmp/final-payload.json

  # Invoke Lambda
  echo -e "${YELLOW}→ Sending batch to Lambda...${NC}"

  aws lambda invoke \
    --function-name $LAMBDA_FUNCTION \
    --payload file:///tmp/final-payload.json \
    --region $AWS_REGION \
    --cli-read-timeout 120 \
    /tmp/batch-response.json > /dev/null 2>&1

  if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Lambda invocation failed for batch $BATCH_NUM${NC}"
    TOTAL_FAILED=$((TOTAL_FAILED + BATCH_COUNT))
    continue
  fi

  # Parse response
  RESPONSE=$(cat /tmp/batch-response.json)

  # Check for Lambda error
  if echo "$RESPONSE" | jq -e '.errorMessage' > /dev/null 2>&1; then
    echo -e "${RED}❌ Lambda error:${NC}"
    echo "$RESPONSE" | jq -r '.errorMessage'
    TOTAL_FAILED=$((TOTAL_FAILED + BATCH_COUNT))
    continue
  fi

  # Parse results
  APPLIED=$(echo "$RESPONSE" | jq -r '.summary.applied // 0')
  SKIPPED=$(echo "$RESPONSE" | jq -r '.summary.skipped // 0')
  FAILED=$(echo "$RESPONSE" | jq -r '.summary.failed // 0')

  echo -e "${GREEN}✅ Applied: $APPLIED${NC}"
  echo -e "${YELLOW}⏭️  Skipped: $SKIPPED${NC}"
  if [ "$FAILED" != "0" ]; then
    echo -e "${RED}❌ Failed: $FAILED${NC}"
  fi

  TOTAL_APPLIED=$((TOTAL_APPLIED + APPLIED))
  TOTAL_SKIPPED=$((TOTAL_SKIPPED + SKIPPED))
  TOTAL_FAILED=$((TOTAL_FAILED + FAILED))

  echo ""
done

# Final summary
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Final Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Total migrations:${NC} $TOTAL_MIGRATIONS"
echo -e "${GREEN}✅ Applied:${NC} $TOTAL_APPLIED"
echo -e "${YELLOW}⏭️  Skipped:${NC} $TOTAL_SKIPPED"
echo -e "${RED}❌ Failed:${NC} $TOTAL_FAILED"
echo ""

if [ $TOTAL_FAILED -eq 0 ]; then
  echo -e "${GREEN}🎉 All migrations completed successfully!${NC}"
else
  echo -e "${YELLOW}⚠️  Some migrations failed. You may need to apply them manually.${NC}"
fi

echo ""

# Clean up
rm -f /tmp/batch-payload.json /tmp/final-payload.json /tmp/batch-response.json
