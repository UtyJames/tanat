/**
 * Tanat — Hono application
 *
 * Central app wiring: middleware → routes → error handler.
 */

import { Hono } from 'hono';
import type { MiddlewareHandler } from 'hono';
import type { Env, HonoEnv } from './types';

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
import { NearIntentsService } from './services/near-intents.service';
import { NearAiService } from './services/near-ai.service';

// Routes
import { tenantsRouter } from './routes/tenants';
import { agentsRouter } from './routes/agents';
import { installationsRouter } from './routes/installations';
import { createSessionsRouter, type NearAiFactory } from './routes/sessions';
import { createActionsRouter } from './routes/actions';
import { createPaymentsRouter } from './routes/payments';
import { nearRouter } from './routes/near';
import { keysRouter } from './routes/keys';
import { operatorRouter } from './routes/operator';
import { authRouter } from './routes/auth';
import { onboardingRouter } from './routes/onboarding';
import { createPublicRouter } from './routes/public';
import { platformRouter } from './routes/platform';

export type IntentsFactory = (env: Env) => NearIntentsService;

const defaultNearAiFactory: NearAiFactory = (env) =>
  new NearAiService(env.NEAR_AI_API_KEY);

const defaultIntentsFactory: IntentsFactory = (env) =>
  new NearIntentsService(env.INTENTS_API_KEY);

export function createApp(
  nearServiceFactory: () => NearService = () => new NearService(),
  nearAiFactory: NearAiFactory = defaultNearAiFactory,
  intentsFactory: IntentsFactory = defaultIntentsFactory,
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

// ── Machine-readable llms.txt & MCP manifest for AI Coding Assistants ─
app.get('/llms.txt', (c) =>
  c.text(
    [
      '# Tanat — AI Infrastructure for Business Operations',
      '> Provision, configure, govern, and deploy AI agents across your website, messaging channels, and business systems.',
      '',
      '## Core Concepts',
      '- Tenant (Workspace): Isolated business organisation owning multiple agents, knowledge sources, and channels.',
      '- Agent: Configured AI role (Support, Sales, HR, Booking, Operations, Finance, IT, Knowledge, Custom).',
      '- Installation: Binds an agent to runtime configuration and channels.',
      '- Publishable Key (`pk_live_...` / `pk_test_...`): Browser-safe, origin-locked key for website widgets.',
      '- Secret API Key (`tnt_...`): Server-side key for full REST API & SDK operations.',
      '',
      '## Website Widget (1-Line Embed)',
      '```html',
      '<script src="https://tanat-web.pages.dev/embed/tanat-widget.js" data-key="pk_live_..." data-agent="inst_..." defer></script>',
      '```',
      '',
      '## Public Widget API (`/api/public/v1` — header `X-Tanat-Key: pk_...`)',
      '- `GET /api/public/v1/config` — Bootstrap agent name, greeting, and capabilities.',
      '- `POST /api/public/v1/sessions` — Create a visitor or HMAC-verified user session (`{ user_id?, user_signature? }`).',
      '- `POST /api/public/v1/sessions/:id/messages` — Send a message (`{ content }`) and receive assistant response + sources.',
      '',
      '## Authenticated REST API (`/api/v1` — header `Authorization: Bearer tnt_...`)',
      '- `GET /api/v1/tenants` — Current workspace details.',
      '- `GET|POST /api/v1/agents` & `PATCH|DELETE /api/v1/agents/:id` — Manage agents.',
      '- `GET|POST /api/v1/platform/knowledge` — Add website, FAQ, policy, or document knowledge.',
      '- `GET|POST /api/v1/platform/memories` — Read or store persistent customer/business memories.',
      '- `POST /api/v1/sessions` & `POST /api/v1/sessions/:id/messages` — Server-to-server agent conversations.',
      '- `GET /api/v1/actions` & `POST /api/v1/actions/:id/approve|reject|execute` — Human-in-the-loop governance.',
      '- `POST /api/v1/payments/intents` — Create NEAR Intents payment quotes & hosted checkout links.',
    ].join('\n'),
  ),
);

app.get('/api/mcp', (c) =>
  c.json({
    protocol: 'mcp/1.0',
    name: 'tanat-ai-infrastructure',
    version: '0.2.0',
    description:
      'Tanat Model Context Protocol server — discover and invoke authorised business agents, knowledge bases, and approval-gated actions.',
    tools: [
      {
        name: 'tanat_send_agent_message',
        description: 'Send a message to an installed Tanat business agent and retrieve its response.',
        inputSchema: {
          type: 'object',
          properties: {
            installation_id: { type: 'string' },
            session_id: { type: 'string' },
            content: { type: 'string' },
          },
          required: ['installation_id', 'content'],
        },
      },
      {
        name: 'tanat_search_business_knowledge',
        description: 'Retrieve approved business knowledge sources for the authenticated tenant.',
        inputSchema: {
          type: 'object',
          properties: {
            agent_id: { type: 'string' },
          },
        },
      },
      {
        name: 'tanat_create_payment_intent',
        description: 'Create an approval-governed NEAR Intents payment quote and hosted checkout URL.',
        inputSchema: {
          type: 'object',
          properties: {
            installation_id: { type: 'string' },
            description: { type: 'string' },
            amount: { type: 'string' },
            currency: { type: 'string' },
            recipient: { type: 'string' },
          },
          required: ['installation_id', 'description', 'amount', 'currency', 'recipient'],
        },
      },
    ],
  }),
);

// ── Pre-auth limits ───────────────────────────────────────────────────
// These run before the Bearer key is checked, so failed guesses are counted.
app.use('/api/v1/*', preAuthRateLimit());
app.use('/api/operator/v1/*', operatorRateLimit());
app.use('/api/auth/*', preAuthRateLimit());
app.route('/api/auth', authRouter);

// Public widget API. It has its own publishable-key auth and per-key CORS.
app.use('/api/public/*', preAuthRateLimit());
app.route('/api/public/v1', createPublicRouter(nearAiFactory));

// ── Authenticated API routes ──────────────────────────────────────────
const api = new Hono<HonoEnv>();

// Auth + rate limit on all API routes
api.use('*', authMiddleware());
api.use('*', requireTenant());
api.use('*', rateLimitMiddleware());

// Mount route groups
api.route('/tenants', tenantsRouter);
api.route('/agents', agentsRouter);
api.route('/onboarding', onboardingRouter);
api.route('/platform', platformRouter);
api.route('/installations', installationsRouter);
api.route('/sessions', createSessionsRouter(nearAiFactory));
api.route('/actions', createActionsRouter(nearServiceFactory));
api.route('/payments', createPaymentsRouter(intentsFactory));
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
