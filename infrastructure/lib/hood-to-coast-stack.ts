import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { RemovalPolicy } from 'aws-cdk-lib';

export interface HoodToCoastStackProps extends cdk.StackProps {
  domainName?: string;
  subdomain?: string;
  region: string;
  environment: string;
  useCustomDomain: boolean;
  mockMode: boolean;
  generateEnvFile: boolean;
}

// Helper function to get context values with defaults
function getContextValue(app: cdk.App, key: string, defaultValue?: string): string | undefined {
  return app.node.tryGetContext(key) || defaultValue;
}

export class HoodToCoastStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: HoodToCoastStackProps) {
    super(scope, id, props);

    const fullDomainName = props.useCustomDomain && props.domainName && props.subdomain 
      ? `${props.subdomain}.${props.domainName}` 
      : undefined;

    // S3 Bucket for hosting the frontend
    const websiteBucket = new s3.Bucket(this, 'WebsiteBucket', {
      bucketName: `${props.environment}-hood-to-coast-website-${this.account}`,
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      versioned: true,
    });

    // Create bucket policy to allow CloudFront access
    const bucketPolicy = new s3.BucketPolicy(this, 'WebsiteBucketPolicy', {
      bucket: websiteBucket,
    });

    // Grant CloudFront access to the bucket
    bucketPolicy.document.addStatements(
      new iam.PolicyStatement({
        sid: 'AllowCloudFrontAccess',
        effect: iam.Effect.ALLOW,
        principals: [new iam.ServicePrincipal('cloudfront.amazonaws.com')],
        actions: ['s3:GetObject'],
        resources: [websiteBucket.arnForObjects('*')],
        conditions: {
          StringEquals: {
            'AWS:SourceArn': `arn:aws:cloudfront::${this.account}:distribution/*`,
          },
        },
      })
    );

    // CloudFront Distribution
    let distribution: cloudfront.Distribution;
    let hostedZone: route53.IHostedZone | undefined;
    
    if (props.useCustomDomain && fullDomainName) {
      // Custom domain setup - lookup hosted zone once
      hostedZone = route53.HostedZone.fromLookup(this, 'HostedZone', {
        domainName: props.domainName!,
      });

      const certificate = new acm.Certificate(this, 'Certificate', {
        domainName: fullDomainName,
        validation: acm.CertificateValidation.fromDns(hostedZone),
      });

      distribution = new cloudfront.Distribution(this, 'Distribution', {
        defaultBehavior: {
          origin: new origins.S3Origin(websiteBucket),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
          cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
          originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
        },
        domainNames: [fullDomainName],
        certificate,
        errorResponses: [
          {
            httpStatus: 404,
            responseHttpStatus: 200,
            responsePagePath: '/index.html',
          },
          {
            httpStatus: 403,
            responseHttpStatus: 200,
            responsePagePath: '/index.html',
          },
        ],
      });

      // Route53 DNS for frontend
      new route53.ARecord(this, 'AliasRecord', {
        zone: hostedZone,
        recordName: props.subdomain!,
        target: route53.RecordTarget.fromAlias(
          new targets.CloudFrontTarget(distribution)
        ),
      });

      // Create backend infrastructure if we have a custom domain
      if (hostedZone) {
        this.createBackendInfrastructure(props, hostedZone);
      }
    } else {
      // Create backend infrastructure even without custom domain
      // We need this for the API to work
      this.createBackendInfrastructure(props, undefined);
      
      // Simple CloudFront setup without custom domain
      distribution = new cloudfront.Distribution(this, 'Distribution', {
        defaultBehavior: {
          origin: new origins.S3Origin(websiteBucket),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
          cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
          originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
        },
        errorResponses: [
          {
            httpStatus: 404,
            responseHttpStatus: 200,
            responsePagePath: '/index.html',
          },
          {
            httpStatus: 403,
            responseHttpStatus: 200,
            responsePagePath: '/index.html',
          },
        ],
      });
    }

    // Frontend deployment is handled by the CI/CD pipeline (S3 sync + CloudFront invalidation)
    // See .github/workflows/deploy.yml → deploy-frontend job

    // Generate environment file for web-app if requested
    if (props.generateEnvFile) {
      this.generateEnvironmentFile(props, distribution.distributionDomainName);
    }

    // GitHub Actions OIDC Provider & Deploy Role
    // The OIDC provider is account-global (only one per account), so we look it up
    // rather than create it — avoids collision between dev and prod stacks.
    const githubOidcProvider = iam.OpenIdConnectProvider.fromOpenIdConnectProviderArn(
      this,
      'GithubOidcProvider',
      `arn:aws:iam::${this.account}:oidc-provider/token.actions.githubusercontent.com`,
    );

    const githubDeployRole = new iam.Role(this, 'GithubActionsDeployRole', {
      roleName: `${props.environment}-github-actions-deploy`,
      assumedBy: new iam.WebIdentityPrincipal(
        githubOidcProvider.openIdConnectProviderArn,
        {
          StringEquals: {
            'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
          },
          StringLike: {
            'token.actions.githubusercontent.com:sub':
              'repo:andrewjherrmann/hood-to-coast-time-tracker:environment:*',
          },
        }
      ),
      description: 'Role assumed by GitHub Actions for CI/CD deployments',
    });

    // CDK bootstrap role assumption (required for cdk deploy)
    githubDeployRole.addToPolicy(new iam.PolicyStatement({
      sid: 'AssumeBootstrapRoles',
      actions: ['sts:AssumeRole'],
      resources: [`arn:aws:iam::${this.account}:role/cdk-*`],
    }));

    // CloudFormation permissions for CDK
    githubDeployRole.addToPolicy(new iam.PolicyStatement({
      sid: 'CloudFormation',
      actions: [
        'cloudformation:DescribeStacks',
        'cloudformation:GetTemplate',
        'cloudformation:CreateChangeSet',
        'cloudformation:DescribeChangeSet',
        'cloudformation:ExecuteChangeSet',
        'cloudformation:DeleteChangeSet',
        'cloudformation:DescribeStackEvents',
      ],
      resources: [`arn:aws:cloudformation:${props.region}:${this.account}:stack/HoodToCoastStack-${props.environment}/*`],
    }));

    // S3 permissions for frontend deployment
    githubDeployRole.addToPolicy(new iam.PolicyStatement({
      sid: 'S3Deploy',
      actions: [
        's3:PutObject',
        's3:GetObject',
        's3:DeleteObject',
        's3:ListBucket',
        's3:GetBucketLocation',
      ],
      resources: [
        websiteBucket.bucketArn,
        websiteBucket.arnForObjects('*'),
      ],
    }));

    // CloudFront invalidation
    githubDeployRole.addToPolicy(new iam.PolicyStatement({
      sid: 'CloudFrontInvalidation',
      actions: ['cloudfront:CreateInvalidation'],
      resources: [`arn:aws:cloudfront::${this.account}:distribution/${distribution.distributionId}`],
    }));

    new cdk.CfnOutput(this, 'GithubActionsRoleArn', {
      value: githubDeployRole.roleArn,
      description: 'IAM Role ARN for GitHub Actions (set as AWS_ROLE_ARN secret)',
    });

    // Outputs
    new cdk.CfnOutput(this, 'WebsiteUrl', {
      value: props.useCustomDomain && fullDomainName 
        ? `https://${fullDomainName}` 
        : `https://${distribution.distributionDomainName}`,
      description: 'Website URL',
    });

    new cdk.CfnOutput(this, 'DistributionId', {
      value: distribution.distributionId,
      description: 'CloudFront Distribution ID',
    });

    new cdk.CfnOutput(this, 'WebsiteBucketName', {
      value: websiteBucket.bucketName,
      description: 'S3 Bucket Name for Website',
    });

    // Mock mode specific outputs
    if (props.mockMode) {
      new cdk.CfnOutput(this, 'MockModeInfo', {
        value: 'Application is running in MOCK MODE - all data is local mock data',
        description: 'Mock Mode Information',
      });
    }
  }

  private createBackendInfrastructure(props: HoodToCoastStackProps, hostedZone?: route53.IHostedZone) {
    // DynamoDB Tables
    const racesTable = new dynamodb.Table(this, 'RacesTable', {
      tableName: `${props.environment}-htc-races`,
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // API Key
    const apiKey = new apigateway.ApiKey(this, 'ApiKey', {
      apiKeyName: `${props.environment}-htc-api-key`,
      description: 'API Key for Hood to Coast Time Tracker frontend',
    });

    // Store API Key ID in SSM Parameter Store
    new ssm.StringParameter(this, 'ApiKeyParameter', {
      parameterName: `/${props.environment}/htc/api-key-id`,
      stringValue: apiKey.keyId,
      description: 'API Key ID for Hood to Coast Time Tracker',
    });

    // Build the allowed origins list for CORS
    const allowedOrigins = [
      ...(props.useCustomDomain && props.subdomain && props.domainName 
        ? [
            `https://${props.subdomain}.${props.domainName}`,
            `https://htcapi.dev.${props.domainName}`,
            `https://htcapi.${props.domainName}`,
          ]
        : []),
      'http://localhost:9000',
      'http://localhost:3000'
    ];

    // Lambda function for races endpoint with DynamoDB integration
    const racesFunction = new lambda.Function(this, 'RacesFunction', {
      functionName: `${props.environment}-htc-races`,
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/races'),
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      logRetention: logs.RetentionDays.ONE_WEEK,
      environment: {
        ENVIRONMENT: props.environment,
        RACES_TABLE_NAME: racesTable.tableName,
        ALLOWED_ORIGINS: allowedOrigins.join(','),
      },
    });

    // Grant DynamoDB read/write permissions to the Lambda function
    racesTable.grantReadWriteData(racesFunction);

    // API Gateway
    const api = new apigateway.RestApi(this, 'HoodToCoastApi', {
      restApiName: `${props.environment}-htc-api`,
      description: 'Hood to Coast Time Tracker API',
      defaultCorsPreflightOptions: {
        allowOrigins: allowedOrigins,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'X-Api-Key'],
        allowCredentials: true,
      },
      deployOptions: {
        stageName: props.environment,
        loggingLevel: props.environment === 'production' 
          ? apigateway.MethodLoggingLevel.ERROR 
          : apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: props.environment !== 'production',
      },
    });

    // Custom domain for API (only if hostedZone is available)
    if (hostedZone && props.useCustomDomain && props.domainName) {
      const apiDomainName = props.environment === 'development' 
        ? `htcapi.dev.${props.domainName}` 
        : `htcapi.${props.domainName}`;

      const apiCertificate = new acm.Certificate(this, 'ApiCertificate', {
        domainName: apiDomainName,
        validation: acm.CertificateValidation.fromDns(hostedZone),
      });

      const apiDomain = new apigateway.DomainName(this, 'ApiDomain', {
        domainName: apiDomainName,
        certificate: apiCertificate,
        securityPolicy: apigateway.SecurityPolicy.TLS_1_2,
      });

      // Associate the domain with the API
      new apigateway.BasePathMapping(this, 'ApiBasePathMapping', {
        domainName: apiDomain,
        restApi: api,
        basePath: '',
      });

      // Route53 DNS for API
      new route53.ARecord(this, 'ApiAliasRecord', {
        zone: hostedZone,
        recordName: props.environment === 'development' ? 'htcapi.dev' : 'htcapi',
        target: route53.RecordTarget.fromAlias(
          new targets.ApiGatewayDomain(apiDomain)
        ),
      });
    }

    // API Gateway usage plan
    const usagePlan = new apigateway.UsagePlan(this, 'UsagePlan', {
      name: `${props.environment}-htc-usage-plan`,
      description: 'Usage plan for Hood to Coast Time Tracker API',
      throttle: {
        rateLimit: 100,
        burstLimit: 200,
      },
      quota: {
        limit: 10000,
        period: apigateway.Period.MONTH,
      },
    });

    usagePlan.addApiKey(apiKey);
    
    // Associate usage plan with API stage
    usagePlan.addApiStage({
      stage: api.deploymentStage,
    });

    // Force API Gateway deployment to ensure all changes are applied
    new apigateway.Deployment(this, 'ApiDeployment', {
      api,
      description: 'Deployment for Lambda integration changes',
      retainDeployments: false,
    });

    // FULL CRUD ENDPOINTS for races
    const racesResource = api.root.addResource('races');
    
    // GET /races - List all races
    racesResource.addMethod('GET', new apigateway.LambdaIntegration(racesFunction), {
      apiKeyRequired: true,
    });

    // POST /races - Create new race
    racesResource.addMethod('POST', new apigateway.LambdaIntegration(racesFunction), {
      apiKeyRequired: true,
    });

    // Individual race resource for PUT/DELETE operations
    const raceResource = racesResource.addResource('{id}');
    
    // GET /races/{id} - Get specific race
    raceResource.addMethod('GET', new apigateway.LambdaIntegration(racesFunction), {
      apiKeyRequired: true,
    });
    
    // PUT /races/{id} - Update race
    raceResource.addMethod('PUT', new apigateway.LambdaIntegration(racesFunction), {
      apiKeyRequired: true,
    });

    // DELETE /races/{id} - Delete race
    raceResource.addMethod('DELETE', new apigateway.LambdaIntegration(racesFunction), {
      apiKeyRequired: true,
    });

    // Add outputs
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: hostedZone && props.useCustomDomain && props.domainName
        ? `https://${props.environment === 'development' ? 'htcapi.dev.' : 'htcapi.'}${props.domainName}`
        : `https://${api.restApiId}.execute-api.${props.region}.amazonaws.com/${props.environment}/`,
      description: 'API Gateway URL',
    });

    new cdk.CfnOutput(this, 'ApiKeyId', {
      value: apiKey.keyId,
      description: 'API Key ID',
    });

    new cdk.CfnOutput(this, 'DynamoDBTables', {
      value: `Races: ${racesTable.tableName}`,
      description: 'DynamoDB Table Names',
    });
  }

  private generateEnvironmentFile(
    props: HoodToCoastStackProps, 
    distributionDomain: string
  ) {
    const envContent = `# Environment configuration for Hood to Coast Time Tracker
# Generated by CDK deployment - DO NOT EDIT MANUALLY

# Mock Mode Configuration
VITE_MOCK_MODE=${props.mockMode}

# AWS Configuration
VITE_AWS_REGION=${props.region}
VITE_ENVIRONMENT=${props.environment}

# Domain Configuration
VITE_USE_CUSTOM_DOMAIN=${props.useCustomDomain}
${props.domainName ? `VITE_DOMAIN_NAME=${props.domainName}` : ''}
${props.subdomain ? `VITE_SUBDOMAIN=${props.subdomain}` : ''}

# Website URL
VITE_WEBSITE_URL=https://${distributionDomain}

# Mock Mode Note
${props.mockMode ? '# Running in MOCK MODE - all data is local mock data' : '# Running in PRODUCTION MODE - requires API endpoints'}

# API Configuration (when not in mock mode)
${!props.mockMode ? `VITE_API_URL=https://htcapi${props.environment === 'development' ? '.dev' : ''}.${props.domainName}` : ''}
${!props.mockMode ? 'VITE_API_KEY_REQUIRED=true' : ''}
`;

    // Output the environment file content for manual deployment
    new cdk.CfnOutput(this, 'EnvironmentFileContent', {
      value: envContent,
      description: 'Environment file content to copy to web-app/.env.production',
    });
  }
}
