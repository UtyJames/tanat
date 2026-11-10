/**
 * Tanat — Session & Chat routes
 *
 * The core chat endpoint. When a message mentions money-related keywords
 * the mock AI proposes an Action for approval.
 */

import { Hono } from 'hono';
import type { Context } from 'hono';
import { z } from 'zod';
import type { HonoEnv } from '../types';
import { validateBody, getValidatedBody } from '../middleware/validation';
import { generateId } from '../utils/crypto';
import { logAudit, requestIp } from '../utils/audit';
import { recordUsage } from '../services/metering.service';
import {
  ForbiddenError,
  NotFoundError,
  RateLimitError,
  ValidationError,
} from '../utils/errors';
import { parseNearToYocto } from '../utils/money';
import { keyHasAnyScope, requireScope } from '../middleware/scopes';
import { parsePagination } from '../utils/pagination';
import * as actionService from '../services/action.service';
import { isValidNearAccount } from '../services/near.service';

export const sessionsRouter = new Hono<HonoEnv>();

sessionsRouter.use('*', requireScope('sessions'));

// ── Schemas ───────────────────────────────────────────────────────────
const createSessionSchema = z.object({
  installation_id: z.string().min(1),
  user_id: z.string().max(200).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const sendMessageSchema = z.object({
  content: z.string().min(1).max(32000),
});

const MAX_IDEMPOTENCY_KEY_LENGTH = 128;

function readIdempotencyKey(
  header: string | undefined,
): string | undefined {
  if (header === undefined) return undefined;

  const trimmed = header.trim();
  if (
    trimmed.length === 0 ||
    trimmed.length > MAX_IDEMPOTENCY_KEY_LENGTH ||
    !/^[A-Za-z0-9._:-]+$/.test(trimmed)
  ) {
    throw new ValidationError(
      'Idempotency-Key must be 1-128 characters of letters, digits, dot, underscore, colon, or hyphen',
    );
  }

  return trimmed;
}

function parseJsonObject(raw: string | null | undefined): Record<string, unknown> {
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

const NEAR_PER_UNIT = 1_000_000_000_000_000_000_000_000n;
const HIGH_RISK_THRESHOLD = 20n * NEAR_PER_UNIT;
const CRITICAL_RISK_THRESHOLD = 50n * NEAR_PER_UNIT;

async function assertProposalScope(c: Context<HonoEnv>): Promise<void> {
  const scopes = c.get('scopes') ?? [];
  if (keyHasAnyScope(scopes, ['actions:propose'])) return;

  await logAudit(c.env.DB, {
    tenantId: c.get('tenantId') ?? 'unknown',
    action: 'authz.denied',
    resourceType: 'action',
    resourceId: c.req.param('id') ?? 'unknown',
    actorId: c.get('apiKeyId'),
    details: { required_scopes: ['actions:propose'], path: c.req.path },
    ipAddress: requestIp(c),
  });

  throw new ForbiddenError(
    'API key missing required scope: actions:propose',
  );
}

function proposedActionView(action: actionService.ActionRow) {
  const params = parseJsonObject(action.params);
  return {
    id: action.id,
    type: action.type,
    description: action.description,
    amount: typeof params.amount === 'string' ? params.amount : undefined,
    currency: typeof params.currency === 'string' ? params.currency : 'NEAR',
    risk_level: action.risk_level,
    status: action.status,
    approvals: action.approvals,
    required_approvals: action.required_approvals,
    expires_at: action.expires_at,
  };
}

// ── GET / — list sessions ─────────────────────────────────────────────
sessionsRouter.get('/', async (c) => {
  const tenantId = c.get('tenantId');
  const installationId = c.req.query('installation_id');
  const { page, limit, offset } = parsePagination({
    page: c.req.query('page'),
    limit: c.req.query('limit'),
  });

  let where = "WHERE s.tenant_id = ? AND s.status != 'expired'";
  const params: unknown[] = [tenantId];

  if (installationId) {
    where += ' AND s.installation_id = ?';
    params.push(installationId);
  }

  const { results } = await c.env.DB.prepare(
    `SELECT s.*, a.name as agent_name
     FROM sessions s
     JOIN installations i ON i.id = s.installation_id
     JOIN agents a ON a.id = i.agent_id
     ${where}
     ORDER BY s.created_at DESC
     LIMIT ? OFFSET ?`,
  )
    .bind(...params, limit, offset)
    .all();

  return c.json({ data: results ?? [], meta: { page, limit } });
});

// ── GET /:id — get session with messages ──────────────────────────────
sessionsRouter.get('/:id', async (c) => {
  const tenantId = c.get('tenantId');
  const sessionId = c.req.param('id');

  const session = await c.env.DB.prepare(
    'SELECT * FROM sessions WHERE id = ? AND tenant_id = ?',
  )
    .bind(sessionId, tenantId)
    .first();

  if (!session) throw new NotFoundError('Session');

  const { results: messages } = await c.env.DB.prepare(
    'SELECT * FROM messages WHERE session_id = ? AND tenant_id = ? ORDER BY created_at ASC',
  )
    .bind(sessionId, tenantId)
    .all();

  return c.json({ data: { ...session, messages: messages ?? [] } });
});

// ── POST / — create session ───────────────────────────────────────────
sessionsRouter.post('/', validateBody(createSessionSchema), async (c) => {
  const tenantId = c.get('tenantId');
  const body = getValidatedBody<z.infer<typeof createSessionSchema>>(c);

  // Verify installation belongs to tenant
  const installation = await c.env.DB.prepare(
    "SELECT id FROM installations WHERE id = ? AND tenant_id = ? AND status = 'active'",
  )
    .bind(body.installation_id, tenantId)
    .first();

  if (!installation) throw new NotFoundError('Installation');

  const id = generateId('sess');
  await c.env.DB.prepare(
    `INSERT INTO sessions (id, installation_id, tenant_id, user_id, metadata, status, started_at, created_at)
     VALUES (?, ?, ?, ?, ?, 'active', datetime('now'), datetime('now'))`,
  )
    .bind(
      id,
      body.installation_id,
      tenantId,
      body.user_id ?? null,
      JSON.stringify(body.metadata ?? {}),
    )
    .run();

  const session = await c.env.DB.prepare('SELECT * FROM sessions WHERE id = ?')
    .bind(id)
    .first();

  await recordUsage(c.env.DB, tenantId, 'api_call', 1, { endpoint: 'session.create' });

  return c.json({ data: session }, 201);
});

// ── POST /:id/messages — send a message (core chat) ──────────────────
sessionsRouter.post('/:id/messages', validateBody(sendMessageSchema), async (c) => {
  const tenantId = c.get('tenantId');
  const apiKeyId = c.get('apiKeyId');
  const sessionId = c.req.param('id');
  const body = getValidatedBody<z.infer<typeof sendMessageSchema>>(c);
  const idempotencyKey = readIdempotencyKey(
    c.req.header('Idempotency-Key') ?? c.req.header('X-Idempotency-Key'),
  );

  // M-03: a retried money message returns the existing proposal.
  if (idempotencyKey) {
    const existing = await actionService.findActionByIdempotencyKey(
      c.env.DB,
      tenantId,
      idempotencyKey,
    );
    if (existing) {
      return c.json({
        data: {
          id: existing.message_id ?? existing.id,
          session_id: existing.session_id,
          role: 'assistant',
          content: existing.description,
          proposed_action: proposedActionView(existing),
          created_at: existing.created_at,
          idempotent_replay: true,
        },
      });
    }
  }

  // Verify session belongs to tenant and the installation is active.
  const session = await c.env.DB.prepare(
    `SELECT s.*, i.config AS installation_config, i.status AS installation_status,
            a.model AS agent_model
       FROM sessions s
       JOIN installations i ON i.id = s.installation_id
       JOIN agents a ON a.id = i.agent_id
      WHERE s.id = ? AND s.tenant_id = ? AND s.status = 'active'
        AND i.status = 'active'`,
  )
    .bind(sessionId, tenantId)
    .first<{
      id: string;
      installation_id: string;
      installation_config: string;
      agent_model: string;
    }>();

  if (!session) throw new NotFoundError('Session');

  const tenant = await c.env.DB.prepare(
    "SELECT settings, near_account_id FROM tenants WHERE id = ? AND status = 'active'",
  )
    .bind(tenantId)
    .first<{ settings: string; near_account_id: string | null }>();

  if (!tenant) throw new NotFoundError('Tenant');

  const tenantSettings = parseJsonObject(tenant.settings);
  const installationConfig = parseJsonObject(session.installation_config);

  // M-09: tenant monthly API-call quota.
  const maxApiCalls = Number(tenantSettings.maxApiCalls);
  if (Number.isFinite(maxApiCalls) && maxApiCalls > 0) {
    const usage = await c.env.DB.prepare(
      `SELECT COUNT(*) AS count FROM usage_records
        WHERE tenant_id = ? AND type = 'api_call'
          AND recorded_at >= datetime('now', 'start of month')`,
    )
      .bind(tenantId)
      .first<{ count: number }>();

    if ((usage?.count ?? 0) >= maxApiCalls) {
      throw new RateLimitError('Monthly API call limit reached');
    }
  }

  // M-09: only allow models the tenant has approved.
  const allowedModels = Array.isArray(tenantSettings.allowedModels)
    ? tenantSettings.allowedModels.filter(
        (value): value is string => typeof value === 'string',
      )
    : null;

  if (allowedModels && allowedModels.length > 0 && !allowedModels.includes(session.agent_model)) {
    throw new ForbiddenError('This agent model is not allowed for the tenant');
  }

  // Save user message
  const userMsgId = generateId('msg');
  await c.env.DB.prepare(
    `INSERT INTO messages (id, session_id, tenant_id, role, content, created_at)
     VALUES (?, ?, ?, 'user', ?, datetime('now'))`,
  )
    .bind(userMsgId, sessionId, tenantId, body.content)
    .run();

  await recordUsage(c.env.DB, tenantId, 'api_call', 1, { endpoint: 'session.message' });

  // ── Mock AI response ──────────────────────────────────────────────
  // In production this would call an LLM. For the hackathon demo the
  // mock detects money-related keywords and proposes actions.
  const lower = body.content.toLowerCase();
  const isMoneyRequest =
    /\b(refund|transfer|send|pay|payment|withdraw)\b/.test(lower);

  let assistantContent: string;
  let proposedAction: ReturnType<typeof proposedActionView> | null = null;

  if (isMoneyRequest) {
    // M-10: only an explicit NEAR amount is accepted. `$240` is not 240 NEAR.
    const nearAmountMatch =
      lower.match(/(\d+(?:\.\d+)?)\s*(?:near|ⓝ)\b/i) ??
      lower.match(/(?:near|ⓝ)\s*(\d+(?:\.\d+)?)/i);

    const hasDollarAmount = /\$\s*\d/.test(lower);

    if (!nearAmountMatch) {
      assistantContent = hasDollarAmount
        ? 'I can only move NEAR, not US dollars. Please tell me the amount in NEAR and the recipient NEAR account.'
        : 'I can prepare that, but I need the amount in NEAR and the recipient NEAR account.';
    } else {
      const amount = nearAmountMatch[1];

      const accountMatch = body.content.match(
        /([a-z0-9_-]+\.(?:near|testnet))/i,
      );
      const recipient = accountMatch ? accountMatch[1].toLowerCase() : '';

      if (!recipient || !isValidNearAccount(recipient)) {
        assistantContent =
          'I need a valid recipient NEAR account (for example, alice.near or bob.testnet) before I can propose a payment.';
      } else {
        await assertProposalScope(c);

        let amountYocto: bigint;
        try {
          amountYocto = parseNearToYocto(amount);
        } catch {
          throw new ValidationError('Invalid NEAR amount');
        }

        // M-09: installation-level refund cap.
        const maxRefundNear =
          typeof installationConfig.maxRefundNear === 'string'
            ? installationConfig.maxRefundNear
            : null;
        const paymentsEnabled =
          typeof installationConfig.features === 'object' &&
          installationConfig.features !== null &&
          (installationConfig.features as Record<string, unknown>).nearPayments === false
            ? false
            : true;

        let maxRefundYocto: bigint | null = null;
        if (maxRefundNear) {
          try {
            maxRefundYocto = parseNearToYocto(maxRefundNear);
          } catch {
            throw new ValidationError('Installation payment limit is invalid');
          }
        }

        if (!paymentsEnabled) {
          assistantContent =
            'NEAR payments are disabled for this agent installation. An administrator must enable them before I can propose a payment.';
        } else if (
          maxRefundYocto !== null &&
          amountYocto > maxRefundYocto
        ) {
          assistantContent = `That amount is above this agent's limit of ${maxRefundNear} NEAR per payment. Please ask for a smaller amount or contact an administrator.`;
        } else {
          let actionType = 'near_transfer';
          let riskLevel = 'medium';

          if (/refund/i.test(lower)) {
            actionType = 'refund';
            riskLevel = amountYocto > HIGH_RISK_THRESHOLD ? 'high' : 'medium';
          } else if (/payment/i.test(lower)) {
            actionType = 'payment';
            riskLevel = amountYocto > CRITICAL_RISK_THRESHOLD ? 'critical' : 'high';
          } else if (amountYocto > CRITICAL_RISK_THRESHOLD) {
            riskLevel = 'critical';
          } else if (amountYocto > HIGH_RISK_THRESHOLD) {
            riskLevel = 'high';
          }

          const senderAccount = tenant.near_account_id ?? 'tenant.near';

          assistantContent = `I can process that for you. I'll prepare a **${actionType.replace(/_/g, ' ')}** of **${amount} NEAR** to **${recipient}**.\n\n⚠️ This action requires your approval before any funds move.`;

          const action = await actionService.createAction(c.env.DB, {
            tenant_id: tenantId,
            session_id: sessionId,
            message_id: userMsgId,
            type: actionType,
            description: `${actionType.replace(/_/g, ' ')} of ${amount} NEAR to ${recipient}`,
            params: {
              from_account: senderAccount,
              to_account: recipient,
              amount,
              amount_yocto: amountYocto.toString(),
              currency: 'NEAR',
            },
            risk_level: riskLevel,
            idempotency_key: idempotencyKey,
            expires_at: new Date(Date.now() + 3600_000).toISOString(),
            proposed_by: apiKeyId,
          });

          proposedAction = proposedActionView(action);

          await logAudit(c.env.DB, {
            tenantId,
            action: 'action.proposed',
            resourceType: 'action',
            resourceId: action.id,
            actorId: apiKeyId,
            details: {
              type: actionType,
              amount,
              recipient,
              risk_level: riskLevel,
              required_approvals: action.required_approvals,
            },
            ipAddress: requestIp(c),
          });
        }
      }
    }
  } else {
    // Normal conversational response
    assistantContent = generateMockResponse(body.content);
  }

  // Save assistant message
  const assistantMsgId = generateId('msg');
  await c.env.DB.prepare(
    `INSERT INTO messages (id, session_id, tenant_id, role, content, tool_calls, created_at)
     VALUES (?, ?, ?, 'assistant', ?, ?, datetime('now'))`,
  )
    .bind(
      assistantMsgId,
      sessionId,
      tenantId,
      assistantContent,
      proposedAction ? JSON.stringify(proposedAction) : null,
    )
    .run();

  await recordUsage(c.env.DB, tenantId, 'tokens', 150, {
    session_id: sessionId,
  });

  return c.json({
    data: {
      id: assistantMsgId,
      session_id: sessionId,
      role: 'assistant',
      content: assistantContent,
      proposed_action: proposedAction,
      created_at: new Date().toISOString(),
    },
  });
});

// ── PATCH /:id — close/expire session ─────────────────────────────────
sessionsRouter.patch('/:id', async (c) => {
  const tenantId = c.get('tenantId');
  const sessionId = c.req.param('id');

  const result = await c.env.DB.prepare(
    "UPDATE sessions SET status = 'closed', ended_at = datetime('now') WHERE id = ? AND tenant_id = ? AND status = 'active'",
  )
    .bind(sessionId, tenantId)
    .run();

  if (!result.meta.changes) throw new NotFoundError('Session');

  // L-02: closing a session is a kill switch for its pending money actions.
  // M-19: never expire an action whose claim is sending/sent/unknown — money
  // may already have moved; those claims resolve via reconciliation.
  await c.env.DB.prepare(
    `UPDATE actions SET status = 'expired', updated_at = datetime('now')
      WHERE session_id = ? AND tenant_id = ? AND status IN ('pending', 'approved')
        AND NOT EXISTS (
          SELECT 1 FROM action_claims c
           WHERE c.action_id = actions.id
             AND c.state IN ('sending', 'sent', 'unknown')
        )`,
  )
    .bind(sessionId, tenantId)
    .run();

  await logAudit(c.env.DB, {
    tenantId,
    action: 'session.closed',
    resourceType: 'session',
    resourceId: sessionId,
    actorId: c.get('apiKeyId'),
    ipAddress: requestIp(c),
  });

  return c.json({ data: { closed: true } });
});

// ── Helper: mock response generator ───────────────────────────────────
function generateMockResponse(userMessage: string): string {
  const lower = userMessage.toLowerCase();

  if (/hello|hi|hey/i.test(lower)) {
    return "Hello! I'm your AI support agent. How can I help you today? I can assist with refunds, transfers, and account inquiries.";
  }
  if (/help/i.test(lower)) {
    return "I can help you with:\n• **Refunds** — Request a refund to any NEAR account\n• **Transfers** — Send NEAR tokens securely\n• **Account info** — Check balances and transaction history\n\nJust tell me what you need!";
  }
  if (/balance|account/i.test(lower)) {
    return 'Your current NEAR balance is **47.35 NEAR**. Would you like to see recent transactions?';
  }
  if (/status|order/i.test(lower)) {
    return 'I found your most recent order **#ORD-2847**. It was delivered on Nov 3rd. Is there anything else you need help with?';
  }
  if (/thank/i.test(lower)) {
    return "You're welcome! Let me know if there's anything else I can help with. 😊";
  }

  return "I understand your request. Could you provide more details so I can assist you better? If you need to process a payment or refund, just let me know the amount and recipient's NEAR account.";
}
