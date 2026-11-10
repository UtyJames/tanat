/**
 * Tanat - CORS middleware
 *
 * Configures Cross-Origin Resource Sharing from an explicit allowlist.
 * Bearer authentication does not need cookies, so credentials are disabled.
 * An unset CORS_ORIGINS means "no cross-origin browser access", not `*`.
 */

import { cors } from 'hono/cors';
import type { HonoEnv } from '../types';
import type { MiddlewareHandler } from 'hono';

export const corsMiddleware: MiddlewareHandler<HonoEnv> = async (c, next) => {
  const origins = (c.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  const handler = cors({
    origin: origins,
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: [
      'Content-Type',
      'Authorization',
      'X-Request-ID',
      'X-Idempotency-Key',
      'Idempotency-Key',
    ],
    exposeHeaders: ['X-Request-ID', 'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
    maxAge: 86400,
    credentials: false,
  });

  return handler(c, next);
};
