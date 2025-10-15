#!/bin/bash
# API Gateway Routes Only - Run in CloudShell

AWS_REGION="us-east-1"
ACCOUNT_ID="706704660887"
API_ID="g4fv3te9nf"

echo "Updating API Gateway Routes..."

# Get authorizer
AUTHORIZER_ID=$(aws apigatewayv2 get-authorizers \
  --api-id $API_ID \
  --region $AWS_REGION \
  --query 'Items[0].AuthorizerId' \
  --output text)

# Routes
declare -A ROUTES
ROUTES["GET /query/{table}"]="mentalspace-query-database"
ROUTES["POST /insert/{table}"]="mentalspace-insert-database"
ROUTES["PUT /update/{table}"]="mentalspace-update-database"
ROUTES["POST /delete/{table}"]="mentalspace-delete-database"

for ROUTE_KEY in "${!ROUTES[@]}"; do
  FUNCTION_NAME="${ROUTES[$ROUTE_KEY]}"
  echo "→ Configuring $ROUTE_KEY"

  LAMBDA_ARN=$(aws lambda get-function \
    --function-name $FUNCTION_NAME \
    --region $AWS_REGION \
    --query 'Configuration.FunctionArn' \
    --output text)

  # Create integration
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

  # Create route
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

  # Permission
  aws lambda add-permission \
    --function-name $FUNCTION_NAME \
    --statement-id "apigateway-${API_ID}-${ROUTE_KEY// /-}" \
    --action lambda:InvokeFunction \
    --principal apigateway.amazonaws.com \
    --source-arn "arn:aws:execute-api:${AWS_REGION}:${ACCOUNT_ID}:${API_ID}/*" \
    --region $AWS_REGION 2>/dev/null || true

  echo "✅ $ROUTE_KEY configured"
done

# Deploy
aws apigatewayv2 create-deployment \
  --api-id $API_ID \
  --stage-name prod \
  --region $AWS_REGION > /dev/null

echo ""
echo "🎉 API Gateway Updated!"
echo "✅ https://g4fv3te9nf.execute-api.us-east-1.amazonaws.com/prod"
echo ""
echo "Your application is ready! Refresh your browser."
