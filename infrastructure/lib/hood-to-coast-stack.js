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
            bucketName: props.useCustomDomain && props.domainName && props.subdomain
                ? `${props.environment}-${props.subdomain}-${props.domainName.replace(/\./g, '-')}`
                : `${props.environment}-hood-to-coast-website-${this.account}`,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaG9vZC10by1jb2FzdC1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImhvb2QtdG8tY29hc3Qtc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbUNBQW1DO0FBRW5DLHlDQUF5QztBQUN6Qyx5REFBeUQ7QUFDekQsOERBQThEO0FBQzlELG1EQUFtRDtBQUNuRCwyREFBMkQ7QUFDM0QsMERBQTBEO0FBQzFELDJDQUEyQztBQWEzQyxNQUFhLGdCQUFpQixTQUFRLEdBQUcsQ0FBQyxLQUFLO0lBQzdDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBNEI7UUFDcEUsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFeEIsTUFBTSxjQUFjLEdBQUcsS0FBSyxDQUFDLGVBQWUsSUFBSSxLQUFLLENBQUMsVUFBVSxJQUFJLEtBQUssQ0FBQyxTQUFTO1lBQ2pGLENBQUMsQ0FBQyxHQUFHLEtBQUssQ0FBQyxTQUFTLElBQUksS0FBSyxDQUFDLFVBQVUsRUFBRTtZQUMxQyxDQUFDLENBQUMsU0FBUyxDQUFDO1FBRWQscUNBQXFDO1FBQ3JDLE1BQU0sYUFBYSxHQUFHLElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsZUFBZSxFQUFFO1lBQ3pELFVBQVUsRUFBRSxLQUFLLENBQUMsZUFBZSxJQUFJLEtBQUssQ0FBQyxVQUFVLElBQUksS0FBSyxDQUFDLFNBQVM7Z0JBQ3RFLENBQUMsQ0FBQyxHQUFHLEtBQUssQ0FBQyxXQUFXLElBQUksS0FBSyxDQUFDLFNBQVMsSUFBSSxLQUFLLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLEVBQUU7Z0JBQ25GLENBQUMsQ0FBQyxHQUFHLEtBQUssQ0FBQyxXQUFXLDBCQUEwQixJQUFJLENBQUMsT0FBTyxFQUFFO1lBQ2hFLHlFQUF5RTtZQUN6RSxzQ0FBc0M7WUFDdEMsc0NBQXNDO1lBQ3RDLGdCQUFnQixF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dCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcbmltcG9ydCAqIGFzIHMzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1zMyc7XG5pbXBvcnQgKiBhcyBjbG91ZGZyb250IGZyb20gJ2F3cy1jZGstbGliL2F3cy1jbG91ZGZyb250JztcbmltcG9ydCAqIGFzIG9yaWdpbnMgZnJvbSAnYXdzLWNkay1saWIvYXdzLWNsb3VkZnJvbnQtb3JpZ2lucyc7XG5pbXBvcnQgKiBhcyByb3V0ZTUzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1yb3V0ZTUzJztcbmltcG9ydCAqIGFzIHRhcmdldHMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXJvdXRlNTMtdGFyZ2V0cyc7XG5pbXBvcnQgKiBhcyBhY20gZnJvbSAnYXdzLWNkay1saWIvYXdzLWNlcnRpZmljYXRlbWFuYWdlcic7XG5pbXBvcnQgKiBhcyBpYW0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWlhbSc7XG5cblxuZXhwb3J0IGludGVyZmFjZSBIb29kVG9Db2FzdFN0YWNrUHJvcHMgZXh0ZW5kcyBjZGsuU3RhY2tQcm9wcyB7XG4gIGRvbWFpbk5hbWU/OiBzdHJpbmc7XG4gIHN1YmRvbWFpbj86IHN0cmluZztcbiAgcmVnaW9uOiBzdHJpbmc7XG4gIGVudmlyb25tZW50OiBzdHJpbmc7XG4gIHVzZUN1c3RvbURvbWFpbjogYm9vbGVhbjtcbiAgbW9ja01vZGU6IGJvb2xlYW47XG4gIGdlbmVyYXRlRW52RmlsZTogYm9vbGVhbjtcbn1cblxuZXhwb3J0IGNsYXNzIEhvb2RUb0NvYXN0U3RhY2sgZXh0ZW5kcyBjZGsuU3RhY2sge1xuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogSG9vZFRvQ29hc3RTdGFja1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XG5cbiAgICBjb25zdCBmdWxsRG9tYWluTmFtZSA9IHByb3BzLnVzZUN1c3RvbURvbWFpbiAmJiBwcm9wcy5kb21haW5OYW1lICYmIHByb3BzLnN1YmRvbWFpbiBcbiAgICAgID8gYCR7cHJvcHMuc3ViZG9tYWlufS4ke3Byb3BzLmRvbWFpbk5hbWV9YCBcbiAgICAgIDogdW5kZWZpbmVkO1xuXG4gICAgLy8gUzMgQnVja2V0IGZvciBob3N0aW5nIHRoZSBmcm9udGVuZFxuICAgIGNvbnN0IHdlYnNpdGVCdWNrZXQgPSBuZXcgczMuQnVja2V0KHRoaXMsICdXZWJzaXRlQnVja2V0Jywge1xuICAgICAgYnVja2V0TmFtZTogcHJvcHMudXNlQ3VzdG9tRG9tYWluICYmIHByb3BzLmRvbWFpbk5hbWUgJiYgcHJvcHMuc3ViZG9tYWluXG4gICAgICAgID8gYCR7cHJvcHMuZW52aXJvbm1lbnR9LSR7cHJvcHMuc3ViZG9tYWlufS0ke3Byb3BzLmRvbWFpbk5hbWUucmVwbGFjZSgvXFwuL2csICctJyl9YFxuICAgICAgICA6IGAke3Byb3BzLmVudmlyb25tZW50fS1ob29kLXRvLWNvYXN0LXdlYnNpdGUtJHt0aGlzLmFjY291bnR9YCxcbiAgICAgIC8vIFJlbW92ZSB3ZWJzaXRlIGNvbmZpZ3VyYXRpb24gLSB3ZSB3YW50IFMzIG9yaWdpbiwgbm90IHdlYnNpdGUgZW5kcG9pbnRcbiAgICAgIC8vIHdlYnNpdGVJbmRleERvY3VtZW50OiAnaW5kZXguaHRtbCcsXG4gICAgICAvLyB3ZWJzaXRlRXJyb3JEb2N1bWVudDogJ2luZGV4Lmh0bWwnLFxuICAgICAgcHVibGljUmVhZEFjY2VzczogZmFsc2UsXG4gICAgICBibG9ja1B1YmxpY0FjY2VzczogczMuQmxvY2tQdWJsaWNBY2Nlc3MuQkxPQ0tfQUxMLFxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuUkVUQUlOLFxuICAgICAgdmVyc2lvbmVkOiB0cnVlLFxuICAgIH0pO1xuXG4gICAgLy8gQ3JlYXRlIGJ1Y2tldCBwb2xpY3kgdG8gYWxsb3cgQ2xvdWRGcm9udCBhY2Nlc3NcbiAgICBjb25zdCBidWNrZXRQb2xpY3kgPSBuZXcgczMuQnVja2V0UG9saWN5KHRoaXMsICdXZWJzaXRlQnVja2V0UG9saWN5Jywge1xuICAgICAgYnVja2V0OiB3ZWJzaXRlQnVja2V0LFxuICAgIH0pO1xuXG4gICAgLy8gR3JhbnQgQ2xvdWRGcm9udCBhY2Nlc3MgdG8gdGhlIGJ1Y2tldFxuICAgIGJ1Y2tldFBvbGljeS5kb2N1bWVudC5hZGRTdGF0ZW1lbnRzKFxuICAgICAgbmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgICBzaWQ6ICdBbGxvd0Nsb3VkRnJvbnRBY2Nlc3MnLFxuICAgICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXG4gICAgICAgIHByaW5jaXBhbHM6IFtuZXcgaWFtLlNlcnZpY2VQcmluY2lwYWwoJ2Nsb3VkZnJvbnQuYW1hem9uYXdzLmNvbScpXSxcbiAgICAgICAgYWN0aW9uczogWydzMzpHZXRPYmplY3QnXSxcbiAgICAgICAgcmVzb3VyY2VzOiBbd2Vic2l0ZUJ1Y2tldC5hcm5Gb3JPYmplY3RzKCcqJyldLFxuICAgICAgICBjb25kaXRpb25zOiB7XG4gICAgICAgICAgU3RyaW5nRXF1YWxzOiB7XG4gICAgICAgICAgICAnQVdTOlNvdXJjZUFybic6IGBhcm46YXdzOmNsb3VkZnJvbnQ6OiR7dGhpcy5hY2NvdW50fTpkaXN0cmlidXRpb24vKmAsXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgIH0pXG4gICAgKTtcblxuICAgIC8vIENsb3VkRnJvbnQgRGlzdHJpYnV0aW9uXG4gICAgbGV0IGRpc3RyaWJ1dGlvbjogY2xvdWRmcm9udC5EaXN0cmlidXRpb247XG4gICAgXG4gICAgaWYgKHByb3BzLnVzZUN1c3RvbURvbWFpbiAmJiBmdWxsRG9tYWluTmFtZSkge1xuICAgICAgLy8gQ3VzdG9tIGRvbWFpbiBzZXR1cCAtIGxvb2t1cCBob3N0ZWQgem9uZSBvbmNlXG4gICAgICBjb25zdCBob3N0ZWRab25lID0gcm91dGU1My5Ib3N0ZWRab25lLmZyb21Mb29rdXAodGhpcywgJ0hvc3RlZFpvbmUnLCB7XG4gICAgICAgIGRvbWFpbk5hbWU6IHByb3BzLmRvbWFpbk5hbWUhLFxuICAgICAgfSk7XG5cbiAgICAgIGNvbnN0IGNlcnRpZmljYXRlID0gbmV3IGFjbS5DZXJ0aWZpY2F0ZSh0aGlzLCAnQ2VydGlmaWNhdGUnLCB7XG4gICAgICAgIGRvbWFpbk5hbWU6IGZ1bGxEb21haW5OYW1lLFxuICAgICAgICB2YWxpZGF0aW9uOiBhY20uQ2VydGlmaWNhdGVWYWxpZGF0aW9uLmZyb21EbnMoaG9zdGVkWm9uZSksXG4gICAgICB9KTtcblxuICAgICAgZGlzdHJpYnV0aW9uID0gbmV3IGNsb3VkZnJvbnQuRGlzdHJpYnV0aW9uKHRoaXMsICdEaXN0cmlidXRpb24nLCB7XG4gICAgICAgIGRlZmF1bHRCZWhhdmlvcjoge1xuICAgICAgICAgIG9yaWdpbjogbmV3IG9yaWdpbnMuUzNPcmlnaW4od2Vic2l0ZUJ1Y2tldCksXG4gICAgICAgICAgdmlld2VyUHJvdG9jb2xQb2xpY3k6IGNsb3VkZnJvbnQuVmlld2VyUHJvdG9jb2xQb2xpY3kuUkVESVJFQ1RfVE9fSFRUUFMsXG4gICAgICAgICAgYWxsb3dlZE1ldGhvZHM6IGNsb3VkZnJvbnQuQWxsb3dlZE1ldGhvZHMuQUxMT1dfR0VUX0hFQURfT1BUSU9OUyxcbiAgICAgICAgICBjYWNoZWRNZXRob2RzOiBjbG91ZGZyb250LkNhY2hlZE1ldGhvZHMuQ0FDSEVfR0VUX0hFQURfT1BUSU9OUyxcbiAgICAgICAgICBjYWNoZVBvbGljeTogY2xvdWRmcm9udC5DYWNoZVBvbGljeS5DQUNISU5HX09QVElNSVpFRCxcbiAgICAgICAgICBvcmlnaW5SZXF1ZXN0UG9saWN5OiBjbG91ZGZyb250Lk9yaWdpblJlcXVlc3RQb2xpY3kuQUxMX1ZJRVdFUl9FWENFUFRfSE9TVF9IRUFERVIsXG4gICAgICAgIH0sXG4gICAgICAgIGRvbWFpbk5hbWVzOiBbZnVsbERvbWFpbk5hbWVdLFxuICAgICAgICBjZXJ0aWZpY2F0ZSxcbiAgICAgICAgZXJyb3JSZXNwb25zZXM6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICBodHRwU3RhdHVzOiA0MDQsXG4gICAgICAgICAgICByZXNwb25zZUh0dHBTdGF0dXM6IDIwMCxcbiAgICAgICAgICAgIHJlc3BvbnNlUGFnZVBhdGg6ICcvaW5kZXguaHRtbCcsXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgIH0pO1xuXG4gICAgICAvLyBSb3V0ZTUzIEROU1xuICAgICAgbmV3IHJvdXRlNTMuQVJlY29yZCh0aGlzLCAnQWxpYXNSZWNvcmQnLCB7XG4gICAgICAgIHpvbmU6IGhvc3RlZFpvbmUsXG4gICAgICAgIHJlY29yZE5hbWU6IHByb3BzLnN1YmRvbWFpbiEsXG4gICAgICAgIHRhcmdldDogcm91dGU1My5SZWNvcmRUYXJnZXQuZnJvbUFsaWFzKFxuICAgICAgICAgIG5ldyB0YXJnZXRzLkNsb3VkRnJvbnRUYXJnZXQoZGlzdHJpYnV0aW9uKVxuICAgICAgICApLFxuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFNpbXBsZSBDbG91ZEZyb250IHNldHVwIHdpdGhvdXQgY3VzdG9tIGRvbWFpblxuICAgICAgZGlzdHJpYnV0aW9uID0gbmV3IGNsb3VkZnJvbnQuRGlzdHJpYnV0aW9uKHRoaXMsICdEaXN0cmlidXRpb24nLCB7XG4gICAgICAgIGRlZmF1bHRCZWhhdmlvcjoge1xuICAgICAgICAgIG9yaWdpbjogbmV3IG9yaWdpbnMuUzNPcmlnaW4od2Vic2l0ZUJ1Y2tldCksXG4gICAgICAgICAgdmlld2VyUHJvdG9jb2xQb2xpY3k6IGNsb3VkZnJvbnQuVmlld2VyUHJvdG9jb2xQb2xpY3kuUkVESVJFQ1RfVE9fSFRUUFMsXG4gICAgICAgICAgYWxsb3dlZE1ldGhvZHM6IGNsb3VkZnJvbnQuQWxsb3dlZE1ldGhvZHMuQUxMT1dfR0VUX0hFQURfT1BUSU9OUyxcbiAgICAgICAgICBjYWNoZWRNZXRob2RzOiBjbG91ZGZyb250LkNhY2hlZE1ldGhvZHMuQ0FDSEVfR0VUX0hFQURfT1BUSU9OUyxcbiAgICAgICAgICBjYWNoZVBvbGljeTogY2xvdWRmcm9udC5DYWNoZVBvbGljeS5DQUNISU5HX09QVElNSVpFRCxcbiAgICAgICAgICBvcmlnaW5SZXF1ZXN0UG9saWN5OiBjbG91ZGZyb250Lk9yaWdpblJlcXVlc3RQb2xpY3kuQUxMX1ZJRVdFUl9FWENFUFRfSE9TVF9IRUFERVIsXG4gICAgICAgIH0sXG4gICAgICAgIGVycm9yUmVzcG9uc2VzOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgaHR0cFN0YXR1czogNDA0LFxuICAgICAgICAgICAgcmVzcG9uc2VIdHRwU3RhdHVzOiAyMDAsXG4gICAgICAgICAgICByZXNwb25zZVBhZ2VQYXRoOiAnL2luZGV4Lmh0bWwnLFxuICAgICAgICAgIH0sXG4gICAgICAgIF0sXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyBHZW5lcmF0ZSBlbnZpcm9ubWVudCBmaWxlIGZvciB3ZWItYXBwIGlmIHJlcXVlc3RlZFxuICAgIGlmIChwcm9wcy5nZW5lcmF0ZUVudkZpbGUpIHtcbiAgICAgIHRoaXMuZ2VuZXJhdGVFbnZpcm9ubWVudEZpbGUocHJvcHMsIGRpc3RyaWJ1dGlvbi5kaXN0cmlidXRpb25Eb21haW5OYW1lKTtcbiAgICB9XG5cbiAgICAvLyBPdXRwdXRzXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1dlYnNpdGVVcmwnLCB7XG4gICAgICB2YWx1ZTogcHJvcHMudXNlQ3VzdG9tRG9tYWluICYmIGZ1bGxEb21haW5OYW1lIFxuICAgICAgICA/IGBodHRwczovLyR7ZnVsbERvbWFpbk5hbWV9YCBcbiAgICAgICAgOiBgaHR0cHM6Ly8ke2Rpc3RyaWJ1dGlvbi5kaXN0cmlidXRpb25Eb21haW5OYW1lfWAsXG4gICAgICBkZXNjcmlwdGlvbjogJ1dlYnNpdGUgVVJMJyxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdEaXN0cmlidXRpb25JZCcsIHtcbiAgICAgIHZhbHVlOiBkaXN0cmlidXRpb24uZGlzdHJpYnV0aW9uSWQsXG4gICAgICBkZXNjcmlwdGlvbjogJ0Nsb3VkRnJvbnQgRGlzdHJpYnV0aW9uIElEJyxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdTM0J1Y2tldE5hbWUnLCB7XG4gICAgICB2YWx1ZTogd2Vic2l0ZUJ1Y2tldC5idWNrZXROYW1lLFxuICAgICAgZGVzY3JpcHRpb246ICdTMyBCdWNrZXQgTmFtZSBmb3IgV2Vic2l0ZScsXG4gICAgfSk7XG5cbiAgICAvLyBNb2NrIG1vZGUgc3BlY2lmaWMgb3V0cHV0c1xuICAgIGlmIChwcm9wcy5tb2NrTW9kZSkge1xuICAgICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ01vY2tNb2RlSW5mbycsIHtcbiAgICAgICAgdmFsdWU6ICdBcHBsaWNhdGlvbiBpcyBydW5uaW5nIGluIE1PQ0sgTU9ERSAtIGFsbCBkYXRhIGlzIGxvY2FsIG1vY2sgZGF0YScsXG4gICAgICAgIGRlc2NyaXB0aW9uOiAnTW9jayBNb2RlIEluZm9ybWF0aW9uJyxcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgZ2VuZXJhdGVFbnZpcm9ubWVudEZpbGUoXG4gICAgcHJvcHM6IEhvb2RUb0NvYXN0U3RhY2tQcm9wcywgXG4gICAgZGlzdHJpYnV0aW9uRG9tYWluOiBzdHJpbmdcbiAgKSB7XG4gICAgY29uc3QgZW52Q29udGVudCA9IGAjIEVudmlyb25tZW50IGNvbmZpZ3VyYXRpb24gZm9yIEhvb2QgdG8gQ29hc3QgVGltZSBUcmFja2VyXG4jIEdlbmVyYXRlZCBieSBDREsgZGVwbG95bWVudCAtIERPIE5PVCBFRElUIE1BTlVBTExZXG5cbiMgTW9jayBNb2RlIENvbmZpZ3VyYXRpb25cblZJVEVfTU9DS19NT0RFPSR7cHJvcHMubW9ja01vZGV9XG5cbiMgQVdTIENvbmZpZ3VyYXRpb25cblZJVEVfQVdTX1JFR0lPTj0ke3Byb3BzLnJlZ2lvbn1cblZJVEVfRU5WSVJPTk1FTlQ9JHtwcm9wcy5lbnZpcm9ubWVudH1cblxuIyBEb21haW4gQ29uZmlndXJhdGlvblxuVklURV9VU0VfQ1VTVE9NX0RPTUFJTj0ke3Byb3BzLnVzZUN1c3RvbURvbWFpbn1cbiR7cHJvcHMuZG9tYWluTmFtZSA/IGBWSVRFX0RPTUFJTl9OQU1FPSR7cHJvcHMuZG9tYWluTmFtZX1gIDogJyd9XG4ke3Byb3BzLnN1YmRvbWFpbiA/IGBWSVRFX1NVQkRPTUFJTj0ke3Byb3BzLnN1YmRvbWFpbn1gIDogJyd9XG5cbiMgV2Vic2l0ZSBVUkxcblZJVEVfV0VCU0lURV9VUkw9aHR0cHM6Ly8ke2Rpc3RyaWJ1dGlvbkRvbWFpbn1cblxuIyBNb2NrIE1vZGUgTm90ZVxuJHtwcm9wcy5tb2NrTW9kZSA/ICcjIFJ1bm5pbmcgaW4gTU9DSyBNT0RFIC0gYWxsIGRhdGEgaXMgbG9jYWwgbW9jayBkYXRhJyA6ICcjIFJ1bm5pbmcgaW4gUFJPRFVDVElPTiBNT0RFIC0gcmVxdWlyZXMgQVBJIGVuZHBvaW50cyd9XG5gO1xuXG4gICAgLy8gT3V0cHV0IHRoZSBlbnZpcm9ubWVudCBmaWxlIGNvbnRlbnQgZm9yIG1hbnVhbCBkZXBsb3ltZW50XG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0Vudmlyb25tZW50RmlsZUNvbnRlbnQnLCB7XG4gICAgICB2YWx1ZTogZW52Q29udGVudCxcbiAgICAgIGRlc2NyaXB0aW9uOiAnRW52aXJvbm1lbnQgZmlsZSBjb250ZW50IHRvIGNvcHkgdG8gd2ViLWFwcC8uZW52LnByb2R1Y3Rpb24nLFxuICAgIH0pO1xuICB9XG59XG4iXX0=