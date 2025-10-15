#!/bin/bash
# Update API Gateway Routes for CRUD Operations
# Adds routes for query/insert/update/delete Lambda functions

set -e

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Update API Gateway Routes${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

AWS_REGION="us-east-1"
ACCOUNT_ID="706704660887"
API_ID="g4fv3te9nf"

echo -e "${BLUE}→ Getting API Gateway details...${NC}"

# Get API info
API_INFO=$(aws apigatewayv2 get-api --api-id $API_ID --region $AWS_REGION)
API_NAME=$(echo $API_INFO | jq -r '.Name')

echo -e "${GREEN}✅ API: $API_NAME ($API_ID)${NC}"
echo ""

# Define routes and Lambda functions
declare -A ROUTES
ROUTES["GET /query/{table}"]="mentalspace-query-database"
ROUTES["POST /insert/{table}"]="mentalspace-insert-database"
ROUTES["PUT /update/{table}"]="mentalspace-update-database"
ROUTES["POST /delete/{table}"]="mentalspace-delete-database"

for ROUTE_KEY in "${!ROUTES[@]}"; do
  FUNCTION_NAME="${ROUTES[$ROUTE_KEY]}"

  echo -e "${BLUE}========================================${NC}"
  echo -e "${BLUE}  Route: $ROUTE_KEY${NC}"
  echo -e "${BLUE}  Lambda: $FUNCTION_NAME${NC}"
  echo -e "${BLUE}========================================${NC}"
  echo ""

  # Get Lambda ARN
  LAMBDA_ARN=$(aws lambda get-function \
    --function-name $FUNCTION_NAME \
    --region $AWS_REGION \
    --query 'Configuration.FunctionArn' \
    --output text)

  echo -e "${GREEN}✅ Lambda ARN: $LAMBDA_ARN${NC}"
  echo ""

  # Create integration
  echo -e "${BLUE}→ Creating integration...${NC}"

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

  echo -e "${GREEN}✅ Integration ID: $INTEGRATION_ID${NC}"
  echo ""

  # Create or update route
  echo -e "${BLUE}→ Creating route...${NC}"

  EXISTING_ROUTE=$(aws apigatewayv2 get-routes \
    --api-id $API_ID \
    --region $AWS_REGION \
    --query "Items[?RouteKey==\`$ROUTE_KEY\`].RouteId | [0]" \
    --output text 2>/dev/null || echo "None")

  if [ "$EXISTING_ROUTE" != "None" ] && [ ! -z "$EXISTING_ROUTE" ]; then
    echo -e "${YELLOW}⚠️  Route exists, updating...${NC}"

    aws apigatewayv2 update-route \
      --api-id $API_ID \
      --route-id $EXISTING_ROUTE \
      --target "integrations/${INTEGRATION_ID}" \
      --authorization-type JWT \
      --authorizer-id $(aws apigatewayv2 get-authorizers --api-id $API_ID --region $AWS_REGION --query 'Items[0].AuthorizerId' --output text) \
      --region $AWS_REGION > /dev/null

    echo -e "${GREEN}✅ Route updated${NC}"
  else
    aws apigatewayv2 create-route \
      --api-id $API_ID \
      --route-key "$ROUTE_KEY" \
      --target "integrations/${INTEGRATION_ID}" \
      --authorization-type JWT \
      --authorizer-id $(aws apigatewayv2 get-authorizers --api-id $API_ID --region $AWS_REGION --query 'Items[0].AuthorizerId' --output text) \
      --region $AWS_REGION > /dev/null

    echo -e "${GREEN}✅ Route created${NC}"
  fi

  # Grant API Gateway permission to invoke Lambda
  echo -e "${BLUE}→ Granting API Gateway invoke permission...${NC}"

  aws lambda add-permission \
    --function-name $FUNCTION_NAME \
    --statement-id "apigateway-${API_ID}-${ROUTE_KEY// /-}" \
    --action lambda:InvokeFunction \
    --principal apigateway.amazonaws.com \
    --source-arn "arn:aws:execute-api:${AWS_REGION}:${ACCOUNT_ID}:${API_ID}/*" \
    --region $AWS_REGION 2>/dev/null || echo -e "${YELLOW}⚠️  Permission already exists${NC}"

  echo -e "${GREEN}✅ Permission granted${NC}"
  echo ""
done

# Deploy API
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Deploying API to 'prod' stage${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

aws apigatewayv2 create-deployment \
  --api-id $API_ID \
  --stage-name prod \
  --region $AWS_REGION > /dev/null

echo -e "${GREEN}✅ API deployed!${NC}"
echo ""

echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}🎉 API Gateway Updated Successfully!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

echo "Your API is now ready at:"
echo -e "${GREEN}https://${API_ID}.execute-api.${AWS_REGION}.amazonaws.com/prod${NC}"
echo ""

echo "New CRUD routes available:"
echo "  • GET    /query/{table}     - Query any table"
echo "  • POST   /insert/{table}    - Insert into any table"
echo "  • PUT    /update/{table}    - Update any table"
echo "  • POST   /delete/{table}    - Delete from any table"
echo ""

echo -e "${GREEN}✅ Your application should now work!${NC}"
echo ""
echo "Refresh your browser to test the application."
echo ""
