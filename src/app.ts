/**
 * Tanat — Hono application
 *
 * Central app wiring: middleware → routes → error handler.
 */

import { Hono } from 'hono';
import type { MiddlewareHandler } from 'hono';
import type { HonoEnv } from './types';

// Middleware
import { assertConfig } from './config';
import { securityHeaders } from './middleware/security';
import { corsMiddleware } from './middleware/cors';
import { bodyLimit } from './middleware/body-limit';
import { authMiddleware } from './middleware/auth';
import { requireTenant } from './middleware/tenant-isolation';
import {
  operatorRateLimit,
  preAuthRateLimit,
  rateLimitMiddleware,
} from './middleware/rate-limit';
import { AppError } from './utils/errors';
import { NearService } from './services/near.service';

// Routes
import { tenantsRouter } from './routes/tenants';
import { agentsRouter } from './routes/agents';
import { installationsRouter } from './routes/installations';
import { sessionsRouter } from './routes/sessions';
import { createActionsRouter } from './routes/actions';
import { nearRouter } from './routes/near';
import { keysRouter } from './routes/keys';
import { operatorRouter } from './routes/operator';
import { authRouter } from './routes/auth';

export function createApp(
  nearServiceFactory: () => NearService = () => new NearService(),
): Hono<HonoEnv> {
const app = new Hono<HonoEnv>();

const configGuard: MiddlewareHandler<HonoEnv> = async (c, next) => {
  assertConfig(c.env);
  await next();
};

// ── Global middleware ──────────────────────────────────────────────────
// Security headers run first so even a 413 or a config error carries them.
app.use('*', securityHeaders);
app.use('*', configGuard);
app.use('*', corsMiddleware);
app.use('*', bodyLimit(1_000_000));

// ── Health checks (no auth required) ──────────────────────────────────
app.get('/', (c) =>
  c.json({
    name: 'Tanat API',
    version: '0.1.0',
    description: 'Embedded multi-tenant AI agents for SaaS, powered by NEAR',
    status: 'healthy',
  }),
);

app.get('/health', (c) =>
  c.json({ status: 'ok', timestamp: new Date().toISOString() }),
);

// ── Pre-auth limits ───────────────────────────────────────────────────
// These run before the Bearer key is checked, so failed guesses are counted.
app.use('/api/v1/*', preAuthRateLimit());
app.use('/api/operator/v1/*', operatorRateLimit());
app.use('/api/auth/*', preAuthRateLimit());
app.route('/api/auth', authRouter);

// ── Authenticated API routes ──────────────────────────────────────────
const api = new Hono<HonoEnv>();

// Auth + rate limit on all API routes
api.use('*', authMiddleware());
api.use('*', requireTenant());
api.use('*', rateLimitMiddleware());

// Mount route groups
api.route('/tenants', tenantsRouter);
api.route('/agents', agentsRouter);
api.route('/installations', installationsRouter);
api.route('/sessions', sessionsRouter);
api.route('/actions', createActionsRouter(nearServiceFactory));
api.route('/near', nearRouter);
api.route('/keys', keysRouter);

// ── Operator API (separate key, never a tenant key) ───────────────────
app.route('/api/operator/v1', operatorRouter);

app.route('/api/v1', api);

// ── Global error handler ──────────────────────────────────────────────
app.onError((err, c) => {
  const headerId = (c.req.header('X-Request-ID') ?? '').trim().slice(0, 64);
  const requestId = c.get('requestId') || headerId || 'unknown';

  if (err instanceof AppError) {
    console.error(`[${requestId}] ${err.code}: ${err.message}`);
    const body: Record<string, unknown> = {
      error: {
        code: err.code,
        message: err.message,
      },
      requestId,
    };

    // Attach validation details when available
    if ('details' in err && (err as any).details) {
      (body.error as Record<string, unknown>).details = (err as any).details;
    }

    return c.json(body, err.statusCode as any);
  }

  // Unknown errors — never leak internals
  console.error(`[${requestId}] Unhandled error:`, err);
  return c.json(
    {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
      requestId,
    },
    500,
  );
});

// ── 404 fallback ──────────────────────────────────────────────────────
app.notFound((c) =>
  c.json(
    {
      error: {
        code: 'NOT_FOUND',
        message: `Route ${c.req.method} ${c.req.path} not found`,
      },
    },
    404,
  ),
);

return app;
}

export const app = createApp();
