# Configuration & Deployment Guide

## Overview

This project has been updated to use a parameterized configuration system that eliminates hardcoded environment-specific values. All configuration is now centralized and easily customizable for different environments.

## What Was Changed

### Before (Hardcoded Values)
- Domain: `yourdomain.com` (hardcoded)
- Subdomain: `yourapp` (hardcoded)
- Team Name: `YourTeamName` (hardcoded)
- AWS Region: `us-east-1` (hardcoded)
- API Base URL: `https://api.example.com` (hardcoded)

### After (Parameterized)
- All values are now configurable through environment-specific configuration files
- Support for multiple environments (development, production)
- Easy deployment to different environments
- Local development configuration that doesn't affect shared code

## Configuration Files

### Infrastructure Configuration

#### `infrastructure/config/environments.ts`
Contains the main configuration for all environments:
```typescript
export const environments = {
  development: {
    domainName: 'example.com',
    subdomain: 'dev',
    region: 'us-east-1',
    environment: 'development',
    teamName: 'DevelopmentTeam',
    description: 'Hood to Coast Time Tracker - Development Environment'
  },
  // ... production config
};
```

#### `infrastructure/config/local.ts`
For local development customizations (not committed to git):
```typescript
export const localConfig: Partial<EnvironmentConfig> = {
  // Uncomment and customize these values for your local development
  // domainName: 'yourdomain.com',
  // subdomain: 'dev',
  // region: 'us-east-1',
  // teamName: 'YourTeamName',
};
```

### Web App Configuration

#### `web-app/src/config/environment.ts`
Contains frontend configuration:
```typescript
const configs = {
  development: {
    apiBaseUrl: 'http://localhost:3000/api',
    environment: 'development',
    appName: 'Hood to Coast Time Tracker',
    version: '1.0.0'
  },
  // ... production config
};
```

## Deployment

### Using Deployment Scripts

#### Bash (Linux/Mac)
```bash
# Deploy to development
./infrastructure/scripts/deploy.sh development



# Deploy to production
./infrastructure/scripts/deploy.sh production

# Other actions
./infrastructure/scripts/deploy.sh development diff
./infrastructure/scripts/deploy.sh production destroy
```

#### PowerShell (Windows)
```powershell
# Deploy to development
.\infrastructure\scripts\deploy.ps1 development



# Deploy to production
.\infrastructure\scripts\deploy.ps1 production

# Other actions
.\infrastructure\scripts\deploy.ps1 development diff
.\infrastructure\scripts\deploy.ps1 production destroy
```

### Manual CDK Commands
```bash
cd infrastructure

# Deploy to specific environment
yarn cdk deploy -- development
yarn cdk deploy -- production

# Other CDK commands
yarn cdk diff -- development
yarn cdk synth -- production
```

## Customizing for Your Environment

### 1. Update Domain Configuration
Edit `infrastructure/config/environments.ts`:
```typescript
export const environments = {
  development: {
    domainName: 'yourdomain.com',        // Your domain
    subdomain: 'dev',                   // Your subdomain
    region: 'us-east-1',                // Your preferred region
    environment: 'development',
    teamName: 'YourTeamName',           // Your team name
    description: 'Your description'
  },
  // ... update other environments
};
```

### 2. Update API Endpoints
Edit `web-app/src/config/environment.ts`:
```typescript
const configs = {
  development: {
    apiBaseUrl: 'http://localhost:3000/api',  // Your local API
    // ... other config
  },
  production: {
    apiBaseUrl: 'https://api.yourdomain.com',  // Your production API
    // ... other config
  }
};
```

### 3. Local Development Overrides
Create `infrastructure/config/local.ts` (not committed to git):
```typescript
export const localConfig: Partial<EnvironmentConfig> = {
  domainName: 'yourdomain.com',
  subdomain: 'dev',
  region: 'us-east-1',
  teamName: 'YourTeamName',
};
```

## Environment Variables

### Web App Environment Variables
Create a `.env` file in the `web-app` directory:
```bash
# Development
VITE_API_BASE_URL=http://localhost:3000/api
VITE_APP_ENV=development

# Production
VITE_API_BASE_URL=https://api.yourdomain.com
VITE_APP_ENV=production
```

## Security Best Practices

1. **Never commit sensitive information** like API keys or database credentials
2. **Use environment variables** for configuration that varies between environments
3. **The `local.ts` file is gitignored** for local customizations
4. **Review all configuration files** before committing to ensure no personal information is included

## File Structure

```
├── infrastructure/
│   ├── config/
│   │   ├── environments.ts      # Main environment configs
│   │   └── local.ts            # Local overrides (gitignored)
│   ├── scripts/
│   │   ├── deploy.sh           # Bash deployment script
│   │   └── deploy.ps1          # PowerShell deployment script
│   └── bin/
│       └── app.ts              # Updated to use config system
├── web-app/
│   ├── src/
│   │   └── config/
│   │       └── environment.ts   # Frontend configuration
│   └── CONFIGURATION.md        # Web app config guide
└── .gitignore                  # Updated to exclude local configs
```

## Troubleshooting

### Common Issues

1. **Configuration not found**: Ensure the environment name matches exactly (case-sensitive)
2. **Deployment fails**: Check that your AWS credentials are configured correctly
3. **API calls fail**: Verify the API base URL in the frontend configuration

### Getting Help

- Check the configuration files for syntax errors
- Verify environment variable names and values
- Ensure all required dependencies are installed
- Review the CDK deployment logs for detailed error messages

## Next Steps

1. **Customize the configuration** for your domain and environment
2. **Test the deployment** to development environment first
3. **Update the documentation** with your specific configuration details
4. **Share the configuration approach** with your team members
