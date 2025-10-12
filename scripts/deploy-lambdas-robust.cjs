const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const lambda = new AWS.Lambda({ region: 'us-east-1' });
const apigateway = new AWS.APIGateway({ region: 'us-east-1' });

// Configuration from CDK outputs
const CONFIG = {
  LAMBDA_ROLE_ARN: 'arn:aws:iam::706704660887:role/MentalSpaceEhrStack-LambdaExecutionRoleD5C26073-sj3X7NqztaoY',
  DATABASE_LAYER_ARN: 'arn:aws:lambda:us-east-1:706704660887:layer:DatabaseLayerB491180B:2',
  SECURITY_GROUP_ID: 'sg-039d849897e92ebd5',
  SUBNET_IDS: ['subnet-07410a25980068f2e', 'subnet-0c926d3728ddee72e'],
  DATABASE_SECRET_ARN: 'arn:aws:secretsmanager:us-east-1:706704660887:secret:mentalspace-ehr-db-credentials-al4fLD',
  DATABASE_NAME: 'mentalspaceehr',
  COGNITO_USER_POOL_ID: 'us-east-1_ssisECEGa',
  API_GATEWAY_ID: 'xmbq984faa',
};

const LAMBDA_DIR = path.join(__dirname, '..', 'infrastructure', 'lambda');
const ZIP_DIR = path.join(__dirname, '..', 'infrastructure', 'lambda-zips');

// Ensure zip directory exists
if (!fs.existsSync(ZIP_DIR)) {
  fs.mkdirSync(ZIP_DIR, { recursive: true });
}

async function zipLambdaFunction(functionName) {
  const functionDir = path.join(LAMBDA_DIR, functionName);
  const zipPath = path.join(ZIP_DIR, `${functionName}.zip`);

  try {
    // Check if function directory exists
    if (!fs.existsSync(functionDir)) {
      console.log(`      ⚠️  Directory not found: ${functionDir}`);
      return null;
    }

    // Check if index.js exists
    if (!fs.existsSync(path.join(functionDir, 'index.js'))) {
      console.log(`      ⚠️  No index.js found in ${functionName}`);
      return null;
    }

    // Remove old zip if exists
    if (fs.existsSync(zipPath)) {
      fs.unlinkSync(zipPath);
    }

    // Create zip using PowerShell (Windows)
    const command = `powershell -Command "Compress-Archive -Path '${functionDir}\\*' -DestinationPath '${zipPath}' -CompressionLevel Optimal"`;
    execSync(command, { stdio: 'pipe' });

    // Verify zip was created
    if (!fs.existsSync(zipPath)) {
      throw new Error('Zip file was not created');
    }

    const stats = fs.statSync(zipPath);
    if (stats.size === 0) {
      throw new Error('Zip file is empty');
    }

    return zipPath;
  } catch (error) {
    console.log(`      ❌ Zip failed: ${error.message}`);
    return null;
  }
}

async function deployLambdaFunction(functionName, attemptNumber = 1) {
  const MAX_ATTEMPTS = 3;

  try {
    // Step 1: Zip the function
    process.stdout.write(`   📦 Zipping...`);
    const zipPath = await zipLambdaFunction(functionName);
    if (!zipPath) {
      return { status: 'failed', reason: 'Zip creation failed' };
    }

    const zipBuffer = fs.readFileSync(zipPath);
    const functionNameAWS = `mentalspace-${functionName}`;

    process.stdout.write(` ✅ (${(zipBuffer.length / 1024).toFixed(1)}KB)\n`);

    // Step 2: Check if function exists
    process.stdout.write(`   🔍 Checking if exists...`);
    let functionExists = false;
    try {
      await lambda.getFunction({ FunctionName: functionNameAWS }).promise();
      functionExists = true;
      process.stdout.write(` ✅ Found\n`);
    } catch (e) {
      if (e.code !== 'ResourceNotFoundException') {
        throw e;
      }
      process.stdout.write(` ℹ️  New function\n`);
    }

    if (functionExists) {
      // Step 3a: Update existing function
      process.stdout.write(`   🔄 Updating code...`);
      await lambda.updateFunctionCode({
        FunctionName: functionNameAWS,
        ZipFile: zipBuffer
      }).promise();
      process.stdout.write(` ✅\n`);

      // Wait for function to be ready
      process.stdout.write(`   ⏳ Waiting for update...`);
      await waitForFunctionReady(functionNameAWS);
      process.stdout.write(` ✅\n`);

    } else {
      // Step 3b: Create new function
      process.stdout.write(`   🆕 Creating function...`);

      await lambda.createFunction({
        FunctionName: functionNameAWS,
        Runtime: 'nodejs20.x',
        Role: CONFIG.LAMBDA_ROLE_ARN,
        Handler: 'index.handler',
        Code: { ZipFile: zipBuffer },
        Timeout: 30,
        MemorySize: 512,
        VpcConfig: {
          SubnetIds: CONFIG.SUBNET_IDS,
          SecurityGroupIds: [CONFIG.SECURITY_GROUP_ID]
        },
        Environment: {
          Variables: {
            DATABASE_SECRET_ARN: CONFIG.DATABASE_SECRET_ARN,
            DATABASE_NAME: CONFIG.DATABASE_NAME,
            COGNITO_USER_POOL_ID: CONFIG.COGNITO_USER_POOL_ID,
            NODE_ENV: 'production'
          }
        },
        Layers: [CONFIG.DATABASE_LAYER_ARN],
        Description: `MentalSpace EHR - ${functionName} function`
      }).promise();

      process.stdout.write(` ✅\n`);

      // Wait for function to be ready
      process.stdout.write(`   ⏳ Waiting for creation...`);
      await waitForFunctionReady(functionNameAWS);
      process.stdout.write(` ✅\n`);
    }

    // Step 4: Verify deployment
    process.stdout.write(`   ✓ Verifying...`);
    const functionInfo = await lambda.getFunction({ FunctionName: functionNameAWS }).promise();
    if (functionInfo.Configuration.State !== 'Active') {
      throw new Error(`Function state is ${functionInfo.Configuration.State}`);
    }
    process.stdout.write(` ✅\n`);

    return { status: 'success', arn: functionInfo.Configuration.FunctionArn };

  } catch (error) {
    console.log(`\n   ❌ Error: ${error.message}`);

    // Retry logic
    if (attemptNumber < MAX_ATTEMPTS && error.code !== 'InvalidParameterValueException') {
      console.log(`   🔄 Retrying (attempt ${attemptNumber + 1}/${MAX_ATTEMPTS})...`);
      await sleep(5000); // Wait 5 seconds before retry
      return await deployLambdaFunction(functionName, attemptNumber + 1);
    }

    return { status: 'failed', reason: error.message, code: error.code };
  }
}

async function waitForFunctionReady(functionName, maxWaitSeconds = 120) {
  const startTime = Date.now();

  while (true) {
    try {
      const result = await lambda.getFunction({ FunctionName: functionName }).promise();
      const state = result.Configuration.State;
      const lastUpdateStatus = result.Configuration.LastUpdateStatus;

      if (state === 'Active' && lastUpdateStatus === 'Successful') {
        return true;
      }

      if (state === 'Failed' || lastUpdateStatus === 'Failed') {
        throw new Error(`Function entered failed state: ${result.Configuration.StateReasonCode}`);
      }

      const elapsedSeconds = (Date.now() - startTime) / 1000;
      if (elapsedSeconds > maxWaitSeconds) {
        throw new Error(`Timeout waiting for function to be ready (${maxWaitSeconds}s)`);
      }

      await sleep(2000); // Check every 2 seconds
    } catch (error) {
      if (error.code !== 'ResourceNotFoundException') {
        throw error;
      }
      await sleep(2000);
    }
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('\n🚀 AWS Lambda Deployment - Full Deployment\n');
  console.log('='.repeat(80));
  console.log('Configuration:');
  console.log(`  VPC Subnets: ${CONFIG.SUBNET_IDS.join(', ')}`);
  console.log(`  Security Group: ${CONFIG.SECURITY_GROUP_ID}`);
  console.log(`  Database Layer: ${CONFIG.DATABASE_LAYER_ARN}`);
  console.log('='.repeat(80));
  console.log();

  // Get all Lambda functions
  const allFunctions = fs.readdirSync(LAMBDA_DIR)
    .filter(name => {
      const stat = fs.statSync(path.join(LAMBDA_DIR, name));
      return stat.isDirectory();
    })
    .filter(name => fs.existsSync(path.join(LAMBDA_DIR, name, 'index.js')));

  // Skip already deployed functions
  const functionsToDeply = allFunctions.filter(name =>
    !['migrate-database', 'health-check'].includes(name)
  );

  console.log(`📦 Found ${functionsToDeply.length} Lambda functions to deploy\n`);
  console.log(`⏱️  Estimated time: ${Math.ceil(functionsToDeply.length * 2)} minutes\n`);
  console.log('='.repeat(80));
  console.log();

  const results = {
    success: [],
    failed: [],
    skipped: []
  };

  let count = 0;
  for (const functionName of functionsToDeply) {
    count++;
    console.log(`[${count}/${functionsToDeply.length}] ${functionName}`);

    const result = await deployLambdaFunction(functionName);

    if (result.status === 'success') {
      results.success.push({ name: functionName, arn: result.arn });
      console.log(`   ✅ SUCCESS\n`);
    } else if (result.status === 'skipped') {
      results.skipped.push({ name: functionName, reason: result.reason });
      console.log(`   ⏭️  SKIPPED: ${result.reason}\n`);
    } else {
      results.failed.push({ name: functionName, reason: result.reason });
      console.log(`   ❌ FAILED: ${result.reason}\n`);
    }

    // Small delay between deployments to avoid throttling
    if (count < functionsToDeply.length) {
      await sleep(1000);
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 DEPLOYMENT SUMMARY');
  console.log('='.repeat(80));
  console.log(`✅ Successful: ${results.success.length}`);
  console.log(`❌ Failed:     ${results.failed.length}`);
  console.log(`⏭️  Skipped:    ${results.skipped.length}`);
  console.log(`📊 Total:      ${functionsToDeply.length}`);
  console.log('='.repeat(80));

  if (results.failed.length > 0) {
    console.log('\n❌ Failed Functions:');
    results.failed.forEach(f => {
      console.log(`   - ${f.name}: ${f.reason}`);
    });
  }

  if (results.success.length > 0) {
    console.log('\n✅ Successfully Deployed Functions:');
    results.success.slice(0, 10).forEach(f => {
      console.log(`   - ${f.name}`);
    });
    if (results.success.length > 10) {
      console.log(`   ... and ${results.success.length - 10} more`);
    }
  }

  // Save results to file
  const resultsPath = path.join(__dirname, '..', 'lambda-deployment-results.json');
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  console.log(`\n📄 Full results saved to: lambda-deployment-results.json`);

  console.log('\n' + '='.repeat(80));
  console.log(`🎉 Deployment Complete!`);
  console.log('='.repeat(80));
  console.log();
}

main().catch(error => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});
