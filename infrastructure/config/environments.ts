export interface EnvironmentConfig {
  domainName: string;
  subdomain: string;
  region: string;
  environment: string;
  teamName: string;
  description: string;
}

export const environments: Record<string, EnvironmentConfig> = {
  development: {
    domainName: 'example.com',
    subdomain: 'dev',
    region: 'us-east-1',
    environment: 'development',
    teamName: 'DevelopmentTeam',
    description: 'Hood to Coast Time Tracker - Development Environment'
  },
  production: {
    domainName: 'example.com',
    subdomain: 'app',
    region: 'us-west-2',
    environment: 'production',
    teamName: 'ProductionTeam',
    description: 'Hood to Coast Time Tracker - Production Environment'
  }
};

export function getEnvironmentConfig(env: string): EnvironmentConfig {
  const config = environments[env];
  if (!config) {
    throw new Error(`Environment '${env}' not found. Available environments: ${Object.keys(environments).join(', ')}`);
  }
  return config;
}
