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
class HoodToCoastStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        const fullDomainName = props.useCustomDomain && props.domainName && props.subdomain
            ? `${props.subdomain}.${props.domainName}`
            : undefined;
        // S3 Bucket for hosting the frontend
        const websiteBucket = new s3.Bucket(this, 'WebsiteBucket', {
            bucketName: `${props.environment}-hood-to-coast-website-${this.account}`,
            // Remove website configuration - we want S3 origin, not website endpoint
            // websiteIndexDocument: 'index.html',
            // websiteErrorDocument: 'index.html',
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
        if (props.useCustomDomain && fullDomainName) {
            // Custom domain setup - lookup hosted zone once
            const hostedZone = route53.HostedZone.fromLookup(this, 'HostedZone', {
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
            // Route53 DNS
            new route53.ARecord(this, 'AliasRecord', {
                zone: hostedZone,
                recordName: props.subdomain,
                target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution)),
            });
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
`;
        // Output the environment file content for manual deployment
        new cdk.CfnOutput(this, 'EnvironmentFileContent', {
            value: envContent,
            description: 'Environment file content to copy to web-app/.env.production',
        });
    }
}
exports.HoodToCoastStack = HoodToCoastStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaG9vZC10by1jb2FzdC1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImhvb2QtdG8tY29hc3Qtc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbUNBQW1DO0FBRW5DLHlDQUF5QztBQUN6Qyx5REFBeUQ7QUFDekQsOERBQThEO0FBQzlELG1EQUFtRDtBQUNuRCwyREFBMkQ7QUFDM0QsMERBQTBEO0FBQzFELDJDQUEyQztBQWEzQyxNQUFhLGdCQUFpQixTQUFRLEdBQUcsQ0FBQyxLQUFLO0lBQzdDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBNEI7UUFDcEUsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFeEIsTUFBTSxjQUFjLEdBQUcsS0FBSyxDQUFDLGVBQWUsSUFBSSxLQUFLLENBQUMsVUFBVSxJQUFJLEtBQUssQ0FBQyxTQUFTO1lBQ2pGLENBQUMsQ0FBQyxHQUFHLEtBQUssQ0FBQyxTQUFTLElBQUksS0FBSyxDQUFDLFVBQVUsRUFBRTtZQUMxQyxDQUFDLENBQUMsU0FBUyxDQUFDO1FBRWQscUNBQXFDO1FBQ3JDLE1BQU0sYUFBYSxHQUFHLElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsZUFBZSxFQUFFO1lBQ3pELFVBQVUsRUFBRSxHQUFHLEtBQUssQ0FBQyxXQUFXLDBCQUEwQixJQUFJLENBQUMsT0FBTyxFQUFFO1lBQ3hFLHlFQUF5RTtZQUN6RSxzQ0FBc0M7WUFDdEMsc0NBQXNDO1lBQ3RDLGdCQUFnQixFQUFFLEtBQUs7WUFDdkIsaUJBQWlCLEVBQUUsRUFBRSxDQUFDLGlCQUFpQixDQUFDLFNBQVM7WUFDakQsYUFBYSxFQUFFLEdBQUcsQ0FBQyxhQUFhLENBQUMsTUFBTTtZQUN2QyxTQUFTLEVBQUUsSUFBSTtTQUNoQixDQUFDLENBQUM7UUFFSCxrREFBa0Q7UUFDbEQsTUFBTSxZQUFZLEdBQUcsSUFBSSxFQUFFLENBQUMsWUFBWSxDQUFD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Yic7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcbmltcG9ydCAqIGFzIHMzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1zMyc7XG5pbXBvcnQgKiBhcyBjbG91ZGZyb250IGZyb20gJ2F3cy1jZGstbGliL2F3cy1jbG91ZGZyb250JztcbmltcG9ydCAqIGFzIG9yaWdpbnMgZnJvbSAnYXdzLWNkay1saWIvYXdzLWNsb3VkZnJvbnQtb3JpZ2lucyc7XG5pbXBvcnQgKiBhcyByb3V0ZTUzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1yb3V0ZTUzJztcbmltcG9ydCAqIGFzIHRhcmdldHMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXJvdXRlNTMtdGFyZ2V0cyc7XG5pbXBvcnQgKiBhcyBhY20gZnJvbSAnYXdzLWNkay1saWIvYXdzLWNlcnRpZmljYXRlbWFuYWdlcic7XG5pbXBvcnQgKiBhcyBpYW0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWlhbSc7XG5cblxuZXhwb3J0IGludGVyZmFjZSBIb29kVG9Db2FzdFN0YWNrUHJvcHMgZXh0ZW5kcyBjZGsuU3RhY2tQcm9wcyB7XG4gIGRvbWFpbk5hbWU/OiBzdHJpbmc7XG4gIHN1YmRvbWFpbj86IHN0cmluZztcbiAgcmVnaW9uOiBzdHJpbmc7XG4gIGVudmlyb25tZW50OiBzdHJpbmc7XG4gIHVzZUN1c3RvbURvbWFpbjogYm9vbGVhbjtcbiAgbW9ja01vZGU6IGJvb2xlYW47XG4gIGdlbmVyYXRlRW52RmlsZTogYm9vbGVhbjtcbn1cblxuZXhwb3J0IGNsYXNzIEhvb2RUb0NvYXN0U3RhY2sgZXh0ZW5kcyBjZGsuU3RhY2sge1xuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogSG9vZFRvQ29hc3RTdGFja1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XG5cbiAgICBjb25zdCBmdWxsRG9tYWluTmFtZSA9IHByb3BzLnVzZUN1c3RvbURvbWFpbiAmJiBwcm9wcy5kb21haW5OYW1lICYmIHByb3BzLnN1YmRvbWFpbiBcbiAgICAgID8gYCR7cHJvcHMuc3ViZG9tYWlufS4ke3Byb3BzLmRvbWFpbk5hbWV9YCBcbiAgICAgIDogdW5kZWZpbmVkO1xuXG4gICAgLy8gUzMgQnVja2V0IGZvciBob3N0aW5nIHRoZSBmcm9udGVuZFxuICAgIGNvbnN0IHdlYnNpdGVCdWNrZXQgPSBuZXcgczMuQnVja2V0KHRoaXMsICdXZWJzaXRlQnVja2V0Jywge1xuICAgICAgYnVja2V0TmFtZTogYCR7cHJvcHMuZW52aXJvbm1lbnR9LWhvb2QtdG8tY29hc3Qtd2Vic2l0ZS0ke3RoaXMuYWNjb3VudH1gLFxuICAgICAgLy8gUmVtb3ZlIHdlYnNpdGUgY29uZmlndXJhdGlvbiAtIHdlIHdhbnQgUzMgb3JpZ2luLCBub3Qgd2Vic2l0ZSBlbmRwb2ludFxuICAgICAgLy8gd2Vic2l0ZUluZGV4RG9jdW1lbnQ6ICdpbmRleC5odG1sJyxcbiAgICAgIC8vIHdlYnNpdGVFcnJvckRvY3VtZW50OiAnaW5kZXguaHRtbCcsXG4gICAgICBwdWJsaWNSZWFkQWNjZXNzOiBmYWxzZSxcbiAgICAgIGJsb2NrUHVibGljQWNjZXNzOiBzMy5CbG9ja1B1YmxpY0FjY2Vzcy5CTE9DS19BTEwsXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5SRVRBSU4sXG4gICAgICB2ZXJzaW9uZWQ6IHRydWUsXG4gICAgfSk7XG5cbiAgICAvLyBDcmVhdGUgYnVja2V0IHBvbGljeSB0byBhbGxvdyBDbG91ZEZyb250IGFjY2Vzc1xuICAgIGNvbnN0IGJ1Y2tldFBvbGljeSA9IG5ldyBzMy5CdWNrZXRQb2xpY3kodGhpcywgJ1dlYnNpdGVCdWNrZXRQb2xpY3knLCB7XG4gICAgICBidWNrZXQ6IHdlYnNpdGVCdWNrZXQsXG4gICAgfSk7XG5cbiAgICAvLyBHcmFudCBDbG91ZEZyb250IGFjY2VzcyB0byB0aGUgYnVja2V0XG4gICAgYnVja2V0UG9saWN5LmRvY3VtZW50LmFkZFN0YXRlbWVudHMoXG4gICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgIHNpZDogJ0FsbG93Q2xvdWRGcm9udEFjY2VzcycsXG4gICAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcbiAgICAgICAgcHJpbmNpcGFsczogW25ldyBpYW0uU2VydmljZVByaW5jaXBhbCgnY2xvdWRmcm9udC5hbWF6b25hd3MuY29tJyldLFxuICAgICAgICBhY3Rpb25zOiBbJ3MzOkdldE9iamVjdCddLFxuICAgICAgICByZXNvdXJjZXM6IFt3ZWJzaXRlQnVja2V0LmFybkZvck9iamVjdHMoJyonKV0sXG4gICAgICAgIGNvbmRpdGlvbnM6IHtcbiAgICAgICAgICBTdHJpbmdFcXVhbHM6IHtcbiAgICAgICAgICAgICdBV1M6U291cmNlQXJuJzogYGFybjphd3M6Y2xvdWRmcm9udDo6JHt0aGlzLmFjY291bnR9OmRpc3RyaWJ1dGlvbi8qYCxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgfSlcbiAgICApO1xuXG4gICAgLy8gQ2xvdWRGcm9udCBEaXN0cmlidXRpb25cbiAgICBsZXQgZGlzdHJpYnV0aW9uOiBjbG91ZGZyb250LkRpc3RyaWJ1dGlvbjtcbiAgICBcbiAgICBpZiAocHJvcHMudXNlQ3VzdG9tRG9tYWluICYmIGZ1bGxEb21haW5OYW1lKSB7XG4gICAgICAvLyBDdXN0b20gZG9tYWluIHNldHVwIC0gbG9va3VwIGhvc3RlZCB6b25lIG9uY2VcbiAgICAgIGNvbnN0IGhvc3RlZFpvbmUgPSByb3V0ZTUzLkhvc3RlZFpvbmUuZnJvbUxvb2t1cCh0aGlzLCAnSG9zdGVkWm9uZScsIHtcbiAgICAgICAgZG9tYWluTmFtZTogcHJvcHMuZG9tYWluTmFtZSEsXG4gICAgICB9KTtcblxuICAgICAgY29uc3QgY2VydGlmaWNhdGUgPSBuZXcgYWNtLkNlcnRpZmljYXRlKHRoaXMsICdDZXJ0aWZpY2F0ZScsIHtcbiAgICAgICAgZG9tYWluTmFtZTogZnVsbERvbWFpbk5hbWUsXG4gICAgICAgIHZhbGlkYXRpb246IGFjbS5DZXJ0aWZpY2F0ZVZhbGlkYXRpb24uZnJvbURucyhob3N0ZWRab25lKSxcbiAgICAgIH0pO1xuXG4gICAgICBkaXN0cmlidXRpb24gPSBuZXcgY2xvdWRmcm9udC5EaXN0cmlidXRpb24odGhpcywgJ0Rpc3RyaWJ1dGlvbicsIHtcbiAgICAgICAgZGVmYXVsdEJlaGF2aW9yOiB7XG4gICAgICAgICAgb3JpZ2luOiBuZXcgb3JpZ2lucy5TM09yaWdpbih3ZWJzaXRlQnVja2V0KSxcbiAgICAgICAgICB2aWV3ZXJQcm90b2NvbFBvbGljeTogY2xvdWRmcm9udC5WaWV3ZXJQcm90b2NvbFBvbGljeS5SRURJUkVDVF9UT19IVFRQUyxcbiAgICAgICAgICBhbGxvd2VkTWV0aG9kczogY2xvdWRmcm9udC5BbGxvd2VkTWV0aG9kcy5BTExPV19HRVRfSEVBRF9PUFRJT05TLFxuICAgICAgICAgIGNhY2hlZE1ldGhvZHM6IGNsb3VkZnJvbnQuQ2FjaGVkTWV0aG9kcy5DQUNIRV9HRVRfSEVBRF9PUFRJT05TLFxuICAgICAgICAgIGNhY2hlUG9saWN5OiBjbG91ZGZyb250LkNhY2hlUG9saWN5LkNBQ0hJTkdfT1BUSU1JWkVELFxuICAgICAgICAgIG9yaWdpblJlcXVlc3RQb2xpY3k6IGNsb3VkZnJvbnQuT3JpZ2luUmVxdWVzdFBvbGljeS5BTExfVklFV0VSX0VYQ0VQVF9IT1NUX0hFQURFUixcbiAgICAgICAgfSxcbiAgICAgICAgZG9tYWluTmFtZXM6IFtmdWxsRG9tYWluTmFtZV0sXG4gICAgICAgIGNlcnRpZmljYXRlLFxuICAgICAgICBlcnJvclJlc3BvbnNlczogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIGh0dHBTdGF0dXM6IDQwNCxcbiAgICAgICAgICAgIHJlc3BvbnNlSHR0cFN0YXR1czogMjAwLFxuICAgICAgICAgICAgcmVzcG9uc2VQYWdlUGF0aDogJy9pbmRleC5odG1sJyxcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIGh0dHBTdGF0dXM6IDQwMyxcbiAgICAgICAgICAgIHJlc3BvbnNlSHR0cFN0YXR1czogMjAwLFxuICAgICAgICAgICAgcmVzcG9uc2VQYWdlUGF0aDogJy9pbmRleC5odG1sJyxcbiAgICAgICAgICB9LFxuICAgICAgICBdLFxuICAgICAgfSk7XG5cbiAgICAgIC8vIFJvdXRlNTMgRE5TXG4gICAgICBuZXcgcm91dGU1My5BUmVjb3JkKHRoaXMsICdBbGlhc1JlY29yZCcsIHtcbiAgICAgICAgem9uZTogaG9zdGVkWm9uZSxcbiAgICAgICAgcmVjb3JkTmFtZTogcHJvcHMuc3ViZG9tYWluISxcbiAgICAgICAgdGFyZ2V0OiByb3V0ZTUzLlJlY29yZFRhcmdldC5mcm9tQWxpYXMoXG4gICAgICAgICAgbmV3IHRhcmdldHMuQ2xvdWRGcm9udFRhcmdldChkaXN0cmlidXRpb24pXG4gICAgICAgICksXG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gU2ltcGxlIENsb3VkRnJvbnQgc2V0dXAgd2l0aG91dCBjdXN0b20gZG9tYWluXG4gICAgICBkaXN0cmlidXRpb24gPSBuZXcgY2xvdWRmcm9udC5EaXN0cmlidXRpb24odGhpcywgJ0Rpc3RyaWJ1dGlvbicsIHtcbiAgICAgICAgZGVmYXVsdEJlaGF2aW9yOiB7XG4gICAgICAgICAgb3JpZ2luOiBuZXcgb3JpZ2lucy5TM09yaWdpbih3ZWJzaXRlQnVja2V0KSxcbiAgICAgICAgICB2aWV3ZXJQcm90b2NvbFBvbGljeTogY2xvdWRmcm9udC5WaWV3ZXJQcm90b2NvbFBvbGljeS5SRURJUkVDVF9UT19IVFRQUyxcbiAgICAgICAgICBhbGxvd2VkTWV0aG9kczogY2xvdWRmcm9udC5BbGxvd2VkTWV0aG9kcy5BTExPV19HRVRfSEVBRF9PUFRJT05TLFxuICAgICAgICAgIGNhY2hlZE1ldGhvZHM6IGNsb3VkZnJvbnQuQ2FjaGVkTWV0aG9kcy5DQUNIRV9HRVRfSEVBRF9PUFRJT05TLFxuICAgICAgICAgIGNhY2hlUG9saWN5OiBjbG91ZGZyb250LkNhY2hlUG9saWN5LkNBQ0hJTkdfT1BUSU1JWkVELFxuICAgICAgICAgIG9yaWdpblJlcXVlc3RQb2xpY3k6IGNsb3VkZnJvbnQuT3JpZ2luUmVxdWVzdFBvbGljeS5BTExfVklFV0VSX0VYQ0VQVF9IT1NUX0hFQURFUixcbiAgICAgICAgfSxcbiAgICAgICAgZXJyb3JSZXNwb25zZXM6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICBodHRwU3RhdHVzOiA0MDQsXG4gICAgICAgICAgICByZXNwb25zZUh0dHBTdGF0dXM6IDIwMCxcbiAgICAgICAgICAgIHJlc3BvbnNlUGFnZVBhdGg6ICcvaW5kZXguaHRtbCcsXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICBodHRwU3RhdHVzOiA0MDMsXG4gICAgICAgICAgICByZXNwb25zZUh0dHBTdGF0dXM6IDIwMCxcbiAgICAgICAgICAgIHJlc3BvbnNlUGFnZVBhdGg6ICcvaW5kZXguaHRtbCcsXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIEdlbmVyYXRlIGVudmlyb25tZW50IGZpbGUgZm9yIHdlYi1hcHAgaWYgcmVxdWVzdGVkXG4gICAgaWYgKHByb3BzLmdlbmVyYXRlRW52RmlsZSkge1xuICAgICAgdGhpcy5nZW5lcmF0ZUVudmlyb25tZW50RmlsZShwcm9wcywgZGlzdHJpYnV0aW9uLmRpc3RyaWJ1dGlvbkRvbWFpbk5hbWUpO1xuICAgIH1cblxuICAgIC8vIE91dHB1dHNcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnV2Vic2l0ZVVybCcsIHtcbiAgICAgIHZhbHVlOiBwcm9wcy51c2VDdXN0b21Eb21haW4gJiYgZnVsbERvbWFpbk5hbWUgXG4gICAgICAgID8gYGh0dHBzOi8vJHtmdWxsRG9tYWluTmFtZX1gIFxuICAgICAgICA6IGBodHRwczovLyR7ZGlzdHJpYnV0aW9uLmRpc3RyaWJ1dGlvbkRvbWFpbk5hbWV9YCxcbiAgICAgIGRlc2NyaXB0aW9uOiAnV2Vic2l0ZSBVUkwnLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0Rpc3RyaWJ1dGlvbklkJywge1xuICAgICAgdmFsdWU6IGRpc3RyaWJ1dGlvbi5kaXN0cmlidXRpb25JZCxcbiAgICAgIGRlc2NyaXB0aW9uOiAnQ2xvdWRGcm9udCBEaXN0cmlidXRpb24gSUQnLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1MzQnVja2V0TmFtZScsIHtcbiAgICAgIHZhbHVlOiB3ZWJzaXRlQnVja2V0LmJ1Y2tldE5hbWUsXG4gICAgICBkZXNjcmlwdGlvbjogJ1MzIEJ1Y2tldCBOYW1lIGZvciBXZWJzaXRlJyxcbiAgICB9KTtcblxuICAgIC8vIE1vY2sgbW9kZSBzcGVjaWZpYyBvdXRwdXRzXG4gICAgaWYgKHByb3BzLm1vY2tNb2RlKSB7XG4gICAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnTW9ja01vZGVJbmZvJywge1xuICAgICAgICB2YWx1ZTogJ0FwcGxpY2F0aW9uIGlzIHJ1bm5pbmcgaW4gTU9DSyBNT0RFIC0gYWxsIGRhdGEgaXMgbG9jYWwgbW9jayBkYXRhJyxcbiAgICAgICAgZGVzY3JpcHRpb246ICdNb2NrIE1vZGUgSW5mb3JtYXRpb24nLFxuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBnZW5lcmF0ZUVudmlyb25tZW50RmlsZShcbiAgICBwcm9wczogSG9vZFRvQ29hc3RTdGFja1Byb3BzLCBcbiAgICBkaXN0cmlidXRpb25Eb21haW46IHN0cmluZ1xuICApIHtcbiAgICBjb25zdCBlbnZDb250ZW50ID0gYCMgRW52aXJvbm1lbnQgY29uZmlndXJhdGlvbiBmb3IgSG9vZCB0byBDb2FzdCBUaW1lIFRyYWNrZXJcbiMgR2VuZXJhdGVkIGJ5IENESyBkZXBsb3ltZW50IC0gRE8gTk9UIEVESVQgTUFOVUFMTFlcblxuIyBNb2NrIE1vZGUgQ29uZmlndXJhdGlvblxuVklURV9NT0NLX01PREU9JHtwcm9wcy5tb2NrTW9kZX1cblxuIyBBV1MgQ29uZmlndXJhdGlvblxuVklURV9BV1NfUkVHSU9OPSR7cHJvcHMucmVnaW9ufVxuVklURV9FTlZJUk9OTUVOVD0ke3Byb3BzLmVudmlyb25tZW50fVxuXG4jIERvbWFpbiBDb25maWd1cmF0aW9uXG5WSVRFX1VTRV9DVVNUT01fRE9NQUlOPSR7cHJvcHMudXNlQ3VzdG9tRG9tYWlufVxuJHtwcm9wcy5kb21haW5OYW1lID8gYFZJVEVfRE9NQUlOX05BTUU9JHtwcm9wcy5kb21haW5OYW1lfWAgOiAnJ31cbiR7cHJvcHMuc3ViZG9tYWluID8gYFZJVEVfU1VCRE9NQUlOPSR7cHJvcHMuc3ViZG9tYWlufWAgOiAnJ31cblxuIyBXZWJzaXRlIFVSTFxuVklURV9XRUJTSVRFX1VSTD1odHRwczovLyR7ZGlzdHJpYnV0aW9uRG9tYWlufVxuXG4jIE1vY2sgTW9kZSBOb3RlXG4ke3Byb3BzLm1vY2tNb2RlID8gJyMgUnVubmluZyBpbiBNT0NLIE1PREUgLSBhbGwgZGF0YSBpcyBsb2NhbCBtb2NrIGRhdGEnIDogJyMgUnVubmluZyBpbiBQUk9EVUNUSU9OIE1PREUgLSByZXF1aXJlcyBBUEkgZW5kcG9pbnRzJ31cbmA7XG5cbiAgICAvLyBPdXRwdXQgdGhlIGVudmlyb25tZW50IGZpbGUgY29udGVudCBmb3IgbWFudWFsIGRlcGxveW1lbnRcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnRW52aXJvbm1lbnRGaWxlQ29udGVudCcsIHtcbiAgICAgIHZhbHVlOiBlbnZDb250ZW50LFxuICAgICAgZGVzY3JpcHRpb246ICdFbnZpcm9ubWVudCBmaWxlIGNvbnRlbnQgdG8gY29weSB0byB3ZWItYXBwLy5lbnYucHJvZHVjdGlvbicsXG4gICAgfSk7XG4gIH1cbn1cbiJdfQ==