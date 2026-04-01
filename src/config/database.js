import { PrismaClient } from '@prisma/client';

import { env } from './env.js';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: env.databaseUrl,
    },
  },
  log: env.nodeEnv === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
});

export { prisma };
