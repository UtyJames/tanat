/**
 * Tanat — NEAR integration routes
 *
 * Balance lookup, transaction history, account validation, and safe NEAR
 * Intents quote previews.
 */

import { Hono } from 'hono';
import { z } from 'zod';
import type { HonoEnv } from '../types';
import { validateBody, getValidatedBody } from '../middleware/validation';
import { NearService } from '../services/near.service';
import { NearIntentsService } from '../services/near-intents.service';
import { formatYoctoToNear } from '../utils/money';
import { requireAnyScope, requireScope } from '../middleware/scopes';
import { parsePagination } from '../utils/pagination';
import { logAudit, requestIp } from '../utils/audit';

export const nearRouter = new Hono<HonoEnv>();

const nearService = new NearService();
const intentsQuoteSchema = z.object({
  purpose: z.enum(['checkout', 'payout']),
  origin_asset: z.string().min(1).max(200),
  destination_asset: z.string().min(1).max(200),
  amount: z.string().regex(/^[1-9]\d{0,77}$/),
  recipient: z.string().min(1).max(256),
  recipient_type: z.enum(['DESTINATION_CHAIN', 'INTENTS']),
  refund_to: z.string().min(1).max(256),
  refund_type: z.enum(['ORIGIN_CHAIN', 'INTENTS']),
  slippage_tolerance: z.number().int().min(1).max(1000).default(100),
}).strict();

nearRouter.get('/intents/tokens', requireScope('read'), async (c) => {
  const service = new NearIntentsService(c.env.INTENTS_API_KEY);
  const tokens = await service.listTokens();
  return c.json({ data: tokens });
});

nearRouter.post(
  '/intents/quote',
  requireAnyScope(['actions:propose', 'write']),
  validateBody(intentsQuoteSchema),
  async (c) => {
    const body = getValidatedBody<z.infer<typeof intentsQuoteSchema>>(c);
    const service = new NearIntentsService(c.env.INTENTS_API_KEY);
    const quote = await service.requestDryQuote({
      originAsset: body.origin_asset,
      destinationAsset: body.destination_asset,
      amount: body.amount,
      recipient: body.recipient,
      recipientType: body.recipient_type,
      refundTo: body.refund_to,
      refundType: body.refund_type,
      slippageTolerance: body.slippage_tolerance,
    });

    await logAudit(c.env.DB, {
      tenantId: c.get('tenantId'),
      action: 'near_intents.quote_previewed',
      resourceType: 'near_intents_quote',
      resourceId: c.get('requestId'),
      actorId: c.get('apiKeyId'),
      details: {
        purpose: body.purpose,
        origin_asset: body.origin_asset,
        destination_asset: body.destination_asset,
        amount: body.amount,
        dry: true,
      },
      ipAddress: requestIp(c),
    });

    return c.json({ data: { purpose: body.purpose, dry: true, quote } });
  },
);

// ── GET /balance — tenant's NEAR balance ──────────────────────────────
nearRouter.get('/balance', requireScope('read'), async (c) => {
  const tenantId = c.get('tenantId');

  const tenant = await c.env.DB.prepare(
    'SELECT near_account_id, spending_limit_near, total_spent_near FROM tenants WHERE id = ?',
  )
    .bind(tenantId)
    .first<{
      near_account_id: string | null;
      spending_limit_near: string;
      total_spent_near: string;
    }>();

  if (!tenant?.near_account_id) {
    return c.json({
      data: {
        account_id: null,
        available: '0',
        staked: '0',
        total: '0',
        spending_limit: formatYoctoToNear(tenant?.spending_limit_near ?? '0'),
        total_spent: formatYoctoToNear(tenant?.total_spent_near ?? '0'),
      },
    });
  }

  const balance = await nearService.checkBalance(tenant.near_account_id);

  return c.json({
    data: {
      ...balance,
      spending_limit: formatYoctoToNear(tenant.spending_limit_near || '0'),
      total_spent: formatYoctoToNear(tenant.total_spent_near || '0'),
    },
  });
});

// ── GET /transactions — recent executed actions ───────────────────────
nearRouter.get('/transactions', requireScope('read'), async (c) => {
  const tenantId = c.get('tenantId');
  const { page, limit, offset } = parsePagination({
    page: c.req.query('page'),
    limit: c.req.query('limit'),
  });

  const total = await c.env.DB.prepare(
    "SELECT COUNT(*) AS count FROM actions WHERE tenant_id = ? AND status = 'executed'",
  )
    .bind(tenantId)
    .first<{ count: number }>();

  const { results } = await c.env.DB.prepare(
    `SELECT id, type, description, params, execution_result, executed_at, created_at
     FROM actions
     WHERE tenant_id = ? AND status = 'executed'
     ORDER BY executed_at DESC
     LIMIT ? OFFSET ?`,
  )
    .bind(tenantId, limit, offset)
    .all();

  return c.json({
    data: results ?? [],
    meta: { total: total?.count ?? 0, page, limit },
  });
});

// ── POST /validate-account — check NEAR account format ────────────────
const validateAccountSchema = z.object({
  account_id: z.string().min(2).max(64),
});

nearRouter.post(
  '/validate-account',
  requireScope('write'),
  validateBody(validateAccountSchema),
  async (c) => {
  const body = getValidatedBody<z.infer<typeof validateAccountSchema>>(c);

  try {
    nearService.validateAccount(body.account_id);
    return c.json({ data: { valid: true, account_id: body.account_id } });
  } catch (err) {
    return c.json({
      data: {
        valid: false,
        account_id: body.account_id,
        error: err instanceof Error ? err.message : 'Invalid account',
      },
      },
    );
  }
});
