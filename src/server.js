import http from 'http';

import app from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { prisma } from './config/database.js';

const server = http.createServer(app);

const port = env.port;

const start = async () => {
  try {
    await prisma.$connect();
    logger.info('Successfully connected to PostgreSQL via Prisma');

    server.listen(port, () => {
      logger.info(`Server running on port ${port} in ${env.nodeEnv} mode`);
    });

    const shutdown = async (signal) => {
      logger.info(`${signal} received. Shutting down gracefully...`);
      server.close(async () => {
        await prisma.$disconnect();
        logger.info('Database connection closed.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (err) {
    logger.error('Failed to start server', { error: err.message });
    process.exit(1);
  }
};

start();

