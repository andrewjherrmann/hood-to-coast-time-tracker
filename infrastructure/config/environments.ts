export interface EnvironmentConfig {
  domainName?: string;
  subdomain?: string;
  region: string;
  environment: string;
  teamName: string;
  description: string;
  useCustomDomain: boolean;
  mockMode: boolean;
  generateEnvFile: boolean;
}

export const environments: Record<string, EnvironmentConfig> = {
  development: {
    region: 'us-east-1',
    environment: 'development',
    teamName: 'DevelopmentTeam',
    description: 'Hood to Coast Time Tracker - Development Environment',
    useCustomDomain: false,
    mockMode: true,
    generateEnvFile: true
  },
  production: {
    region: 'us-east-1',
    environment: 'production',
    teamName: 'ProductionTeam',
    description: 'Hood to Coast Time Tracker - Production Environment',
    useCustomDomain: false,
    mockMode: false,
    generateEnvFile: true
  }
};

export function getEnvironmentConfig(env: string): EnvironmentConfig {
  const config = environments[env];
  if (!config) {
    throw new Error(`Environment '${env}' not found. Available environments: ${Object.keys(environments).join(', ')}`);
  }
  return config;
}
