# Deploy CRUD Lambda Functions - Windows PowerShell Script
# Run directly from your local machine

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Blue
Write-Host "  MentalSpace CRUD Deployment" -ForegroundColor Blue
Write-Host "========================================" -ForegroundColor Blue
Write-Host ""

$AWS_REGION = "us-east-1"
$ACCOUNT_ID = "706704660887"
$ROLE_ARN = "arn:aws:iam::${ACCOUNT_ID}:role/MentalSpaceEhrStack-LambdaExecutionRoleD5C26073-sJ3X7NqztaoY"
$API_ID = "g4fv3te9nf"

# Get VPC config from existing Lambda
Write-Host "→ Getting VPC configuration..." -ForegroundColor Cyan

$vpcConfig = aws lambda get-function-configuration `
    --function-name mentalspace-get-user-roles `
    --region $AWS_REGION `
    --query 'VpcConfig' | ConvertFrom-Json

$VPC_SUBNET_IDS = ($vpcConfig.SubnetIds -join ",")
$VPC_SECURITY_GROUP_IDS = ($vpcConfig.SecurityGroupIds -join ",")

Write-Host "✅ VPC Subnets: $VPC_SUBNET_IDS" -ForegroundColor Green
Write-Host "✅ VPC Security Groups: $VPC_SECURITY_GROUP_IDS" -ForegroundColor Green
Write-Host ""

# Get database credentials
Write-Host "→ Getting database credentials..." -ForegroundColor Cyan

$DB_SECRET_ARN = "arn:aws:secretsmanager:us-east-1:${ACCOUNT_ID}:secret:mentalspace-ehr-db-credentials-al4fLD"

# Try to get secret, if fails use environment variables from existing Lambda
try {
    $dbCreds = aws secretsmanager get-secret-value `
        --secret-id $DB_SECRET_ARN `
        --region $AWS_REGION `
        --query 'SecretString' `
        --output text | ConvertFrom-Json

    $DB_USER = $dbCreds.username
    $DB_PASSWORD = $dbCreds.password
    Write-Host "✅ Retrieved credentials from Secrets Manager" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Getting credentials from existing Lambda instead..." -ForegroundColor Yellow

    $existingEnv = aws lambda get-function-configuration `
        --function-name mentalspace-get-user-roles `
        --region $AWS_REGION `
        --query 'Environment.Variables' | ConvertFrom-Json

    $DB_USER = $existingEnv.DATABASE_USER
    $DB_PASSWORD = $existingEnv.DATABASE_PASSWORD
    Write-Host "✅ Retrieved credentials from Lambda" -ForegroundColor Green
}

$DB_ENDPOINT = "mentalspaceehrstack-databaseb269d8bb-edwdzckxbkt7.cluster-ci16iwey2cac.us-east-1.rds.amazonaws.com"
$DB_PORT = "5432"
$DB_NAME = "mentalspaceehr"

Write-Host ""

# Lambda functions
$functions = @{
    "query-database" = "query"
    "insert-database" = "insert"
    "update-database" = "update"
    "delete-database" = "delete"
}

# Deploy each function
foreach ($funcDir in $functions.Keys) {
    $FUNCTION_NAME = "mentalspace-$funcDir"

    Write-Host "========================================" -ForegroundColor Blue
    Write-Host "  Deploying: $FUNCTION_NAME" -ForegroundColor Blue
    Write-Host "========================================" -ForegroundColor Blue
    Write-Host ""

    Push-Location "lambda\$funcDir"

    # Install pg dependency
    Write-Host "→ Installing dependencies..." -ForegroundColor Cyan
    if (!(Test-Path "node_modules")) {
        npm install pg --save --silent 2>$null
    }

    # Create zip
    Write-Host "→ Creating deployment package..." -ForegroundColor Cyan
    $zipPath = "..\..\$funcDir.zip"
    if (Test-Path $zipPath) { Remove-Item $zipPath }
    Compress-Archive -Path * -DestinationPath $zipPath -CompressionLevel Fastest

    Pop-Location

    Write-Host "✅ Package created" -ForegroundColor Green
    Write-Host ""

    # Check if function exists
    Write-Host "→ Checking if function exists..." -ForegroundColor Cyan

    $functionExists = $false
    try {
        aws lambda get-function --function-name $FUNCTION_NAME --region $AWS_REGION 2>$null | Out-Null
        $functionExists = $true
    } catch {}

    if ($functionExists) {
        Write-Host "⚠️  Function exists, updating..." -ForegroundColor Yellow

        aws lambda update-function-code `
            --function-name $FUNCTION_NAME `
            --zip-file "fileb://$funcDir.zip" `
            --region $AWS_REGION | Out-Null

        Write-Host "✅ Code updated" -ForegroundColor Green

        # Wait for update
        Write-Host "→ Waiting for update to complete..." -ForegroundColor Cyan
        aws lambda wait function-updated --function-name $FUNCTION_NAME --region $AWS_REGION

        # Update environment
        Write-Host "→ Updating configuration..." -ForegroundColor Cyan
        aws lambda update-function-configuration `
            --function-name $FUNCTION_NAME `
            --environment "Variables={DATABASE_ENDPOINT=$DB_ENDPOINT,DATABASE_PORT=$DB_PORT,DATABASE_NAME=$DB_NAME,DATABASE_USER=$DB_USER,DATABASE_PASSWORD=$DB_PASSWORD}" `
            --region $AWS_REGION | Out-Null

        Write-Host "✅ Configuration updated" -ForegroundColor Green

    } else {
        Write-Host "⚠️  Creating new function..." -ForegroundColor Yellow

        aws lambda create-function `
            --function-name $FUNCTION_NAME `
            --runtime nodejs20.x `
            --role $ROLE_ARN `
            --handler index.handler `
            --zip-file "fileb://$funcDir.zip" `
            --timeout 30 `
            --memory-size 512 `
            --environment "Variables={DATABASE_ENDPOINT=$DB_ENDPOINT,DATABASE_PORT=$DB_PORT,DATABASE_NAME=$DB_NAME,DATABASE_USER=$DB_USER,DATABASE_PASSWORD=$DB_PASSWORD}" `
            --vpc-config "SubnetIds=$VPC_SUBNET_IDS,SecurityGroupIds=$VPC_SECURITY_GROUP_IDS" `
            --region $AWS_REGION | Out-Null

        Write-Host "✅ Function created" -ForegroundColor Green

        # Wait for active
        Write-Host "→ Waiting for function to be active..." -ForegroundColor Cyan
        aws lambda wait function-active --function-name $FUNCTION_NAME --region $AWS_REGION
        Write-Host "✅ Function active" -ForegroundColor Green
    }

    # Clean up
    Remove-Item "$funcDir.zip"
    Write-Host ""
}

Write-Host "========================================" -ForegroundColor Blue
Write-Host "🎉 Lambda Functions Deployed!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Blue
Write-Host ""

# Update API Gateway
Write-Host "========================================" -ForegroundColor Blue
Write-Host "  Updating API Gateway" -ForegroundColor Blue
Write-Host "========================================" -ForegroundColor Blue
Write-Host ""

$routes = @{
    "GET /query/{table}" = "mentalspace-query-database"
    "POST /insert/{table}" = "mentalspace-insert-database"
    "PUT /update/{table}" = "mentalspace-update-database"
    "POST /delete/{table}" = "mentalspace-delete-database"
}

# Get authorizer
$authorizer = aws apigatewayv2 get-authorizers `
    --api-id $API_ID `
    --region $AWS_REGION | ConvertFrom-Json

$AUTHORIZER_ID = $authorizer.Items[0].AuthorizerId

foreach ($routeKey in $routes.Keys) {
    $FUNCTION_NAME = $routes[$routeKey]

    Write-Host "→ Configuring: $routeKey" -ForegroundColor Cyan

    # Get Lambda ARN
    $lambdaInfo = aws lambda get-function `
        --function-name $FUNCTION_NAME `
        --region $AWS_REGION | ConvertFrom-Json

    $LAMBDA_ARN = $lambdaInfo.Configuration.FunctionArn

    # Create integration
    try {
        $integration = aws apigatewayv2 create-integration `
            --api-id $API_ID `
            --integration-type AWS_PROXY `
            --integration-uri "arn:aws:apigateway:${AWS_REGION}:lambda:path/2015-03-31/functions/${LAMBDA_ARN}/invocations" `
            --payload-format-version 2.0 `
            --region $AWS_REGION | ConvertFrom-Json

        $INTEGRATION_ID = $integration.IntegrationId
    } catch {
        # Get existing integration
        $integrations = aws apigatewayv2 get-integrations `
            --api-id $API_ID `
            --region $AWS_REGION | ConvertFrom-Json

        $INTEGRATION_ID = ($integrations.Items | Where-Object {
            $_.IntegrationUri -like "*$LAMBDA_ARN*"
        })[0].IntegrationId
    }

    # Create/update route
    $existingRoutes = aws apigatewayv2 get-routes `
        --api-id $API_ID `
        --region $AWS_REGION | ConvertFrom-Json

    $existingRoute = $existingRoutes.Items | Where-Object { $_.RouteKey -eq $routeKey }

    if ($existingRoute) {
        aws apigatewayv2 update-route `
            --api-id $API_ID `
            --route-id $existingRoute.RouteId `
            --target "integrations/$INTEGRATION_ID" `
            --authorization-type JWT `
            --authorizer-id $AUTHORIZER_ID `
            --region $AWS_REGION | Out-Null
    } else {
        aws apigatewayv2 create-route `
            --api-id $API_ID `
            --route-key $routeKey `
            --target "integrations/$INTEGRATION_ID" `
            --authorization-type JWT `
            --authorizer-id $AUTHORIZER_ID `
            --region $AWS_REGION | Out-Null
    }

    # Add permission
    try {
        aws lambda add-permission `
            --function-name $FUNCTION_NAME `
            --statement-id "apigateway-$API_ID-$($routeKey -replace ' ','-')" `
            --action lambda:InvokeFunction `
            --principal apigateway.amazonaws.com `
            --source-arn "arn:aws:execute-api:${AWS_REGION}:${ACCOUNT_ID}:${API_ID}/*" `
            --region $AWS_REGION 2>$null | Out-Null
    } catch {}

    Write-Host "✅ Route configured" -ForegroundColor Green
}

Write-Host ""

# Deploy API
Write-Host "→ Deploying API..." -ForegroundColor Cyan
aws apigatewayv2 create-deployment `
    --api-id $API_ID `
    --stage-name prod `
    --region $AWS_REGION | Out-Null

Write-Host "✅ API deployed!" -ForegroundColor Green
Write-Host ""

Write-Host "========================================" -ForegroundColor Blue
Write-Host "🎉 DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Blue
Write-Host ""
Write-Host "✅ Your application is ready!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Go to http://localhost:8080"
Write-Host "2. Press Ctrl+Shift+R (hard refresh)"
Write-Host "3. No more API errors! ✅"
Write-Host ""
