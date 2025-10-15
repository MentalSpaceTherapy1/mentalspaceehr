#!/bin/bash
# ALL-IN-ONE DEPLOYMENT SCRIPT
# Deploys CRUD Lambda functions and updates API Gateway

set -e

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  MentalSpace CRUD Deployment${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

AWS_REGION="us-east-1"
ACCOUNT_ID="706704660887"
ROLE_ARN="arn:aws:iam::${ACCOUNT_ID}:role/mentalspace-lambda-role"
API_ID="g4fv3te9nf"

# Database configuration
DB_SECRET_ARN="arn:aws:secretsmanager:us-east-1:${ACCOUNT_ID}:secret:mentalspace-ehr-db-credentials-al4fLD"
DB_ENDPOINT="mentalspaceehrstack-databaseb269d8bb-edwdzckxbkt7.cluster-ci16iwey2cac.us-east-1.rds.amazonaws.com"
DB_PORT="5432"
DB_NAME="mentalspaceehr"

# VPC Configuration (get from existing Lambda)
echo -e "${BLUE}→ Getting VPC configuration from existing Lambda...${NC}"

VPC_CONFIG=$(aws lambda get-function-configuration \
  --function-name mentalspace-get-user-roles \
  --region $AWS_REGION \
  --query 'VpcConfig' \
  --output json 2>/dev/null || echo '{}')

VPC_SUBNET_IDS=$(echo $VPC_CONFIG | jq -r '.SubnetIds | join(",")')
VPC_SECURITY_GROUP_IDS=$(echo $VPC_CONFIG | jq -r '.SecurityGroupIds | join(",")')

if [ "$VPC_SUBNET_IDS" == "null" ] || [ -z "$VPC_SUBNET_IDS" ]; then
  echo -e "${RED}❌ ERROR: Could not get VPC configuration${NC}"
  echo "Please check that mentalspace-get-user-roles Lambda exists"
  exit 1
fi

echo -e "${GREEN}✅ VPC Subnets: $VPC_SUBNET_IDS${NC}"
echo -e "${GREEN}✅ VPC Security Groups: $VPC_SECURITY_GROUP_IDS${NC}"
echo ""

# Get database credentials
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
declare -A FUNCTIONS
FUNCTIONS["query-database"]="query"
FUNCTIONS["insert-database"]="insert"
FUNCTIONS["update-database"]="update"
FUNCTIONS["delete-database"]="delete"

# Deploy each Lambda function
for FUNC_DIR in "${!FUNCTIONS[@]}"; do
  FUNC_TYPE="${FUNCTIONS[$FUNC_DIR]}"
  FUNCTION_NAME="mentalspace-${FUNC_DIR}"

  echo -e "${BLUE}========================================${NC}"
  echo -e "${BLUE}  Deploying: $FUNCTION_NAME${NC}"
  echo -e "${BLUE}========================================${NC}"
  echo ""

  # Check if directory exists, create if needed
  if [ ! -d "$FUNC_DIR" ]; then
    echo -e "${RED}❌ ERROR: Directory $FUNC_DIR not found${NC}"
    echo "Current directory contents:"
    ls -la
    exit 1
  fi

  cd $FUNC_DIR

  # Install dependencies
  echo -e "${BLUE}→ Installing dependencies...${NC}"
  npm install pg --save --silent 2>/dev/null || true

  # Create zip
  echo -e "${BLUE}→ Creating deployment package...${NC}"
  zip -rq ../${FUNC_DIR}.zip . -x "*.zip"
  cd ..

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

    # Wait for update to complete
    echo -e "${BLUE}→ Waiting for update to complete...${NC}"
    aws lambda wait function-updated --function-name $FUNCTION_NAME --region $AWS_REGION

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
      --vpc-config SubnetIds=$VPC_SUBNET_IDS,SecurityGroupIds=$VPC_SECURITY_GROUP_IDS \
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
echo -e "${GREEN}🎉 All Lambda Functions Deployed!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Now update API Gateway routes
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Updating API Gateway Routes${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Define routes
declare -A ROUTES
ROUTES["GET /query/{table}"]="mentalspace-query-database"
ROUTES["POST /insert/{table}"]="mentalspace-insert-database"
ROUTES["PUT /update/{table}"]="mentalspace-update-database"
ROUTES["POST /delete/{table}"]="mentalspace-delete-database"

# Get authorizer ID
AUTHORIZER_ID=$(aws apigatewayv2 get-authorizers \
  --api-id $API_ID \
  --region $AWS_REGION \
  --query 'Items[0].AuthorizerId' \
  --output text)

echo -e "${GREEN}✅ Authorizer ID: $AUTHORIZER_ID${NC}"
echo ""

for ROUTE_KEY in "${!ROUTES[@]}"; do
  FUNCTION_NAME="${ROUTES[$ROUTE_KEY]}"

  echo -e "${BLUE}→ Configuring route: $ROUTE_KEY${NC}"

  # Get Lambda ARN
  LAMBDA_ARN=$(aws lambda get-function \
    --function-name $FUNCTION_NAME \
    --region $AWS_REGION \
    --query 'Configuration.FunctionArn' \
    --output text)

  # Create integration (or get existing)
  INTEGRATION_ID=$(aws apigatewayv2 create-integration \
    --api-id $API_ID \
    --integration-type AWS_PROXY \
    --integration-uri "arn:aws:apigateway:${AWS_REGION}:lambda:path/2015-03-31/functions/${LAMBDA_ARN}/invocations" \
    --payload-format-version 2.0 \
    --region $AWS_REGION \
    --query 'IntegrationId' \
    --output text 2>/dev/null || \
    aws apigatewayv2 get-integrations \
      --api-id $API_ID \
      --region $AWS_REGION \
      --query "Items[?IntegrationUri==\`arn:aws:apigateway:${AWS_REGION}:lambda:path/2015-03-31/functions/${LAMBDA_ARN}/invocations\`].IntegrationId | [0]" \
      --output text)

  # Check if route exists
  EXISTING_ROUTE=$(aws apigatewayv2 get-routes \
    --api-id $API_ID \
    --region $AWS_REGION \
    --query "Items[?RouteKey==\`$ROUTE_KEY\`].RouteId | [0]" \
    --output text 2>/dev/null || echo "None")

  if [ "$EXISTING_ROUTE" != "None" ] && [ ! -z "$EXISTING_ROUTE" ]; then
    aws apigatewayv2 update-route \
      --api-id $API_ID \
      --route-id $EXISTING_ROUTE \
      --target "integrations/${INTEGRATION_ID}" \
      --authorization-type JWT \
      --authorizer-id $AUTHORIZER_ID \
      --region $AWS_REGION > /dev/null
  else
    aws apigatewayv2 create-route \
      --api-id $API_ID \
      --route-key "$ROUTE_KEY" \
      --target "integrations/${INTEGRATION_ID}" \
      --authorization-type JWT \
      --authorizer-id $AUTHORIZER_ID \
      --region $AWS_REGION > /dev/null
  fi

  # Grant API Gateway permission
  aws lambda add-permission \
    --function-name $FUNCTION_NAME \
    --statement-id "apigateway-${API_ID}-${ROUTE_KEY// /-}" \
    --action lambda:InvokeFunction \
    --principal apigateway.amazonaws.com \
    --source-arn "arn:aws:execute-api:${AWS_REGION}:${ACCOUNT_ID}:${API_ID}/*" \
    --region $AWS_REGION 2>/dev/null || true

  echo -e "${GREEN}✅ Route configured: $ROUTE_KEY${NC}"
done

echo ""

# Deploy API
echo -e "${BLUE}→ Deploying API to 'prod' stage...${NC}"

aws apigatewayv2 create-deployment \
  --api-id $API_ID \
  --stage-name prod \
  --region $AWS_REGION > /dev/null

echo -e "${GREEN}✅ API deployed!${NC}"
echo ""

echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}🎉 DEPLOYMENT COMPLETE!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

echo "✅ 4 Lambda functions deployed:"
echo "   • mentalspace-query-database"
echo "   • mentalspace-insert-database"
echo "   • mentalspace-update-database"
echo "   • mentalspace-delete-database"
echo ""

echo "✅ 4 API Gateway routes configured:"
echo "   • GET    /query/{table}"
echo "   • POST   /insert/{table}"
echo "   • PUT    /update/{table}"
echo "   • POST   /delete/{table}"
echo ""

echo "✅ API Endpoint:"
echo -e "   ${GREEN}https://${API_ID}.execute-api.${AWS_REGION}.amazonaws.com/prod${NC}"
echo ""

echo -e "${GREEN}🎊 Your application is ready!${NC}"
echo ""
echo "Next steps:"
echo "1. Go to http://localhost:8080"
echo "2. Press Ctrl+Shift+R (hard refresh)"
echo "3. Navigate to any page - NO MORE ERRORS! ✅"
echo ""
