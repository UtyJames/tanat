/**
 * Tanat — public widget API.
 *
 * This is the only surface a browser can call with a publishable key. A key is
 * bound to one installation and one set of origins. It can start a conversation
 * and read the current agent's public configuration. It cannot read another
 * tenant's data, list sessions, approve actions, or move money.
 *
 * CORS is handled here rather than by the global allowlist because each
 * workspace has its own origins.
 */

import { Hono } from 'hono';
import type { Context } from 'hono';
import { z } from 'zod';
import type { Env, HonoEnv } from '../types';
import { validateBody, getValidatedBody } from '../middleware/validation';
import { generateId, hashApiKey } from '../utils/crypto';
import { logAudit, requestIp } from '../utils/audit';
import { consumeRateLimit } from '../middleware/rate-limit';
import { ForbiddenError, NotFoundError, RateLimitError, ValidationError } from '../utils/errors';
import { recordUsage } from '../services/metering.service';
import {
  readyKnowledge,
  retrieveMemoryContext,
  extractAndStoreMemories,
} from '../services/knowledge.service';
import { NearAiService, NEAR_AI_DEFAULT_MODEL, type ChatMessage } from '../services/near-ai.service';

export type NearAiFactory = (env: Env) => NearAiService;

interface PublishableKeyRow {
  id: string;
  tenant_id: string;
  installation_id: string | null;
  allowed_origins: string;
}

interface InstallationContext {
  installation_id: string;
  installation_config: string;
  agent_id: string;
  agent_name: string;
  agent_description: string | null;
  agent_prompt: string;
  agent_model: string;
  agent_max_tokens: number;
  agent_temperature: number;
  tenant_name: string;
  tenant_settings: string;
  key_id: string;
}

function parseJson(raw: string | null | undefined): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function allowedOrigins(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === 'string')
      : [];
  } catch {
    return [];
  }
}

function originAllowed(origin: string | undefined, allowed: string[]): boolean {
  if (allowed.includes('*')) return true;
  if (!origin) return false;
  return allowed.includes(origin.replace(/\/$/, ''));
}

function readKey(c: Context<HonoEnv>): string {
  const header = c.req.header('X-Tanat-Key');
  const query = c.req.query('key');
  const key = (header ?? query ?? '').trim();
  if (!key.startsWith('pk_') || key.length < 20) {
    throw new ValidationError('A publishable key is required');
  }
  return key;
}

function applyCors(c: Context<HonoEnv>, allowed: string[]): void {
  const origin = c.req.header('Origin');
  if (!origin) return;
  if (allowed.includes('*')) {
    c.header('Access-Control-Allow-Origin', '*');
  } else if (allowed.includes(origin.replace(/\/$/, ''))) {
    c.header('Access-Control-Allow-Origin', origin);
    c.header('Vary', 'Origin');
  }
  c.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  c.header('Access-Control-Allow-Headers', 'Content-Type, X-Tanat-Key, X-Tanat-Visitor');
  c.header('Access-Control-Max-Age', '86400');
}

function sanitizeVisitor(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > 100 || !/^[A-Za-z0-9._:-]+$/.test(trimmed)) {
    return undefined;
  }
  return trimmed;
}

export function createPublicRouter(
  nearAiFactory: NearAiFactory = (env) => new NearAiService(env.NEAR_AI_API_KEY),
): Hono<HonoEnv> {
  const publicRouter = new Hono<HonoEnv>();

  // Resolve the key's origins once so even error responses are readable by the
  // browser. The key is looked up by hash; an invalid key simply gets no CORS.
  publicRouter.use('*', async (c, next) => {
    let allowed: string[] = [];
    const raw = c.req.header('X-Tanat-Key') ?? c.req.query('key') ?? '';
    const salt = c.env.API_KEY_SALT ?? '';
    if (raw.startsWith('pk_') && salt) {
      try {
        const row = await c.env.DB.prepare(
          'SELECT allowed_origins FROM publishable_keys WHERE key_hash = ? AND is_active = 1',
        )
          .bind(await hashApiKey(raw, salt))
          .first<{ allowed_origins: string }>();
        if (row) allowed = allowedOrigins(row.allowed_origins);
      } catch {
        // CORS setup is best effort; the route still validates the key.
      }
    }
    try {
      await next();
    } finally {
      applyCors(c, allowed);
    }
  });

  const createSessionSchema = z
    .object({
      user_id: z.string().max(160).optional(),
      user_signature: z.string().max(256).optional(),
      metadata: z.record(z.string(), z.unknown()).optional(),
    })
    .strict();

  const messageSchema = z
    .object({
      content: z.string().trim().min(1).max(4000),
    })
    .strict();

  async function authenticate(c: Context<HonoEnv>): Promise<PublishableKeyRow> {
    const salt = c.env.API_KEY_SALT ?? '';
    if (!salt) throw new ValidationError('API_KEY_SALT is not configured');

    const key = readKey(c);
    const keyHash = await hashApiKey(key, salt);

    const row = await c.env.DB.prepare(
      `SELECT pk.id, pk.tenant_id, pk.installation_id, pk.allowed_origins
         FROM publishable_keys pk
         JOIN tenants t ON t.id = pk.tenant_id
        WHERE pk.key_hash = ? AND pk.is_active = 1 AND t.status = 'active'`,
    )
      .bind(keyHash)
      .first<PublishableKeyRow>();

    if (!row) throw new ForbiddenError('This publishable key is not active');
    if (!row.installation_id) throw new ForbiddenError('This key is not bound to an agent');

    const allowed = allowedOrigins(row.allowed_origins);
    const origin = c.req.header('Origin');
    if (origin && !originAllowed(origin, allowed)) {
      throw new ForbiddenError('This origin is not allowed for this publishable key');
    }
    if (!origin && !allowed.includes('*') && allowed.length > 0) {
      // Server-side calls are allowed only when the key is unrestricted.
      throw new ForbiddenError('An Origin header is required for this key');
    }

    return row;
  }

  async function limit(c: Context<HonoEnv>, key: PublishableKeyRow): Promise<void> {
    const max = Number.parseInt(c.env.RATE_LIMIT_REQUESTS ?? '', 10) || 100;
    const windowSeconds = Number.parseInt(c.env.RATE_LIMIT_WINDOW_SECONDS ?? '', 10) || 60;
    const ip = requestIp(c) ?? 'unknown';
    const result = await consumeRateLimit(
      c.env.DB,
      `public:${key.id}:${ip}`,
      Math.max(10, Math.floor(max / 2)),
      windowSeconds,
    );
    if (result.count > result.maxRequests) {
      c.header('Retry-After', '60');
      throw new RateLimitError('Too many widget requests');
    }
  }

  async function loadInstallation(
    c: Context<HonoEnv>,
    key: PublishableKeyRow,
  ): Promise<InstallationContext> {
    const row = await c.env.DB.prepare(
      `SELECT i.id AS installation_id, i.config AS installation_config,
              a.id AS agent_id, a.name AS agent_name, a.description AS agent_description,
              a.system_prompt AS agent_prompt, a.model AS agent_model,
              a.max_tokens AS agent_max_tokens, a.temperature AS agent_temperature,
              t.name AS tenant_name, t.settings AS tenant_settings
         FROM installations i
         JOIN agents a ON a.id = i.agent_id
         JOIN tenants t ON t.id = i.tenant_id
        WHERE i.id = ? AND i.tenant_id = ? AND i.status = 'active'
          AND a.status = 'active'`,
    )
      .bind(key.installation_id, key.tenant_id)
      .first<InstallationContext>();

    if (!row) throw new NotFoundError('Agent installation');
    return { ...row, key_id: key.id };
  }

  async function markWebsiteConnected(
    c: Context<HonoEnv>,
    key: PublishableKeyRow,
  ): Promise<void> {
    try {
      await c.env.DB.batch([
        c.env.DB.prepare(
          `UPDATE agent_channels
              SET status = 'connected', last_seen_at = datetime('now'), updated_at = datetime('now')
            WHERE tenant_id = ? AND installation_id = ? AND channel = 'website'
              AND status != 'disabled'`,
        ).bind(key.tenant_id, key.installation_id),
        c.env.DB.prepare(
          "UPDATE publishable_keys SET last_used_at = datetime('now') WHERE id = ?",
        ).bind(key.id),
      ]);
    } catch (error) {
      // Status freshness must never fail a customer conversation.
      console.error('Failed to update widget channel status', error);
    }
  }

  // Preflight is answered here, not by the global allowlist.
  publicRouter.options('*', async (c) => c.body(null, 204));

  // ── GET /config — bootstrap the widget ─────────────────────────────
  publicRouter.get('/config', async (c) => {
    const key = await authenticate(c);
    const installation = await loadInstallation(c, key);
    const config = parseJson(installation.installation_config);
    const business = parseJson(installation.tenant_settings).business as
      | Record<string, unknown>
      | undefined;

    return c.json({
      data: {
        business: {
          name:
            typeof business?.name === 'string' ? business.name : installation.tenant_name,
        },
        agent: {
          name: installation.agent_name,
          description: installation.agent_description,
          greeting:
            typeof config.greeting === 'string'
              ? config.greeting
              : `Hi — I'm ${installation.agent_name}. How can I help?`,
        },
        capabilities: {
          streaming: false,
          payments: false,
          handoff: true,
        },
      },
    });
  });

  // ── POST /sessions — start a widget conversation ───────────────────
  publicRouter.post('/sessions', validateBody(createSessionSchema), async (c) => {
    const key = await authenticate(c);
    await limit(c, key);
    const installation = await loadInstallation(c, key);

    const body = getValidatedBody<z.infer<typeof createSessionSchema>>(c);
    const visitor = sanitizeVisitor(body.user_id ?? c.req.header('X-Tanat-Visitor'));
    const sessionId = generateId('sess');

    let verifiedUser = false;
    if (body.user_id && body.user_signature && c.env.API_KEY_SALT) {
      const expected = await hashApiKey(`${key.tenant_id}:${body.user_id}`, c.env.API_KEY_SALT);
      verifiedUser = expected === body.user_signature.trim().toLowerCase();
    }

    await c.env.DB.prepare(
      `INSERT INTO sessions (id, installation_id, tenant_id, user_id, metadata, status)
       VALUES (?, ?, ?, ?, ?, 'active')`,
    )
      .bind(
        sessionId,
        key.installation_id,
        key.tenant_id,
        visitor ?? null,
        JSON.stringify({
          channel: 'website',
          origin: c.req.header('Origin') ?? null,
          verified_user: verifiedUser,
          ...(body.metadata ?? {}),
        }),
      )
      .run();

    await markWebsiteConnected(c, key);
    await recordUsage(c.env.DB, key.tenant_id, 'api_call', 1, {
      endpoint: 'public.session.create',
      channel: 'website',
    });

    await logAudit(c.env.DB, {
      tenantId: key.tenant_id,
      action: 'widget.session_started',
      resourceType: 'session',
      resourceId: sessionId,
      actorId: key.id,
      details: { installation_id: key.installation_id },
      ipAddress: requestIp(c),
    });

    return c.json({
      data: {
        session_id: sessionId,
        agent: { name: installation.agent_name },
      },
    }, 201);
  });

  // ── POST /sessions/:id/messages — one turn ─────────────────────────
  publicRouter.post(
    '/sessions/:id/messages',
    validateBody(messageSchema),
    async (c) => {
      const key = await authenticate(c);
      await limit(c, key);
      const installation = await loadInstallation(c, key);
      const body = getValidatedBody<z.infer<typeof messageSchema>>(c);
      const sessionId = c.req.param('id');

      const session = await c.env.DB.prepare(
        `SELECT id, user_id FROM sessions
          WHERE id = ? AND tenant_id = ? AND installation_id = ? AND status = 'active'`,
      )
        .bind(sessionId, key.tenant_id, key.installation_id)
        .first<{ id: string; user_id: string | null }>();

      if (!session) throw new NotFoundError('Session');

      const startMs = Date.now();
      const userMessageId = generateId('msg');
      await c.env.DB.prepare(
        `INSERT INTO messages (id, session_id, tenant_id, role, content)
         VALUES (?, ?, ?, 'user', ?)`,
      )
        .bind(userMessageId, sessionId, key.tenant_id, body.content)
        .run();

      const tenantSettings = parseJson(installation.tenant_settings);
      const knowledge = await readyKnowledge(
        c.env.DB,
        key.tenant_id,
        installation.agent_id,
      );
      const memory = await retrieveMemoryContext(
        c.env.DB,
        key.tenant_id,
        session.user_id,
        installation.agent_id,
      );

      await extractAndStoreMemories(c.env.DB, {
        idGenerator: generateId,
        tenantId: key.tenant_id,
        externalUserId: session.user_id,
        agentId: installation.agent_id,
        sessionId,
        userMessage: body.content,
      });

      const history = await c.env.DB.prepare(
        `SELECT role, content FROM messages
          WHERE session_id = ? AND tenant_id = ?
          ORDER BY created_at DESC LIMIT 16`,
      )
        .bind(sessionId, key.tenant_id)
        .all<{ role: string; content: string }>();

      const systemPrompt = [
        `You are ${installation.agent_name}, an AI agent for ${installation.tenant_name}, talking to a website visitor.`,
        installation.agent_prompt,
        knowledge.context,
        memory.context,
        'Rules: answer only from approved business knowledge. If you do not know, say so and offer a human follow-up. Never invent order status, prices, stock, policies, or outcomes. Never ask for payment card details. Keep answers short and useful.',
      ]
        .filter(Boolean)
        .join('\n\n');

      const messages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        ...(history.results ?? [])
          .reverse()
          .filter(
            (row) =>
              (row.role === 'user' || row.role === 'assistant') &&
              typeof row.content === 'string',
          )
          .map((row) => ({
            role: row.role as 'user' | 'assistant',
            content: row.content,
          })),
      ];

      let content: string;
      let model: string | null = null;

      const ai = nearAiFactory(c.env);
      if (!ai.configured) {
        content =
          'This workspace has not connected an inference provider yet, so I cannot answer reliably. Please contact the business directly and a person will follow up.';
      } else {
        const resolvedModel = installation.agent_model.includes('/')
          ? installation.agent_model
          : NEAR_AI_DEFAULT_MODEL;
        const result = await ai.chat({
          model: resolvedModel,
          messages,
          maxTokens: Math.min(Math.max(installation.agent_max_tokens || 512, 128), 800),
          temperature: installation.agent_temperature ?? 0.4,
          requireTee: tenantSettings.allowNonTee !== true,
        });
        content =
          result.content.trim() ||
          'I do not have an answer for that from the approved business information. I can pass this to a person.';
        model = result.model;
        if (result.usage.totalTokens > 0) {
          await recordUsage(c.env.DB, key.tenant_id, 'tokens', result.usage.totalTokens, {
            session_id: sessionId,
            model: result.model,
            channel: 'website',
          });
        }
      }

      const assistantMessageId = generateId('msg');
      await c.env.DB.prepare(
        `INSERT INTO messages (id, session_id, tenant_id, role, content)
         VALUES (?, ?, ?, 'assistant', ?)`,
      )
        .bind(assistantMessageId, sessionId, key.tenant_id, content)
        .run();

      await markWebsiteConnected(c, key);

      try {
        await c.env.DB.prepare(
          `INSERT INTO agent_runs
             (id, tenant_id, agent_id, session_id, channel_type, status, duration_ms,
              model, privacy_tier, tokens_used, knowledge_ids, tool_calls, summary)
           VALUES (?, ?, ?, ?, 'website', 'completed', ?, ?, 'tee', 120, ?, '[]', ?)`,
        )
          .bind(
            generateId('run'),
            key.tenant_id,
            installation.agent_id,
            sessionId,
            Math.max(1, Date.now() - startMs),
            model ?? NEAR_AI_DEFAULT_MODEL,
            JSON.stringify(knowledge.sources.map((s) => ({ id: s.id, label: s.label }))),
            body.content.slice(0, 140),
          )
          .run();
      } catch {
        // Non-blocking run telemetry
      }

      return c.json({
        data: {
          id: assistantMessageId,
          session_id: sessionId,
          role: 'assistant',
          content,
          model,
          sources_used: knowledge.sources.map((s) => ({ id: s.id, label: s.label, kind: s.kind })),
        },
      });
    },
  );

  // ── GET /payment-intents/:id — hosted checkout summary ─────────────
  // The id is a random `pay_...` value and the response contains only what the
  // payer needs. No tenant key, customer list, or internal config is exposed.
  publicRouter.get('/payment-intents/:id', async (c) => {
    const id = c.req.param('id');
    if (!/^pay_[0-9a-f]{32}$/.test(id)) throw new NotFoundError('Payment');

    const row = await c.env.DB.prepare(
      `SELECT p.id, p.status, p.description, p.amount, p.currency,
              p.deposit_address, p.expires_at, p.paid_at, p.created_at,
              t.name AS tenant_name
         FROM payment_intents p
         JOIN tenants t ON t.id = p.tenant_id
        WHERE p.id = ? AND t.status = 'active'`,
    )
      .bind(id)
      .first<Record<string, unknown>>();

    if (!row) throw new NotFoundError('Payment');

    return c.json({
      data: {
        id: row.id,
        status: row.status,
        description: row.description,
        amount: row.amount,
        currency: row.currency,
        deposit_address: row.deposit_address,
        expires_at: row.expires_at,
        paid_at: row.paid_at,
        created_at: row.created_at,
        business: row.tenant_name,
      },
    });
  });

  return publicRouter;
}
