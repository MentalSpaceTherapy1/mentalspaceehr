#!/bin/bash
# Automated Phase 1 Lambda Deployment Script
# Deploys 15 critical functions to AWS Lambda
# Account: 706704660887 | Region: us-east-1

set -e  # Exit on error

# Color codes for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# AWS Configuration (UPDATE THESE!)
AWS_REGION="us-east-1"
LAMBDA_ROLE_ARN="arn:aws:iam::706704660887:role/MentalSpaceEhrStack-LambdaExecutionRole-xxxxx"
DATABASE_SECRET_ARN="arn:aws:secretsmanager:us-east-1:706704660887:secret:mentalspace-ehr-db-credentials-al4fLD"
DATABASE_NAME="mentalspaceehr"
COGNITO_USER_POOL_ID="us-east-1_xxxxx"  # UPDATE THIS
VPC_ID="vpc-xxxxx"  # UPDATE THIS
SUBNET_ID_1="subnet-xxxxx"  # UPDATE THIS (Private subnet 1)
SUBNET_ID_2="subnet-xxxxx"  # UPDATE THIS (Private subnet 2)
SECURITY_GROUP_ID="sg-xxxxx"  # UPDATE THIS (LambdaSecurityGroup)
DATABASE_LAYER_ARN="arn:aws:lambda:us-east-1:706704660887:layer:MentalSpaceEhrStack-DatabaseLayer-xxxxx"  # UPDATE THIS

# Phase 1 Functions (in deployment order)
PHASE1_FUNCTIONS=(
  "create-user"
  "list-users"
  "get-user-roles"
  "update-user-role"
  "toggle-user-active"
  "list-clients"
  "get-client"
  "create-client"
  "update-client"
  "list-appointments"
  "create-appointment"
  "update-appointment"
  "get-profile"
  "update-profile"
  "get-dashboard-stats"
)

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Phase 1 Lambda Deployment${NC}"
echo -e "${BLUE}  15 Critical Functions${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Verify AWS CLI is configured
if ! aws sts get-caller-identity &> /dev/null; then
  echo -e "${RED}❌ ERROR: AWS CLI not configured or not authenticated${NC}"
  echo "Run: aws configure"
  exit 1
fi

echo -e "${GREEN}✅ AWS CLI authenticated${NC}"
echo ""

# Function to deploy a Lambda function
deploy_lambda() {
  local FUNCTION_NAME=$1
  local LAMBDA_DIR="lambda/$FUNCTION_NAME"
  local ZIP_FILE="/tmp/mentalspace-$FUNCTION_NAME.zip"
  local FULL_FUNCTION_NAME="mentalspace-$FUNCTION_NAME"

  echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}Deploying: ${FULL_FUNCTION_NAME}${NC}"
  echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

  # Check if function code exists
  if [ ! -f "$LAMBDA_DIR/index.js" ]; then
    echo -e "${RED}❌ ERROR: $LAMBDA_DIR/index.js not found${NC}"
    return 1
  fi

  # Create deployment package
  echo -e "📦 Creating deployment package..."
  cd "$LAMBDA_DIR"
  zip -q -r "$ZIP_FILE" .
  cd - > /dev/null
  echo -e "${GREEN}✅ Package created: $(du -h $ZIP_FILE | cut -f1)${NC}"

  # Check if function exists
  if aws lambda get-function --function-name "$FULL_FUNCTION_NAME" --region "$AWS_REGION" &> /dev/null; then
    # Update existing function
    echo -e "🔄 Updating existing function..."
    aws lambda update-function-code \
      --function-name "$FULL_FUNCTION_NAME" \
      --zip-file "fileb://$ZIP_FILE" \
      --region "$AWS_REGION" \
      --output json > /dev/null

    # Update configuration
    aws lambda update-function-configuration \
      --function-name "$FULL_FUNCTION_NAME" \
      --timeout 30 \
      --memory-size 256 \
      --environment "Variables={DATABASE_SECRET_ARN=$DATABASE_SECRET_ARN,DATABASE_NAME=$DATABASE_NAME,COGNITO_USER_POOL_ID=$COGNITO_USER_POOL_ID}" \
      --region "$AWS_REGION" \
      --output json > /dev/null

    echo -e "${GREEN}✅ Function updated${NC}"
  else
    # Create new function
    echo -e "🆕 Creating new function..."
    aws lambda create-function \
      --function-name "$FULL_FUNCTION_NAME" \
      --runtime nodejs20.x \
      --role "$LAMBDA_ROLE_ARN" \
      --handler index.handler \
      --zip-file "fileb://$ZIP_FILE" \
      --timeout 30 \
      --memory-size 256 \
      --environment "Variables={DATABASE_SECRET_ARN=$DATABASE_SECRET_ARN,DATABASE_NAME=$DATABASE_NAME,COGNITO_USER_POOL_ID=$COGNITO_USER_POOL_ID}" \
      --region "$AWS_REGION" \
      --vpc-config "SubnetIds=$SUBNET_ID_1,$SUBNET_ID_2,SecurityGroupIds=$SECURITY_GROUP_ID" \
      --output json > /dev/null

    echo -e "${GREEN}✅ Function created${NC}"

    # Add database layer
    echo -e "📚 Adding database layer..."
    aws lambda update-function-configuration \
      --function-name "$FULL_FUNCTION_NAME" \
      --layers "$DATABASE_LAYER_ARN" \
      --region "$AWS_REGION" \
      --output json > /dev/null

    echo -e "${GREEN}✅ Layer attached${NC}"
  fi

  # Clean up
  rm -f "$ZIP_FILE"

  echo -e "${GREEN}✅ ${FULL_FUNCTION_NAME} deployed successfully${NC}"
  echo ""
}

# Deploy all Phase 1 functions
TOTAL=${#PHASE1_FUNCTIONS[@]}
CURRENT=0
SUCCEEDED=0
FAILED=0

for FUNC in "${PHASE1_FUNCTIONS[@]}"; do
  CURRENT=$((CURRENT + 1))
  echo -e "${BLUE}[${CURRENT}/${TOTAL}] Deploying $FUNC...${NC}"

  if deploy_lambda "$FUNC"; then
    SUCCEEDED=$((SUCCEEDED + 1))
  else
    FAILED=$((FAILED + 1))
    echo -e "${RED}❌ Failed to deploy $FUNC${NC}"
  fi
done

# Summary
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Deployment Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✅ Succeeded: $SUCCEEDED${NC}"
if [ $FAILED -gt 0 ]; then
  echo -e "${RED}❌ Failed: $FAILED${NC}"
fi
echo -e "${BLUE}Total: $TOTAL${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}🎉 All Phase 1 functions deployed successfully!${NC}"
  echo ""
  echo -e "${YELLOW}Next steps:${NC}"
  echo "1. Configure API Gateway endpoints"
  echo "2. Test endpoints with authentication"
  echo "3. Update frontend .env file"
  echo "4. Deploy Phase 2 functions"
else
  echo -e "${RED}⚠️  Some functions failed to deploy. Check errors above.${NC}"
  exit 1
fi
