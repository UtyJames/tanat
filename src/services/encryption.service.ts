/**
 * Tanat — Tenant-Specific Envelope Encryption Service (AES-256-GCM).
 *
 * Every tenant has independent 256-bit Data Encryption Keys (DEKs) stored
 * wrapped under an external KEK (`KmsProvider`).
 *
 * Ciphertext format:
 *   `ENC:v1:<key_id>:v<version>:<iv_b64>:<ct_b64>`
 *
 * Every encryption operation generates a fresh 96-bit CSPRNG nonce and binds
 * Additional Authenticated Data (AAD): `${tenantId}:${table}:${recordId}:${field}`
 * so ciphertext cannot be moved across tenants, tables, records, or columns.
 */

import type { Env } from '../types';
import { AppError, ForbiddenError } from '../utils/errors';
import { generateId } from '../utils/crypto';
import { logAudit } from '../utils/audit';
import { resolveKmsProvider } from './kms.service';

export const ENCRYPTED_PREFIX = 'ENC:v1:';

export interface TenantKeyRow {
  id: string;
  tenant_id: string;
  version: number;
  kek_id: string;
  algorithm: string;
  wrapped_dek: string;
  status: 'active' | 'rotated' | 'revoked';
  created_by: string | null;
  created_at: string;
  rotated_at: string | null;
  revoked_at: string | null;
}

export interface FieldContext {
  tenantId: string;
  table: string;
  recordId: string;
  field: string;
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function fromBase64(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function buildAad(ctx: FieldContext): Uint8Array {
  return new TextEncoder().encode(
    `${ctx.tenantId}:${ctx.table}:${ctx.recordId}:${ctx.field}`,
  );
}

export function isEncryptedValue(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.startsWith(ENCRYPTED_PREFIX);
}

async function importAesGcmKey(rawDek: Uint8Array, usages: KeyUsage[]): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', rawDek, { name: 'AES-GCM' }, false, usages);
}

export async function getOrCreateActiveTenantKey(
  env: Env,
  db: D1Database,
  tenantId: string,
  actorId?: string,
): Promise<{ row: TenantKeyRow; dek: Uint8Array }> {
  const kms = resolveKmsProvider(env);

  const existing = await db
    .prepare(
      `SELECT * FROM tenant_keys
        WHERE tenant_id = ? AND status = 'active'
        ORDER BY version DESC
        LIMIT 1`,
    )
    .bind(tenantId)
    .first<TenantKeyRow>();

  if (existing) {
    const dek = await kms.unwrapKey(existing.wrapped_dek, existing.kek_id);
    return { row: existing, dek };
  }

  const maxRow = await db
    .prepare('SELECT COALESCE(MAX(version), 0) AS max_ver FROM tenant_keys WHERE tenant_id = ?')
    .bind(tenantId)
    .first<{ max_ver: number }>();

  const nextVersion = (maxRow?.max_ver ?? 0) + 1;
  const rawDek = crypto.getRandomValues(new Uint8Array(32));
  const wrapped = await kms.wrapKey(rawDek);
  const id = generateId('dek');

  await db
    .prepare(
      `INSERT INTO tenant_keys
         (id, tenant_id, version, kek_id, algorithm, wrapped_dek, status, created_by, created_at)
       VALUES (?, ?, ?, ?, 'AES-256-GCM', ?, 'active', ?, datetime('now'))`,
    )
    .bind(id, tenantId, nextVersion, kms.keyId, wrapped, actorId ?? 'system')
    .run();

  const created = await db
    .prepare('SELECT * FROM tenant_keys WHERE id = ? AND tenant_id = ?')
    .bind(id, tenantId)
    .first<TenantKeyRow>();

  if (!created) {
    throw new AppError('Failed to provision tenant encryption key', 500, 'KMS_ERROR');
  }

  await logAudit(db, {
    tenantId,
    action: 'kms.key_created',
    resourceType: 'tenant_key',
    resourceId: id,
    actorId: actorId ?? 'system',
    details: { version: nextVersion, kek_id: kms.keyId, provider: kms.providerName },
  });

  return { row: created, dek: rawDek };
}

export async function encryptField(
  env: Env,
  db: D1Database,
  ctx: FieldContext,
  plaintext: string,
): Promise<string> {
  if (!plaintext) return plaintext;
  const { row, dek } = await getOrCreateActiveTenantKey(env, db, ctx.tenantId);
  const key = await importAesGcmKey(dek, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: buildAad(ctx) },
    key,
    encoded,
  );
  return `${ENCRYPTED_PREFIX}${row.id}:v${row.version}:${toBase64(iv)}:${toBase64(new Uint8Array(ct))}`;
}

export async function decryptField(
  env: Env,
  db: D1Database,
  ctx: FieldContext,
  value: string,
): Promise<string> {
  if (!value || !isEncryptedValue(value)) {
    return value;
  }

  const parts = value.split(':');
  // Format: ENC : v1 : <kid> : v<ver> : <iv> : <ct>
  if (parts.length !== 6 || parts[0] !== 'ENC' || parts[1] !== 'v1') {
    throw new AppError('Malformed encrypted field envelope', 500, 'DECRYPTION_FAILED');
  }

  const keyId = parts[2];
  const iv = fromBase64(parts[4]);
  const ct = fromBase64(parts[5]);

  if (iv.length !== 12) {
    throw new AppError('Invalid AES-GCM nonce length', 500, 'DECRYPTION_FAILED');
  }

  const keyRow = await db
    .prepare('SELECT * FROM tenant_keys WHERE id = ? AND tenant_id = ?')
    .bind(keyId, ctx.tenantId)
    .first<TenantKeyRow>();

  if (!keyRow) {
    throw new ForbiddenError('Encryption key not found for this tenant');
  }

  if (keyRow.status === 'revoked') {
    throw new ForbiddenError('Encryption key for this record has been revoked');
  }

  const kms = resolveKmsProvider(env);
  const rawDek = await kms.unwrapKey(keyRow.wrapped_dek, keyRow.kek_id);
  const key = await importAesGcmKey(rawDek, ['decrypt']);

  try {
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv, additionalData: buildAad(ctx) },
      key,
      ct,
    );
    return new TextDecoder().decode(plain);
  } catch {
    throw new AppError(
      'Decryption failed: authentication tag or context mismatch',
      500,
      'DECRYPTION_FAILED',
    );
  }
}

export async function rotateTenantKey(
  env: Env,
  db: D1Database,
  tenantId: string,
  actorId: string,
): Promise<TenantKeyRow> {
  const kms = resolveKmsProvider(env);

  const maxRow = await db
    .prepare('SELECT COALESCE(MAX(version), 0) AS max_ver FROM tenant_keys WHERE tenant_id = ?')
    .bind(tenantId)
    .first<{ max_ver: number }>();

  const nextVersion = (maxRow?.max_ver ?? 0) + 1;
  const rawDek = crypto.getRandomValues(new Uint8Array(32));
  const wrapped = await kms.wrapKey(rawDek);
  const id = generateId('dek');

  await db
    .prepare(
      `UPDATE tenant_keys
          SET status = 'rotated', rotated_at = datetime('now')
        WHERE tenant_id = ? AND status = 'active'`,
    )
    .bind(tenantId)
    .run();

  await db
    .prepare(
      `INSERT INTO tenant_keys
         (id, tenant_id, version, kek_id, algorithm, wrapped_dek, status, created_by, created_at)
       VALUES (?, ?, ?, ?, 'AES-256-GCM', ?, 'active', ?, datetime('now'))`,
    )
    .bind(id, tenantId, nextVersion, kms.keyId, wrapped, actorId)
    .run();

  const created = await db
    .prepare('SELECT * FROM tenant_keys WHERE id = ? AND tenant_id = ?')
    .bind(id, tenantId)
    .first<TenantKeyRow>();

  if (!created) {
    throw new AppError('Failed to rotate tenant encryption key', 500, 'KMS_ERROR');
  }

  await logAudit(db, {
    tenantId,
    action: 'kms.key_rotated',
    resourceType: 'tenant_key',
    resourceId: id,
    actorId,
    details: { version: nextVersion, kek_id: kms.keyId },
  });

  return created;
}

export async function revokeTenantKey(
  db: D1Database,
  tenantId: string,
  keyId: string,
  actorId: string,
): Promise<boolean> {
  const res = await db
    .prepare(
      `UPDATE tenant_keys
          SET status = 'revoked', revoked_at = datetime('now')
        WHERE id = ? AND tenant_id = ? AND status != 'revoked'`,
    )
    .bind(keyId, tenantId)
    .run();

  const revoked = (res.meta?.changes ?? 0) > 0;
  if (revoked) {
    await logAudit(db, {
      tenantId,
      action: 'kms.key_revoked',
      resourceType: 'tenant_key',
      resourceId: keyId,
      actorId,
    });
  }
  return revoked;
}

export async function listTenantKeys(
  db: D1Database,
  tenantId: string,
): Promise<Array<Omit<TenantKeyRow, 'wrapped_dek'>>> {
  const { results } = await db
    .prepare(
      `SELECT id, tenant_id, version, kek_id, algorithm, status, created_by, created_at, rotated_at, revoked_at
         FROM tenant_keys
        WHERE tenant_id = ?
        ORDER BY version DESC`,
    )
    .bind(tenantId)
    .all<Omit<TenantKeyRow, 'wrapped_dek'>>();
  return results ?? [];
}

