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
        // Lambda function for races endpoint (static data for now)
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
            },
        });
        // API Gateway
        const api = new apigateway.RestApi(this, 'HoodToCoastApi', {
            restApiName: `${props.environment}-htc-api`,
            description: 'Hood to Coast Time Tracker API',
            defaultCorsPreflightOptions: {
                allowOrigins: [
                    `https://${props.subdomain}.${props.domainName}`,
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
        // Custom domain for API
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
        // SIMPLE STATIC ENDPOINTS (with Lambda integration for GET /races)
        const racesResource = api.root.addResource('races');
        // GET endpoint now uses Lambda integration (returns static data)
        racesResource.addMethod('GET', new apigateway.LambdaIntegration(racesFunction), {
            apiKeyRequired: true,
        });
        // Simple POST endpoint that returns success
        racesResource.addMethod('POST', new apigateway.MockIntegration({
            requestTemplates: {
                'application/json': '{"statusCode": 201}'
            },
            integrationResponses: [{
                    statusCode: '201',
                    responseTemplates: {
                        'application/json': JSON.stringify({
                            message: 'Race created successfully (mock response)',
                            id: 'race_' + Date.now()
                        })
                    },
                    responseParameters: {
                        'method.response.header.Access-Control-Allow-Origin': "'*'",
                        'method.response.header.Access-Control-Allow-Headers': "'Content-Type,X-Api-Key'",
                        'method.response.header.Access-Control-Allow-Methods': "'GET,POST,PUT,DELETE,OPTIONS'"
                    }
                }],
            passthroughBehavior: apigateway.PassthroughBehavior.NEVER,
            contentHandling: apigateway.ContentHandling.CONVERT_TO_TEXT,
        }), {
            apiKeyRequired: true,
            methodResponses: [{
                    statusCode: '201',
                    responseParameters: {
                        'method.response.header.Access-Control-Allow-Origin': true,
                        'method.response.header.Access-Control-Allow-Headers': true,
                        'method.response.header.Access-Control-Allow-Methods': true
                    }
                }]
        });
        // Add outputs
        new cdk.CfnOutput(this, 'ApiUrl', {
            value: `https://${apiDomainName}`,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaG9vZC10by1jb2FzdC1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImhvb2QtdG8tY29hc3Qtc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbUNBQW1DO0FBRW5DLHlDQUF5QztBQUN6Qyx5REFBeUQ7QUFDekQsOERBQThEO0FBQzlELG1EQUFtRDtBQUNuRCwyREFBMkQ7QUFDM0QsMERBQTBEO0FBQzFELDJDQUEyQztBQUMzQyx5REFBeUQ7QUFDekQsaURBQWlEO0FBQ2pELHFEQUFxRDtBQUNyRCw2Q0FBNkM7QUFDN0MsMkNBQTJDO0FBQzNDLDZDQUE0QztBQVk1QyxNQUFhLGdCQUFpQixTQUFRLEdBQUcsQ0FBQyxLQUFLO0lBQzdDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBNEI7UUFDcEUsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFeEIsTUFBTSxjQUFjLEdBQUcsS0FBSyxDQUFDLGVBQWUsSUFBSSxLQUFLLENBQUMsVUFBVSxJQUFJLEtBQUssQ0FBQyxTQUFTO1lBQ2pGLENBQUMsQ0FBQyxHQUFHLEtBQUssQ0FBQyxTQUFTLElBQUksS0FBSyxDQUFDLFVBQVUsRUFBRTtZQUMxQyxDQUFDLENBQUMsU0FBUyxDQUFDO1FBRWQscUNBQXFDO1FBQ3JDLE1BQU0sYUFBYSxHQUFHLElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsZUFBZSxFQUFFO1lBQ3pELFVBQVUsRUFBRSxHQUFHLEtBQUssQ0FBQyxXQUFXLDBCQUEwQixJQUFJLENBQUMsT0FBTyxFQUFFO1lBQ3hFLGdCQUFnQixFQUFFLEtBQUs7WUFDdkIsaUJBQWlCLEVBQUUsRUFBRSxDQUFDLGlCQUFpQixDQUFDLFNBQVM7WUFDakQsYUFBYSxFQUFFLEdBQUcsQ0FBQyxhQUFhLENBQUMsTUFBTTtZQUN2QyxTQUFTLEVBQUUsSUFBSTtTQUNoQixDQUFDLENBQUM7UUFFSCxrREFBa0Q7UUFDbEQsTUFBTSxZQUFZLEdBQUcsSUFBSSxFQUFFLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxxQkFBcUIsRUFBRTtZQUNwRSxNQUFNLEVBQUUsYUFBYTtTQUN0QixDQUFDLENBQUM7UUFFSCx3Q0FBd0M7UUFDeEMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQ2pDLElBQUksR0FBRyxDQUFDLGVBQWUsQ0FBQztZQUN0QixHQUFHLEVBQUUsdUJBQXVCO1lBQzVCLE1BQU0sRUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUs7WUFDeEIsVUFBVSxFQUFFLENBQUMsSUFBSSxHQUFHLENBQUMsZ0JBQWdCLENBQUMsMEJBQTBCLENBQUMsQ0FBQztZQUNsRSxPQUFPLEVBQUUsQ0FBQyxjQUFjLENBQUM7WUFDekIsU0FBUyxFQUFFLENBQUMsYUFBYSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUM3QyxVQUFVLEVBQUU7Z0JBQ1YsWUFBWSxFQUFFO29CQUNaLGVBQWUsRUFBRSx1QkFBdUIsSUFBSSxDQUFDLE9BQU8saUJBQWlCO2lCQUN0RTthQUNGO1NBQ0YsQ0FBQyxDQUNILENBQUM7UUFFRiwwQkFBMEI7UUFDMUIsSUFBSSxZQUFxQyxDQUFDO1FBQzFDLElBQUksVUFBMkMsQ0FBQztRQUVoRCxJQUFJLEtBQUssQ0FBQyxlQUFlLElBQUksY0FBYyxFQUFFO1lBQzNDLGdEQUFnRDtZQUNoRCxVQUFVLEdBQUcsT0FBTyxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLFlBQVksRUFBRTtnQkFDN0QsVUFBVSxFQUFFLEtBQUssQ0FBQyxVQUFXO2FBQzlCLENBQUMsQ0FBQztZQUVILE1BQU0sV0FBVyxHQUFHLElBQUksR0FBRyxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsYUFBYSxFQUFFO2dCQUMzRCxVQUFVLEVBQUUsY0FBYztnQkFDMUIsVUFBVSxFQUFFLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDO2FBQzFELENBQUMsQ0FBQztZQUVILFlBQVksR0FBRyxJQUFJLFVBQVUsQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLGNBQWMsRUFBRTtnQkFDL0QsZUFBZSxFQUFFO29CQUNmLE1BQU0sRUFBRSxJQUFJLE9BQU8sQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDO29CQUMzQyxvQkFBb0IsRUFBRSxVQUFVLENBQUMsb0JBQW9CLENBQUMsaUJBQWlCO29CQUN2RSxjQUFjLEVBQUUsVUFBVSxDQUFDLGNBQWMsQ0FBQyxzQkFBc0I7b0JBQ2hFLGFBQWEsRUFBRSxVQUFVLENBQUMsYUFBYSxDQUFDLHNCQUFzQjtvQkFDOUQsV0FBVyxFQUFFLFVBQVUsQ0FBQyxXQUFXLENBQUMsaUJBQWlCO29CQUNyRCxtQkFBbUIsRUFBRSxVQUFVLENBQUMsbUJBQW1CLENBQUMsNkJBQTZCO2lCQUNsRjtnQkFDRCxXQUFXLEVBQUUsQ0FBQyxjQUFjLENBQUM7Z0JBQzdCLFdBQVc7Z0JBQ1gsY0FBYyxFQUFFO29CQUNkO3dCQUNFLFVBQVUsRUFBRSxHQUFHO3dCQUNmLGtCQUFrQixFQUFFLEdBQUc7d0JBQ3ZCLGdCQUFnQixFQUFFLGFBQWE7cUJBQ2hDO29CQUNEO3dCQUNFLFVBQVUsRUFBRSxHQUFHO3dCQUNmLGtCQUFrQixFQUFFLEdBQUc7d0JBQ3ZCLGdCQUFnQixFQUFFLGFBQWE7cUJBQ2hDO2lCQUNGO2FBQ0YsQ0FBQyxDQUFDO1lBRUgsMkJBQTJCO1lBQzNCLElBQUksT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsYUFBYSxFQUFFO2dCQUN2QyxJQUFJLEVBQUUsVUFBVTtnQkFDaEIsVUFBVSxFQUFFLEtBQUssQ0FBQyxTQUFVO2dCQUM1QixNQUFNLEVBQUUsT0FBTyxDQUFDLFlBQVksQ0FBQyxTQUFTLENBQ3BDLElBQUksT0FBTyxDQUFDLGdCQUFnQixDQUFDLFlBQVksQ0FBQyxDQUMzQzthQUNGLENBQUMsQ0FBQztZQUVILDJEQUEyRDtZQUMzRCxJQUFJLFVBQVUsRUFBRTtnQkFDZCxJQUFJLENBQUMsMkJBQTJCLENBQUMsS0FBSyxFQUFFLFVBQVUsQ0FBQyxDQUFDO2FBQ3JEO1NBQ0Y7YUFBTTtZQUNMLGdEQUFnRDtZQUNoRCxZQUFZLEdBQUcsSUFBSSxVQUFVLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxjQUFjLEVBQUU7Z0JBQy9ELGVBQWUsRUFBRTtvQkFDZixNQUFNLEVBQUUsSUFBSSxPQUFPLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQztvQkFDM0Msb0JBQW9CLEVBQUUsVUFBVSxDQUFDLG9CQUFvQixDQUFDLGlCQUFpQjtvQkFDdkUsY0FBYyxFQUFFLFVBQVUsQ0FBQyxjQUFjLENBQUMsc0JBQXNCO29CQUNoRSxhQUFhLEVBQUUsVUFBVSxDQUFDLGFBQWEsQ0FBQyxzQkFBc0I7b0JBQzlELFdBQVcsRUFBRSxVQUFVLENBQUMsV0FBVyxDQUFDLGlCQUFpQjtvQkFDckQsbUJBQW1CLEVBQUUsVUFBVSxDQUFDLG1CQUFtQixDQUFDLDZCQUE2QjtpQkFDbEY7Z0JBQ0QsY0FBYyxFQUFFO29CQUNkO3dCQUNFLFVBQVUsRUFBRSxHQUFHO3dCQUNmLGtCQUFrQixFQUFFLEdBQUc7d0JBQ3ZCLGdCQUFnQixFQUFFLGFBQWE7cUJBQ2hDO29CQUNEO3dCQUNFLFVBQVUsRUFBRSxHQUFHO3dCQUNmLGtCQUFrQixFQUFFLEdBQUc7d0JBQ3ZCLGdCQUFnQixFQUFFLGFBQWE7cUJBQ2hDO2lCQUNGO2FBQ0YsQ0FBQyxDQUFDO1NBQ0o7UUFFRCxxREFBcUQ7UUFDckQsSUFBSSxLQUFLLENBQUMsZUFBZSxFQUFFO1lBQ3pCLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxLQUFLLEVBQUUsWUFBWSxDQUFDLHNCQUFzQixDQUFDLENBQUM7U0FDMUU7UUFFRCxVQUFVO1FBQ1YsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxZQUFZLEVBQUU7WUFDcEMsS0FBSyxFQUFFLEtBQUssQ0FBQyxlQUFlLElBQUksY0FBYztnQkFDNUMsQ0FBQyxDQUFDLFdBQVcsY0FBYyxFQUFFO2dCQUM3QixDQUFDLENBQUMsV0FBVyxZQUFZLENBQUMsc0JBQXNCLEVBQUU7WUFDcEQsV0FBVyxFQUFFLGFBQWE7U0FDM0IsQ0FBQyxDQUFDO1FBRUgsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxnQkFBZ0IsRUFBRTtZQUN4QyxLQUFLLEVBQUUsWUFBWSxDQUFDLGNBQWM7WUFDbEMsV0FBVyxFQUFFLDRCQUE0QjtTQUMxQyxDQUFDLENBQUM7UUFFSCxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLGNBQWMsRUFBRTtZQUN0QyxLQUFLLEVBQUUsYUFBYSxDQUFDLFVBQVU7WUFDL0IsV0FBVyxFQUFFLDRCQUE0QjtTQUMxQyxDQUFDLENBQUM7UUFFSCw2QkFBNkI7UUFDN0IsSUFBSSxLQUFLLENBQUMsUUFBUSxFQUFFO1lBQ2xCLElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsY0FBYyxFQUFFO2dCQUN0QyxLQUFLLEVBQUUsbUVBQW1FO2dCQUMxRSxXQUFXLEVBQUUsdUJBQXVCO2FBQ3JDLENBQUMsQ0FBQztTQUNKO0lBQ0gsQ0FBQztJQUVPLDJCQUEyQixDQUFDLEtBQTRCLEVBQUUsVUFBK0I7UUFDL0Ysa0JBQWtCO1FBQ2xCLE1BQU0sVUFBVSxHQUFHLElBQUksUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsWUFBWSxFQUFFO1lBQ3hELFNBQVMsRUFBRSxHQUFHLEtBQUssQ0FBQyxXQUFXLFlBQVk7WUFDM0MsWUFBWSxFQUFFLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsUUFBUSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUU7WUFDakUsV0FBVyxFQUFFLFFBQVEsQ0FBQyxXQUFXLENBQUMsZUFBZTtZQUNqRCxhQUFhLEVBQUUsMkJBQWEsQ0FBQyxPQUFPO1NBQ3JDLENBQUMsQ0FBQztRQUVILE1BQU0sVUFBVSxHQUFHLElBQUksUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsWUFBWSxFQUFFO1lBQ3hELFNBQVMsRUFBRSxHQUFHLEtBQUssQ0FBQyxXQUFXLFlBQVk7WUFDM0MsWUFBWSxFQUFFLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsUUFBUSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUU7WUFDakUsV0FBVyxFQUFFLFFBQVEsQ0FBQyxXQUFXLENBQUMsZUFBZTtZQUNqRCxhQUFhLEVBQUUsMkJBQWEsQ0FBQyxPQUFPO1NBQ3JDLENBQUMsQ0FBQztRQUVILE1BQU0sWUFBWSxHQUFHLElBQUksUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsY0FBYyxFQUFFO1lBQzVELFNBQVMsRUFBRSxHQUFHLEtBQUssQ0FBQyxXQUFXLGNBQWM7WUFDN0MsWUFBWSxFQUFFLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsUUFBUSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUU7WUFDakUsV0FBVyxFQUFFLFFBQVEsQ0FBQyxXQUFXLENBQUMsZUFBZTtZQUNqRCxhQUFhLEVBQUUsMkJBQWEsQ0FBQyxPQUFPO1NBQ3JDLENBQUMsQ0FBQztRQUVILE1BQU0sU0FBUyxHQUFHLElBQUksUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsV0FBVyxFQUFFO1lBQ3RELFNBQVMsRUFBRSxHQUFHLEtBQUssQ0FBQyxXQUFXLFdBQVc7WUFDMUMsWUFBWSxFQUFFLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsUUFBUSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUU7WUFDakUsV0FBVyxFQUFFLFFBQVEsQ0FBQyxXQUFXLENBQUMsZUFBZTtZQUNqRCxhQUFhLEVBQUUsMkJBQWEsQ0FBQyxPQUFPO1NBQ3JDLENBQUMsQ0FBQztRQUVILFVBQVU7UUFDVixNQUFNLE1BQU0sR0FBRyxJQUFJLFVBQVUsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLFFBQVEsRUFBRTtZQUNuRCxVQUFVLEVBQUUsR0FBRyxLQUFLLENBQUMsV0FBVyxjQUFjO1lBQzlDLFdBQVcsRUFBRSxpREFBaUQ7U0FDL0QsQ0FBQyxDQUFDO1FBRUgsMENBQTBDO1FBQzFDLElBQUksR0FBRyxDQUFDLGVBQWUsQ0FBQyxJQUFJLEVBQUUsaUJBQWlCLEVBQUU7WUFDL0MsYUFBYSxFQUFFLElBQUksS0FBSyxDQUFDLFdBQVcsaUJBQWlCO1lBQ3JELFdBQVcsRUFBRSxNQUFNLENBQUMsS0FBSztZQUN6QixXQUFXLEVBQUUsMkNBQTJDO1NBQ3pELENBQUMsQ0FBQztRQUVILDJEQUEyRDtRQUMzRCxNQUFNLGFBQWEsR0FBRyxJQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLGVBQWUsRUFBRTtZQUMvRCxZQUFZLEVBQUUsR0FBRyxLQUFLLENBQUMsV0FBVyxZQUFZO1lBQzlDLE9BQU8sRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLFdBQVc7WUFDbkMsT0FBTyxFQUFFLGVBQWU7WUFDeEIsSUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQztZQUMzQyxPQUFPLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ2pDLFVBQVUsRUFBRSxHQUFHO1lBQ2YsWUFBWSxFQUFFLElBQUksQ0FBQyxhQUFhLENBQUMsUUFBUTtZQUN6QyxXQUFXLEVBQUU7Z0JBQ1gsV0FBVyxFQUFFLEtBQUssQ0FBQyxXQUFXO2FBQy9CO1NBQ0YsQ0FBQyxDQUFDO1FBRUgsY0FBYztRQUNkLE1BQU0sR0FBRyxHQUFHLElBQUksVUFBVSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsZ0JBQWdCLEVBQUU7WUFDekQsV0FBVyxFQUFFLEdBQUcsS0FBSyxDQUFDLFdBQVcsVUFBVTtZQUMzQyxXQUFXLEVBQUUsZ0NBQWdDO1lBQzdDLDJCQUEyQixFQUFFO2dCQUMzQixZQUFZLEVBQUU7b0JBQ1osV0FBVyxLQUFLLENBQUMsU0FBUyxJQUFJLEtBQUssQ0FBQyxVQUFVLEVBQUU7b0JBQ2hELHVCQUF1QixDQUFDLHdCQUF3QjtpQkFDakQ7Z0JBQ0QsWUFBWSxFQUFFLFVBQVUsQ0FBQyxJQUFJLENBQUMsV0FBVztnQkFDekMsWUFBWSxFQUFFLENBQUMsY0FBYyxFQUFFLFdBQVcsQ0FBQztnQkFDM0MsZ0JBQWdCLEVBQUUsSUFBSTthQUN2QjtZQUNELGFBQWEsRUFBRTtnQkFDYixTQUFTLEVBQUUsS0FBSyxDQUFDLFdBQVc7Z0JBQzVCLFlBQVksRUFBRSxVQUFVLENBQUMsa0JBQWtCLENBQUMsSUFBSTtnQkFDaEQsZ0JBQWdCLEVBQUUsSUFBSTthQUN2QjtTQUNGLENBQUMsQ0FBQztRQUVILHdCQUF3QjtRQUN4QixNQUFNLGFBQWEsR0FBRyxLQUFLLENBQUMsV0FBVyxLQUFLLGFBQWE7WUFDdkQsQ0FBQyxDQUFDLGNBQWMsS0FBSyxDQUFDLFVBQVUsRUFBRTtZQUNsQyxDQUFDLENBQUMsVUFBVSxLQUFLLENBQUMsVUFBVSxFQUFFLENBQUM7UUFFakMsTUFBTSxjQUFjLEdBQUcsSUFBSSxHQUFHLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxnQkFBZ0IsRUFBRTtZQUNqRSxVQUFVLEVBQUUsYUFBYTtZQUN6QixVQUFVLEVBQUUsR0FBRyxDQUFDLHFCQUFxQixDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUM7U0FDMUQsQ0FBQyxDQUFDO1FBRUgsTUFBTSxTQUFTLEdBQUcsSUFBSSxVQUFVLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxXQUFXLEVBQUU7WUFDN0QsVUFBVSxFQUFFLGFBQWE7WUFDekIsV0FBVyxFQUFFLGNBQWM7WUFDM0IsY0FBYyxFQUFFLFVBQVUsQ0FBQyxjQUFjLENBQUMsT0FBTztTQUNsRCxDQUFDLENBQUM7UUFFSCxvQ0FBb0M7UUFDcEMsSUFBSSxVQUFVLENBQUMsZUFBZSxDQUFDLElBQUksRUFBRSxvQkFBb0IsRUFBRTtZQUN6RCxVQUFVLEVBQUUsU0FBUztZQUNyQixPQUFPLEVBQUUsR0FBRztZQUNaLFFBQVEsRUFBRSxFQUFFO1NBQ2IsQ0FBQyxDQUFDO1FBRUgsc0JBQXNCO1FBQ3RCLElBQUksT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsZ0JBQWdCLEVBQUU7WUFDMUMsSUFBSSxFQUFFLFVBQVU7WUFDaEIsVUFBVSxFQUFFLEtBQUssQ0FBQyxXQUFXLEtBQUssYUFBYSxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLFFBQVE7WUFDekUsTUFBTSxFQUFFLE9BQU8sQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUNwQyxJQUFJLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsQ0FDeEM7U0FDRixDQUFDLENBQUM7UUFFSCx5QkFBeUI7UUFDekIsTUFBTSxTQUFTLEdBQUcsSUFBSSxVQUFVLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxXQUFXLEVBQUU7WUFDNUQsSUFBSSxFQUFFLEdBQUcsS0FBSyxDQUFDLFdBQVcsaUJBQWlCO1lBQzNDLFdBQVcsRUFBRSwrQ0FBK0M7WUFDNUQsUUFBUSxFQUFFO2dCQUNSLFNBQVMsRUFBRSxHQUFHO2dCQUNkLFVBQVUsRUFBRSxHQUFHO2FBQ2hCO1lBQ0QsS0FBSyxFQUFFO2dCQUNMLEtBQUssRUFBRSxLQUFLO2dCQUNaLE1BQU0sRUFBRSxVQUFVLENBQUMsTUFBTSxDQUFDLEtBQUs7YUFDaEM7U0FDRixDQUFDLENBQUM7UUFFSCxTQUFTLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBRTVCLHNDQUFzQztRQUN0QyxTQUFTLENBQUMsV0FBVyxDQUFDO1lBQ3BCLEtBQUssRUFBRSxHQUFHLENBQUMsZUFBZTtTQUMzQixDQUFDLENBQUM7UUFFSCxtRUFBbUU7UUFDbkUsTUFBTSxhQUFhLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUM7UUFFcEQsaUVBQWlFO1FBQ2pFLGFBQWEsQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLElBQUksVUFBVSxDQUFDLGlCQUFpQixDQUFDLGFBQWEsQ0FBQyxFQUFFO1lBQzlFLGNBQWMsRUFBRSxJQUFJO1NBQ3JCLENBQUMsQ0FBQztRQUVILDRDQUE0QztRQUM1QyxhQUFhLENBQUMsU0FBUyxDQUFDLE1BQU0sRUFBRSxJQUFJLFVBQVUsQ0FBQyxlQUFlLENBQUM7WUFDN0QsZ0JBQWdCLEVBQUU7Z0JBQ2hCLGtCQUFrQixFQUFFLHFCQUFxQjthQUMxQztZQUNELG9CQUFvQixFQUFFLENBQUM7b0JBQ3JCLFVBQVUsRUFBRSxLQUFLO29CQUNqQixpQkFBaUIsRUFBRTt3QkFDakIsa0JBQWtCLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQzs0QkFDakMsT0FBTyxFQUFFLDJDQUEyQzs0QkFDcEQsRUFBRSxFQUFFLE9BQU8sR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFO3lCQUN6QixDQUFDO3FCQUNIO29CQUNELGtCQUFrQixFQUFFO3dCQUNsQixvREFBb0QsRUFBRSxLQUFLO3dCQUMzRCxxREFBcUQsRUFBRSwwQkFBMEI7d0JBQ2pGLHFEQUFxRCxFQUFFLCtCQUErQjtxQkFDdkY7aUJBQ0YsQ0FBQztZQUNGLG1CQUFtQixFQUFFLFVBQVUsQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLO1lBQ3pELGVBQWUsRUFBRSxVQUFVLENBQUMsZUFBZSxDQUFDLGVBQWU7U0FDNUQsQ0FBQyxFQUFFO1lBQ0YsY0FBYyxFQUFFLElBQUk7WUFDcEIsZUFBZSxFQUFFLENBQUM7b0JBQ2hCLFVBQVUsRUFBRSxLQUFLO29CQUNqQixrQkFBa0IsRUFBRTt3QkFDbEIsb0RBQW9ELEVBQUUsSUFBSTt3QkFDMUQscURBQXFELEVBQUUsSUFBSTt3QkFDM0QscURBQXFELEVBQUUsSUFBSTtxQkFDNUQ7aUJBQ0YsQ0FBQztTQUNILENBQUMsQ0FBQztRQUVILGNBQWM7UUFDZCxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLFFBQVEsRUFBRTtZQUNoQyxLQUFLLEVBQUUsV0FBVyxhQUFhLEVBQUU7WUFDakMsV0FBVyxFQUFFLGlCQUFpQjtTQUMvQixDQUFDLENBQUM7UUFFSCxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLFVBQVUsRUFBRTtZQUNsQyxLQUFLLEVBQUUsTUFBTSxDQUFDLEtBQUs7WUFDbkIsV0FBVyxFQUFFLFlBQVk7U0FDMUIsQ0FBQyxDQUFDO1FBRUgsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxnQkFBZ0IsRUFBRTtZQUN4QyxLQUFLLEVBQUUsVUFBVSxVQUFVLENBQUMsU0FBUyxZQUFZLFVBQVUsQ0FBQyxTQUFTLGNBQWMsWUFBWSxDQUFDLFNBQVMsV0FBVyxTQUFTLENBQUMsU0FBUyxFQUFFO1lBQ3pJLFdBQVcsRUFBRSxzQkFBc0I7U0FDcEMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVPLHVCQUF1QixDQUM3QixLQUE0QixFQUM1QixrQkFBMEI7UUFFMUIsTUFBTSxVQUFVLEdBQUc7Ozs7aUJBSU4sS0FBSyxDQUFDLFFBQVE7OztrQkFHYixLQUFLLENBQUMsTUFBTTttQkFDWCxLQUFLLENBQUMsV0FBVzs7O3lCQUdYLEtBQUssQ0FBQyxlQUFlO0VBQzVDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLG9CQUFvQixLQUFLLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUU7RUFDOUQsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsa0JBQWtCLEtBQUssQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRTs7OzJCQUdqQyxrQkFBa0I7OztFQUczQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxzREFBc0QsQ0FBQyxDQUFDLENBQUMsdURBQXVEOzs7RUFHakksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyw4QkFBOEIsS0FBSyxDQUFDLFdBQVcsS0FBSyxhQUFhLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEtBQUssQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRTtFQUM1SCxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLDRCQUE0QixDQUFDLENBQUMsQ0FBQyxFQUFFO0NBQ3BELENBQUM7UUFFRSw0REFBNEQ7UUFDNUQsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSx3QkFBd0IsRUFBRTtZQUNoRCxLQUFLLEVBQUUsVUFBVTtZQUNqQixXQUFXLEVBQUUsNkRBQTZEO1NBQzNFLENBQUMsQ0FBQztJQUNMLENBQUM7Q0FDRjtBQXJYRCw0Q0FxWEMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XG5pbXBvcnQgKiBhcyBzMyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtczMnO1xuaW1wb3J0ICogYXMgY2xvdWRmcm9udCBmcm9tICdhd3MtY2RrLWxpYi9hd3MtY2xvdWRmcm9udCc7XG5pbXBvcnQgKiBhcyBvcmlnaW5zIGZyb20gJ2F3cy1jZGstbGliL2F3cy1jbG91ZGZyb250LW9yaWdpbnMnO1xuaW1wb3J0ICogYXMgcm91dGU1MyBmcm9tICdhd3MtY2RrLWxpYi9hd3Mtcm91dGU1Myc7XG5pbXBvcnQgKiBhcyB0YXJnZXRzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1yb3V0ZTUzLXRhcmdldHMnO1xuaW1wb3J0ICogYXMgYWNtIGZyb20gJ2F3cy1jZGstbGliL2F3cy1jZXJ0aWZpY2F0ZW1hbmFnZXInO1xuaW1wb3J0ICogYXMgaWFtIGZyb20gJ2F3cy1jZGstbGliL2F3cy1pYW0nO1xuaW1wb3J0ICogYXMgYXBpZ2F0ZXdheSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtYXBpZ2F0ZXdheSc7XG5pbXBvcnQgKiBhcyBsYW1iZGEgZnJvbSAnYXdzLWNkay1saWIvYXdzLWxhbWJkYSc7XG5pbXBvcnQgKiBhcyBkeW5hbW9kYiBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZHluYW1vZGInO1xuaW1wb3J0ICogYXMgbG9ncyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbG9ncyc7XG5pbXBvcnQgKiBhcyBzc20gZnJvbSAnYXdzLWNkay1saWIvYXdzLXNzbSc7XG5pbXBvcnQgeyBSZW1vdmFsUG9saWN5IH0gZnJvbSAnYXdzLWNkay1saWInO1xuXG5leHBvcnQgaW50ZXJmYWNlIEhvb2RUb0NvYXN0U3RhY2tQcm9wcyBleHRlbmRzIGNkay5TdGFja1Byb3BzIHtcbiAgZG9tYWluTmFtZT86IHN0cmluZztcbiAgc3ViZG9tYWluPzogc3RyaW5nO1xuICByZWdpb246IHN0cmluZztcbiAgZW52aXJvbm1lbnQ6IHN0cmluZztcbiAgdXNlQ3VzdG9tRG9tYWluOiBib29sZWFuO1xuICBtb2NrTW9kZTogYm9vbGVhbjtcbiAgZ2VuZXJhdGVFbnZGaWxlOiBib29sZWFuO1xufVxuXG5leHBvcnQgY2xhc3MgSG9vZFRvQ29hc3RTdGFjayBleHRlbmRzIGNkay5TdGFjayB7XG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBIb29kVG9Db2FzdFN0YWNrUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcblxuICAgIGNvbnN0IGZ1bGxEb21haW5OYW1lID0gcHJvcHMudXNlQ3VzdG9tRG9tYWluICYmIHByb3BzLmRvbWFpbk5hbWUgJiYgcHJvcHMuc3ViZG9tYWluIFxuICAgICAgPyBgJHtwcm9wcy5zdWJkb21haW59LiR7cHJvcHMuZG9tYWluTmFtZX1gIFxuICAgICAgOiB1bmRlZmluZWQ7XG5cbiAgICAvLyBTMyBCdWNrZXQgZm9yIGhvc3RpbmcgdGhlIGZyb250ZW5kXG4gICAgY29uc3Qgd2Vic2l0ZUJ1Y2tldCA9IG5ldyBzMy5CdWNrZXQodGhpcywgJ1dlYnNpdGVCdWNrZXQnLCB7XG4gICAgICBidWNrZXROYW1lOiBgJHtwcm9wcy5lbnZpcm9ubWVudH0taG9vZC10by1jb2FzdC13ZWJzaXRlLSR7dGhpcy5hY2NvdW50fWAsXG4gICAgICBwdWJsaWNSZWFkQWNjZXNzOiBmYWxzZSxcbiAgICAgIGJsb2NrUHVibGljQWNjZXNzOiBzMy5CbG9ja1B1YmxpY0FjY2Vzcy5CTE9DS19BTEwsXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5SRVRBSU4sXG4gICAgICB2ZXJzaW9uZWQ6IHRydWUsXG4gICAgfSk7XG5cbiAgICAvLyBDcmVhdGUgYnVja2V0IHBvbGljeSB0byBhbGxvdyBDbG91ZEZyb250IGFjY2Vzc1xuICAgIGNvbnN0IGJ1Y2tldFBvbGljeSA9IG5ldyBzMy5CdWNrZXRQb2xpY3kodGhpcywgJ1dlYnNpdGVCdWNrZXRQb2xpY3knLCB7XG4gICAgICBidWNrZXQ6IHdlYnNpdGVCdWNrZXQsXG4gICAgfSk7XG5cbiAgICAvLyBHcmFudCBDbG91ZEZyb250IGFjY2VzcyB0byB0aGUgYnVja2V0XG4gICAgYnVja2V0UG9saWN5LmRvY3VtZW50LmFkZFN0YXRlbWVudHMoXG4gICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgIHNpZDogJ0FsbG93Q2xvdWRGcm9udEFjY2VzcycsXG4gICAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcbiAgICAgICAgcHJpbmNpcGFsczogW25ldyBpYW0uU2VydmljZVByaW5jaXBhbCgnY2xvdWRmcm9udC5hbWF6b25hd3MuY29tJyldLFxuICAgICAgICBhY3Rpb25zOiBbJ3MzOkdldE9iamVjdCddLFxuICAgICAgICByZXNvdXJjZXM6IFt3ZWJzaXRlQnVja2V0LmFybkZvck9iamVjdHMoJyonKV0sXG4gICAgICAgIGNvbmRpdGlvbnM6IHtcbiAgICAgICAgICBTdHJpbmdFcXVhbHM6IHtcbiAgICAgICAgICAgICdBV1M6U291cmNlQXJuJzogYGFybjphd3M6Y2xvdWRmcm9udDo6JHt0aGlzLmFjY291bnR9OmRpc3RyaWJ1dGlvbi8qYCxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgfSlcbiAgICApO1xuXG4gICAgLy8gQ2xvdWRGcm9udCBEaXN0cmlidXRpb25cbiAgICBsZXQgZGlzdHJpYnV0aW9uOiBjbG91ZGZyb250LkRpc3RyaWJ1dGlvbjtcbiAgICBsZXQgaG9zdGVkWm9uZTogcm91dGU1My5JSG9zdGVkWm9uZSB8IHVuZGVmaW5lZDtcbiAgICBcbiAgICBpZiAocHJvcHMudXNlQ3VzdG9tRG9tYWluICYmIGZ1bGxEb21haW5OYW1lKSB7XG4gICAgICAvLyBDdXN0b20gZG9tYWluIHNldHVwIC0gbG9va3VwIGhvc3RlZCB6b25lIG9uY2VcbiAgICAgIGhvc3RlZFpvbmUgPSByb3V0ZTUzLkhvc3RlZFpvbmUuZnJvbUxvb2t1cCh0aGlzLCAnSG9zdGVkWm9uZScsIHtcbiAgICAgICAgZG9tYWluTmFtZTogcHJvcHMuZG9tYWluTmFtZSEsXG4gICAgICB9KTtcblxuICAgICAgY29uc3QgY2VydGlmaWNhdGUgPSBuZXcgYWNtLkNlcnRpZmljYXRlKHRoaXMsICdDZXJ0aWZpY2F0ZScsIHtcbiAgICAgICAgZG9tYWluTmFtZTogZnVsbERvbWFpbk5hbWUsXG4gICAgICAgIHZhbGlkYXRpb246IGFjbS5DZXJ0aWZpY2F0ZVZhbGlkYXRpb24uZnJvbURucyhob3N0ZWRab25lKSxcbiAgICAgIH0pO1xuXG4gICAgICBkaXN0cmlidXRpb24gPSBuZXcgY2xvdWRmcm9udC5EaXN0cmlidXRpb24odGhpcywgJ0Rpc3RyaWJ1dGlvbicsIHtcbiAgICAgICAgZGVmYXVsdEJlaGF2aW9yOiB7XG4gICAgICAgICAgb3JpZ2luOiBuZXcgb3JpZ2lucy5TM09yaWdpbih3ZWJzaXRlQnVja2V0KSxcbiAgICAgICAgICB2aWV3ZXJQcm90b2NvbFBvbGljeTogY2xvdWRmcm9udC5WaWV3ZXJQcm90b2NvbFBvbGljeS5SRURJUkVDVF9UT19IVFRQUyxcbiAgICAgICAgICBhbGxvd2VkTWV0aG9kczogY2xvdWRmcm9udC5BbGxvd2VkTWV0aG9kcy5BTExPV19HRVRfSEVBRF9PUFRJT05TLFxuICAgICAgICAgIGNhY2hlZE1ldGhvZHM6IGNsb3VkZnJvbnQuQ2FjaGVkTWV0aG9kcy5DQUNIRV9HRVRfSEVBRF9PUFRJT05TLFxuICAgICAgICAgIGNhY2hlUG9saWN5OiBjbG91ZGZyb250LkNhY2hlUG9saWN5LkNBQ0hJTkdfT1BUSU1JWkVELFxuICAgICAgICAgIG9yaWdpblJlcXVlc3RQb2xpY3k6IGNsb3VkZnJvbnQuT3JpZ2luUmVxdWVzdFBvbGljeS5BTExfVklFV0VSX0VYQ0VQVF9IT1NUX0hFQURFUixcbiAgICAgICAgfSxcbiAgICAgICAgZG9tYWluTmFtZXM6IFtmdWxsRG9tYWluTmFtZV0sXG4gICAgICAgIGNlcnRpZmljYXRlLFxuICAgICAgICBlcnJvclJlc3BvbnNlczogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIGh0dHBTdGF0dXM6IDQwNCxcbiAgICAgICAgICAgIHJlc3BvbnNlSHR0cFN0YXR1czogMjAwLFxuICAgICAgICAgICAgcmVzcG9uc2VQYWdlUGF0aDogJy9pbmRleC5odG1sJyxcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIGh0dHBTdGF0dXM6IDQwMyxcbiAgICAgICAgICAgIHJlc3BvbnNlSHR0cFN0YXR1czogMjAwLFxuICAgICAgICAgICAgcmVzcG9uc2VQYWdlUGF0aDogJy9pbmRleC5odG1sJyxcbiAgICAgICAgICB9LFxuICAgICAgICBdLFxuICAgICAgfSk7XG5cbiAgICAgIC8vIFJvdXRlNTMgRE5TIGZvciBmcm9udGVuZFxuICAgICAgbmV3IHJvdXRlNTMuQVJlY29yZCh0aGlzLCAnQWxpYXNSZWNvcmQnLCB7XG4gICAgICAgIHpvbmU6IGhvc3RlZFpvbmUsXG4gICAgICAgIHJlY29yZE5hbWU6IHByb3BzLnN1YmRvbWFpbiEsXG4gICAgICAgIHRhcmdldDogcm91dGU1My5SZWNvcmRUYXJnZXQuZnJvbUFsaWFzKFxuICAgICAgICAgIG5ldyB0YXJnZXRzLkNsb3VkRnJvbnRUYXJnZXQoZGlzdHJpYnV0aW9uKVxuICAgICAgICApLFxuICAgICAgfSk7XG5cbiAgICAgIC8vIENyZWF0ZSBiYWNrZW5kIGluZnJhc3RydWN0dXJlIGlmIHdlIGhhdmUgYSBjdXN0b20gZG9tYWluXG4gICAgICBpZiAoaG9zdGVkWm9uZSkge1xuICAgICAgICB0aGlzLmNyZWF0ZUJhY2tlbmRJbmZyYXN0cnVjdHVyZShwcm9wcywgaG9zdGVkWm9uZSk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFNpbXBsZSBDbG91ZEZyb250IHNldHVwIHdpdGhvdXQgY3VzdG9tIGRvbWFpblxuICAgICAgZGlzdHJpYnV0aW9uID0gbmV3IGNsb3VkZnJvbnQuRGlzdHJpYnV0aW9uKHRoaXMsICdEaXN0cmlidXRpb24nLCB7XG4gICAgICAgIGRlZmF1bHRCZWhhdmlvcjoge1xuICAgICAgICAgIG9yaWdpbjogbmV3IG9yaWdpbnMuUzNPcmlnaW4od2Vic2l0ZUJ1Y2tldCksXG4gICAgICAgICAgdmlld2VyUHJvdG9jb2xQb2xpY3k6IGNsb3VkZnJvbnQuVmlld2VyUHJvdG9jb2xQb2xpY3kuUkVESVJFQ1RfVE9fSFRUUFMsXG4gICAgICAgICAgYWxsb3dlZE1ldGhvZHM6IGNsb3VkZnJvbnQuQWxsb3dlZE1ldGhvZHMuQUxMT1dfR0VUX0hFQURfT1BUSU9OUyxcbiAgICAgICAgICBjYWNoZWRNZXRob2RzOiBjbG91ZGZyb250LkNhY2hlZE1ldGhvZHMuQ0FDSEVfR0VUX0hFQURfT1BUSU9OUyxcbiAgICAgICAgICBjYWNoZVBvbGljeTogY2xvdWRmcm9udC5DYWNoZVBvbGljeS5DQUNISU5HX09QVElNSVpFRCxcbiAgICAgICAgICBvcmlnaW5SZXF1ZXN0UG9saWN5OiBjbG91ZGZyb250Lk9yaWdpblJlcXVlc3RQb2xpY3kuQUxMX1ZJRVdFUl9FWENFUFRfSE9TVF9IRUFERVIsXG4gICAgICAgIH0sXG4gICAgICAgIGVycm9yUmVzcG9uc2VzOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgaHR0cFN0YXR1czogNDA0LFxuICAgICAgICAgICAgcmVzcG9uc2VIdHRwU3RhdHVzOiAyMDAsXG4gICAgICAgICAgICByZXNwb25zZVBhZ2VQYXRoOiAnL2luZGV4Lmh0bWwnLFxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgaHR0cFN0YXR1czogNDAzLFxuICAgICAgICAgICAgcmVzcG9uc2VIdHRwU3RhdHVzOiAyMDAsXG4gICAgICAgICAgICByZXNwb25zZVBhZ2VQYXRoOiAnL2luZGV4Lmh0bWwnLFxuICAgICAgICAgIH0sXG4gICAgICAgIF0sXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyBHZW5lcmF0ZSBlbnZpcm9ubWVudCBmaWxlIGZvciB3ZWItYXBwIGlmIHJlcXVlc3RlZFxuICAgIGlmIChwcm9wcy5nZW5lcmF0ZUVudkZpbGUpIHtcbiAgICAgIHRoaXMuZ2VuZXJhdGVFbnZpcm9ubWVudEZpbGUocHJvcHMsIGRpc3RyaWJ1dGlvbi5kaXN0cmlidXRpb25Eb21haW5OYW1lKTtcbiAgICB9XG5cbiAgICAvLyBPdXRwdXRzXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1dlYnNpdGVVcmwnLCB7XG4gICAgICB2YWx1ZTogcHJvcHMudXNlQ3VzdG9tRG9tYWluICYmIGZ1bGxEb21haW5OYW1lIFxuICAgICAgICA/IGBodHRwczovLyR7ZnVsbERvbWFpbk5hbWV9YCBcbiAgICAgICAgOiBgaHR0cHM6Ly8ke2Rpc3RyaWJ1dGlvbi5kaXN0cmlidXRpb25Eb21haW5OYW1lfWAsXG4gICAgICBkZXNjcmlwdGlvbjogJ1dlYnNpdGUgVVJMJyxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdEaXN0cmlidXRpb25JZCcsIHtcbiAgICAgIHZhbHVlOiBkaXN0cmlidXRpb24uZGlzdHJpYnV0aW9uSWQsXG4gICAgICBkZXNjcmlwdGlvbjogJ0Nsb3VkRnJvbnQgRGlzdHJpYnV0aW9uIElEJyxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdTM0J1Y2tldE5hbWUnLCB7XG4gICAgICB2YWx1ZTogd2Vic2l0ZUJ1Y2tldC5idWNrZXROYW1lLFxuICAgICAgZGVzY3JpcHRpb246ICdTMyBCdWNrZXQgTmFtZSBmb3IgV2Vic2l0ZScsXG4gICAgfSk7XG5cbiAgICAvLyBNb2NrIG1vZGUgc3BlY2lmaWMgb3V0cHV0c1xuICAgIGlmIChwcm9wcy5tb2NrTW9kZSkge1xuICAgICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ01vY2tNb2RlSW5mbycsIHtcbiAgICAgICAgdmFsdWU6ICdBcHBsaWNhdGlvbiBpcyBydW5uaW5nIGluIE1PQ0sgTU9ERSAtIGFsbCBkYXRhIGlzIGxvY2FsIG1vY2sgZGF0YScsXG4gICAgICAgIGRlc2NyaXB0aW9uOiAnTW9jayBNb2RlIEluZm9ybWF0aW9uJyxcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgY3JlYXRlQmFja2VuZEluZnJhc3RydWN0dXJlKHByb3BzOiBIb29kVG9Db2FzdFN0YWNrUHJvcHMsIGhvc3RlZFpvbmU6IHJvdXRlNTMuSUhvc3RlZFpvbmUpIHtcbiAgICAvLyBEeW5hbW9EQiBUYWJsZXNcbiAgICBjb25zdCByYWNlc1RhYmxlID0gbmV3IGR5bmFtb2RiLlRhYmxlKHRoaXMsICdSYWNlc1RhYmxlJywge1xuICAgICAgdGFibGVOYW1lOiBgJHtwcm9wcy5lbnZpcm9ubWVudH0taHRjLXJhY2VzYCxcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAnaWQnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgICAgYmlsbGluZ01vZGU6IGR5bmFtb2RiLkJpbGxpbmdNb2RlLlBBWV9QRVJfUkVRVUVTVCxcbiAgICAgIHJlbW92YWxQb2xpY3k6IFJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICB9KTtcblxuICAgIGNvbnN0IHRlYW1zVGFibGUgPSBuZXcgZHluYW1vZGIuVGFibGUodGhpcywgJ1RlYW1zVGFibGUnLCB7XG4gICAgICB0YWJsZU5hbWU6IGAke3Byb3BzLmVudmlyb25tZW50fS1odGMtdGVhbXNgLFxuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICdpZCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgICBiaWxsaW5nTW9kZTogZHluYW1vZGIuQmlsbGluZ01vZGUuUEFZX1BFUl9SRVFVRVNULFxuICAgICAgcmVtb3ZhbFBvbGljeTogUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxuICAgIH0pO1xuXG4gICAgY29uc3QgcnVubmVyc1RhYmxlID0gbmV3IGR5bmFtb2RiLlRhYmxlKHRoaXMsICdSdW5uZXJzVGFibGUnLCB7XG4gICAgICB0YWJsZU5hbWU6IGAke3Byb3BzLmVudmlyb25tZW50fS1odGMtcnVubmVyc2AsXG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ2lkJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcbiAgICAgIGJpbGxpbmdNb2RlOiBkeW5hbW9kYi5CaWxsaW5nTW9kZS5QQVlfUEVSX1JFUVVFU1QsXG4gICAgICByZW1vdmFsUG9saWN5OiBSZW1vdmFsUG9saWN5LkRFU1RST1ksXG4gICAgfSk7XG5cbiAgICBjb25zdCBsZWdzVGFibGUgPSBuZXcgZHluYW1vZGIuVGFibGUodGhpcywgJ0xlZ3NUYWJsZScsIHtcbiAgICAgIHRhYmxlTmFtZTogYCR7cHJvcHMuZW52aXJvbm1lbnR9LWh0Yy1sZWdzYCxcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAnaWQnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgICAgYmlsbGluZ01vZGU6IGR5bmFtb2RiLkJpbGxpbmdNb2RlLlBBWV9QRVJfUkVRVUVTVCxcbiAgICAgIHJlbW92YWxQb2xpY3k6IFJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICB9KTtcblxuICAgIC8vIEFQSSBLZXlcbiAgICBjb25zdCBhcGlLZXkgPSBuZXcgYXBpZ2F0ZXdheS5BcGlLZXkodGhpcywgJ0FwaUtleScsIHtcbiAgICAgIGFwaUtleU5hbWU6IGAke3Byb3BzLmVudmlyb25tZW50fS1odGMtYXBpLWtleWAsXG4gICAgICBkZXNjcmlwdGlvbjogJ0FQSSBLZXkgZm9yIEhvb2QgdG8gQ29hc3QgVGltZSBUcmFja2VyIGZyb250ZW5kJyxcbiAgICB9KTtcblxuICAgIC8vIFN0b3JlIEFQSSBLZXkgSUQgaW4gU1NNIFBhcmFtZXRlciBTdG9yZVxuICAgIG5ldyBzc20uU3RyaW5nUGFyYW1ldGVyKHRoaXMsICdBcGlLZXlQYXJhbWV0ZXInLCB7XG4gICAgICBwYXJhbWV0ZXJOYW1lOiBgLyR7cHJvcHMuZW52aXJvbm1lbnR9L2h0Yy9hcGkta2V5LWlkYCxcbiAgICAgIHN0cmluZ1ZhbHVlOiBhcGlLZXkua2V5SWQsXG4gICAgICBkZXNjcmlwdGlvbjogJ0FQSSBLZXkgSUQgZm9yIEhvb2QgdG8gQ29hc3QgVGltZSBUcmFja2VyJyxcbiAgICB9KTtcblxuICAgIC8vIExhbWJkYSBmdW5jdGlvbiBmb3IgcmFjZXMgZW5kcG9pbnQgKHN0YXRpYyBkYXRhIGZvciBub3cpXG4gICAgY29uc3QgcmFjZXNGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ1JhY2VzRnVuY3Rpb24nLCB7XG4gICAgICBmdW5jdGlvbk5hbWU6IGAke3Byb3BzLmVudmlyb25tZW50fS1odGMtcmFjZXNgLFxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzE4X1gsXG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJ2xhbWJkYS9yYWNlcycpLFxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxuICAgICAgbWVtb3J5U2l6ZTogMjU2LFxuICAgICAgbG9nUmV0ZW50aW9uOiBsb2dzLlJldGVudGlvbkRheXMuT05FX1dFRUssXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBFTlZJUk9OTUVOVDogcHJvcHMuZW52aXJvbm1lbnQsXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgLy8gQVBJIEdhdGV3YXlcbiAgICBjb25zdCBhcGkgPSBuZXcgYXBpZ2F0ZXdheS5SZXN0QXBpKHRoaXMsICdIb29kVG9Db2FzdEFwaScsIHtcbiAgICAgIHJlc3RBcGlOYW1lOiBgJHtwcm9wcy5lbnZpcm9ubWVudH0taHRjLWFwaWAsXG4gICAgICBkZXNjcmlwdGlvbjogJ0hvb2QgdG8gQ29hc3QgVGltZSBUcmFja2VyIEFQSScsXG4gICAgICBkZWZhdWx0Q29yc1ByZWZsaWdodE9wdGlvbnM6IHtcbiAgICAgICAgYWxsb3dPcmlnaW5zOiBbXG4gICAgICAgICAgYGh0dHBzOi8vJHtwcm9wcy5zdWJkb21haW59LiR7cHJvcHMuZG9tYWluTmFtZX1gLFxuICAgICAgICAgICdodHRwOi8vbG9jYWxob3N0OjMwMDAnIC8vIEZvciBsb2NhbCBkZXZlbG9wbWVudFxuICAgICAgICBdLFxuICAgICAgICBhbGxvd01ldGhvZHM6IGFwaWdhdGV3YXkuQ29ycy5BTExfTUVUSE9EUyxcbiAgICAgICAgYWxsb3dIZWFkZXJzOiBbJ0NvbnRlbnQtVHlwZScsICdYLUFwaS1LZXknXSxcbiAgICAgICAgYWxsb3dDcmVkZW50aWFsczogdHJ1ZSxcbiAgICAgIH0sXG4gICAgICBkZXBsb3lPcHRpb25zOiB7XG4gICAgICAgIHN0YWdlTmFtZTogcHJvcHMuZW52aXJvbm1lbnQsXG4gICAgICAgIGxvZ2dpbmdMZXZlbDogYXBpZ2F0ZXdheS5NZXRob2RMb2dnaW5nTGV2ZWwuSU5GTyxcbiAgICAgICAgZGF0YVRyYWNlRW5hYmxlZDogdHJ1ZSxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICAvLyBDdXN0b20gZG9tYWluIGZvciBBUElcbiAgICBjb25zdCBhcGlEb21haW5OYW1lID0gcHJvcHMuZW52aXJvbm1lbnQgPT09ICdkZXZlbG9wbWVudCcgXG4gICAgICA/IGBodGNhcGkuZGV2LiR7cHJvcHMuZG9tYWluTmFtZX1gIFxuICAgICAgOiBgaHRjYXBpLiR7cHJvcHMuZG9tYWluTmFtZX1gO1xuXG4gICAgY29uc3QgYXBpQ2VydGlmaWNhdGUgPSBuZXcgYWNtLkNlcnRpZmljYXRlKHRoaXMsICdBcGlDZXJ0aWZpY2F0ZScsIHtcbiAgICAgIGRvbWFpbk5hbWU6IGFwaURvbWFpbk5hbWUsXG4gICAgICB2YWxpZGF0aW9uOiBhY20uQ2VydGlmaWNhdGVWYWxpZGF0aW9uLmZyb21EbnMoaG9zdGVkWm9uZSksXG4gICAgfSk7XG5cbiAgICBjb25zdCBhcGlEb21haW4gPSBuZXcgYXBpZ2F0ZXdheS5Eb21haW5OYW1lKHRoaXMsICdBcGlEb21haW4nLCB7XG4gICAgICBkb21haW5OYW1lOiBhcGlEb21haW5OYW1lLFxuICAgICAgY2VydGlmaWNhdGU6IGFwaUNlcnRpZmljYXRlLFxuICAgICAgc2VjdXJpdHlQb2xpY3k6IGFwaWdhdGV3YXkuU2VjdXJpdHlQb2xpY3kuVExTXzFfMixcbiAgICB9KTtcblxuICAgIC8vIEFzc29jaWF0ZSB0aGUgZG9tYWluIHdpdGggdGhlIEFQSVxuICAgIG5ldyBhcGlnYXRld2F5LkJhc2VQYXRoTWFwcGluZyh0aGlzLCAnQXBpQmFzZVBhdGhNYXBwaW5nJywge1xuICAgICAgZG9tYWluTmFtZTogYXBpRG9tYWluLFxuICAgICAgcmVzdEFwaTogYXBpLFxuICAgICAgYmFzZVBhdGg6ICcnLFxuICAgIH0pO1xuXG4gICAgLy8gUm91dGU1MyBETlMgZm9yIEFQSVxuICAgIG5ldyByb3V0ZTUzLkFSZWNvcmQodGhpcywgJ0FwaUFsaWFzUmVjb3JkJywge1xuICAgICAgem9uZTogaG9zdGVkWm9uZSxcbiAgICAgIHJlY29yZE5hbWU6IHByb3BzLmVudmlyb25tZW50ID09PSAnZGV2ZWxvcG1lbnQnID8gJ2h0Y2FwaS5kZXYnIDogJ2h0Y2FwaScsXG4gICAgICB0YXJnZXQ6IHJvdXRlNTMuUmVjb3JkVGFyZ2V0LmZyb21BbGlhcyhcbiAgICAgICAgbmV3IHRhcmdldHMuQXBpR2F0ZXdheURvbWFpbihhcGlEb21haW4pXG4gICAgICApLFxuICAgIH0pO1xuXG4gICAgLy8gQVBJIEdhdGV3YXkgdXNhZ2UgcGxhblxuICAgIGNvbnN0IHVzYWdlUGxhbiA9IG5ldyBhcGlnYXRld2F5LlVzYWdlUGxhbih0aGlzLCAnVXNhZ2VQbGFuJywge1xuICAgICAgbmFtZTogYCR7cHJvcHMuZW52aXJvbm1lbnR9LWh0Yy11c2FnZS1wbGFuYCxcbiAgICAgIGRlc2NyaXB0aW9uOiAnVXNhZ2UgcGxhbiBmb3IgSG9vZCB0byBDb2FzdCBUaW1lIFRyYWNrZXIgQVBJJyxcbiAgICAgIHRocm90dGxlOiB7XG4gICAgICAgIHJhdGVMaW1pdDogMTAwLFxuICAgICAgICBidXJzdExpbWl0OiAyMDAsXG4gICAgICB9LFxuICAgICAgcXVvdGE6IHtcbiAgICAgICAgbGltaXQ6IDEwMDAwLFxuICAgICAgICBwZXJpb2Q6IGFwaWdhdGV3YXkuUGVyaW9kLk1PTlRILFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIHVzYWdlUGxhbi5hZGRBcGlLZXkoYXBpS2V5KTtcbiAgICBcbiAgICAvLyBBc3NvY2lhdGUgdXNhZ2UgcGxhbiB3aXRoIEFQSSBzdGFnZVxuICAgIHVzYWdlUGxhbi5hZGRBcGlTdGFnZSh7XG4gICAgICBzdGFnZTogYXBpLmRlcGxveW1lbnRTdGFnZSxcbiAgICB9KTtcblxuICAgIC8vIFNJTVBMRSBTVEFUSUMgRU5EUE9JTlRTICh3aXRoIExhbWJkYSBpbnRlZ3JhdGlvbiBmb3IgR0VUIC9yYWNlcylcbiAgICBjb25zdCByYWNlc1Jlc291cmNlID0gYXBpLnJvb3QuYWRkUmVzb3VyY2UoJ3JhY2VzJyk7XG4gICAgXG4gICAgLy8gR0VUIGVuZHBvaW50IG5vdyB1c2VzIExhbWJkYSBpbnRlZ3JhdGlvbiAocmV0dXJucyBzdGF0aWMgZGF0YSlcbiAgICByYWNlc1Jlc291cmNlLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24ocmFjZXNGdW5jdGlvbiksIHtcbiAgICAgIGFwaUtleVJlcXVpcmVkOiB0cnVlLFxuICAgIH0pO1xuXG4gICAgLy8gU2ltcGxlIFBPU1QgZW5kcG9pbnQgdGhhdCByZXR1cm5zIHN1Y2Nlc3NcbiAgICByYWNlc1Jlc291cmNlLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5Lk1vY2tJbnRlZ3JhdGlvbih7XG4gICAgICByZXF1ZXN0VGVtcGxhdGVzOiB7XG4gICAgICAgICdhcHBsaWNhdGlvbi9qc29uJzogJ3tcInN0YXR1c0NvZGVcIjogMjAxfSdcbiAgICAgIH0sXG4gICAgICBpbnRlZ3JhdGlvblJlc3BvbnNlczogW3tcbiAgICAgICAgc3RhdHVzQ29kZTogJzIwMScsXG4gICAgICAgIHJlc3BvbnNlVGVtcGxhdGVzOiB7XG4gICAgICAgICAgJ2FwcGxpY2F0aW9uL2pzb24nOiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgICBtZXNzYWdlOiAnUmFjZSBjcmVhdGVkIHN1Y2Nlc3NmdWxseSAobW9jayByZXNwb25zZSknLFxuICAgICAgICAgICAgaWQ6ICdyYWNlXycgKyBEYXRlLm5vdygpXG4gICAgICAgICAgfSlcbiAgICAgICAgfSxcbiAgICAgICAgcmVzcG9uc2VQYXJhbWV0ZXJzOiB7XG4gICAgICAgICAgJ21ldGhvZC5yZXNwb25zZS5oZWFkZXIuQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogXCInKidcIixcbiAgICAgICAgICAnbWV0aG9kLnJlc3BvbnNlLmhlYWRlci5BY2Nlc3MtQ29udHJvbC1BbGxvdy1IZWFkZXJzJzogXCInQ29udGVudC1UeXBlLFgtQXBpLUtleSdcIixcbiAgICAgICAgICAnbWV0aG9kLnJlc3BvbnNlLmhlYWRlci5BY2Nlc3MtQ29udHJvbC1BbGxvdy1NZXRob2RzJzogXCInR0VULFBPU1QsUFVULERFTEVURSxPUFRJT05TJ1wiXG4gICAgICAgIH1cbiAgICAgIH1dLFxuICAgICAgcGFzc3Rocm91Z2hCZWhhdmlvcjogYXBpZ2F0ZXdheS5QYXNzdGhyb3VnaEJlaGF2aW9yLk5FVkVSLFxuICAgICAgY29udGVudEhhbmRsaW5nOiBhcGlnYXRld2F5LkNvbnRlbnRIYW5kbGluZy5DT05WRVJUX1RPX1RFWFQsXG4gICAgfSksIHtcbiAgICAgIGFwaUtleVJlcXVpcmVkOiB0cnVlLFxuICAgICAgbWV0aG9kUmVzcG9uc2VzOiBbe1xuICAgICAgICBzdGF0dXNDb2RlOiAnMjAxJyxcbiAgICAgICAgcmVzcG9uc2VQYXJhbWV0ZXJzOiB7XG4gICAgICAgICAgJ21ldGhvZC5yZXNwb25zZS5oZWFkZXIuQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogdHJ1ZSxcbiAgICAgICAgICAnbWV0aG9kLnJlc3BvbnNlLmhlYWRlci5BY2Nlc3MtQ29udHJvbC1BbGxvdy1IZWFkZXJzJzogdHJ1ZSxcbiAgICAgICAgICAnbWV0aG9kLnJlc3BvbnNlLmhlYWRlci5BY2Nlc3MtQ29udHJvbC1BbGxvdy1NZXRob2RzJzogdHJ1ZVxuICAgICAgICB9XG4gICAgICB9XVxuICAgIH0pO1xuXG4gICAgLy8gQWRkIG91dHB1dHNcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQXBpVXJsJywge1xuICAgICAgdmFsdWU6IGBodHRwczovLyR7YXBpRG9tYWluTmFtZX1gLFxuICAgICAgZGVzY3JpcHRpb246ICdBUEkgR2F0ZXdheSBVUkwnLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0FwaUtleUlkJywge1xuICAgICAgdmFsdWU6IGFwaUtleS5rZXlJZCxcbiAgICAgIGRlc2NyaXB0aW9uOiAnQVBJIEtleSBJRCcsXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnRHluYW1vREJUYWJsZXMnLCB7XG4gICAgICB2YWx1ZTogYFJhY2VzOiAke3JhY2VzVGFibGUudGFibGVOYW1lfSwgVGVhbXM6ICR7dGVhbXNUYWJsZS50YWJsZU5hbWV9LCBSdW5uZXJzOiAke3J1bm5lcnNUYWJsZS50YWJsZU5hbWV9LCBMZWdzOiAke2xlZ3NUYWJsZS50YWJsZU5hbWV9YCxcbiAgICAgIGRlc2NyaXB0aW9uOiAnRHluYW1vREIgVGFibGUgTmFtZXMnLFxuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBnZW5lcmF0ZUVudmlyb25tZW50RmlsZShcbiAgICBwcm9wczogSG9vZFRvQ29hc3RTdGFja1Byb3BzLCBcbiAgICBkaXN0cmlidXRpb25Eb21haW46IHN0cmluZ1xuICApIHtcbiAgICBjb25zdCBlbnZDb250ZW50ID0gYCMgRW52aXJvbm1lbnQgY29uZmlndXJhdGlvbiBmb3IgSG9vZCB0byBDb2FzdCBUaW1lIFRyYWNrZXJcbiMgR2VuZXJhdGVkIGJ5IENESyBkZXBsb3ltZW50IC0gRE8gTk9UIEVESVQgTUFOVUFMTFlcblxuIyBNb2NrIE1vZGUgQ29uZmlndXJhdGlvblxuVklURV9NT0NLX01PREU9JHtwcm9wcy5tb2NrTW9kZX1cblxuIyBBV1MgQ29uZmlndXJhdGlvblxuVklURV9BV1NfUkVHSU9OPSR7cHJvcHMucmVnaW9ufVxuVklURV9FTlZJUk9OTUVOVD0ke3Byb3BzLmVudmlyb25tZW50fVxuXG4jIERvbWFpbiBDb25maWd1cmF0aW9uXG5WSVRFX1VTRV9DVVNUT01fRE9NQUlOPSR7cHJvcHMudXNlQ3VzdG9tRG9tYWlufVxuJHtwcm9wcy5kb21haW5OYW1lID8gYFZJVEVfRE9NQUlOX05BTUU9JHtwcm9wcy5kb21haW5OYW1lfWAgOiAnJ31cbiR7cHJvcHMuc3ViZG9tYWluID8gYFZJVEVfU1VCRE9NQUlOPSR7cHJvcHMuc3ViZG9tYWlufWAgOiAnJ31cblxuIyBXZWJzaXRlIFVSTFxuVklURV9XRUJTSVRFX1VSTD1odHRwczovLyR7ZGlzdHJpYnV0aW9uRG9tYWlufVxuXG4jIE1vY2sgTW9kZSBOb3RlXG4ke3Byb3BzLm1vY2tNb2RlID8gJyMgUnVubmluZyBpbiBNT0NLIE1PREUgLSBhbGwgZGF0YSBpcyBsb2NhbCBtb2NrIGRhdGEnIDogJyMgUnVubmluZyBpbiBQUk9EVUNUSU9OIE1PREUgLSByZXF1aXJlcyBBUEkgZW5kcG9pbnRzJ31cblxuIyBBUEkgQ29uZmlndXJhdGlvbiAod2hlbiBub3QgaW4gbW9jayBtb2RlKVxuJHshcHJvcHMubW9ja01vZGUgPyBgVklURV9BUElfVVJMPWh0dHBzOi8vaHRjYXBpJHtwcm9wcy5lbnZpcm9ubWVudCA9PT0gJ2RldmVsb3BtZW50JyA/ICcuZGV2JyA6ICcnfS4ke3Byb3BzLmRvbWFpbk5hbWV9YCA6ICcnfVxuJHshcHJvcHMubW9ja01vZGUgPyAnVklURV9BUElfS0VZX1JFUVVJUkVEPXRydWUnIDogJyd9XG5gO1xuXG4gICAgLy8gT3V0cHV0IHRoZSBlbnZpcm9ubWVudCBmaWxlIGNvbnRlbnQgZm9yIG1hbnVhbCBkZXBsb3ltZW50XG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0Vudmlyb25tZW50RmlsZUNvbnRlbnQnLCB7XG4gICAgICB2YWx1ZTogZW52Q29udGVudCxcbiAgICAgIGRlc2NyaXB0aW9uOiAnRW52aXJvbm1lbnQgZmlsZSBjb250ZW50IHRvIGNvcHkgdG8gd2ViLWFwcC8uZW52LnByb2R1Y3Rpb24nLFxuICAgIH0pO1xuICB9XG59XG4iXX0=