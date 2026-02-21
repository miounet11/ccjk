/**
 * App configuration
 */

export const CONFIG = {
  // API
  apiUrl: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3005',

  // GitHub OAuth
  github: {
    clientId: process.env.EXPO_PUBLIC_GITHUB_CLIENT_ID || '',
  },

  // App
  appName: 'CCJK Remote',
  version: '1.0.0',
};
