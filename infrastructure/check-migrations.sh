#!/bin/bash
# Check which migrations have been applied to Aurora PostgreSQL

AWS_REGION="us-east-1"
DATABASE_SECRET_ARN="arn:aws:secretsmanager:us-east-1:706704660887:secret:mentalspace-ehr-db-credentials-al4fLD"

echo "Getting database credentials..."
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

echo "Database: $DB_HOST:$DB_PORT/$DB_NAME"
echo ""

# Check if psql is installed
if ! command -v psql &> /dev/null; then
  echo "Installing PostgreSQL client..."
  sudo yum install -y postgresql15 > /dev/null 2>&1
fi

# Check if schema_migrations table exists
echo "Checking for schema_migrations table..."
TABLE_EXISTS=$(PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c \
  "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'schema_migrations');" 2>/dev/null | tr -d ' ')

if [ "$TABLE_EXISTS" = "t" ]; then
  echo "✅ schema_migrations table exists"
  echo ""

  # Count applied migrations
  APPLIED_COUNT=$(PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c \
    "SELECT COUNT(*) FROM schema_migrations;" 2>/dev/null | tr -d ' ')

  echo "Applied migrations: $APPLIED_COUNT"
  echo ""

  if [ "$APPLIED_COUNT" -gt "0" ]; then
    echo "Last 10 applied migrations:"
    PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c \
      "SELECT version, applied_at FROM schema_migrations ORDER BY applied_at DESC LIMIT 10;"
  fi
else
  echo "❌ schema_migrations table does NOT exist"
  echo "This means NO migrations have been applied yet."
fi

echo ""
echo "Total migration files available:"
ls -1 supabase/migrations/*.sql 2>/dev/null | wc -l
