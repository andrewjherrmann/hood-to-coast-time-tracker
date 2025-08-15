// Configuration for Hood to Coast Time Tracker
// Supports both mock mode and deployed mode

// Environment detection
const isDevelopment = process.env.NODE_ENV === 'development';
const isMockMode = process.env.VITE_MOCK_MODE === 'true' || isDevelopment;

// API configuration
export const apiBaseUrl = isMockMode 
  ? 'http://localhost:3000/api' 
  : process.env.VITE_API_URL || 'https://api.example.com'; // Will be replaced by CDK deployment

export const environment = isDevelopment ? 'development' : 'production';
export const appName = 'Hood to Coast Time Tracker';
export const version = '1.0.0';

// Mock mode configuration
export const useMockData = isMockMode;

// CDK deployment configuration
export const cdkConfig = {
  region: process.env.VITE_AWS_REGION || 'us-east-1',
  environment: process.env.VITE_ENVIRONMENT || 'development',
  useCustomDomain: process.env.VITE_USE_CUSTOM_DOMAIN === 'true',
  domainName: process.env.VITE_DOMAIN_NAME,
  subdomain: process.env.VITE_SUBDOMAIN,
};
