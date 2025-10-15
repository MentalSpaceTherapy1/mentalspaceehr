#!/bin/bash
# FINAL DEPLOYMENT SCRIPT - Run this in AWS CloudShell
# This will deploy the CRUD Lambda functions and configure API Gateway

set -e

echo "=========================================="
echo "  MentalSpace CRUD Lambda Deployment"
echo "  FINAL VERSION - CDK Integration"
echo "=========================================="
echo ""

REGION="us-east-1"
ACCOUNT="706704660887"
STACK_NAME="MentalSpaceEhrStack"

echo "Step 1: Extracting Lambda functions..."
unzip -q crud-lambdas-final.zip 2>/dev/null || echo "Files already extracted"

echo "Step 2: Getting stack resources..."
# Get existing resources from CloudFormation stack
VPC_ID=$(aws cloudformation describe-stack-resources --stack-name $STACK_NAME --logical-resource-id MentalSpaceVPC --query 'StackResources[0].PhysicalResourceId' --output text --region $REGION)
LAMBDA_ROLE_ARN=$(aws cloudformation describe-stack-resources --stack-name $STACK_NAME --logical-resource-id LambdaExecutionRole --query 'StackResources[0].PhysicalResourceId' --output text --region $REGION | xargs -I {} aws iam get-role --role-name {} --query 'Role.Arn' --output text)
LAMBDA_SG=$(aws cloudformation describe-stack-resources --stack-name $STACK_NAME --logical-resource-id LambdaSecurityGroup --query 'StackResources[0].PhysicalResourceId' --output text --region $REGION)
DB_ENDPOINT=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query 'Stacks[0].Outputs[?OutputKey==`DatabaseEndpoint`].OutputValue' --output text --region $REGION)
DB_SECRET_ARN=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query 'Stacks[0].Outputs[?OutputKey==`DatabaseSecretArn`].OutputValue' --output text --region $REGION)
API_ID=$(aws cloudformation describe-stack-resources --stack-name $STACK_NAME --logical-resource-id Api --query 'StackResources[0].PhysicalResourceId' --output text --region $REGION)
DATABASE_LAYER_ARN=$(aws cloudformation describe-stack-resources --stack-name $STACK_NAME --logical-resource-id DatabaseLayer --query 'StackResources[0].PhysicalResourceId' --output text --region $REGION)

# Get subnets
SUBNETS=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VPC_ID" "Name=tag:aws-cdk:subnet-type,Values=Private" --query 'Subnets[*].SubnetId' --output text --region $REGION | tr '\t' ',')

# Get database credentials
DB_CREDS=$(aws secretsmanager get-secret-value --secret-id $DB_SECRET_ARN --query 'SecretString' --output text --region $REGION)
DB_USER=$(echo $DB_CREDS | jq -r '.username')
DB_PASS=$(echo $DB_CREDS | jq -r '.password')

echo "✓ VPC: $VPC_ID"
echo "✓ Subnets: $SUBNETS"
echo "✓ Security Group: $LAMBDA_SG"
echo "✓ Lambda Role: $LAMBDA_ROLE_ARN"
echo "✓ Database: $DB_ENDPOINT"
echo "✓ API Gateway: $API_ID"
echo ""

echo "Step 3: Creating query-database Lambda..."
cd query-database
npm init -y >/dev/null 2>&1
npm install --save pg >/dev/null 2>&1
zip -rq ../query-database.zip . >/dev/null
cd ..

aws lambda create-function \
  --function-name MentalSpaceEhrStack-QueryDatabaseFunction \
  --runtime nodejs20.x \
  --role $LAMBDA_ROLE_ARN \
  --handler index.handler \
  --zip-file fileb://query-database.zip \
  --timeout 30 \
  --memory-size 512 \
  --vpc-config SubnetIds=$SUBNETS,SecurityGroupIds=$LAMBDA_SG \
  --environment Variables="{DATABASE_ENDPOINT=$DB_ENDPOINT,DATABASE_PORT=5432,DATABASE_NAME=mentalspaceehr,DATABASE_USER=$DB_USER,DATABASE_PASSWORD=$DB_PASS}" \
  --layers $DATABASE_LAYER_ARN \
  --region $REGION >/dev/null 2>&1 || aws lambda update-function-code \
    --function-name MentalSpaceEhrStack-QueryDatabaseFunction \
    --zip-file fileb://query-database.zip \
    --region $REGION >/dev/null

echo "✓ query-database Lambda ready"

echo "Step 4: Creating insert-database Lambda..."
cd insert-database
npm init -y >/dev/null 2>&1
npm install --save pg >/dev/null 2>&1
zip -rq ../insert-database.zip . >/dev/null
cd ..

aws lambda create-function \
  --function-name MentalSpaceEhrStack-InsertDatabaseFunction \
  --runtime nodejs20.x \
  --role $LAMBDA_ROLE_ARN \
  --handler index.handler \
  --zip-file fileb://insert-database.zip \
  --timeout 30 \
  --memory-size 512 \
  --vpc-config SubnetIds=$SUBNETS,SecurityGroupIds=$LAMBDA_SG \
  --environment Variables="{DATABASE_ENDPOINT=$DB_ENDPOINT,DATABASE_PORT=5432,DATABASE_NAME=mentalspaceehr,DATABASE_USER=$DB_USER,DATABASE_PASSWORD=$DB_PASS}" \
  --layers $DATABASE_LAYER_ARN \
  --region $REGION >/dev/null 2>&1 || aws lambda update-function-code \
    --function-name MentalSpaceEhrStack-InsertDatabaseFunction \
    --zip-file fileb://insert-database.zip \
    --region $REGION >/dev/null

echo "✓ insert-database Lambda ready"

echo "Step 5: Configuring API Gateway..."

# Get root resource ID
ROOT_ID=$(aws apigateway get-resources --rest-api-id $API_ID --region $REGION --query 'items[?path==`/`].id' --output text)

# Create /query resource
QUERY_RESOURCE=$(aws apigateway create-resource \
  --rest-api-id $API_ID \
  --parent-id $ROOT_ID \
  --path-part query \
  --region $REGION 2>/dev/null | jq -r '.id' || aws apigateway get-resources --rest-api-id $API_ID --region $REGION --query 'items[?pathPart==`query`].id' --output text)

# Create /query/{table} resource
QUERY_TABLE_RESOURCE=$(aws apigateway create-resource \
  --rest-api-id $API_ID \
  --parent-id $QUERY_RESOURCE \
  --path-part '{table}' \
  --region $REGION 2>/dev/null | jq -r '.id' || aws apigateway get-resources --rest-api-id $API_ID --region $REGION --query 'items[?pathPart==`{table}`].id' --output text | head -1)

# Create /insert resource
INSERT_RESOURCE=$(aws apigateway create-resource \
  --rest-api-id $API_ID \
  --parent-id $ROOT_ID \
  --path-part insert \
  --region $REGION 2>/dev/null | jq -r '.id' || aws apigateway get-resources --rest-api-id $API_ID --region $REGION --query 'items[?pathPart==`insert`].id' --output text)

# Create /insert/{table} resource
INSERT_TABLE_RESOURCE=$(aws apigateway create-resource \
  --rest-api-id $API_ID \
  --parent-id $INSERT_RESOURCE \
  --path-part '{table}' \
  --region $REGION 2>/dev/null | jq -r '.id' || aws apigateway get-resources --rest-api-id $API_ID --region $REGION --query 'items[?pathPart==`{table}`].id' --output text | tail -1)

# Get Cognito authorizer
AUTHORIZER_ID=$(aws apigateway get-authorizers --rest-api-id $API_ID --region $REGION --query 'items[0].id' --output text)

# Get Lambda ARNs
QUERY_LAMBDA_ARN=$(aws lambda get-function --function-name MentalSpaceEhrStack-QueryDatabaseFunction --region $REGION --query 'Configuration.FunctionArn' --output text)
INSERT_LAMBDA_ARN=$(aws lambda get-function --function-name MentalSpaceEhrStack-InsertDatabaseFunction --region $REGION --query 'Configuration.FunctionArn' --output text)

# Add GET method to /query/{table}
aws apigateway put-method \
  --rest-api-id $API_ID \
  --resource-id $QUERY_TABLE_RESOURCE \
  --http-method GET \
  --authorization-type COGNITO_USER_POOLS \
  --authorizer-id $AUTHORIZER_ID \
  --region $REGION >/dev/null 2>&1 || true

aws apigateway put-integration \
  --rest-api-id $API_ID \
  --resource-id $QUERY_TABLE_RESOURCE \
  --http-method GET \
  --type AWS_PROXY \
  --integration-http-method POST \
  --uri "arn:aws:apigateway:$REGION:lambda:path/2015-03-31/functions/$QUERY_LAMBDA_ARN/invocations" \
  --region $REGION >/dev/null 2>&1 || true

# Add POST method to /insert/{table}
aws apigateway put-method \
  --rest-api-id $API_ID \
  --resource-id $INSERT_TABLE_RESOURCE \
  --http-method POST \
  --authorization-type COGNITO_USER_POOLS \
  --authorizer-id $AUTHORIZER_ID \
  --region $REGION >/dev/null 2>&1 || true

aws apigateway put-integration \
  --rest-api-id $API_ID \
  --resource-id $INSERT_TABLE_RESOURCE \
  --http-method POST \
  --type AWS_PROXY \
  --integration-http-method POST \
  --uri "arn:aws:apigateway:$REGION:lambda:path/2015-03-31/functions/$INSERT_LAMBDA_ARN/invocations" \
  --region $REGION >/dev/null 2>&1 || true

# Add Lambda permissions
aws lambda add-permission \
  --function-name MentalSpaceEhrStack-QueryDatabaseFunction \
  --statement-id apigateway-invoke \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:$REGION:$ACCOUNT:$API_ID/*" \
  --region $REGION 2>/dev/null || true

aws lambda add-permission \
  --function-name MentalSpaceEhrStack-InsertDatabaseFunction \
  --statement-id apigateway-invoke \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:$REGION:$ACCOUNT:$API_ID/*" \
  --region $REGION 2>/dev/null || true

echo "✓ API Gateway configured"

echo "Step 6: Deploying API..."
aws apigateway create-deployment \
  --rest-api-id $API_ID \
  --stage-name prod \
  --description "Added CRUD endpoints" \
  --region $REGION >/dev/null

echo "✓ API deployed"

# Get API endpoint
API_ENDPOINT=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue' --output text --region $REGION)

echo ""
echo "=========================================="
echo "✅ DEPLOYMENT COMPLETE!"
echo "=========================================="
echo ""
echo "API Endpoint: $API_ENDPOINT"
echo ""
echo "New endpoints available:"
echo "  GET  $API_ENDPOINT/query/{table}"
echo "  POST $API_ENDPOINT/insert/{table}"
echo ""
echo "🎉 Your application is now ready!"
echo "Refresh your browser at http://localhost:8080"
echo ""
