export interface AppConfig {
  apiBaseUrl: string;
  environment: string;
  appName: string;
  version: string;
}

// Environment-specific configurations
const configs: Record<string, AppConfig> = {
  development: {
    apiBaseUrl: 'http://localhost:3000/api',
    environment: 'development',
    appName: 'Hood to Coast Time Tracker',
    version: '1.0.0'
  },
  production: {
    apiBaseUrl: 'https://api.example.com',
    environment: 'production',
    appName: 'Hood to Coast Time Tracker',
    version: '1.0.0'
  }
};

// Get current environment from build process or default to development
const currentEnv = import.meta.env.MODE || 'development';
export const config = configs[currentEnv] || configs.development;

// Export individual values for convenience
export const { apiBaseUrl, environment, appName, version } = config;
