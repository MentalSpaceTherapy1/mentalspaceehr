#!/bin/bash
# Grant Administrator Role to User in Database
# This adds the administrator role to the user_roles table

set -e

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Grant Administrator Role${NC}"
echo -e "${BLUE}  Aurora PostgreSQL${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

AWS_REGION="us-east-1"
CLUSTER_ARN="arn:aws:rds:us-east-1:706704660887:cluster:mentalspaceehrstack-databaseb269d8bb-edwdzckxbkt7"
SECRET_ARN="arn:aws:secretsmanager:us-east-1:706704660887:secret:mentalspace-ehr-db-credentials-al4fLD"
DATABASE_NAME="mentalspaceehr"

# Get user email
echo -e "${BLUE}Enter user email to grant admin access:${NC}"
read -p "Email: " USER_EMAIL

if [ -z "$USER_EMAIL" ]; then
  echo -e "${RED}❌ ERROR: Email cannot be empty${NC}"
  exit 1
fi

echo ""
echo -e "${BLUE}→ Looking up user ID...${NC}"

# Find user ID by email
USER_QUERY="SELECT id, email, full_name FROM users WHERE email = '$USER_EMAIL' LIMIT 1;"

USER_RESULT=$(aws rds-data execute-statement \
  --resource-arn "$CLUSTER_ARN" \
  --secret-arn "$SECRET_ARN" \
  --database "$DATABASE_NAME" \
  --sql "$USER_QUERY" \
  --region $AWS_REGION \
  --output json)

echo "$USER_RESULT" > /tmp/user-lookup.json

# Check if user exists
RECORDS=$(echo "$USER_RESULT" | jq -r '.records | length')

if [ "$RECORDS" -eq "0" ]; then
  echo -e "${RED}❌ ERROR: User not found with email: $USER_EMAIL${NC}"
  echo ""
  echo "The user must first log in to the application to create a user record."
  exit 1
fi

# Extract user details
USER_ID=$(echo "$USER_RESULT" | jq -r '.records[0][0].stringValue')
USER_NAME=$(echo "$USER_RESULT" | jq -r '.records[0][2].stringValue // "N/A"')

echo -e "${GREEN}✅ Found user:${NC}"
echo "   ID: $USER_ID"
echo "   Email: $USER_EMAIL"
echo "   Name: $USER_NAME"
echo ""

# Check if already has admin role
echo -e "${BLUE}→ Checking existing roles...${NC}"

ROLE_CHECK="SELECT role FROM user_roles WHERE user_id = '$USER_ID' AND role = 'administrator';"

ROLE_RESULT=$(aws rds-data execute-statement \
  --resource-arn "$CLUSTER_ARN" \
  --secret-arn "$SECRET_ARN" \
  --database "$DATABASE_NAME" \
  --sql "$ROLE_CHECK" \
  --region $AWS_REGION \
  --output json)

ADMIN_EXISTS=$(echo "$ROLE_RESULT" | jq -r '.records | length')

if [ "$ADMIN_EXISTS" -gt "0" ]; then
  echo -e "${YELLOW}⚠️  User already has administrator role!${NC}"
  echo ""
  echo "No changes needed. Try refreshing your application."
  exit 0
fi

echo -e "${GREEN}✅ No administrator role found${NC}"
echo ""

# Ask for confirmation
echo -e "${YELLOW}⚠️  This will grant ADMINISTRATOR access to:${NC}"
echo "   $USER_EMAIL ($USER_NAME)"
echo ""
read -p "Continue? (y/n): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Cancelled."
  exit 0
fi

echo ""
echo -e "${BLUE}→ Granting administrator role...${NC}"

# Insert administrator role
INSERT_ROLE="
INSERT INTO user_roles (user_id, role)
VALUES ('$USER_ID', 'administrator')
ON CONFLICT (user_id, role) DO NOTHING;
"

aws rds-data execute-statement \
  --resource-arn "$CLUSTER_ARN" \
  --secret-arn "$SECRET_ARN" \
  --database "$DATABASE_NAME" \
  --sql "$INSERT_ROLE" \
  --region $AWS_REGION > /dev/null

echo -e "${GREEN}✅ Administrator role granted!${NC}"
echo ""

# Verify
echo -e "${BLUE}→ Verifying...${NC}"

ALL_ROLES=$(aws rds-data execute-statement \
  --resource-arn "$CLUSTER_ARN" \
  --secret-arn "$SECRET_ARN" \
  --database "$DATABASE_NAME" \
  --sql "SELECT role FROM user_roles WHERE user_id = '$USER_ID';" \
  --region $AWS_REGION \
  --output json)

ROLES_LIST=$(echo "$ALL_ROLES" | jq -r '.records[].[] | .stringValue' | tr '\n' ',' | sed 's/,$//')

echo -e "${GREEN}✅ User roles: $ROLES_LIST${NC}"
echo ""

echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}🎉 Success!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "Next steps:"
echo "1. Refresh your browser (Ctrl+Shift+R)"
echo "2. You should now see the full Admin menu in the sidebar"
echo "3. All administrative features will be available"
echo ""
