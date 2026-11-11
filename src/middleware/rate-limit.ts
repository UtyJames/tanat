/**
 * Tanat — rate limiting middleware.
 *
 * Uses a shared D1 table so limits apply across every edge location. There are
 * three limiters:
 *
 *   - pre-auth IP limit, before any key is checked (M-05);
 *   - per-tenant limit, so minting extra keys does not multiply the quota (M-06);
 *   - operator limit, so the master key cannot be guessed without bound (M-04).
 *
 * If the database check fails, the request is allowed and the failure is
 * logged. Rate limiting must not take the whole API down.
 */

import type { MiddlewareHandler } from 'hono';
import type { HonoEnv } from '../types';
import { RateLimitError } from '../utils/errors';
import { logAudit, requestIp } from '../utils/audit';

export interface LimitResult {
  count: number;
  maxRequests: number;
  resetAt: number;
  windowStart: number;
  windowMs: number;
}

async function consume(
  db: D1Database,
  identifier: string,
  maxRequests: number,
  windowSeconds: number,
): Promise<LimitResult> {
  const windowMs = windowSeconds * 1000;
  const now = Date.now();
  const windowStart = Math.floor(now / windowMs) * windowMs;

  let count = 1;

  try {
    const row = await db
      .prepare(
        `INSERT INTO rate_limits (key, window_start, count)
         VALUES (?, ?, 1)
         ON CONFLICT (key, window_start) DO UPDATE SET count = count + 1
         RETURNING count`,
      )
      .bind(identifier, windowStart)
      .first<{ count: number }>();

    count = row?.count ?? 1;
  } catch (err) {
    console.error('Rate limit check failed; allowing request', err);
  }

  // Occasionally remove old windows so the table stays small.
  if (Math.random() < 0.01) {
    try {
      await db
        .prepare('DELETE FROM rate_limits WHERE window_start < ?')
        .bind(windowStart - windowMs * 2)
        .run();
    } catch {
      // Cleanup is best effort.
    }
  }

  return {
    count,
    maxRequests,
    resetAt: Math.ceil((windowStart + windowMs) / 1000),
    windowStart,
    windowMs,
  };
}

/**
 * Shared fixed-window counter. Exported for the public widget API, which is
 * keyed by publishable key + IP rather than by tenant.
 */
export async function consumeRateLimit(
  db: D1Database,
  identifier: string,
  maxRequests: number,
  windowSeconds: number,
): Promise<LimitResult> {
  return consume(db, identifier, maxRequests, windowSeconds);
}

function setHeaders(
  c: Parameters<MiddlewareHandler<HonoEnv>>[0],
  result: LimitResult,
): void {
  c.header('X-RateLimit-Limit', String(result.maxRequests));
  c.header(
    'X-RateLimit-Remaining',
    String(Math.max(0, result.maxRequests - result.count)),
  );
  c.header('X-RateLimit-Reset', String(result.resetAt));
}

function retryAfter(result: LimitResult): number {
  return Math.max(
    1,
    Math.ceil((result.windowStart + result.windowMs - Date.now()) / 1000),
  );
}

function intFromEnv(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/** Per-tenant limit for authenticated API traffic. */
export const rateLimitMiddleware = (): MiddlewareHandler<HonoEnv> => {
  return async (c, next) => {
    const maxRequests = intFromEnv(c.env.RATE_LIMIT_REQUESTS, 100);
    const windowSeconds = intFromEnv(c.env.RATE_LIMIT_WINDOW_SECONDS, 60);
    const tenantId = c.get('tenantId') ?? 'anonymous';

    const result = await consume(
      c.env.DB,
      `tenant:${tenantId}`,
      maxRequests,
      windowSeconds,
    );

    setHeaders(c, result);

    if (result.count > result.maxRequests) {
      c.header('Retry-After', String(retryAfter(result)));
      await logAudit(c.env.DB, {
        tenantId,
        action: 'rate_limit.exceeded',
        resourceType: 'tenant',
        resourceId: tenantId,
        actorId: c.get('apiKeyId'),
        details: { limiter: 'tenant', path: c.req.path },
        ipAddress: requestIp(c),
      });
      throw new RateLimitError('Too many requests');
    }

    await next();
  };
};

/**
 * IP limit applied before authentication. Invalid keys and unknown callers are
 * counted, so guessing a key is expensive.
 */
export const preAuthRateLimit = (): MiddlewareHandler<HonoEnv> => {
  return async (c, next) => {
    const maxRequests = intFromEnv(c.env.PREAUTH_RATE_LIMIT_REQUESTS, 300);
    const windowSeconds = intFromEnv(c.env.RATE_LIMIT_WINDOW_SECONDS, 60);
    const ip = requestIp(c) ?? 'unknown';

    const result = await consume(
      c.env.DB,
      `ip:${ip}`,
      maxRequests,
      windowSeconds,
    );

    setHeaders(c, result);

    if (result.count > result.maxRequests) {
      c.header('Retry-After', String(retryAfter(result)));
      await logAudit(c.env.DB, {
        tenantId: 'unknown',
        action: 'rate_limit.exceeded',
        resourceType: 'ip',
        resourceId: ip,
        details: { limiter: 'pre_auth', path: c.req.path },
        ipAddress: ip,
      });
      throw new RateLimitError('Too many requests');
    }

    await next();
  };
};

/** Strict IP limit for the operator plane. */
export const operatorRateLimit = (): MiddlewareHandler<HonoEnv> => {
  return async (c, next) => {
    const maxRequests = intFromEnv(c.env.OPERATOR_RATE_LIMIT_REQUESTS, 10);
    const windowSeconds = intFromEnv(c.env.RATE_LIMIT_WINDOW_SECONDS, 60);
    const ip = requestIp(c) ?? 'unknown';

    const result = await consume(
      c.env.DB,
      `operator:${ip}`,
      maxRequests,
      windowSeconds,
    );

    setHeaders(c, result);

    if (result.count > result.maxRequests) {
      c.header('Retry-After', String(retryAfter(result)));
      await logAudit(c.env.DB, {
        tenantId: 'unknown',
        action: 'rate_limit.exceeded',
        resourceType: 'operator',
        resourceId: ip,
        details: { limiter: 'operator', path: c.req.path },
        ipAddress: ip,
      });
      throw new RateLimitError('Too many operator requests');
    }

    await next();
  };
};
