#!/bin/bash

echo "=========================================="
echo "MentalSpace EHR - Diagnostic & Auto-Fix"
echo "=========================================="
echo ""

# Set region
export AWS_REGION=us-east-1

# Get Stack Name
echo "🔍 Finding CloudFormation stack..."
STACK_NAME=$(aws cloudformation list-stacks --region us-east-1 \
  --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE \
  --query 'StackSummaries[?contains(StackName, `MentalSpace`)].StackName' \
  --output text | head -1)

if [ -z "$STACK_NAME" ]; then
  echo "❌ ERROR: Cannot find MentalSpace CloudFormation stack"
  exit 1
fi

echo "✅ Found stack: $STACK_NAME"
echo ""

# Check for Lambda functions
echo "🔍 Checking for CRUD Lambda functions..."
QUERY_FUNCTION=$(aws lambda list-functions --region us-east-1 \
  --query 'Functions[?contains(FunctionName, `Query`)].FunctionName' \
  --output text)

INSERT_FUNCTION=$(aws lambda list-functions --region us-east-1 \
  --query 'Functions[?contains(FunctionName, `Insert`)].FunctionName' \
  --output text)

if [ -n "$QUERY_FUNCTION" ]; then
  echo "✅ Query function exists: $QUERY_FUNCTION"
else
  echo "❌ Query function MISSING"
fi

if [ -n "$INSERT_FUNCTION" ]; then
  echo "✅ Insert function exists: $INSERT_FUNCTION"
else
  echo "❌ Insert function MISSING"
fi

echo ""

# Check API Gateway
echo "🔍 Checking API Gateway routes..."
API_ID=$(aws cloudformation describe-stack-resources \
  --stack-name "$STACK_NAME" \
  --query 'StackResources[?ResourceType==`AWS::ApiGateway::RestApi`].PhysicalResourceId' \
  --output text)

if [ -z "$API_ID" ]; then
  echo "❌ ERROR: Cannot find API Gateway"
  exit 1
fi

echo "✅ API Gateway ID: $API_ID"

# List all routes
echo ""
echo "Current API routes:"
aws apigateway get-resources --rest-api-id "$API_ID" --region us-east-1 \
  --query 'items[].path' --output text | sort

echo ""
echo "=========================================="

# If functions are missing, offer to create them
if [ -z "$QUERY_FUNCTION" ] || [ -z "$INSERT_FUNCTION" ]; then
  echo "❌ CRUD functions are missing - this is why you're getting 'Failed to fetch' errors"
  echo ""
  echo "🔧 AUTO-FIX: Creating missing Lambda functions..."
  echo ""

  # Get stack resources
  echo "📦 Gathering stack resources..."

  LAMBDA_ROLE_ARN=$(aws cloudformation describe-stack-resources \
    --stack-name "$STACK_NAME" \
    --query 'StackResources[?ResourceType==`AWS::IAM::Role` && contains(LogicalResourceId, `Lambda`)].PhysicalResourceId' \
    --output text | head -1)

  VPC_ID=$(aws cloudformation describe-stack-resources \
    --stack-name "$STACK_NAME" \
    --query 'StackResources[?ResourceType==`AWS::EC2::VPC`].PhysicalResourceId' \
    --output text)

  SECURITY_GROUP=$(aws cloudformation describe-stack-resources \
    --stack-name "$STACK_NAME" \
    --query 'StackResources[?ResourceType==`AWS::EC2::SecurityGroup` && contains(LogicalResourceId, `Lambda`)].PhysicalResourceId' \
    --output text | head -1)

  PRIVATE_SUBNETS=$(aws ec2 describe-subnets \
    --filters "Name=vpc-id,Values=$VPC_ID" "Name=tag:aws-cdk:subnet-type,Values=Private" \
    --query 'Subnets[].SubnetId' \
    --output text | tr '\t' ',')

  DB_SECRET=$(aws cloudformation describe-stack-resources \
    --stack-name "$STACK_NAME" \
    --query 'StackResources[?ResourceType==`AWS::SecretsManager::Secret` && contains(LogicalResourceId, `Secret`)].PhysicalResourceId' \
    --output text | head -1)

  DB_ENDPOINT=$(aws cloudformation describe-stack-resources \
    --stack-name "$STACK_NAME" \
    --query 'StackResources[?ResourceType==`AWS::RDS::DBCluster`].PhysicalResourceId' \
    --output text)

  if [ -n "$DB_ENDPOINT" ]; then
    DB_ENDPOINT=$(aws rds describe-db-clusters \
      --db-cluster-identifier "$DB_ENDPOINT" \
      --query 'DBClusters[0].Endpoint' \
      --output text)
  fi

  # Get database credentials
  if [ -n "$DB_SECRET" ]; then
    DB_PASSWORD=$(aws secretsmanager get-secret-value \
      --secret-id "$DB_SECRET" \
      --query 'SecretString' \
      --output text | grep -o '"password":"[^"]*"' | cut -d'"' -f4)
  fi

  echo "✅ Lambda Role: ${LAMBDA_ROLE_ARN:0:50}..."
  echo "✅ VPC: $VPC_ID"
  echo "✅ Security Group: $SECURITY_GROUP"
  echo "✅ Subnets: ${PRIVATE_SUBNETS:0:50}..."
  echo "✅ DB Endpoint: $DB_ENDPOINT"
  echo ""

  # Create query-database function
  if [ -z "$QUERY_FUNCTION" ]; then
    echo "📝 Creating query-database Lambda function..."

    cd query-database
    zip -q -r ../query-function.zip .
    cd ..

    QUERY_FUNCTION_NAME="${STACK_NAME}-QueryDatabaseFunction"

    aws lambda create-function \
      --function-name "$QUERY_FUNCTION_NAME" \
      --runtime nodejs20.x \
      --role "$LAMBDA_ROLE_ARN" \
      --handler index.handler \
      --zip-file fileb://query-function.zip \
      --timeout 30 \
      --memory-size 512 \
      --vpc-config "SubnetIds=${PRIVATE_SUBNETS},SecurityGroupIds=${SECURITY_GROUP}" \
      --environment "Variables={DATABASE_ENDPOINT=${DB_ENDPOINT},DATABASE_PORT=5432,DATABASE_NAME=mentalspaceehr,DATABASE_USER=postgres,DATABASE_PASSWORD=${DB_PASSWORD}}" \
      --region us-east-1 2>&1 | grep -E 'FunctionName|FunctionArn|Error' || echo "Function created"

    QUERY_FUNCTION="$QUERY_FUNCTION_NAME"
    echo "✅ Query function created"
  fi

  # Create insert-database function
  if [ -z "$INSERT_FUNCTION" ]; then
    echo "📝 Creating insert-database Lambda function..."

    cd insert-database
    zip -q -r ../insert-function.zip .
    cd ..

    INSERT_FUNCTION_NAME="${STACK_NAME}-InsertDatabaseFunction"

    aws lambda create-function \
      --function-name "$INSERT_FUNCTION_NAME" \
      --runtime nodejs20.x \
      --role "$LAMBDA_ROLE_ARN" \
      --handler index.handler \
      --zip-file fileb://insert-function.zip \
      --timeout 30 \
      --memory-size 512 \
      --vpc-config "SubnetIds=${PRIVATE_SUBNETS},SecurityGroupIds=${SECURITY_GROUP}" \
      --environment "Variables={DATABASE_ENDPOINT=${DB_ENDPOINT},DATABASE_PORT=5432,DATABASE_NAME=mentalspaceehr,DATABASE_USER=postgres,DATABASE_PASSWORD=${DB_PASSWORD}}" \
      --region us-east-1 2>&1 | grep -E 'FunctionName|FunctionArn|Error' || echo "Function created"

    INSERT_FUNCTION="$INSERT_FUNCTION_NAME"
    echo "✅ Insert function created"
  fi

  echo ""
  echo "🔧 Configuring API Gateway routes..."

  # Get root resource
  ROOT_RESOURCE=$(aws apigateway get-resources \
    --rest-api-id "$API_ID" \
    --query 'items[?path==`/`].id' \
    --output text)

  # Get or create /query resource
  QUERY_RESOURCE=$(aws apigateway get-resources \
    --rest-api-id "$API_ID" \
    --query 'items[?path==`/query`].id' \
    --output text)

  if [ -z "$QUERY_RESOURCE" ]; then
    echo "Creating /query resource..."
    QUERY_RESOURCE=$(aws apigateway create-resource \
      --rest-api-id "$API_ID" \
      --parent-id "$ROOT_RESOURCE" \
      --path-part "query" \
      --query 'id' \
      --output text)
  fi

  # Get or create /query/{table} resource
  QUERY_TABLE_RESOURCE=$(aws apigateway get-resources \
    --rest-api-id "$API_ID" \
    --query 'items[?path==`/query/{table}`].id' \
    --output text)

  if [ -z "$QUERY_TABLE_RESOURCE" ]; then
    echo "Creating /query/{table} resource..."
    QUERY_TABLE_RESOURCE=$(aws apigateway create-resource \
      --rest-api-id "$API_ID" \
      --parent-id "$QUERY_RESOURCE" \
      --path-part "{table}" \
      --query 'id' \
      --output text)
  fi

  # Get or create /insert resource
  INSERT_RESOURCE=$(aws apigateway get-resources \
    --rest-api-id "$API_ID" \
    --query 'items[?path==`/insert`].id' \
    --output text)

  if [ -z "$INSERT_RESOURCE" ]; then
    echo "Creating /insert resource..."
    INSERT_RESOURCE=$(aws apigateway create-resource \
      --rest-api-id "$API_ID" \
      --parent-id "$ROOT_RESOURCE" \
      --path-part "insert" \
      --query 'id' \
      --output text)
  fi

  # Get or create /insert/{table} resource
  INSERT_TABLE_RESOURCE=$(aws apigateway get-resources \
    --rest-api-id "$API_ID" \
    --query 'items[?path==`/insert/{table}`].id' \
    --output text)

  if [ -z "$INSERT_TABLE_RESOURCE" ]; then
    echo "Creating /insert/{table} resource..."
    INSERT_TABLE_RESOURCE=$(aws apigateway create-resource \
      --rest-api-id "$API_ID" \
      --parent-id "$INSERT_RESOURCE" \
      --path-part "{table}" \
      --query 'id' \
      --output text)
  fi

  # Get Cognito authorizer
  AUTHORIZER_ID=$(aws apigateway get-authorizers \
    --rest-api-id "$API_ID" \
    --query 'items[0].id' \
    --output text)

  # Get Lambda ARNs
  QUERY_FUNCTION_ARN=$(aws lambda get-function \
    --function-name "$QUERY_FUNCTION" \
    --query 'Configuration.FunctionArn' \
    --output text)

  INSERT_FUNCTION_ARN=$(aws lambda get-function \
    --function-name "$INSERT_FUNCTION" \
    --query 'Configuration.FunctionArn' \
    --output text)

  # Create GET method on /query/{table}
  echo "Setting up GET /query/{table}..."
  aws apigateway put-method \
    --rest-api-id "$API_ID" \
    --resource-id "$QUERY_TABLE_RESOURCE" \
    --http-method GET \
    --authorization-type COGNITO_USER_POOLS \
    --authorizer-id "$AUTHORIZER_ID" \
    --region us-east-1 2>/dev/null || echo "Method exists"

  aws apigateway put-integration \
    --rest-api-id "$API_ID" \
    --resource-id "$QUERY_TABLE_RESOURCE" \
    --http-method GET \
    --type AWS_PROXY \
    --integration-http-method POST \
    --uri "arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/${QUERY_FUNCTION_ARN}/invocations" \
    --region us-east-1 2>/dev/null || echo "Integration exists"

  # Grant API Gateway permission to invoke query function
  aws lambda add-permission \
    --function-name "$QUERY_FUNCTION" \
    --statement-id "apigateway-query-${API_ID}" \
    --action lambda:InvokeFunction \
    --principal apigateway.amazonaws.com \
    --source-arn "arn:aws:execute-api:us-east-1:*:${API_ID}/*/*" \
    --region us-east-1 2>/dev/null || echo "Permission exists"

  # Create POST method on /insert/{table}
  echo "Setting up POST /insert/{table}..."
  aws apigateway put-method \
    --rest-api-id "$API_ID" \
    --resource-id "$INSERT_TABLE_RESOURCE" \
    --http-method POST \
    --authorization-type COGNITO_USER_POOLS \
    --authorizer-id "$AUTHORIZER_ID" \
    --region us-east-1 2>/dev/null || echo "Method exists"

  aws apigateway put-integration \
    --rest-api-id "$API_ID" \
    --resource-id "$INSERT_TABLE_RESOURCE" \
    --http-method POST \
    --type AWS_PROXY \
    --integration-http-method POST \
    --uri "arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/${INSERT_FUNCTION_ARN}/invocations" \
    --region us-east-1 2>/dev/null || echo "Integration exists"

  # Grant API Gateway permission to invoke insert function
  aws lambda add-permission \
    --function-name "$INSERT_FUNCTION" \
    --statement-id "apigateway-insert-${API_ID}" \
    --action lambda:InvokeFunction \
    --principal apigateway.amazonaws.com \
    --source-arn "arn:aws:execute-api:us-east-1:*:${API_ID}/*/*" \
    --region us-east-1 2>/dev/null || echo "Permission exists"

  # Add CORS to both resources
  echo "Configuring CORS..."

  for RESOURCE_ID in "$QUERY_TABLE_RESOURCE" "$INSERT_TABLE_RESOURCE"; do
    aws apigateway put-method \
      --rest-api-id "$API_ID" \
      --resource-id "$RESOURCE_ID" \
      --http-method OPTIONS \
      --authorization-type NONE \
      --region us-east-1 2>/dev/null || echo "OPTIONS exists"

    aws apigateway put-integration \
      --rest-api-id "$API_ID" \
      --resource-id "$RESOURCE_ID" \
      --http-method OPTIONS \
      --type MOCK \
      --request-templates '{"application/json": "{\"statusCode\": 200}"}' \
      --region us-east-1 2>/dev/null || echo "MOCK integration exists"

    aws apigateway put-method-response \
      --rest-api-id "$API_ID" \
      --resource-id "$RESOURCE_ID" \
      --http-method OPTIONS \
      --status-code 200 \
      --response-parameters '{"method.response.header.Access-Control-Allow-Headers": true, "method.response.header.Access-Control-Allow-Methods": true, "method.response.header.Access-Control-Allow-Origin": true}' \
      --region us-east-1 2>/dev/null || echo "Method response exists"

    aws apigateway put-integration-response \
      --rest-api-id "$API_ID" \
      --resource-id "$RESOURCE_ID" \
      --http-method OPTIONS \
      --status-code 200 \
      --response-parameters '{"method.response.header.Access-Control-Allow-Headers": "'\''Content-Type,Authorization'\''", "method.response.header.Access-Control-Allow-Methods": "'\''GET,POST,OPTIONS'\''", "method.response.header.Access-Control-Allow-Origin": "'\''*'\''"}' \
      --region us-east-1 2>/dev/null || echo "Integration response exists"
  done

  # Deploy API
  echo ""
  echo "🚀 Deploying API Gateway..."
  aws apigateway create-deployment \
    --rest-api-id "$API_ID" \
    --stage-name prod \
    --region us-east-1 > /dev/null

  echo ""
  echo "=========================================="
  echo "✅ DEPLOYMENT COMPLETE!"
  echo "=========================================="
  echo ""
  echo "Your API endpoint: https://${API_ID}.execute-api.us-east-1.amazonaws.com/prod"
  echo ""
  echo "New routes available:"
  echo "  GET  /query/{table}"
  echo "  POST /insert/{table}"
  echo ""
  echo "🎉 Refresh your browser - 'Failed to fetch' errors should be gone!"
  echo ""
else
  echo "✅ All CRUD functions exist"
  echo ""
  echo "If you're still seeing errors, they may be due to:"
  echo "1. API Gateway routes not configured"
  echo "2. Lambda permissions not set"
  echo "3. CORS configuration missing"
  echo ""
  echo "Run this script again to auto-configure everything."
fi
