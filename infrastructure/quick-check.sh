#!/bin/bash
# Quick check using AWS CLI directly

echo "Checking database tables..."

# List all tables in the database
aws rds-data execute-statement \
  --resource-arn "arn:aws:rds:us-east-1:706704660887:cluster:mentalspaceehrstack-databaseb269d8bb-edwdzckxbkt7" \
  --secret-arn "arn:aws:secretsmanager:us-east-1:706704660887:secret:mentalspace-ehr-db-credentials-al4fLD" \
  --database "mentalspaceehr" \
  --sql "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name LIMIT 10;" \
  --region us-east-1
