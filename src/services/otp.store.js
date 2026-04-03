import { createClient } from 'redis';

import { env } from '../config/env.js';

// In-memory OTP storage is the default.
// If `REDIS_URL` is set, OTPs are stored in Redis instead (better for production).
const memoryStore = new Map(); // phone -> { otp, expiresAt, attempts }

const redisKey = (phone) => `otp:${phone}`;

let redisClient = null;

const getRedisClient = async () => {
  if (!env.redisUrl) return null;
  if (redisClient) return redisClient;

  redisClient = createClient({ url: env.redisUrl });
  redisClient.on('error', () => {
    // Avoid crashing the app; errors will surface when OTP endpoints are called.
  });
  await redisClient.connect();
  return redisClient;
};

export const setOtp = async ({ phone, otp, ttlMs }) => {
  const expiresAt = Date.now() + ttlMs;

  // Redis-backed storage
  if (env.redisUrl) {
    const client = await getRedisClient();
    const ttlSeconds = Math.max(1, Math.ceil(ttlMs / 1000));
    await client.set(redisKey(phone), JSON.stringify({ otp, attempts: 0 }), { EX: ttlSeconds });
    return;
  }

  // In-memory storage
  memoryStore.set(phone, { otp, expiresAt, attempts: 0 });
};

export const getOtpEntry = async ({ phone }) => {
  // Redis-backed storage
  if (env.redisUrl) {
    const client = await getRedisClient();
    const raw = await client.get(redisKey(phone));
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    const ttlSeconds = await client.ttl(redisKey(phone));
    if (ttlSeconds <= 0) {
      await client.del(redisKey(phone));
      return null;
    }

    return {
      otp: parsed.otp,
      attempts: parsed.attempts ?? 0,
      expiresAt: Date.now() + ttlSeconds * 1000,
    };
  }

  // In-memory storage
  const entry = memoryStore.get(phone);
  if (!entry) return null;

  if (Date.now() > entry.expiresAt) {
    memoryStore.delete(phone);
    return null;
  }

  return entry;
};

export const incrementAttemptsAndGet = async ({ phone }) => {
  // Redis-backed storage
  if (env.redisUrl) {
    const client = await getRedisClient();
    const key = redisKey(phone);

    const raw = await client.get(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    parsed.attempts = (parsed.attempts ?? 0) + 1;

    const ttlSeconds = await client.ttl(key);
    const safeTtlSeconds = ttlSeconds > 0 ? ttlSeconds : env.otp.ttlSeconds;

    await client.set(key, JSON.stringify(parsed), { EX: safeTtlSeconds });
    return {
      otp: parsed.otp,
      attempts: parsed.attempts,
      expiresAt: Date.now() + safeTtlSeconds * 1000,
    };
  }

  // In-memory storage
  const entry = await getOtpEntry({ phone });
  if (!entry) return null;

  entry.attempts += 1;
  memoryStore.set(phone, entry);
  return entry;
};

export const clearOtp = async ({ phone }) => {
  // Redis-backed storage
  if (env.redisUrl) {
    const client = await getRedisClient();
    await client.del(redisKey(phone));
    return;
  }

  // In-memory storage
  memoryStore.delete(phone);
};

