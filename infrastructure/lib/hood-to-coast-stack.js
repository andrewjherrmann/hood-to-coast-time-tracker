"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HoodToCoastStack = void 0;
const cdk = require("aws-cdk-lib");
const s3 = require("aws-cdk-lib/aws-s3");
const s3deploy = require("aws-cdk-lib/aws-s3-deployment");
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
const path = require("path");
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
        // Deploy frontend files to S3 bucket
        new s3deploy.BucketDeployment(this, 'FrontendDeployment', {
            sources: [s3deploy.Source.asset(path.join(__dirname, '../../web-app/dist/spa'))],
            destinationBucket: websiteBucket,
            distribution: distribution,
            distributionPaths: ['/*'],
            prune: true,
            retainOnDelete: false,
        });
        // Generate environment file for web-app if requested
        if (props.generateEnvFile) {
            this.generateEnvironmentFile(props, distribution.distributionDomainName);
        }
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
        new cdk.CfnOutput(this, 'S3BucketName', {
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
        // Lambda function for races endpoint with DynamoDB integration
        const racesFunction = new lambda.Function(this, 'RacesFunction', {
            functionName: `${props.environment}-htc-races`,
            runtime: lambda.Runtime.NODEJS_18_X,
            handler: 'index.handler',
            code: lambda.Code.fromAsset('lambda/races'),
            timeout: cdk.Duration.seconds(30),
            memorySize: 256,
            logRetention: logs.RetentionDays.ONE_WEEK,
            environment: {
                ENVIRONMENT: props.environment,
                RACES_TABLE_NAME: racesTable.tableName,
            },
        });
        // Grant DynamoDB read/write permissions to the Lambda function
        racesTable.grantReadWriteData(racesFunction);
        // API Gateway
        const api = new apigateway.RestApi(this, 'HoodToCoastApi', {
            restApiName: `${props.environment}-htc-api`,
            description: 'Hood to Coast Time Tracker API',
            defaultCorsPreflightOptions: {
                allowOrigins: [
                    // Use custom domain if available, otherwise use CloudFront domain
                    ...(props.useCustomDomain && props.subdomain && props.domainName
                        ? [
                            `https://${props.subdomain}.${props.domainName}`,
                            `https://htcapi.dev.${props.domainName}`,
                            `https://htcapi.${props.domainName}`, // API domain for production
                        ]
                        : ['https://d8rt0db3kvzd3.cloudfront.net']),
                    'http://localhost:9000',
                    'http://localhost:3000' // For local development (alternative port)
                ],
                allowMethods: apigateway.Cors.ALL_METHODS,
                allowHeaders: ['Content-Type', 'X-Api-Key'],
                allowCredentials: true,
            },
            deployOptions: {
                stageName: props.environment,
                loggingLevel: apigateway.MethodLoggingLevel.INFO,
                dataTraceEnabled: true,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaG9vZC10by1jb2FzdC1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImhvb2QtdG8tY29hc3Qtc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbUNBQW1DO0FBRW5DLHlDQUF5QztBQUN6QywwREFBMEQ7QUFDMUQseURBQXlEO0FBQ3pELDhEQUE4RDtBQUM5RCxtREFBbUQ7QUFDbkQsMkRBQTJEO0FBQzNELDBEQUEwRDtBQUMxRCwyQ0FBMkM7QUFDM0MseURBQXlEO0FBQ3pELGlEQUFpRDtBQUNqRCxxREFBcUQ7QUFDckQsNkNBQTZDO0FBQzdDLDJDQUEyQztBQUMzQyw2Q0FBNEM7QUFDNUMsNkJBQTZCO0FBWTdCLHNEQUFzRDtBQUN0RCxTQUFTLGVBQWUsQ0FBQyxHQUFZLEVBQUUsR0FBVyxFQUFFLFlBQXFCO0lBQ3ZFLE9BQU8sR0FBRyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLElBQUksWUFBWSxDQUFDO0FBQ3JELENBQUM7QUFFRCxNQUFhLGdCQUFpQixTQUFRLEdBQUcsQ0FBQyxLQUFLO0lBQzdDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBNEI7UUFDcEUsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFeEIsTUFBTSxjQUFjLEdBQUcsS0FBSyxDQUFDLGVBQWUsSUFBSSxLQUFLLENBQUMsVUFBVSxJQUFJLEtBQUssQ0FBQyxTQUFTO1lBQ2pGLENBQUMsQ0FBQyxHQUFHLEtBQUssQ0FBQyxTQUFTLElBQUksS0FBSyxDQUFDLFVBQVUsRUFBRTtZQUMxQyxDQUFDLENBQUMsU0FBUyxDQUFDO1FBRWQscUNBQXFDO1FBQ3JDLE1BQU0sYUFBYSxHQUFHLElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsZUFBZSxFQUFFO1lBQ3pELFVBQVUsRUFBRSxHQUFHLEtBQUssQ0FBQyxXQUFXLDBCQUEwQixJQUFJLENBQUMsT0FBTyxFQUFFO1lB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LGFBQWEsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksS0FBSyxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFO0VBQzVILENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsNEJBQTRCLENBQUMsQ0FBQyxDQUFDLEVBQUU7Q0FDcEQsQ0FBQztRQUVFLDREQUE0RDtRQUM1RCxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLHdCQUF3QixFQUFFO1lBQ2hELEtBQUssRUFBRSxVQUFVO1lBQ2pCLFdBQVcsRUFBRSw2REFBNkQ7U0FDM0UsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNGO0FBM1hELDRDQTJYQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcbmltcG9ydCAqIGFzIHMzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1zMyc7XG5pbXBvcnQgKiBhcyBzM2RlcGxveSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtczMtZGVwbG95bWVudCc7XG5pbXBvcnQgKiBhcyBjbG91ZGZyb250IGZyb20gJ2F3cy1jZGstbGliL2F3cy1jbG91ZGZyb250JztcbmltcG9ydCAqIGFzIG9yaWdpbnMgZnJvbSAnYXdzLWNkay1saWIvYXdzLWNsb3VkZnJvbnQtb3JpZ2lucyc7XG5pbXBvcnQgKiBhcyByb3V0ZTUzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1yb3V0ZTUzJztcbmltcG9ydCAqIGFzIHRhcmdldHMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXJvdXRlNTMtdGFyZ2V0cyc7XG5pbXBvcnQgKiBhcyBhY20gZnJvbSAnYXdzLWNkay1saWIvYXdzLWNlcnRpZmljYXRlbWFuYWdlcic7XG5pbXBvcnQgKiBhcyBpYW0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWlhbSc7XG5pbXBvcnQgKiBhcyBhcGlnYXRld2F5IGZyb20gJ2F3cy1jZGstbGliL2F3cy1hcGlnYXRld2F5JztcbmltcG9ydCAqIGFzIGxhbWJkYSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbGFtYmRhJztcbmltcG9ydCAqIGFzIGR5bmFtb2RiIGZyb20gJ2F3cy1jZGstbGliL2F3cy1keW5hbW9kYic7XG5pbXBvcnQgKiBhcyBsb2dzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1sb2dzJztcbmltcG9ydCAqIGFzIHNzbSBmcm9tICdhd3MtY2RrLWxpYi9hd3Mtc3NtJztcbmltcG9ydCB7IFJlbW92YWxQb2xpY3kgfSBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuXG5leHBvcnQgaW50ZXJmYWNlIEhvb2RUb0NvYXN0U3RhY2tQcm9wcyBleHRlbmRzIGNkay5TdGFja1Byb3BzIHtcbiAgZG9tYWluTmFtZT86IHN0cmluZztcbiAgc3ViZG9tYWluPzogc3RyaW5nO1xuICByZWdpb246IHN0cmluZztcbiAgZW52aXJvbm1lbnQ6IHN0cmluZztcbiAgdXNlQ3VzdG9tRG9tYWluOiBib29sZWFuO1xuICBtb2NrTW9kZTogYm9vbGVhbjtcbiAgZ2VuZXJhdGVFbnZGaWxlOiBib29sZWFuO1xufVxuXG4vLyBIZWxwZXIgZnVuY3Rpb24gdG8gZ2V0IGNvbnRleHQgdmFsdWVzIHdpdGggZGVmYXVsdHNcbmZ1bmN0aW9uIGdldENvbnRleHRWYWx1ZShhcHA6IGNkay5BcHAsIGtleTogc3RyaW5nLCBkZWZhdWx0VmFsdWU/OiBzdHJpbmcpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICByZXR1cm4gYXBwLm5vZGUudHJ5R2V0Q29udGV4dChrZXkpIHx8IGRlZmF1bHRWYWx1ZTtcbn1cblxuZXhwb3J0IGNsYXNzIEhvb2RUb0NvYXN0U3RhY2sgZXh0ZW5kcyBjZGsuU3RhY2sge1xuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogSG9vZFRvQ29hc3RTdGFja1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XG5cbiAgICBjb25zdCBmdWxsRG9tYWluTmFtZSA9IHByb3BzLnVzZUN1c3RvbURvbWFpbiAmJiBwcm9wcy5kb21haW5OYW1lICYmIHByb3BzLnN1YmRvbWFpbiBcbiAgICAgID8gYCR7cHJvcHMuc3ViZG9tYWlufS4ke3Byb3BzLmRvbWFpbk5hbWV9YCBcbiAgICAgIDogdW5kZWZpbmVkO1xuXG4gICAgLy8gUzMgQnVja2V0IGZvciBob3N0aW5nIHRoZSBmcm9udGVuZFxuICAgIGNvbnN0IHdlYnNpdGVCdWNrZXQgPSBuZXcgczMuQnVja2V0KHRoaXMsICdXZWJzaXRlQnVja2V0Jywge1xuICAgICAgYnVja2V0TmFtZTogYCR7cHJvcHMuZW52aXJvbm1lbnR9LWhvb2QtdG8tY29hc3Qtd2Vic2l0ZS0ke3RoaXMuYWNjb3VudH1gLFxuICAgICAgcHVibGljUmVhZEFjY2VzczogZmFsc2UsXG4gICAgICBibG9ja1B1YmxpY0FjY2VzczogczMuQmxvY2tQdWJsaWNBY2Nlc3MuQkxPQ0tfQUxMLFxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuUkVUQUlOLFxuICAgICAgdmVyc2lvbmVkOiB0cnVlLFxuICAgIH0pO1xuXG4gICAgLy8gQ3JlYXRlIGJ1Y2tldCBwb2xpY3kgdG8gYWxsb3cgQ2xvdWRGcm9udCBhY2Nlc3NcbiAgICBjb25zdCBidWNrZXRQb2xpY3kgPSBuZXcgczMuQnVja2V0UG9saWN5KHRoaXMsICdXZWJzaXRlQnVja2V0UG9saWN5Jywge1xuICAgICAgYnVja2V0OiB3ZWJzaXRlQnVja2V0LFxuICAgIH0pO1xuXG4gICAgLy8gR3JhbnQgQ2xvdWRGcm9udCBhY2Nlc3MgdG8gdGhlIGJ1Y2tldFxuICAgIGJ1Y2tldFBvbGljeS5kb2N1bWVudC5hZGRTdGF0ZW1lbnRzKFxuICAgICAgbmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgICBzaWQ6ICdBbGxvd0Nsb3VkRnJvbnRBY2Nlc3MnLFxuICAgICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXG4gICAgICAgIHByaW5jaXBhbHM6IFtuZXcgaWFtLlNlcnZpY2VQcmluY2lwYWwoJ2Nsb3VkZnJvbnQuYW1hem9uYXdzLmNvbScpXSxcbiAgICAgICAgYWN0aW9uczogWydzMzpHZXRPYmplY3QnXSxcbiAgICAgICAgcmVzb3VyY2VzOiBbd2Vic2l0ZUJ1Y2tldC5hcm5Gb3JPYmplY3RzKCcqJyldLFxuICAgICAgICBjb25kaXRpb25zOiB7XG4gICAgICAgICAgU3RyaW5nRXF1YWxzOiB7XG4gICAgICAgICAgICAnQVdTOlNvdXJjZUFybic6IGBhcm46YXdzOmNsb3VkZnJvbnQ6OiR7dGhpcy5hY2NvdW50fTpkaXN0cmlidXRpb24vKmAsXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgIH0pXG4gICAgKTtcblxuICAgIC8vIENsb3VkRnJvbnQgRGlzdHJpYnV0aW9uXG4gICAgbGV0IGRpc3RyaWJ1dGlvbjogY2xvdWRmcm9udC5EaXN0cmlidXRpb247XG4gICAgbGV0IGhvc3RlZFpvbmU6IHJvdXRlNTMuSUhvc3RlZFpvbmUgfCB1bmRlZmluZWQ7XG4gICAgXG4gICAgaWYgKHByb3BzLnVzZUN1c3RvbURvbWFpbiAmJiBmdWxsRG9tYWluTmFtZSkge1xuICAgICAgLy8gQ3VzdG9tIGRvbWFpbiBzZXR1cCAtIGxvb2t1cCBob3N0ZWQgem9uZSBvbmNlXG4gICAgICBob3N0ZWRab25lID0gcm91dGU1My5Ib3N0ZWRab25lLmZyb21Mb29rdXAodGhpcywgJ0hvc3RlZFpvbmUnLCB7XG4gICAgICAgIGRvbWFpbk5hbWU6IHByb3BzLmRvbWFpbk5hbWUhLFxuICAgICAgfSk7XG5cbiAgICAgIGNvbnN0IGNlcnRpZmljYXRlID0gbmV3IGFjbS5DZXJ0aWZpY2F0ZSh0aGlzLCAnQ2VydGlmaWNhdGUnLCB7XG4gICAgICAgIGRvbWFpbk5hbWU6IGZ1bGxEb21haW5OYW1lLFxuICAgICAgICB2YWxpZGF0aW9uOiBhY20uQ2VydGlmaWNhdGVWYWxpZGF0aW9uLmZyb21EbnMoaG9zdGVkWm9uZSksXG4gICAgICB9KTtcblxuICAgICAgZGlzdHJpYnV0aW9uID0gbmV3IGNsb3VkZnJvbnQuRGlzdHJpYnV0aW9uKHRoaXMsICdEaXN0cmlidXRpb24nLCB7XG4gICAgICAgIGRlZmF1bHRCZWhhdmlvcjoge1xuICAgICAgICAgIG9yaWdpbjogbmV3IG9yaWdpbnMuUzNPcmlnaW4od2Vic2l0ZUJ1Y2tldCksXG4gICAgICAgICAgdmlld2VyUHJvdG9jb2xQb2xpY3k6IGNsb3VkZnJvbnQuVmlld2VyUHJvdG9jb2xQb2xpY3kuUkVESVJFQ1RfVE9fSFRUUFMsXG4gICAgICAgICAgYWxsb3dlZE1ldGhvZHM6IGNsb3VkZnJvbnQuQWxsb3dlZE1ldGhvZHMuQUxMT1dfR0VUX0hFQURfT1BUSU9OUyxcbiAgICAgICAgICBjYWNoZWRNZXRob2RzOiBjbG91ZGZyb250LkNhY2hlZE1ldGhvZHMuQ0FDSEVfR0VUX0hFQURfT1BUSU9OUyxcbiAgICAgICAgICBjYWNoZVBvbGljeTogY2xvdWRmcm9udC5DYWNoZVBvbGljeS5DQUNISU5HX09QVElNSVpFRCxcbiAgICAgICAgICBvcmlnaW5SZXF1ZXN0UG9saWN5OiBjbG91ZGZyb250Lk9yaWdpblJlcXVlc3RQb2xpY3kuQUxMX1ZJRVdFUl9FWENFUFRfSE9TVF9IRUFERVIsXG4gICAgICAgIH0sXG4gICAgICAgIGRvbWFpbk5hbWVzOiBbZnVsbERvbWFpbk5hbWVdLFxuICAgICAgICBjZXJ0aWZpY2F0ZSxcbiAgICAgICAgZXJyb3JSZXNwb25zZXM6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICBodHRwU3RhdHVzOiA0MDQsXG4gICAgICAgICAgICByZXNwb25zZUh0dHBTdGF0dXM6IDIwMCxcbiAgICAgICAgICAgIHJlc3BvbnNlUGFnZVBhdGg6ICcvaW5kZXguaHRtbCcsXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICBodHRwU3RhdHVzOiA0MDMsXG4gICAgICAgICAgICByZXNwb25zZUh0dHBTdGF0dXM6IDIwMCxcbiAgICAgICAgICAgIHJlc3BvbnNlUGFnZVBhdGg6ICcvaW5kZXguaHRtbCcsXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgIH0pO1xuXG4gICAgICAvLyBSb3V0ZTUzIEROUyBmb3IgZnJvbnRlbmRcbiAgICAgIG5ldyByb3V0ZTUzLkFSZWNvcmQodGhpcywgJ0FsaWFzUmVjb3JkJywge1xuICAgICAgICB6b25lOiBob3N0ZWRab25lLFxuICAgICAgICByZWNvcmROYW1lOiBwcm9wcy5zdWJkb21haW4hLFxuICAgICAgICB0YXJnZXQ6IHJvdXRlNTMuUmVjb3JkVGFyZ2V0LmZyb21BbGlhcyhcbiAgICAgICAgICBuZXcgdGFyZ2V0cy5DbG91ZEZyb250VGFyZ2V0KGRpc3RyaWJ1dGlvbilcbiAgICAgICAgKSxcbiAgICAgIH0pO1xuXG4gICAgICAvLyBDcmVhdGUgYmFja2VuZCBpbmZyYXN0cnVjdHVyZSBpZiB3ZSBoYXZlIGEgY3VzdG9tIGRvbWFpblxuICAgICAgaWYgKGhvc3RlZFpvbmUpIHtcbiAgICAgICAgdGhpcy5jcmVhdGVCYWNrZW5kSW5mcmFzdHJ1Y3R1cmUocHJvcHMsIGhvc3RlZFpvbmUpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBDcmVhdGUgYmFja2VuZCBpbmZyYXN0cnVjdHVyZSBldmVuIHdpdGhvdXQgY3VzdG9tIGRvbWFpblxuICAgICAgLy8gV2UgbmVlZCB0aGlzIGZvciB0aGUgQVBJIHRvIHdvcmtcbiAgICAgIHRoaXMuY3JlYXRlQmFja2VuZEluZnJhc3RydWN0dXJlKHByb3BzLCB1bmRlZmluZWQpO1xuICAgICAgXG4gICAgICAvLyBTaW1wbGUgQ2xvdWRGcm9udCBzZXR1cCB3aXRob3V0IGN1c3RvbSBkb21haW5cbiAgICAgIGRpc3RyaWJ1dGlvbiA9IG5ldyBjbG91ZGZyb250LkRpc3RyaWJ1dGlvbih0aGlzLCAnRGlzdHJpYnV0aW9uJywge1xuICAgICAgICBkZWZhdWx0QmVoYXZpb3I6IHtcbiAgICAgICAgICBvcmlnaW46IG5ldyBvcmlnaW5zLlMzT3JpZ2luKHdlYnNpdGVCdWNrZXQpLFxuICAgICAgICAgIHZpZXdlclByb3RvY29sUG9saWN5OiBjbG91ZGZyb250LlZpZXdlclByb3RvY29sUG9saWN5LlJFRElSRUNUX1RPX0hUVFBTLFxuICAgICAgICAgIGFsbG93ZWRNZXRob2RzOiBjbG91ZGZyb250LkFsbG93ZWRNZXRob2RzLkFMTE9XX0dFVF9IRUFEX09QVElPTlMsXG4gICAgICAgICAgY2FjaGVkTWV0aG9kczogY2xvdWRmcm9udC5DYWNoZWRNZXRob2RzLkNBQ0hFX0dFVF9IRUFEX09QVElPTlMsXG4gICAgICAgICAgY2FjaGVQb2xpY3k6IGNsb3VkZnJvbnQuQ2FjaGVQb2xpY3kuQ0FDSElOR19PUFRJTUlaRUQsXG4gICAgICAgICAgb3JpZ2luUmVxdWVzdFBvbGljeTogY2xvdWRmcm9udC5PcmlnaW5SZXF1ZXN0UG9saWN5LkFMTF9WSUVXRVJfRVhDRVBUX0hPU1RfSEVBREVSLFxuICAgICAgICB9LFxuICAgICAgICBlcnJvclJlc3BvbnNlczogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIGh0dHBTdGF0dXM6IDQwNCxcbiAgICAgICAgICAgIHJlc3BvbnNlSHR0cFN0YXR1czogMjAwLFxuICAgICAgICAgICAgcmVzcG9uc2VQYWdlUGF0aDogJy9pbmRleC5odG1sJyxcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIGh0dHBTdGF0dXM6IDQwMyxcbiAgICAgICAgICAgIHJlc3BvbnNlSHR0cFN0YXR1czogMjAwLFxuICAgICAgICAgICAgcmVzcG9uc2VQYWdlUGF0aDogJy9pbmRleC5odG1sJyxcbiAgICAgICAgICB9LFxuICAgICAgICBdLFxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gRGVwbG95IGZyb250ZW5kIGZpbGVzIHRvIFMzIGJ1Y2tldFxuICAgIG5ldyBzM2RlcGxveS5CdWNrZXREZXBsb3ltZW50KHRoaXMsICdGcm9udGVuZERlcGxveW1lbnQnLCB7XG4gICAgICBzb3VyY2VzOiBbczNkZXBsb3kuU291cmNlLmFzc2V0KHBhdGguam9pbihfX2Rpcm5hbWUsICcuLi8uLi93ZWItYXBwL2Rpc3Qvc3BhJykpXSxcbiAgICAgIGRlc3RpbmF0aW9uQnVja2V0OiB3ZWJzaXRlQnVja2V0LFxuICAgICAgZGlzdHJpYnV0aW9uOiBkaXN0cmlidXRpb24sXG4gICAgICBkaXN0cmlidXRpb25QYXRoczogWycvKiddLFxuICAgICAgcHJ1bmU6IHRydWUsIC8vIFJlbW92ZSBvbGQgZmlsZXNcbiAgICAgIHJldGFpbk9uRGVsZXRlOiBmYWxzZSxcbiAgICB9KTtcblxuICAgIC8vIEdlbmVyYXRlIGVudmlyb25tZW50IGZpbGUgZm9yIHdlYi1hcHAgaWYgcmVxdWVzdGVkXG4gICAgaWYgKHByb3BzLmdlbmVyYXRlRW52RmlsZSkge1xuICAgICAgdGhpcy5nZW5lcmF0ZUVudmlyb25tZW50RmlsZShwcm9wcywgZGlzdHJpYnV0aW9uLmRpc3RyaWJ1dGlvbkRvbWFpbk5hbWUpO1xuICAgIH1cblxuICAgIC8vIE91dHB1dHNcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnV2Vic2l0ZVVybCcsIHtcbiAgICAgIHZhbHVlOiBwcm9wcy51c2VDdXN0b21Eb21haW4gJiYgZnVsbERvbWFpbk5hbWUgXG4gICAgICAgID8gYGh0dHBzOi8vJHtmdWxsRG9tYWluTmFtZX1gIFxuICAgICAgICA6IGBodHRwczovLyR7ZGlzdHJpYnV0aW9uLmRpc3RyaWJ1dGlvbkRvbWFpbk5hbWV9YCxcbiAgICAgIGRlc2NyaXB0aW9uOiAnV2Vic2l0ZSBVUkwnLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0Rpc3RyaWJ1dGlvbklkJywge1xuICAgICAgdmFsdWU6IGRpc3RyaWJ1dGlvbi5kaXN0cmlidXRpb25JZCxcbiAgICAgIGRlc2NyaXB0aW9uOiAnQ2xvdWRGcm9udCBEaXN0cmlidXRpb24gSUQnLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1MzQnVja2V0TmFtZScsIHtcbiAgICAgIHZhbHVlOiB3ZWJzaXRlQnVja2V0LmJ1Y2tldE5hbWUsXG4gICAgICBkZXNjcmlwdGlvbjogJ1MzIEJ1Y2tldCBOYW1lIGZvciBXZWJzaXRlJyxcbiAgICB9KTtcblxuICAgIC8vIE1vY2sgbW9kZSBzcGVjaWZpYyBvdXRwdXRzXG4gICAgaWYgKHByb3BzLm1vY2tNb2RlKSB7XG4gICAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnTW9ja01vZGVJbmZvJywge1xuICAgICAgICB2YWx1ZTogJ0FwcGxpY2F0aW9uIGlzIHJ1bm5pbmcgaW4gTU9DSyBNT0RFIC0gYWxsIGRhdGEgaXMgbG9jYWwgbW9jayBkYXRhJyxcbiAgICAgICAgZGVzY3JpcHRpb246ICdNb2NrIE1vZGUgSW5mb3JtYXRpb24nLFxuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBjcmVhdGVCYWNrZW5kSW5mcmFzdHJ1Y3R1cmUocHJvcHM6IEhvb2RUb0NvYXN0U3RhY2tQcm9wcywgaG9zdGVkWm9uZT86IHJvdXRlNTMuSUhvc3RlZFpvbmUpIHtcbiAgICAvLyBEeW5hbW9EQiBUYWJsZXNcbiAgICBjb25zdCByYWNlc1RhYmxlID0gbmV3IGR5bmFtb2RiLlRhYmxlKHRoaXMsICdSYWNlc1RhYmxlJywge1xuICAgICAgdGFibGVOYW1lOiBgJHtwcm9wcy5lbnZpcm9ubWVudH0taHRjLXJhY2VzYCxcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAnaWQnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgICAgYmlsbGluZ01vZGU6IGR5bmFtb2RiLkJpbGxpbmdNb2RlLlBBWV9QRVJfUkVRVUVTVCxcbiAgICAgIHJlbW92YWxQb2xpY3k6IFJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICB9KTtcblxuICAgIC8vIEFQSSBLZXlcbiAgICBjb25zdCBhcGlLZXkgPSBuZXcgYXBpZ2F0ZXdheS5BcGlLZXkodGhpcywgJ0FwaUtleScsIHtcbiAgICAgIGFwaUtleU5hbWU6IGAke3Byb3BzLmVudmlyb25tZW50fS1odGMtYXBpLWtleWAsXG4gICAgICBkZXNjcmlwdGlvbjogJ0FQSSBLZXkgZm9yIEhvb2QgdG8gQ29hc3QgVGltZSBUcmFja2VyIGZyb250ZW5kJyxcbiAgICB9KTtcblxuICAgIC8vIFN0b3JlIEFQSSBLZXkgSUQgaW4gU1NNIFBhcmFtZXRlciBTdG9yZVxuICAgIG5ldyBzc20uU3RyaW5nUGFyYW1ldGVyKHRoaXMsICdBcGlLZXlQYXJhbWV0ZXInLCB7XG4gICAgICBwYXJhbWV0ZXJOYW1lOiBgLyR7cHJvcHMuZW52aXJvbm1lbnR9L2h0Yy9hcGkta2V5LWlkYCxcbiAgICAgIHN0cmluZ1ZhbHVlOiBhcGlLZXkua2V5SWQsXG4gICAgICBkZXNjcmlwdGlvbjogJ0FQSSBLZXkgSUQgZm9yIEhvb2QgdG8gQ29hc3QgVGltZSBUcmFja2VyJyxcbiAgICB9KTtcblxuICAgIC8vIExhbWJkYSBmdW5jdGlvbiBmb3IgcmFjZXMgZW5kcG9pbnQgd2l0aCBEeW5hbW9EQiBpbnRlZ3JhdGlvblxuICAgIGNvbnN0IHJhY2VzRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdSYWNlc0Z1bmN0aW9uJywge1xuICAgICAgZnVuY3Rpb25OYW1lOiBgJHtwcm9wcy5lbnZpcm9ubWVudH0taHRjLXJhY2VzYCxcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xOF9YLFxuICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLFxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdsYW1iZGEvcmFjZXMnKSxcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcbiAgICAgIG1lbW9yeVNpemU6IDI1NixcbiAgICAgIGxvZ1JldGVudGlvbjogbG9ncy5SZXRlbnRpb25EYXlzLk9ORV9XRUVLLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgRU5WSVJPTk1FTlQ6IHByb3BzLmVudmlyb25tZW50LFxuICAgICAgICBSQUNFU19UQUJMRV9OQU1FOiByYWNlc1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICAvLyBHcmFudCBEeW5hbW9EQiByZWFkL3dyaXRlIHBlcm1pc3Npb25zIHRvIHRoZSBMYW1iZGEgZnVuY3Rpb25cbiAgICByYWNlc1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShyYWNlc0Z1bmN0aW9uKTtcblxuICAgIC8vIEFQSSBHYXRld2F5XG4gICAgY29uc3QgYXBpID0gbmV3IGFwaWdhdGV3YXkuUmVzdEFwaSh0aGlzLCAnSG9vZFRvQ29hc3RBcGknLCB7XG4gICAgICByZXN0QXBpTmFtZTogYCR7cHJvcHMuZW52aXJvbm1lbnR9LWh0Yy1hcGlgLFxuICAgICAgZGVzY3JpcHRpb246ICdIb29kIHRvIENvYXN0IFRpbWUgVHJhY2tlciBBUEknLFxuICAgICAgZGVmYXVsdENvcnNQcmVmbGlnaHRPcHRpb25zOiB7XG4gICAgICAgIGFsbG93T3JpZ2luczogW1xuICAgICAgICAgIC8vIFVzZSBjdXN0b20gZG9tYWluIGlmIGF2YWlsYWJsZSwgb3RoZXJ3aXNlIHVzZSBDbG91ZEZyb250IGRvbWFpblxuICAgICAgICAgIC4uLihwcm9wcy51c2VDdXN0b21Eb21haW4gJiYgcHJvcHMuc3ViZG9tYWluICYmIHByb3BzLmRvbWFpbk5hbWUgXG4gICAgICAgICAgICA/IFtcbiAgICAgICAgICAgICAgICBgaHR0cHM6Ly8ke3Byb3BzLnN1YmRvbWFpbn0uJHtwcm9wcy5kb21haW5OYW1lfWAsIC8vIEZyb250ZW5kIGRvbWFpblxuICAgICAgICAgICAgICAgIGBodHRwczovL2h0Y2FwaS5kZXYuJHtwcm9wcy5kb21haW5OYW1lfWAsIC8vIEFQSSBkb21haW4gZm9yIGRldmVsb3BtZW50XG4gICAgICAgICAgICAgICAgYGh0dHBzOi8vaHRjYXBpLiR7cHJvcHMuZG9tYWluTmFtZX1gLCAvLyBBUEkgZG9tYWluIGZvciBwcm9kdWN0aW9uXG4gICAgICAgICAgICAgIF1cbiAgICAgICAgICAgIDogWydodHRwczovL2Q4cnQwZGIza3Z6ZDMuY2xvdWRmcm9udC5uZXQnXSksIC8vIERlZmF1bHQgQ2xvdWRGcm9udCBkb21haW5cbiAgICAgICAgICAnaHR0cDovL2xvY2FsaG9zdDo5MDAwJywgLy8gRm9yIGxvY2FsIGRldmVsb3BtZW50IChRdWFzYXIgZGVmYXVsdCBwb3J0KVxuICAgICAgICAgICdodHRwOi8vbG9jYWxob3N0OjMwMDAnIC8vIEZvciBsb2NhbCBkZXZlbG9wbWVudCAoYWx0ZXJuYXRpdmUgcG9ydClcbiAgICAgICAgXSxcbiAgICAgICAgYWxsb3dNZXRob2RzOiBhcGlnYXRld2F5LkNvcnMuQUxMX01FVEhPRFMsXG4gICAgICAgIGFsbG93SGVhZGVyczogWydDb250ZW50LVR5cGUnLCAnWC1BcGktS2V5J10sXG4gICAgICAgIGFsbG93Q3JlZGVudGlhbHM6IHRydWUsXG4gICAgICB9LFxuICAgICAgZGVwbG95T3B0aW9uczoge1xuICAgICAgICBzdGFnZU5hbWU6IHByb3BzLmVudmlyb25tZW50LFxuICAgICAgICBsb2dnaW5nTGV2ZWw6IGFwaWdhdGV3YXkuTWV0aG9kTG9nZ2luZ0xldmVsLklORk8sXG4gICAgICAgIGRhdGFUcmFjZUVuYWJsZWQ6IHRydWUsXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgLy8gQ3VzdG9tIGRvbWFpbiBmb3IgQVBJIChvbmx5IGlmIGhvc3RlZFpvbmUgaXMgYXZhaWxhYmxlKVxuICAgIGlmIChob3N0ZWRab25lICYmIHByb3BzLnVzZUN1c3RvbURvbWFpbiAmJiBwcm9wcy5kb21haW5OYW1lKSB7XG4gICAgICBjb25zdCBhcGlEb21haW5OYW1lID0gcHJvcHMuZW52aXJvbm1lbnQgPT09ICdkZXZlbG9wbWVudCcgXG4gICAgICAgID8gYGh0Y2FwaS5kZXYuJHtwcm9wcy5kb21haW5OYW1lfWAgXG4gICAgICAgIDogYGh0Y2FwaS4ke3Byb3BzLmRvbWFpbk5hbWV9YDtcblxuICAgICAgY29uc3QgYXBpQ2VydGlmaWNhdGUgPSBuZXcgYWNtLkNlcnRpZmljYXRlKHRoaXMsICdBcGlDZXJ0aWZpY2F0ZScsIHtcbiAgICAgICAgZG9tYWluTmFtZTogYXBpRG9tYWluTmFtZSxcbiAgICAgICAgdmFsaWRhdGlvbjogYWNtLkNlcnRpZmljYXRlVmFsaWRhdGlvbi5mcm9tRG5zKGhvc3RlZFpvbmUpLFxuICAgICAgfSk7XG5cbiAgICAgIGNvbnN0IGFwaURvbWFpbiA9IG5ldyBhcGlnYXRld2F5LkRvbWFpbk5hbWUodGhpcywgJ0FwaURvbWFpbicsIHtcbiAgICAgICAgZG9tYWluTmFtZTogYXBpRG9tYWluTmFtZSxcbiAgICAgICAgY2VydGlmaWNhdGU6IGFwaUNlcnRpZmljYXRlLFxuICAgICAgICBzZWN1cml0eVBvbGljeTogYXBpZ2F0ZXdheS5TZWN1cml0eVBvbGljeS5UTFNfMV8yLFxuICAgICAgfSk7XG5cbiAgICAgIC8vIEFzc29jaWF0ZSB0aGUgZG9tYWluIHdpdGggdGhlIEFQSVxuICAgICAgbmV3IGFwaWdhdGV3YXkuQmFzZVBhdGhNYXBwaW5nKHRoaXMsICdBcGlCYXNlUGF0aE1hcHBpbmcnLCB7XG4gICAgICAgIGRvbWFpbk5hbWU6IGFwaURvbWFpbixcbiAgICAgICAgcmVzdEFwaTogYXBpLFxuICAgICAgICBiYXNlUGF0aDogJycsXG4gICAgICB9KTtcblxuICAgICAgLy8gUm91dGU1MyBETlMgZm9yIEFQSVxuICAgICAgbmV3IHJvdXRlNTMuQVJlY29yZCh0aGlzLCAnQXBpQWxpYXNSZWNvcmQnLCB7XG4gICAgICAgIHpvbmU6IGhvc3RlZFpvbmUsXG4gICAgICAgIHJlY29yZE5hbWU6IHByb3BzLmVudmlyb25tZW50ID09PSAnZGV2ZWxvcG1lbnQnID8gJ2h0Y2FwaS5kZXYnIDogJ2h0Y2FwaScsXG4gICAgICAgIHRhcmdldDogcm91dGU1My5SZWNvcmRUYXJnZXQuZnJvbUFsaWFzKFxuICAgICAgICAgIG5ldyB0YXJnZXRzLkFwaUdhdGV3YXlEb21haW4oYXBpRG9tYWluKVxuICAgICAgICApLFxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gQVBJIEdhdGV3YXkgdXNhZ2UgcGxhblxuICAgIGNvbnN0IHVzYWdlUGxhbiA9IG5ldyBhcGlnYXRld2F5LlVzYWdlUGxhbih0aGlzLCAnVXNhZ2VQbGFuJywge1xuICAgICAgbmFtZTogYCR7cHJvcHMuZW52aXJvbm1lbnR9LWh0Yy11c2FnZS1wbGFuYCxcbiAgICAgIGRlc2NyaXB0aW9uOiAnVXNhZ2UgcGxhbiBmb3IgSG9vZCB0byBDb2FzdCBUaW1lIFRyYWNrZXIgQVBJJyxcbiAgICAgIHRocm90dGxlOiB7XG4gICAgICAgIHJhdGVMaW1pdDogMTAwLFxuICAgICAgICBidXJzdExpbWl0OiAyMDAsXG4gICAgICB9LFxuICAgICAgcXVvdGE6IHtcbiAgICAgICAgbGltaXQ6IDEwMDAwLFxuICAgICAgICBwZXJpb2Q6IGFwaWdhdGV3YXkuUGVyaW9kLk1PTlRILFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIHVzYWdlUGxhbi5hZGRBcGlLZXkoYXBpS2V5KTtcbiAgICBcbiAgICAvLyBBc3NvY2lhdGUgdXNhZ2UgcGxhbiB3aXRoIEFQSSBzdGFnZVxuICAgIHVzYWdlUGxhbi5hZGRBcGlTdGFnZSh7XG4gICAgICBzdGFnZTogYXBpLmRlcGxveW1lbnRTdGFnZSxcbiAgICB9KTtcblxuICAgIC8vIEZvcmNlIEFQSSBHYXRld2F5IGRlcGxveW1lbnQgdG8gZW5zdXJlIGFsbCBjaGFuZ2VzIGFyZSBhcHBsaWVkXG4gICAgbmV3IGFwaWdhdGV3YXkuRGVwbG95bWVudCh0aGlzLCAnQXBpRGVwbG95bWVudCcsIHtcbiAgICAgIGFwaSxcbiAgICAgIGRlc2NyaXB0aW9uOiAnRGVwbG95bWVudCBmb3IgTGFtYmRhIGludGVncmF0aW9uIGNoYW5nZXMnLFxuICAgICAgcmV0YWluRGVwbG95bWVudHM6IGZhbHNlLFxuICAgIH0pO1xuXG4gICAgLy8gRlVMTCBDUlVEIEVORFBPSU5UUyBmb3IgcmFjZXNcbiAgICBjb25zdCByYWNlc1Jlc291cmNlID0gYXBpLnJvb3QuYWRkUmVzb3VyY2UoJ3JhY2VzJyk7XG4gICAgXG4gICAgLy8gR0VUIC9yYWNlcyAtIExpc3QgYWxsIHJhY2VzXG4gICAgcmFjZXNSZXNvdXJjZS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHJhY2VzRnVuY3Rpb24pLCB7XG4gICAgICBhcGlLZXlSZXF1aXJlZDogdHJ1ZSxcbiAgICB9KTtcblxuICAgIC8vIFBPU1QgL3JhY2VzIC0gQ3JlYXRlIG5ldyByYWNlXG4gICAgcmFjZXNSZXNvdXJjZS5hZGRNZXRob2QoJ1BPU1QnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihyYWNlc0Z1bmN0aW9uKSwge1xuICAgICAgYXBpS2V5UmVxdWlyZWQ6IHRydWUsXG4gICAgfSk7XG5cbiAgICAvLyBJbmRpdmlkdWFsIHJhY2UgcmVzb3VyY2UgZm9yIFBVVC9ERUxFVEUgb3BlcmF0aW9uc1xuICAgIGNvbnN0IHJhY2VSZXNvdXJjZSA9IHJhY2VzUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ3tpZH0nKTtcbiAgICBcbiAgICAvLyBHRVQgL3JhY2VzL3tpZH0gLSBHZXQgc3BlY2lmaWMgcmFjZVxuICAgIHJhY2VSZXNvdXJjZS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHJhY2VzRnVuY3Rpb24pLCB7XG4gICAgICBhcGlLZXlSZXF1aXJlZDogdHJ1ZSxcbiAgICB9KTtcbiAgICBcbiAgICAvLyBQVVQgL3JhY2VzL3tpZH0gLSBVcGRhdGUgcmFjZVxuICAgIHJhY2VSZXNvdXJjZS5hZGRNZXRob2QoJ1BVVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHJhY2VzRnVuY3Rpb24pLCB7XG4gICAgICBhcGlLZXlSZXF1aXJlZDogdHJ1ZSxcbiAgICB9KTtcblxuICAgIC8vIERFTEVURSAvcmFjZXMve2lkfSAtIERlbGV0ZSByYWNlXG4gICAgcmFjZVJlc291cmNlLmFkZE1ldGhvZCgnREVMRVRFJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24ocmFjZXNGdW5jdGlvbiksIHtcbiAgICAgIGFwaUtleVJlcXVpcmVkOiB0cnVlLFxuICAgIH0pO1xuXG4gICAgLy8gQWRkIG91dHB1dHNcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQXBpVXJsJywge1xuICAgICAgdmFsdWU6IGhvc3RlZFpvbmUgJiYgcHJvcHMudXNlQ3VzdG9tRG9tYWluICYmIHByb3BzLmRvbWFpbk5hbWVcbiAgICAgICAgPyBgaHR0cHM6Ly8ke3Byb3BzLmVudmlyb25tZW50ID09PSAnZGV2ZWxvcG1lbnQnID8gJ2h0Y2FwaS5kZXYuJyA6ICdodGNhcGkuJ30ke3Byb3BzLmRvbWFpbk5hbWV9YFxuICAgICAgICA6IGBodHRwczovLyR7YXBpLnJlc3RBcGlJZH0uZXhlY3V0ZS1hcGkuJHtwcm9wcy5yZWdpb259LmFtYXpvbmF3cy5jb20vJHtwcm9wcy5lbnZpcm9ubWVudH0vYCxcbiAgICAgIGRlc2NyaXB0aW9uOiAnQVBJIEdhdGV3YXkgVVJMJyxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdBcGlLZXlJZCcsIHtcbiAgICAgIHZhbHVlOiBhcGlLZXkua2V5SWQsXG4gICAgICBkZXNjcmlwdGlvbjogJ0FQSSBLZXkgSUQnLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0R5bmFtb0RCVGFibGVzJywge1xuICAgICAgdmFsdWU6IGBSYWNlczogJHtyYWNlc1RhYmxlLnRhYmxlTmFtZX1gLFxuICAgICAgZGVzY3JpcHRpb246ICdEeW5hbW9EQiBUYWJsZSBOYW1lcycsXG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIGdlbmVyYXRlRW52aXJvbm1lbnRGaWxlKFxuICAgIHByb3BzOiBIb29kVG9Db2FzdFN0YWNrUHJvcHMsIFxuICAgIGRpc3RyaWJ1dGlvbkRvbWFpbjogc3RyaW5nXG4gICkge1xuICAgIGNvbnN0IGVudkNvbnRlbnQgPSBgIyBFbnZpcm9ubWVudCBjb25maWd1cmF0aW9uIGZvciBIb29kIHRvIENvYXN0IFRpbWUgVHJhY2tlclxuIyBHZW5lcmF0ZWQgYnkgQ0RLIGRlcGxveW1lbnQgLSBETyBOT1QgRURJVCBNQU5VQUxMWVxuXG4jIE1vY2sgTW9kZSBDb25maWd1cmF0aW9uXG5WSVRFX01PQ0tfTU9ERT0ke3Byb3BzLm1vY2tNb2RlfVxuXG4jIEFXUyBDb25maWd1cmF0aW9uXG5WSVRFX0FXU19SRUdJT049JHtwcm9wcy5yZWdpb259XG5WSVRFX0VOVklST05NRU5UPSR7cHJvcHMuZW52aXJvbm1lbnR9XG5cbiMgRG9tYWluIENvbmZpZ3VyYXRpb25cblZJVEVfVVNFX0NVU1RPTV9ET01BSU49JHtwcm9wcy51c2VDdXN0b21Eb21haW59XG4ke3Byb3BzLmRvbWFpbk5hbWUgPyBgVklURV9ET01BSU5fTkFNRT0ke3Byb3BzLmRvbWFpbk5hbWV9YCA6ICcnfVxuJHtwcm9wcy5zdWJkb21haW4gPyBgVklURV9TVUJET01BSU49JHtwcm9wcy5zdWJkb21haW59YCA6ICcnfVxuXG4jIFdlYnNpdGUgVVJMXG5WSVRFX1dFQlNJVEVfVVJMPWh0dHBzOi8vJHtkaXN0cmlidXRpb25Eb21haW59XG5cbiMgTW9jayBNb2RlIE5vdGVcbiR7cHJvcHMubW9ja01vZGUgPyAnIyBSdW5uaW5nIGluIE1PQ0sgTU9ERSAtIGFsbCBkYXRhIGlzIGxvY2FsIG1vY2sgZGF0YScgOiAnIyBSdW5uaW5nIGluIFBST0RVQ1RJT04gTU9ERSAtIHJlcXVpcmVzIEFQSSBlbmRwb2ludHMnfVxuXG4jIEFQSSBDb25maWd1cmF0aW9uICh3aGVuIG5vdCBpbiBtb2NrIG1vZGUpXG4keyFwcm9wcy5tb2NrTW9kZSA/IGBWSVRFX0FQSV9VUkw9aHR0cHM6Ly9odGNhcGkke3Byb3BzLmVudmlyb25tZW50ID09PSAnZGV2ZWxvcG1lbnQnID8gJy5kZXYnIDogJyd9LiR7cHJvcHMuZG9tYWluTmFtZX1gIDogJyd9XG4keyFwcm9wcy5tb2NrTW9kZSA/ICdWSVRFX0FQSV9LRVlfUkVRVUlSRUQ9dHJ1ZScgOiAnJ31cbmA7XG5cbiAgICAvLyBPdXRwdXQgdGhlIGVudmlyb25tZW50IGZpbGUgY29udGVudCBmb3IgbWFudWFsIGRlcGxveW1lbnRcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnRW52aXJvbm1lbnRGaWxlQ29udGVudCcsIHtcbiAgICAgIHZhbHVlOiBlbnZDb250ZW50LFxuICAgICAgZGVzY3JpcHRpb246ICdFbnZpcm9ubWVudCBmaWxlIGNvbnRlbnQgdG8gY29weSB0byB3ZWItYXBwLy5lbnYucHJvZHVjdGlvbicsXG4gICAgfSk7XG4gIH1cbn1cbiJdfQ==