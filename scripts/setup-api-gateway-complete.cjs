const AWS = require('aws-sdk');

const apigateway = new AWS.APIGateway({ region: 'us-east-1' });
const lambda = new AWS.Lambda({ region: 'us-east-1' });

const API_NAME = 'MentalSpaceAPI';
const ACCOUNT_ID = '706704660887';
const REGION = 'us-east-1';

async function createApiGateway() {
  console.log('🚀 Setting up API Gateway...');

  // Create REST API
  const api = await apigateway.createRestApi({
    name: API_NAME,
    description: 'MentalSpace EHR API Gateway',
    endpointConfiguration: {
      types: ['REGIONAL']
    }
  }).promise();

  console.log('✅ Created API:', api.id);

  // Get root resource
  const resources = await apigateway.getResources({
    restApiId: api.id
  }).promise();

  const rootResourceId = resources.items.find(r => r.path === '/')?.id;

  // Create /get-user-roles resource
  const getUserRolesResource = await apigateway.createResource({
    restApiId: api.id,
    parentId: rootResourceId,
    pathPart: 'get-user-roles'
  }).promise();

  console.log('✅ Created resource: /get-user-roles');

  // Create GET method
  await apigateway.putMethod({
    restApiId: api.id,
    resourceId: getUserRolesResource.id,
    httpMethod: 'GET',
    authorizationType: 'AWS_IAM',
    apiKeyRequired: false
  }).promise();

  console.log('✅ Created GET method');

  // Integrate with Lambda
  const lambdaArn = `arn:aws:lambda:${REGION}:${ACCOUNT_ID}:function:mentalspace-get-user-roles`;

  await apigateway.putIntegration({
    restApiId: api.id,
    resourceId: getUserRolesResource.id,
    httpMethod: 'GET',
    type: 'AWS_PROXY',
    integrationHttpMethod: 'POST',
    uri: `arn:aws:apigateway:${REGION}:lambda:path/2015-03-31/functions/${lambdaArn}/invocations`
  }).promise();

  console.log('✅ Integrated with Lambda');

  // Add Lambda permission for API Gateway
  try {
    await lambda.addPermission({
      FunctionName: 'mentalspace-get-user-roles',
      StatementId: `apigateway-${api.id}-get-user-roles`,
      Action: 'lambda:InvokeFunction',
      Principal: 'apigateway.amazonaws.com',
      SourceArn: `arn:aws:execute-api:${REGION}:${ACCOUNT_ID}:${api.id}/*/*/get-user-roles`
    }).promise();
    console.log('✅ Added Lambda permission');
  } catch (err) {
    if (err.code !== 'ResourceConflictException') {
      throw err;
    }
    console.log('⚠️ Lambda permission already exists');
  }

  // Deploy to prod stage
  await apigateway.createDeployment({
    restApiId: api.id,
    stageName: 'prod',
    description: 'Production deployment'
  }).promise();

  console.log('✅ Deployed to prod stage');

  const apiUrl = `https://${api.id}.execute-api.${REGION}.amazonaws.com/prod`;
  console.log('\n🎉 API Gateway setup complete!');
  console.log(`📍 API URL: ${apiUrl}`);
  console.log(`🔗 Endpoint: ${apiUrl}/get-user-roles?user_id=USER_ID`);

  // Update .env file
  const fs = require('fs');
  const envPath = '.env';
  let envContent = '';

  try {
    envContent = fs.readFileSync(envPath, 'utf8');
  } catch (err) {
    // File doesn't exist, create new
  }

  const lines = envContent.split('\n');
  const apiEndpointIndex = lines.findIndex(line => line.startsWith('VITE_API_ENDPOINT='));

  if (apiEndpointIndex >= 0) {
    lines[apiEndpointIndex] = `VITE_API_ENDPOINT=${apiUrl}`;
  } else {
    lines.push(`VITE_API_ENDPOINT=${apiUrl}`);
  }

  fs.writeFileSync(envPath, lines.join('\n'));
  console.log('✅ Updated .env with API URL');
}

createApiGateway().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
