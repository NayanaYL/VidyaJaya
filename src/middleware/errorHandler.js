import httpStatus from 'http-status';

import { logger } from '../config/logger.js';
import { ApiError } from '../utils/apiError.js';

export const notFoundHandler = (req, res, next) => {
  next(new ApiError(httpStatus.NOT_FOUND, 'Route not found'));
};

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || httpStatus.INTERNAL_SERVER_ERROR;
  const message =
    err.message || httpStatus[httpStatus.INTERNAL_SERVER_ERROR] || 'Internal Server Error';

  if (process.env.NODE_ENV !== 'test') {
    logger.error(err.message, { stack: err.stack, statusCode });
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

