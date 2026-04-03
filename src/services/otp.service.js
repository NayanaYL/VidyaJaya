import httpStatus from 'http-status';

import { prisma } from '../config/database.js';
import { env } from '../config/env.js';
import { ApiError } from '../utils/apiError.js';
import { signToken } from '../utils/jwt.js';
import { setOtp, getOtpEntry, incrementAttemptsAndGet, clearOtp } from './otp.store.js';

const generateOtp = () => {
  // 6-digit numeric OTP, left padded with zeros if needed.
  const otp = Math.floor(100000 + Math.random() * 900000);
  return String(otp);
};

export const sendOtp = async ({ phone }) => {
  if (!phone) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Phone is required');
  }

  const otp = generateOtp();
  const ttlMs = env.otp.ttlSeconds * 1000;

  // Overwrite any previous OTP for the phone.
  await setOtp({ phone, otp, ttlMs });

  // In real apps, you'd send SMS here.
  // For local development/testing, we return OTP so you can verify it in Postman.
  if (env.nodeEnv === 'development') {
    return { otp, expiresInSeconds: env.otp.ttlSeconds };
  }

  return { expiresInSeconds: env.otp.ttlSeconds };
};

export const verifyOtpAndIssueToken = async ({ phone, otp }) => {
  if (!phone || !otp) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Phone and OTP are required');
  }

  const entry = await getOtpEntry({ phone });
  if (!entry) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'OTP expired or not found');
  }

  if (entry.otp !== String(otp)) {
    const updated = await incrementAttemptsAndGet({ phone });
    const attempts = updated?.attempts ?? 1;
    if (attempts >= env.otp.maxAttempts) {
      await clearOtp({ phone });
      throw new ApiError(httpStatus.UNAUTHORIZED, 'Too many invalid attempts. OTP cleared.');
    }
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid OTP');
  }

    // Correct OTP -> clear it and issue token.
  await clearOtp({ phone });

  // Phone is not enforced as unique in DB yet (to keep migrations non-interactive-friendly).
  // This makes OTP auth usable immediately; you can add a unique constraint later.
  const existingUser = await prisma.user.findFirst({ where: { phone } });
  const user =
    existingUser ??
    (await prisma.user.create({
      data: { phone },
    }));

  const token = signToken({ sub: user.id, phone: user.phone });

  return {
    user: {
      id: user.id,
      phone: user.phone,
      created_at: user.created_at,
    },
    token,
  };
};

