#!/bin/bash
# CloudShell Deployment Script - Phase 1 Lambda Functions
# Run this in AWS CloudShell (us-east-1)

set -e  # Exit on error

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  MentalSpace EHR - Lambda Deployment${NC}"
echo -e "${BLUE}  Phase 1: 15 Critical Functions${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# AWS Configuration
AWS_REGION="us-east-1"
DATABASE_NAME="mentalspaceehr"

echo -e "${YELLOW}Step 1: Auto-fetching AWS Configuration...${NC}"
echo ""

# Get Account ID
echo -e "${BLUE}→ Getting Account ID...${NC}"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo -e "${GREEN}✅ Account: $ACCOUNT_ID${NC}"

# Get Database Secret ARN
echo -e "${BLUE}→ Finding Database Secret...${NC}"
DATABASE_SECRET_ARN=$(aws secretsmanager list-secrets --region $AWS_REGION \
  --query "SecretList[?contains(Name, 'db-credentials')].ARN | [0]" --output text)
if [ "$DATABASE_SECRET_ARN" = "None" ] || [ -z "$DATABASE_SECRET_ARN" ]; then
  echo -e "${RED}❌ Database secret not found. Looking for any secret with 'mentalspace'...${NC}"
  DATABASE_SECRET_ARN=$(aws secretsmanager list-secrets --region $AWS_REGION \
    --query "SecretList[?contains(Name, 'mentalspace')].ARN | [0]" --output text)
fi
echo -e "${GREEN}✅ Secret: $DATABASE_SECRET_ARN${NC}"

# Get VPC ID
echo -e "${BLUE}→ Finding VPC...${NC}"
VPC_ID=$(aws ec2 describe-vpcs --region $AWS_REGION \
  --filters "Name=tag:Name,Values=*MentalSpace*" \
  --query "Vpcs[0].VpcId" --output text)
if [ "$VPC_ID" = "None" ] || [ -z "$VPC_ID" ]; then
  # Fallback: get default VPC or first available
  VPC_ID=$(aws ec2 describe-vpcs --region $AWS_REGION \
    --query "Vpcs[0].VpcId" --output text)
fi
echo -e "${GREEN}✅ VPC: $VPC_ID${NC}"

# Get Private Subnets
echo -e "${BLUE}→ Finding Private Subnets...${NC}"
SUBNETS=$(aws ec2 describe-subnets --region $AWS_REGION \
  --filters "Name=vpc-id,Values=$VPC_ID" "Name=tag:Name,Values=*Private*" \
  --query "Subnets[0:2].SubnetId" --output text)
SUBNET_ID_1=$(echo $SUBNETS | awk '{print $1}')
SUBNET_ID_2=$(echo $SUBNETS | awk '{print $2}')

if [ -z "$SUBNET_ID_1" ] || [ "$SUBNET_ID_1" = "None" ]; then
  # Fallback: get any 2 subnets
  echo -e "${YELLOW}⚠️  No 'Private' subnets found, using first 2 subnets in VPC${NC}"
  SUBNETS=$(aws ec2 describe-subnets --region $AWS_REGION \
    --filters "Name=vpc-id,Values=$VPC_ID" \
    --query "Subnets[0:2].SubnetId" --output text)
  SUBNET_ID_1=$(echo $SUBNETS | awk '{print $1}')
  SUBNET_ID_2=$(echo $SUBNETS | awk '{print $2}')
fi
echo -e "${GREEN}✅ Subnet 1: $SUBNET_ID_1${NC}"
echo -e "${GREEN}✅ Subnet 2: $SUBNET_ID_2${NC}"

# Get Lambda Security Group
echo -e "${BLUE}→ Finding Lambda Security Group...${NC}"
SECURITY_GROUP_ID=$(aws ec2 describe-security-groups --region $AWS_REGION \
  --filters "Name=vpc-id,Values=$VPC_ID" "Name=group-name,Values=*Lambda*" \
  --query "SecurityGroups[0].GroupId" --output text)
if [ "$SECURITY_GROUP_ID" = "None" ] || [ -z "$SECURITY_GROUP_ID" ]; then
  # Fallback: get default security group
  echo -e "${YELLOW}⚠️  No 'Lambda' security group found, using default${NC}"
  SECURITY_GROUP_ID=$(aws ec2 describe-security-groups --region $AWS_REGION \
    --filters "Name=vpc-id,Values=$VPC_ID" "Name=group-name,Values=default" \
    --query "SecurityGroups[0].GroupId" --output text)
fi
echo -e "${GREEN}✅ Security Group: $SECURITY_GROUP_ID${NC}"

# Get Lambda Execution Role
echo -e "${BLUE}→ Finding Lambda Execution Role...${NC}"
LAMBDA_ROLE_ARN=$(aws iam list-roles \
  --query "Roles[?contains(RoleName, 'LambdaExecutionRole')].Arn | [0]" --output text)
if [ "$LAMBDA_ROLE_ARN" = "None" ] || [ -z "$LAMBDA_ROLE_ARN" ]; then
  echo -e "${RED}❌ Lambda execution role not found!${NC}"
  echo -e "${YELLOW}Creating Lambda execution role...${NC}"

  # Create trust policy
  cat > /tmp/trust-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {"Service": "lambda.amazonaws.com"},
    "Action": "sts:AssumeRole"
  }]
}
EOF

  # Create role
  aws iam create-role \
    --role-name MentalSpaceLambdaExecutionRole \
    --assume-role-policy-document file:///tmp/trust-policy.json \
    --description "Execution role for MentalSpace EHR Lambda functions"

  # Attach policies
  aws iam attach-role-policy \
    --role-name MentalSpaceLambdaExecutionRole \
    --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole

  aws iam attach-role-policy \
    --role-name MentalSpaceLambdaExecutionRole \
    --policy-arn arn:aws:iam::aws:policy/SecretsManagerReadWrite

  LAMBDA_ROLE_ARN="arn:aws:iam::${ACCOUNT_ID}:role/MentalSpaceLambdaExecutionRole"

  echo -e "${GREEN}✅ Created role: $LAMBDA_ROLE_ARN${NC}"
  echo -e "${YELLOW}⏳ Waiting 10 seconds for IAM propagation...${NC}"
  sleep 10
else
  echo -e "${GREEN}✅ Role: $LAMBDA_ROLE_ARN${NC}"
fi

# Get or Create Database Layer
echo -e "${BLUE}→ Finding Database Layer...${NC}"
DATABASE_LAYER_ARN=$(aws lambda list-layers --region $AWS_REGION \
  --query "Layers[?contains(LayerName, 'DatabaseLayer')].LatestMatchingVersion.LayerVersionArn | [0]" --output text)

if [ "$DATABASE_LAYER_ARN" = "None" ] || [ -z "$DATABASE_LAYER_ARN" ]; then
  echo -e "${YELLOW}⚠️  Database layer not found. Creating it...${NC}"

  # Create layer
  mkdir -p /tmp/layer/nodejs
  cd /tmp/layer/nodejs

  # Create package.json
  cat > package.json <<EOF
{
  "name": "database-layer",
  "version": "1.0.0",
  "dependencies": {
    "pg": "^8.11.3"
  }
}
EOF

  npm install --production
  cd /tmp/layer
  zip -r database-layer.zip nodejs

  # Publish layer
  LAYER_OUTPUT=$(aws lambda publish-layer-version \
    --layer-name MentalSpaceEhrStack-DatabaseLayer \
    --description "PostgreSQL driver for Lambda functions" \
    --zip-file fileb://database-layer.zip \
    --compatible-runtimes nodejs20.x \
    --region $AWS_REGION)

  DATABASE_LAYER_ARN=$(echo $LAYER_OUTPUT | grep -o '"LayerVersionArn": "[^"]*"' | cut -d'"' -f4)
  echo -e "${GREEN}✅ Created layer: $DATABASE_LAYER_ARN${NC}"
else
  echo -e "${GREEN}✅ Layer: $DATABASE_LAYER_ARN${NC}"
fi

# Get Cognito User Pool
echo -e "${BLUE}→ Finding Cognito User Pool...${NC}"
COGNITO_USER_POOL_ID=$(aws cognito-idp list-user-pools --max-results 20 --region $AWS_REGION \
  --query "UserPools[?contains(Name, 'mentalspace')].Id | [0]" --output text)
if [ "$COGNITO_USER_POOL_ID" = "None" ] || [ -z "$COGNITO_USER_POOL_ID" ]; then
  echo -e "${YELLOW}⚠️  Cognito user pool not found. Will use placeholder.${NC}"
  COGNITO_USER_POOL_ID="us-east-1_PLACEHOLDER"
else
  echo -e "${GREEN}✅ User Pool: $COGNITO_USER_POOL_ID${NC}"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Configuration Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Phase 1 Functions
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

# Function to deploy a Lambda
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

  ZIP_SIZE=$(du -h "$ZIP_FILE" | cut -f1)
  echo -e "${GREEN}✅ Package created: $ZIP_SIZE${NC}"

  # Check if function exists
  if aws lambda get-function --function-name "$FULL_FUNCTION_NAME" --region "$AWS_REGION" &> /dev/null; then
    echo -e "🔄 Updating existing function..."

    aws lambda update-function-code \
      --function-name "$FULL_FUNCTION_NAME" \
      --zip-file "fileb://$ZIP_FILE" \
      --region "$AWS_REGION" \
      --output json > /dev/null

    aws lambda update-function-configuration \
      --function-name "$FULL_FUNCTION_NAME" \
      --timeout 30 \
      --memory-size 256 \
      --environment "Variables={DATABASE_SECRET_ARN=$DATABASE_SECRET_ARN,DATABASE_NAME=$DATABASE_NAME,COGNITO_USER_POOL_ID=$COGNITO_USER_POOL_ID}" \
      --region "$AWS_REGION" \
      --output json > /dev/null

    echo -e "${GREEN}✅ Function updated${NC}"
  else
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

  rm -f "$ZIP_FILE"
  echo -e "${GREEN}✅ ${FULL_FUNCTION_NAME} deployed successfully${NC}"
  echo ""
}

# Deploy all functions
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Deploying Functions${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

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
  echo ""
  echo -e "${BLUE}List deployed functions:${NC}"
  echo "aws lambda list-functions --region us-east-1 --query \"Functions[?starts_with(FunctionName, 'mentalspace-')].FunctionName\" --output table"
else
  echo -e "${RED}⚠️  Some functions failed to deploy. Check errors above.${NC}"
  exit 1
fi
