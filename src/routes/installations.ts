/**
 * Tanat — Installation routes
 *
 * Bind agents to tenants. Enforces tenant isolation.
 */

import { Hono } from 'hono';
import { z } from 'zod';
import type { HonoEnv } from '../types';
import { validateBody, getValidatedBody } from '../middleware/validation';
import { generateId } from '../utils/crypto';
import { logAudit } from '../utils/audit';
import { NotFoundError, ConflictError, ValidationError } from '../utils/errors';
import { requireScopeForMethod } from '../middleware/scopes';
import { parsePagination } from '../utils/pagination';

export const installationsRouter = new Hono<HonoEnv>();

installationsRouter.use('*', requireScopeForMethod('read', 'write'));

/**
 * M-15: money controls in an installation config are operator-only. A tenant
 * `write` key may configure presentation settings, but it must never be able
 * to raise its own per-installation payment cap or re-enable payments.
 */
const OPERATOR_ONLY_CONFIG_KEYS = [
  'maxRefundNear',
  'maxPaymentUsd',
  'features',
] as const;

function assertNoOperatorConfig(
  config: Record<string, unknown> | undefined,
): void {
  if (!config) return;

  const blocked = OPERATOR_ONLY_CONFIG_KEYS.filter((key) => key in config);
  if (blocked.length > 0) {
    throw new ValidationError(
      `These installation config keys are operator-controlled: ${blocked.join(', ')}`,
    );
  }
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

// ── Schemas ───────────────────────────────────────────────────────────
const createInstallationSchema = z.object({
  agent_id: z.string().min(1),
  config: z.record(z.string(), z.unknown()).optional(),
});

const updateInstallationSchema = z.object({
  config: z.record(z.string(), z.unknown()).optional(),
  status: z.enum(['active', 'paused']).optional(),
});

// ── GET / — list installations for tenant ─────────────────────────────
installationsRouter.get('/', async (c) => {
  const tenantId = c.get('tenantId');
  const { page, limit, offset } = parsePagination({
    page: c.req.query('page'),
    limit: c.req.query('limit'),
  });

  const total = await c.env.DB.prepare(
    "SELECT COUNT(*) AS count FROM installations WHERE tenant_id = ? AND status != 'removed'",
  )
    .bind(tenantId)
    .first<{ count: number }>();

  const { results } = await c.env.DB.prepare(
    `SELECT i.*, a.name as agent_name, a.slug as agent_slug,
            a.description as agent_description, a.config as agent_config,
            a.status as agent_status
     FROM installations i
     JOIN agents a ON a.id = i.agent_id
     WHERE i.tenant_id = ? AND i.status != 'removed'
     ORDER BY i.created_at DESC
     LIMIT ? OFFSET ?`,
  )
    .bind(tenantId, limit, offset)
    .all();

  return c.json({
    data: results ?? [],
    meta: { total: total?.count ?? 0, page, limit },
  });
});

// ── GET /:id — get installation detail ────────────────────────────────
installationsRouter.get('/:id', async (c) => {
  const tenantId = c.get('tenantId');

  const row = await c.env.DB.prepare(
    `SELECT i.*, a.name as agent_name, a.slug as agent_slug
     FROM installations i
     JOIN agents a ON a.id = i.agent_id
     WHERE i.id = ? AND i.tenant_id = ? AND i.status != 'removed'`,
  )
    .bind(c.req.param('id'), tenantId)
    .first();

  if (!row) throw new NotFoundError('Installation');
  return c.json({ data: row });
});

// ── POST / — install an agent ─────────────────────────────────────────
installationsRouter.post('/', validateBody(createInstallationSchema), async (c) => {
  const tenantId = c.get('tenantId');
  const body = getValidatedBody<z.infer<typeof createInstallationSchema>>(c);

  assertNoOperatorConfig(body.config);

  // Verify the agent exists and belongs to this tenant
  const agent = await c.env.DB.prepare(
    "SELECT id FROM agents WHERE id = ? AND tenant_id = ? AND status = 'active'",
  )
    .bind(body.agent_id, tenantId)
    .first();

  if (!agent) throw new NotFoundError('Agent');

  // Check for duplicate
  const existing = await c.env.DB.prepare(
    "SELECT id FROM installations WHERE tenant_id = ? AND agent_id = ? AND status != 'removed'",
  )
    .bind(tenantId, body.agent_id)
    .first();

  if (existing) throw new ConflictError('Agent already installed for this tenant');

  const id = generateId('inst');
  await c.env.DB.prepare(
    `INSERT INTO installations (id, tenant_id, agent_id, config, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'active', datetime('now'), datetime('now'))`,
  )
    .bind(id, tenantId, body.agent_id, JSON.stringify(body.config ?? {}))
    .run();

  const installation = await c.env.DB.prepare(
    'SELECT * FROM installations WHERE id = ?',
  )
    .bind(id)
    .first();

  await logAudit(c.env.DB, {
    tenantId,
    action: 'installation.created',
    resourceType: 'installation',
    resourceId: id,
    actorId: c.get('apiKeyId'),
    details: { agent_id: body.agent_id },
  });

  return c.json({ data: installation }, 201);
});

// ── PATCH /:id — update installation ──────────────────────────────────
installationsRouter.patch('/:id', validateBody(updateInstallationSchema), async (c) => {
  const tenantId = c.get('tenantId');
  const installId = c.req.param('id');
  const body = getValidatedBody<z.infer<typeof updateInstallationSchema>>(c);

  // Verify ownership
  const existing = await c.env.DB.prepare(
    "SELECT id, config FROM installations WHERE id = ? AND tenant_id = ? AND status != 'removed'",
  )
    .bind(installId, tenantId)
    .first<{ id: string; config: string }>();

  if (!existing) throw new NotFoundError('Installation');

  const sets: string[] = [];
  const values: unknown[] = [];
  let nextConfig: Record<string, unknown> | undefined;

  if (body.config !== undefined) {
    assertNoOperatorConfig(body.config);

    // Merge rather than replace so an operator-set maxRefundNear/features is
    // never erased by a tenant config update.
    nextConfig = { ...parseJsonObject(existing.config), ...body.config };
    sets.push('config = ?');
    values.push(JSON.stringify(nextConfig));
  }
  if (body.status !== undefined) {
    sets.push('status = ?');
    values.push(body.status);
  }

  if (sets.length > 0) {
    sets.push("updated_at = datetime('now')");
    values.push(installId, tenantId);

    await c.env.DB.prepare(
      `UPDATE installations SET ${sets.join(', ')} WHERE id = ? AND tenant_id = ?`,
    )
      .bind(...values)
      .run();
  }

  if (nextConfig !== undefined) {
    await logAudit(c.env.DB, {
      tenantId,
      action: 'installation.config_updated',
      resourceType: 'installation',
      resourceId: installId,
      actorId: c.get('apiKeyId'),
      details: { keys: Object.keys(nextConfig) },
    });
  }

  const updated = await c.env.DB.prepare(
    'SELECT * FROM installations WHERE id = ?',
  )
    .bind(installId)
    .first();

  return c.json({ data: updated });
});

// ── DELETE /:id — remove installation ─────────────────────────────────
installationsRouter.delete('/:id', async (c) => {
  const tenantId = c.get('tenantId');
  const installId = c.req.param('id');

  const result = await c.env.DB.prepare(
    "UPDATE installations SET status = 'removed', updated_at = datetime('now') WHERE id = ? AND tenant_id = ? AND status != 'removed'",
  )
    .bind(installId, tenantId)
    .run();

  if (!result.meta.changes) throw new NotFoundError('Installation');

  await logAudit(c.env.DB, {
    tenantId,
    action: 'installation.removed',
    resourceType: 'installation',
    resourceId: installId,
    actorId: c.get('apiKeyId'),
  });

  return c.json({ data: { removed: true } });
});

