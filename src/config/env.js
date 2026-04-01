import dotenv from 'dotenv';

dotenv.config();

const requiredEnv = ['DATABASE_URL', 'JWT_SECRET'];

requiredEnv.forEach((key) => {
  if (!process.env[key]) {
    // In production you might want to fail fast; here we log a clear warning.
    console.warn(`[config] Environment variable ${key} is not set.`);
  }
});

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 4000,
  databaseUrl: process.env.DATABASE_URL,
  jwt: {
    secret: process.env.JWT_SECRET || 'insecure-default',
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
  },
  logLevel: process.env.LOG_LEVEL || 'info',
};
