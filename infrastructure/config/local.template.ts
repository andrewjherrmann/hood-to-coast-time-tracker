import { EnvironmentConfig } from './environments';

// TEMPLATE: Local development configuration
// Copy this file to local.ts and customize for your environment
// This file IS committed to source control as a template
// The actual local.ts file should NEVER be committed

export const localConfig: Partial<EnvironmentConfig> = {
  // Uncomment and customize these values for your environment
  
  // Domain configuration (only if using custom domain)
  // domainName: 'yourdomain.com',
  // subdomain: 'dev', // or 'staging', 'htc', etc.
  
  // AWS region (optional, defaults to us-east-1)
  // region: 'us-east-1',
  
  // Team name (optional, defaults to DevelopmentTeam)
  // teamName: 'YourTeamName',
  
  // Enable custom domain (only if you have a domain)
  // useCustomDomain: false,
};

// Override function to merge local config with environment defaults
export function getLocalEnvironmentConfig(env: string): EnvironmentConfig {
  const baseConfig = require('./environments').getEnvironmentConfig(env);
  return { ...baseConfig, ...localConfig };
}
