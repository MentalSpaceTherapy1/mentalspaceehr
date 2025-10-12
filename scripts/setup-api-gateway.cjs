#!/usr/bin/env node

/**
 * API Gateway Setup Script
 *
 * This script configures API Gateway endpoints for all Lambda functions
 * with Cognito authorization.
 */

const {
  APIGatewayClient,
  GetRestApisCommand,
  GetResourcesCommand,
  CreateResourceCommand,
  PutMethodCommand,
  PutIntegrationCommand,
  CreateDeploymentCommand,
  GetAuthorizersCommand,
  CreateAuthorizerCommand,
} = require('@aws-sdk/client-api-gateway');

const { LambdaClient, AddPermissionCommand } = require('@aws-sdk/client-lambda');

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  AWS_REGION: 'us-east-1',
  COGNITO_USER_POOL_ARN: 'arn:aws:cognito-idp:us-east-1:706704660887:userpool/us-east-1_ssisECEGa',
  API_GATEWAY_ID: 'xmbq984faa', // From VITE_API_ENDPOINT
  STAGE_NAME: 'prod',
  LAMBDA_FUNCTIONS_DIR: path.join(__dirname, '..', 'infrastructure', 'lambda'),
};

const apiGateway = new APIGatewayClient({ region: CONFIG.AWS_REGION });
const lambda = new LambdaClient({ region: CONFIG.AWS_REGION });

async function getAllLambdaFunctions() {
  const lambdaDir = CONFIG.LAMBDA_FUNCTIONS_DIR;
  const functions = fs.readdirSync(lambdaDir).filter(file => {
    const fullPath = path.join(lambdaDir, file);
    return fs.statSync(fullPath).isDirectory();
  });

  console.log(`📦 Found ${functions.length} Lambda functions`);
  return functions;
}

async function getOrCreateCognitoAuthorizer() {
  try {
    // Check if authorizer exists
    const authorizersResponse = await apiGateway.send(new GetAuthorizersCommand({
      restApiId: CONFIG.API_GATEWAY_ID,
    }));

    const existingAuthorizer = authorizersResponse.items?.find(
      auth => auth.name === 'CognitoAuthorizer'
    );

    if (existingAuthorizer) {
      console.log('✅ Cognito Authorizer already exists:', existingAuthorizer.id);
      return existingAuthorizer.id;
    }

    // Create new authorizer
    const createResponse = await apiGateway.send(new CreateAuthorizerCommand({
      restApiId: CONFIG.API_GATEWAY_ID,
      name: 'CognitoAuthorizer',
      type: 'COGNITO_USER_POOLS',
      providerARNs: [CONFIG.COGNITO_USER_POOL_ARN],
      identitySource: 'method.request.header.Authorization',
    }));

    console.log('✅ Created Cognito Authorizer:', createResponse.id);
    return createResponse.id;
  } catch (error) {
    console.error('❌ Error setting up authorizer:', error.message);
    throw error;
  }
}

async function getOrCreateResource(parentId, pathPart) {
  try {
    // Get existing resources
    const resourcesResponse = await apiGateway.send(new GetResourcesCommand({
      restApiId: CONFIG.API_GATEWAY_ID,
    }));

    // Check if resource exists
    const existingResource = resourcesResponse.items?.find(
      resource => resource.parentId === parentId && resource.pathPart === pathPart
    );

    if (existingResource) {
      return existingResource.id;
    }

    // Create new resource
    const createResponse = await apiGateway.send(new CreateResourceCommand({
      restApiId: CONFIG.API_GATEWAY_ID,
      parentId: parentId,
      pathPart: pathPart,
    }));

    return createResponse.id;
  } catch (error) {
    console.error(`❌ Error creating resource ${pathPart}:`, error.message);
    throw error;
  }
}

async function setupEndpoint(functionName, resourceId, authorizerId) {
  const lambdaArn = `arn:aws:lambda:${CONFIG.AWS_REGION}:706704660887:function:${functionName}`;
  const httpMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

  for (const httpMethod of httpMethods) {
    try {
      // Create method with Cognito authorization
      await apiGateway.send(new PutMethodCommand({
        restApiId: CONFIG.API_GATEWAY_ID,
        resourceId: resourceId,
        httpMethod: httpMethod,
        authorizationType: 'COGNITO_USER_POOLS',
        authorizerId: authorizerId,
        requestParameters: {
          'method.request.header.Authorization': true,
        },
      }));

      // Create Lambda integration
      await apiGateway.send(new PutIntegrationCommand({
        restApiId: CONFIG.API_GATEWAY_ID,
        resourceId: resourceId,
        httpMethod: httpMethod,
        type: 'AWS_PROXY',
        integrationHttpMethod: 'POST',
        uri: `arn:aws:apigateway:${CONFIG.AWS_REGION}:lambda:path/2015-03-31/functions/${lambdaArn}/invocations`,
      }));

      // Grant API Gateway permission to invoke Lambda
      const statementId = `apigateway-${functionName}-${httpMethod}-${Date.now()}`;
      try {
        await lambda.send(new AddPermissionCommand({
          FunctionName: functionName,
          StatementId: statementId,
          Action: 'lambda:InvokeFunction',
          Principal: 'apigateway.amazonaws.com',
          SourceArn: `arn:aws:execute-api:${CONFIG.AWS_REGION}:706704660887:${CONFIG.API_GATEWAY_ID}/*/${httpMethod}/${functionName}`,
        }));
      } catch (permError) {
        // Permission may already exist, that's OK
        if (!permError.message.includes('already exists')) {
          throw permError;
        }
      }

    } catch (error) {
      if (!error.message.includes('ConflictException')) {
        console.error(`   ⚠️  ${httpMethod} method error:`, error.message);
      }
    }
  }

  // Add OPTIONS method for CORS
  try {
    await apiGateway.send(new PutMethodCommand({
      restApiId: CONFIG.API_GATEWAY_ID,
      resourceId: resourceId,
      httpMethod: 'OPTIONS',
      authorizationType: 'NONE',
    }));

    await apiGateway.send(new PutIntegrationCommand({
      restApiId: CONFIG.API_GATEWAY_ID,
      resourceId: resourceId,
      httpMethod: 'OPTIONS',
      type: 'MOCK',
      requestTemplates: {
        'application/json': '{"statusCode": 200}',
      },
    }));
  } catch (error) {
    // OPTIONS may already exist
  }
}

async function main() {
  console.log('🚀 API Gateway Setup\n');
  console.log('================================================================================');
  console.log('Configuration:');
  console.log(`  API Gateway ID: ${CONFIG.API_GATEWAY_ID}`);
  console.log(`  Cognito Pool ARN: ${CONFIG.COGNITO_USER_POOL_ARN}`);
  console.log('================================================================================\n');

  try {
    // Get root resource
    const resourcesResponse = await apiGateway.send(new GetResourcesCommand({
      restApiId: CONFIG.API_GATEWAY_ID,
    }));
    const rootResource = resourcesResponse.items?.find(r => r.path === '/');

    if (!rootResource) {
      throw new Error('Root resource not found');
    }

    console.log('✅ Found root resource:', rootResource.id);

    // Get or create Cognito authorizer
    const authorizerId = await getOrCreateCognitoAuthorizer();

    // Get all Lambda functions
    const functions = await getAllLambdaFunctions();

    console.log('\n📝 Setting up API endpoints...\n');

    let successCount = 0;
    let failCount = 0;

    for (const functionName of functions) {
      try {
        console.log(`[${successCount + failCount + 1}/${functions.length}] ${functionName}`);

        // Create resource for function
        const resourceId = await getOrCreateResource(rootResource.id, functionName);
        console.log(`   📍 Resource ID: ${resourceId}`);

        // Setup endpoint with all HTTP methods
        await setupEndpoint(functionName, resourceId, authorizerId);
        console.log('   ✅ SUCCESS\n');
        successCount++;

      } catch (error) {
        console.error(`   ❌ FAILED: ${error.message}\n`);
        failCount++;
      }
    }

    // Deploy to stage
    console.log('\n🚀 Deploying API to stage:', CONFIG.STAGE_NAME);
    await apiGateway.send(new CreateDeploymentCommand({
      restApiId: CONFIG.API_GATEWAY_ID,
      stageName: CONFIG.STAGE_NAME,
      description: `Deployment at ${new Date().toISOString()}`,
    }));

    console.log('\n================================================================================');
    console.log('📊 SETUP SUMMARY');
    console.log('================================================================================');
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed:     ${failCount}`);
    console.log(`📊 Total:      ${functions.length}`);
    console.log('================================================================================');
    console.log('\n✅ API Gateway setup complete!');
    console.log(`\n🌐 API Endpoint: https://${CONFIG.API_GATEWAY_ID}.execute-api.${CONFIG.AWS_REGION}.amazonaws.com/${CONFIG.STAGE_NAME}/`);

  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    process.exit(1);
  }
}

main();
