const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const lambda = new AWS.Lambda({ region: 'us-east-1' });
const iam = new AWS.IAM({ region: 'us-east-1' });
const apigateway = new AWS.APIGateway({ region: 'us-east-1' });

const LAMBDA_DIR = path.join(__dirname, '..', 'infrastructure', 'lambda');
const LAMBDA_ROLE_ARN = 'arn:aws:iam::706704660887:role/MentalSpaceEhrStack-LambdaExecutionRoleD5C26073-0HnQZIZlDLDB'; // From CDK output
const DATABASE_LAYER_ARN = 'arn:aws:lambda:us-east-1:706704660887:layer:MentalSpaceEhrStack-DatabaseLayerB491180B-rYNWAphSX4xN:1'; // From CDK output
const VPC_SUBNET_IDS = []; // Will fetch from VPC
const SECURITY_GROUP_ID = 'sg-0d9a95c22f68c5b41'; // Lambda security group from CDK

async function getVPCConfig() {
  const ec2 = new AWS.EC2({ region: 'us-east-1' });

  // Get subnets
  const subnets = await ec2.describeSubnets({
    Filters: [
      { Name: 'tag:Name', Values: ['*Private*'] },
      { Name: 'vpc-id', Values: ['vpc-00829756378f4c9f9'] }
    ]
  }).promise();

  return {
    SubnetIds: subnets.Subnets.map(s => s.SubnetId),
    SecurityGroupIds: [SECURITY_GROUP_ID]
  };
}

async function zipLambdaFunction(functionName) {
  const functionDir = path.join(LAMBDA_DIR, functionName);
  const zipPath = path.join(LAMBDA_DIR, `${functionName}.zip`);

  // Create zip file
  try {
    // Use PowerShell Compress-Archive on Windows
    execSync(`powershell Compress-Archive -Path "${functionDir}\\*" -DestinationPath "${zipPath}" -Force`, {
      stdio: 'inherit'
    });
    return zipPath;
  } catch (error) {
    console.error(`   ❌ Failed to zip ${functionName}:`, error.message);
    return null;
  }
}

async function deployLambdaFunction(functionName, vpcConfig) {
  try {
    const zipPath = await zipLambdaFunction(functionName);
    if (!zipPath) return false;

    const zipBuffer = fs.readFileSync(zipPath);
    const functionNameAWS = `mentalspace-${functionName}`;

    // Check if function exists
    let functionExists = false;
    try {
      await lambda.getFunction({ FunctionName: functionNameAWS }).promise();
      functionExists = true;
    } catch (e) {
      if (e.code !== 'ResourceNotFoundException') throw e;
    }

    if (functionExists) {
      // Update existing function
      await lambda.updateFunctionCode({
        FunctionName: functionNameAWS,
        ZipFile: zipBuffer
      }).promise();

      console.log(`   ✅ UPDATED: ${functionName}`);
    } else {
      // Create new function
      await lambda.createFunction({
        FunctionName: functionNameAWS,
        Runtime: 'nodejs20.x',
        Role: LAMBDA_ROLE_ARN,
        Handler: 'index.handler',
        Code: { ZipFile: zipBuffer },
        Timeout: 30,
        MemorySize: 256,
        VpcConfig: vpcConfig,
        Environment: {
          Variables: {
            DATABASE_SECRET_ARN: 'arn:aws:secretsmanager:us-east-1:706704660887:secret:mentalspace-ehr-db-credentials-al4fLD',
            DATABASE_NAME: 'mentalspaceehr',
            COGNITO_USER_POOL_ID: 'us-east-1_ssisECEGa',
            AWS_REGION: 'us-east-1'
          }
        },
        Layers: [DATABASE_LAYER_ARN]
      }).promise();

      console.log(`   ✅ CREATED: ${functionName}`);
    }

    // Clean up zip file
    fs.unlinkSync(zipPath);
    return true;

  } catch (error) {
    console.error(`   ❌ FAILED: ${functionName} -`, error.message);
    return false;
  }
}

async function main() {
  console.log('\n🚀 Deploying all Lambda functions to AWS...\n');
  console.log('='.repeat(80));

  // Get VPC configuration
  console.log('📡 Fetching VPC configuration...');
  const vpcConfig = await getVPCConfig();
  console.log(`✅ Found ${vpcConfig.SubnetIds.length} subnets\n`);

  // Get all Lambda functions
  const functions = fs.readdirSync(LAMBDA_DIR)
    .filter(name => {
      const stat = fs.statSync(path.join(LAMBDA_DIR, name));
      return stat.isDirectory() && fs.existsSync(path.join(LAMBDA_DIR, name, 'index.js'));
    })
    .filter(name => !['migrate-database', 'health-check'].includes(name)); // Skip already deployed

  console.log(`📦 Found ${functions.length} Lambda functions to deploy\n`);

  let deployed = 0;
  let failed = 0;

  for (const functionName of functions) {
    process.stdout.write(`${deployed + failed + 1}/${functions.length} ${functionName}...`);

    if (await deployLambdaFunction(functionName, vpcConfig)) {
      deployed++;
    } else {
      failed++;
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('📊 DEPLOYMENT SUMMARY');
  console.log('='.repeat(80));
  console.log(`✅ Deployed: ${deployed}`);
  console.log(`❌ Failed:   ${failed}`);
  console.log(`📊 Total:    ${functions.length}`);
  console.log('='.repeat(80));
}

main().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
