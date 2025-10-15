#!/bin/bash
# Create Admin User in AWS Cognito
# Creates the first admin user for MentalSpace EHR

set -e

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Create Admin User${NC}"
echo -e "${BLUE}  MentalSpace EHR${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

AWS_REGION="us-east-1"

# Get Cognito User Pool ID
echo -e "${BLUE}→ Finding Cognito User Pool...${NC}"
COGNITO_USER_POOL_ID=$(aws cognito-idp list-user-pools --max-results 20 --region $AWS_REGION \
  --query "UserPools[?contains(Name, 'mentalspace')].Id | [0]" --output text)

if [ "$COGNITO_USER_POOL_ID" = "None" ] || [ -z "$COGNITO_USER_POOL_ID" ]; then
  echo -e "${RED}❌ ERROR: Cognito user pool not found!${NC}"
  exit 1
fi

echo -e "${GREEN}✅ User Pool: $COGNITO_USER_POOL_ID${NC}"
echo ""

# Prompt for user details
echo -e "${YELLOW}Enter admin user details:${NC}"
echo ""

read -p "Email address: " USER_EMAIL
read -p "First name: " FIRST_NAME
read -p "Last name: " LAST_NAME
read -s -p "Temporary password (min 8 chars, must include upper, lower, number, special): " TEMP_PASSWORD
echo ""
read -s -p "Confirm password: " CONFIRM_PASSWORD
echo ""
echo ""

# Validate passwords match
if [ "$TEMP_PASSWORD" != "$CONFIRM_PASSWORD" ]; then
  echo -e "${RED}❌ ERROR: Passwords don't match!${NC}"
  exit 1
fi

# Validate password length
if [ ${#TEMP_PASSWORD} -lt 8 ]; then
  echo -e "${RED}❌ ERROR: Password must be at least 8 characters!${NC}"
  exit 1
fi

echo -e "${BLUE}→ Creating admin user...${NC}"

# Create user
CREATE_OUTPUT=$(aws cognito-idp admin-create-user \
  --user-pool-id $COGNITO_USER_POOL_ID \
  --username "$USER_EMAIL" \
  --user-attributes \
    Name=email,Value="$USER_EMAIL" \
    Name=email_verified,Value=true \
    Name=given_name,Value="$FIRST_NAME" \
    Name=family_name,Value="$LAST_NAME" \
    Name=custom:role,Value=admin \
  --temporary-password "$TEMP_PASSWORD" \
  --message-action SUPPRESS \
  --region $AWS_REGION \
  --output json 2>&1)

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ ERROR: Failed to create user${NC}"
  echo "$CREATE_OUTPUT"
  exit 1
fi

echo -e "${GREEN}✅ User created successfully!${NC}"

# Set permanent password (so user doesn't need to change it on first login)
echo -e "${BLUE}→ Setting permanent password...${NC}"

aws cognito-idp admin-set-user-password \
  --user-pool-id $COGNITO_USER_POOL_ID \
  --username "$USER_EMAIL" \
  --password "$TEMP_PASSWORD" \
  --permanent \
  --region $AWS_REGION \
  --output json > /dev/null

echo -e "${GREEN}✅ Password set!${NC}"

# Confirm user (mark as verified)
echo -e "${BLUE}→ Confirming user account...${NC}"

aws cognito-idp admin-confirm-sign-up \
  --user-pool-id $COGNITO_USER_POOL_ID \
  --username "$USER_EMAIL" \
  --region $AWS_REGION \
  --output json > /dev/null

echo -e "${GREEN}✅ User confirmed!${NC}"

# Get user details
USER_STATUS=$(aws cognito-idp admin-get-user \
  --user-pool-id $COGNITO_USER_POOL_ID \
  --username "$USER_EMAIL" \
  --region $AWS_REGION \
  --output json)

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  🎉 Admin User Created!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}Login Credentials:${NC}"
echo "  Email:    $USER_EMAIL"
echo "  Password: [hidden - you entered it above]"
echo "  Role:     admin"
echo ""
echo -e "${BLUE}User Details:${NC}"
echo "  First Name: $FIRST_NAME"
echo "  Last Name:  $LAST_NAME"
echo "  Status:     Confirmed"
echo "  Email Verified: Yes"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Go to: http://localhost:8080"
echo "2. Click 'Sign In' tab"
echo "3. Enter email: $USER_EMAIL"
echo "4. Enter the password you just set"
echo "5. You'll be redirected to the admin dashboard"
echo ""
echo -e "${GREEN}🎊 You can now login to your application!${NC}"
echo ""
