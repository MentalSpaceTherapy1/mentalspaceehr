import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';

export class MentalSpaceEhrStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ========================================
    // 1. VPC - Virtual Private Network
    // ========================================
    const vpc = new ec2.Vpc(this, 'MentalSpaceVPC', {
      maxAzs: 2,
      natGateways: 1,
      subnetConfiguration: [
        {
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
        {
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
          cidrMask: 24,
        },
        {
          name: 'Isolated',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
          cidrMask: 24,
        },
      ],
    });

    // ========================================
    // 2. Database Security Group
    // ========================================
    const dbSecurityGroup = new ec2.SecurityGroup(this, 'DatabaseSecurityGroup', {
      vpc,
      description: 'Security group for Aurora PostgreSQL database',
      allowAllOutbound: false,
    });

    // Allow inbound PostgreSQL from within VPC only
    dbSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(vpc.vpcCidrBlock),
      ec2.Port.tcp(5432),
      'Allow PostgreSQL from within VPC'
    );

    // ========================================
    // 3. Database Credentials Secret
    // ========================================
    const dbSecret = new secretsmanager.Secret(this, 'DatabaseCredentials', {
      secretName: 'mentalspace-ehr-db-credentials',
      description: 'Aurora PostgreSQL database credentials',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: 'postgres' }),
        generateStringKey: 'password',
        excludePunctuation: true,
        includeSpace: false,
        passwordLength: 32,
      },
    });

    // ========================================
    // 4. Aurora Serverless v2 PostgreSQL
    // ========================================
    const dbCluster = new rds.DatabaseCluster(this, 'Database', {
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_15_3,
      }),
      credentials: rds.Credentials.fromSecret(dbSecret),
      writer: rds.ClusterInstance.serverlessV2('writer', {
        publiclyAccessible: false,
      }),
      readers: [
        rds.ClusterInstance.serverlessV2('reader', {
          scaleWithWriter: true,
        }),
      ],
      serverlessV2MinCapacity: 0.5, // $43/month baseline
      serverlessV2MaxCapacity: 8,    // Scales to 10K users
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
      securityGroups: [dbSecurityGroup],
      defaultDatabaseName: 'mentalspaceehr',
      backup: {
        retention: cdk.Duration.days(30), // HIPAA requirement
        preferredWindow: '03:00-04:00',   // 3 AM EST
      },
      storageEncrypted: true,
      deletionProtection: false, // Disable for initial deployment, enable manually after
      cloudwatchLogsExports: ['postgresql'],
      cloudwatchLogsRetention: logs.RetentionDays.ONE_YEAR,
    });

    // ========================================
    // 5. S3 Bucket for Documents/Files
    // ========================================
    const filesBucket = new s3.Bucket(this, 'FilesBucket', {
      bucketName: `mentalspace-ehr-files-${this.account}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: true,
      lifecycleRules: [
        {
          id: 'DeleteOldVersions',
          noncurrentVersionExpiration: cdk.Duration.days(30),
        },
      ],
      enforceSSL: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // ========================================
    // 6. S3 Bucket for Video Recordings
    // ========================================
    const videosBucket = new s3.Bucket(this, 'VideosBucket', {
      bucketName: `mentalspace-ehr-videos-${this.account}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: false,
      lifecycleRules: [
        {
          id: 'ArchiveOldVideos',
          transitions: [
            {
              storageClass: s3.StorageClass.GLACIER,
              transitionAfter: cdk.Duration.days(90), // Archive after 90 days
            },
          ],
          expiration: cdk.Duration.days(365), // HIPAA retention
        },
      ],
      enforceSSL: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // ========================================
    // 7. CloudFront Distribution for Videos
    // ========================================
    const videoDistribution = new cloudfront.Distribution(this, 'VideoDistribution', {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(videosBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100, // US, Canada, Europe
      comment: 'MentalSpace EHR video streaming',
    });

    // ========================================
    // 8. Cognito User Pool
    // ========================================
    const userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: 'mentalspace-ehr-users',
      selfSignUpEnabled: false, // Admin creates users
      signInAliases: {
        email: true,
        username: false,
      },
      passwordPolicy: {
        minLength: 12,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
      },
      mfa: cognito.Mfa.REQUIRED,
      mfaSecondFactor: {
        sms: true,
        otp: true,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      standardAttributes: {
        email: {
          required: true,
          mutable: true,
        },
        fullname: {
          required: true,
          mutable: true,
        },
      },
      customAttributes: {
        role: new cognito.StringAttribute({ minLen: 1, maxLen: 50, mutable: true }),
        organizationId: new cognito.StringAttribute({ minLen: 1, maxLen: 100, mutable: true }),
        practiceId: new cognito.StringAttribute({ minLen: 1, maxLen: 100, mutable: false }),
      },
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // ========================================
    // 9. Cognito User Pool Client
    // ========================================
    const userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
      userPool,
      userPoolClientName: 'mentalspace-ehr-web-client',
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
        },
        scopes: [
          cognito.OAuthScope.EMAIL,
          cognito.OAuthScope.OPENID,
          cognito.OAuthScope.PROFILE,
        ],
      },
      preventUserExistenceErrors: true,
      accessTokenValidity: cdk.Duration.hours(1),
      idTokenValidity: cdk.Duration.hours(1),
      refreshTokenValidity: cdk.Duration.days(30),
    });

    // ========================================
    // 10. Cognito Identity Pool
    // ========================================
    const identityPool = new cognito.CfnIdentityPool(this, 'IdentityPool', {
      identityPoolName: 'mentalspace-ehr-identity-pool',
      allowUnauthenticatedIdentities: false,
      cognitoIdentityProviders: [
        {
          clientId: userPoolClient.userPoolClientId,
          providerName: userPool.userPoolProviderName,
        },
      ],
    });

    // ========================================
    // 11. IAM Roles for Cognito Identity Pool
    // ========================================
    const authenticatedRole = new iam.Role(this, 'CognitoAuthenticatedRole', {
      assumedBy: new iam.FederatedPrincipal(
        'cognito-identity.amazonaws.com',
        {
          StringEquals: {
            'cognito-identity.amazonaws.com:aud': identityPool.ref,
          },
          'ForAnyValue:StringLike': {
            'cognito-identity.amazonaws.com:amr': 'authenticated',
          },
        },
        'sts:AssumeRoleWithWebIdentity'
      ),
    });

    // Allow authenticated users to upload to S3
    filesBucket.grantReadWrite(authenticatedRole);
    videosBucket.grantReadWrite(authenticatedRole);

    // Attach role to identity pool
    new cognito.CfnIdentityPoolRoleAttachment(this, 'IdentityPoolRoleAttachment', {
      identityPoolId: identityPool.ref,
      roles: {
        authenticated: authenticatedRole.roleArn,
      },
    });

    // ========================================
    // 12. API Gateway CloudWatch Role (Required for logging)
    // ========================================
    const apiGatewayCloudWatchRole = new iam.Role(this, 'ApiGatewayCloudWatchRole', {
      assumedBy: new iam.ServicePrincipal('apigateway.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonAPIGatewayPushToCloudWatchLogs'),
      ],
    });

    const cfnAccount = new apigateway.CfnAccount(this, 'ApiGatewayAccount', {
      cloudWatchRoleArn: apiGatewayCloudWatchRole.roleArn,
    });

    // ========================================
    // 13. API Gateway
    // ========================================
    const api = new apigateway.RestApi(this, 'Api', {
      restApiName: 'MentalSpace EHR API',
      description: 'HIPAA-compliant API for MentalSpace EHR',
      cloudWatchRole: false, // We manage the role manually above
      deployOptions: {
        stageName: 'prod',
        throttlingRateLimit: 2000,
        throttlingBurstLimit: 5000,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: false, // Don't log request/response bodies (PHI)
        metricsEnabled: true,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS, // Restrict in production
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: [
          'Content-Type',
          'Authorization',
          'X-Amz-Date',
          'X-Api-Key',
          'X-Amz-Security-Token',
        ],
      },
    });

    // Ensure the account config is created before the API deployment
    api.node.addDependency(cfnAccount);

    // Example health check endpoint (no auth required)
    const health = api.root.addResource('health');
    health.addMethod('GET', new apigateway.MockIntegration({
      integrationResponses: [{
        statusCode: '200',
        responseTemplates: {
          'application/json': '{"status": "healthy"}',
        },
      }],
      requestTemplates: {
        'application/json': '{"statusCode": 200}',
      },
    }), {
      methodResponses: [{ statusCode: '200' }],
    });

    // ========================================
    // 14. Lambda Security Group
    // ========================================
    const lambdaSecurityGroup = new ec2.SecurityGroup(this, 'LambdaSecurityGroup', {
      vpc,
      description: 'Security group for Lambda functions',
      allowAllOutbound: true,
    });

    // Allow Lambda to access Aurora
    dbSecurityGroup.addIngressRule(
      lambdaSecurityGroup,
      ec2.Port.tcp(5432),
      'Allow Lambda functions to access Aurora'
    );

    // ========================================
    // 15. Lambda Layer for Dependencies
    // ========================================
    const databaseLayer = new lambda.LayerVersion(this, 'DatabaseLayer', {
      code: lambda.Code.fromAsset('lambda-layers/database'),
      compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
      description: 'PostgreSQL client (pg) library',
    });

    // ========================================
    // 16. Lambda Execution Role
    // ========================================
    const lambdaExecutionRole = new iam.Role(this, 'LambdaExecutionRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaVPCAccessExecutionRole'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    // Allow Lambda to read database credentials
    dbSecret.grantRead(lambdaExecutionRole);

    // ========================================
    // 17. Database Migration Lambda
    // ========================================
    const migrationFunction = new lambda.Function(this, 'MigrationFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/migrate-database'),
      role: lambdaExecutionRole,
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      securityGroups: [lambdaSecurityGroup],
      timeout: cdk.Duration.minutes(15),
      memorySize: 512,
      environment: {
        DATABASE_SECRET_ARN: dbSecret.secretArn,
        DATABASE_NAME: 'mentalspaceehr',
      },
      layers: [databaseLayer],
    });

    // Add migration endpoint to API
    const migrate = api.root.addResource('migrate');
    migrate.addMethod('POST', new apigateway.LambdaIntegration(migrationFunction));

    // ========================================
    // 18. Health Check Lambda
    // ========================================
    const healthCheckFunction = new lambda.Function(this, 'HealthCheckFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/health-check'),
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
      },
      layers: [databaseLayer],
    });

    // Add health check to existing endpoint
    health.addMethod('POST', new apigateway.LambdaIntegration(healthCheckFunction));

    // Cognito Authorizer (defined after API for proper attachment)
    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'ApiAuthorizer', {
      cognitoUserPools: [userPool],
      authorizerName: 'CognitoAuthorizer',
    });
    authorizer._attachToApi(api);

    // ========================================
    // CRUD Lambda Functions
    // ========================================
    const queryFunction = new lambda.Function(this, 'QueryDatabaseFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/query-database'),
      role: lambdaExecutionRole,
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [lambdaSecurityGroup],
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: {
        DATABASE_ENDPOINT: dbCluster.clusterEndpoint.hostname,
        DATABASE_PORT: '5432',
        DATABASE_NAME: 'mentalspaceehr',
        DATABASE_USER: 'postgres',
        DATABASE_PASSWORD: dbSecret.secretValueFromJson('password').unsafeUnwrap(),
      },
      layers: [databaseLayer],
    });

    const insertFunction = new lambda.Function(this, 'InsertDatabaseFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/insert-database'),
      role: lambdaExecutionRole,
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [lambdaSecurityGroup],
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: {
        DATABASE_ENDPOINT: dbCluster.clusterEndpoint.hostname,
        DATABASE_PORT: '5432',
        DATABASE_NAME: 'mentalspaceehr',
        DATABASE_USER: 'postgres',
        DATABASE_PASSWORD: dbSecret.secretValueFromJson('password').unsafeUnwrap(),
      },
      layers: [databaseLayer],
    });

    // Add API routes
    const queryResource = api.root.addResource('query').addResource('{table}');
    queryResource.addMethod('GET', new apigateway.LambdaIntegration(queryFunction), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    const insertResource = api.root.addResource('insert').addResource('{table}');
    insertResource.addMethod('POST', new apigateway.LambdaIntegration(insertFunction), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // ========================================
    // 19. CloudWatch Log Groups (Auto-created by Lambda/API Gateway)
    // ========================================
    // Note: Log groups are automatically created by Lambda and API Gateway
    // with default retention (never expire). We can manage them post-deployment.

    // ========================================
    // 20. Outputs
    // ========================================
    new cdk.CfnOutput(this, 'VpcId', {
      value: vpc.vpcId,
      description: 'VPC ID',
      exportName: 'MentalSpaceVpcId',
    });

    new cdk.CfnOutput(this, 'DatabaseEndpoint', {
      value: dbCluster.clusterEndpoint.hostname,
      description: 'Aurora database endpoint',
      exportName: 'MentalSpaceDatabaseEndpoint',
    });

    new cdk.CfnOutput(this, 'DatabaseSecretArn', {
      value: dbSecret.secretArn,
      description: 'Database credentials secret ARN',
      exportName: 'MentalSpaceDatabaseSecretArn',
    });

    new cdk.CfnOutput(this, 'FilesBucketName', {
      value: filesBucket.bucketName,
      description: 'S3 bucket for files',
      exportName: 'MentalSpaceFilesBucket',
    });

    new cdk.CfnOutput(this, 'VideosBucketName', {
      value: videosBucket.bucketName,
      description: 'S3 bucket for videos',
      exportName: 'MentalSpaceVideosBucket',
    });

    new cdk.CfnOutput(this, 'VideoDistributionDomain', {
      value: videoDistribution.distributionDomainName,
      description: 'CloudFront distribution for videos',
      exportName: 'MentalSpaceVideoDistribution',
    });

    new cdk.CfnOutput(this, 'UserPoolId', {
      value: userPool.userPoolId,
      description: 'Cognito User Pool ID',
      exportName: 'MentalSpaceUserPoolId',
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID',
      exportName: 'MentalSpaceUserPoolClientId',
    });

    new cdk.CfnOutput(this, 'IdentityPoolId', {
      value: identityPool.ref,
      description: 'Cognito Identity Pool ID',
      exportName: 'MentalSpaceIdentityPoolId',
    });

    new cdk.CfnOutput(this, 'ApiEndpoint', {
      value: api.url,
      description: 'API Gateway endpoint',
      exportName: 'MentalSpaceApiEndpoint',
    });
  }
}
