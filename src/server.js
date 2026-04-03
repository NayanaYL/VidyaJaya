import http from 'http'; // The Node.js native code for creating a web server
import app from './app.js'; // Imports the defined application from app.js
import { env } from './config/env.js'; // Imports our settings for the environment
import { logger } from './config/logger.js'; // Imports our logger system for recording app events
import { prisma } from './config/database.js'; // Imports the database connection manager

// This creates an actual server based on our Express application
const server = http.createServer(app); 

// This tells the server to listen on the port we defined in .env (like 3000)
const port = env.port; 

// This is the starting function for the entire application
const start = async () => {
  try {
    // 1. Connect to our Database (PostgreSQL)
    await prisma.$connect(); 
    logger.info('Successfully connected to PostgreSQL via Prisma'); // Record that we are connected

    // 2. Start the HTTP server
    server.listen(port, () => {
      // Record exactly where the server is running
      logger.info(`Server running on port ${port} in ${env.nodeEnv} mode`); 
    });

    // 3. Handle Graceful Shutdown
    // This function tells the app to wait for current tasks to finish before stopping
    const shutdown = async (signal) => {
      logger.info(`${signal} received. Shutting down gracefully...`); 
      server.close(async () => {
        await prisma.$disconnect(); // Close the database connection
        logger.info('Database connection closed.'); 
        process.exit(0); // Exit the application with code 0 (success)
      });
    };

    // Listen for shutdown signals from the computer (like Ctrl+C)
    process.on('SIGTERM', () => shutdown('SIGTERM')); 
    process.on('SIGINT', () => shutdown('SIGINT')); 

  } catch (err) {
    // If anything fails during startup, log it and stop the app
    logger.error('Failed to start server', { error: err.message }); 
    process.exit(1); // Exit with code 1 (failure)
  }
};

// Fire it up!
start(); 
