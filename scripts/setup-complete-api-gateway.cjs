const { execSync } = require('child_process');

console.log('🌐 Setting up Complete API Gateway for MentalSpace EHR\n');

// Step 1: Create API Gateway
console.log('Step 1: Creating HTTP API Gateway...\n');

let apiId, apiEndpoint;

try {
  const createApiResponse = JSON.parse(execSync(
    `aws apigatewayv2 create-api --name mentalspace-api --protocol-type HTTP ` +
    `--cors-configuration AllowOrigins="*",AllowMethods="GET,POST,PUT,DELETE,OPTIONS",AllowHeaders="*"`,
    { encoding: 'utf-8' }
  ));

  apiId = createApiResponse.ApiId;
  apiEndpoint = createApiResponse.ApiEndpoint;

  console.log(`✅ API Gateway created!`);
  console.log(`   API ID: ${apiId}`);
  console.log(`   Endpoint: ${apiEndpoint}\n`);

} catch (err) {
  console.error(`❌ Error creating API Gateway:`, err.message);
  process.exit(1);
}

// Step 2: Create default stage
console.log('Step 2: Creating $default stage...\n');

try {
  execSync(
    `aws apigatewayv2 create-stage --api-id ${apiId} --stage-name $default --auto-deploy`,
    { stdio: 'inherit' }
  );
  console.log(`✅ Default stage created\n`);
} catch (err) {
  console.log(`⚠️  Stage may already exist\n`);
}

// Step 3: Add all client API routes
console.log('Step 3: Adding client API routes...\n');

const routes = [
  { method: 'GET', path: '/clients', function: 'mentalspace-list-clients' },
  { method: 'GET', path: '/clients/{id}', function: 'mentalspace-get-client' },
  { method: 'POST', path: '/clients', function: 'mentalspace-create-client' },
  { method: 'PUT', path: '/clients/{id}', function: 'mentalspace-update-client' },
  { method: 'GET', path: '/get-user-roles', function: 'mentalspace-get-user-roles' }, // Existing function
];

routes.forEach(route => {
  console.log(`\n📍 ${route.method} ${route.path}`);

  try {
    // Get Lambda ARN
    const lambdaArn = execSync(
      `aws lambda get-function --function-name ${route.function} --query Configuration.FunctionArn --output text`,
      { encoding: 'utf-8' }
    ).trim();

    // Create integration
    const integrationId = JSON.parse(execSync(
      `aws apigatewayv2 create-integration --api-id ${apiId} ` +
      `--integration-type AWS_PROXY --integration-uri ${lambdaArn} ` +
      `--payload-format-version 2.0`,
      { encoding: 'utf-8' }
    )).IntegrationId;

    // Create route
    execSync(
      `aws apigatewayv2 create-route --api-id ${apiId} ` +
      `--route-key "${route.method} ${route.path}" ` +
      `--target integrations/${integrationId}`,
      { stdio: 'ignore' }
    );

    // Add Lambda permission
    try {
      execSync(
        `aws lambda add-permission --function-name ${route.function} ` +
        `--statement-id apigateway-invoke-${Date.now()} ` +
        `--action lambda:InvokeFunction --principal apigateway.amazonaws.com ` +
        `--source-arn "arn:aws:execute-api:us-east-1:706704660887:${apiId}/*"`,
        { stdio: 'ignore' }
      );
    } catch {}

    console.log(`   ✅ Route created`);

  } catch (err) {
    console.error(`   ❌ Error: ${err.message}`);
  }
});

console.log('\n\n🎉 API Gateway setup complete!');
console.log(`\n📝 API Endpoint: ${apiEndpoint}`);
console.log('\nAvailable Routes:');
console.log('   GET    ' + apiEndpoint + '/clients');
console.log('   GET    ' + apiEndpoint + '/clients/{id}');
console.log('   POST   ' + apiEndpoint + '/clients');
console.log('   PUT    ' + apiEndpoint + '/clients/{id}');
console.log('   GET    ' + apiEndpoint + '/get-user-roles');
console.log('\nNext: Update frontend API client to use this endpoint');
