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
const dynamodb = require("aws-cdk-lib/aws-dynamodb");
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
        // SIMPLE STATIC ENDPOINTS (no Lambda integration yet)
        const racesResource = api.root.addResource('races');
        // Simple GET endpoint that returns static data
        racesResource.addMethod('GET', new apigateway.MockIntegration({
            requestTemplates: {
                'application/json': '{"statusCode": 200}'
            },
            integrationResponses: [{
                    statusCode: '200',
                    responseTemplates: {
                        'application/json': JSON.stringify({
                            races: [
                                {
                                    id: 'race_1',
                                    name: 'Hood to Coast 2024',
                                    year: 2024,
                                    location: 'Portland, OR',
                                    status: 'upcoming'
                                },
                                {
                                    id: 'race_2',
                                    name: 'Hood to Coast 2023',
                                    year: 2023,
                                    location: 'Portland, OR',
                                    status: 'completed'
                                }
                            ],
                            count: 2
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
                    statusCode: '200',
                    responseParameters: {
                        'method.response.header.Access-Control-Allow-Origin': true,
                        'method.response.header.Access-Control-Allow-Headers': true,
                        'method.response.header.Access-Control-Allow-Methods': true
                    }
                }]
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaG9vZC10by1jb2FzdC1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImhvb2QtdG8tY29hc3Qtc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbUNBQW1DO0FBRW5DLHlDQUF5QztBQUN6Qyx5REFBeUQ7QUFDekQsOERBQThEO0FBQzlELG1EQUFtRDtBQUNuRCwyREFBMkQ7QUFDM0QsMERBQTBEO0FBQzFELDJDQUEyQztBQUMzQyx5REFBeUQ7QUFFekQscURBQXFEO0FBRXJELDJDQUEyQztBQUMzQyw2Q0FBNEM7QUFZNUMsTUFBYSxnQkFBaUIsU0FBUSxHQUFHLENBQUMsS0FBSztJQUM3QyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQTRCO1FBQ3BFLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXhCLE1BQU0sY0FBYyxHQUFHLEtBQUssQ0FBQyxlQUFlLElBQUksS0FBSyxDQUFDLFVBQVUsSUFBSSxLQUFLLENBQUMsU0FBUztZQUNqRixDQUFDLENBQUMsR0FBRyxLQUFLLENBQUMsU0FBUyxJQUFJLEtBQUssQ0FBQyxVQUFVLEVBQUU7WUFDMUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQztRQUVkLHFDQUFxQztRQUNyQyxNQUFNLGFBQWEsR0FBRyxJQUFJLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLGVBQWUsRUFBRTtZQUN6RCxVQUFVLEVBQUUsR0FBRyxLQUFLLENBQUMsV0FBVywwQkFBMEIsSUFBSSxDQUFDLE9BQU8sRUFBRTtZQUN4RSxnQkFBZ0IsRUFBRSxLQUFLO1lBQ3ZCLGlCQUFpQixFQUFFLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTO1lBQ2pELGFBQWEsRUFBRSxHQUFHLENBQUMsYUFBYSxDQUFDLE1BQU07WUFDdkMsU0FBUyxFQUFFLElBQUk7U0FDaEIsQ0FBQyxDQUFDO1FBRUgsa0RBQWtEO1FBQ2xELE1BQU0sWUFBWSxHQUFHLElBQUksRUFBRSxD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QU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEtBQUssQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRTtFQUM1SCxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLDRCQUE0QixDQUFDLENBQUMsQ0FBQyxFQUFFO0NBQ3BELENBQUM7UUFFRSw0REFBNEQ7UUFDNUQsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSx3QkFBd0IsRUFBRTtZQUNoRCxLQUFLLEVBQUUsVUFBVTtZQUNqQixXQUFXLEVBQUUsNkRBQTZEO1NBQzNFLENBQUMsQ0FBQztJQUNMLENBQUM7Q0FDRjtBQTdZRCw0Q0E2WUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XG5pbXBvcnQgKiBhcyBzMyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtczMnO1xuaW1wb3J0ICogYXMgY2xvdWRmcm9udCBmcm9tICdhd3MtY2RrLWxpYi9hd3MtY2xvdWRmcm9udCc7XG5pbXBvcnQgKiBhcyBvcmlnaW5zIGZyb20gJ2F3cy1jZGstbGliL2F3cy1jbG91ZGZyb250LW9yaWdpbnMnO1xuaW1wb3J0ICogYXMgcm91dGU1MyBmcm9tICdhd3MtY2RrLWxpYi9hd3Mtcm91dGU1Myc7XG5pbXBvcnQgKiBhcyB0YXJnZXRzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1yb3V0ZTUzLXRhcmdldHMnO1xuaW1wb3J0ICogYXMgYWNtIGZyb20gJ2F3cy1jZGstbGliL2F3cy1jZXJ0aWZpY2F0ZW1hbmFnZXInO1xuaW1wb3J0ICogYXMgaWFtIGZyb20gJ2F3cy1jZGstbGliL2F3cy1pYW0nO1xuaW1wb3J0ICogYXMgYXBpZ2F0ZXdheSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtYXBpZ2F0ZXdheSc7XG5pbXBvcnQgKiBhcyBsYW1iZGEgZnJvbSAnYXdzLWNkay1saWIvYXdzLWxhbWJkYSc7XG5pbXBvcnQgKiBhcyBkeW5hbW9kYiBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZHluYW1vZGInO1xuaW1wb3J0ICogYXMgbG9ncyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbG9ncyc7XG5pbXBvcnQgKiBhcyBzc20gZnJvbSAnYXdzLWNkay1saWIvYXdzLXNzbSc7XG5pbXBvcnQgeyBSZW1vdmFsUG9saWN5IH0gZnJvbSAnYXdzLWNkay1saWInO1xuXG5leHBvcnQgaW50ZXJmYWNlIEhvb2RUb0NvYXN0U3RhY2tQcm9wcyBleHRlbmRzIGNkay5TdGFja1Byb3BzIHtcbiAgZG9tYWluTmFtZT86IHN0cmluZztcbiAgc3ViZG9tYWluPzogc3RyaW5nO1xuICByZWdpb246IHN0cmluZztcbiAgZW52aXJvbm1lbnQ6IHN0cmluZztcbiAgdXNlQ3VzdG9tRG9tYWluOiBib29sZWFuO1xuICBtb2NrTW9kZTogYm9vbGVhbjtcbiAgZ2VuZXJhdGVFbnZGaWxlOiBib29sZWFuO1xufVxuXG5leHBvcnQgY2xhc3MgSG9vZFRvQ29hc3RTdGFjayBleHRlbmRzIGNkay5TdGFjayB7XG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBIb29kVG9Db2FzdFN0YWNrUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcblxuICAgIGNvbnN0IGZ1bGxEb21haW5OYW1lID0gcHJvcHMudXNlQ3VzdG9tRG9tYWluICYmIHByb3BzLmRvbWFpbk5hbWUgJiYgcHJvcHMuc3ViZG9tYWluIFxuICAgICAgPyBgJHtwcm9wcy5zdWJkb21haW59LiR7cHJvcHMuZG9tYWluTmFtZX1gIFxuICAgICAgOiB1bmRlZmluZWQ7XG5cbiAgICAvLyBTMyBCdWNrZXQgZm9yIGhvc3RpbmcgdGhlIGZyb250ZW5kXG4gICAgY29uc3Qgd2Vic2l0ZUJ1Y2tldCA9IG5ldyBzMy5CdWNrZXQodGhpcywgJ1dlYnNpdGVCdWNrZXQnLCB7XG4gICAgICBidWNrZXROYW1lOiBgJHtwcm9wcy5lbnZpcm9ubWVudH0taG9vZC10by1jb2FzdC13ZWJzaXRlLSR7dGhpcy5hY2NvdW50fWAsXG4gICAgICBwdWJsaWNSZWFkQWNjZXNzOiBmYWxzZSxcbiAgICAgIGJsb2NrUHVibGljQWNjZXNzOiBzMy5CbG9ja1B1YmxpY0FjY2Vzcy5CTE9DS19BTEwsXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5SRVRBSU4sXG4gICAgICB2ZXJzaW9uZWQ6IHRydWUsXG4gICAgfSk7XG5cbiAgICAvLyBDcmVhdGUgYnVja2V0IHBvbGljeSB0byBhbGxvdyBDbG91ZEZyb250IGFjY2Vzc1xuICAgIGNvbnN0IGJ1Y2tldFBvbGljeSA9IG5ldyBzMy5CdWNrZXRQb2xpY3kodGhpcywgJ1dlYnNpdGVCdWNrZXRQb2xpY3knLCB7XG4gICAgICBidWNrZXQ6IHdlYnNpdGVCdWNrZXQsXG4gICAgfSk7XG5cbiAgICAvLyBHcmFudCBDbG91ZEZyb250IGFjY2VzcyB0byB0aGUgYnVja2V0XG4gICAgYnVja2V0UG9saWN5LmRvY3VtZW50LmFkZFN0YXRlbWVudHMoXG4gICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgIHNpZDogJ0FsbG93Q2xvdWRGcm9udEFjY2VzcycsXG4gICAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcbiAgICAgICAgcHJpbmNpcGFsczogW25ldyBpYW0uU2VydmljZVByaW5jaXBhbCgnY2xvdWRmcm9udC5hbWF6b25hd3MuY29tJyldLFxuICAgICAgICBhY3Rpb25zOiBbJ3MzOkdldE9iamVjdCddLFxuICAgICAgICByZXNvdXJjZXM6IFt3ZWJzaXRlQnVja2V0LmFybkZvck9iamVjdHMoJyonKV0sXG4gICAgICAgIGNvbmRpdGlvbnM6IHtcbiAgICAgICAgICBTdHJpbmdFcXVhbHM6IHtcbiAgICAgICAgICAgICdBV1M6U291cmNlQXJuJzogYGFybjphd3M6Y2xvdWRmcm9udDo6JHt0aGlzLmFjY291bnR9OmRpc3RyaWJ1dGlvbi8qYCxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgfSlcbiAgICApO1xuXG4gICAgLy8gQ2xvdWRGcm9udCBEaXN0cmlidXRpb25cbiAgICBsZXQgZGlzdHJpYnV0aW9uOiBjbG91ZGZyb250LkRpc3RyaWJ1dGlvbjtcbiAgICBsZXQgaG9zdGVkWm9uZTogcm91dGU1My5JSG9zdGVkWm9uZSB8IHVuZGVmaW5lZDtcbiAgICBcbiAgICBpZiAocHJvcHMudXNlQ3VzdG9tRG9tYWluICYmIGZ1bGxEb21haW5OYW1lKSB7XG4gICAgICAvLyBDdXN0b20gZG9tYWluIHNldHVwIC0gbG9va3VwIGhvc3RlZCB6b25lIG9uY2VcbiAgICAgIGhvc3RlZFpvbmUgPSByb3V0ZTUzLkhvc3RlZFpvbmUuZnJvbUxvb2t1cCh0aGlzLCAnSG9zdGVkWm9uZScsIHtcbiAgICAgICAgZG9tYWluTmFtZTogcHJvcHMuZG9tYWluTmFtZSEsXG4gICAgICB9KTtcblxuICAgICAgY29uc3QgY2VydGlmaWNhdGUgPSBuZXcgYWNtLkNlcnRpZmljYXRlKHRoaXMsICdDZXJ0aWZpY2F0ZScsIHtcbiAgICAgICAgZG9tYWluTmFtZTogZnVsbERvbWFpbk5hbWUsXG4gICAgICAgIHZhbGlkYXRpb246IGFjbS5DZXJ0aWZpY2F0ZVZhbGlkYXRpb24uZnJvbURucyhob3N0ZWRab25lKSxcbiAgICAgIH0pO1xuXG4gICAgICBkaXN0cmlidXRpb24gPSBuZXcgY2xvdWRmcm9udC5EaXN0cmlidXRpb24odGhpcywgJ0Rpc3RyaWJ1dGlvbicsIHtcbiAgICAgICAgZGVmYXVsdEJlaGF2aW9yOiB7XG4gICAgICAgICAgb3JpZ2luOiBuZXcgb3JpZ2lucy5TM09yaWdpbih3ZWJzaXRlQnVja2V0KSxcbiAgICAgICAgICB2aWV3ZXJQcm90b2NvbFBvbGljeTogY2xvdWRmcm9udC5WaWV3ZXJQcm90b2NvbFBvbGljeS5SRURJUkVDVF9UT19IVFRQUyxcbiAgICAgICAgICBhbGxvd2VkTWV0aG9kczogY2xvdWRmcm9udC5BbGxvd2VkTWV0aG9kcy5BTExPV19HRVRfSEVBRF9PUFRJT05TLFxuICAgICAgICAgIGNhY2hlZE1ldGhvZHM6IGNsb3VkZnJvbnQuQ2FjaGVkTWV0aG9kcy5DQUNIRV9HRVRfSEVBRF9PUFRJT05TLFxuICAgICAgICAgIGNhY2hlUG9saWN5OiBjbG91ZGZyb250LkNhY2hlUG9saWN5LkNBQ0hJTkdfT1BUSU1JWkVELFxuICAgICAgICAgIG9yaWdpblJlcXVlc3RQb2xpY3k6IGNsb3VkZnJvbnQuT3JpZ2luUmVxdWVzdFBvbGljeS5BTExfVklFV0VSX0VYQ0VQVF9IT1NUX0hFQURFUixcbiAgICAgICAgfSxcbiAgICAgICAgZG9tYWluTmFtZXM6IFtmdWxsRG9tYWluTmFtZV0sXG4gICAgICAgIGNlcnRpZmljYXRlLFxuICAgICAgICBlcnJvclJlc3BvbnNlczogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIGh0dHBTdGF0dXM6IDQwNCxcbiAgICAgICAgICAgIHJlc3BvbnNlSHR0cFN0YXR1czogMjAwLFxuICAgICAgICAgICAgcmVzcG9uc2VQYWdlUGF0aDogJy9pbmRleC5odG1sJyxcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIGh0dHBTdGF0dXM6IDQwMyxcbiAgICAgICAgICAgIHJlc3BvbnNlSHR0cFN0YXR1czogMjAwLFxuICAgICAgICAgICAgcmVzcG9uc2VQYWdlUGF0aDogJy9pbmRleC5odG1sJyxcbiAgICAgICAgICB9LFxuICAgICAgICBdLFxuICAgICAgfSk7XG5cbiAgICAgIC8vIFJvdXRlNTMgRE5TIGZvciBmcm9udGVuZFxuICAgICAgbmV3IHJvdXRlNTMuQVJlY29yZCh0aGlzLCAnQWxpYXNSZWNvcmQnLCB7XG4gICAgICAgIHpvbmU6IGhvc3RlZFpvbmUsXG4gICAgICAgIHJlY29yZE5hbWU6IHByb3BzLnN1YmRvbWFpbiEsXG4gICAgICAgIHRhcmdldDogcm91dGU1My5SZWNvcmRUYXJnZXQuZnJvbUFsaWFzKFxuICAgICAgICAgIG5ldyB0YXJnZXRzLkNsb3VkRnJvbnRUYXJnZXQoZGlzdHJpYnV0aW9uKVxuICAgICAgICApLFxuICAgICAgfSk7XG5cbiAgICAgIC8vIENyZWF0ZSBiYWNrZW5kIGluZnJhc3RydWN0dXJlIGlmIHdlIGhhdmUgYSBjdXN0b20gZG9tYWluXG4gICAgICBpZiAoaG9zdGVkWm9uZSkge1xuICAgICAgICB0aGlzLmNyZWF0ZUJhY2tlbmRJbmZyYXN0cnVjdHVyZShwcm9wcywgaG9zdGVkWm9uZSk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFNpbXBsZSBDbG91ZEZyb250IHNldHVwIHdpdGhvdXQgY3VzdG9tIGRvbWFpblxuICAgICAgZGlzdHJpYnV0aW9uID0gbmV3IGNsb3VkZnJvbnQuRGlzdHJpYnV0aW9uKHRoaXMsICdEaXN0cmlidXRpb24nLCB7XG4gICAgICAgIGRlZmF1bHRCZWhhdmlvcjoge1xuICAgICAgICAgIG9yaWdpbjogbmV3IG9yaWdpbnMuUzNPcmlnaW4od2Vic2l0ZUJ1Y2tldCksXG4gICAgICAgICAgdmlld2VyUHJvdG9jb2xQb2xpY3k6IGNsb3VkZnJvbnQuVmlld2VyUHJvdG9jb2xQb2xpY3kuUkVESVJFQ1RfVE9fSFRUUFMsXG4gICAgICAgICAgYWxsb3dlZE1ldGhvZHM6IGNsb3VkZnJvbnQuQWxsb3dlZE1ldGhvZHMuQUxMT1dfR0VUX0hFQURfT1BUSU9OUyxcbiAgICAgICAgICBjYWNoZWRNZXRob2RzOiBjbG91ZGZyb250LkNhY2hlZE1ldGhvZHMuQ0FDSEVfR0VUX0hFQURfT1BUSU9OUyxcbiAgICAgICAgICBjYWNoZVBvbGljeTogY2xvdWRmcm9udC5DYWNoZVBvbGljeS5DQUNISU5HX09QVElNSVpFRCxcbiAgICAgICAgICBvcmlnaW5SZXF1ZXN0UG9saWN5OiBjbG91ZGZyb250Lk9yaWdpblJlcXVlc3RQb2xpY3kuQUxMX1ZJRVdFUl9FWENFUFRfSE9TVF9IRUFERVIsXG4gICAgICAgIH0sXG4gICAgICAgIGVycm9yUmVzcG9uc2VzOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgaHR0cFN0YXR1czogNDA0LFxuICAgICAgICAgICAgcmVzcG9uc2VIdHRwU3RhdHVzOiAyMDAsXG4gICAgICAgICAgICByZXNwb25zZVBhZ2VQYXRoOiAnL2luZGV4Lmh0bWwnLFxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgaHR0cFN0YXR1czogNDAzLFxuICAgICAgICAgICAgcmVzcG9uc2VIdHRwU3RhdHVzOiAyMDAsXG4gICAgICAgICAgICByZXNwb25zZVBhZ2VQYXRoOiAnL2luZGV4Lmh0bWwnLFxuICAgICAgICAgIH0sXG4gICAgICAgIF0sXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyBHZW5lcmF0ZSBlbnZpcm9ubWVudCBmaWxlIGZvciB3ZWItYXBwIGlmIHJlcXVlc3RlZFxuICAgIGlmIChwcm9wcy5nZW5lcmF0ZUVudkZpbGUpIHtcbiAgICAgIHRoaXMuZ2VuZXJhdGVFbnZpcm9ubWVudEZpbGUocHJvcHMsIGRpc3RyaWJ1dGlvbi5kaXN0cmlidXRpb25Eb21haW5OYW1lKTtcbiAgICB9XG5cbiAgICAvLyBPdXRwdXRzXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1dlYnNpdGVVcmwnLCB7XG4gICAgICB2YWx1ZTogcHJvcHMudXNlQ3VzdG9tRG9tYWluICYmIGZ1bGxEb21haW5OYW1lIFxuICAgICAgICA/IGBodHRwczovLyR7ZnVsbERvbWFpbk5hbWV9YCBcbiAgICAgICAgOiBgaHR0cHM6Ly8ke2Rpc3RyaWJ1dGlvbi5kaXN0cmlidXRpb25Eb21haW5OYW1lfWAsXG4gICAgICBkZXNjcmlwdGlvbjogJ1dlYnNpdGUgVVJMJyxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdEaXN0cmlidXRpb25JZCcsIHtcbiAgICAgIHZhbHVlOiBkaXN0cmlidXRpb24uZGlzdHJpYnV0aW9uSWQsXG4gICAgICBkZXNjcmlwdGlvbjogJ0Nsb3VkRnJvbnQgRGlzdHJpYnV0aW9uIElEJyxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdTM0J1Y2tldE5hbWUnLCB7XG4gICAgICB2YWx1ZTogd2Vic2l0ZUJ1Y2tldC5idWNrZXROYW1lLFxuICAgICAgZGVzY3JpcHRpb246ICdTMyBCdWNrZXQgTmFtZSBmb3IgV2Vic2l0ZScsXG4gICAgfSk7XG5cbiAgICAvLyBNb2NrIG1vZGUgc3BlY2lmaWMgb3V0cHV0c1xuICAgIGlmIChwcm9wcy5tb2NrTW9kZSkge1xuICAgICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ01vY2tNb2RlSW5mbycsIHtcbiAgICAgICAgdmFsdWU6ICdBcHBsaWNhdGlvbiBpcyBydW5uaW5nIGluIE1PQ0sgTU9ERSAtIGFsbCBkYXRhIGlzIGxvY2FsIG1vY2sgZGF0YScsXG4gICAgICAgIGRlc2NyaXB0aW9uOiAnTW9jayBNb2RlIEluZm9ybWF0aW9uJyxcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgY3JlYXRlQmFja2VuZEluZnJhc3RydWN0dXJlKHByb3BzOiBIb29kVG9Db2FzdFN0YWNrUHJvcHMsIGhvc3RlZFpvbmU6IHJvdXRlNTMuSUhvc3RlZFpvbmUpIHtcbiAgICAvLyBEeW5hbW9EQiBUYWJsZXNcbiAgICBjb25zdCByYWNlc1RhYmxlID0gbmV3IGR5bmFtb2RiLlRhYmxlKHRoaXMsICdSYWNlc1RhYmxlJywge1xuICAgICAgdGFibGVOYW1lOiBgJHtwcm9wcy5lbnZpcm9ubWVudH0taHRjLXJhY2VzYCxcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAnaWQnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgICAgYmlsbGluZ01vZGU6IGR5bmFtb2RiLkJpbGxpbmdNb2RlLlBBWV9QRVJfUkVRVUVTVCxcbiAgICAgIHJlbW92YWxQb2xpY3k6IFJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICB9KTtcblxuICAgIGNvbnN0IHRlYW1zVGFibGUgPSBuZXcgZHluYW1vZGIuVGFibGUodGhpcywgJ1RlYW1zVGFibGUnLCB7XG4gICAgICB0YWJsZU5hbWU6IGAke3Byb3BzLmVudmlyb25tZW50fS1odGMtdGVhbXNgLFxuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICdpZCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgICBiaWxsaW5nTW9kZTogZHluYW1vZGIuQmlsbGluZ01vZGUuUEFZX1BFUl9SRVFVRVNULFxuICAgICAgcmVtb3ZhbFBvbGljeTogUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxuICAgIH0pO1xuXG4gICAgY29uc3QgcnVubmVyc1RhYmxlID0gbmV3IGR5bmFtb2RiLlRhYmxlKHRoaXMsICdSdW5uZXJzVGFibGUnLCB7XG4gICAgICB0YWJsZU5hbWU6IGAke3Byb3BzLmVudmlyb25tZW50fS1odGMtcnVubmVyc2AsXG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ2lkJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcbiAgICAgIGJpbGxpbmdNb2RlOiBkeW5hbW9kYi5CaWxsaW5nTW9kZS5QQVlfUEVSX1JFUVVFU1QsXG4gICAgICByZW1vdmFsUG9saWN5OiBSZW1vdmFsUG9saWN5LkRFU1RST1ksXG4gICAgfSk7XG5cbiAgICBjb25zdCBsZWdzVGFibGUgPSBuZXcgZHluYW1vZGIuVGFibGUodGhpcywgJ0xlZ3NUYWJsZScsIHtcbiAgICAgIHRhYmxlTmFtZTogYCR7cHJvcHMuZW52aXJvbm1lbnR9LWh0Yy1sZWdzYCxcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAnaWQnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgICAgYmlsbGluZ01vZGU6IGR5bmFtb2RiLkJpbGxpbmdNb2RlLlBBWV9QRVJfUkVRVUVTVCxcbiAgICAgIHJlbW92YWxQb2xpY3k6IFJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICB9KTtcblxuICAgIC8vIEFQSSBLZXlcbiAgICBjb25zdCBhcGlLZXkgPSBuZXcgYXBpZ2F0ZXdheS5BcGlLZXkodGhpcywgJ0FwaUtleScsIHtcbiAgICAgIGFwaUtleU5hbWU6IGAke3Byb3BzLmVudmlyb25tZW50fS1odGMtYXBpLWtleWAsXG4gICAgICBkZXNjcmlwdGlvbjogJ0FQSSBLZXkgZm9yIEhvb2QgdG8gQ29hc3QgVGltZSBUcmFja2VyIGZyb250ZW5kJyxcbiAgICB9KTtcblxuICAgIC8vIFN0b3JlIEFQSSBLZXkgSUQgaW4gU1NNIFBhcmFtZXRlciBTdG9yZVxuICAgIG5ldyBzc20uU3RyaW5nUGFyYW1ldGVyKHRoaXMsICdBcGlLZXlQYXJhbWV0ZXInLCB7XG4gICAgICBwYXJhbWV0ZXJOYW1lOiBgLyR7cHJvcHMuZW52aXJvbm1lbnR9L2h0Yy9hcGkta2V5LWlkYCxcbiAgICAgIHN0cmluZ1ZhbHVlOiBhcGlLZXkua2V5SWQsXG4gICAgICBkZXNjcmlwdGlvbjogJ0FQSSBLZXkgSUQgZm9yIEhvb2QgdG8gQ29hc3QgVGltZSBUcmFja2VyJyxcbiAgICB9KTtcblxuICAgIC8vIEFQSSBHYXRld2F5XG4gICAgY29uc3QgYXBpID0gbmV3IGFwaWdhdGV3YXkuUmVzdEFwaSh0aGlzLCAnSG9vZFRvQ29hc3RBcGknLCB7XG4gICAgICByZXN0QXBpTmFtZTogYCR7cHJvcHMuZW52aXJvbm1lbnR9LWh0Yy1hcGlgLFxuICAgICAgZGVzY3JpcHRpb246ICdIb29kIHRvIENvYXN0IFRpbWUgVHJhY2tlciBBUEknLFxuICAgICAgZGVmYXVsdENvcnNQcmVmbGlnaHRPcHRpb25zOiB7XG4gICAgICAgIGFsbG93T3JpZ2luczogW1xuICAgICAgICAgIGBodHRwczovLyR7cHJvcHMuc3ViZG9tYWlufS4ke3Byb3BzLmRvbWFpbk5hbWV9YCxcbiAgICAgICAgICAnaHR0cDovL2xvY2FsaG9zdDozMDAwJyAvLyBGb3IgbG9jYWwgZGV2ZWxvcG1lbnRcbiAgICAgICAgXSxcbiAgICAgICAgYWxsb3dNZXRob2RzOiBhcGlnYXRld2F5LkNvcnMuQUxMX01FVEhPRFMsXG4gICAgICAgIGFsbG93SGVhZGVyczogWydDb250ZW50LVR5cGUnLCAnWC1BcGktS2V5J10sXG4gICAgICAgIGFsbG93Q3JlZGVudGlhbHM6IHRydWUsXG4gICAgICB9LFxuICAgICAgZGVwbG95T3B0aW9uczoge1xuICAgICAgICBzdGFnZU5hbWU6IHByb3BzLmVudmlyb25tZW50LFxuICAgICAgICBsb2dnaW5nTGV2ZWw6IGFwaWdhdGV3YXkuTWV0aG9kTG9nZ2luZ0xldmVsLklORk8sXG4gICAgICAgIGRhdGFUcmFjZUVuYWJsZWQ6IHRydWUsXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgLy8gQ3VzdG9tIGRvbWFpbiBmb3IgQVBJXG4gICAgY29uc3QgYXBpRG9tYWluTmFtZSA9IHByb3BzLmVudmlyb25tZW50ID09PSAnZGV2ZWxvcG1lbnQnIFxuICAgICAgPyBgaHRjYXBpLmRldi4ke3Byb3BzLmRvbWFpbk5hbWV9YCBcbiAgICAgIDogYGh0Y2FwaS4ke3Byb3BzLmRvbWFpbk5hbWV9YDtcblxuICAgIGNvbnN0IGFwaUNlcnRpZmljYXRlID0gbmV3IGFjbS5DZXJ0aWZpY2F0ZSh0aGlzLCAnQXBpQ2VydGlmaWNhdGUnLCB7XG4gICAgICBkb21haW5OYW1lOiBhcGlEb21haW5OYW1lLFxuICAgICAgdmFsaWRhdGlvbjogYWNtLkNlcnRpZmljYXRlVmFsaWRhdGlvbi5mcm9tRG5zKGhvc3RlZFpvbmUpLFxuICAgIH0pO1xuXG4gICAgY29uc3QgYXBpRG9tYWluID0gbmV3IGFwaWdhdGV3YXkuRG9tYWluTmFtZSh0aGlzLCAnQXBpRG9tYWluJywge1xuICAgICAgZG9tYWluTmFtZTogYXBpRG9tYWluTmFtZSxcbiAgICAgIGNlcnRpZmljYXRlOiBhcGlDZXJ0aWZpY2F0ZSxcbiAgICAgIHNlY3VyaXR5UG9saWN5OiBhcGlnYXRld2F5LlNlY3VyaXR5UG9saWN5LlRMU18xXzIsXG4gICAgfSk7XG5cbiAgICAvLyBBc3NvY2lhdGUgdGhlIGRvbWFpbiB3aXRoIHRoZSBBUElcbiAgICBuZXcgYXBpZ2F0ZXdheS5CYXNlUGF0aE1hcHBpbmcodGhpcywgJ0FwaUJhc2VQYXRoTWFwcGluZycsIHtcbiAgICAgIGRvbWFpbk5hbWU6IGFwaURvbWFpbixcbiAgICAgIHJlc3RBcGk6IGFwaSxcbiAgICAgIGJhc2VQYXRoOiAnJyxcbiAgICB9KTtcblxuICAgIC8vIFJvdXRlNTMgRE5TIGZvciBBUElcbiAgICBuZXcgcm91dGU1My5BUmVjb3JkKHRoaXMsICdBcGlBbGlhc1JlY29yZCcsIHtcbiAgICAgIHpvbmU6IGhvc3RlZFpvbmUsXG4gICAgICByZWNvcmROYW1lOiBwcm9wcy5lbnZpcm9ubWVudCA9PT0gJ2RldmVsb3BtZW50JyA/ICdodGNhcGkuZGV2JyA6ICdodGNhcGknLFxuICAgICAgdGFyZ2V0OiByb3V0ZTUzLlJlY29yZFRhcmdldC5mcm9tQWxpYXMoXG4gICAgICAgIG5ldyB0YXJnZXRzLkFwaUdhdGV3YXlEb21haW4oYXBpRG9tYWluKVxuICAgICAgKSxcbiAgICB9KTtcblxuICAgIC8vIEFQSSBHYXRld2F5IHVzYWdlIHBsYW5cbiAgICBjb25zdCB1c2FnZVBsYW4gPSBuZXcgYXBpZ2F0ZXdheS5Vc2FnZVBsYW4odGhpcywgJ1VzYWdlUGxhbicsIHtcbiAgICAgIG5hbWU6IGAke3Byb3BzLmVudmlyb25tZW50fS1odGMtdXNhZ2UtcGxhbmAsXG4gICAgICBkZXNjcmlwdGlvbjogJ1VzYWdlIHBsYW4gZm9yIEhvb2QgdG8gQ29hc3QgVGltZSBUcmFja2VyIEFQSScsXG4gICAgICB0aHJvdHRsZToge1xuICAgICAgICByYXRlTGltaXQ6IDEwMCxcbiAgICAgICAgYnVyc3RMaW1pdDogMjAwLFxuICAgICAgfSxcbiAgICAgIHF1b3RhOiB7XG4gICAgICAgIGxpbWl0OiAxMDAwMCxcbiAgICAgICAgcGVyaW9kOiBhcGlnYXRld2F5LlBlcmlvZC5NT05USCxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICB1c2FnZVBsYW4uYWRkQXBpS2V5KGFwaUtleSk7XG5cbiAgICAvLyBTSU1QTEUgU1RBVElDIEVORFBPSU5UUyAobm8gTGFtYmRhIGludGVncmF0aW9uIHlldClcbiAgICBjb25zdCByYWNlc1Jlc291cmNlID0gYXBpLnJvb3QuYWRkUmVzb3VyY2UoJ3JhY2VzJyk7XG4gICAgXG4gICAgLy8gU2ltcGxlIEdFVCBlbmRwb2ludCB0aGF0IHJldHVybnMgc3RhdGljIGRhdGFcbiAgICByYWNlc1Jlc291cmNlLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTW9ja0ludGVncmF0aW9uKHtcbiAgICAgIHJlcXVlc3RUZW1wbGF0ZXM6IHtcbiAgICAgICAgJ2FwcGxpY2F0aW9uL2pzb24nOiAne1wic3RhdHVzQ29kZVwiOiAyMDB9J1xuICAgICAgfSxcbiAgICAgIGludGVncmF0aW9uUmVzcG9uc2VzOiBbe1xuICAgICAgICBzdGF0dXNDb2RlOiAnMjAwJyxcbiAgICAgICAgcmVzcG9uc2VUZW1wbGF0ZXM6IHtcbiAgICAgICAgICAnYXBwbGljYXRpb24vanNvbic6IEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICAgIHJhY2VzOiBbXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBpZDogJ3JhY2VfMScsXG4gICAgICAgICAgICAgICAgbmFtZTogJ0hvb2QgdG8gQ29hc3QgMjAyNCcsXG4gICAgICAgICAgICAgICAgeWVhcjogMjAyNCxcbiAgICAgICAgICAgICAgICBsb2NhdGlvbjogJ1BvcnRsYW5kLCBPUicsXG4gICAgICAgICAgICAgICAgc3RhdHVzOiAndXBjb21pbmcnXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBpZDogJ3JhY2VfMicsIFxuICAgICAgICAgICAgICAgIG5hbWU6ICdIb29kIHRvIENvYXN0IDIwMjMnLFxuICAgICAgICAgICAgICAgIHllYXI6IDIwMjMsXG4gICAgICAgICAgICAgICAgbG9jYXRpb246ICdQb3J0bGFuZCwgT1InLFxuICAgICAgICAgICAgICAgIHN0YXR1czogJ2NvbXBsZXRlZCdcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGNvdW50OiAyXG4gICAgICAgICAgfSlcbiAgICAgICAgfSxcbiAgICAgICAgcmVzcG9uc2VQYXJhbWV0ZXJzOiB7XG4gICAgICAgICAgJ21ldGhvZC5yZXNwb25zZS5oZWFkZXIuQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogXCInKidcIixcbiAgICAgICAgICAnbWV0aG9kLnJlc3BvbnNlLmhlYWRlci5BY2Nlc3MtQ29udHJvbC1BbGxvdy1IZWFkZXJzJzogXCInQ29udGVudC1UeXBlLFgtQXBpLUtleSdcIixcbiAgICAgICAgICAnbWV0aG9kLnJlc3BvbnNlLmhlYWRlci5BY2Nlc3MtQ29udHJvbC1BbGxvdy1NZXRob2RzJzogXCInR0VULFBPU1QsUFVULERFTEVURSxPUFRJT05TJ1wiXG4gICAgICAgIH1cbiAgICAgIH1dLFxuICAgICAgcGFzc3Rocm91Z2hCZWhhdmlvcjogYXBpZ2F0ZXdheS5QYXNzdGhyb3VnaEJlaGF2aW9yLk5FVkVSLFxuICAgICAgY29udGVudEhhbmRsaW5nOiBhcGlnYXRld2F5LkNvbnRlbnRIYW5kbGluZy5DT05WRVJUX1RPX1RFWFQsXG4gICAgfSksIHtcbiAgICAgIGFwaUtleVJlcXVpcmVkOiB0cnVlLFxuICAgICAgbWV0aG9kUmVzcG9uc2VzOiBbe1xuICAgICAgICBzdGF0dXNDb2RlOiAnMjAwJyxcbiAgICAgICAgcmVzcG9uc2VQYXJhbWV0ZXJzOiB7XG4gICAgICAgICAgJ21ldGhvZC5yZXNwb25zZS5oZWFkZXIuQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogdHJ1ZSxcbiAgICAgICAgICAnbWV0aG9kLnJlc3BvbnNlLmhlYWRlci5BY2Nlc3MtQ29udHJvbC1BbGxvdy1IZWFkZXJzJzogdHJ1ZSxcbiAgICAgICAgICAnbWV0aG9kLnJlc3BvbnNlLmhlYWRlci5BY2Nlc3MtQ29udHJvbC1BbGxvdy1NZXRob2RzJzogdHJ1ZVxuICAgICAgICB9XG4gICAgICB9XVxuICAgIH0pO1xuXG4gICAgLy8gU2ltcGxlIFBPU1QgZW5kcG9pbnQgdGhhdCByZXR1cm5zIHN1Y2Nlc3NcbiAgICByYWNlc1Jlc291cmNlLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5Lk1vY2tJbnRlZ3JhdGlvbih7XG4gICAgICByZXF1ZXN0VGVtcGxhdGVzOiB7XG4gICAgICAgICdhcHBsaWNhdGlvbi9qc29uJzogJ3tcInN0YXR1c0NvZGVcIjogMjAxfSdcbiAgICAgIH0sXG4gICAgICBpbnRlZ3JhdGlvblJlc3BvbnNlczogW3tcbiAgICAgICAgc3RhdHVzQ29kZTogJzIwMScsXG4gICAgICAgIHJlc3BvbnNlVGVtcGxhdGVzOiB7XG4gICAgICAgICAgJ2FwcGxpY2F0aW9uL2pzb24nOiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgICBtZXNzYWdlOiAnUmFjZSBjcmVhdGVkIHN1Y2Nlc3NmdWxseSAobW9jayByZXNwb25zZSknLFxuICAgICAgICAgICAgaWQ6ICdyYWNlXycgKyBEYXRlLm5vdygpXG4gICAgICAgICAgfSlcbiAgICAgICAgfSxcbiAgICAgICAgcmVzcG9uc2VQYXJhbWV0ZXJzOiB7XG4gICAgICAgICAgJ21ldGhvZC5yZXNwb25zZS5oZWFkZXIuQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogXCInKidcIixcbiAgICAgICAgICAnbWV0aG9kLnJlc3BvbnNlLmhlYWRlci5BY2Nlc3MtQ29udHJvbC1BbGxvdy1IZWFkZXJzJzogXCInQ29udGVudC1UeXBlLFgtQXBpLUtleSdcIixcbiAgICAgICAgICAnbWV0aG9kLnJlc3BvbnNlLmhlYWRlci5BY2Nlc3MtQ29udHJvbC1BbGxvdy1NZXRob2RzJzogXCInR0VULFBPU1QsUFVULERFTEVURSxPUFRJT05TJ1wiXG4gICAgICAgIH1cbiAgICAgIH1dLFxuICAgICAgcGFzc3Rocm91Z2hCZWhhdmlvcjogYXBpZ2F0ZXdheS5QYXNzdGhyb3VnaEJlaGF2aW9yLk5FVkVSLFxuICAgICAgY29udGVudEhhbmRsaW5nOiBhcGlnYXRld2F5LkNvbnRlbnRIYW5kbGluZy5DT05WRVJUX1RPX1RFWFQsXG4gICAgfSksIHtcbiAgICAgIGFwaUtleVJlcXVpcmVkOiB0cnVlLFxuICAgICAgbWV0aG9kUmVzcG9uc2VzOiBbe1xuICAgICAgICBzdGF0dXNDb2RlOiAnMjAxJyxcbiAgICAgICAgcmVzcG9uc2VQYXJhbWV0ZXJzOiB7XG4gICAgICAgICAgJ21ldGhvZC5yZXNwb25zZS5oZWFkZXIuQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogdHJ1ZSxcbiAgICAgICAgICAnbWV0aG9kLnJlc3BvbnNlLmhlYWRlci5BY2Nlc3MtQ29udHJvbC1BbGxvdy1IZWFkZXJzJzogdHJ1ZSxcbiAgICAgICAgICAnbWV0aG9kLnJlc3BvbnNlLmhlYWRlci5BY2Nlc3MtQ29udHJvbC1BbGxvdy1NZXRob2RzJzogdHJ1ZVxuICAgICAgICB9XG4gICAgICB9XVxuICAgIH0pO1xuXG4gICAgLy8gQWRkIG91dHB1dHNcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQXBpVXJsJywge1xuICAgICAgdmFsdWU6IGBodHRwczovLyR7YXBpRG9tYWluTmFtZX1gLFxuICAgICAgZGVzY3JpcHRpb246ICdBUEkgR2F0ZXdheSBVUkwnLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0FwaUtleUlkJywge1xuICAgICAgdmFsdWU6IGFwaUtleS5rZXlJZCxcbiAgICAgIGRlc2NyaXB0aW9uOiAnQVBJIEtleSBJRCcsXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnRHluYW1vREJUYWJsZXMnLCB7XG4gICAgICB2YWx1ZTogYFJhY2VzOiAke3JhY2VzVGFibGUudGFibGVOYW1lfSwgVGVhbXM6ICR7dGVhbXNUYWJsZS50YWJsZU5hbWV9LCBSdW5uZXJzOiAke3J1bm5lcnNUYWJsZS50YWJsZU5hbWV9LCBMZWdzOiAke2xlZ3NUYWJsZS50YWJsZU5hbWV9YCxcbiAgICAgIGRlc2NyaXB0aW9uOiAnRHluYW1vREIgVGFibGUgTmFtZXMnLFxuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBnZW5lcmF0ZUVudmlyb25tZW50RmlsZShcbiAgICBwcm9wczogSG9vZFRvQ29hc3RTdGFja1Byb3BzLCBcbiAgICBkaXN0cmlidXRpb25Eb21haW46IHN0cmluZ1xuICApIHtcbiAgICBjb25zdCBlbnZDb250ZW50ID0gYCMgRW52aXJvbm1lbnQgY29uZmlndXJhdGlvbiBmb3IgSG9vZCB0byBDb2FzdCBUaW1lIFRyYWNrZXJcbiMgR2VuZXJhdGVkIGJ5IENESyBkZXBsb3ltZW50IC0gRE8gTk9UIEVESVQgTUFOVUFMTFlcblxuIyBNb2NrIE1vZGUgQ29uZmlndXJhdGlvblxuVklURV9NT0NLX01PREU9JHtwcm9wcy5tb2NrTW9kZX1cblxuIyBBV1MgQ29uZmlndXJhdGlvblxuVklURV9BV1NfUkVHSU9OPSR7cHJvcHMucmVnaW9ufVxuVklURV9FTlZJUk9OTUVOVD0ke3Byb3BzLmVudmlyb25tZW50fVxuXG4jIERvbWFpbiBDb25maWd1cmF0aW9uXG5WSVRFX1VTRV9DVVNUT01fRE9NQUlOPSR7cHJvcHMudXNlQ3VzdG9tRG9tYWlufVxuJHtwcm9wcy5kb21haW5OYW1lID8gYFZJVEVfRE9NQUlOX05BTUU9JHtwcm9wcy5kb21haW5OYW1lfWAgOiAnJ31cbiR7cHJvcHMuc3ViZG9tYWluID8gYFZJVEVfU1VCRE9NQUlOPSR7cHJvcHMuc3ViZG9tYWlufWAgOiAnJ31cblxuIyBXZWJzaXRlIFVSTFxuVklURV9XRUJTSVRFX1VSTD1odHRwczovLyR7ZGlzdHJpYnV0aW9uRG9tYWlufVxuXG4jIE1vY2sgTW9kZSBOb3RlXG4ke3Byb3BzLm1vY2tNb2RlID8gJyMgUnVubmluZyBpbiBNT0NLIE1PREUgLSBhbGwgZGF0YSBpcyBsb2NhbCBtb2NrIGRhdGEnIDogJyMgUnVubmluZyBpbiBQUk9EVUNUSU9OIE1PREUgLSByZXF1aXJlcyBBUEkgZW5kcG9pbnRzJ31cblxuIyBBUEkgQ29uZmlndXJhdGlvbiAod2hlbiBub3QgaW4gbW9jayBtb2RlKVxuJHshcHJvcHMubW9ja01vZGUgPyBgVklURV9BUElfVVJMPWh0dHBzOi8vaHRjYXBpJHtwcm9wcy5lbnZpcm9ubWVudCA9PT0gJ2RldmVsb3BtZW50JyA/ICcuZGV2JyA6ICcnfS4ke3Byb3BzLmRvbWFpbk5hbWV9YCA6ICcnfVxuJHshcHJvcHMubW9ja01vZGUgPyAnVklURV9BUElfS0VZX1JFUVVJUkVEPXRydWUnIDogJyd9XG5gO1xuXG4gICAgLy8gT3V0cHV0IHRoZSBlbnZpcm9ubWVudCBmaWxlIGNvbnRlbnQgZm9yIG1hbnVhbCBkZXBsb3ltZW50XG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0Vudmlyb25tZW50RmlsZUNvbnRlbnQnLCB7XG4gICAgICB2YWx1ZTogZW52Q29udGVudCxcbiAgICAgIGRlc2NyaXB0aW9uOiAnRW52aXJvbm1lbnQgZmlsZSBjb250ZW50IHRvIGNvcHkgdG8gd2ViLWFwcC8uZW52LnByb2R1Y3Rpb24nLFxuICAgIH0pO1xuICB9XG59XG4iXX0=