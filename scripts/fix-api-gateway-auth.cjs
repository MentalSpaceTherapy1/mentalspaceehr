const AWS = require('aws-sdk');

const apigateway = new AWS.APIGateway({ region: 'us-east-1' });

const API_ID = 'snsmvt661k';

async function fixAuth() {
  console.log('🔧 Fixing API Gateway authentication...');

  // Get resources
  const resources = await apigateway.getResources({
    restApiId: API_ID
  }).promise();

  const getUserRolesResource = resources.items.find(r => r.path === '/get-user-roles');

  if (!getUserRolesResource) {
    console.error('❌ /get-user-roles resource not found');
    process.exit(1);
  }

  // Update method to NONE auth (Lambda will handle Cognito JWT validation)
  await apigateway.updateMethod({
    restApiId: API_ID,
    resourceId: getUserRolesResource.id,
    httpMethod: 'GET',
    patchOperations: [
      {
        op: 'replace',
        path: '/authorizationType',
        value: 'NONE'
      }
    ]
  }).promise();

  console.log('✅ Updated GET method auth to NONE');

  // Create OPTIONS method for CORS
  try {
    await apigateway.putMethod({
      restApiId: API_ID,
      resourceId: getUserRolesResource.id,
      httpMethod: 'OPTIONS',
      authorizationType: 'NONE',
      apiKeyRequired: false
    }).promise();

    await apigateway.putIntegration({
      restApiId: API_ID,
      resourceId: getUserRolesResource.id,
      httpMethod: 'OPTIONS',
      type: 'MOCK',
      requestTemplates: {
        'application/json': '{"statusCode": 200}'
      }
    }).promise();

    await apigateway.putMethodResponse({
      restApiId: API_ID,
      resourceId: getUserRolesResource.id,
      httpMethod: 'OPTIONS',
      statusCode: '200',
      responseParameters: {
        'method.response.header.Access-Control-Allow-Headers': true,
        'method.response.header.Access-Control-Allow-Methods': true,
        'method.response.header.Access-Control-Allow-Origin': true
      }
    }).promise();

    await apigateway.putIntegrationResponse({
      restApiId: API_ID,
      resourceId: getUserRolesResource.id,
      httpMethod: 'OPTIONS',
      statusCode: '200',
      responseParameters: {
        'method.response.header.Access-Control-Allow-Headers': "'Content-Type,Authorization'",
        'method.response.header.Access-Control-Allow-Methods': "'GET,OPTIONS'",
        'method.response.header.Access-Control-Allow-Origin': "'*'"
      }
    }).promise();

    console.log('✅ Added OPTIONS method for CORS');
  } catch (err) {
    if (err.code !== 'ConflictException') {
      throw err;
    }
    console.log('⚠️ OPTIONS method already exists');
  }

  // Deploy
  await apigateway.createDeployment({
    restApiId: API_ID,
    stageName: 'prod',
    description: 'Fixed authentication'
  }).promise();

  console.log('✅ Deployed changes');
  console.log('🎉 API Gateway auth fixed!');
}

fixAuth().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
