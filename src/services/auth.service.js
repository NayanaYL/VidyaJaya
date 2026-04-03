import httpStatus from 'http-status';

import { prisma } from '../config/database.js';
import { ApiError } from '../utils/apiError.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { signToken } from '../utils/jwt.js';

export const registerUser = async ({ email, password, name }) => {
  if (!email || !password) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email and password are required');
  }
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new ApiError(httpStatus.CONFLICT, 'Email already registered');
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      email,
      password: passwordHash,
      name,
    },
  });

  const token = signToken({ sub: user.id, email: user.email });

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
    token,
  };
};

export const loginUser = async ({ email, password }) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.password) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid credentials');
  }

  const isValid = await comparePassword(password, user.password);
  if (!isValid) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid credentials');
  }

  const token = signToken({ sub: user.id, email: user.email });

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
    token,
  };
};

