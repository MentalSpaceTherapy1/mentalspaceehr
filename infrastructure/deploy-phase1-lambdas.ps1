# Automated Phase 1 Lambda Deployment Script (PowerShell)
# Deploys 15 critical functions to AWS Lambda
# Account: 706704660887 | Region: us-east-1

$ErrorActionPreference = "Stop"

# AWS Configuration (UPDATE THESE!)
$AWS_REGION = "us-east-1"
$LAMBDA_ROLE_ARN = "arn:aws:iam::706704660887:role/MentalSpaceEhrStack-LambdaExecutionRole-xxxxx"
$DATABASE_SECRET_ARN = "arn:aws:secretsmanager:us-east-1:706704660887:secret:mentalspace-ehr-db-credentials-al4fLD"
$DATABASE_NAME = "mentalspaceehr"
$COGNITO_USER_POOL_ID = "us-east-1_xxxxx"  # UPDATE THIS
$VPC_ID = "vpc-xxxxx"  # UPDATE THIS
$SUBNET_ID_1 = "subnet-xxxxx"  # UPDATE THIS (Private subnet 1)
$SUBNET_ID_2 = "subnet-xxxxx"  # UPDATE THIS (Private subnet 2)
$SECURITY_GROUP_ID = "sg-xxxxx"  # UPDATE THIS (LambdaSecurityGroup)
$DATABASE_LAYER_ARN = "arn:aws:lambda:us-east-1:706704660887:layer:MentalSpaceEhrStack-DatabaseLayer-xxxxx"  # UPDATE THIS

# Phase 1 Functions (in deployment order)
$PHASE1_FUNCTIONS = @(
  "create-user",
  "list-users",
  "get-user-roles",
  "update-user-role",
  "toggle-user-active",
  "list-clients",
  "get-client",
  "create-client",
  "update-client",
  "list-appointments",
  "create-appointment",
  "update-appointment",
  "get-profile",
  "update-profile",
  "get-dashboard-stats"
)

Write-Host "========================================" -ForegroundColor Blue
Write-Host "  Phase 1 Lambda Deployment" -ForegroundColor Blue
Write-Host "  15 Critical Functions" -ForegroundColor Blue
Write-Host "========================================" -ForegroundColor Blue
Write-Host ""

# Verify AWS CLI is configured
try {
  aws sts get-caller-identity | Out-Null
  Write-Host "✅ AWS CLI authenticated" -ForegroundColor Green
} catch {
  Write-Host "❌ ERROR: AWS CLI not configured or not authenticated" -ForegroundColor Red
  Write-Host "Run: aws configure"
  exit 1
}
Write-Host ""

# Function to deploy a Lambda function
function Deploy-Lambda {
  param (
    [string]$FunctionName
  )

  $LAMBDA_DIR = "lambda\$FunctionName"
  $ZIP_FILE = "$env:TEMP\mentalspace-$FunctionName.zip"
  $FULL_FUNCTION_NAME = "mentalspace-$FunctionName"

  Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
  Write-Host "Deploying: $FULL_FUNCTION_NAME" -ForegroundColor Blue
  Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow

  # Check if function code exists
  if (-not (Test-Path "$LAMBDA_DIR\index.js")) {
    Write-Host "❌ ERROR: $LAMBDA_DIR\index.js not found" -ForegroundColor Red
    return $false
  }

  # Create deployment package
  Write-Host "📦 Creating deployment package..."
  if (Test-Path $ZIP_FILE) {
    Remove-Item $ZIP_FILE -Force
  }

  Push-Location $LAMBDA_DIR
  Compress-Archive -Path ".\*" -DestinationPath $ZIP_FILE -Force
  Pop-Location

  $ZipSize = (Get-Item $ZIP_FILE).Length / 1KB
  Write-Host "✅ Package created: $([math]::Round($ZipSize, 2)) KB" -ForegroundColor Green

  # Check if function exists
  try {
    aws lambda get-function --function-name $FULL_FUNCTION_NAME --region $AWS_REGION 2>&1 | Out-Null
    $FunctionExists = $LASTEXITCODE -eq 0
  } catch {
    $FunctionExists = $false
  }

  if ($FunctionExists) {
    # Update existing function
    Write-Host "🔄 Updating existing function..."
    aws lambda update-function-code `
      --function-name $FULL_FUNCTION_NAME `
      --zip-file "fileb://$ZIP_FILE" `
      --region $AWS_REGION `
      --output json | Out-Null

    # Update configuration
    $EnvVars = "Variables={DATABASE_SECRET_ARN=$DATABASE_SECRET_ARN,DATABASE_NAME=$DATABASE_NAME,COGNITO_USER_POOL_ID=$COGNITO_USER_POOL_ID}"
    aws lambda update-function-configuration `
      --function-name $FULL_FUNCTION_NAME `
      --timeout 30 `
      --memory-size 256 `
      --environment $EnvVars `
      --region $AWS_REGION `
      --output json | Out-Null

    Write-Host "✅ Function updated" -ForegroundColor Green
  } else {
    # Create new function
    Write-Host "🆕 Creating new function..."
    $EnvVars = "Variables={DATABASE_SECRET_ARN=$DATABASE_SECRET_ARN,DATABASE_NAME=$DATABASE_NAME,COGNITO_USER_POOL_ID=$COGNITO_USER_POOL_ID}"
    $VpcConfig = "SubnetIds=$SUBNET_ID_1,$SUBNET_ID_2,SecurityGroupIds=$SECURITY_GROUP_ID"

    aws lambda create-function `
      --function-name $FULL_FUNCTION_NAME `
      --runtime nodejs20.x `
      --role $LAMBDA_ROLE_ARN `
      --handler index.handler `
      --zip-file "fileb://$ZIP_FILE" `
      --timeout 30 `
      --memory-size 256 `
      --environment $EnvVars `
      --region $AWS_REGION `
      --vpc-config $VpcConfig `
      --output json | Out-Null

    Write-Host "✅ Function created" -ForegroundColor Green

    # Add database layer
    Write-Host "📚 Adding database layer..."
    aws lambda update-function-configuration `
      --function-name $FULL_FUNCTION_NAME `
      --layers $DATABASE_LAYER_ARN `
      --region $AWS_REGION `
      --output json | Out-Null

    Write-Host "✅ Layer attached" -ForegroundColor Green
  }

  # Clean up
  if (Test-Path $ZIP_FILE) {
    Remove-Item $ZIP_FILE -Force
  }

  Write-Host "✅ $FULL_FUNCTION_NAME deployed successfully" -ForegroundColor Green
  Write-Host ""
  return $true
}

# Deploy all Phase 1 functions
$TOTAL = $PHASE1_FUNCTIONS.Count
$CURRENT = 0
$SUCCEEDED = 0
$FAILED = 0

foreach ($FUNC in $PHASE1_FUNCTIONS) {
  $CURRENT++
  Write-Host "[$CURRENT/$TOTAL] Deploying $FUNC..." -ForegroundColor Blue

  if (Deploy-Lambda -FunctionName $FUNC) {
    $SUCCEEDED++
  } else {
    $FAILED++
    Write-Host "❌ Failed to deploy $FUNC" -ForegroundColor Red
  }
}

# Summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Blue
Write-Host "  Deployment Summary" -ForegroundColor Blue
Write-Host "========================================" -ForegroundColor Blue
Write-Host "✅ Succeeded: $SUCCEEDED" -ForegroundColor Green
if ($FAILED -gt 0) {
  Write-Host "❌ Failed: $FAILED" -ForegroundColor Red
}
Write-Host "Total: $TOTAL" -ForegroundColor Blue
Write-Host ""

if ($FAILED -eq 0) {
  Write-Host "🎉 All Phase 1 functions deployed successfully!" -ForegroundColor Green
  Write-Host ""
  Write-Host "Next steps:" -ForegroundColor Yellow
  Write-Host "1. Configure API Gateway endpoints"
  Write-Host "2. Test endpoints with authentication"
  Write-Host "3. Update frontend .env file"
  Write-Host "4. Deploy Phase 2 functions"
} else {
  Write-Host "⚠️  Some functions failed to deploy. Check errors above." -ForegroundColor Red
  exit 1
}
