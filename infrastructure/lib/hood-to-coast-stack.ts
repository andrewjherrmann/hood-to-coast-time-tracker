import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cognito from 'aws-cdk-lib/aws-cognito';

export interface HoodToCoastStackProps extends cdk.StackProps {
  domainName: string;
  subdomain: string;
  environment: string;
}

export class HoodToCoastStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: HoodToCoastStackProps) {
    super(scope, id, props);

    const fullDomainName = `${props.subdomain}.${props.domainName}`;

    // Cognito User Pool for authentication
    const userPool = new cognito.UserPool(this, 'HoodToCoastUserPool', {
      userPoolName: `${props.environment}-hood-to-coast-users`,
      selfSignUpEnabled: true,
      signInAliases: {
        email: true,
        username: true,
      },
      autoVerify: {
        email: true,
      },
      standardAttributes: {
        email: {
          required: true,
          mutable: true,
        },
        givenName: {
          required: false,
          mutable: true,
        },
        familyName: {
          required: false,
          mutable: true,
        },
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const userPoolClient = new cognito.UserPoolClient(this, 'HoodToCoastUserPoolClient', {
      userPool,
      generateSecret: false,
      authFlows: {
        adminUserPassword: true,
        userPassword: true,
        userSrp: true,
      },
      oAuth: {
        flows: {
          implicitCodeGrant: true,
        },
        callbackUrls: [`https://${fullDomainName}/auth/callback`],
        logoutUrls: [`https://${fullDomainName}/auth/logout`],
      },
    });

    // DynamoDB Tables
    const teamsTable = new dynamodb.Table(this, 'TeamsTable', {
      tableName: `${props.environment}-teams`,
      partitionKey: { name: 'teamId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      pointInTimeRecovery: true,
    });

    const legsTable = new dynamodb.Table(this, 'LegsTable', {
      tableName: `${props.environment}-legs`,
      partitionKey: { name: 'teamId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'legNumber', type: dynamodb.AttributeType.NUMBER },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      pointInTimeRecovery: true,
    });

    const timesTable = new dynamodb.Table(this, 'TimesTable', {
      tableName: `${props.environment}-times`,
      partitionKey: { name: 'teamId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      pointInTimeRecovery: true,
    });

    const yearsTable = new dynamodb.Table(this, 'YearsTable', {
      tableName: `${props.environment}-years`,
      partitionKey: { name: 'year', type: dynamodb.AttributeType.NUMBER },
      sortKey: { name: 'teamId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      pointInTimeRecovery: true,
    });

    // Lambda Functions
    const commonLambdaProps: lambda.FunctionProps = {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      environment: {
        TEAMS_TABLE: teamsTable.tableName,
        LEGS_TABLE: legsTable.tableName,
        TIMES_TABLE: timesTable.tableName,
        YEARS_TABLE: yearsTable.tableName,
        USER_POOL_ID: userPool.userPoolId,
        USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
        REGION: this.region,
      },
      logRetention: logs.RetentionDays.ONE_WEEK,
    };

    const authLambda = new lambda.Function(this, 'AuthLambda', {
      ...commonLambdaProps,
      functionName: `${props.environment}-auth-lambda`,
      code: lambda.Code.fromAsset('lambda/auth'),
      timeout: cdk.Duration.seconds(30),
    });

    const teamsLambda = new lambda.Function(this, 'TeamsLambda', {
      ...commonLambdaProps,
      functionName: `${props.environment}-teams-lambda`,
      code: lambda.Code.fromAsset('lambda/teams'),
      timeout: cdk.Duration.seconds(30),
    });

    const legsLambda = new lambda.Function(this, 'LegsLambda', {
      ...commonLambdaProps,
      functionName: `${props.environment}-legs-lambda`,
      code: lambda.Code.fromAsset('lambda/legs'),
      timeout: cdk.Duration.seconds(30),
    });

    const timesLambda = new lambda.Function(this, 'TimesLambda', {
      ...commonLambdaProps,
      functionName: `${props.environment}-times-lambda`,
      code: lambda.Code.fromAsset('lambda/times'),
      timeout: cdk.Duration.seconds(30),
    });

    const yearsLambda = new lambda.Function(this, 'YearsLambda', {
      ...commonLambdaProps,
      functionName: `${props.environment}-years-lambda`,
      code: lambda.Code.fromAsset('lambda/years'),
      timeout: cdk.Duration.seconds(30),
    });

    // Grant DynamoDB permissions to Lambda functions
    teamsTable.grantReadWriteData(teamsLambda);
    legsTable.grantReadWriteData(legsLambda);
    timesTable.grantReadWriteData(timesLambda);
    yearsTable.grantReadWriteData(yearsLambda);

    // API Gateway
    const api = new apigateway.RestApi(this, 'HoodToCoastApi', {
      restApiName: `${props.environment}-hood-to-coast-api`,
      description: 'Hood to Coast Time Tracker API',
      defaultCorsPreflightOptions: {
        allowOrigins: [`https://${fullDomainName}`],
        allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowHeaders: ['Content-Type', 'Authorization', 'X-Amz-Date', 'X-Api-Key', 'X-Amz-Security-Token'],
        allowCredentials: true,
      },
    });

    // Authorizer
    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'HoodToCoastAuthorizer', {
      cognitoUserPools: [userPool],
    });

    // API Resources and Methods
    const authResource = api.root.addResource('auth');
    authResource.addMethod('POST', new apigateway.LambdaIntegration(authLambda));

    const teamsResource = api.root.addResource('teams');
    teamsResource.addMethod('GET', new apigateway.LambdaIntegration(teamsLambda));
    teamsResource.addMethod('POST', new apigateway.LambdaIntegration(teamsLambda), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });
    teamsResource.addMethod('PUT', new apigateway.LambdaIntegration(teamsLambda), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    const legsResource = api.root.addResource('legs');
    legsResource.addMethod('GET', new apigateway.LambdaIntegration(legsLambda));
    legsResource.addMethod('POST', new apigateway.LambdaIntegration(legsLambda), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });
    legsResource.addMethod('PUT', new apigateway.LambdaIntegration(legsLambda), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    const timesResource = api.root.addResource('times');
    timesResource.addMethod('GET', new apigateway.LambdaIntegration(timesLambda));
    timesResource.addMethod('POST', new apigateway.LambdaIntegration(timesLambda), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });
    timesResource.addMethod('PUT', new apigateway.LambdaIntegration(timesLambda), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    const yearsResource = api.root.addResource('years');
    yearsResource.addMethod('GET', new apigateway.LambdaIntegration(yearsLambda));
    yearsResource.addMethod('POST', new apigateway.LambdaIntegration(yearsLambda), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // S3 Bucket for hosting the frontend
    const websiteBucket = new s3.Bucket(this, 'WebsiteBucket', {
      bucketName: `${props.environment}-${props.subdomain}-${props.domainName.replace(/\./g, '-')}`,
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'index.html',
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      versioned: true,
    });

    // CloudFront Distribution
    const certificate = new acm.Certificate(this, 'Certificate', {
      domainName: fullDomainName,
      validation: acm.CertificateValidation.fromDns(
        route53.HostedZone.fromLookup(this, 'HostedZone', {
          domainName: props.domainName,
        })
      ),
    });

    const distribution = new cloudfront.Distribution(this, 'Distribution', {
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
    const hostedZone = route53.HostedZone.fromLookup(this, 'HostedZone', {
      domainName: props.domainName,
    });

    new route53.ARecord(this, 'AliasRecord', {
      zone: hostedZone,
      recordName: props.subdomain,
      target: route53.RecordTarget.fromAlias(
        new targets.CloudFrontTarget(distribution)
      ),
    });

    // Outputs
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'API Gateway URL',
    });

    new cdk.CfnOutput(this, 'UserPoolId', {
      value: userPool.userPoolId,
      description: 'Cognito User Pool ID',
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID',
    });

    new cdk.CfnOutput(this, 'WebsiteUrl', {
      value: `https://${fullDomainName}`,
      description: 'Website URL',
    });

    new cdk.CfnOutput(this, 'DistributionId', {
      value: distribution.distributionId,
      description: 'CloudFront Distribution ID',
    });
  }
}
