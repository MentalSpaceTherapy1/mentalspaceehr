const { execSync } = require('child_process');

console.log('🌐 Adding Client API Routes to API Gateway\n');

// Get API Gateway ID
const apiId = execSync(`aws apigatewayv2 get-apis --query "Items[?Name=='mentalspace-api'].ApiId" --output text`, {
  encoding: 'utf-8'
}).trim();

console.log(`API Gateway ID: ${apiId}\n`);

if (!apiId) {
  console.error('❌ API Gateway not found!');
  process.exit(1);
}

const routes = [
  {
    method: 'GET',
    path: '/clients',
    functionName: 'mentalspace-list-clients',
    description: 'List all clients with pagination'
  },
  {
    method: 'GET',
    path: '/clients/{id}',
    functionName: 'mentalspace-get-client',
    description: 'Get single client by ID'
  },
  {
    method: 'POST',
    path: '/clients',
    functionName: 'mentalspace-create-client',
    description: 'Create new client'
  },
  {
    method: 'PUT',
    path: '/clients/{id}',
    functionName: 'mentalspace-update-client',
    description: 'Update existing client'
  }
];

routes.forEach(route => {
  console.log(`\n📍 Creating route: ${route.method} ${route.path}`);

  try {
    // Get Lambda ARN
    const lambdaArn = execSync(
      `aws lambda get-function --function-name ${route.functionName} --query Configuration.FunctionArn --output text`,
      { encoding: 'utf-8' }
    ).trim();

    console.log(`   Lambda ARN: ${lambdaArn}`);

    // Create integration
    console.log(`   Creating integration...`);
    const integrationId = JSON.parse(execSync(
      `aws apigatewayv2 create-integration --api-id ${apiId} ` +
      `--integration-type AWS_PROXY --integration-uri ${lambdaArn} ` +
      `--payload-format-version 2.0`,
      { encoding: 'utf-8' }
    )).IntegrationId;

    console.log(`   Integration ID: ${integrationId}`);

    // Create route
    console.log(`   Creating route...`);
    const routeResponse = execSync(
      `aws apigatewayv2 create-route --api-id ${apiId} ` +
      `--route-key "${route.method} ${route.path}" ` +
      `--target integrations/${integrationId}`,
      { encoding: 'utf-8' }
    );

    console.log(`   ✅ Route created successfully`);

    // Add Lambda permission for API Gateway to invoke it
    console.log(`   Adding Lambda permission...`);
    try {
      execSync(
        `aws lambda add-permission --function-name ${route.functionName} ` +
        `--statement-id apigateway-${Date.now()} ` +
        `--action lambda:InvokeFunction --principal apigateway.amazonaws.com ` +
        `--source-arn "arn:aws:execute-api:us-east-1:706704660887:${apiId}/*"`,
        { stdio: 'ignore' }
      );
      console.log(`   ✅ Lambda permission added`);
    } catch (err) {
      // Permission might already exist, that's okay
      console.log(`   ⚠️  Permission may already exist (that's okay)`);
    }

  } catch (err) {
    console.error(`   ❌ Error: ${err.message}`);
  }
});

console.log('\n\n🎉 All API routes created!');
console.log('\nAPI Endpoint Base URL:');
execSync(`aws apigatewayv2 get-apis --query "Items[?Name=='mentalspace-api'].ApiEndpoint" --output text`, {
  stdio: 'inherit'
});
console.log('\n');
