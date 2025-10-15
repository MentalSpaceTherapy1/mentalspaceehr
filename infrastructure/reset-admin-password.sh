#!/bin/bash
# Reset Admin User Password
# Resets password for an existing Cognito user

set -e

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Reset User Password${NC}"
echo -e "${BLUE}  MentalSpace EHR${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

AWS_REGION="us-east-1"
USER_POOL_ID="us-east-1_IL2PMU5Qv"

echo -e "${YELLOW}Enter details:${NC}"
echo ""

read -p "Email address: " USER_EMAIL
read -s -p "New password (min 8 chars, upper, lower, number, special): " NEW_PASSWORD
echo ""
echo ""

# Set permanent password
echo -e "${BLUE}→ Resetting password...${NC}"

aws cognito-idp admin-set-user-password \
  --user-pool-id $USER_POOL_ID \
  --username "$USER_EMAIL" \
  --password "$NEW_PASSWORD" \
  --permanent \
  --region $AWS_REGION \
  --output json > /dev/null 2>&1

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ ERROR: Failed to reset password${NC}"
  echo "Make sure:"
  echo "  - Email is correct"
  echo "  - Password meets requirements (8+ chars, upper, lower, number, special)"
  exit 1
fi

echo -e "${GREEN}✅ Password reset successfully!${NC}"

# Enable user (in case it was disabled)
echo -e "${BLUE}→ Enabling user...${NC}"
aws cognito-idp admin-enable-user \
  --user-pool-id $USER_POOL_ID \
  --username "$USER_EMAIL" \
  --region $AWS_REGION \
  --output json > /dev/null 2>&1

echo -e "${GREEN}✅ User enabled!${NC}"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  🎉 Password Reset Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}You can now login:${NC}"
echo "  Email:    $USER_EMAIL"
echo "  Password: [the password you just set]"
echo ""
echo -e "${YELLOW}Go to: http://localhost:8080${NC}"
echo "Click 'Sign In' and use your credentials"
echo ""
