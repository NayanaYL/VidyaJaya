import express from 'express'; // This is the main framework for building our web server
import helmet from 'helmet'; // This adds security headers to protect our app from common attacks
import cors from 'cors'; // This allows our frontend to communicate with our backend from different places
import morgan from 'morgan'; // This logs every request that comes to our server for debugging
import httpStatus from 'http-status'; // This gives us easy-to-read names for HTTP status codes (like 200, 404, 500)

// Importing the settings we defined in other files
import { env } from './config/env.js'; 
import routes from './routes/index.js'; 
import authRoutes from './routes/auth.routes.js'; 
import contestRoutes from './routes/contest.routes.js'; 
import walletRoutes from './routes/wallet.routes.js'; 

// This middleware helps us catch errors and send nice messages to the user
import { notFoundHandler, errorHandler } from './middlewares/errorHandler.js'; 

// This creates our Express application
const app = express(); 

// 1. Security & Basic Setup
app.use(helmet()); // Tell the app to use the security helmet
app.use(
  cors({
    origin: '*', // Allow any website to connect to this API (adjust this for production)
  }),
);
app.use(express.json()); // Allow the app to understand JSON data sent in a request
app.use(express.urlencoded({ extended: true })); // Allow the app to understand URL-style data (like from a form)

// 2. Logging
// We only want to log requests when we are NOT testing
if (env.nodeEnv !== 'test') {
  app.use(morgan('dev')); // Use the "dev" log format (which is colorful and easy to read)
}

// 3. API Routes
// These define the URLs that the user can visit (like /api/auth or /api/contest)
app.use('/api', routes); // Common health check and other base routes
app.use('/api/auth', authRoutes); // Login, Register, OTP routes
app.use('/api/contest', contestRoutes); // Contest creation, participation, and quiz logic
app.use('/api/wallet', walletRoutes); // Money balance, deposits, and withdrawals

// Also expose auth routes at root because the user requested it specifically: /auth/send-otp, /auth/verify-otp
app.use('/auth', authRoutes); 

// 4. Error Handling
// If the user visits a URL we haven't defined, this will say "Not Found"
app.use(notFoundHandler); 

// This is the global error handler that catches any bugs and sends a 500 or 400 error
app.use(errorHandler); 

export default app; // Export the application so it can be used in server.js
