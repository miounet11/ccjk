import { config } from 'dotenv';

config();

function isHttpsUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function validateCorsOrigins(raw: string): boolean {
  const origins = raw.split(',').map(item => item.trim()).filter(Boolean);
  if (origins.length === 0) {
    return false;
  }
  return origins.every(origin => {
    try {
      const parsed = new URL(origin);
      return parsed.protocol === 'https:';
    } catch {
      return false;
    }
  });
}

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
    callbackUrl: process.env.GITHUB_CALLBACK_URL || `http://localhost:${process.env.PORT || '3005'}/auth/github/callback`,
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
    'GITHUB_CALLBACK_URL',
    'CORS_ORIGIN',
    'SESSION_SECRET',
  ];

  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }

  if (!isHttpsUrl(CONFIG.github.callbackUrl)) {
    throw new Error('GITHUB_CALLBACK_URL must be a valid HTTPS URL in production');
  }

  if (CONFIG.corsOrigin === '*' || !validateCorsOrigins(CONFIG.corsOrigin)) {
    throw new Error('CORS_ORIGIN must be one or more comma-separated HTTPS origins in production');
  }

  if (CONFIG.jwtSecret === 'dev-secret') {
    throw new Error('JWT_SECRET must not use development default in production');
  }

  if (CONFIG.sessionSecret === 'dev-session-secret') {
    throw new Error('SESSION_SECRET must not use development default in production');
  }
}
