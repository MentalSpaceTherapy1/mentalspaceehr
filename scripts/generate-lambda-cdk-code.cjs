const fs = require('fs');
const path = require('path');

const LAMBDA_DIR = path.join(__dirname, '..', 'infrastructure', 'lambda');

// Get all Lambda function directories
const functions = fs.readdirSync(LAMBDA_DIR)
  .filter(name => {
    const stat = fs.statSync(path.join(LAMBDA_DIR, name));
    return stat.isDirectory() && fs.existsSync(path.join(LAMBDA_DIR, name, 'index.js'));
  })
  .filter(name => !['migrate-database', 'health-check'].includes(name)); // Skip already deployed

console.log(`\n📦 Generating CDK code for ${functions.length} Lambda functions...\n`);

// Generate Lambda function code
let lambdaCode = '';
let apiGatewayCode = '';
let outputsCode = '';

functions.forEach((functionName, index) => {
  const resourceName = functionName
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');

  const functionConstName = `${resourceName[0].toLowerCase()}${resourceName.slice(1)}Function`;

  // Generate Lambda function definition
  lambdaCode += `
    // ${index + 1}. ${functionName}
    const ${functionConstName} = new lambda.Function(this, '${resourceName}Function', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/${functionName}'),
      role: lambdaExecutionRole,
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      securityGroups: [lambdaSecurityGroup],
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: {
        DATABASE_SECRET_ARN: dbSecret.secretArn,
        DATABASE_NAME: 'mentalspaceehr',
        COGNITO_USER_POOL_ID: userPool.userPoolId,
      },
      layers: [databaseLayer],
    });

`;

  // Generate API Gateway resource and method
  const resourcePath = functionName;
  const resourceConstName = `${resourceName}Resource`;

  apiGatewayCode += `
    // ${functionName}
    const ${resourceConstName} = api.root.addResource('${resourcePath}');
    ${resourceConstName}.addMethod('POST', new apigateway.LambdaIntegration(${functionConstName}), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });
    ${resourceConstName}.addMethod('OPTIONS', new apigateway.MockIntegration({
      integrationResponses: [{ statusCode: '200', responseParameters: {
        'method.response.header.Access-Control-Allow-Headers': "'Content-Type,Authorization'",
        'method.response.header.Access-Control-Allow-Origin': "'*'",
        'method.response.header.Access-Control-Allow-Methods': "'OPTIONS,POST'"
      }}],
      passthroughBehavior: apigateway.PassthroughBehavior.NEVER,
      requestTemplates: { 'application/json': '{"statusCode": 200}' },
    }), {
      methodResponses: [{ statusCode: '200', responseParameters: {
        'method.response.header.Access-Control-Allow-Headers': true,
        'method.response.header.Access-Control-Allow-Origin': true,
        'method.response.header.Access-Control-Allow-Methods': true,
      }}],
    });

`;
});

// Write to a file that can be copy-pasted into infrastructure-stack.ts
const outputPath = path.join(__dirname, '..', 'infrastructure', 'lambda-functions-cdk.txt');
const output = `
// ========================================
// Lambda Functions (Auto-generated)
// ========================================
// Add this code to infrastructure-stack.ts after the existing Lambda functions

${lambdaCode}

// ========================================
// API Gateway Resources (Auto-generated)
// ========================================
// Add this code after the Cognito authorizer

${apiGatewayCode}
`;

fs.writeFileSync(outputPath, output);

console.log(`✅ Generated CDK code for ${functions.length} Lambda functions`);
console.log(`📄 Output saved to: infrastructure/lambda-functions-cdk.txt`);
console.log(`\n⚠️  Next steps:`);
console.log(`   1. Copy the generated code into infrastructure/lib/infrastructure-stack.ts`);
console.log(`   2. Run: cd infrastructure && npm run build`);
console.log(`   3. Run: npx cdk deploy`);
