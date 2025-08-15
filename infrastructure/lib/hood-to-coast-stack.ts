import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as iam from 'aws-cdk-lib/aws-iam';


export interface HoodToCoastStackProps extends cdk.StackProps {
  domainName?: string;
  subdomain?: string;
  region: string;
  environment: string;
  useCustomDomain: boolean;
  mockMode: boolean;
  generateEnvFile: boolean;
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
    
    if (props.useCustomDomain && fullDomainName) {
      // Custom domain setup - lookup hosted zone once
      const hostedZone = route53.HostedZone.fromLookup(this, 'HostedZone', {
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

      // Route53 DNS
      new route53.ARecord(this, 'AliasRecord', {
        zone: hostedZone,
        recordName: props.subdomain!,
        target: route53.RecordTarget.fromAlias(
          new targets.CloudFrontTarget(distribution)
        ),
      });
    } else {
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
`;

    // Output the environment file content for manual deployment
    new cdk.CfnOutput(this, 'EnvironmentFileContent', {
      value: envContent,
      description: 'Environment file content to copy to web-app/.env.production',
    });
  }
}
