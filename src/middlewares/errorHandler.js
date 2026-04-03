import httpStatus from 'http-status'; // Easy-to-read names for HTTP status codes
import { env } from '../config/env.js'; // Imports our settings (development vs production)
import { ApiError } from '../utils/apiError.js'; // Our custom error reporter

/**
 * notFoundHandler: This is the fallback if a user requests a URL that doesn't exist.
 * E.g., /api/some-random-route
 */
export const notFoundHandler = (req, res, next) => {
  // We send a 404 error ("Not Found") to the ERROR handler below
  next(new ApiError(httpStatus.NOT_FOUND, 'Not found'));
};

/**
 * errorHandler: This is the MASTER error handler for the entire app.
 * Any controller that calls next(err) will end up here!
 */
export const errorHandler = (err, req, res, next) => {
  let { statusCode, message } = err;

  // 1. If the error isn't an "ApiError", it's probably an unexpected system error
  if (!(err instanceof ApiError)) {
    // If we're in production, we don't want to show the full error for security
    statusCode = httpStatus.INTERNAL_SERVER_ERROR; // 500
    message = httpStatus[httpStatus.INTERNAL_SERVER_ERROR]; 
  }

  // 2. Prepare the final error response object
  const response = {
    code: statusCode, // The numeric error code (like 404 or 500)
    message, // A clear message explaining what went wrong
    // If we're in development, include the "stack trace" (the exact code lines that failed)
    ...(env.nodeEnv === 'development' && { stack: err.stack }), 
  };

  // 3. Send the response to the user
  res.status(statusCode).send(response);
};
