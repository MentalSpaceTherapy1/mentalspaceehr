#!/bin/bash
# Deploy CRUD Lambda Functions
# Adds universal query/insert/update/delete handlers

set -e

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Deploy CRUD Lambda Functions${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

AWS_REGION="us-east-1"
ACCOUNT_ID="706704660887"
ROLE_ARN="arn:aws:iam::${ACCOUNT_ID}:role/mentalspace-lambda-role"

# Database configuration
DB_SECRET_ARN="arn:aws:secretsmanager:us-east-1:${ACCOUNT_ID}:secret:mentalspace-ehr-db-credentials-al4fLD"
DB_ENDPOINT="mentalspaceehrstack-databaseb269d8bb-edwdzckxbkt7.cluster-ci16iwey2cac.us-east-1.rds.amazonaws.com"
DB_PORT="5432"
DB_NAME="mentalspaceehr"

# VPC Configuration
VPC_SECURITY_GROUP_ID="sg-02e0b3c4a6d8f1e9b"
VPC_SUBNET_IDS="subnet-0a1b2c3d4e5f6g7h8,subnet-0b2c3d4e5f6g7h8i9"

echo -e "${BLUE}→ Getting database credentials from Secrets Manager...${NC}"

DB_CREDENTIALS=$(aws secretsmanager get-secret-value \
  --secret-id "$DB_SECRET_ARN" \
  --region $AWS_REGION \
  --query 'SecretString' \
  --output text)

DB_USER=$(echo $DB_CREDENTIALS | jq -r '.username')
DB_PASSWORD=$(echo $DB_CREDENTIALS | jq -r '.password')

echo -e "${GREEN}✅ Retrieved database credentials${NC}"
echo ""

# Lambda functions to deploy
FUNCTIONS=(
  "query-database:query"
  "insert-database:insert"
  "update-database:update"
  "delete-database:delete"
)

for FUNC_INFO in "${FUNCTIONS[@]}"; do
  IFS=':' read -r FUNC_DIR FUNC_TYPE <<< "$FUNC_INFO"
  FUNCTION_NAME="mentalspace-${FUNC_DIR}"

  echo -e "${BLUE}========================================${NC}"
  echo -e "${BLUE}  Deploying: $FUNCTION_NAME${NC}"
  echo -e "${BLUE}========================================${NC}"
  echo ""

  # Create deployment package
  echo -e "${BLUE}→ Creating deployment package...${NC}"

  cd lambda/$FUNC_DIR

  # Install dependencies
  if [ ! -d "node_modules" ]; then
    npm install pg --save 2>/dev/null || true
  fi

  # Create zip
  zip -rq ../../${FUNC_DIR}.zip . -x "*.zip"
  cd ../..

  echo -e "${GREEN}✅ Package created: ${FUNC_DIR}.zip${NC}"
  echo ""

  # Check if function exists
  echo -e "${BLUE}→ Checking if function exists...${NC}"

  if aws lambda get-function --function-name $FUNCTION_NAME --region $AWS_REGION >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Function exists, updating code...${NC}"

    aws lambda update-function-code \
      --function-name $FUNCTION_NAME \
      --zip-file fileb://${FUNC_DIR}.zip \
      --region $AWS_REGION > /dev/null

    echo -e "${GREEN}✅ Code updated${NC}"

    # Update configuration
    echo -e "${BLUE}→ Updating configuration...${NC}"

    aws lambda update-function-configuration \
      --function-name $FUNCTION_NAME \
      --environment "Variables={
        DATABASE_ENDPOINT=$DB_ENDPOINT,
        DATABASE_PORT=$DB_PORT,
        DATABASE_NAME=$DB_NAME,
        DATABASE_USER=$DB_USER,
        DATABASE_PASSWORD=$DB_PASSWORD
      }" \
      --region $AWS_REGION > /dev/null

    echo -e "${GREEN}✅ Configuration updated${NC}"

  else
    echo -e "${YELLOW}⚠️  Function doesn't exist, creating...${NC}"

    aws lambda create-function \
      --function-name $FUNCTION_NAME \
      --runtime nodejs20.x \
      --role $ROLE_ARN \
      --handler index.handler \
      --zip-file fileb://${FUNC_DIR}.zip \
      --timeout 30 \
      --memory-size 512 \
      --environment "Variables={
        DATABASE_ENDPOINT=$DB_ENDPOINT,
        DATABASE_PORT=$DB_PORT,
        DATABASE_NAME=$DB_NAME,
        DATABASE_USER=$DB_USER,
        DATABASE_PASSWORD=$DB_PASSWORD
      }" \
      --vpc-config SubnetIds=$VPC_SUBNET_IDS,SecurityGroupIds=$VPC_SECURITY_GROUP_ID \
      --region $AWS_REGION > /dev/null

    echo -e "${GREEN}✅ Function created${NC}"

    # Wait for function to be active
    echo -e "${BLUE}→ Waiting for function to be active...${NC}"
    aws lambda wait function-active --function-name $FUNCTION_NAME --region $AWS_REGION
    echo -e "${GREEN}✅ Function active${NC}"
  fi

  # Clean up zip
  rm ${FUNC_DIR}.zip

  echo ""
done

echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}🎉 All CRUD Functions Deployed!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

echo "Functions deployed:"
echo "  • mentalspace-query-database   (GET /query/{table})"
echo "  • mentalspace-insert-database  (POST /insert/{table})"
echo "  • mentalspace-update-database  (PUT /update/{table})"
echo "  • mentalspace-delete-database  (POST /delete/{table})"
echo ""

echo -e "${YELLOW}⚠️  NEXT STEP: Update API Gateway routes${NC}"
echo ""
echo "You need to configure API Gateway to route requests to these functions:"
echo ""
echo "1. Go to API Gateway console:"
echo "   https://console.aws.amazon.com/apigateway/home?region=us-east-1"
echo ""
echo "2. Select your API: g4fv3te9nf"
echo ""
echo "3. Add these routes:"
echo "   - GET    /query/{table}     → mentalspace-query-database"
echo "   - POST   /insert/{table}    → mentalspace-insert-database"
echo "   - PUT    /update/{table}    → mentalspace-update-database"
echo "   - POST   /delete/{table}    → mentalspace-delete-database"
echo ""
echo "4. Deploy the API to 'prod' stage"
echo ""
echo "Or run: ./update-api-gateway-routes.sh"
echo ""
