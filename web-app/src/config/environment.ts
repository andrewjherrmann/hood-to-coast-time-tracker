// Configuration for Hood to Coast Time Tracker
// Supports both mock mode and deployed mode

// Environment detection
const isDevelopment = process.env.NODE_ENV === 'development';

// Mock mode can be controlled via environment variable or localStorage
// For development, you can toggle between mock and API mode
const getMockModeFromStorage = () => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('htc-mock-mode');
    if (stored !== null) {
      return stored === 'true';
    }
  }
  return null;
};

const isMockMode = getMockModeFromStorage() ?? 
                   (import.meta.env.VITE_MOCK_MODE === 'true' || 
                   isDevelopment);

// API configuration
export const apiBaseUrl = isMockMode 
  ? 'http://localhost:3000/api' 
  : import.meta.env.VITE_API_URL || 'https://htcapi.dev.your-domain.com';

export const apiKey = import.meta.env.VITE_API_KEY || 'your-api-key-here';

export const environment = isDevelopment ? 'development' : 'production';
export const appName = 'Hood to Coast Time Tracker';
export const version = '1.0.0';

// Mock mode configuration
export const useMockData = isMockMode;

// Function to toggle mock mode (for development)
export const toggleMockMode = (useMock: boolean) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('htc-mock-mode', useMock.toString());
    // Reload the page to apply the new mode
    window.location.reload();
  }
};

// Function to get current mock mode status
export const getMockModeStatus = () => ({
  isMockMode,
  canToggle: typeof window !== 'undefined',
  localStorageValue: typeof window !== 'undefined' ? localStorage.getItem('htc-mock-mode') : null,
});

// Debug logging (development only)
if (isDevelopment) {
  console.log('Environment config debug:', {
    NODE_ENV: process.env.NODE_ENV,
    VITE_MOCK_MODE: import.meta.env.VITE_MOCK_MODE,
    VITE_ENVIRONMENT: import.meta.env.VITE_ENVIRONMENT,
    isDevelopment,
    isMockMode,
    useMockData
  });
}

// CDK deployment configuration
export const cdkConfig = {
  region: process.env.VITE_AWS_REGION || 'us-east-1',
  environment: process.env.VITE_ENVIRONMENT || 'development',
  useCustomDomain: process.env.VITE_USE_CUSTOM_DOMAIN === 'true',
  domainName: process.env.VITE_DOMAIN_NAME,
  subdomain: process.env.VITE_SUBDOMAIN,
};

// Cognito configuration
export const cognitoConfig = {
  userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID || '',
  clientId: import.meta.env.VITE_COGNITO_CLIENT_ID || '',
  domain: import.meta.env.VITE_COGNITO_DOMAIN || '',
};

