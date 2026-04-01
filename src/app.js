import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';

import { env } from './config/env.js';
import routes from './routes/index.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';

const app = express();

// Security & basic middleware
app.use(helmet());
app.use(
  cors({
    origin: '*', // adjust in production
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (env.nodeEnv !== 'test') {
  app.use(morgan('dev'));
}

// API routes
app.use('/api', routes);

// 404 and error handlers
app.use(notFoundHandler);
app.use(errorHandler);

export default app;

