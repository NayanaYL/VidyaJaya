import httpStatus from 'http-status';

import { registerUser, loginUser } from '../services/auth.service.js';
import { prisma } from '../config/database.js';
import { ApiError } from '../utils/apiError.js';

export const register = async (req, res, next) => {
  try {
    const { email, password, name } = req.body;
    const result = await registerUser({ email, password, name });
    return res.status(httpStatus.CREATED).json({
      success: true,
      data: result,
    });
  } catch (err) {
    return next(err);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await loginUser({ email, password });
    return res.status(httpStatus.OK).json({
      success: true,
      data: result,
    });
  } catch (err) {
    return next(err);
  }
};

export const me = async (req, res, next) => {
  try {
    const sub = req.user?.sub;
    if (!sub) {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'Unauthorized');
    }

    const user = await prisma.user.findUnique({
      where: { id: Number(sub) },
      select: {
        id: true,
        email: true,
        phone: true,
        name: true,
        created_at: true,
      },
    });

    if (!user) {
      throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
    }

    return res.status(httpStatus.OK).json({
      success: true,
      data: { user },
    });
  } catch (err) {
    return next(err);
  }
};

export const updateMe = async (req, res, next) => {
  try {
    const sub = req.user?.sub;
    if (!sub) {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'Unauthorized');
    }

    const { name, phone } = req.body;
    if (name === undefined && phone === undefined) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Provide at least one field: name or phone');
    }

    // Prisma ignores `undefined` values for optional fields.
    const updated = await prisma.user.update({
      where: { id: Number(sub) },
      data: {
        name,
        phone,
      },
      select: {
        id: true,
        email: true,
        phone: true,
        name: true,
        created_at: true,
      },
    });

    return res.status(httpStatus.OK).json({
      success: true,
      data: { user: updated },
    });
  } catch (err) {
    return next(err);
  }
};

