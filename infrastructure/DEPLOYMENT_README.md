# Hood to Coast Time Tracker - Deployment Guide

This guide explains how to deploy the Hood to Coast Time Tracker web application using AWS CDK, with a simplified backend API approach.

## Current Status: Simplified Backend API

**Important**: This deployment currently uses a **simplified backend approach** with static API endpoints using API Gateway MockIntegration. This provides a working API foundation that can be incrementally enhanced with Lambda functions later.

## Prerequisites

1. **AWS CLI configured** with appropriate credentials
2. **Node.js 18+** and **Yarn** installed
3. **AWS CDK CLI** installed globally: `npm install -g aws-cdk`
4. **CDK bootstrapped** in your AWS account: `cdk bootstrap`

## What Gets Deployed

### Infrastructure (CDK Stack)
- **S3 Bucket**: Private bucket for hosting static files
- **CloudFront Distribution**: Global CDN for fast content delivery
- **Route53 DNS**: Custom domain support for both frontend and API
- **API Gateway**: RESTful API with API key authentication
- **DynamoDB Tables**: Database tables for races, teams, runners, and legs
- **ACM Certificates**: SSL certificates for custom domains

### Web Application
- **Static Files**: Built Vue.js application
- **Environment Configuration**: Auto-generated for production mode
- **API Integration**: Ready to connect to backend API

### Backend API
- **Static Endpoints**: GET/POST endpoints that return predefined responses
- **API Key Authentication**: Secure access control
- **CORS Support**: Configured for frontend integration
- **Custom Domain**: Dedicated API subdomain

## Environment Configuration

The application supports two deployment modes:

- **Mock Mode**: All data is local mock data (frontend only)
- **API Mode**: Frontend connects to backend API endpoints

### API Mode Features

- **Data Source**: Backend API endpoints (currently static responses)
- **API Calls**: Enabled with API key authentication
- **Authentication**: API key-based access control
- **Persistence**: DynamoDB tables (ready for Lambda integration)

## Deployment Options

### 1. Complete Deployment (Recommended)

Deploys both infrastructure and web-app:

```powershell
# From infrastructure/scripts directory
.\deploy-complete.ps1 -Environment development
```

### 2. Backend Only

Deploys only the backend infrastructure (API Gateway, DynamoDB):

```powershell
.\deploy-backend-simple.ps1 -Environment development
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

1. **CDK Stack**: Creates all AWS resources (S3, CloudFront, API Gateway, DynamoDB)
2. **Environment Generation**: Creates `.env.production` file with API configuration
3. **Outputs**: Provides URLs and resource names for web-app deployment

### Step 2: Web App Deployment

1. **Environment Setup**: Uses generated `.env.production` file
2. **Build**: Compiles Vue.js application with production settings
3. **Upload**: Syncs built files to S3 bucket
4. **Distribution**: CloudFront serves the application

## Environment Variables

The deployment automatically generates these environment variables:

```bash
# API Configuration
VITE_MOCK_MODE=false
VITE_API_URL=https://htcapi.dev.your-domain.com
VITE_API_KEY_REQUIRED=true

# AWS Configuration
VITE_AWS_REGION=us-east-1
VITE_ENVIRONMENT=development

# Domain Configuration
VITE_USE_CUSTOM_DOMAIN=true
VITE_DOMAIN_NAME=your-domain.com
VITE_SUBDOMAIN=your-subdomain
```

## API Endpoints

### Available Endpoints

- **GET /races** - Returns static race data
- **POST /races** - Returns mock success response
- **GET /teams** - Returns static team data (when implemented)
- **POST /teams** - Returns mock success response (when implemented)
- **GET /runners** - Returns static runner data (when implemented)
- **POST /runners** - Returns mock success response (when implemented)
- **GET /legs** - Returns static leg data (when implemented)
- **POST /legs** - Returns mock success response (when implemented)

### Authentication

All API endpoints require an API key in the `X-Api-Key` header.

## Next Steps

### Immediate Improvements
- [ ] Add Lambda integration to one endpoint (e.g., GET /races)
- [ ] Implement real DynamoDB operations
- [ ] Add more endpoints with Lambda integration

### Future Enhancements
- [ ] Full CRUD operations for all resources
- [ ] User authentication with Cognito
- [ ] Real-time updates
- [ ] Advanced querying and filtering

## Testing

Test your API endpoints using the provided test script:

```powershell
.\test-api-simple.ps1 -ApiUrl "https://htcapi.dev.your-domain.com" -ApiKey "your-api-key"
```

## Troubleshooting

### Common Issues

1. **403 Forbidden**: Check API key validity and usage plan association
2. **500 Internal Server Error**: Check API Gateway integration configuration
3. **Domain Not Found**: Verify Route53 DNS configuration and propagation

### Debugging Steps

1. Check CloudFormation stack outputs
2. Verify API Gateway method configuration
3. Test API key validity
4. Check CloudWatch logs (when Lambda functions are added)
