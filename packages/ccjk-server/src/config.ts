import { config } from 'dotenv';

config();

export const CONFIG = {
  // Server
  port: parseInt(process.env.PORT || '3005'),
  nodeEnv: process.env.NODE_ENV || 'development',

  // Database
  databaseUrl: process.env.DATABASE_URL || '',

  // Redis
  redisUrl: process.env.REDIS_URL,

  // JWT
  jwtSecret: process.env.JWT_SECRET || 'dev-secret',
  jwtExpiresIn: '30d',

  // GitHub OAuth
  github: {
    clientId: process.env.GITHUB_CLIENT_ID || '',
    clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
    callbackUrl: process.env.GITHUB_CALLBACK_URL || 'http://localhost:3005/auth/github/callback',
  },

  // Expo Push
  expoPushToken: process.env.EXPO_ACCESS_TOKEN,

  // CORS
  corsOrigin: process.env.CORS_ORIGIN || '*',

  // Session
  sessionSecret: process.env.SESSION_SECRET || 'dev-session-secret',
};

// Validate required config
if (CONFIG.nodeEnv === 'production') {
  const required = [
    'DATABASE_URL',
    'JWT_SECRET',
    'GITHUB_CLIENT_ID',
    'GITHUB_CLIENT_SECRET',
    'SESSION_SECRET',
  ];

  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }
}
