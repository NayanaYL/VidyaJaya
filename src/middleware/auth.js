import httpStatus from 'http-status';

import { verifyToken } from '../utils/jwt.js';
import { ApiError } from '../utils/apiError.js';

export const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new ApiError(httpStatus.UNAUTHORIZED, 'Authorization header missing or invalid'));
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    return next();
  } catch (err) {
    return next(new ApiError(httpStatus.UNAUTHORIZED, 'Invalid or expired token'));
  }
};

