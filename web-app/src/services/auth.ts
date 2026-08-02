/**
 * Cognito Authentication Service
 *
 * Handles federated sign-in (Google, Microsoft) via Cognito Hosted UI,
 * token management, and session persistence.
 *
 * When auth config is not yet provided (no VITE_COGNITO_USER_POOL_ID),
 * falls back to mock authentication for local development.
 */

import {
  CognitoUserPool,
  CognitoUser,
  CognitoUserSession,
  CognitoIdToken,
  CognitoAccessToken,
  CognitoRefreshToken,
} from 'amazon-cognito-identity-js';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  givenName?: string;
  familyName?: string;
  isAdmin: boolean;
}

export interface AuthTokens {
  idToken: string;
  accessToken: string;
  refreshToken: string;
}

// Configuration from environment variables
const COGNITO_USER_POOL_ID = import.meta.env.VITE_COGNITO_USER_POOL_ID || '';
const COGNITO_CLIENT_ID = import.meta.env.VITE_COGNITO_CLIENT_ID || '';
const COGNITO_DOMAIN = import.meta.env.VITE_COGNITO_DOMAIN || '';
const AUTH_REDIRECT_URI = import.meta.env.VITE_AUTH_REDIRECT_URI || `${window.location.origin}/auth/callback`;
const AUTH_LOGOUT_URI = import.meta.env.VITE_AUTH_LOGOUT_URI || window.location.origin;

// Check if real Cognito auth is configured
export const isCognitoConfigured = Boolean(COGNITO_USER_POOL_ID && COGNITO_CLIENT_ID);

// Initialize Cognito User Pool (only if configured)
let userPool: CognitoUserPool | null = null;
if (isCognitoConfigured) {
  userPool = new CognitoUserPool({
    UserPoolId: COGNITO_USER_POOL_ID,
    ClientId: COGNITO_CLIENT_ID,
  });
}

/**
 * Get the current authenticated user from Cognito session
 */
export function getCurrentUser(): Promise<AuthUser | null> {
  if (!userPool) return Promise.resolve(null);

  const cognitoUser = userPool.getCurrentUser();
  if (!cognitoUser) return Promise.resolve(null);

  return new Promise((resolve) => {
    cognitoUser.getSession((err: Error | null, session: CognitoUserSession | null) => {
      if (err || !session || !session.isValid()) {
        resolve(null);
        return;
      }

      const idToken = session.getIdToken();
      const payload = idToken.decodePayload();

      resolve({
        id: payload['sub'] as string,
        email: payload['email'] as string,
        name: `${payload['given_name'] || ''} ${payload['family_name'] || ''}`.trim() || payload['email'] as string,
        givenName: payload['given_name'] as string | undefined,
        familyName: payload['family_name'] as string | undefined,
        isAdmin: payload['custom:isAdmin'] === 'true',
      });
    });
  });
}

/**
 * Get current session tokens (refreshes if needed)
 */
export function getSessionTokens(): Promise<AuthTokens | null> {
  if (!userPool) return Promise.resolve(null);

  const cognitoUser = userPool.getCurrentUser();
  if (!cognitoUser) return Promise.resolve(null);

  return new Promise((resolve) => {
    cognitoUser.getSession((err: Error | null, session: CognitoUserSession | null) => {
      if (err || !session || !session.isValid()) {
        resolve(null);
        return;
      }

      resolve({
        idToken: session.getIdToken().getJwtToken(),
        accessToken: session.getAccessToken().getJwtToken(),
        refreshToken: session.getRefreshToken().getToken(),
      });
    });
  });
}

/**
 * Get the ID token for API authorization headers
 */
export async function getIdToken(): Promise<string | null> {
  const tokens = await getSessionTokens();
  return tokens?.idToken || null;
}

/**
 * Initiate federated sign-in via Cognito Hosted UI
 */
export function signInWithProvider(provider: 'Google' | 'Microsoft') {
  if (!isCognitoConfigured) {
    console.warn('Cognito not configured. Cannot initiate federated sign-in.');
    return;
  }

  const params = new URLSearchParams({
    client_id: COGNITO_CLIENT_ID,
    response_type: 'code',
    scope: 'openid email profile',
    redirect_uri: AUTH_REDIRECT_URI,
    identity_provider: provider,
  });

  window.location.href = `${COGNITO_DOMAIN}/oauth2/authorize?${params.toString()}`;
}

/**
 * Handle the OAuth callback — exchange authorization code for tokens
 */
export async function handleAuthCallback(authorizationCode: string): Promise<AuthUser | null> {
  if (!isCognitoConfigured) return null;

  try {
    const response = await fetch(`${COGNITO_DOMAIN}/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: COGNITO_CLIENT_ID,
        code: authorizationCode,
        redirect_uri: AUTH_REDIRECT_URI,
      }),
    });

    if (!response.ok) {
      console.error('Token exchange failed:', response.status);
      return null;
    }

    const data = await response.json();

    // Create a Cognito session from the tokens
    const idToken = new CognitoIdToken({ IdToken: data.id_token });
    const accessToken = new CognitoAccessToken({ AccessToken: data.access_token });
    const refreshToken = new CognitoRefreshToken({ RefreshToken: data.refresh_token });

    const session = new CognitoUserSession({
      IdToken: idToken,
      AccessToken: accessToken,
      RefreshToken: refreshToken,
    });

    // Extract user info from ID token
    const payload = idToken.decodePayload();
    const username = payload['cognito:username'] as string || payload['sub'] as string;

    // Create CognitoUser and set session
    const cognitoUser = new CognitoUser({
      Username: username,
      Pool: userPool!,
    });
    cognitoUser.setSignInUserSession(session);

    return {
      id: payload['sub'] as string,
      email: payload['email'] as string,
      name: `${payload['given_name'] || ''} ${payload['family_name'] || ''}`.trim() || payload['email'] as string,
      givenName: payload['given_name'] as string | undefined,
      familyName: payload['family_name'] as string | undefined,
      isAdmin: payload['custom:isAdmin'] === 'true',
    };
  } catch (error) {
    console.error('Auth callback error:', error);
    return null;
  }
}

/**
 * Sign out — clears local session and redirects to Cognito logout
 */
export function signOut(redirectAfterLogout = true) {
  if (!userPool) return;

  const cognitoUser = userPool.getCurrentUser();
  if (cognitoUser) {
    cognitoUser.signOut();
  }

  if (redirectAfterLogout && isCognitoConfigured) {
    const params = new URLSearchParams({
      client_id: COGNITO_CLIENT_ID,
      logout_uri: AUTH_LOGOUT_URI,
    });
    window.location.href = `${COGNITO_DOMAIN}/logout?${params.toString()}`;
  }
}

/**
 * Check if a user session currently exists and is valid
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser();
  return user !== null;
}
