const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Deploying Client Management Lambda Functions\n');

const lambdas = [
  { name: 'list-clients', method: 'GET', path: '/clients' },
  { name: 'get-client', method: 'GET', path: '/clients/{id}' },
  { name: 'create-client', method: 'POST', path: '/clients' },
  { name: 'update-client', method: 'PUT', path: '/clients/{id}' },
];

// Step 1: Package each Lambda
console.log('📦 Packaging Lambda functions...\n');

lambdas.forEach(lambda => {
  const lambdaDir = path.join(__dirname, '..', 'infrastructure', 'lambda', lambda.name);
  const zipPath = path.join(__dirname, `..`, `${lambda.name}.zip`);

  console.log(`Packaging ${lambda.name}...`);

  try {
    // Delete existing zip
    if (fs.existsSync(zipPath)) {
      fs.unlinkSync(zipPath);
    }

    // Create zip using PowerShell
    execSync(
      `powershell -Command "Compress-Archive -Path '${lambdaDir}\\*' -DestinationPath '${zipPath}' -Force"`,
      { stdio: 'inherit' }
    );

    console.log(`✅ ${lambda.name}.zip created\n`);
  } catch (err) {
    console.error(`❌ Error packaging ${lambda.name}:`, err.message);
    process.exit(1);
  }
});

// Step 2: Deploy each Lambda using AWS CLI
console.log('\n🚀 Deploying Lambda functions to AWS...\n');

const vpcConfig = {
  SubnetIds: ['subnet-0c926d3728ddee72e', 'subnet-07410a25980068f2e'],
  SecurityGroupIds: ['sg-039d849897e92ebd5']
};

const environment = {
  Variables: {
    DB_SECRET_ARN: 'arn:aws:secretsmanager:us-east-1:706704660887:secret:mentalspace-ehr-db-credentials-al4fLD'
  }
};

lambdas.forEach(lambda => {
  const functionName = `mentalspace-${lambda.name}`;
  const zipPath = path.join(__dirname, '..', `${lambda.name}.zip`);

  console.log(`Deploying ${functionName}...`);

  try {
    // Check if function exists
    let functionExists = false;
    try {
      execSync(`aws lambda get-function --function-name ${functionName}`, { stdio: 'ignore' });
      functionExists = true;
    } catch {}

    if (functionExists) {
      // Update existing function
      console.log(`Updating existing function...`);
      execSync(
        `aws lambda update-function-code --function-name ${functionName} --zip-file fileb://${zipPath}`,
        { stdio: 'inherit' }
      );
    } else {
      // Create new function
      console.log(`Creating new function...`);
      execSync(
        `aws lambda create-function --function-name ${functionName} ` +
        `--runtime nodejs18.x --role arn:aws:iam::706704660887:role/MentalSpaceEhrStack-LambdaExecutionRoleD5C26073-sj3X7NqztaoY ` +
        `--handler index.handler --timeout 30 --memory-size 256 ` +
        `--zip-file fileb://${zipPath} ` +
        `--vpc-config SubnetIds=${vpcConfig.SubnetIds.join(',')},SecurityGroupIds=${vpcConfig.SecurityGroupIds.join(',')} ` +
        `--environment Variables={DB_SECRET_ARN=${environment.Variables.DB_SECRET_ARN}} ` +
        `--layers arn:aws:lambda:us-east-1:706704660887:layer:DatabaseLayerB491180B:2`,
        { stdio: 'inherit' }
      );
    }

    console.log(`✅ ${functionName} deployed\n`);

    // Clean up zip
    fs.unlinkSync(zipPath);

  } catch (err) {
    console.error(`❌ Error deploying ${functionName}:`, err.message);
  }
});

console.log('\n🎉 All Lambda functions deployed!');
console.log('\n📝 Next: Add API Gateway routes for these endpoints');
console.log('   GET    /clients');
console.log('   GET    /clients/{id}');
console.log('   POST   /clients');
console.log('   PUT    /clients/{id}');
