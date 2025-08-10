# Configuration Guide

## Environment Configuration

This application can be configured for different environments (development, production) by modifying the configuration files.

### Web App Configuration

The main configuration is located in `src/config/environment.ts`. This file contains:

- **API Base URL**: The base URL for API calls
- **Environment**: Current environment name
- **App Name**: Application display name
- **Version**: Application version

### Environment Variables

You can override configuration using environment variables:

```bash
# Development
VITE_API_BASE_URL=http://localhost:3000/api
VITE_APP_ENV=development



# Production
VITE_API_BASE_URL=https://api.example.com
VITE_APP_ENV=production
```

### Infrastructure Configuration

The CDK infrastructure configuration is located in `../infrastructure/config/environments.ts`.

To deploy to a specific environment:

```bash
# Deploy to development
cd infrastructure
yarn cdk deploy -- development



# Deploy to production
yarn cdk deploy -- production
```

### Customizing for Your Environment

1. **Update Domain Configuration**: Modify `infrastructure/config/environments.ts` with your domain details
2. **Update API Endpoints**: Modify `web-app/src/config/environment.ts` with your API endpoints
3. **Environment Variables**: Create a `.env` file based on `.env.example` for local development

### Security Notes

- Never commit sensitive information like API keys or database credentials
- Use environment variables for configuration that varies between environments
- The `infrastructure/config/local.ts` file is designed to be gitignored for local customizations
