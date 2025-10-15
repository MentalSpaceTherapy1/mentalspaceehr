#!/bin/bash
# Grant Administrator Role via Lambda Function
# Uses the query-database Lambda to insert admin role

set -e

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Grant Administrator Role${NC}"
echo -e "${BLUE}  Via Lambda Function${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

AWS_REGION="us-east-1"
LAMBDA_FUNCTION="mentalspace-query-database"

# Get user email
echo -e "${BLUE}Enter user email to grant admin access:${NC}"
read -p "Email: " USER_EMAIL

if [ -z "$USER_EMAIL" ]; then
  echo -e "${RED}❌ ERROR: Email cannot be empty${NC}"
  exit 1
fi

echo ""
echo -e "${BLUE}→ Looking up user in database...${NC}"

# Step 1: Find user by email
LOOKUP_PAYLOAD=$(cat <<EOF
{
  "query": "SELECT id, email, full_name FROM users WHERE email = :email LIMIT 1",
  "parameters": {
    "email": "$USER_EMAIL"
  }
}
EOF
)

echo "$LOOKUP_PAYLOAD" > /tmp/lookup-user.json

aws lambda invoke \
  --function-name $LAMBDA_FUNCTION \
  --payload file:///tmp/lookup-user.json \
  --region $AWS_REGION \
  /tmp/lookup-response.json > /dev/null

# Check for errors
if grep -q '"errorMessage"' /tmp/lookup-response.json; then
  echo -e "${RED}❌ ERROR: Failed to query database${NC}"
  cat /tmp/lookup-response.json | jq -r '.errorMessage'
  exit 1
fi

# Parse response
USER_RECORDS=$(cat /tmp/lookup-response.json | jq -r '.data.records | length')

if [ "$USER_RECORDS" -eq "0" ]; then
  echo -e "${RED}❌ ERROR: User not found with email: $USER_EMAIL${NC}"
  echo ""
  echo "The user must first log in to the application to create a user record."
  exit 1
fi

USER_ID=$(cat /tmp/lookup-response.json | jq -r '.data.records[0].id')
USER_NAME=$(cat /tmp/lookup-response.json | jq -r '.data.records[0].full_name // "N/A"')

echo -e "${GREEN}✅ Found user:${NC}"
echo "   ID: $USER_ID"
echo "   Email: $USER_EMAIL"
echo "   Name: $USER_NAME"
echo ""

# Step 2: Check existing roles
echo -e "${BLUE}→ Checking existing roles...${NC}"

ROLE_CHECK_PAYLOAD=$(cat <<EOF
{
  "query": "SELECT role FROM user_roles WHERE user_id = :user_id AND role = 'administrator'",
  "parameters": {
    "user_id": "$USER_ID"
  }
}
EOF
)

echo "$ROLE_CHECK_PAYLOAD" > /tmp/check-role.json

aws lambda invoke \
  --function-name $LAMBDA_FUNCTION \
  --payload file:///tmp/check-role.json \
  --region $AWS_REGION \
  /tmp/role-response.json > /dev/null

ADMIN_EXISTS=$(cat /tmp/role-response.json | jq -r '.data.records | length')

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

# Step 3: Insert administrator role
INSERT_PAYLOAD=$(cat <<EOF
{
  "query": "INSERT INTO user_roles (user_id, role) VALUES (:user_id, 'administrator') ON CONFLICT (user_id, role) DO NOTHING",
  "parameters": {
    "user_id": "$USER_ID"
  }
}
EOF
)

echo "$INSERT_PAYLOAD" > /tmp/insert-role.json

aws lambda invoke \
  --function-name $LAMBDA_FUNCTION \
  --payload file:///tmp/insert-role.json \
  --region $AWS_REGION \
  /tmp/insert-response.json > /dev/null

if grep -q '"errorMessage"' /tmp/insert-response.json; then
  echo -e "${RED}❌ ERROR: Failed to insert role${NC}"
  cat /tmp/insert-response.json | jq -r '.errorMessage'
  exit 1
fi

echo -e "${GREEN}✅ Administrator role granted!${NC}"
echo ""

# Step 4: Verify all roles
echo -e "${BLUE}→ Verifying...${NC}"

VERIFY_PAYLOAD=$(cat <<EOF
{
  "query": "SELECT role FROM user_roles WHERE user_id = :user_id",
  "parameters": {
    "user_id": "$USER_ID"
  }
}
EOF
)

echo "$VERIFY_PAYLOAD" > /tmp/verify-roles.json

aws lambda invoke \
  --function-name $LAMBDA_FUNCTION \
  --payload file:///tmp/verify-roles.json \
  --region $AWS_REGION \
  /tmp/verify-response.json > /dev/null

ROLES_LIST=$(cat /tmp/verify-response.json | jq -r '.data.records[].role' | tr '\n' ',' | sed 's/,$//')

echo -e "${GREEN}✅ User roles: $ROLES_LIST${NC}"
echo ""

# Cleanup
rm -f /tmp/lookup-user.json /tmp/lookup-response.json \
  /tmp/check-role.json /tmp/role-response.json \
  /tmp/insert-role.json /tmp/insert-response.json \
  /tmp/verify-roles.json /tmp/verify-response.json

echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}🎉 Success!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "Next steps:"
echo "1. Refresh your browser (Ctrl+Shift+R or F5)"
echo "2. You should now see the full Admin menu in the sidebar"
echo "3. All 30+ administrative features will be available"
echo ""
