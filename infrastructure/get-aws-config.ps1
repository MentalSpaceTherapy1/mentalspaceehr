# AWS Configuration Retrieval Script
# Fetches all required ARNs and IDs for Lambda deployment

$ErrorActionPreference = "Continue"
$AWS_REGION = "us-east-1"

Write-Host "========================================" -ForegroundColor Blue
Write-Host "  AWS Configuration Retrieval" -ForegroundColor Blue
Write-Host "========================================" -ForegroundColor Blue
Write-Host ""

# Get Account ID
Write-Host "🔍 Getting AWS Account ID..." -ForegroundColor Cyan
try {
  $AccountInfo = aws sts get-caller-identity --output json | ConvertFrom-Json
  $AccountId = $AccountInfo.Account
  Write-Host "✅ Account ID: $AccountId" -ForegroundColor Green
} catch {
  Write-Host "❌ Failed to get account ID" -ForegroundColor Red
  $AccountId = "UNKNOWN"
}
Write-Host ""

# Get VPC ID
Write-Host "🔍 Searching for MentalSpace VPC..." -ForegroundColor Cyan
try {
  $VPCs = aws ec2 describe-vpcs --region $AWS_REGION --filters "Name=tag:Name,Values=*MentalSpace*" --output json | ConvertFrom-Json
  if ($VPCs.Vpcs.Count -gt 0) {
    $VpcId = $VPCs.Vpcs[0].VpcId
    $VpcName = ($VPCs.Vpcs[0].Tags | Where-Object { $_.Key -eq "Name" }).Value
    Write-Host "✅ VPC ID: $VpcId ($VpcName)" -ForegroundColor Green
  } else {
    Write-Host "⚠️  No VPC found with 'MentalSpace' in name" -ForegroundColor Yellow
    Write-Host "   Listing all VPCs..." -ForegroundColor Yellow
    $AllVPCs = aws ec2 describe-vpcs --region $AWS_REGION --output json | ConvertFrom-Json
    foreach ($vpc in $AllVPCs.Vpcs) {
      $name = ($vpc.Tags | Where-Object { $_.Key -eq "Name" }).Value
      if ($name) {
        Write-Host "   - $($vpc.VpcId): $name" -ForegroundColor Gray
      } else {
        Write-Host "   - $($vpc.VpcId): (no name)" -ForegroundColor Gray
      }
    }
    $VpcId = "PLEASE_SELECT_FROM_ABOVE"
  }
} catch {
  Write-Host "❌ Failed to get VPC" -ForegroundColor Red
  $VpcId = "UNKNOWN"
}
Write-Host ""

# Get Private Subnets
Write-Host "🔍 Searching for Private Subnets..." -ForegroundColor Cyan
try {
  $Subnets = aws ec2 describe-subnets --region $AWS_REGION --filters "Name=tag:Name,Values=*Private*" --output json | ConvertFrom-Json
  if ($Subnets.Subnets.Count -ge 2) {
    $SubnetId1 = $Subnets.Subnets[0].SubnetId
    $SubnetId2 = $Subnets.Subnets[1].SubnetId
    $SubnetName1 = ($Subnets.Subnets[0].Tags | Where-Object { $_.Key -eq "Name" }).Value
    $SubnetName2 = ($Subnets.Subnets[1].Tags | Where-Object { $_.Key -eq "Name" }).Value
    Write-Host "✅ Subnet 1: $SubnetId1 ($SubnetName1)" -ForegroundColor Green
    Write-Host "✅ Subnet 2: $SubnetId2 ($SubnetName2)" -ForegroundColor Green
  } else {
    Write-Host "⚠️  Found only $($Subnets.Subnets.Count) private subnets" -ForegroundColor Yellow
    $SubnetId1 = "UNKNOWN"
    $SubnetId2 = "UNKNOWN"
  }
} catch {
  Write-Host "❌ Failed to get subnets" -ForegroundColor Red
  $SubnetId1 = "UNKNOWN"
  $SubnetId2 = "UNKNOWN"
}
Write-Host ""

# Get Lambda Security Group
Write-Host "🔍 Searching for Lambda Security Group..." -ForegroundColor Cyan
try {
  $SGs = aws ec2 describe-security-groups --region $AWS_REGION --filters "Name=group-name,Values=*Lambda*" --output json | ConvertFrom-Json
  if ($SGs.SecurityGroups.Count -gt 0) {
    $SecurityGroupId = $SGs.SecurityGroups[0].GroupId
    $SecurityGroupName = $SGs.SecurityGroups[0].GroupName
    Write-Host "✅ Security Group: $SecurityGroupId ($SecurityGroupName)" -ForegroundColor Green
  } else {
    Write-Host "⚠️  No security group found with 'Lambda' in name" -ForegroundColor Yellow
    $SecurityGroupId = "UNKNOWN"
  }
} catch {
  Write-Host "❌ Failed to get security group" -ForegroundColor Red
  $SecurityGroupId = "UNKNOWN"
}
Write-Host ""

# Get Lambda Execution Role
Write-Host "🔍 Searching for Lambda Execution Role..." -ForegroundColor Cyan
try {
  $Roles = aws iam list-roles --output json | ConvertFrom-Json
  $LambdaRole = $Roles.Roles | Where-Object { $_.RoleName -like "*LambdaExecutionRole*" }
  if ($LambdaRole) {
    $RoleArn = $LambdaRole.Arn
    Write-Host "✅ Role ARN: $RoleArn" -ForegroundColor Green
  } else {
    Write-Host "⚠️  No role found with 'LambdaExecutionRole' in name" -ForegroundColor Yellow
    $RoleArn = "UNKNOWN"
  }
} catch {
  Write-Host "❌ Failed to get IAM role" -ForegroundColor Red
  $RoleArn = "UNKNOWN"
}
Write-Host ""

# Get Database Secret
Write-Host "🔍 Searching for Database Secret..." -ForegroundColor Cyan
try {
  $Secrets = aws secretsmanager list-secrets --region $AWS_REGION --output json | ConvertFrom-Json
  $DbSecret = $Secrets.SecretList | Where-Object { $_.Name -like "*db-credentials*" }
  if ($DbSecret) {
    $SecretArn = $DbSecret.ARN
    Write-Host "✅ Secret ARN: $SecretArn" -ForegroundColor Green
  } else {
    Write-Host "⚠️  No secret found with 'db-credentials' in name" -ForegroundColor Yellow
    $SecretArn = "UNKNOWN"
  }
} catch {
  Write-Host "❌ Failed to get secret" -ForegroundColor Red
  $SecretArn = "UNKNOWN"
}
Write-Host ""

# Get Database Layer
Write-Host "🔍 Searching for Database Layer..." -ForegroundColor Cyan
try {
  $Layers = aws lambda list-layers --region $AWS_REGION --output json | ConvertFrom-Json
  $DbLayer = $Layers.Layers | Where-Object { $_.LayerName -like "*DatabaseLayer*" }
  if ($DbLayer) {
    $LayerArn = $DbLayer.LatestMatchingVersion.LayerVersionArn
    Write-Host "✅ Layer ARN: $LayerArn" -ForegroundColor Green
  } else {
    Write-Host "⚠️  No layer found with 'DatabaseLayer' in name" -ForegroundColor Yellow
    $LayerArn = "UNKNOWN"
  }
} catch {
  Write-Host "❌ Failed to get Lambda layer" -ForegroundColor Red
  $LayerArn = "UNKNOWN"
}
Write-Host ""

# Get Cognito User Pool
Write-Host "🔍 Searching for Cognito User Pool..." -ForegroundColor Cyan
try {
  $UserPools = aws cognito-idp list-user-pools --max-results 20 --region $AWS_REGION --output json | ConvertFrom-Json
  $MentalSpacePool = $UserPools.UserPools | Where-Object { $_.Name -like "*mentalspace*" }
  if ($MentalSpacePool) {
    $UserPoolId = $MentalSpacePool.Id
    $UserPoolName = $MentalSpacePool.Name
    Write-Host "✅ User Pool ID: $UserPoolId ($UserPoolName)" -ForegroundColor Green
  } else {
    Write-Host "⚠️  No user pool found with 'mentalspace' in name" -ForegroundColor Yellow
    $UserPoolId = "UNKNOWN"
  }
} catch {
  Write-Host "❌ Failed to get Cognito user pool" -ForegroundColor Red
  $UserPoolId = "UNKNOWN"
}
Write-Host ""

# Generate configuration output
Write-Host "========================================" -ForegroundColor Blue
Write-Host "  Configuration Summary" -ForegroundColor Blue
Write-Host "========================================" -ForegroundColor Blue
Write-Host ""

$ConfigContent = @"
# AWS Configuration for Lambda Deployment
# Copy these values to deploy-phase1-lambdas.ps1

`$AWS_REGION = "$AWS_REGION"
`$LAMBDA_ROLE_ARN = "$RoleArn"
`$DATABASE_SECRET_ARN = "$SecretArn"
`$DATABASE_NAME = "mentalspaceehr"
`$COGNITO_USER_POOL_ID = "$UserPoolId"
`$VPC_ID = "$VpcId"
`$SUBNET_ID_1 = "$SubnetId1"
`$SUBNET_ID_2 = "$SubnetId2"
`$SECURITY_GROUP_ID = "$SecurityGroupId"
`$DATABASE_LAYER_ARN = "$LayerArn"
"@

Write-Host $ConfigContent
Write-Host ""

# Save to file
$ConfigFile = "aws-config-values.txt"
$ConfigContent | Out-File -FilePath $ConfigFile -Encoding UTF8
Write-Host "✅ Configuration saved to: $ConfigFile" -ForegroundColor Green
Write-Host ""

# Check if all values were found
$UnknownCount = ($ConfigContent -split "UNKNOWN").Count - 1
if ($UnknownCount -gt 0) {
  Write-Host "⚠️  WARNING: $UnknownCount values could not be automatically detected" -ForegroundColor Yellow
  Write-Host "   You'll need to manually find these values in AWS Console" -ForegroundColor Yellow
} else {
  Write-Host "🎉 All configuration values found successfully!" -ForegroundColor Green
  Write-Host "   You can now run: .\deploy-phase1-lambdas.ps1" -ForegroundColor Green
}
