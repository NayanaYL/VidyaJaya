import httpStatus from 'http-status';

export class ApiError extends Error {
  constructor(statusCode, message, isOperational = true, stack = '') {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export const notFoundError = (message = 'Resource not found') =>
  new ApiError(httpStatus.NOT_FOUND, message);

export const unauthorizedError = (message = 'Unauthorized') =>
  new ApiError(httpStatus.UNAUTHORIZED, message);

export const badRequestError = (message = 'Bad request') =>
  new ApiError(httpStatus.BAD_REQUEST, message);

