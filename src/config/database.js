import { PrismaClient } from '@prisma/client'; // Import the Prisma Client from the database library
import { env } from './env.js'; // Imports our configuration (settings)

/**
 * prisma: This is our database connection instance.
 * It's what allow us to talk to our SQL database easily.
 * We want only ONE instance of this in the whole app, 
 * so we export it so everyone can use the SAME one.
 */
export const prisma = new PrismaClient({
  // Log all database queries to the console when we're NOT in production
  log: env.nodeEnv === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

export default prisma; // Exports it for use across the app
