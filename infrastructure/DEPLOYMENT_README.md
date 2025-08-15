# Hood to Coast Time Tracker - Deployment Guide

This guide explains how to deploy the Hood to Coast Time Tracker web application using AWS CDK, with support for mock mode deployment.

## Current Status: Mock Mode Only

**Important**: This deployment is currently configured for **mock mode only**. The application will run entirely in the browser with local mock data. No backend services (Lambda functions, API Gateway, DynamoDB) are deployed.

## Prerequisites

1. **AWS CLI configured** with appropriate credentials
2. **Node.js 18+** and **Yarn** installed
3. **AWS CDK CLI** installed globally: `npm install -g aws-cdk`
4. **CDK bootstrapped** in your AWS account: `cdk bootstrap`

## What Gets Deployed

### Infrastructure (CDK Stack)
- **S3 Bucket**: Private bucket for hosting static files
- **CloudFront Distribution**: Global CDN for fast content delivery
- **Route53 DNS** (optional): Custom domain support if configured

### Web Application
- **Static Files**: Built Vue.js application
- **Environment Configuration**: Auto-generated for mock mode
- **Mock Data**: All data is local browser storage

## Environment Configuration

The application currently supports one deployment mode:

- **Mock Mode**: All data is local mock data, no backend required

### Mock Mode Features

- **Data Source**: Local mock data from `mock-data.ts`
- **API Calls**: Disabled, uses in-memory data
- **Authentication**: Simulated with localStorage
- **Persistence**: Browser localStorage only

## Deployment Options

### 1. Complete Deployment (Recommended)

Deploys both infrastructure and web-app:

```powershell
# From infrastructure/scripts directory
.\deploy-complete.ps1 -Environment development
```

### 2. Infrastructure Only

Deploys only the CDK stack (S3, CloudFront):

```powershell
.\deploy-complete.ps1 -Environment development -InfrastructureOnly
```

### 3. Web App Only

Deploys only the web application (requires infrastructure to be deployed first):

```powershell
.\deploy-complete.ps1 -Environment development -WebAppOnly
```

### 4. Skip Build

Useful for re-deploying without rebuilding:

```powershell
.\deploy-complete.ps1 -Environment development -WebAppOnly -SkipBuild
```

## Deployment Process

### Step 1: Infrastructure Deployment

1. **CDK Stack**: Creates S3 bucket and CloudFront distribution
2. **Environment Generation**: Creates `.env.production` file with mock mode configuration
3. **Outputs**: Provides URLs and resource names for web-app deployment

### Step 2: Web App Deployment

1. **Environment Setup**: Uses generated `.env.production` file
2. **Build**: Compiles Vue.js application with production settings
3. **Upload**: Syncs built files to S3 bucket
4. **Distribution**: CloudFront serves the application

## Environment Variables

The deployment automatically generates these environment variables:

```bash
# Mock Mode Configuration
VITE_MOCK_MODE=true

# AWS Configuration
VITE_AWS_REGION=us-east-1
VITE_ENVIRONMENT=development

# Domain Configuration
VITE_USE_CUSTOM_DOMAIN=false

# Website URL
VITE_WEBSITE_URL=https://cloudfront-domain.cloudfront.net

# Mock Mode Note
# Running in MOCK MODE - all data is local mock data
```

## Manual Deployment Steps

If you prefer to deploy manually:

### 1. Deploy Infrastructure

```bash
cd infrastructure
yarn build
yarn cdk deploy
```

### 2. Create Environment File

Copy the `EnvironmentFileContent` from CDK outputs to `web-app/.env.production`

### 3. Build Web App

```bash
cd web-app
yarn build
```

### 4. Deploy to S3

```bash
# Get bucket name from CDK outputs
aws s3 sync dist/spa/* s3://your-bucket-name --delete
```

## Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Browser  │───▶│   CloudFront    │───▶│   S3 Bucket    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   Static Files  │
                       │   (Mock Mode)   │
                       └─────────────────┘
```

## Future Backend Integration

When you're ready to add backend functionality, the infrastructure can be extended with:

- **Lambda Functions**: For API endpoints
- **API Gateway**: For REST API management
- **DynamoDB**: For data persistence
- **Cognito**: For user authentication

The current mock mode setup provides a solid foundation for testing the frontend before adding backend complexity.

## Troubleshooting

### Common Issues

1. **CDK Not Bootstrapped**
   ```bash
   cdk bootstrap aws://ACCOUNT-NUMBER/REGION
   ```

2. **Permission Errors**
   - Ensure AWS CLI has appropriate permissions
   - Check IAM roles and policies

3. **Build Failures**
   - Verify Node.js version (18+)
   - Check yarn dependencies
   - Review TypeScript compilation errors

4. **Deployment Failures**
   - Check CloudFormation events in AWS Console
   - Verify resource limits and quotas
   - Review CDK diff: `yarn cdk diff`

### Useful Commands

```bash
# Check CDK status
yarn cdk list

# View stack details
yarn cdk describe

# Destroy stack
yarn cdk destroy

# View CloudFormation events
aws cloudformation describe-stack-events --stack-name HoodToCoastStack
```

## Security Considerations

- **S3 Bucket**: Private with CloudFront access only
- **CloudFront**: HTTPS only, security headers configured
- **No Backend**: No Lambda functions or databases to secure

## Cost Optimization

- **Development**: Use `cdk destroy` when not actively developing
- **Production**: Monitor CloudWatch metrics and set up billing alerts
- **S3**: Lifecycle policies for old versions
- **CloudFront**: Use appropriate cache policies
- **No Lambda**: No compute costs during idle periods

## Next Steps

1. **Test Mock Mode**: Deploy and test the application with mock data
2. **Iterate Frontend**: Make UI/UX improvements based on testing
3. **Plan Backend**: Design API endpoints and data models
4. **Add Backend**: Extend infrastructure with Lambda functions and databases
5. **Migrate Data**: Move from mock mode to real backend integration
