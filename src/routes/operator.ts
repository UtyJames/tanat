/**
 * Tanat — operator routes.
 *
 * Platform-level actions that a tenant must never be able to perform.
 * Protected by a separate operator key, not a tenant API key.
 *
 * H-03: spending limits and NEAR account changes are operator-only.
 * M-11: money inputs are decimal strings, never JavaScript numbers.
 */

import { Hono } from 'hono';
import { z } from 'zod';
import type { HonoEnv } from '../types';
import { validateBody, getValidatedBody } from '../middleware/validation';
import { operatorAuth } from '../middleware/operator';
import * as tenantService from '../services/tenant.service';
import { logAudit, requestIp } from '../utils/audit';
import { formatYoctoToNear, parseNearToYocto } from '../utils/money';
import { isValidNearAccount } from '../services/near.service';
import { generateId } from '../utils/crypto';
import { NotFoundError, ValidationError } from '../utils/errors';
import { recordSecurityAlert } from '../services/security-monitor.service';

export const operatorRouter = new Hono<HonoEnv>();

operatorRouter.use('*', operatorAuth);

const nearAmountSchema = z
  .string()
  .max(64)
  .regex(
    /^(0|[1-9]\d*)(\.\d{1,24})?$/,
    'Amount must be a non-negative decimal string with at most 24 decimal places',
  )
  .refine(
    (value) => {
      try {
        parseNearToYocto(value);
        return true;
      } catch {
        return false;
      }
    },
    { message: 'Amount is out of range' },
  );

const nearAccountSchema = z
  .string()
  .min(2)
  .max(64)
  .refine((value) => isValidNearAccount(value), {
    message: 'Invalid NEAR account ID',
  });

const createTenantSchema = z
  .object({
    name: z.string().min(1).max(200),
    slug: z
      .string()
      .min(3)
      .max(50)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens'),
    near_account_id: nearAccountSchema.optional(),
    spending_limit_near: nearAmountSchema.optional(),
  })
  .strict();

const updateTenantSchema = z
  .object({
    near_account_id: nearAccountSchema.optional(),
    spending_limit_near: nearAmountSchema.optional(),
    reason: z.string().max(500).optional(),
  })
  .strict()
  .refine(
    (value) =>
      value.near_account_id !== undefined ||
      value.spending_limit_near !== undefined,
    { message: 'No supported fields were provided' },
  );

function serializeTenant(tenant: tenantService.TenantRow) {
  return {
    ...tenant,
    spending_limit_near: formatYoctoToNear(tenant.spending_limit_near || '0'),
    total_spent_near: formatYoctoToNear(tenant.total_spent_near || '0'),
  };
}

// ── POST /tenants — create a tenant (operator only) ───────────────────
operatorRouter.post('/tenants', validateBody(createTenantSchema), async (c) => {
  const body = getValidatedBody<z.infer<typeof createTenantSchema>>(c);
  const tenant = await tenantService.createTenant(c.env.DB, body);

  await logAudit(c.env.DB, {
    tenantId: tenant.id,
    action: 'tenant.created',
    resourceType: 'tenant',
    resourceId: tenant.id,
    actorId: 'operator',
    details: {
      slug: tenant.slug,
      spending_limit_near: formatYoctoToNear(tenant.spending_limit_near || '0'),
    },
    ipAddress: requestIp(c),
  });

  return c.json({ data: serializeTenant(tenant) }, 201);
});

// ── PATCH /tenants/:id — change money controls (operator only) ────────
operatorRouter.patch(
  '/tenants/:id',
  validateBody(updateTenantSchema),
  async (c) => {
    const tenantId = c.req.param('id');
    const body = getValidatedBody<z.infer<typeof updateTenantSchema>>(c);

    const before = await tenantService.getTenant(c.env.DB, tenantId);
    const tenant = await tenantService.updateTenant(c.env.DB, tenantId, {
      near_account_id: body.near_account_id,
      spending_limit_near: body.spending_limit_near,
    });

    await logAudit(c.env.DB, {
      tenantId,
      action: 'tenant.money_controls_updated',
      resourceType: 'tenant',
      resourceId: tenantId,
      actorId: 'operator',
      details: {
        reason: body.reason ?? null,
        before: {
          near_account_id: before.near_account_id,
          spending_limit_near: formatYoctoToNear(before.spending_limit_near || '0'),
        },
        after: {
          near_account_id: tenant.near_account_id,
          spending_limit_near: formatYoctoToNear(tenant.spending_limit_near || '0'),
        },
      },
      ipAddress: requestIp(c),
    });

    return c.json({ data: serializeTenant(tenant) });
  },
);

// ── Exceptional / Privileged Access Workflow (auditable, time-limited) ────
const accessRequestSchema = z
  .object({
    tenant_id: z.string().min(1).max(100),
    requested_by: z.string().min(2).max(120),
    reason: z.string().min(10).max(500),
    scope: z.string().min(3).max(100),
    duration_minutes: z.number().int().min(5).max(120).default(30),
  })
  .strict();

operatorRouter.get('/access-requests', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM privileged_access_requests ORDER BY created_at DESC LIMIT 100',
  ).all();
  return c.json({ data: results ?? [] });
});

operatorRouter.post(
  '/access-requests',
  validateBody(accessRequestSchema),
  async (c) => {
    const body = getValidatedBody<z.infer<typeof accessRequestSchema>>(c);
    await tenantService.getTenant(c.env.DB, body.tenant_id);
    const id = generateId('par');
    const expiresAt = new Date(Date.now() + body.duration_minutes * 60_000)
      .toISOString()
      .replace('T', ' ')
      .slice(0, 19);

    await c.env.DB.prepare(
      `INSERT INTO privileged_access_requests
         (id, tenant_id, requested_by, reason, scope, status, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, 'pending', ?, datetime('now'))`,
    )
      .bind(id, body.tenant_id, body.requested_by, body.reason, body.scope, expiresAt)
      .run();

    await logAudit(c.env.DB, {
      tenantId: body.tenant_id,
      action: 'privileged_access.requested',
      resourceType: 'privileged_access_request',
      resourceId: id,
      actorId: body.requested_by,
      details: { scope: body.scope, reason: body.reason, duration_minutes: body.duration_minutes },
      ipAddress: requestIp(c),
    });

    await recordSecurityAlert(c.env.DB, {
      tenantId: body.tenant_id,
      severity: 'high',
      category: 'privileged_access',
      title: `Privileged access requested (${body.scope})`,
      details: { request_id: id, requested_by: body.requested_by },
      actorId: body.requested_by,
    });

    const row = await c.env.DB.prepare('SELECT * FROM privileged_access_requests WHERE id = ?')
      .bind(id)
      .first();
    return c.json({ data: row }, 201);
  },
);

operatorRouter.post('/access-requests/:id/approve', async (c) => {
  const id = c.req.param('id');
  const existing = await c.env.DB.prepare('SELECT * FROM privileged_access_requests WHERE id = ?')
    .bind(id)
    .first<{ id: string; tenant_id: string; requested_by: string; status: string }>();
  if (!existing) throw new NotFoundError('Privileged access request');
  if (existing.status !== 'pending') {
    throw new ValidationError(`Cannot approve request in status ${existing.status}`);
  }

  await c.env.DB.prepare(
    `UPDATE privileged_access_requests
        SET status = 'approved', approved_by = 'operator', starts_at = datetime('now')
      WHERE id = ?`,
  )
    .bind(id)
    .run();

  await logAudit(c.env.DB, {
    tenantId: existing.tenant_id,
    action: 'privileged_access.approved',
    resourceType: 'privileged_access_request',
    resourceId: id,
    actorId: 'operator',
    ipAddress: requestIp(c),
  });

  const updated = await c.env.DB.prepare('SELECT * FROM privileged_access_requests WHERE id = ?')
    .bind(id)
    .first();
  return c.json({ data: updated });
});

operatorRouter.post('/access-requests/:id/revoke', async (c) => {
  const id = c.req.param('id');
  const existing = await c.env.DB.prepare('SELECT * FROM privileged_access_requests WHERE id = ?')
    .bind(id)
    .first<{ id: string; tenant_id: string }>();
  if (!existing) throw new NotFoundError('Privileged access request');

  await c.env.DB.prepare(
    `UPDATE privileged_access_requests
        SET status = 'revoked', revoked_at = datetime('now')
      WHERE id = ?`,
  )
    .bind(id)
    .run();

  await logAudit(c.env.DB, {
    tenantId: existing.tenant_id,
    action: 'privileged_access.revoked',
    resourceType: 'privileged_access_request',
    resourceId: id,
    actorId: 'operator',
    ipAddress: requestIp(c),
  });

  return c.json({ data: { id, status: 'revoked' } });
});
