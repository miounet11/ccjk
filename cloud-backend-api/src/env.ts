// CCJK Cloud API - Environment Variables

export const env = {
  DATABASE_URL: process.env.DATABASE_URL || '',
  PORT: process.env.PORT || '3000',
  NODE_ENV: process.env.NODE_ENV || 'development',
  JWT_SECRET: process.env.JWT_SECRET || 'ccjk-secret-key-change-in-production',
}

// Validation
if (!env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required')
}
