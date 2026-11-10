/**
 * Tanat — tenant routes.
 *
 * A tenant can only view or modify its own record (enforced by the auth
 * context). Money values are stored as yoctoNEAR and returned as NEAR.
 *
 * H-03: a tenant may change its display name, but it may not raise its own
 * spending limit or change its NEAR account. Those are operator-only fields.
 */

import { Hono } from 'hono';
import { z } from 'zod';
import type { HonoEnv } from '../types';
import { validateBody, getValidatedBody } from '../middleware/validation';
import * as tenantService from '../services/tenant.service';
import { logAudit, requestIp } from '../utils/audit';
import { ForbiddenError } from '../utils/errors';
import { formatYoctoToNear } from '../utils/money';
import { requireScope, requireScopeForMethod } from '../middleware/scopes';

export const tenantsRouter = new Hono<HonoEnv>();

tenantsRouter.use('*', requireScopeForMethod('read', 'write'));

const updateTenantSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
  })
  .strict();

function serializeTenant(tenant: tenantService.TenantRow) {
  return {
    ...tenant,
    spending_limit_near: formatYoctoToNear(tenant.spending_limit_near || '0'),
    total_spent_near: formatYoctoToNear(tenant.total_spent_near || '0'),
  };
}

// ── GET / — get the authenticated tenant ──────────────────────────────
tenantsRouter.get('/', async (c) => {
  const tenantId = c.get('tenantId');
  const tenant = await tenantService.getTenant(c.env.DB, tenantId);
  return c.json({ data: serializeTenant(tenant) });
});

// ── GET /:id — get tenant by id (must match auth) ────────────────────
tenantsRouter.get('/:id', async (c) => {
  const tenantId = c.get('tenantId');
  const paramId = c.req.param('id');

  if (paramId !== tenantId) {
    throw new ForbiddenError('Access denied to this tenant');
  }

  const tenant = await tenantService.getTenant(c.env.DB, paramId);
  return c.json({ data: serializeTenant(tenant) });
});

// ── PATCH /:id — update the tenant's display name only ───────────────
tenantsRouter.patch('/:id', validateBody(updateTenantSchema), async (c) => {
  const tenantId = c.get('tenantId');
  const paramId = c.req.param('id');

  if (paramId !== tenantId) {
    throw new ForbiddenError('Access denied to this tenant');
  }

  const body = getValidatedBody<z.infer<typeof updateTenantSchema>>(c);
  const tenant = await tenantService.updateTenant(c.env.DB, paramId, body);

  await logAudit(c.env.DB, {
    tenantId: paramId,
    action: 'tenant.updated',
    resourceType: 'tenant',
    resourceId: paramId,
    actorId: c.get('apiKeyId'),
    details: body,
    ipAddress: requestIp(c),
  });

  return c.json({ data: serializeTenant(tenant) });
});

// ── DELETE /:id — soft-delete tenant (admin scope only) ───────────────
tenantsRouter.delete('/:id', requireScope('admin'), async (c) => {
  const tenantId = c.get('tenantId');
  const paramId = c.req.param('id');

  if (paramId !== tenantId) {
    throw new ForbiddenError('Access denied to this tenant');
  }

  await tenantService.deleteTenant(c.env.DB, paramId);

  await logAudit(c.env.DB, {
    tenantId: paramId,
    action: 'tenant.deleted',
    resourceType: 'tenant',
    resourceId: paramId,
    actorId: c.get('apiKeyId'),
    ipAddress: requestIp(c),
  });

  return c.json({ data: { deleted: true } });
});
