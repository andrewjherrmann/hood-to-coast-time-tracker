"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HoodToCoastStack = void 0;
const cdk = require("aws-cdk-lib");
const s3 = require("aws-cdk-lib/aws-s3");
const cloudfront = require("aws-cdk-lib/aws-cloudfront");
const origins = require("aws-cdk-lib/aws-cloudfront-origins");
const route53 = require("aws-cdk-lib/aws-route53");
const targets = require("aws-cdk-lib/aws-route53-targets");
const acm = require("aws-cdk-lib/aws-certificatemanager");
const iam = require("aws-cdk-lib/aws-iam");
const apigateway = require("aws-cdk-lib/aws-apigateway");
const lambda = require("aws-cdk-lib/aws-lambda");
const dynamodb = require("aws-cdk-lib/aws-dynamodb");
const logs = require("aws-cdk-lib/aws-logs");
const ssm = require("aws-cdk-lib/aws-ssm");
const aws_cdk_lib_1 = require("aws-cdk-lib");
// Helper function to get context values with defaults
function getContextValue(app, key, defaultValue) {
    return app.node.tryGetContext(key) || defaultValue;
}
class HoodToCoastStack extends cdk.Stack {
    constructor(scope, id, props) {
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
        bucketPolicy.document.addStatements(new iam.PolicyStatement({
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
        }));
        // CloudFront Distribution
        let distribution;
        let hostedZone;
        if (props.useCustomDomain && fullDomainName) {
            // Custom domain setup - lookup hosted zone once
            hostedZone = route53.HostedZone.fromLookup(this, 'HostedZone', {
                domainName: props.domainName,
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
                recordName: props.subdomain,
                target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution)),
            });
            // Create backend infrastructure if we have a custom domain
            if (hostedZone) {
                this.createBackendInfrastructure(props, hostedZone);
            }
        }
        else {
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
        const githubOidcProvider = new iam.OpenIdConnectProvider(this, 'GithubOidcProvider', {
            url: 'https://token.actions.githubusercontent.com',
            clientIds: ['sts.amazonaws.com'],
        });
        const githubDeployRole = new iam.Role(this, 'GithubActionsDeployRole', {
            roleName: `${props.environment}-github-actions-deploy`,
            assumedBy: new iam.WebIdentityPrincipal(githubOidcProvider.openIdConnectProviderArn, {
                StringEquals: {
                    'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
                },
                StringLike: {
                    'token.actions.githubusercontent.com:sub': 'repo:andrewjherrmann/hood-to-coast-time-tracker:environment:*',
                },
            }),
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
            resources: [`arn:aws:cloudformation:${props.region}:${this.account}:stack/HoodToCoastStack/*`],
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
    createBackendInfrastructure(props, hostedZone) {
        // DynamoDB Tables
        const racesTable = new dynamodb.Table(this, 'RacesTable', {
            tableName: `${props.environment}-htc-races`,
            partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            removalPolicy: aws_cdk_lib_1.RemovalPolicy.DESTROY,
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
                target: route53.RecordTarget.fromAlias(new targets.ApiGatewayDomain(apiDomain)),
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
    generateEnvironmentFile(props, distributionDomain) {
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
exports.HoodToCoastStack = HoodToCoastStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaG9vZC10by1jb2FzdC1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImhvb2QtdG8tY29hc3Qtc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbUNBQW1DO0FBRW5DLHlDQUF5QztBQUN6Qyx5REFBeUQ7QUFDekQsOERBQThEO0FBQzlELG1EQUFtRDtBQUNuRCwyREFBMkQ7QUFDM0QsMERBQTBEO0FBQzFELDJDQUEyQztBQUMzQyx5REFBeUQ7QUFDekQsaURBQWlEO0FBQ2pELHFEQUFxRDtBQUNyRCw2Q0FBNkM7QUFDN0MsMkNBQTJDO0FBQzNDLDZDQUE0QztBQVk1QyxzREFBc0Q7QUFDdEQsU0FBUyxlQUFlLENBQUMsR0FBWSxFQUFFLEdBQVcsRUFBRSxZQUFxQjtJQUN2RSxPQUFPLEdBQUcsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxJQUFJLFlBQVksQ0FBQztBQUNyRCxDQUFDO0FBRUQsTUFBYSxnQkFBaUIsU0FBUSxHQUFHLENBQUMsS0FBSztJQUM3QyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQTRCO1FBQ3BFLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXhCLE1BQU0sY0FBYyxHQUFHLEtBQUssQ0FBQyxlQUFlLElBQUksS0FBSyxDQUFDLFVBQVUsSUFBSSxLQUFLLENBQUMsU0FBUztZQUNqRixDQUFDLENBQUMsR0FBRyxLQUFLLENBQUMsU0FBUyxJQUFJLEtBQUssQ0FBQyxVQUFVLEVBQUU7WUFDMUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQztRQUVkLHFDQUFxQztRQUNyQyxNQUFNLGFBQWEsR0FBRyxJQUFJLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLGVBQWUsRUFBRTtZQUN6RCxVQUFVLEVBQUUsR0FBRyxLQUFLLENBQUMsV0FBVywwQkFBMEIsSUFBSSxDQUFDLE9BQU8sRUFBRTtZQUN4RSxnQkFBZ0IsRUFBRSxLQUFLO1lBQ3ZC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Y0QsNENBa2NDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcclxuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XHJcbmltcG9ydCAqIGFzIHMzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1zMyc7XHJcbmltcG9ydCAqIGFzIGNsb3VkZnJvbnQgZnJvbSAnYXdzLWNkay1saWIvYXdzLWNsb3VkZnJvbnQnO1xyXG5pbXBvcnQgKiBhcyBvcmlnaW5zIGZyb20gJ2F3cy1jZGstbGliL2F3cy1jbG91ZGZyb250LW9yaWdpbnMnO1xyXG5pbXBvcnQgKiBhcyByb3V0ZTUzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1yb3V0ZTUzJztcclxuaW1wb3J0ICogYXMgdGFyZ2V0cyBmcm9tICdhd3MtY2RrLWxpYi9hd3Mtcm91dGU1My10YXJnZXRzJztcclxuaW1wb3J0ICogYXMgYWNtIGZyb20gJ2F3cy1jZGstbGliL2F3cy1jZXJ0aWZpY2F0ZW1hbmFnZXInO1xyXG5pbXBvcnQgKiBhcyBpYW0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWlhbSc7XHJcbmltcG9ydCAqIGFzIGFwaWdhdGV3YXkgZnJvbSAnYXdzLWNkay1saWIvYXdzLWFwaWdhdGV3YXknO1xyXG5pbXBvcnQgKiBhcyBsYW1iZGEgZnJvbSAnYXdzLWNkay1saWIvYXdzLWxhbWJkYSc7XHJcbmltcG9ydCAqIGFzIGR5bmFtb2RiIGZyb20gJ2F3cy1jZGstbGliL2F3cy1keW5hbW9kYic7XHJcbmltcG9ydCAqIGFzIGxvZ3MgZnJvbSAnYXdzLWNkay1saWIvYXdzLWxvZ3MnO1xyXG5pbXBvcnQgKiBhcyBzc20gZnJvbSAnYXdzLWNkay1saWIvYXdzLXNzbSc7XHJcbmltcG9ydCB7IFJlbW92YWxQb2xpY3kgfSBmcm9tICdhd3MtY2RrLWxpYic7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIEhvb2RUb0NvYXN0U3RhY2tQcm9wcyBleHRlbmRzIGNkay5TdGFja1Byb3BzIHtcclxuICBkb21haW5OYW1lPzogc3RyaW5nO1xyXG4gIHN1YmRvbWFpbj86IHN0cmluZztcclxuICByZWdpb246IHN0cmluZztcclxuICBlbnZpcm9ubWVudDogc3RyaW5nO1xyXG4gIHVzZUN1c3RvbURvbWFpbjogYm9vbGVhbjtcclxuICBtb2NrTW9kZTogYm9vbGVhbjtcclxuICBnZW5lcmF0ZUVudkZpbGU6IGJvb2xlYW47XHJcbn1cclxuXHJcbi8vIEhlbHBlciBmdW5jdGlvbiB0byBnZXQgY29udGV4dCB2YWx1ZXMgd2l0aCBkZWZhdWx0c1xyXG5mdW5jdGlvbiBnZXRDb250ZXh0VmFsdWUoYXBwOiBjZGsuQXBwLCBrZXk6IHN0cmluZywgZGVmYXVsdFZhbHVlPzogc3RyaW5nKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcclxuICByZXR1cm4gYXBwLm5vZGUudHJ5R2V0Q29udGV4dChrZXkpIHx8IGRlZmF1bHRWYWx1ZTtcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIEhvb2RUb0NvYXN0U3RhY2sgZXh0ZW5kcyBjZGsuU3RhY2sge1xyXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBIb29kVG9Db2FzdFN0YWNrUHJvcHMpIHtcclxuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xyXG5cclxuICAgIGNvbnN0IGZ1bGxEb21haW5OYW1lID0gcHJvcHMudXNlQ3VzdG9tRG9tYWluICYmIHByb3BzLmRvbWFpbk5hbWUgJiYgcHJvcHMuc3ViZG9tYWluIFxyXG4gICAgICA/IGAke3Byb3BzLnN1YmRvbWFpbn0uJHtwcm9wcy5kb21haW5OYW1lfWAgXHJcbiAgICAgIDogdW5kZWZpbmVkO1xyXG5cclxuICAgIC8vIFMzIEJ1Y2tldCBmb3IgaG9zdGluZyB0aGUgZnJvbnRlbmRcclxuICAgIGNvbnN0IHdlYnNpdGVCdWNrZXQgPSBuZXcgczMuQnVja2V0KHRoaXMsICdXZWJzaXRlQnVja2V0Jywge1xyXG4gICAgICBidWNrZXROYW1lOiBgJHtwcm9wcy5lbnZpcm9ubWVudH0taG9vZC10by1jb2FzdC13ZWJzaXRlLSR7dGhpcy5hY2NvdW50fWAsXHJcbiAgICAgIHB1YmxpY1JlYWRBY2Nlc3M6IGZhbHNlLFxyXG4gICAgICBibG9ja1B1YmxpY0FjY2VzczogczMuQmxvY2tQdWJsaWNBY2Nlc3MuQkxPQ0tfQUxMLFxyXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5SRVRBSU4sXHJcbiAgICAgIHZlcnNpb25lZDogdHJ1ZSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIENyZWF0ZSBidWNrZXQgcG9saWN5IHRvIGFsbG93IENsb3VkRnJvbnQgYWNjZXNzXHJcbiAgICBjb25zdCBidWNrZXRQb2xpY3kgPSBuZXcgczMuQnVja2V0UG9saWN5KHRoaXMsICdXZWJzaXRlQnVja2V0UG9saWN5Jywge1xyXG4gICAgICBidWNrZXQ6IHdlYnNpdGVCdWNrZXQsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBHcmFudCBDbG91ZEZyb250IGFjY2VzcyB0byB0aGUgYnVja2V0XHJcbiAgICBidWNrZXRQb2xpY3kuZG9jdW1lbnQuYWRkU3RhdGVtZW50cyhcclxuICAgICAgbmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgICAgIHNpZDogJ0FsbG93Q2xvdWRGcm9udEFjY2VzcycsXHJcbiAgICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxyXG4gICAgICAgIHByaW5jaXBhbHM6IFtuZXcgaWFtLlNlcnZpY2VQcmluY2lwYWwoJ2Nsb3VkZnJvbnQuYW1hem9uYXdzLmNvbScpXSxcclxuICAgICAgICBhY3Rpb25zOiBbJ3MzOkdldE9iamVjdCddLFxyXG4gICAgICAgIHJlc291cmNlczogW3dlYnNpdGVCdWNrZXQuYXJuRm9yT2JqZWN0cygnKicpXSxcclxuICAgICAgICBjb25kaXRpb25zOiB7XHJcbiAgICAgICAgICBTdHJpbmdFcXVhbHM6IHtcclxuICAgICAgICAgICAgJ0FXUzpTb3VyY2VBcm4nOiBgYXJuOmF3czpjbG91ZGZyb250Ojoke3RoaXMuYWNjb3VudH06ZGlzdHJpYnV0aW9uLypgLFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICB9LFxyXG4gICAgICB9KVxyXG4gICAgKTtcclxuXHJcbiAgICAvLyBDbG91ZEZyb250IERpc3RyaWJ1dGlvblxyXG4gICAgbGV0IGRpc3RyaWJ1dGlvbjogY2xvdWRmcm9udC5EaXN0cmlidXRpb247XHJcbiAgICBsZXQgaG9zdGVkWm9uZTogcm91dGU1My5JSG9zdGVkWm9uZSB8IHVuZGVmaW5lZDtcclxuICAgIFxyXG4gICAgaWYgKHByb3BzLnVzZUN1c3RvbURvbWFpbiAmJiBmdWxsRG9tYWluTmFtZSkge1xyXG4gICAgICAvLyBDdXN0b20gZG9tYWluIHNldHVwIC0gbG9va3VwIGhvc3RlZCB6b25lIG9uY2VcclxuICAgICAgaG9zdGVkWm9uZSA9IHJvdXRlNTMuSG9zdGVkWm9uZS5mcm9tTG9va3VwKHRoaXMsICdIb3N0ZWRab25lJywge1xyXG4gICAgICAgIGRvbWFpbk5hbWU6IHByb3BzLmRvbWFpbk5hbWUhLFxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGNvbnN0IGNlcnRpZmljYXRlID0gbmV3IGFjbS5DZXJ0aWZpY2F0ZSh0aGlzLCAnQ2VydGlmaWNhdGUnLCB7XHJcbiAgICAgICAgZG9tYWluTmFtZTogZnVsbERvbWFpbk5hbWUsXHJcbiAgICAgICAgdmFsaWRhdGlvbjogYWNtLkNlcnRpZmljYXRlVmFsaWRhdGlvbi5mcm9tRG5zKGhvc3RlZFpvbmUpLFxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGRpc3RyaWJ1dGlvbiA9IG5ldyBjbG91ZGZyb250LkRpc3RyaWJ1dGlvbih0aGlzLCAnRGlzdHJpYnV0aW9uJywge1xyXG4gICAgICAgIGRlZmF1bHRCZWhhdmlvcjoge1xyXG4gICAgICAgICAgb3JpZ2luOiBuZXcgb3JpZ2lucy5TM09yaWdpbih3ZWJzaXRlQnVja2V0KSxcclxuICAgICAgICAgIHZpZXdlclByb3RvY29sUG9saWN5OiBjbG91ZGZyb250LlZpZXdlclByb3RvY29sUG9saWN5LlJFRElSRUNUX1RPX0hUVFBTLFxyXG4gICAgICAgICAgYWxsb3dlZE1ldGhvZHM6IGNsb3VkZnJvbnQuQWxsb3dlZE1ldGhvZHMuQUxMT1dfR0VUX0hFQURfT1BUSU9OUyxcclxuICAgICAgICAgIGNhY2hlZE1ldGhvZHM6IGNsb3VkZnJvbnQuQ2FjaGVkTWV0aG9kcy5DQUNIRV9HRVRfSEVBRF9PUFRJT05TLFxyXG4gICAgICAgICAgY2FjaGVQb2xpY3k6IGNsb3VkZnJvbnQuQ2FjaGVQb2xpY3kuQ0FDSElOR19PUFRJTUlaRUQsXHJcbiAgICAgICAgICBvcmlnaW5SZXF1ZXN0UG9saWN5OiBjbG91ZGZyb250Lk9yaWdpblJlcXVlc3RQb2xpY3kuQUxMX1ZJRVdFUl9FWENFUFRfSE9TVF9IRUFERVIsXHJcbiAgICAgICAgfSxcclxuICAgICAgICBkb21haW5OYW1lczogW2Z1bGxEb21haW5OYW1lXSxcclxuICAgICAgICBjZXJ0aWZpY2F0ZSxcclxuICAgICAgICBlcnJvclJlc3BvbnNlczogW1xyXG4gICAgICAgICAge1xyXG4gICAgICAgICAgICBodHRwU3RhdHVzOiA0MDQsXHJcbiAgICAgICAgICAgIHJlc3BvbnNlSHR0cFN0YXR1czogMjAwLFxyXG4gICAgICAgICAgICByZXNwb25zZVBhZ2VQYXRoOiAnL2luZGV4Lmh0bWwnLFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIHtcclxuICAgICAgICAgICAgaHR0cFN0YXR1czogNDAzLFxyXG4gICAgICAgICAgICByZXNwb25zZUh0dHBTdGF0dXM6IDIwMCxcclxuICAgICAgICAgICAgcmVzcG9uc2VQYWdlUGF0aDogJy9pbmRleC5odG1sJyxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgXSxcclxuICAgICAgfSk7XHJcblxyXG4gICAgICAvLyBSb3V0ZTUzIEROUyBmb3IgZnJvbnRlbmRcclxuICAgICAgbmV3IHJvdXRlNTMuQVJlY29yZCh0aGlzLCAnQWxpYXNSZWNvcmQnLCB7XHJcbiAgICAgICAgem9uZTogaG9zdGVkWm9uZSxcclxuICAgICAgICByZWNvcmROYW1lOiBwcm9wcy5zdWJkb21haW4hLFxyXG4gICAgICAgIHRhcmdldDogcm91dGU1My5SZWNvcmRUYXJnZXQuZnJvbUFsaWFzKFxyXG4gICAgICAgICAgbmV3IHRhcmdldHMuQ2xvdWRGcm9udFRhcmdldChkaXN0cmlidXRpb24pXHJcbiAgICAgICAgKSxcclxuICAgICAgfSk7XHJcblxyXG4gICAgICAvLyBDcmVhdGUgYmFja2VuZCBpbmZyYXN0cnVjdHVyZSBpZiB3ZSBoYXZlIGEgY3VzdG9tIGRvbWFpblxyXG4gICAgICBpZiAoaG9zdGVkWm9uZSkge1xyXG4gICAgICAgIHRoaXMuY3JlYXRlQmFja2VuZEluZnJhc3RydWN0dXJlKHByb3BzLCBob3N0ZWRab25lKTtcclxuICAgICAgfVxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgLy8gQ3JlYXRlIGJhY2tlbmQgaW5mcmFzdHJ1Y3R1cmUgZXZlbiB3aXRob3V0IGN1c3RvbSBkb21haW5cclxuICAgICAgLy8gV2UgbmVlZCB0aGlzIGZvciB0aGUgQVBJIHRvIHdvcmtcclxuICAgICAgdGhpcy5jcmVhdGVCYWNrZW5kSW5mcmFzdHJ1Y3R1cmUocHJvcHMsIHVuZGVmaW5lZCk7XHJcbiAgICAgIFxyXG4gICAgICAvLyBTaW1wbGUgQ2xvdWRGcm9udCBzZXR1cCB3aXRob3V0IGN1c3RvbSBkb21haW5cclxuICAgICAgZGlzdHJpYnV0aW9uID0gbmV3IGNsb3VkZnJvbnQuRGlzdHJpYnV0aW9uKHRoaXMsICdEaXN0cmlidXRpb24nLCB7XHJcbiAgICAgICAgZGVmYXVsdEJlaGF2aW9yOiB7XHJcbiAgICAgICAgICBvcmlnaW46IG5ldyBvcmlnaW5zLlMzT3JpZ2luKHdlYnNpdGVCdWNrZXQpLFxyXG4gICAgICAgICAgdmlld2VyUHJvdG9jb2xQb2xpY3k6IGNsb3VkZnJvbnQuVmlld2VyUHJvdG9jb2xQb2xpY3kuUkVESVJFQ1RfVE9fSFRUUFMsXHJcbiAgICAgICAgICBhbGxvd2VkTWV0aG9kczogY2xvdWRmcm9udC5BbGxvd2VkTWV0aG9kcy5BTExPV19HRVRfSEVBRF9PUFRJT05TLFxyXG4gICAgICAgICAgY2FjaGVkTWV0aG9kczogY2xvdWRmcm9udC5DYWNoZWRNZXRob2RzLkNBQ0hFX0dFVF9IRUFEX09QVElPTlMsXHJcbiAgICAgICAgICBjYWNoZVBvbGljeTogY2xvdWRmcm9udC5DYWNoZVBvbGljeS5DQUNISU5HX09QVElNSVpFRCxcclxuICAgICAgICAgIG9yaWdpblJlcXVlc3RQb2xpY3k6IGNsb3VkZnJvbnQuT3JpZ2luUmVxdWVzdFBvbGljeS5BTExfVklFV0VSX0VYQ0VQVF9IT1NUX0hFQURFUixcclxuICAgICAgICB9LFxyXG4gICAgICAgIGVycm9yUmVzcG9uc2VzOiBbXHJcbiAgICAgICAgICB7XHJcbiAgICAgICAgICAgIGh0dHBTdGF0dXM6IDQwNCxcclxuICAgICAgICAgICAgcmVzcG9uc2VIdHRwU3RhdHVzOiAyMDAsXHJcbiAgICAgICAgICAgIHJlc3BvbnNlUGFnZVBhdGg6ICcvaW5kZXguaHRtbCcsXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAge1xyXG4gICAgICAgICAgICBodHRwU3RhdHVzOiA0MDMsXHJcbiAgICAgICAgICAgIHJlc3BvbnNlSHR0cFN0YXR1czogMjAwLFxyXG4gICAgICAgICAgICByZXNwb25zZVBhZ2VQYXRoOiAnL2luZGV4Lmh0bWwnLFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICBdLFxyXG4gICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBGcm9udGVuZCBkZXBsb3ltZW50IGlzIGhhbmRsZWQgYnkgdGhlIENJL0NEIHBpcGVsaW5lIChTMyBzeW5jICsgQ2xvdWRGcm9udCBpbnZhbGlkYXRpb24pXHJcbiAgICAvLyBTZWUgLmdpdGh1Yi93b3JrZmxvd3MvZGVwbG95LnltbCDihpIgZGVwbG95LWZyb250ZW5kIGpvYlxyXG5cclxuICAgIC8vIEdlbmVyYXRlIGVudmlyb25tZW50IGZpbGUgZm9yIHdlYi1hcHAgaWYgcmVxdWVzdGVkXHJcbiAgICBpZiAocHJvcHMuZ2VuZXJhdGVFbnZGaWxlKSB7XHJcbiAgICAgIHRoaXMuZ2VuZXJhdGVFbnZpcm9ubWVudEZpbGUocHJvcHMsIGRpc3RyaWJ1dGlvbi5kaXN0cmlidXRpb25Eb21haW5OYW1lKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBHaXRIdWIgQWN0aW9ucyBPSURDIFByb3ZpZGVyICYgRGVwbG95IFJvbGVcclxuICAgIGNvbnN0IGdpdGh1Yk9pZGNQcm92aWRlciA9IG5ldyBpYW0uT3BlbklkQ29ubmVjdFByb3ZpZGVyKHRoaXMsICdHaXRodWJPaWRjUHJvdmlkZXInLCB7XHJcbiAgICAgIHVybDogJ2h0dHBzOi8vdG9rZW4uYWN0aW9ucy5naXRodWJ1c2VyY29udGVudC5jb20nLFxyXG4gICAgICBjbGllbnRJZHM6IFsnc3RzLmFtYXpvbmF3cy5jb20nXSxcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IGdpdGh1YkRlcGxveVJvbGUgPSBuZXcgaWFtLlJvbGUodGhpcywgJ0dpdGh1YkFjdGlvbnNEZXBsb3lSb2xlJywge1xyXG4gICAgICByb2xlTmFtZTogYCR7cHJvcHMuZW52aXJvbm1lbnR9LWdpdGh1Yi1hY3Rpb25zLWRlcGxveWAsXHJcbiAgICAgIGFzc3VtZWRCeTogbmV3IGlhbS5XZWJJZGVudGl0eVByaW5jaXBhbChcclxuICAgICAgICBnaXRodWJPaWRjUHJvdmlkZXIub3BlbklkQ29ubmVjdFByb3ZpZGVyQXJuLFxyXG4gICAgICAgIHtcclxuICAgICAgICAgIFN0cmluZ0VxdWFsczoge1xyXG4gICAgICAgICAgICAndG9rZW4uYWN0aW9ucy5naXRodWJ1c2VyY29udGVudC5jb206YXVkJzogJ3N0cy5hbWF6b25hd3MuY29tJyxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICBTdHJpbmdMaWtlOiB7XHJcbiAgICAgICAgICAgICd0b2tlbi5hY3Rpb25zLmdpdGh1YnVzZXJjb250ZW50LmNvbTpzdWInOlxyXG4gICAgICAgICAgICAgICdyZXBvOmFuZHJld2poZXJybWFubi9ob29kLXRvLWNvYXN0LXRpbWUtdHJhY2tlcjplbnZpcm9ubWVudDoqJyxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgfVxyXG4gICAgICApLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ1JvbGUgYXNzdW1lZCBieSBHaXRIdWIgQWN0aW9ucyBmb3IgQ0kvQ0QgZGVwbG95bWVudHMnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQ0RLIGJvb3RzdHJhcCByb2xlIGFzc3VtcHRpb24gKHJlcXVpcmVkIGZvciBjZGsgZGVwbG95KVxyXG4gICAgZ2l0aHViRGVwbG95Um9sZS5hZGRUb1BvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgIHNpZDogJ0Fzc3VtZUJvb3RzdHJhcFJvbGVzJyxcclxuICAgICAgYWN0aW9uczogWydzdHM6QXNzdW1lUm9sZSddLFxyXG4gICAgICByZXNvdXJjZXM6IFtgYXJuOmF3czppYW06OiR7dGhpcy5hY2NvdW50fTpyb2xlL2Nkay0qYF0sXHJcbiAgICB9KSk7XHJcblxyXG4gICAgLy8gQ2xvdWRGb3JtYXRpb24gcGVybWlzc2lvbnMgZm9yIENES1xyXG4gICAgZ2l0aHViRGVwbG95Um9sZS5hZGRUb1BvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgIHNpZDogJ0Nsb3VkRm9ybWF0aW9uJyxcclxuICAgICAgYWN0aW9uczogW1xyXG4gICAgICAgICdjbG91ZGZvcm1hdGlvbjpEZXNjcmliZVN0YWNrcycsXHJcbiAgICAgICAgJ2Nsb3VkZm9ybWF0aW9uOkdldFRlbXBsYXRlJyxcclxuICAgICAgICAnY2xvdWRmb3JtYXRpb246Q3JlYXRlQ2hhbmdlU2V0JyxcclxuICAgICAgICAnY2xvdWRmb3JtYXRpb246RGVzY3JpYmVDaGFuZ2VTZXQnLFxyXG4gICAgICAgICdjbG91ZGZvcm1hdGlvbjpFeGVjdXRlQ2hhbmdlU2V0JyxcclxuICAgICAgICAnY2xvdWRmb3JtYXRpb246RGVsZXRlQ2hhbmdlU2V0JyxcclxuICAgICAgICAnY2xvdWRmb3JtYXRpb246RGVzY3JpYmVTdGFja0V2ZW50cycsXHJcbiAgICAgIF0sXHJcbiAgICAgIHJlc291cmNlczogW2Bhcm46YXdzOmNsb3VkZm9ybWF0aW9uOiR7cHJvcHMucmVnaW9ufToke3RoaXMuYWNjb3VudH06c3RhY2svSG9vZFRvQ29hc3RTdGFjay8qYF0sXHJcbiAgICB9KSk7XHJcblxyXG4gICAgLy8gUzMgcGVybWlzc2lvbnMgZm9yIGZyb250ZW5kIGRlcGxveW1lbnRcclxuICAgIGdpdGh1YkRlcGxveVJvbGUuYWRkVG9Qb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgICBzaWQ6ICdTM0RlcGxveScsXHJcbiAgICAgIGFjdGlvbnM6IFtcclxuICAgICAgICAnczM6UHV0T2JqZWN0JyxcclxuICAgICAgICAnczM6R2V0T2JqZWN0JyxcclxuICAgICAgICAnczM6RGVsZXRlT2JqZWN0JyxcclxuICAgICAgICAnczM6TGlzdEJ1Y2tldCcsXHJcbiAgICAgICAgJ3MzOkdldEJ1Y2tldExvY2F0aW9uJyxcclxuICAgICAgXSxcclxuICAgICAgcmVzb3VyY2VzOiBbXHJcbiAgICAgICAgd2Vic2l0ZUJ1Y2tldC5idWNrZXRBcm4sXHJcbiAgICAgICAgd2Vic2l0ZUJ1Y2tldC5hcm5Gb3JPYmplY3RzKCcqJyksXHJcbiAgICAgIF0sXHJcbiAgICB9KSk7XHJcblxyXG4gICAgLy8gQ2xvdWRGcm9udCBpbnZhbGlkYXRpb25cclxuICAgIGdpdGh1YkRlcGxveVJvbGUuYWRkVG9Qb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgICBzaWQ6ICdDbG91ZEZyb250SW52YWxpZGF0aW9uJyxcclxuICAgICAgYWN0aW9uczogWydjbG91ZGZyb250OkNyZWF0ZUludmFsaWRhdGlvbiddLFxyXG4gICAgICByZXNvdXJjZXM6IFtgYXJuOmF3czpjbG91ZGZyb250Ojoke3RoaXMuYWNjb3VudH06ZGlzdHJpYnV0aW9uLyR7ZGlzdHJpYnV0aW9uLmRpc3RyaWJ1dGlvbklkfWBdLFxyXG4gICAgfSkpO1xyXG5cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdHaXRodWJBY3Rpb25zUm9sZUFybicsIHtcclxuICAgICAgdmFsdWU6IGdpdGh1YkRlcGxveVJvbGUucm9sZUFybixcclxuICAgICAgZGVzY3JpcHRpb246ICdJQU0gUm9sZSBBUk4gZm9yIEdpdEh1YiBBY3Rpb25zIChzZXQgYXMgQVdTX1JPTEVfQVJOIHNlY3JldCknLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gT3V0cHV0c1xyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1dlYnNpdGVVcmwnLCB7XHJcbiAgICAgIHZhbHVlOiBwcm9wcy51c2VDdXN0b21Eb21haW4gJiYgZnVsbERvbWFpbk5hbWUgXHJcbiAgICAgICAgPyBgaHR0cHM6Ly8ke2Z1bGxEb21haW5OYW1lfWAgXHJcbiAgICAgICAgOiBgaHR0cHM6Ly8ke2Rpc3RyaWJ1dGlvbi5kaXN0cmlidXRpb25Eb21haW5OYW1lfWAsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnV2Vic2l0ZSBVUkwnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0Rpc3RyaWJ1dGlvbklkJywge1xyXG4gICAgICB2YWx1ZTogZGlzdHJpYnV0aW9uLmRpc3RyaWJ1dGlvbklkLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0Nsb3VkRnJvbnQgRGlzdHJpYnV0aW9uIElEJyxcclxuICAgIH0pO1xyXG5cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdXZWJzaXRlQnVja2V0TmFtZScsIHtcclxuICAgICAgdmFsdWU6IHdlYnNpdGVCdWNrZXQuYnVja2V0TmFtZSxcclxuICAgICAgZGVzY3JpcHRpb246ICdTMyBCdWNrZXQgTmFtZSBmb3IgV2Vic2l0ZScsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBNb2NrIG1vZGUgc3BlY2lmaWMgb3V0cHV0c1xyXG4gICAgaWYgKHByb3BzLm1vY2tNb2RlKSB7XHJcbiAgICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdNb2NrTW9kZUluZm8nLCB7XHJcbiAgICAgICAgdmFsdWU6ICdBcHBsaWNhdGlvbiBpcyBydW5uaW5nIGluIE1PQ0sgTU9ERSAtIGFsbCBkYXRhIGlzIGxvY2FsIG1vY2sgZGF0YScsXHJcbiAgICAgICAgZGVzY3JpcHRpb246ICdNb2NrIE1vZGUgSW5mb3JtYXRpb24nLFxyXG4gICAgICB9KTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHByaXZhdGUgY3JlYXRlQmFja2VuZEluZnJhc3RydWN0dXJlKHByb3BzOiBIb29kVG9Db2FzdFN0YWNrUHJvcHMsIGhvc3RlZFpvbmU/OiByb3V0ZTUzLklIb3N0ZWRab25lKSB7XHJcbiAgICAvLyBEeW5hbW9EQiBUYWJsZXNcclxuICAgIGNvbnN0IHJhY2VzVGFibGUgPSBuZXcgZHluYW1vZGIuVGFibGUodGhpcywgJ1JhY2VzVGFibGUnLCB7XHJcbiAgICAgIHRhYmxlTmFtZTogYCR7cHJvcHMuZW52aXJvbm1lbnR9LWh0Yy1yYWNlc2AsXHJcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAnaWQnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxyXG4gICAgICBiaWxsaW5nTW9kZTogZHluYW1vZGIuQmlsbGluZ01vZGUuUEFZX1BFUl9SRVFVRVNULFxyXG4gICAgICByZW1vdmFsUG9saWN5OiBSZW1vdmFsUG9saWN5LkRFU1RST1ksXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBUEkgS2V5XHJcbiAgICBjb25zdCBhcGlLZXkgPSBuZXcgYXBpZ2F0ZXdheS5BcGlLZXkodGhpcywgJ0FwaUtleScsIHtcclxuICAgICAgYXBpS2V5TmFtZTogYCR7cHJvcHMuZW52aXJvbm1lbnR9LWh0Yy1hcGkta2V5YCxcclxuICAgICAgZGVzY3JpcHRpb246ICdBUEkgS2V5IGZvciBIb29kIHRvIENvYXN0IFRpbWUgVHJhY2tlciBmcm9udGVuZCcsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBTdG9yZSBBUEkgS2V5IElEIGluIFNTTSBQYXJhbWV0ZXIgU3RvcmVcclxuICAgIG5ldyBzc20uU3RyaW5nUGFyYW1ldGVyKHRoaXMsICdBcGlLZXlQYXJhbWV0ZXInLCB7XHJcbiAgICAgIHBhcmFtZXRlck5hbWU6IGAvJHtwcm9wcy5lbnZpcm9ubWVudH0vaHRjL2FwaS1rZXktaWRgLFxyXG4gICAgICBzdHJpbmdWYWx1ZTogYXBpS2V5LmtleUlkLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0FQSSBLZXkgSUQgZm9yIEhvb2QgdG8gQ29hc3QgVGltZSBUcmFja2VyJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEJ1aWxkIHRoZSBhbGxvd2VkIG9yaWdpbnMgbGlzdCBmb3IgQ09SU1xyXG4gICAgY29uc3QgYWxsb3dlZE9yaWdpbnMgPSBbXHJcbiAgICAgIC4uLihwcm9wcy51c2VDdXN0b21Eb21haW4gJiYgcHJvcHMuc3ViZG9tYWluICYmIHByb3BzLmRvbWFpbk5hbWUgXHJcbiAgICAgICAgPyBbXHJcbiAgICAgICAgICAgIGBodHRwczovLyR7cHJvcHMuc3ViZG9tYWlufS4ke3Byb3BzLmRvbWFpbk5hbWV9YCxcclxuICAgICAgICAgICAgYGh0dHBzOi8vaHRjYXBpLmRldi4ke3Byb3BzLmRvbWFpbk5hbWV9YCxcclxuICAgICAgICAgICAgYGh0dHBzOi8vaHRjYXBpLiR7cHJvcHMuZG9tYWluTmFtZX1gLFxyXG4gICAgICAgICAgXVxyXG4gICAgICAgIDogW10pLFxyXG4gICAgICAnaHR0cDovL2xvY2FsaG9zdDo5MDAwJyxcclxuICAgICAgJ2h0dHA6Ly9sb2NhbGhvc3Q6MzAwMCdcclxuICAgIF07XHJcblxyXG4gICAgLy8gTGFtYmRhIGZ1bmN0aW9uIGZvciByYWNlcyBlbmRwb2ludCB3aXRoIER5bmFtb0RCIGludGVncmF0aW9uXHJcbiAgICBjb25zdCByYWNlc0Z1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnUmFjZXNGdW5jdGlvbicsIHtcclxuICAgICAgZnVuY3Rpb25OYW1lOiBgJHtwcm9wcy5lbnZpcm9ubWVudH0taHRjLXJhY2VzYCxcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIyX1gsXHJcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdsYW1iZGEvcmFjZXMnKSxcclxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxyXG4gICAgICBtZW1vcnlTaXplOiAyNTYsXHJcbiAgICAgIGxvZ1JldGVudGlvbjogbG9ncy5SZXRlbnRpb25EYXlzLk9ORV9XRUVLLFxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIEVOVklST05NRU5UOiBwcm9wcy5lbnZpcm9ubWVudCxcclxuICAgICAgICBSQUNFU19UQUJMRV9OQU1FOiByYWNlc1RhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgICBBTExPV0VEX09SSUdJTlM6IGFsbG93ZWRPcmlnaW5zLmpvaW4oJywnKSxcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEdyYW50IER5bmFtb0RCIHJlYWQvd3JpdGUgcGVybWlzc2lvbnMgdG8gdGhlIExhbWJkYSBmdW5jdGlvblxyXG4gICAgcmFjZXNUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEocmFjZXNGdW5jdGlvbik7XHJcblxyXG4gICAgLy8gQVBJIEdhdGV3YXlcclxuICAgIGNvbnN0IGFwaSA9IG5ldyBhcGlnYXRld2F5LlJlc3RBcGkodGhpcywgJ0hvb2RUb0NvYXN0QXBpJywge1xyXG4gICAgICByZXN0QXBpTmFtZTogYCR7cHJvcHMuZW52aXJvbm1lbnR9LWh0Yy1hcGlgLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0hvb2QgdG8gQ29hc3QgVGltZSBUcmFja2VyIEFQSScsXHJcbiAgICAgIGRlZmF1bHRDb3JzUHJlZmxpZ2h0T3B0aW9uczoge1xyXG4gICAgICAgIGFsbG93T3JpZ2luczogYWxsb3dlZE9yaWdpbnMsXHJcbiAgICAgICAgYWxsb3dNZXRob2RzOiBhcGlnYXRld2F5LkNvcnMuQUxMX01FVEhPRFMsXHJcbiAgICAgICAgYWxsb3dIZWFkZXJzOiBbJ0NvbnRlbnQtVHlwZScsICdYLUFwaS1LZXknXSxcclxuICAgICAgICBhbGxvd0NyZWRlbnRpYWxzOiB0cnVlLFxyXG4gICAgICB9LFxyXG4gICAgICBkZXBsb3lPcHRpb25zOiB7XHJcbiAgICAgICAgc3RhZ2VOYW1lOiBwcm9wcy5lbnZpcm9ubWVudCxcclxuICAgICAgICBsb2dnaW5nTGV2ZWw6IHByb3BzLmVudmlyb25tZW50ID09PSAncHJvZHVjdGlvbicgXHJcbiAgICAgICAgICA/IGFwaWdhdGV3YXkuTWV0aG9kTG9nZ2luZ0xldmVsLkVSUk9SIFxyXG4gICAgICAgICAgOiBhcGlnYXRld2F5Lk1ldGhvZExvZ2dpbmdMZXZlbC5JTkZPLFxyXG4gICAgICAgIGRhdGFUcmFjZUVuYWJsZWQ6IHByb3BzLmVudmlyb25tZW50ICE9PSAncHJvZHVjdGlvbicsXHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBDdXN0b20gZG9tYWluIGZvciBBUEkgKG9ubHkgaWYgaG9zdGVkWm9uZSBpcyBhdmFpbGFibGUpXHJcbiAgICBpZiAoaG9zdGVkWm9uZSAmJiBwcm9wcy51c2VDdXN0b21Eb21haW4gJiYgcHJvcHMuZG9tYWluTmFtZSkge1xyXG4gICAgICBjb25zdCBhcGlEb21haW5OYW1lID0gcHJvcHMuZW52aXJvbm1lbnQgPT09ICdkZXZlbG9wbWVudCcgXHJcbiAgICAgICAgPyBgaHRjYXBpLmRldi4ke3Byb3BzLmRvbWFpbk5hbWV9YCBcclxuICAgICAgICA6IGBodGNhcGkuJHtwcm9wcy5kb21haW5OYW1lfWA7XHJcblxyXG4gICAgICBjb25zdCBhcGlDZXJ0aWZpY2F0ZSA9IG5ldyBhY20uQ2VydGlmaWNhdGUodGhpcywgJ0FwaUNlcnRpZmljYXRlJywge1xyXG4gICAgICAgIGRvbWFpbk5hbWU6IGFwaURvbWFpbk5hbWUsXHJcbiAgICAgICAgdmFsaWRhdGlvbjogYWNtLkNlcnRpZmljYXRlVmFsaWRhdGlvbi5mcm9tRG5zKGhvc3RlZFpvbmUpLFxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGNvbnN0IGFwaURvbWFpbiA9IG5ldyBhcGlnYXRld2F5LkRvbWFpbk5hbWUodGhpcywgJ0FwaURvbWFpbicsIHtcclxuICAgICAgICBkb21haW5OYW1lOiBhcGlEb21haW5OYW1lLFxyXG4gICAgICAgIGNlcnRpZmljYXRlOiBhcGlDZXJ0aWZpY2F0ZSxcclxuICAgICAgICBzZWN1cml0eVBvbGljeTogYXBpZ2F0ZXdheS5TZWN1cml0eVBvbGljeS5UTFNfMV8yLFxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIC8vIEFzc29jaWF0ZSB0aGUgZG9tYWluIHdpdGggdGhlIEFQSVxyXG4gICAgICBuZXcgYXBpZ2F0ZXdheS5CYXNlUGF0aE1hcHBpbmcodGhpcywgJ0FwaUJhc2VQYXRoTWFwcGluZycsIHtcclxuICAgICAgICBkb21haW5OYW1lOiBhcGlEb21haW4sXHJcbiAgICAgICAgcmVzdEFwaTogYXBpLFxyXG4gICAgICAgIGJhc2VQYXRoOiAnJyxcclxuICAgICAgfSk7XHJcblxyXG4gICAgICAvLyBSb3V0ZTUzIEROUyBmb3IgQVBJXHJcbiAgICAgIG5ldyByb3V0ZTUzLkFSZWNvcmQodGhpcywgJ0FwaUFsaWFzUmVjb3JkJywge1xyXG4gICAgICAgIHpvbmU6IGhvc3RlZFpvbmUsXHJcbiAgICAgICAgcmVjb3JkTmFtZTogcHJvcHMuZW52aXJvbm1lbnQgPT09ICdkZXZlbG9wbWVudCcgPyAnaHRjYXBpLmRldicgOiAnaHRjYXBpJyxcclxuICAgICAgICB0YXJnZXQ6IHJvdXRlNTMuUmVjb3JkVGFyZ2V0LmZyb21BbGlhcyhcclxuICAgICAgICAgIG5ldyB0YXJnZXRzLkFwaUdhdGV3YXlEb21haW4oYXBpRG9tYWluKVxyXG4gICAgICAgICksXHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIEFQSSBHYXRld2F5IHVzYWdlIHBsYW5cclxuICAgIGNvbnN0IHVzYWdlUGxhbiA9IG5ldyBhcGlnYXRld2F5LlVzYWdlUGxhbih0aGlzLCAnVXNhZ2VQbGFuJywge1xyXG4gICAgICBuYW1lOiBgJHtwcm9wcy5lbnZpcm9ubWVudH0taHRjLXVzYWdlLXBsYW5gLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ1VzYWdlIHBsYW4gZm9yIEhvb2QgdG8gQ29hc3QgVGltZSBUcmFja2VyIEFQSScsXHJcbiAgICAgIHRocm90dGxlOiB7XHJcbiAgICAgICAgcmF0ZUxpbWl0OiAxMDAsXHJcbiAgICAgICAgYnVyc3RMaW1pdDogMjAwLFxyXG4gICAgICB9LFxyXG4gICAgICBxdW90YToge1xyXG4gICAgICAgIGxpbWl0OiAxMDAwMCxcclxuICAgICAgICBwZXJpb2Q6IGFwaWdhdGV3YXkuUGVyaW9kLk1PTlRILFxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgdXNhZ2VQbGFuLmFkZEFwaUtleShhcGlLZXkpO1xyXG4gICAgXHJcbiAgICAvLyBBc3NvY2lhdGUgdXNhZ2UgcGxhbiB3aXRoIEFQSSBzdGFnZVxyXG4gICAgdXNhZ2VQbGFuLmFkZEFwaVN0YWdlKHtcclxuICAgICAgc3RhZ2U6IGFwaS5kZXBsb3ltZW50U3RhZ2UsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBGb3JjZSBBUEkgR2F0ZXdheSBkZXBsb3ltZW50IHRvIGVuc3VyZSBhbGwgY2hhbmdlcyBhcmUgYXBwbGllZFxyXG4gICAgbmV3IGFwaWdhdGV3YXkuRGVwbG95bWVudCh0aGlzLCAnQXBpRGVwbG95bWVudCcsIHtcclxuICAgICAgYXBpLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0RlcGxveW1lbnQgZm9yIExhbWJkYSBpbnRlZ3JhdGlvbiBjaGFuZ2VzJyxcclxuICAgICAgcmV0YWluRGVwbG95bWVudHM6IGZhbHNlLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gRlVMTCBDUlVEIEVORFBPSU5UUyBmb3IgcmFjZXNcclxuICAgIGNvbnN0IHJhY2VzUmVzb3VyY2UgPSBhcGkucm9vdC5hZGRSZXNvdXJjZSgncmFjZXMnKTtcclxuICAgIFxyXG4gICAgLy8gR0VUIC9yYWNlcyAtIExpc3QgYWxsIHJhY2VzXHJcbiAgICByYWNlc1Jlc291cmNlLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24ocmFjZXNGdW5jdGlvbiksIHtcclxuICAgICAgYXBpS2V5UmVxdWlyZWQ6IHRydWUsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBQT1NUIC9yYWNlcyAtIENyZWF0ZSBuZXcgcmFjZVxyXG4gICAgcmFjZXNSZXNvdXJjZS5hZGRNZXRob2QoJ1BPU1QnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihyYWNlc0Z1bmN0aW9uKSwge1xyXG4gICAgICBhcGlLZXlSZXF1aXJlZDogdHJ1ZSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEluZGl2aWR1YWwgcmFjZSByZXNvdXJjZSBmb3IgUFVUL0RFTEVURSBvcGVyYXRpb25zXHJcbiAgICBjb25zdCByYWNlUmVzb3VyY2UgPSByYWNlc1Jlc291cmNlLmFkZFJlc291cmNlKCd7aWR9Jyk7XHJcbiAgICBcclxuICAgIC8vIEdFVCAvcmFjZXMve2lkfSAtIEdldCBzcGVjaWZpYyByYWNlXHJcbiAgICByYWNlUmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihyYWNlc0Z1bmN0aW9uKSwge1xyXG4gICAgICBhcGlLZXlSZXF1aXJlZDogdHJ1ZSxcclxuICAgIH0pO1xyXG4gICAgXHJcbiAgICAvLyBQVVQgL3JhY2VzL3tpZH0gLSBVcGRhdGUgcmFjZVxyXG4gICAgcmFjZVJlc291cmNlLmFkZE1ldGhvZCgnUFVUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24ocmFjZXNGdW5jdGlvbiksIHtcclxuICAgICAgYXBpS2V5UmVxdWlyZWQ6IHRydWUsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBERUxFVEUgL3JhY2VzL3tpZH0gLSBEZWxldGUgcmFjZVxyXG4gICAgcmFjZVJlc291cmNlLmFkZE1ldGhvZCgnREVMRVRFJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24ocmFjZXNGdW5jdGlvbiksIHtcclxuICAgICAgYXBpS2V5UmVxdWlyZWQ6IHRydWUsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBZGQgb3V0cHV0c1xyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0FwaVVybCcsIHtcclxuICAgICAgdmFsdWU6IGhvc3RlZFpvbmUgJiYgcHJvcHMudXNlQ3VzdG9tRG9tYWluICYmIHByb3BzLmRvbWFpbk5hbWVcclxuICAgICAgICA/IGBodHRwczovLyR7cHJvcHMuZW52aXJvbm1lbnQgPT09ICdkZXZlbG9wbWVudCcgPyAnaHRjYXBpLmRldi4nIDogJ2h0Y2FwaS4nfSR7cHJvcHMuZG9tYWluTmFtZX1gXHJcbiAgICAgICAgOiBgaHR0cHM6Ly8ke2FwaS5yZXN0QXBpSWR9LmV4ZWN1dGUtYXBpLiR7cHJvcHMucmVnaW9ufS5hbWF6b25hd3MuY29tLyR7cHJvcHMuZW52aXJvbm1lbnR9L2AsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnQVBJIEdhdGV3YXkgVVJMJyxcclxuICAgIH0pO1xyXG5cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdBcGlLZXlJZCcsIHtcclxuICAgICAgdmFsdWU6IGFwaUtleS5rZXlJZCxcclxuICAgICAgZGVzY3JpcHRpb246ICdBUEkgS2V5IElEJyxcclxuICAgIH0pO1xyXG5cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdEeW5hbW9EQlRhYmxlcycsIHtcclxuICAgICAgdmFsdWU6IGBSYWNlczogJHtyYWNlc1RhYmxlLnRhYmxlTmFtZX1gLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0R5bmFtb0RCIFRhYmxlIE5hbWVzJyxcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBnZW5lcmF0ZUVudmlyb25tZW50RmlsZShcclxuICAgIHByb3BzOiBIb29kVG9Db2FzdFN0YWNrUHJvcHMsIFxyXG4gICAgZGlzdHJpYnV0aW9uRG9tYWluOiBzdHJpbmdcclxuICApIHtcclxuICAgIGNvbnN0IGVudkNvbnRlbnQgPSBgIyBFbnZpcm9ubWVudCBjb25maWd1cmF0aW9uIGZvciBIb29kIHRvIENvYXN0IFRpbWUgVHJhY2tlclxyXG4jIEdlbmVyYXRlZCBieSBDREsgZGVwbG95bWVudCAtIERPIE5PVCBFRElUIE1BTlVBTExZXHJcblxyXG4jIE1vY2sgTW9kZSBDb25maWd1cmF0aW9uXHJcblZJVEVfTU9DS19NT0RFPSR7cHJvcHMubW9ja01vZGV9XHJcblxyXG4jIEFXUyBDb25maWd1cmF0aW9uXHJcblZJVEVfQVdTX1JFR0lPTj0ke3Byb3BzLnJlZ2lvbn1cclxuVklURV9FTlZJUk9OTUVOVD0ke3Byb3BzLmVudmlyb25tZW50fVxyXG5cclxuIyBEb21haW4gQ29uZmlndXJhdGlvblxyXG5WSVRFX1VTRV9DVVNUT01fRE9NQUlOPSR7cHJvcHMudXNlQ3VzdG9tRG9tYWlufVxyXG4ke3Byb3BzLmRvbWFpbk5hbWUgPyBgVklURV9ET01BSU5fTkFNRT0ke3Byb3BzLmRvbWFpbk5hbWV9YCA6ICcnfVxyXG4ke3Byb3BzLnN1YmRvbWFpbiA/IGBWSVRFX1NVQkRPTUFJTj0ke3Byb3BzLnN1YmRvbWFpbn1gIDogJyd9XHJcblxyXG4jIFdlYnNpdGUgVVJMXHJcblZJVEVfV0VCU0lURV9VUkw9aHR0cHM6Ly8ke2Rpc3RyaWJ1dGlvbkRvbWFpbn1cclxuXHJcbiMgTW9jayBNb2RlIE5vdGVcclxuJHtwcm9wcy5tb2NrTW9kZSA/ICcjIFJ1bm5pbmcgaW4gTU9DSyBNT0RFIC0gYWxsIGRhdGEgaXMgbG9jYWwgbW9jayBkYXRhJyA6ICcjIFJ1bm5pbmcgaW4gUFJPRFVDVElPTiBNT0RFIC0gcmVxdWlyZXMgQVBJIGVuZHBvaW50cyd9XHJcblxyXG4jIEFQSSBDb25maWd1cmF0aW9uICh3aGVuIG5vdCBpbiBtb2NrIG1vZGUpXHJcbiR7IXByb3BzLm1vY2tNb2RlID8gYFZJVEVfQVBJX1VSTD1odHRwczovL2h0Y2FwaSR7cHJvcHMuZW52aXJvbm1lbnQgPT09ICdkZXZlbG9wbWVudCcgPyAnLmRldicgOiAnJ30uJHtwcm9wcy5kb21haW5OYW1lfWAgOiAnJ31cclxuJHshcHJvcHMubW9ja01vZGUgPyAnVklURV9BUElfS0VZX1JFUVVJUkVEPXRydWUnIDogJyd9XHJcbmA7XHJcblxyXG4gICAgLy8gT3V0cHV0IHRoZSBlbnZpcm9ubWVudCBmaWxlIGNvbnRlbnQgZm9yIG1hbnVhbCBkZXBsb3ltZW50XHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnRW52aXJvbm1lbnRGaWxlQ29udGVudCcsIHtcclxuICAgICAgdmFsdWU6IGVudkNvbnRlbnQsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnRW52aXJvbm1lbnQgZmlsZSBjb250ZW50IHRvIGNvcHkgdG8gd2ViLWFwcC8uZW52LnByb2R1Y3Rpb24nLFxyXG4gICAgfSk7XHJcbiAgfVxyXG59XHJcbiJdfQ==