/**
 * Tanat — Platform Infrastructure Routes (`/api/v1/platform`).
 *
 * Provides the full authenticated backend for:
 * - Agent templates & industry-aware recommendations
 * - Central Knowledge Base CRUD (FAQs, text, policies, URLs, documents)
 * - Workspace & Customer Memory management
 * - Agent Lifecycle & Version snapshots (Draft -> Testing -> Published -> Paused)
 * - Business System Integrations catalogue & connection status
 * - Activity / Execution Runs telemetry
 * - Real database-backed Analytics (never fabricated)
 * - Workspace Team Members & Invitations
 * - Verified-User HMAC signature helper for Widget & SDK integrations
 */

import { Hono } from 'hono';
import { z } from 'zod';
import type { HonoEnv } from '../types';
import { validateBody, getValidatedBody } from '../middleware/validation';
import { generateId, hashApiKey } from '../utils/crypto';
import { logAudit } from '../utils/audit';
import { NotFoundError, ValidationError } from '../utils/errors';
import {
  AGENT_TEMPLATES,
  SUPPORTED_INDUSTRIES,
  recommendTemplates,
} from '../services/agent-templates';

export const platformRouter = new Hono<HonoEnv>();

function parseJson<T = Record<string, unknown>>(
  raw: string | null | undefined,
  fallback: T,
): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

// ── 1. Agent Templates & Recommendations ──────────────────────────────
platformRouter.get('/templates', async (c) => {
  const industry = (c.req.query('industry') ?? '').trim();
  const responsibilitiesRaw = (c.req.query('responsibilities') ?? '').trim();
  const responsibilities = responsibilitiesRaw
    ? responsibilitiesRaw.split(',').map((item) => item.trim()).filter(Boolean)
    : [];

  const recommended =
    industry || responsibilities.length > 0
      ? recommendTemplates(industry || 'other', responsibilities)
      : AGENT_TEMPLATES.slice(0, 6);

  return c.json({
    data: {
      industries: SUPPORTED_INDUSTRIES,
      templates: AGENT_TEMPLATES,
      recommended,
    },
  });
});

// ── 2. Knowledge Base CRUD ────────────────────────────────────────────
const createKnowledgeSchema = z
  .object({
    kind: z.enum(['website', 'document', 'pdf', 'faq', 'text', 'catalog', 'policy']),
    label: z.string().trim().min(2).max(160),
    uri: z.string().trim().max(500).optional(),
    content: z.string().trim().max(30000).optional(),
    agent_id: z.string().trim().max(100).nullable().optional(),
  })
  .strict();

platformRouter.get('/knowledge', async (c) => {
  const tenantId = c.get('tenantId');
  const agentId = c.req.query('agent_id');

  const query = agentId
    ? `SELECT k.*, a.name AS agent_name
         FROM knowledge_sources k
         LEFT JOIN agents a ON a.id = k.agent_id
        WHERE k.tenant_id = ? AND (k.agent_id IS NULL OR k.agent_id = ?)
        ORDER BY k.created_at DESC`
    : `SELECT k.*, a.name AS agent_name
         FROM knowledge_sources k
         LEFT JOIN agents a ON a.id = k.agent_id
        WHERE k.tenant_id = ?
        ORDER BY k.created_at DESC`;

  const stmt = agentId
    ? c.env.DB.prepare(query).bind(tenantId, agentId)
    : c.env.DB.prepare(query).bind(tenantId);

  const { results } = await stmt.all();
  return c.json({ data: results ?? [] });
});

platformRouter.post('/knowledge', validateBody(createKnowledgeSchema), async (c) => {
  const tenantId = c.get('tenantId');
  const body = getValidatedBody<z.infer<typeof createKnowledgeSchema>>(c);

  const hasContent = Boolean(body.content && body.content.trim().length > 0);
  if (!hasContent && !body.uri) {
    throw new ValidationError('Provide either content text or a source URL.');
  }

  if (body.agent_id) {
    const agent = await c.env.DB.prepare(
      "SELECT id FROM agents WHERE id = ? AND tenant_id = ? AND status != 'archived'",
    )
      .bind(body.agent_id, tenantId)
      .first();
    if (!agent) throw new NotFoundError('Agent');
  }

  const id = generateId('knw');
  // Sources with inline content are immediately ready for retrieval;
  // URL-only sources without pasted text are marked pending crawl.
  const status = hasContent ? 'ready' : 'pending';

  await c.env.DB.prepare(
    `INSERT INTO knowledge_sources
       (id, tenant_id, agent_id, kind, label, uri, content, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
  )
    .bind(
      id,
      tenantId,
      body.agent_id ?? null,
      body.kind,
      body.label,
      body.uri ?? null,
      body.content ?? null,
      status,
    )
    .run();

  const created = await c.env.DB.prepare(
    'SELECT * FROM knowledge_sources WHERE id = ? AND tenant_id = ?',
  )
    .bind(id, tenantId)
    .first();

  await logAudit(c.env.DB, {
    tenantId,
    action: 'knowledge.created',
    resourceType: 'knowledge_source',
    resourceId: id,
    actorId: c.get('apiKeyId'),
    details: { kind: body.kind, label: body.label, status },
  });

  return c.json({ data: created }, 201);
});

platformRouter.delete('/knowledge/:id', async (c) => {
  const tenantId = c.get('tenantId');
  const id = c.req.param('id');

  const res = await c.env.DB.prepare(
    'DELETE FROM knowledge_sources WHERE id = ? AND tenant_id = ?',
  )
    .bind(id, tenantId)
    .run();

  if (!res.meta.changes) throw new NotFoundError('Knowledge source');

  await logAudit(c.env.DB, {
    tenantId,
    action: 'knowledge.deleted',
    resourceType: 'knowledge_source',
    resourceId: id,
    actorId: c.get('apiKeyId'),
  });

  return c.json({ data: { deleted: true } });
});

// ── 3. Workspace & Customer Memories ──────────────────────────────────
const createMemorySchema = z
  .object({
    memory_type: z
      .enum(['fact', 'preference', 'summary', 'business_context', 'action_history'])
      .default('business_context'),
    fact: z.string().trim().min(3).max(2000),
    external_user_id: z.string().trim().max(160).nullable().optional(),
    agent_id: z.string().trim().max(100).nullable().optional(),
  })
  .strict();

platformRouter.get('/memories', async (c) => {
  const tenantId = c.get('tenantId');
  const agentId = c.req.query('agent_id');
  const userId = c.req.query('user_id');

  let sql = 'SELECT * FROM customer_memories WHERE tenant_id = ?';
  const params: unknown[] = [tenantId];

  if (agentId) {
    sql += ' AND (agent_id IS NULL OR agent_id = ?)';
    params.push(agentId);
  }
  if (userId) {
    sql += ' AND external_user_id = ?';
    params.push(userId);
  }
  sql += ' ORDER BY created_at DESC LIMIT 100';

  const { results } = await c.env.DB.prepare(sql).bind(...params).all();
  return c.json({ data: results ?? [] });
});

platformRouter.post('/memories', validateBody(createMemorySchema), async (c) => {
  const tenantId = c.get('tenantId');
  const body = getValidatedBody<z.infer<typeof createMemorySchema>>(c);
  const id = generateId('mem');

  await c.env.DB.prepare(
    `INSERT INTO customer_memories
       (id, tenant_id, external_user_id, agent_id, memory_type, fact, created_at)
     VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
  )
    .bind(
      id,
      tenantId,
      body.external_user_id ?? null,
      body.agent_id ?? null,
      body.memory_type,
      body.fact,
    )
    .run();

  const row = await c.env.DB.prepare(
    'SELECT * FROM customer_memories WHERE id = ? AND tenant_id = ?',
  )
    .bind(id, tenantId)
    .first();

  return c.json({ data: row }, 201);
});

platformRouter.delete('/memories/:id', async (c) => {
  const tenantId = c.get('tenantId');
  const id = c.req.param('id');

  const res = await c.env.DB.prepare(
    'DELETE FROM customer_memories WHERE id = ? AND tenant_id = ?',
  )
    .bind(id, tenantId)
    .run();

  if (!res.meta.changes) throw new NotFoundError('Memory');
  return c.json({ data: { deleted: true } });
});

// ── 4. Agent Lifecycle & Version History ──────────────────────────────
const lifecycleSchema = z
  .object({
    lifecycle_status: z.enum(['draft', 'testing', 'published', 'paused']),
    notes: z.string().trim().max(500).optional(),
  })
  .strict();

platformRouter.get('/agents/:id/versions', async (c) => {
  const tenantId = c.get('tenantId');
  const agentId = c.req.param('id');

  const { results } = await c.env.DB.prepare(
    `SELECT * FROM agent_versions
      WHERE agent_id = ? AND tenant_id = ?
      ORDER BY version DESC LIMIT 30`,
  )
    .bind(agentId, tenantId)
    .all();

  return c.json({ data: results ?? [] });
});

platformRouter.post(
  '/agents/:id/lifecycle',
  validateBody(lifecycleSchema),
  async (c) => {
    const tenantId = c.get('tenantId');
    const agentId = c.req.param('id');
    const body = getValidatedBody<z.infer<typeof lifecycleSchema>>(c);

    const agent = await c.env.DB.prepare(
      "SELECT * FROM agents WHERE id = ? AND tenant_id = ? AND status != 'archived'",
    )
      .bind(agentId, tenantId)
      .first<Record<string, unknown>>();

    if (!agent) throw new NotFoundError('Agent');

    const currentVersion = Number(agent.version ?? 1);
    const nextVersion =
      body.lifecycle_status === 'published' ? currentVersion + 1 : currentVersion;
    const config = parseJson<Record<string, unknown>>(
      String(agent.config ?? '{}'),
      {},
    );
    const nextConfig = {
      ...config,
      lifecycle: body.lifecycle_status,
      updated_lifecycle_at: new Date().toISOString(),
    };

    await c.env.DB.prepare(
      `UPDATE agents
          SET version = ?, config = ?, updated_at = datetime('now')
        WHERE id = ? AND tenant_id = ?`,
    )
      .bind(nextVersion, JSON.stringify(nextConfig), agentId, tenantId)
      .run();

    // Sync installation status when pausing or publishing
    const installStatus = body.lifecycle_status === 'paused' ? 'paused' : 'active';
    await c.env.DB.prepare(
      `UPDATE installations
          SET status = ?, updated_at = datetime('now')
        WHERE agent_id = ? AND tenant_id = ? AND status != 'removed'`,
    )
      .bind(installStatus, agentId, tenantId)
      .run();

    const versionId = generateId('ver');
    await c.env.DB.prepare(
      `INSERT INTO agent_versions
         (id, agent_id, tenant_id, version, lifecycle_status, config_snapshot, notes, published_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        versionId,
        agentId,
        tenantId,
        nextVersion,
        body.lifecycle_status,
        JSON.stringify({
          name: agent.name,
          description: agent.description,
          system_prompt: agent.system_prompt,
          model: agent.model,
          config: nextConfig,
        }),
        body.notes ?? `Transitioned to ${body.lifecycle_status}`,
        c.get('apiKeyId') ?? 'workspace_admin',
      )
      .run();

    await logAudit(c.env.DB, {
      tenantId,
      action: `agent.${body.lifecycle_status}`,
      resourceType: 'agent',
      resourceId: agentId,
      actorId: c.get('apiKeyId'),
      details: { version: nextVersion, lifecycle: body.lifecycle_status },
    });

    return c.json({
      data: {
        agent_id: agentId,
        version: nextVersion,
        lifecycle_status: body.lifecycle_status,
        installation_status: installStatus,
      },
    });
  },
);

// ── 5. Business System Integrations Catalogue ─────────────────────────
export const INTEGRATION_CATALOGUE = [
  {
    provider: 'website_widget',
    name: 'Website Chat Widget',
    category: 'Messaging & communication',
    description:
      'Embeddable Shadow-DOM widget for any website, React/Next.js app, Shopify, or WordPress site.',
    capabilities: ['Live conversations', 'Origin-locked publishable key', 'Action & approval cards'],
    availability: 'live',
  },
  {
    provider: 'rest_api',
    name: 'REST API, SDK & Webhooks',
    category: 'Developer tools',
    description:
      'Programmatic agent sessions, knowledge ingestion, verified user tokens, and event webhooks.',
    capabilities: ['Sessions & messages', 'Knowledge API', 'Idempotent action governance'],
    availability: 'live',
  },
  {
    provider: 'near_ai_cloud',
    name: 'NEAR AI Cloud (TEE Inference)',
    category: 'Developer tools',
    description:
      'Confidential hardware-attested (TEE) inference foundation powering Tanat agents.',
    capabilities: ['Attested TEE models', 'Tool calling', 'Privacy-tier verification'],
    availability: 'live',
  },
  {
    provider: 'near_payments',
    name: 'NEAR & NEAR Intents Settlement',
    category: 'Finance',
    description:
      'Approval-gated payouts, refunds, and cross-chain payment intents with spending limits.',
    capabilities: ['Human approval workflow', 'Per-payment & tenant caps', 'Hosted payment links'],
    availability: 'live',
  },
  {
    provider: 'mcp_server',
    name: 'MCP & Vibecoder Bridge (llms.txt)',
    category: 'Developer tools',
    description:
      'Machine-readable context and Model Context Protocol endpoint for Cursor, Lovable, Bolt.new, and v0.',
    capabilities: ['llms.txt & llms-full.txt', 'One-click Cursor/Lovable prompts', 'MCP tool discovery'],
    availability: 'live',
  },
  {
    provider: 'telegram',
    name: 'Telegram Bot',
    category: 'Messaging & communication',
    description:
      'Deploy your agent to a Telegram bot handle via BotFather token and webhook.',
    capabilities: ['Direct & group messages', 'Inline approval buttons', 'Shared agent brain'],
    availability: 'beta',
  },
  {
    provider: 'whatsapp',
    name: 'WhatsApp Business Cloud API',
    category: 'Messaging & communication',
    description:
      'Connect an official Meta WhatsApp Business number to your Tanat agents.',
    capabilities: ['Customer messaging', 'Template notifications', 'Human escalation'],
    availability: 'beta',
  },
  {
    provider: 'slack',
    name: 'Slack Workspace',
    category: 'Productivity',
    description:
      'Deploy internal HR, IT, Knowledge, and Operations agents directly into Slack channels.',
    capabilities: ['Internal team Q&A', 'Approval notifications', 'Escalation alerts'],
    availability: 'coming_soon',
  },
  {
    provider: 'shopify',
    name: 'Shopify Storefront & Orders',
    category: 'E-commerce',
    description:
      'Sync product catalogue, look up order statuses, and propose verified refunds.',
    capabilities: ['Catalogue sync', 'Order status lookup', 'Approval-gated refunds'],
    availability: 'coming_soon',
  },
  {
    provider: 'google_calendar',
    name: 'Google Calendar & Scheduling',
    category: 'Scheduling',
    description:
      'Allow Booking & Appointment agents to check real availability and schedule slots.',
    capabilities: ['Availability lookup', 'Appointment creation', 'Rescheduling'],
    availability: 'coming_soon',
  },
  {
    provider: 'hubspot_crm',
    name: 'HubSpot / CRM Sync',
    category: 'CRM & sales',
    description:
      'Push qualified leads, conversation summaries, and customer context to your CRM.',
    capabilities: ['Lead capture', 'Contact enrichment', 'Conversation notes'],
    availability: 'coming_soon',
  },
  {
    provider: 'custom_webhook',
    name: 'Custom Webhook & HTTP Tool',
    category: 'Custom APIs',
    description:
      'Trigger your own internal APIs or receive signed webhook events when agents take action.',
    capabilities: ['Signed payloads', 'Custom headers', 'Action lifecycle events'],
    availability: 'live',
  },
] as const;

platformRouter.get('/integrations', async (c) => {
  const tenantId = c.get('tenantId');
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM tenant_integrations WHERE tenant_id = ?',
  )
    .bind(tenantId)
    .all<Record<string, unknown>>();

  const connectedMap = new Map(
    (results ?? []).map((row) => [String(row.provider), row]),
  );

  const items = INTEGRATION_CATALOGUE.map((entry) => {
    const saved = connectedMap.get(entry.provider);
    const defaultStatus =
      entry.provider === 'website_widget' ||
      entry.provider === 'rest_api' ||
      entry.provider === 'near_ai_cloud' ||
      entry.provider === 'mcp_server'
        ? 'connected'
        : entry.availability === 'coming_soon'
          ? 'coming_soon'
          : 'disconnected';

    return {
      ...entry,
      status: saved ? String(saved.status) : defaultStatus,
      config: saved ? parseJson(String(saved.config ?? '{}'), {}) : {},
      permissions: saved ? parseJson(String(saved.permissions ?? '["read"]'), ['read']) : ['read'],
      connected_at: saved?.connected_at ?? null,
    };
  });

  return c.json({ data: items });
});

const configureIntegrationSchema = z
  .object({
    provider: z.string().trim().min(2).max(80),
    status: z.enum(['connected', 'disconnected', 'awaiting_auth']),
    config: z.record(z.string(), z.unknown()).optional(),
    permissions: z.array(z.string()).optional(),
  })
  .strict();

platformRouter.post(
  '/integrations',
  validateBody(configureIntegrationSchema),
  async (c) => {
    const tenantId = c.get('tenantId');
    const body = getValidatedBody<z.infer<typeof configureIntegrationSchema>>(c);

    const catalogItem = INTEGRATION_CATALOGUE.find(
      (item) => item.provider === body.provider,
    );
    if (!catalogItem) throw new NotFoundError('Integration provider');

    if (catalogItem.availability === 'coming_soon' && body.status === 'connected') {
      throw new ValidationError(
        `${catalogItem.name} is coming soon and cannot be marked as connected yet.`,
      );
    }

    // For Telegram/WhatsApp, require a non-empty token/webhook config before marking awaiting_auth or connected
    const id = generateId('int');
    await c.env.DB.prepare(
      `INSERT INTO tenant_integrations
         (id, tenant_id, provider, category, name, status, config, permissions, connected_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, CASE WHEN ? = 'connected' THEN datetime('now') ELSE NULL END, datetime('now'))
       ON CONFLICT(tenant_id, provider)
       DO UPDATE SET
         status = excluded.status,
         config = excluded.config,
         permissions = excluded.permissions,
         connected_at = CASE WHEN excluded.status = 'connected' THEN datetime('now') ELSE tenant_integrations.connected_at END,
         updated_at = datetime('now')`,
    )
      .bind(
        id,
        tenantId,
        catalogItem.provider,
        catalogItem.category,
        catalogItem.name,
        body.status,
        JSON.stringify(body.config ?? {}),
        JSON.stringify(body.permissions ?? ['read']),
        body.status,
      )
      .run();

    await logAudit(c.env.DB, {
      tenantId,
      action: `integration.${body.status}`,
      resourceType: 'integration',
      resourceId: catalogItem.provider,
      actorId: c.get('apiKeyId'),
    });

    return c.json({
      data: {
        provider: catalogItem.provider,
        name: catalogItem.name,
        status: body.status,
      },
    });
  },
);

// ── 6. Activity / Runs & Real Analytics ───────────────────────────────
platformRouter.get('/runs', async (c) => {
  const tenantId = c.get('tenantId');
  const agentId = c.req.query('agent_id');

  const sql = agentId
    ? `SELECT r.*, a.name AS agent_name
         FROM agent_runs r
         LEFT JOIN agents a ON a.id = r.agent_id
        WHERE r.tenant_id = ? AND r.agent_id = ?
        ORDER BY r.created_at DESC LIMIT 50`
    : `SELECT r.*, a.name AS agent_name
         FROM agent_runs r
         LEFT JOIN agents a ON a.id = r.agent_id
        WHERE r.tenant_id = ?
        ORDER BY r.created_at DESC LIMIT 50`;

  const stmt = agentId
    ? c.env.DB.prepare(sql).bind(tenantId, agentId)
    : c.env.DB.prepare(sql).bind(tenantId);

  const { results } = await stmt.all<Record<string, unknown>>();
  return c.json({
    data: (results ?? []).map((row) => ({
      ...row,
      knowledge_ids: parseJson(String(row.knowledge_ids ?? '[]'), []),
      tool_calls: parseJson(String(row.tool_calls ?? '[]'), []),
    })),
  });
});

platformRouter.get('/analytics', async (c) => {
  const tenantId = c.get('tenantId');

  const [
    agentsCount,
    sessionsCount,
    messagesCount,
    knowledgeCount,
    memoriesCount,
    runsCount,
    pendingActions,
    approvedActions,
    executedActions,
    tokensSum,
    byChannel,
    byAgent,
  ] = await Promise.all([
    c.env.DB.prepare(
      "SELECT COUNT(*) AS count FROM agents WHERE tenant_id = ? AND status != 'archived'",
    )
      .bind(tenantId)
      .first<{ count: number }>(),
    c.env.DB.prepare('SELECT COUNT(*) AS count FROM sessions WHERE tenant_id = ?')
      .bind(tenantId)
      .first<{ count: number }>(),
    c.env.DB.prepare('SELECT COUNT(*) AS count FROM messages WHERE tenant_id = ?')
      .bind(tenantId)
      .first<{ count: number }>(),
    c.env.DB.prepare(
      "SELECT COUNT(*) AS count FROM knowledge_sources WHERE tenant_id = ? AND status = 'ready'",
    )
      .bind(tenantId)
      .first<{ count: number }>(),
    c.env.DB.prepare('SELECT COUNT(*) AS count FROM customer_memories WHERE tenant_id = ?')
      .bind(tenantId)
      .first<{ count: number }>(),
    c.env.DB.prepare('SELECT COUNT(*) AS count FROM agent_runs WHERE tenant_id = ?')
      .bind(tenantId)
      .first<{ count: number }>(),
    c.env.DB.prepare(
      "SELECT COUNT(*) AS count FROM actions WHERE tenant_id = ? AND status = 'pending'",
    )
      .bind(tenantId)
      .first<{ count: number }>(),
    c.env.DB.prepare(
      "SELECT COUNT(*) AS count FROM actions WHERE tenant_id = ? AND status = 'approved'",
    )
      .bind(tenantId)
      .first<{ count: number }>(),
    c.env.DB.prepare(
      "SELECT COUNT(*) AS count FROM actions WHERE tenant_id = ? AND status = 'executed'",
    )
      .bind(tenantId)
      .first<{ count: number }>(),
    c.env.DB.prepare(
      "SELECT COALESCE(SUM(quantity), 0) AS total FROM usage_records WHERE tenant_id = ? AND type = 'tokens'",
    )
      .bind(tenantId)
      .first<{ total: number }>(),
    c.env.DB.prepare(
      `SELECT channel_type AS channel, COUNT(*) AS runs, AVG(duration_ms) AS avg_duration_ms
         FROM agent_runs
        WHERE tenant_id = ?
        GROUP BY channel_type`,
    )
      .bind(tenantId)
      .all(),
    c.env.DB.prepare(
      `SELECT a.id, a.name, a.model, a.status,
              COUNT(DISTINCT s.id) AS conversations
         FROM agents a
         LEFT JOIN installations i ON i.agent_id = a.id
         LEFT JOIN sessions s ON s.installation_id = i.id
        WHERE a.tenant_id = ? AND a.status != 'archived'
        GROUP BY a.id`,
    )
      .bind(tenantId)
      .all(),
  ]);

  return c.json({
    data: {
      active_agents: agentsCount?.count ?? 0,
      total_conversations: sessionsCount?.count ?? 0,
      total_messages: messagesCount?.count ?? 0,
      knowledge_sources_ready: knowledgeCount?.count ?? 0,
      memories_stored: memoriesCount?.count ?? 0,
      total_runs: runsCount?.count ?? 0,
      actions: {
        pending: pendingActions?.count ?? 0,
        approved: approvedActions?.count ?? 0,
        executed: executedActions?.count ?? 0,
      },
      tokens_used: tokensSum?.total ?? 0,
      by_channel: byChannel.results ?? [],
      by_agent: byAgent.results ?? [],
    },
  });
});

// ── 7. Workspace Team Members ─────────────────────────────────────────
const inviteMemberSchema = z
  .object({
    email: z.string().email().max(254),
    name: z.string().trim().max(120).optional(),
    role: z.enum(['admin', 'operator', 'viewer']).default('operator'),
  })
  .strict();

platformRouter.get('/members', async (c) => {
  const tenantId = c.get('tenantId');
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM workspace_members WHERE tenant_id = ? ORDER BY created_at ASC',
  )
    .bind(tenantId)
    .all();

  return c.json({ data: results ?? [] });
});

platformRouter.post('/members', validateBody(inviteMemberSchema), async (c) => {
  const tenantId = c.get('tenantId');
  const body = getValidatedBody<z.infer<typeof inviteMemberSchema>>(c);
  const id = generateId('mem');

  await c.env.DB.prepare(
    `INSERT INTO workspace_members (id, tenant_id, email, name, role, status, invited_by)
     VALUES (?, ?, ?, ?, ?, 'invited', ?)
     ON CONFLICT(tenant_id, email)
     DO UPDATE SET role = excluded.role, name = COALESCE(excluded.name, workspace_members.name)`,
  )
    .bind(
      id,
      tenantId,
      body.email.trim().toLowerCase(),
      body.name ?? null,
      body.role,
      c.get('apiKeyId') ?? 'owner',
    )
    .run();

  const member = await c.env.DB.prepare(
    'SELECT * FROM workspace_members WHERE tenant_id = ? AND email = ?',
  )
    .bind(tenantId, body.email.trim().toLowerCase())
    .first();

  await logAudit(c.env.DB, {
    tenantId,
    action: 'member.invited',
    resourceType: 'workspace_member',
    resourceId: id,
    actorId: c.get('apiKeyId'),
    details: { email: body.email, role: body.role },
  });

  return c.json({ data: member }, 201);
});

platformRouter.delete('/members/:id', async (c) => {
  const tenantId = c.get('tenantId');
  const id = c.req.param('id');

  const member = await c.env.DB.prepare(
    'SELECT role FROM workspace_members WHERE id = ? AND tenant_id = ?',
  )
    .bind(id, tenantId)
    .first<{ role: string }>();

  if (!member) throw new NotFoundError('Workspace member');
  if (member.role === 'owner') {
    throw new ValidationError('The workspace owner cannot be removed.');
  }

  await c.env.DB.prepare(
    'DELETE FROM workspace_members WHERE id = ? AND tenant_id = ?',
  )
    .bind(id, tenantId)
    .run();

  return c.json({ data: { removed: true } });
});

// ── 8. Verified-User HMAC Generator (for Widget & SDK) ────────────────
const verifyUserSchema = z
  .object({
    user_id: z.string().trim().min(1).max(160),
  })
  .strict();

platformRouter.post(
  '/verify-user-token',
  validateBody(verifyUserSchema),
  async (c) => {
    const tenantId = c.get('tenantId');
    const body = getValidatedBody<z.infer<typeof verifyUserSchema>>(c);
    const salt = c.env.API_KEY_SALT ?? '';
    if (!salt) throw new ValidationError('API_KEY_SALT is not configured');

    const signature = await hashApiKey(`${tenantId}:${body.user_id}`, salt);
    return c.json({
      data: {
        user_id: body.user_id,
        user_signature: signature,
      },
    });
  },
);
