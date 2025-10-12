/**
 * Add API Gateway routes for profiles, dashboard, and billing Lambda functions
 */

const { execSync } = require('child_process');

const REGION = 'us-east-1';
const API_ID = 'cyf1w472y8';
const ACCOUNT_ID = '706704660887';

const routes = [
  // Profiles
  { path: '/profiles', method: 'GET', functionName: 'mentalspace-list-profiles' },
  { path: '/profiles/{id}', method: 'GET', functionName: 'mentalspace-get-profile' },
  { path: '/profiles/{id}', method: 'PUT', functionName: 'mentalspace-update-profile' },
  { path: '/profiles/{id}', method: 'PATCH', functionName: 'mentalspace-update-profile' },

  // Dashboard
  { path: '/dashboard/stats', method: 'GET', functionName: 'mentalspace-get-dashboard-stats' },

  // Billing
  { path: '/claims', method: 'GET', functionName: 'mentalspace-list-claims' }
];

console.log('🚀 Adding API Gateway routes...\n');

for (const route of routes) {
  console.log(`\n📍 Adding route: ${route.method} ${route.path} -> ${route.functionName}`);

  try {
    // Create integration
    console.log(`  Creating integration...`);
    const integrationOutput = execSync(`aws apigatewayv2 create-integration --api-id ${API_ID} --integration-type AWS_PROXY --integration-uri arn:aws:lambda:${REGION}:${ACCOUNT_ID}:function:${route.functionName} --payload-format-version 2.0 --region ${REGION} --output json`, {
      encoding: 'utf-8'
    });
    const integration = JSON.parse(integrationOutput);
    const integrationId = integration.IntegrationId;
    console.log(`  ✅ Integration created: ${integrationId}`);

    // Create route
    console.log(`  Creating route...`);
    execSync(`aws apigatewayv2 create-route --api-id ${API_ID} --route-key "${route.method} ${route.path}" --target integrations/${integrationId} --region ${REGION}`, {
      stdio: 'inherit'
    });
    console.log(`  ✅ Route created`);

    // Add Lambda permission
    console.log(`  Adding Lambda invoke permission...`);
    const statementId = `${route.functionName}-${route.method.toLowerCase()}-${route.path.replace(/[^a-zA-Z0-9]/g, '-')}`;
    try {
      execSync(`aws lambda add-permission --function-name ${route.functionName} --statement-id ${statementId} --action lambda:InvokeFunction --principal apigateway.amazonaws.com --source-arn "arn:aws:execute-api:${REGION}:${ACCOUNT_ID}:${API_ID}/*/${route.method}${route.path}" --region ${REGION}`, {
        stdio: 'pipe'
      });
      console.log(`  ✅ Permission added`);
    } catch (error) {
      if (error.message.includes('ResourceConflictException')) {
        console.log(`  ℹ️  Permission already exists`);
      } else {
        throw error;
      }
    }

    console.log(`  ✅ ${route.method} ${route.path} configured successfully`);
  } catch (error) {
    console.error(`  ❌ Failed to add route: ${error.message}`);
  }
}

console.log('\n\n✅ All API Gateway routes added!');
console.log(`\nAPI Endpoint: https://${API_ID}.execute-api.${REGION}.amazonaws.com`);
console.log('\nAvailable routes:');
routes.forEach(route => {
  console.log(`  ${route.method} ${route.path}`);
});
