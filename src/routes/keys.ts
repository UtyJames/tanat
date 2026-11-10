/**
 * Tanat — API key management routes.
 *
 * Plaintext keys are returned ONCE at creation time. Only the SHA-256 hash is
 * stored.
 *
 * Security review fixes:
 *   - H-06: the scope list now exposes the split action scopes instead of the
 *     old umbrella `actions` scope. The legacy alias is accepted for existing
 *     keys but cannot be used to mint new ones.
 *   - The number of active keys per tenant is capped so a compromised admin key
 *     cannot mint an unbounded number of credentials.
 *   - An expiry must be in the future, so a key cannot be created already dead
 *     or with a nonsensical timestamp.
 */

import { Hono } from 'hono';
import { z } from 'zod';
import type { HonoEnv } from '../types';
import { validateBody, getValidatedBody } from '../middleware/validation';
import { generateId, generateApiKey, hashApiKey } from '../utils/crypto';
import { logAudit } from '../utils/audit';
import { ConflictError, NotFoundError, ValidationError } from '../utils/errors';
import { requireScope } from '../middleware/scopes';
import { parsePagination } from '../utils/pagination';

export const keysRouter = new Hono<HonoEnv>();

keysRouter.use('*', requireScope('admin'));

/** Maximum number of active keys a tenant may hold at once. */
const MAX_ACTIVE_KEYS = 10;

/** Scopes a new key may be granted. The legacy `actions` alias is excluded. */
const KEY_SCOPES = [
  'read',
  'write',
  'admin',
  'sessions',
  'actions:read',
  'actions:propose',
  'actions:approve',
  'actions:execute',
  '*',
] as const;

// ── Schemas ───────────────────────────────────────────────────────────
const createKeySchema = z
  .object({
    name: z.string().min(1).max(100),
    scopes: z.array(z.enum(KEY_SCOPES)).min(1).default(['read']),
    expires_at: z
      .string()
      .datetime({ offset: true })
      .optional()
      .refine(
        (value) => value === undefined || Date.parse(value) > Date.now(),
        { message: 'expires_at must be in the future' },
      ),
  })
  .strict();

// ── GET / — list keys (never returns hashes) ──────────────────────────
keysRouter.get('/', async (c) => {
  const tenantId = c.get('tenantId');
  const { page, limit, offset } = parsePagination({
    page: c.req.query('page'),
    limit: c.req.query('limit'),
  });

  const total = await c.env.DB.prepare(
    'SELECT COUNT(*) AS count FROM api_keys WHERE tenant_id = ? AND is_active = 1',
  )
    .bind(tenantId)
    .first<{ count: number }>();

  const { results } = await c.env.DB.prepare(
    `SELECT id, tenant_id, key_prefix, name, scopes, last_used_at, expires_at, is_active, created_at, updated_at
     FROM api_keys
     WHERE tenant_id = ? AND is_active = 1
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
  )
    .bind(tenantId, limit, offset)
    .all();

  return c.json({
    data: results ?? [],
    meta: { total: total?.count ?? 0, page, limit },
  });
});

// ── POST / — generate new API key ─────────────────────────────────────
keysRouter.post('/', validateBody(createKeySchema), async (c) => {
  const tenantId = c.get('tenantId');
  const body = getValidatedBody<z.infer<typeof createKeySchema>>(c);

  // Cap active keys so a stolen admin key cannot mint unlimited credentials.
  const active = await c.env.DB.prepare(
    'SELECT COUNT(*) AS count FROM api_keys WHERE tenant_id = ? AND is_active = 1',
  )
    .bind(tenantId)
    .first<{ count: number }>();

  if ((active?.count ?? 0) >= MAX_ACTIVE_KEYS) {
    throw new ConflictError(
      `Active key limit reached (${MAX_ACTIVE_KEYS}). Revoke a key first.`,
    );
  }

  const { key, prefix } = generateApiKey();
  const salt = c.env.API_KEY_SALT ?? '';
  if (!salt) {
    throw new ValidationError('API_KEY_SALT is not configured');
  }

  const keyHash = await hashApiKey(key, salt);
  const id = generateId('key');

  await c.env.DB.prepare(
    `INSERT INTO api_keys (id, tenant_id, key_hash, key_prefix, name, scopes, expires_at, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))`,
  )
    .bind(
      id,
      tenantId,
      keyHash,
      prefix,
      body.name,
      JSON.stringify(body.scopes),
      body.expires_at ?? null,
    )
    .run();

  await logAudit(c.env.DB, {
    tenantId,
    action: 'api_key.created',
    resourceType: 'api_key',
    resourceId: id,
    actorId: c.get('apiKeyId'),
    details: { name: body.name, prefix, scopes: body.scopes },
  });

  // Return the plaintext key ONLY here — it's never stored or retrievable.
  return c.json(
    {
      data: {
        id,
        key, // ← plaintext, shown once
        prefix,
        name: body.name,
        scopes: body.scopes,
        expires_at: body.expires_at ?? null,
        created_at: new Date().toISOString(),
      },
      warning: 'Save this API key now. It will not be shown again.',
    },
    201,
  );
});

// ── DELETE /:id — revoke a key ────────────────────────────────────────
keysRouter.delete('/:id', async (c) => {
  const tenantId = c.get('tenantId');
  const keyId = c.req.param('id');

  // A key must not be able to revoke itself mid-request; revoking the key that
  // authenticated the call would otherwise lock the tenant out of its own
  // recovery path if it was the last key.
  if (keyId === c.get('apiKeyId')) {
    throw new ValidationError('A key cannot revoke itself');
  }

  const result = await c.env.DB.prepare(
    "UPDATE api_keys SET is_active = 0, updated_at = datetime('now') WHERE id = ? AND tenant_id = ? AND is_active = 1",
  )
    .bind(keyId, tenantId)
    .run();

  if (!result.meta.changes) throw new NotFoundError('API key');

  await logAudit(c.env.DB, {
    tenantId,
    action: 'api_key.revoked',
    resourceType: 'api_key',
    resourceId: keyId,
    actorId: c.get('apiKeyId'),
  });

  return c.json({ data: { revoked: true } });
});
