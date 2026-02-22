/**
 * App configuration
 */

function resolveApiUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv && fromEnv.trim().length > 0) {
    if (!__DEV__ && !fromEnv.startsWith('https://')) {
      throw new Error('EXPO_PUBLIC_API_URL must use https:// in production build');
    }
    return fromEnv;
  }

  if (__DEV__) {
    return 'http://localhost:3005';
  }

  throw new Error('Missing EXPO_PUBLIC_API_URL in production build');
}

export const CONFIG = {
  // API
  apiUrl: resolveApiUrl(),

  // GitHub OAuth
  github: {
    clientId: process.env.EXPO_PUBLIC_GITHUB_CLIENT_ID || '',
  },

  // App
  appName: 'CCJK Remote',
  version: '1.0.0',
};
