#!/bin/bash
# API Gateway Setup Script for MentalSpace EHR
# Creates REST API with Lambda integrations and Cognito authorization

set -e

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  API Gateway Setup${NC}"
echo -e "${BLUE}  MentalSpace EHR${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

AWS_REGION="us-east-1"

# Get Account ID
echo -e "${BLUE}→ Getting Account ID...${NC}"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo -e "${GREEN}✅ Account: $ACCOUNT_ID${NC}"

# Get Cognito User Pool ID
echo -e "${BLUE}→ Finding Cognito User Pool...${NC}"
COGNITO_USER_POOL_ID=$(aws cognito-idp list-user-pools --max-results 20 --region $AWS_REGION \
  --query "UserPools[?contains(Name, 'mentalspace')].Id | [0]" --output text)

if [ "$COGNITO_USER_POOL_ID" = "None" ] || [ -z "$COGNITO_USER_POOL_ID" ]; then
  echo -e "${YELLOW}⚠️  Cognito user pool not found. API will be created without authentication.${NC}"
  USE_COGNITO=false
else
  echo -e "${GREEN}✅ User Pool: $COGNITO_USER_POOL_ID${NC}"
  USE_COGNITO=true
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Creating API Gateway${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Create REST API
echo -e "${BLUE}→ Creating REST API...${NC}"
API_OUTPUT=$(aws apigateway create-rest-api \
  --name "MentalSpace EHR API" \
  --description "REST API for MentalSpace EHR system" \
  --region $AWS_REGION \
  --endpoint-configuration types=REGIONAL \
  --output json)

API_ID=$(echo $API_OUTPUT | grep -o '"id": "[^"]*"' | head -1 | cut -d'"' -f4)
echo -e "${GREEN}✅ API created: $API_ID${NC}"

# Get root resource ID
ROOT_RESOURCE_ID=$(aws apigateway get-resources \
  --rest-api-id $API_ID \
  --region $AWS_REGION \
  --query 'items[?path==`/`].id' \
  --output text)

echo -e "${GREEN}✅ Root resource: $ROOT_RESOURCE_ID${NC}"

# Create Cognito Authorizer (if available)
if [ "$USE_COGNITO" = true ]; then
  echo -e "${BLUE}→ Creating Cognito Authorizer...${NC}"
  AUTHORIZER_OUTPUT=$(aws apigateway create-authorizer \
    --rest-api-id $API_ID \
    --name "CognitoAuthorizer" \
    --type COGNITO_USER_POOLS \
    --provider-arns "arn:aws:cognito-idp:$AWS_REGION:$ACCOUNT_ID:userpool/$COGNITO_USER_POOL_ID" \
    --identity-source "method.request.header.Authorization" \
    --region $AWS_REGION \
    --output json)

  AUTHORIZER_ID=$(echo $AUTHORIZER_OUTPUT | grep -o '"id": "[^"]*"' | head -1 | cut -d'"' -f4)
  echo -e "${GREEN}✅ Authorizer created: $AUTHORIZER_ID${NC}"
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Creating API Resources & Methods${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Function to create resource
create_resource() {
  local RESOURCE_PATH=$1
  local PARENT_ID=$2

  RESOURCE_OUTPUT=$(aws apigateway create-resource \
    --rest-api-id $API_ID \
    --parent-id $PARENT_ID \
    --path-part $RESOURCE_PATH \
    --region $AWS_REGION \
    --output json 2>/dev/null || echo "")

  if [ -z "$RESOURCE_OUTPUT" ]; then
    # Resource might already exist, try to get it
    RESOURCE_ID=$(aws apigateway get-resources \
      --rest-api-id $API_ID \
      --region $AWS_REGION \
      --query "items[?pathPart=='$RESOURCE_PATH'].id" \
      --output text | head -1)
  else
    RESOURCE_ID=$(echo $RESOURCE_OUTPUT | grep -o '"id": "[^"]*"' | head -1 | cut -d'"' -f4)
  fi

  echo $RESOURCE_ID
}

# Function to create method and integration
create_method_integration() {
  local RESOURCE_ID=$1
  local HTTP_METHOD=$2
  local LAMBDA_FUNCTION=$3
  local REQUIRE_AUTH=$4

  # Create method
  if [ "$REQUIRE_AUTH" = true ] && [ "$USE_COGNITO" = true ]; then
    aws apigateway put-method \
      --rest-api-id $API_ID \
      --resource-id $RESOURCE_ID \
      --http-method $HTTP_METHOD \
      --authorization-type COGNITO_USER_POOLS \
      --authorizer-id $AUTHORIZER_ID \
      --region $AWS_REGION \
      --output json > /dev/null 2>&1 || true
  else
    aws apigateway put-method \
      --rest-api-id $API_ID \
      --resource-id $RESOURCE_ID \
      --http-method $HTTP_METHOD \
      --authorization-type NONE \
      --region $AWS_REGION \
      --output json > /dev/null 2>&1 || true
  fi

  # Create integration
  LAMBDA_ARN="arn:aws:lambda:$AWS_REGION:$ACCOUNT_ID:function:$LAMBDA_FUNCTION"

  aws apigateway put-integration \
    --rest-api-id $API_ID \
    --resource-id $RESOURCE_ID \
    --http-method $HTTP_METHOD \
    --type AWS_PROXY \
    --integration-http-method POST \
    --uri "arn:aws:apigateway:$AWS_REGION:lambda:path/2015-03-31/functions/$LAMBDA_ARN/invocations" \
    --region $AWS_REGION \
    --output json > /dev/null 2>&1 || true

  # Add Lambda permission
  aws lambda add-permission \
    --function-name $LAMBDA_FUNCTION \
    --statement-id "apigateway-${HTTP_METHOD}-$(date +%s)" \
    --action lambda:InvokeFunction \
    --principal apigateway.amazonaws.com \
    --source-arn "arn:aws:execute-api:$AWS_REGION:$ACCOUNT_ID:$API_ID/*/*" \
    --region $AWS_REGION \
    --output json > /dev/null 2>&1 || true
}

# Define API structure for Phase 1 functions
declare -A API_ENDPOINTS=(
  # Users
  ["users:GET"]="mentalspace-list-users"
  ["users:POST"]="mentalspace-create-user"

  # User roles
  ["users/roles:GET"]="mentalspace-get-user-roles"

  # User by ID
  ["users/{id}:PUT"]="mentalspace-update-user-role"
  ["users/{id}/toggle:POST"]="mentalspace-toggle-user-active"

  # Clients
  ["clients:GET"]="mentalspace-list-clients"
  ["clients:POST"]="mentalspace-create-client"
  ["clients/{id}:GET"]="mentalspace-get-client"
  ["clients/{id}:PUT"]="mentalspace-update-client"

  # Appointments
  ["appointments:GET"]="mentalspace-list-appointments"
  ["appointments:POST"]="mentalspace-create-appointment"
  ["appointments/{id}:PUT"]="mentalspace-update-appointment"

  # Profiles
  ["profile:GET"]="mentalspace-get-profile"
  ["profile:PUT"]="mentalspace-update-profile"

  # Dashboard
  ["dashboard/stats:GET"]="mentalspace-get-dashboard-stats"

  # Notes
  ["notes:GET"]="mentalspace-list-notes"
  ["notes:POST"]="mentalspace-create-note"

  # Tasks
  ["tasks:GET"]="mentalspace-list-tasks"
  ["tasks:POST"]="mentalspace-create-task"
  ["tasks/{id}:PUT"]="mentalspace-update-task"
)

# Track created resources
declare -A RESOURCE_IDS
RESOURCE_IDS["/"]=$ROOT_RESOURCE_ID

# Create resources and methods
TOTAL=${#API_ENDPOINTS[@]}
CURRENT=0

for ENDPOINT_KEY in "${!API_ENDPOINTS[@]}"; do
  CURRENT=$((CURRENT + 1))

  # Parse endpoint (path:method)
  ENDPOINT_PATH=$(echo $ENDPOINT_KEY | cut -d':' -f1)
  HTTP_METHOD=$(echo $ENDPOINT_KEY | cut -d':' -f2)
  LAMBDA_FUNCTION=${API_ENDPOINTS[$ENDPOINT_KEY]}

  echo -e "${BLUE}[$CURRENT/$TOTAL] Creating: $HTTP_METHOD /$ENDPOINT_PATH${NC}"

  # Split path into parts
  IFS='/' read -ra PATH_PARTS <<< "$ENDPOINT_PATH"
  PARENT_ID=$ROOT_RESOURCE_ID
  FULL_PATH=""

  # Create each path segment
  for PART in "${PATH_PARTS[@]}"; do
    if [ -z "$PART" ]; then
      continue
    fi

    FULL_PATH="$FULL_PATH/$PART"

    # Check if resource already created
    if [ -z "${RESOURCE_IDS[$FULL_PATH]}" ]; then
      RESOURCE_ID=$(create_resource "$PART" "$PARENT_ID")
      RESOURCE_IDS[$FULL_PATH]=$RESOURCE_ID
      echo -e "  ${GREEN}✅ Resource created: /$ENDPOINT_PATH ($RESOURCE_ID)${NC}"
    else
      RESOURCE_ID=${RESOURCE_IDS[$FULL_PATH]}
    fi

    PARENT_ID=$RESOURCE_ID
  done

  # Create method and integration
  create_method_integration "$RESOURCE_ID" "$HTTP_METHOD" "$LAMBDA_FUNCTION" true
  echo -e "  ${GREEN}✅ Method created: $HTTP_METHOD${NC}"
  echo -e "  ${GREEN}✅ Integration: $LAMBDA_FUNCTION${NC}"
  echo ""
done

# Enable CORS on all resources
echo -e "${BLUE}→ Enabling CORS...${NC}"
for RESOURCE_PATH in "${!RESOURCE_IDS[@]}"; do
  RESOURCE_ID=${RESOURCE_IDS[$RESOURCE_PATH]}

  # Create OPTIONS method for CORS
  aws apigateway put-method \
    --rest-api-id $API_ID \
    --resource-id $RESOURCE_ID \
    --http-method OPTIONS \
    --authorization-type NONE \
    --region $AWS_REGION \
    --output json > /dev/null 2>&1 || true

  # Create mock integration for OPTIONS
  aws apigateway put-integration \
    --rest-api-id $API_ID \
    --resource-id $RESOURCE_ID \
    --http-method OPTIONS \
    --type MOCK \
    --request-templates '{"application/json": "{\"statusCode\": 200}"}' \
    --region $AWS_REGION \
    --output json > /dev/null 2>&1 || true

  # Create method response
  aws apigateway put-method-response \
    --rest-api-id $API_ID \
    --resource-id $RESOURCE_ID \
    --http-method OPTIONS \
    --status-code 200 \
    --response-parameters '{"method.response.header.Access-Control-Allow-Headers":false,"method.response.header.Access-Control-Allow-Methods":false,"method.response.header.Access-Control-Allow-Origin":false}' \
    --region $AWS_REGION \
    --output json > /dev/null 2>&1 || true

  # Create integration response
  aws apigateway put-integration-response \
    --rest-api-id $API_ID \
    --resource-id $RESOURCE_ID \
    --http-method OPTIONS \
    --status-code 200 \
    --response-parameters '{"method.response.header.Access-Control-Allow-Headers":"'"'"'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"'"'","method.response.header.Access-Control-Allow-Methods":"'"'"'GET,POST,PUT,DELETE,OPTIONS'"'"'","method.response.header.Access-Control-Allow-Origin":"'"'"'*'"'"'"}' \
    --region $AWS_REGION \
    --output json > /dev/null 2>&1 || true
done
echo -e "${GREEN}✅ CORS enabled${NC}"

# Deploy API
echo ""
echo -e "${BLUE}→ Deploying API to 'prod' stage...${NC}"
aws apigateway create-deployment \
  --rest-api-id $API_ID \
  --stage-name prod \
  --stage-description "Production deployment" \
  --description "Initial deployment with Lambda integrations" \
  --region $AWS_REGION \
  --output json > /dev/null

API_ENDPOINT="https://$API_ID.execute-api.$AWS_REGION.amazonaws.com/prod"
echo -e "${GREEN}✅ API deployed!${NC}"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  🎉 API Gateway Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}API Endpoint:${NC}"
echo -e "${YELLOW}$API_ENDPOINT${NC}"
echo ""
echo -e "${BLUE}Example endpoints:${NC}"
echo "  GET  $API_ENDPOINT/users"
echo "  POST $API_ENDPOINT/users"
echo "  GET  $API_ENDPOINT/clients"
echo "  POST $API_ENDPOINT/clients"
echo "  GET  $API_ENDPOINT/appointments"
echo "  GET  $API_ENDPOINT/dashboard/stats"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Update your frontend .env file:"
echo "   VITE_API_ENDPOINT=$API_ENDPOINT"
echo ""
echo "2. Test an endpoint (requires Cognito JWT token):"
echo "   curl -H \"Authorization: Bearer YOUR_TOKEN\" $API_ENDPOINT/users"
echo ""
echo -e "${BLUE}API Details:${NC}"
echo "  API ID: $API_ID"
echo "  Region: $AWS_REGION"
echo "  Stage: prod"
if [ "$USE_COGNITO" = true ]; then
  echo "  Auth: Cognito User Pool ($COGNITO_USER_POOL_ID)"
else
  echo "  Auth: None (open access)"
fi
echo ""
