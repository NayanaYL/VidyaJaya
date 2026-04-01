/* Simple console-based logger; can be swapped with Winston/Pino later */

import { env } from './env.js';

const levels = ['error', 'warn', 'info', 'debug'];

const shouldLog = (level) => {
  return levels.indexOf(level) <= levels.indexOf(env.logLevel);
};

export const logger = {
  error: (msg, meta) => {
    if (shouldLog('error')) console.error(`[ERROR] ${msg}`, meta || '');
  },
  warn: (msg, meta) => {
    if (shouldLog('warn')) console.warn(`[WARN] ${msg}`, meta || '');
  },
  info: (msg, meta) => {
    if (shouldLog('info')) console.info(`[INFO] ${msg}`, meta || '');
  },
  debug: (msg, meta) => {
    if (shouldLog('debug')) console.debug(`[DEBUG] ${msg}`, meta || '');
  },
};

