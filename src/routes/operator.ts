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
