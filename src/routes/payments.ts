/**
 * Tanat — payment intents for real-world objects and stores.
 *
 * A merchant (tenant) creates an intent for a physical object, a store
 * checkout, or any invoice. Tanat asks NEAR Intents for a real quote and
 * returns a deposit address. The payer sends the origin asset from any
 * supported chain; 1Click settles the destination asset to the merchant.
 *
 * Tanat is non-custodial: no tenant or customer key is stored here.
 */

import { Hono } from 'hono';
import type { Context } from 'hono';
import { z } from 'zod';
import type { Env, HonoEnv } from '../types';
import { validateBody, getValidatedBody } from '../middleware/validation';
import { requireAnyScope } from '../middleware/scopes';
import { generateId } from '../utils/crypto';
import { logAudit, requestIp } from '../utils/audit';
import {
  AppError,
  NotFoundError,
  ValidationError,
} from '../utils/errors';
import { parseTokenAmount } from '../utils/money';
import { parsePagination } from '../utils/pagination';
import { isValidNearAccount } from '../services/near.service';
import { NearIntentsService } from '../services/near-intents.service';

export function createPaymentsRouter(
  intentsServiceFactory: (env: Env) => NearIntentsService = (env) =>
    new NearIntentsService(env.INTENTS_API_KEY),
): Hono<HonoEnv> {
  const paymentsRouter = new Hono<HonoEnv>();

  const DEFAULT_MAX_PAYMENT_USD = 500;

  const createIntentSchema = z
    .object({
      installation_id: z.string().min(1).max(100).optional(),
      description: z.string().trim().min(1).max(500),
      amount: z.string().trim().min(1).max(80),
      currency: z.string().trim().min(1).max(20).default('NEAR'),
      origin_asset: z.string().min(1).max(300),
      destination_asset: z.string().min(1).max(300),
      recipient: z.string().min(1).max(256),
      recipient_type: z
        .enum(['DESTINATION_CHAIN', 'INTENTS'])
        .default('DESTINATION_CHAIN'),
      refund_to: z.string().min(1).max(256),
      refund_type: z.enum(['ORIGIN_CHAIN', 'INTENTS']).default('ORIGIN_CHAIN'),
      slippage_tolerance: z.number().int().min(1).max(1000).default(100),
      metadata: z.record(z.string(), z.unknown()).optional(),
    })
    .strict();

  interface PaymentIntentRow {
    id: string;
    tenant_id: string;
    installation_id: string | null;
    status: string;
    description: string;
    amount: string;
    amount_raw: string;
    currency: string;
    origin_asset: string;
    destination_asset: string;
    recipient: string;
    recipient_type: string;
    refund_to: string;
    refund_type: string;
    deposit_address: string | null;
    quote_id: string | null;
    quote_json: string;
    metadata: string;
    tx_hash: string | null;
    paid_at: string | null;
    expires_at: string | null;
    created_at: string;
    updated_at: string;
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

  function view(row: PaymentIntentRow, appUrl?: string) {
    const record = parseJsonObject(row.quote_json);
    const quoteBody =
      record.quote && typeof record.quote === 'object' && !Array.isArray(record.quote)
        ? (record.quote as Record<string, unknown>)
        : {};

    return {
      id: row.id,
      status: row.status,
      description: row.description,
      amount: row.amount,
      amount_raw: row.amount_raw,
      currency: row.currency,
      origin_asset: row.origin_asset,
      destination_asset: row.destination_asset,
      recipient: row.recipient,
      recipient_type: row.recipient_type,
      deposit_address: row.deposit_address,
      quote: {
        amount_in: quoteBody.amountInFormatted ?? null,
        amount_in_usd: quoteBody.amountInUsd ?? null,
        amount_out: quoteBody.amountOutFormatted ?? null,
        amount_out_usd: quoteBody.amountOutUsd ?? null,
        min_amount_out: quoteBody.minAmountOut ?? null,
        time_estimate_seconds: quoteBody.timeEstimate ?? null,
      },
      tx_hash: row.tx_hash,
      paid_at: row.paid_at,
      expires_at: row.expires_at,
      metadata: parseJsonObject(row.metadata),
      // The frontend is a static export, so the hosted page is a query-param
      // route rather than /pay/:id.
      checkout_url: appUrl ? `${appUrl.replace(/\/$/, '')}/pay/?intent=${encodeURIComponent(row.id)}` : null,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  function readIdempotencyKey(header: string | undefined): string | undefined {
    if (header === undefined) return undefined;
    const trimmed = header.trim();
    if (
      trimmed.length === 0 ||
      trimmed.length > 128 ||
      !/^[A-Za-z0-9._:-]+$/.test(trimmed)
    ) {
      throw new ValidationError(
        'Idempotency-Key must be 1-128 characters of letters, digits, dot, underscore, colon, or hyphen',
      );
    }
    return trimmed;
  }

  function mapIntentsStatus(status: string): string {
    switch (status.toUpperCase()) {
      case 'PENDING_DEPOSIT':
        return 'pending_deposit';
      case 'KNOWN_DEPOSIT_TX':
      case 'PROCESSING':
        return 'processing';
      case 'SUCCESS':
        return 'succeeded';
      case 'INCOMPLETE_DEPOSIT':
        return 'incomplete';
      case 'REFUNDED':
        return 'refunded';
      case 'FAILED':
        return 'failed';
      default:
        return status.toLowerCase();
    }
  }

  async function loadIntent(
    db: D1Database,
    tenantId: string,
    id: string,
  ): Promise<PaymentIntentRow> {
    const row = await db
      .prepare('SELECT * FROM payment_intents WHERE id = ? AND tenant_id = ?')
      .bind(id, tenantId)
      .first<PaymentIntentRow>();

    if (!row) throw new NotFoundError('Payment intent');
    return row;
  }

  // ── POST /intents — create a payment intent ─────────────────────────
  paymentsRouter.post(
    '/intents',
    requireAnyScope(['payments:write', 'write']),
    validateBody(createIntentSchema),
    async (c) => {
      const tenantId = c.get('tenantId');
      const body = getValidatedBody<z.infer<typeof createIntentSchema>>(c);
      const idempotencyKey = readIdempotencyKey(
        c.req.header('Idempotency-Key') ?? c.req.header('X-Idempotency-Key'),
      );

      if (idempotencyKey) {
        const existing = await c.env.DB.prepare(
          'SELECT * FROM payment_intents WHERE tenant_id = ? AND idempotency_key = ?',
        )
          .bind(tenantId, idempotencyKey)
          .first<PaymentIntentRow>();

        if (existing) {
          return c.json({
            data: view(existing, c.env.AUTH_APP_URL),
            meta: { idempotent_replay: true },
          });
        }
      }

      if (body.installation_id) {
        const installation = await c.env.DB.prepare(
          "SELECT id, config FROM installations WHERE id = ? AND tenant_id = ? AND status = 'active'",
        )
          .bind(body.installation_id, tenantId)
          .first<{ id: string; config: string }>();

        if (!installation) throw new NotFoundError('Installation');

        const config = parseJsonObject(installation.config);
        if (
          config.features &&
          typeof config.features === 'object' &&
          !Array.isArray(config.features) &&
          (config.features as Record<string, unknown>).payments === false
        ) {
          throw new AppError(
            'Payments are disabled for this installation',
            403,
            'PAYMENTS_DISABLED',
          );
        }
      }

      const service = intentsServiceFactory(c.env);
      const tokens = await service.listTokens();
      const originToken = tokens.find((token) => token.assetId === body.origin_asset);
      if (!originToken) {
        throw new ValidationError('Unknown origin_asset for NEAR Intents');
      }

      const destinationToken = tokens.find(
        (token) => token.assetId === body.destination_asset,
      );
      if (!destinationToken) {
        throw new ValidationError('Unknown destination_asset for NEAR Intents');
      }

      // NEAR Intents settles on mainnet. Catch testnet-style accounts early
      // instead of forwarding an invalid address to 1Click.
      if (
        body.recipient_type === 'DESTINATION_CHAIN' &&
        destinationToken.blockchain.toLowerCase() === 'near' &&
        !isValidNearAccount(body.recipient)
      ) {
        throw new ValidationError(
          'recipient must be a valid mainnet NEAR account (testnet accounts cannot receive mainnet funds)',
        );
      }

      if (
        body.refund_type === 'ORIGIN_CHAIN' &&
        originToken.blockchain.toLowerCase() === 'near' &&
        !isValidNearAccount(body.refund_to)
      ) {
        throw new ValidationError(
          'refund_to must be a valid mainnet NEAR account',
        );
      }

      let amountRaw: bigint;
      try {
        amountRaw = parseTokenAmount(body.amount, originToken.decimals);
      } catch {
        throw new ValidationError(
          `Amount must be a decimal with at most ${originToken.decimals} places`,
        );
      }

      if (amountRaw <= 0n) {
        throw new ValidationError('Amount must be greater than zero');
      }

      const quote = await service.requestQuote({
        originAsset: body.origin_asset,
        destinationAsset: body.destination_asset,
        amount: amountRaw.toString(),
        recipient: body.recipient,
        recipientType: body.recipient_type,
        refundTo: body.refund_to,
        refundType: body.refund_type,
        slippageTolerance: body.slippage_tolerance,
        dry: false,
      });

      if (!quote.depositAddress) {
        throw new AppError(
          'NEAR Intents did not return a deposit address',
          502,
          'INTENTS_NO_DEPOSIT_ADDRESS',
        );
      }

      // Operator-controlled USD cap. The quote's USD value is advisory, so we
      // also keep the exact origin amount in the row for reconciliation.
      let maxPaymentUsd = DEFAULT_MAX_PAYMENT_USD;
      const tenant = await c.env.DB.prepare(
        'SELECT settings FROM tenants WHERE id = ? AND status = ?',
      )
        .bind(tenantId, 'active')
        .first<{ settings: string }>();

      if (tenant) {
        const settings = parseJsonObject(tenant.settings);
        const configured = Number(settings.maxPaymentUsd);
        if (Number.isFinite(configured) && configured > 0) {
          maxPaymentUsd = configured;
        }
      }

      const amountInUsd = Number(quote.amountInUsd);
      if (Number.isFinite(amountInUsd) && amountInUsd > maxPaymentUsd) {
        throw new AppError(
          `Payment exceeds the tenant limit of ${maxPaymentUsd} USD`,
          403,
          'PAYMENT_LIMIT_EXCEEDED',
        );
      }

      const id = generateId('pay');
      const now = new Date();
      const expiresAt =
        quote.deadline ?? new Date(now.getTime() + 15 * 60 * 1000).toISOString();

      await c.env.DB.prepare(
        `INSERT INTO payment_intents (
           id, tenant_id, installation_id, created_by, idempotency_key,
           status, description, amount, amount_raw, currency,
           origin_asset, destination_asset, recipient, recipient_type,
           refund_to, refund_type, deposit_address, quote_id, quote_json,
           metadata, expires_at, created_at, updated_at
         )
         VALUES (?, ?, ?, ?, ?, 'pending_deposit', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      )
        .bind(
          id,
          tenantId,
          body.installation_id ?? null,
          c.get('apiKeyId'),
          idempotencyKey ?? null,
          body.description,
          body.amount,
          amountRaw.toString(),
          body.currency,
          body.origin_asset,
          body.destination_asset,
          body.recipient,
          body.recipient_type,
          body.refund_to,
          body.refund_type,
          quote.depositAddress,
          quote.quoteId,
          JSON.stringify(quote.raw),
          JSON.stringify(body.metadata ?? {}),
          expiresAt,
        )
        .run();

      const row = await loadIntent(c.env.DB, tenantId, id);

      await logAudit(c.env.DB, {
        tenantId,
        action: 'payment_intent.created',
        resourceType: 'payment_intent',
        resourceId: id,
        actorId: c.get('apiKeyId'),
        details: {
          description: body.description,
          amount: body.amount,
          currency: body.currency,
          origin_asset: body.origin_asset,
          destination_asset: body.destination_asset,
          amount_in_usd: quote.amountInUsd,
          deposit_address: quote.depositAddress,
        },
        ipAddress: requestIp(c),
      });

      return c.json({ data: view(row, c.env.AUTH_APP_URL) }, 201);
    },
  );

  // ── GET /intents — list payment intents ─────────────────────────────
  paymentsRouter.get(
    '/intents',
    requireAnyScope(['payments:read', 'read']),
    async (c) => {
      const tenantId = c.get('tenantId');
      const { page, limit, offset } = parsePagination({
        page: c.req.query('page'),
        limit: c.req.query('limit'),
      });

      const total = await c.env.DB.prepare(
        'SELECT COUNT(*) AS count FROM payment_intents WHERE tenant_id = ?',
      )
        .bind(tenantId)
        .first<{ count: number }>();

      const { results } = await c.env.DB.prepare(
        `SELECT * FROM payment_intents
          WHERE tenant_id = ?
          ORDER BY created_at DESC
          LIMIT ? OFFSET ?`,
      )
        .bind(tenantId, limit, offset)
        .all<PaymentIntentRow>();

      return c.json({
        data: (results ?? []).map((row) => view(row, c.env.AUTH_APP_URL)),
        meta: { total: total?.count ?? 0, page, limit },
      });
    },
  );

  // ── GET /intents/:id — read and refresh status ──────────────────────
  paymentsRouter.get(
    '/intents/:id',
    requireAnyScope(['payments:read', 'read']),
    async (c) => {
      const tenantId = c.get('tenantId');
      const id = c.req.param('id');
      let row = await loadIntent(c.env.DB, tenantId, id);

      if (row.deposit_address && !['succeeded', 'refunded', 'failed'].includes(row.status)) {
        row = await refreshStatus(c, row);
      }

      return c.json({ data: view(row, c.env.AUTH_APP_URL) });
    },
  );

  // ── POST /intents/:id/refresh — force a status refresh ──────────────
  paymentsRouter.post(
    '/intents/:id/refresh',
    requireAnyScope(['payments:write', 'write']),
    async (c) => {
      const tenantId = c.get('tenantId');
      const row = await loadIntent(c.env.DB, tenantId, c.req.param('id'));

      if (!row.deposit_address) {
        throw new ValidationError('This payment intent has no deposit address');
      }

      const updated = await refreshStatus(c, row);

      await logAudit(c.env.DB, {
        tenantId,
        action: 'payment_intent.status_refreshed',
        resourceType: 'payment_intent',
        resourceId: row.id,
        actorId: c.get('apiKeyId'),
        details: { status: updated.status },
        ipAddress: requestIp(c),
      });

      return c.json({ data: view(updated, c.env.AUTH_APP_URL) });
    },
  );

  async function refreshStatus(
    c: Context<HonoEnv>,
    row: PaymentIntentRow,
  ): Promise<PaymentIntentRow> {
    if (!row.deposit_address) return row;

    const service = intentsServiceFactory(c.env);
    const status = await service.getStatus(row.deposit_address);
    const next = mapIntentsStatus(status.status);
    if (next === row.status) return row;

    const paidAt =
      next === 'succeeded' ? new Date().toISOString().slice(0, 19).replace('T', ' ') : row.paid_at;

    await c.env.DB.prepare(
      "UPDATE payment_intents SET status = ?, paid_at = ?, quote_json = ?, updated_at = datetime('now') WHERE id = ? AND tenant_id = ?",
    )
      .bind(next, paidAt, JSON.stringify(status.raw), row.id, row.tenant_id)
      .run();

    return { ...row, status: next, paid_at: paidAt };
  }

  return paymentsRouter;
}
