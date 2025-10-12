/**
 * Deploy appointments, notes, and tasks Lambda functions
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const REGION = 'us-east-1';
const ROLE_ARN = 'arn:aws:iam::706704660887:role/MentalSpaceEhrStack-LambdaExecutionRoleD5C26073-sj3X7NqztaoY';
const SECURITY_GROUPS = 'sg-039d849897e92ebd5';
const SUBNETS = 'subnet-0c926d3728ddee72e,subnet-07410a25980068f2e';
const DB_SECRET_ARN = 'arn:aws:secretsmanager:us-east-1:706704660887:secret:AuroraDBSecret-zPQcAc';
const LAYER_ARN = 'arn:aws:lambda:us-east-1:706704660887:layer:DatabaseLayerB491180B:2';

const lambdas = [
  // Appointments
  { name: 'list-appointments', awsName: 'mentalspace-list-appointments', handler: 'index.handler', memory: 512, timeout: 30 },
  { name: 'create-appointment', awsName: 'mentalspace-create-appointment', handler: 'index.handler', memory: 512, timeout: 30 },
  { name: 'update-appointment', awsName: 'mentalspace-update-appointment', handler: 'index.handler', memory: 512, timeout: 30 },

  // Notes
  { name: 'list-notes', awsName: 'mentalspace-list-notes', handler: 'index.handler', memory: 512, timeout: 30 },
  { name: 'create-note', awsName: 'mentalspace-create-note', handler: 'index.handler', memory: 512, timeout: 30 },

  // Tasks
  { name: 'list-tasks', awsName: 'mentalspace-list-tasks', handler: 'index.handler', memory: 512, timeout: 30 },
  { name: 'create-task', awsName: 'mentalspace-create-task', handler: 'index.handler', memory: 512, timeout: 30 },
  { name: 'update-task', awsName: 'mentalspace-update-task', handler: 'index.handler', memory: 512, timeout: 30 }
];

console.log('🚀 Deploying core Lambda functions...\n');

for (const lambda of lambdas) {
  console.log(`\n📦 Processing ${lambda.name}...`);

  const lambdaDir = path.join(__dirname, '..', 'infrastructure', 'lambda', lambda.name);
  const zipFile = path.join(__dirname, '..', 'infrastructure', 'lambda', `${lambda.name}.zip`);

  if (!fs.existsSync(lambdaDir)) {
    console.error(`❌ Directory not found: ${lambdaDir}`);
    continue;
  }

  // Package Lambda function using PowerShell
  console.log(`  📦 Packaging ${lambda.name}...`);
  try {
    execSync(`powershell -Command "Compress-Archive -Path '${lambdaDir}\\*' -DestinationPath '${zipFile}' -Force"`, {
      stdio: 'inherit'
    });
    console.log(`  ✅ Packaged to ${zipFile}`);
  } catch (error) {
    console.error(`  ❌ Failed to package ${lambda.name}`);
    continue;
  }

  // Check if function exists
  let functionExists = false;
  try {
    execSync(`aws lambda get-function --function-name ${lambda.awsName} --region ${REGION}`, {
      stdio: 'pipe'
    });
    functionExists = true;
    console.log(`  ℹ️  Function exists, will update`);
  } catch (error) {
    console.log(`  ℹ️  Function does not exist, will create`);
  }

  if (functionExists) {
    // Update existing function
    console.log(`  🔄 Updating function code...`);
    try {
      execSync(`aws lambda update-function-code --function-name ${lambda.awsName} --zip-file fileb://${zipFile} --region ${REGION}`, {
        stdio: 'inherit'
      });
      console.log(`  ✅ Function code updated`);

      // Wait for update to complete
      execSync(`aws lambda wait function-updated --function-name ${lambda.awsName} --region ${REGION}`, {
        stdio: 'pipe'
      });

      // Update configuration
      console.log(`  🔄 Updating function configuration...`);
      execSync(`aws lambda update-function-configuration --function-name ${lambda.awsName} --handler ${lambda.handler} --runtime nodejs18.x --timeout ${lambda.timeout} --memory-size ${lambda.memory} --environment "Variables={DB_SECRET_ARN=${DB_SECRET_ARN},DATABASE_SECRET_ARN=${DB_SECRET_ARN},AWS_NODEJS_CONNECTION_REUSE_ENABLED=1}" --layers ${LAYER_ARN} --region ${REGION}`, {
        stdio: 'inherit'
      });
      console.log(`  ✅ Configuration updated`);
    } catch (error) {
      console.error(`  ❌ Failed to update ${lambda.name}`);
      continue;
    }
  } else {
    // Create new function
    console.log(`  🆕 Creating function...`);
    try {
      execSync(`aws lambda create-function --function-name ${lambda.awsName} --runtime nodejs18.x --role ${ROLE_ARN} --handler ${lambda.handler} --zip-file fileb://${zipFile} --timeout ${lambda.timeout} --memory-size ${lambda.memory} --environment "Variables={DB_SECRET_ARN=${DB_SECRET_ARN},DATABASE_SECRET_ARN=${DB_SECRET_ARN},AWS_NODEJS_CONNECTION_REUSE_ENABLED=1}" --vpc-config "SubnetIds=${SUBNETS},SecurityGroupIds=${SECURITY_GROUPS}" --layers ${LAYER_ARN} --region ${REGION}`, {
        stdio: 'inherit'
      });
      console.log(`  ✅ Function created`);
    } catch (error) {
      console.error(`  ❌ Failed to create ${lambda.name}`);
      continue;
    }
  }

  console.log(`  ✅ ${lambda.name} deployed successfully`);
}

console.log('\n\n✅ All Lambda functions deployed!');
console.log('\nNext steps:');
console.log('1. Add API Gateway routes for these functions');
console.log('2. Test the endpoints');
