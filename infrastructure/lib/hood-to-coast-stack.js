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
        const teamsTable = new dynamodb.Table(this, 'TeamsTable', {
            tableName: `${props.environment}-htc-teams`,
            partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            removalPolicy: aws_cdk_lib_1.RemovalPolicy.DESTROY,
        });
        const runnersTable = new dynamodb.Table(this, 'RunnersTable', {
            tableName: `${props.environment}-htc-runners`,
            partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            removalPolicy: aws_cdk_lib_1.RemovalPolicy.DESTROY,
        });
        const legsTable = new dynamodb.Table(this, 'LegsTable', {
            tableName: `${props.environment}-htc-legs`,
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
                        ? [`https://${props.subdomain}.${props.domainName}`]
                        : ['https://d8rt0db3kvzd3.cloudfront.net']),
                    'http://localhost:3000' // For local development
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
            value: `Races: ${racesTable.tableName}, Teams: ${teamsTable.tableName}, Runners: ${runnersTable.tableName}, Legs: ${legsTable.tableName}`,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaG9vZC10by1jb2FzdC1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImhvb2QtdG8tY29hc3Qtc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbUNBQW1DO0FBRW5DLHlDQUF5QztBQUN6Qyx5REFBeUQ7QUFDekQsOERBQThEO0FBQzlELG1EQUFtRDtBQUNuRCwyREFBMkQ7QUFDM0QsMERBQTBEO0FBQzFELDJDQUEyQztBQUMzQyx5REFBeUQ7QUFDekQsaURBQWlEO0FBQ2pELHFEQUFxRDtBQUNyRCw2Q0FBNkM7QUFDN0MsMkNBQTJDO0FBQzNDLDZDQUE0QztBQVk1QyxzREFBc0Q7QUFDdEQsU0FBUyxlQUFlLENBQUMsR0FBWSxFQUFFLEdBQVcsRUFBRSxZQUFxQjtJQUN2RSxPQUFPLEdBQUcsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxJQUFJLFlBQVksQ0FBQztBQUNyRCxDQUFDO0FBRUQsTUFBYSxnQkFBaUIsU0FBUSxHQUFHLENBQUMsS0FBSztJQUM3QyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQTRCO1FBQ3BFLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXhCLE1BQU0sY0FBYyxHQUFHLEtBQUssQ0FBQyxlQUFlLElBQUksS0FBSyxDQUFDLFVBQVUsSUFBSSxLQUFLLENBQUMsU0FBUztZQUNqRixDQUFDLENBQUMsR0FBRyxLQUFLLENBQUMsU0FBUyxJQUFJLEtBQUssQ0FBQyxVQUFVLEVBQUU7WUFDMUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQztRQUVkLHFDQUFxQztRQUNyQyxNQUFNLGFBQWEsR0FBRyxJQUFJLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLGVBQWUsRUFBRTtZQUN6RCxVQUFVLEVBQUUsR0FBRyxLQUFLLENBQUMsV0FBVywwQkFBMEIsSUFBSSxDQUFDLE9BQU8sRUFBRTtZQUN4RSxnQkFBZ0IsRUFBRSxLQUFLO1lBQ3ZC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WCxLQUFLLENBQUMsZUFBZTtFQUM1QyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxvQkFBb0IsS0FBSyxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFO0VBQzlELEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLGtCQUFrQixLQUFLLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUU7OzsyQkFHakMsa0JBQWtCOzs7RUFHM0MsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsc0RBQXNELENBQUMsQ0FBQyxDQUFDLHVEQUF1RDs7O0VBR2pJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsOEJBQThCLEtBQUssQ0FBQyxXQUFXLEtBQUssYUFBYSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxLQUFLLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUU7RUFDNUgsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDLENBQUMsRUFBRTtDQUNwRCxDQUFDO1FBRUUsNERBQTREO1FBQzVELElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsd0JBQXdCLEVBQUU7WUFDaEQsS0FBSyxFQUFFLFVBQVU7WUFDakIsV0FBVyxFQUFFLDZEQUE2RDtTQUMzRSxDQUFDLENBQUM7SUFDTCxDQUFDO0NBQ0Y7QUE1WEQsNENBNFhDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xuaW1wb3J0ICogYXMgczMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXMzJztcbmltcG9ydCAqIGFzIGNsb3VkZnJvbnQgZnJvbSAnYXdzLWNkay1saWIvYXdzLWNsb3VkZnJvbnQnO1xuaW1wb3J0ICogYXMgb3JpZ2lucyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtY2xvdWRmcm9udC1vcmlnaW5zJztcbmltcG9ydCAqIGFzIHJvdXRlNTMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXJvdXRlNTMnO1xuaW1wb3J0ICogYXMgdGFyZ2V0cyBmcm9tICdhd3MtY2RrLWxpYi9hd3Mtcm91dGU1My10YXJnZXRzJztcbmltcG9ydCAqIGFzIGFjbSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtY2VydGlmaWNhdGVtYW5hZ2VyJztcbmltcG9ydCAqIGFzIGlhbSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtaWFtJztcbmltcG9ydCAqIGFzIGFwaWdhdGV3YXkgZnJvbSAnYXdzLWNkay1saWIvYXdzLWFwaWdhdGV3YXknO1xuaW1wb3J0ICogYXMgbGFtYmRhIGZyb20gJ2F3cy1jZGstbGliL2F3cy1sYW1iZGEnO1xuaW1wb3J0ICogYXMgZHluYW1vZGIgZnJvbSAnYXdzLWNkay1saWIvYXdzLWR5bmFtb2RiJztcbmltcG9ydCAqIGFzIGxvZ3MgZnJvbSAnYXdzLWNkay1saWIvYXdzLWxvZ3MnO1xuaW1wb3J0ICogYXMgc3NtIGZyb20gJ2F3cy1jZGstbGliL2F3cy1zc20nO1xuaW1wb3J0IHsgUmVtb3ZhbFBvbGljeSB9IGZyb20gJ2F3cy1jZGstbGliJztcblxuZXhwb3J0IGludGVyZmFjZSBIb29kVG9Db2FzdFN0YWNrUHJvcHMgZXh0ZW5kcyBjZGsuU3RhY2tQcm9wcyB7XG4gIGRvbWFpbk5hbWU/OiBzdHJpbmc7XG4gIHN1YmRvbWFpbj86IHN0cmluZztcbiAgcmVnaW9uOiBzdHJpbmc7XG4gIGVudmlyb25tZW50OiBzdHJpbmc7XG4gIHVzZUN1c3RvbURvbWFpbjogYm9vbGVhbjtcbiAgbW9ja01vZGU6IGJvb2xlYW47XG4gIGdlbmVyYXRlRW52RmlsZTogYm9vbGVhbjtcbn1cblxuLy8gSGVscGVyIGZ1bmN0aW9uIHRvIGdldCBjb250ZXh0IHZhbHVlcyB3aXRoIGRlZmF1bHRzXG5mdW5jdGlvbiBnZXRDb250ZXh0VmFsdWUoYXBwOiBjZGsuQXBwLCBrZXk6IHN0cmluZywgZGVmYXVsdFZhbHVlPzogc3RyaW5nKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcbiAgcmV0dXJuIGFwcC5ub2RlLnRyeUdldENvbnRleHQoa2V5KSB8fCBkZWZhdWx0VmFsdWU7XG59XG5cbmV4cG9ydCBjbGFzcyBIb29kVG9Db2FzdFN0YWNrIGV4dGVuZHMgY2RrLlN0YWNrIHtcbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IEhvb2RUb0NvYXN0U3RhY2tQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xuXG4gICAgY29uc3QgZnVsbERvbWFpbk5hbWUgPSBwcm9wcy51c2VDdXN0b21Eb21haW4gJiYgcHJvcHMuZG9tYWluTmFtZSAmJiBwcm9wcy5zdWJkb21haW4gXG4gICAgICA/IGAke3Byb3BzLnN1YmRvbWFpbn0uJHtwcm9wcy5kb21haW5OYW1lfWAgXG4gICAgICA6IHVuZGVmaW5lZDtcblxuICAgIC8vIFMzIEJ1Y2tldCBmb3IgaG9zdGluZyB0aGUgZnJvbnRlbmRcbiAgICBjb25zdCB3ZWJzaXRlQnVja2V0ID0gbmV3IHMzLkJ1Y2tldCh0aGlzLCAnV2Vic2l0ZUJ1Y2tldCcsIHtcbiAgICAgIGJ1Y2tldE5hbWU6IGAke3Byb3BzLmVudmlyb25tZW50fS1ob29kLXRvLWNvYXN0LXdlYnNpdGUtJHt0aGlzLmFjY291bnR9YCxcbiAgICAgIHB1YmxpY1JlYWRBY2Nlc3M6IGZhbHNlLFxuICAgICAgYmxvY2tQdWJsaWNBY2Nlc3M6IHMzLkJsb2NrUHVibGljQWNjZXNzLkJMT0NLX0FMTCxcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LlJFVEFJTixcbiAgICAgIHZlcnNpb25lZDogdHJ1ZSxcbiAgICB9KTtcblxuICAgIC8vIENyZWF0ZSBidWNrZXQgcG9saWN5IHRvIGFsbG93IENsb3VkRnJvbnQgYWNjZXNzXG4gICAgY29uc3QgYnVja2V0UG9saWN5ID0gbmV3IHMzLkJ1Y2tldFBvbGljeSh0aGlzLCAnV2Vic2l0ZUJ1Y2tldFBvbGljeScsIHtcbiAgICAgIGJ1Y2tldDogd2Vic2l0ZUJ1Y2tldCxcbiAgICB9KTtcblxuICAgIC8vIEdyYW50IENsb3VkRnJvbnQgYWNjZXNzIHRvIHRoZSBidWNrZXRcbiAgICBidWNrZXRQb2xpY3kuZG9jdW1lbnQuYWRkU3RhdGVtZW50cyhcbiAgICAgIG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgc2lkOiAnQWxsb3dDbG91ZEZyb250QWNjZXNzJyxcbiAgICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxuICAgICAgICBwcmluY2lwYWxzOiBbbmV3IGlhbS5TZXJ2aWNlUHJpbmNpcGFsKCdjbG91ZGZyb250LmFtYXpvbmF3cy5jb20nKV0sXG4gICAgICAgIGFjdGlvbnM6IFsnczM6R2V0T2JqZWN0J10sXG4gICAgICAgIHJlc291cmNlczogW3dlYnNpdGVCdWNrZXQuYXJuRm9yT2JqZWN0cygnKicpXSxcbiAgICAgICAgY29uZGl0aW9uczoge1xuICAgICAgICAgIFN0cmluZ0VxdWFsczoge1xuICAgICAgICAgICAgJ0FXUzpTb3VyY2VBcm4nOiBgYXJuOmF3czpjbG91ZGZyb250Ojoke3RoaXMuYWNjb3VudH06ZGlzdHJpYnV0aW9uLypgLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICB9KVxuICAgICk7XG5cbiAgICAvLyBDbG91ZEZyb250IERpc3RyaWJ1dGlvblxuICAgIGxldCBkaXN0cmlidXRpb246IGNsb3VkZnJvbnQuRGlzdHJpYnV0aW9uO1xuICAgIGxldCBob3N0ZWRab25lOiByb3V0ZTUzLklIb3N0ZWRab25lIHwgdW5kZWZpbmVkO1xuICAgIFxuICAgIGlmIChwcm9wcy51c2VDdXN0b21Eb21haW4gJiYgZnVsbERvbWFpbk5hbWUpIHtcbiAgICAgIC8vIEN1c3RvbSBkb21haW4gc2V0dXAgLSBsb29rdXAgaG9zdGVkIHpvbmUgb25jZVxuICAgICAgaG9zdGVkWm9uZSA9IHJvdXRlNTMuSG9zdGVkWm9uZS5mcm9tTG9va3VwKHRoaXMsICdIb3N0ZWRab25lJywge1xuICAgICAgICBkb21haW5OYW1lOiBwcm9wcy5kb21haW5OYW1lISxcbiAgICAgIH0pO1xuXG4gICAgICBjb25zdCBjZXJ0aWZpY2F0ZSA9IG5ldyBhY20uQ2VydGlmaWNhdGUodGhpcywgJ0NlcnRpZmljYXRlJywge1xuICAgICAgICBkb21haW5OYW1lOiBmdWxsRG9tYWluTmFtZSxcbiAgICAgICAgdmFsaWRhdGlvbjogYWNtLkNlcnRpZmljYXRlVmFsaWRhdGlvbi5mcm9tRG5zKGhvc3RlZFpvbmUpLFxuICAgICAgfSk7XG5cbiAgICAgIGRpc3RyaWJ1dGlvbiA9IG5ldyBjbG91ZGZyb250LkRpc3RyaWJ1dGlvbih0aGlzLCAnRGlzdHJpYnV0aW9uJywge1xuICAgICAgICBkZWZhdWx0QmVoYXZpb3I6IHtcbiAgICAgICAgICBvcmlnaW46IG5ldyBvcmlnaW5zLlMzT3JpZ2luKHdlYnNpdGVCdWNrZXQpLFxuICAgICAgICAgIHZpZXdlclByb3RvY29sUG9saWN5OiBjbG91ZGZyb250LlZpZXdlclByb3RvY29sUG9saWN5LlJFRElSRUNUX1RPX0hUVFBTLFxuICAgICAgICAgIGFsbG93ZWRNZXRob2RzOiBjbG91ZGZyb250LkFsbG93ZWRNZXRob2RzLkFMTE9XX0dFVF9IRUFEX09QVElPTlMsXG4gICAgICAgICAgY2FjaGVkTWV0aG9kczogY2xvdWRmcm9udC5DYWNoZWRNZXRob2RzLkNBQ0hFX0dFVF9IRUFEX09QVElPTlMsXG4gICAgICAgICAgY2FjaGVQb2xpY3k6IGNsb3VkZnJvbnQuQ2FjaGVQb2xpY3kuQ0FDSElOR19PUFRJTUlaRUQsXG4gICAgICAgICAgb3JpZ2luUmVxdWVzdFBvbGljeTogY2xvdWRmcm9udC5PcmlnaW5SZXF1ZXN0UG9saWN5LkFMTF9WSUVXRVJfRVhDRVBUX0hPU1RfSEVBREVSLFxuICAgICAgICB9LFxuICAgICAgICBkb21haW5OYW1lczogW2Z1bGxEb21haW5OYW1lXSxcbiAgICAgICAgY2VydGlmaWNhdGUsXG4gICAgICAgIGVycm9yUmVzcG9uc2VzOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgaHR0cFN0YXR1czogNDA0LFxuICAgICAgICAgICAgcmVzcG9uc2VIdHRwU3RhdHVzOiAyMDAsXG4gICAgICAgICAgICByZXNwb25zZVBhZ2VQYXRoOiAnL2luZGV4Lmh0bWwnLFxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgaHR0cFN0YXR1czogNDAzLFxuICAgICAgICAgICAgcmVzcG9uc2VIdHRwU3RhdHVzOiAyMDAsXG4gICAgICAgICAgICByZXNwb25zZVBhZ2VQYXRoOiAnL2luZGV4Lmh0bWwnLFxuICAgICAgICAgIH0sXG4gICAgICAgIF0sXG4gICAgICB9KTtcblxuICAgICAgLy8gUm91dGU1MyBETlMgZm9yIGZyb250ZW5kXG4gICAgICBuZXcgcm91dGU1My5BUmVjb3JkKHRoaXMsICdBbGlhc1JlY29yZCcsIHtcbiAgICAgICAgem9uZTogaG9zdGVkWm9uZSxcbiAgICAgICAgcmVjb3JkTmFtZTogcHJvcHMuc3ViZG9tYWluISxcbiAgICAgICAgdGFyZ2V0OiByb3V0ZTUzLlJlY29yZFRhcmdldC5mcm9tQWxpYXMoXG4gICAgICAgICAgbmV3IHRhcmdldHMuQ2xvdWRGcm9udFRhcmdldChkaXN0cmlidXRpb24pXG4gICAgICAgICksXG4gICAgICB9KTtcblxuICAgICAgLy8gQ3JlYXRlIGJhY2tlbmQgaW5mcmFzdHJ1Y3R1cmUgaWYgd2UgaGF2ZSBhIGN1c3RvbSBkb21haW5cbiAgICAgIGlmIChob3N0ZWRab25lKSB7XG4gICAgICAgIHRoaXMuY3JlYXRlQmFja2VuZEluZnJhc3RydWN0dXJlKHByb3BzLCBob3N0ZWRab25lKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgLy8gQ3JlYXRlIGJhY2tlbmQgaW5mcmFzdHJ1Y3R1cmUgZXZlbiB3aXRob3V0IGN1c3RvbSBkb21haW5cbiAgICAgIC8vIFdlIG5lZWQgdGhpcyBmb3IgdGhlIEFQSSB0byB3b3JrXG4gICAgICB0aGlzLmNyZWF0ZUJhY2tlbmRJbmZyYXN0cnVjdHVyZShwcm9wcywgdW5kZWZpbmVkKTtcbiAgICAgIFxuICAgICAgLy8gU2ltcGxlIENsb3VkRnJvbnQgc2V0dXAgd2l0aG91dCBjdXN0b20gZG9tYWluXG4gICAgICBkaXN0cmlidXRpb24gPSBuZXcgY2xvdWRmcm9udC5EaXN0cmlidXRpb24odGhpcywgJ0Rpc3RyaWJ1dGlvbicsIHtcbiAgICAgICAgZGVmYXVsdEJlaGF2aW9yOiB7XG4gICAgICAgICAgb3JpZ2luOiBuZXcgb3JpZ2lucy5TM09yaWdpbih3ZWJzaXRlQnVja2V0KSxcbiAgICAgICAgICB2aWV3ZXJQcm90b2NvbFBvbGljeTogY2xvdWRmcm9udC5WaWV3ZXJQcm90b2NvbFBvbGljeS5SRURJUkVDVF9UT19IVFRQUyxcbiAgICAgICAgICBhbGxvd2VkTWV0aG9kczogY2xvdWRmcm9udC5BbGxvd2VkTWV0aG9kcy5BTExPV19HRVRfSEVBRF9PUFRJT05TLFxuICAgICAgICAgIGNhY2hlZE1ldGhvZHM6IGNsb3VkZnJvbnQuQ2FjaGVkTWV0aG9kcy5DQUNIRV9HRVRfSEVBRF9PUFRJT05TLFxuICAgICAgICAgIGNhY2hlUG9saWN5OiBjbG91ZGZyb250LkNhY2hlUG9saWN5LkNBQ0hJTkdfT1BUSU1JWkVELFxuICAgICAgICAgIG9yaWdpblJlcXVlc3RQb2xpY3k6IGNsb3VkZnJvbnQuT3JpZ2luUmVxdWVzdFBvbGljeS5BTExfVklFV0VSX0VYQ0VQVF9IT1NUX0hFQURFUixcbiAgICAgICAgfSxcbiAgICAgICAgZXJyb3JSZXNwb25zZXM6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICBodHRwU3RhdHVzOiA0MDQsXG4gICAgICAgICAgICByZXNwb25zZUh0dHBTdGF0dXM6IDIwMCxcbiAgICAgICAgICAgIHJlc3BvbnNlUGFnZVBhdGg6ICcvaW5kZXguaHRtbCcsXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICBodHRwU3RhdHVzOiA0MDMsXG4gICAgICAgICAgICByZXNwb25zZUh0dHBTdGF0dXM6IDIwMCxcbiAgICAgICAgICAgIHJlc3BvbnNlUGFnZVBhdGg6ICcvaW5kZXguaHRtbCcsXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIEdlbmVyYXRlIGVudmlyb25tZW50IGZpbGUgZm9yIHdlYi1hcHAgaWYgcmVxdWVzdGVkXG4gICAgaWYgKHByb3BzLmdlbmVyYXRlRW52RmlsZSkge1xuICAgICAgdGhpcy5nZW5lcmF0ZUVudmlyb25tZW50RmlsZShwcm9wcywgZGlzdHJpYnV0aW9uLmRpc3RyaWJ1dGlvbkRvbWFpbk5hbWUpO1xuICAgIH1cblxuICAgIC8vIE91dHB1dHNcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnV2Vic2l0ZVVybCcsIHtcbiAgICAgIHZhbHVlOiBwcm9wcy51c2VDdXN0b21Eb21haW4gJiYgZnVsbERvbWFpbk5hbWUgXG4gICAgICAgID8gYGh0dHBzOi8vJHtmdWxsRG9tYWluTmFtZX1gIFxuICAgICAgICA6IGBodHRwczovLyR7ZGlzdHJpYnV0aW9uLmRpc3RyaWJ1dGlvbkRvbWFpbk5hbWV9YCxcbiAgICAgIGRlc2NyaXB0aW9uOiAnV2Vic2l0ZSBVUkwnLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0Rpc3RyaWJ1dGlvbklkJywge1xuICAgICAgdmFsdWU6IGRpc3RyaWJ1dGlvbi5kaXN0cmlidXRpb25JZCxcbiAgICAgIGRlc2NyaXB0aW9uOiAnQ2xvdWRGcm9udCBEaXN0cmlidXRpb24gSUQnLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1MzQnVja2V0TmFtZScsIHtcbiAgICAgIHZhbHVlOiB3ZWJzaXRlQnVja2V0LmJ1Y2tldE5hbWUsXG4gICAgICBkZXNjcmlwdGlvbjogJ1MzIEJ1Y2tldCBOYW1lIGZvciBXZWJzaXRlJyxcbiAgICB9KTtcblxuICAgIC8vIE1vY2sgbW9kZSBzcGVjaWZpYyBvdXRwdXRzXG4gICAgaWYgKHByb3BzLm1vY2tNb2RlKSB7XG4gICAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnTW9ja01vZGVJbmZvJywge1xuICAgICAgICB2YWx1ZTogJ0FwcGxpY2F0aW9uIGlzIHJ1bm5pbmcgaW4gTU9DSyBNT0RFIC0gYWxsIGRhdGEgaXMgbG9jYWwgbW9jayBkYXRhJyxcbiAgICAgICAgZGVzY3JpcHRpb246ICdNb2NrIE1vZGUgSW5mb3JtYXRpb24nLFxuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBjcmVhdGVCYWNrZW5kSW5mcmFzdHJ1Y3R1cmUocHJvcHM6IEhvb2RUb0NvYXN0U3RhY2tQcm9wcywgaG9zdGVkWm9uZT86IHJvdXRlNTMuSUhvc3RlZFpvbmUpIHtcbiAgICAvLyBEeW5hbW9EQiBUYWJsZXNcbiAgICBjb25zdCByYWNlc1RhYmxlID0gbmV3IGR5bmFtb2RiLlRhYmxlKHRoaXMsICdSYWNlc1RhYmxlJywge1xuICAgICAgdGFibGVOYW1lOiBgJHtwcm9wcy5lbnZpcm9ubWVudH0taHRjLXJhY2VzYCxcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAnaWQnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgICAgYmlsbGluZ01vZGU6IGR5bmFtb2RiLkJpbGxpbmdNb2RlLlBBWV9QRVJfUkVRVUVTVCxcbiAgICAgIHJlbW92YWxQb2xpY3k6IFJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICB9KTtcblxuICAgIGNvbnN0IHRlYW1zVGFibGUgPSBuZXcgZHluYW1vZGIuVGFibGUodGhpcywgJ1RlYW1zVGFibGUnLCB7XG4gICAgICB0YWJsZU5hbWU6IGAke3Byb3BzLmVudmlyb25tZW50fS1odGMtdGVhbXNgLFxuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICdpZCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgICBiaWxsaW5nTW9kZTogZHluYW1vZGIuQmlsbGluZ01vZGUuUEFZX1BFUl9SRVFVRVNULFxuICAgICAgcmVtb3ZhbFBvbGljeTogUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxuICAgIH0pO1xuXG4gICAgY29uc3QgcnVubmVyc1RhYmxlID0gbmV3IGR5bmFtb2RiLlRhYmxlKHRoaXMsICdSdW5uZXJzVGFibGUnLCB7XG4gICAgICB0YWJsZU5hbWU6IGAke3Byb3BzLmVudmlyb25tZW50fS1odGMtcnVubmVyc2AsXG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ2lkJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcbiAgICAgIGJpbGxpbmdNb2RlOiBkeW5hbW9kYi5CaWxsaW5nTW9kZS5QQVlfUEVSX1JFUVVFU1QsXG4gICAgICByZW1vdmFsUG9saWN5OiBSZW1vdmFsUG9saWN5LkRFU1RST1ksXG4gICAgfSk7XG5cbiAgICBjb25zdCBsZWdzVGFibGUgPSBuZXcgZHluYW1vZGIuVGFibGUodGhpcywgJ0xlZ3NUYWJsZScsIHtcbiAgICAgIHRhYmxlTmFtZTogYCR7cHJvcHMuZW52aXJvbm1lbnR9LWh0Yy1sZWdzYCxcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAnaWQnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgICAgYmlsbGluZ01vZGU6IGR5bmFtb2RiLkJpbGxpbmdNb2RlLlBBWV9QRVJfUkVRVUVTVCxcbiAgICAgIHJlbW92YWxQb2xpY3k6IFJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICB9KTtcblxuICAgIC8vIEFQSSBLZXlcbiAgICBjb25zdCBhcGlLZXkgPSBuZXcgYXBpZ2F0ZXdheS5BcGlLZXkodGhpcywgJ0FwaUtleScsIHtcbiAgICAgIGFwaUtleU5hbWU6IGAke3Byb3BzLmVudmlyb25tZW50fS1odGMtYXBpLWtleWAsXG4gICAgICBkZXNjcmlwdGlvbjogJ0FQSSBLZXkgZm9yIEhvb2QgdG8gQ29hc3QgVGltZSBUcmFja2VyIGZyb250ZW5kJyxcbiAgICB9KTtcblxuICAgIC8vIFN0b3JlIEFQSSBLZXkgSUQgaW4gU1NNIFBhcmFtZXRlciBTdG9yZVxuICAgIG5ldyBzc20uU3RyaW5nUGFyYW1ldGVyKHRoaXMsICdBcGlLZXlQYXJhbWV0ZXInLCB7XG4gICAgICBwYXJhbWV0ZXJOYW1lOiBgLyR7cHJvcHMuZW52aXJvbm1lbnR9L2h0Yy9hcGkta2V5LWlkYCxcbiAgICAgIHN0cmluZ1ZhbHVlOiBhcGlLZXkua2V5SWQsXG4gICAgICBkZXNjcmlwdGlvbjogJ0FQSSBLZXkgSUQgZm9yIEhvb2QgdG8gQ29hc3QgVGltZSBUcmFja2VyJyxcbiAgICB9KTtcblxuICAgIC8vIExhbWJkYSBmdW5jdGlvbiBmb3IgcmFjZXMgZW5kcG9pbnQgd2l0aCBEeW5hbW9EQiBpbnRlZ3JhdGlvblxuICAgIGNvbnN0IHJhY2VzRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdSYWNlc0Z1bmN0aW9uJywge1xuICAgICAgZnVuY3Rpb25OYW1lOiBgJHtwcm9wcy5lbnZpcm9ubWVudH0taHRjLXJhY2VzYCxcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xOF9YLFxuICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLFxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdsYW1iZGEvcmFjZXMnKSxcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcbiAgICAgIG1lbW9yeVNpemU6IDI1NixcbiAgICAgIGxvZ1JldGVudGlvbjogbG9ncy5SZXRlbnRpb25EYXlzLk9ORV9XRUVLLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgRU5WSVJPTk1FTlQ6IHByb3BzLmVudmlyb25tZW50LFxuICAgICAgICBSQUNFU19UQUJMRV9OQU1FOiByYWNlc1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICAvLyBHcmFudCBEeW5hbW9EQiByZWFkL3dyaXRlIHBlcm1pc3Npb25zIHRvIHRoZSBMYW1iZGEgZnVuY3Rpb25cbiAgICByYWNlc1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShyYWNlc0Z1bmN0aW9uKTtcblxuICAgIC8vIEFQSSBHYXRld2F5XG4gICAgY29uc3QgYXBpID0gbmV3IGFwaWdhdGV3YXkuUmVzdEFwaSh0aGlzLCAnSG9vZFRvQ29hc3RBcGknLCB7XG4gICAgICByZXN0QXBpTmFtZTogYCR7cHJvcHMuZW52aXJvbm1lbnR9LWh0Yy1hcGlgLFxuICAgICAgZGVzY3JpcHRpb246ICdIb29kIHRvIENvYXN0IFRpbWUgVHJhY2tlciBBUEknLFxuICAgICAgZGVmYXVsdENvcnNQcmVmbGlnaHRPcHRpb25zOiB7XG4gICAgICAgIGFsbG93T3JpZ2luczogW1xuICAgICAgICAgIC8vIFVzZSBjdXN0b20gZG9tYWluIGlmIGF2YWlsYWJsZSwgb3RoZXJ3aXNlIHVzZSBDbG91ZEZyb250IGRvbWFpblxuICAgICAgICAgIC4uLihwcm9wcy51c2VDdXN0b21Eb21haW4gJiYgcHJvcHMuc3ViZG9tYWluICYmIHByb3BzLmRvbWFpbk5hbWUgXG4gICAgICAgICAgICA/IFtgaHR0cHM6Ly8ke3Byb3BzLnN1YmRvbWFpbn0uJHtwcm9wcy5kb21haW5OYW1lfWBdXG4gICAgICAgICAgICA6IFsnaHR0cHM6Ly9kOHJ0MGRiM2t2emQzLmNsb3VkZnJvbnQubmV0J10pLCAvLyBEZWZhdWx0IENsb3VkRnJvbnQgZG9tYWluXG4gICAgICAgICAgJ2h0dHA6Ly9sb2NhbGhvc3Q6MzAwMCcgLy8gRm9yIGxvY2FsIGRldmVsb3BtZW50XG4gICAgICAgIF0sXG4gICAgICAgIGFsbG93TWV0aG9kczogYXBpZ2F0ZXdheS5Db3JzLkFMTF9NRVRIT0RTLFxuICAgICAgICBhbGxvd0hlYWRlcnM6IFsnQ29udGVudC1UeXBlJywgJ1gtQXBpLUtleSddLFxuICAgICAgICBhbGxvd0NyZWRlbnRpYWxzOiB0cnVlLFxuICAgICAgfSxcbiAgICAgIGRlcGxveU9wdGlvbnM6IHtcbiAgICAgICAgc3RhZ2VOYW1lOiBwcm9wcy5lbnZpcm9ubWVudCxcbiAgICAgICAgbG9nZ2luZ0xldmVsOiBhcGlnYXRld2F5Lk1ldGhvZExvZ2dpbmdMZXZlbC5JTkZPLFxuICAgICAgICBkYXRhVHJhY2VFbmFibGVkOiB0cnVlLFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIC8vIEN1c3RvbSBkb21haW4gZm9yIEFQSSAob25seSBpZiBob3N0ZWRab25lIGlzIGF2YWlsYWJsZSlcbiAgICBpZiAoaG9zdGVkWm9uZSAmJiBwcm9wcy51c2VDdXN0b21Eb21haW4gJiYgcHJvcHMuZG9tYWluTmFtZSkge1xuICAgICAgY29uc3QgYXBpRG9tYWluTmFtZSA9IHByb3BzLmVudmlyb25tZW50ID09PSAnZGV2ZWxvcG1lbnQnIFxuICAgICAgICA/IGBodGNhcGkuZGV2LiR7cHJvcHMuZG9tYWluTmFtZX1gIFxuICAgICAgICA6IGBodGNhcGkuJHtwcm9wcy5kb21haW5OYW1lfWA7XG5cbiAgICAgIGNvbnN0IGFwaUNlcnRpZmljYXRlID0gbmV3IGFjbS5DZXJ0aWZpY2F0ZSh0aGlzLCAnQXBpQ2VydGlmaWNhdGUnLCB7XG4gICAgICAgIGRvbWFpbk5hbWU6IGFwaURvbWFpbk5hbWUsXG4gICAgICAgIHZhbGlkYXRpb246IGFjbS5DZXJ0aWZpY2F0ZVZhbGlkYXRpb24uZnJvbURucyhob3N0ZWRab25lKSxcbiAgICAgIH0pO1xuXG4gICAgICBjb25zdCBhcGlEb21haW4gPSBuZXcgYXBpZ2F0ZXdheS5Eb21haW5OYW1lKHRoaXMsICdBcGlEb21haW4nLCB7XG4gICAgICAgIGRvbWFpbk5hbWU6IGFwaURvbWFpbk5hbWUsXG4gICAgICAgIGNlcnRpZmljYXRlOiBhcGlDZXJ0aWZpY2F0ZSxcbiAgICAgICAgc2VjdXJpdHlQb2xpY3k6IGFwaWdhdGV3YXkuU2VjdXJpdHlQb2xpY3kuVExTXzFfMixcbiAgICAgIH0pO1xuXG4gICAgICAvLyBBc3NvY2lhdGUgdGhlIGRvbWFpbiB3aXRoIHRoZSBBUElcbiAgICAgIG5ldyBhcGlnYXRld2F5LkJhc2VQYXRoTWFwcGluZyh0aGlzLCAnQXBpQmFzZVBhdGhNYXBwaW5nJywge1xuICAgICAgICBkb21haW5OYW1lOiBhcGlEb21haW4sXG4gICAgICAgIHJlc3RBcGk6IGFwaSxcbiAgICAgICAgYmFzZVBhdGg6ICcnLFxuICAgICAgfSk7XG5cbiAgICAgIC8vIFJvdXRlNTMgRE5TIGZvciBBUElcbiAgICAgIG5ldyByb3V0ZTUzLkFSZWNvcmQodGhpcywgJ0FwaUFsaWFzUmVjb3JkJywge1xuICAgICAgICB6b25lOiBob3N0ZWRab25lLFxuICAgICAgICByZWNvcmROYW1lOiBwcm9wcy5lbnZpcm9ubWVudCA9PT0gJ2RldmVsb3BtZW50JyA/ICdodGNhcGkuZGV2JyA6ICdodGNhcGknLFxuICAgICAgICB0YXJnZXQ6IHJvdXRlNTMuUmVjb3JkVGFyZ2V0LmZyb21BbGlhcyhcbiAgICAgICAgICBuZXcgdGFyZ2V0cy5BcGlHYXRld2F5RG9tYWluKGFwaURvbWFpbilcbiAgICAgICAgKSxcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIEFQSSBHYXRld2F5IHVzYWdlIHBsYW5cbiAgICBjb25zdCB1c2FnZVBsYW4gPSBuZXcgYXBpZ2F0ZXdheS5Vc2FnZVBsYW4odGhpcywgJ1VzYWdlUGxhbicsIHtcbiAgICAgIG5hbWU6IGAke3Byb3BzLmVudmlyb25tZW50fS1odGMtdXNhZ2UtcGxhbmAsXG4gICAgICBkZXNjcmlwdGlvbjogJ1VzYWdlIHBsYW4gZm9yIEhvb2QgdG8gQ29hc3QgVGltZSBUcmFja2VyIEFQSScsXG4gICAgICB0aHJvdHRsZToge1xuICAgICAgICByYXRlTGltaXQ6IDEwMCxcbiAgICAgICAgYnVyc3RMaW1pdDogMjAwLFxuICAgICAgfSxcbiAgICAgIHF1b3RhOiB7XG4gICAgICAgIGxpbWl0OiAxMDAwMCxcbiAgICAgICAgcGVyaW9kOiBhcGlnYXRld2F5LlBlcmlvZC5NT05USCxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICB1c2FnZVBsYW4uYWRkQXBpS2V5KGFwaUtleSk7XG4gICAgXG4gICAgLy8gQXNzb2NpYXRlIHVzYWdlIHBsYW4gd2l0aCBBUEkgc3RhZ2VcbiAgICB1c2FnZVBsYW4uYWRkQXBpU3RhZ2Uoe1xuICAgICAgc3RhZ2U6IGFwaS5kZXBsb3ltZW50U3RhZ2UsXG4gICAgfSk7XG5cbiAgICAvLyBGb3JjZSBBUEkgR2F0ZXdheSBkZXBsb3ltZW50IHRvIGVuc3VyZSBhbGwgY2hhbmdlcyBhcmUgYXBwbGllZFxuICAgIG5ldyBhcGlnYXRld2F5LkRlcGxveW1lbnQodGhpcywgJ0FwaURlcGxveW1lbnQnLCB7XG4gICAgICBhcGksXG4gICAgICBkZXNjcmlwdGlvbjogJ0RlcGxveW1lbnQgZm9yIExhbWJkYSBpbnRlZ3JhdGlvbiBjaGFuZ2VzJyxcbiAgICAgIHJldGFpbkRlcGxveW1lbnRzOiBmYWxzZSxcbiAgICB9KTtcblxuICAgIC8vIEZVTEwgQ1JVRCBFTkRQT0lOVFMgZm9yIHJhY2VzXG4gICAgY29uc3QgcmFjZXNSZXNvdXJjZSA9IGFwaS5yb290LmFkZFJlc291cmNlKCdyYWNlcycpO1xuICAgIFxuICAgIC8vIEdFVCAvcmFjZXMgLSBMaXN0IGFsbCByYWNlc1xuICAgIHJhY2VzUmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihyYWNlc0Z1bmN0aW9uKSwge1xuICAgICAgYXBpS2V5UmVxdWlyZWQ6IHRydWUsXG4gICAgfSk7XG5cbiAgICAvLyBQT1NUIC9yYWNlcyAtIENyZWF0ZSBuZXcgcmFjZVxuICAgIHJhY2VzUmVzb3VyY2UuYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24ocmFjZXNGdW5jdGlvbiksIHtcbiAgICAgIGFwaUtleVJlcXVpcmVkOiB0cnVlLFxuICAgIH0pO1xuXG4gICAgLy8gSW5kaXZpZHVhbCByYWNlIHJlc291cmNlIGZvciBQVVQvREVMRVRFIG9wZXJhdGlvbnNcbiAgICBjb25zdCByYWNlUmVzb3VyY2UgPSByYWNlc1Jlc291cmNlLmFkZFJlc291cmNlKCd7aWR9Jyk7XG4gICAgXG4gICAgLy8gUFVUIC9yYWNlcy97aWR9IC0gVXBkYXRlIHJhY2VcbiAgICByYWNlUmVzb3VyY2UuYWRkTWV0aG9kKCdQVVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihyYWNlc0Z1bmN0aW9uKSwge1xuICAgICAgYXBpS2V5UmVxdWlyZWQ6IHRydWUsXG4gICAgfSk7XG5cbiAgICAvLyBERUxFVEUgL3JhY2VzL3tpZH0gLSBEZWxldGUgcmFjZVxuICAgIHJhY2VSZXNvdXJjZS5hZGRNZXRob2QoJ0RFTEVURScsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHJhY2VzRnVuY3Rpb24pLCB7XG4gICAgICBhcGlLZXlSZXF1aXJlZDogdHJ1ZSxcbiAgICB9KTtcblxuICAgIC8vIEFkZCBvdXRwdXRzXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0FwaVVybCcsIHtcbiAgICAgIHZhbHVlOiBob3N0ZWRab25lICYmIHByb3BzLnVzZUN1c3RvbURvbWFpbiAmJiBwcm9wcy5kb21haW5OYW1lXG4gICAgICAgID8gYGh0dHBzOi8vJHtwcm9wcy5lbnZpcm9ubWVudCA9PT0gJ2RldmVsb3BtZW50JyA/ICdodGNhcGkuZGV2LicgOiAnaHRjYXBpLid9JHtwcm9wcy5kb21haW5OYW1lfWBcbiAgICAgICAgOiBgaHR0cHM6Ly8ke2FwaS5yZXN0QXBpSWR9LmV4ZWN1dGUtYXBpLiR7cHJvcHMucmVnaW9ufS5hbWF6b25hd3MuY29tLyR7cHJvcHMuZW52aXJvbm1lbnR9L2AsXG4gICAgICBkZXNjcmlwdGlvbjogJ0FQSSBHYXRld2F5IFVSTCcsXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQXBpS2V5SWQnLCB7XG4gICAgICB2YWx1ZTogYXBpS2V5LmtleUlkLFxuICAgICAgZGVzY3JpcHRpb246ICdBUEkgS2V5IElEJyxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdEeW5hbW9EQlRhYmxlcycsIHtcbiAgICAgIHZhbHVlOiBgUmFjZXM6ICR7cmFjZXNUYWJsZS50YWJsZU5hbWV9LCBUZWFtczogJHt0ZWFtc1RhYmxlLnRhYmxlTmFtZX0sIFJ1bm5lcnM6ICR7cnVubmVyc1RhYmxlLnRhYmxlTmFtZX0sIExlZ3M6ICR7bGVnc1RhYmxlLnRhYmxlTmFtZX1gLFxuICAgICAgZGVzY3JpcHRpb246ICdEeW5hbW9EQiBUYWJsZSBOYW1lcycsXG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIGdlbmVyYXRlRW52aXJvbm1lbnRGaWxlKFxuICAgIHByb3BzOiBIb29kVG9Db2FzdFN0YWNrUHJvcHMsIFxuICAgIGRpc3RyaWJ1dGlvbkRvbWFpbjogc3RyaW5nXG4gICkge1xuICAgIGNvbnN0IGVudkNvbnRlbnQgPSBgIyBFbnZpcm9ubWVudCBjb25maWd1cmF0aW9uIGZvciBIb29kIHRvIENvYXN0IFRpbWUgVHJhY2tlclxuIyBHZW5lcmF0ZWQgYnkgQ0RLIGRlcGxveW1lbnQgLSBETyBOT1QgRURJVCBNQU5VQUxMWVxuXG4jIE1vY2sgTW9kZSBDb25maWd1cmF0aW9uXG5WSVRFX01PQ0tfTU9ERT0ke3Byb3BzLm1vY2tNb2RlfVxuXG4jIEFXUyBDb25maWd1cmF0aW9uXG5WSVRFX0FXU19SRUdJT049JHtwcm9wcy5yZWdpb259XG5WSVRFX0VOVklST05NRU5UPSR7cHJvcHMuZW52aXJvbm1lbnR9XG5cbiMgRG9tYWluIENvbmZpZ3VyYXRpb25cblZJVEVfVVNFX0NVU1RPTV9ET01BSU49JHtwcm9wcy51c2VDdXN0b21Eb21haW59XG4ke3Byb3BzLmRvbWFpbk5hbWUgPyBgVklURV9ET01BSU5fTkFNRT0ke3Byb3BzLmRvbWFpbk5hbWV9YCA6ICcnfVxuJHtwcm9wcy5zdWJkb21haW4gPyBgVklURV9TVUJET01BSU49JHtwcm9wcy5zdWJkb21haW59YCA6ICcnfVxuXG4jIFdlYnNpdGUgVVJMXG5WSVRFX1dFQlNJVEVfVVJMPWh0dHBzOi8vJHtkaXN0cmlidXRpb25Eb21haW59XG5cbiMgTW9jayBNb2RlIE5vdGVcbiR7cHJvcHMubW9ja01vZGUgPyAnIyBSdW5uaW5nIGluIE1PQ0sgTU9ERSAtIGFsbCBkYXRhIGlzIGxvY2FsIG1vY2sgZGF0YScgOiAnIyBSdW5uaW5nIGluIFBST0RVQ1RJT04gTU9ERSAtIHJlcXVpcmVzIEFQSSBlbmRwb2ludHMnfVxuXG4jIEFQSSBDb25maWd1cmF0aW9uICh3aGVuIG5vdCBpbiBtb2NrIG1vZGUpXG4keyFwcm9wcy5tb2NrTW9kZSA/IGBWSVRFX0FQSV9VUkw9aHR0cHM6Ly9odGNhcGkke3Byb3BzLmVudmlyb25tZW50ID09PSAnZGV2ZWxvcG1lbnQnID8gJy5kZXYnIDogJyd9LiR7cHJvcHMuZG9tYWluTmFtZX1gIDogJyd9XG4keyFwcm9wcy5tb2NrTW9kZSA/ICdWSVRFX0FQSV9LRVlfUkVRVUlSRUQ9dHJ1ZScgOiAnJ31cbmA7XG5cbiAgICAvLyBPdXRwdXQgdGhlIGVudmlyb25tZW50IGZpbGUgY29udGVudCBmb3IgbWFudWFsIGRlcGxveW1lbnRcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnRW52aXJvbm1lbnRGaWxlQ29udGVudCcsIHtcbiAgICAgIHZhbHVlOiBlbnZDb250ZW50LFxuICAgICAgZGVzY3JpcHRpb246ICdFbnZpcm9ubWVudCBmaWxlIGNvbnRlbnQgdG8gY29weSB0byB3ZWItYXBwLy5lbnYucHJvZHVjdGlvbicsXG4gICAgfSk7XG4gIH1cbn1cbiJdfQ==