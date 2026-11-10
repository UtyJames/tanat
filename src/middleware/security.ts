/**
 * Tanat - Security headers middleware
 *
 * Applies standard security headers to every response. `Cache-Control:
 * no-store` matters most on the one-time plaintext API key response (L-03).
 */

import { MiddlewareHandler } from 'hono';
import type { HonoEnv } from '../types';

export const securityHeaders: MiddlewareHandler<HonoEnv> = async (c, next) => {
  await next();

  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('X-XSS-Protection', '0');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  c.header('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  c.header('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
  c.header('Cache-Control', 'no-store');
  c.header('Pragma', 'no-cache');
};
