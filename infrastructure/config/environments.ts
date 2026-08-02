export interface AuthConfig {
  googleClientId?: string;
  googleClientSecret?: string;
  microsoftClientId?: string;
  microsoftClientSecret?: string;
  callbackUrls: string[];
  logoutUrls: string[];
}

export interface EnvironmentConfig {
  region: string;
  environment: string;
  description: string;
  mockMode: boolean;
  generateEnvFile: boolean;
  auth?: AuthConfig;
}

export const environments: Record<string, EnvironmentConfig> = {
  development: {
    region: 'us-east-1',
    environment: 'development',
    description: 'Hood to Coast Time Tracker - Development Environment',
    mockMode: true,
    generateEnvFile: true
  },
  production: {
    region: 'us-east-1',
    environment: 'production',
    description: 'Hood to Coast Time Tracker - Production Environment',
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
