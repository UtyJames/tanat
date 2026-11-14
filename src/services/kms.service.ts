/**
 * Tanat — Key Management Service (KMS) Abstraction.
 *
 * Wraps and unwraps tenant-specific Data Encryption Keys (DEKs) using a
 * Key Encryption Key (KEK) managed outside D1 database storage.
 *
 * Trust boundary:
 * - Production requires `KMS_MASTER_KEY` (or external KMS binding) and FAILS
 *   CLOSED if missing.
 * - Local development & Vitest tests may use `LocalDevKmsProvider` only when
 *   `ENVIRONMENT` is explicitly `'local' | 'test' | 'development'`.
 */

import type { Env } from '../types';
import { AppError } from '../utils/errors';

const LOCAL_ENVIRONMENTS = new Set(['local', 'test', 'development']);
const DEV_PLACEHOLDER_KMS_KEY = 'dev-kms-master-key-do-not-use-in-prod';

export interface KmsProvider {
  readonly keyId: string;
  readonly providerName: string;
  readonly isLocalDev: boolean;
  wrapKey(plaintextDek: Uint8Array): Promise<string>;
  unwrapKey(wrappedDek: string, kekId?: string): Promise<Uint8Array>;
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

async function deriveKek(masterSecret: string, kekId: string): Promise<CryptoKey> {
  const material = new TextEncoder().encode(`tanat-kek-v1:${kekId}:${masterSecret}`);
  const digest = await crypto.subtle.digest('SHA-256', material);
  return crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, [
    'encrypt',
    'decrypt',
  ]);
}

export class EnvWrapKmsProvider implements KmsProvider {
  public readonly isLocalDev: boolean;

  constructor(
    private readonly masterSecret: string,
    public readonly keyId: string = 'kek-env-v1',
    public readonly providerName: string = 'env-aes256-kw',
    isLocalDev = false,
  ) {
    this.isLocalDev = isLocalDev;
  }

  async wrapKey(plaintextDek: Uint8Array): Promise<string> {
    if (plaintextDek.length !== 32) {
      throw new AppError('DEK must be 256 bits (32 bytes)', 500, 'KMS_ERROR');
    }
    const kek = await deriveKek(this.masterSecret, this.keyId);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const aad = new TextEncoder().encode(`wrap:${this.keyId}`);
    const ct = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv, additionalData: aad },
      kek,
      plaintextDek,
    );
    return `kms1:${toBase64(iv)}:${toBase64(new Uint8Array(ct))}`;
  }

  async unwrapKey(wrappedDek: string, kekId?: string): Promise<Uint8Array> {
    const parts = wrappedDek.split(':');
    if (parts.length !== 3 || parts[0] !== 'kms1') {
      throw new AppError('Invalid wrapped DEK format', 500, 'KMS_ERROR');
    }
    const effectiveKekId = kekId || this.keyId;
    const kek = await deriveKek(this.masterSecret, effectiveKekId);
    const iv = fromBase64(parts[1]);
    const ct = fromBase64(parts[2]);
    const aad = new TextEncoder().encode(`wrap:${effectiveKekId}`);
    try {
      const plain = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv, additionalData: aad },
        kek,
        ct,
      );
      return new Uint8Array(plain);
    } catch {
      throw new AppError('Failed to unwrap tenant encryption key', 500, 'KMS_UNWRAP_FAILED');
    }
  }
}

export function resolveKmsProvider(env: Env): KmsProvider {
  const environment = (env.ENVIRONMENT ?? '').trim().toLowerCase();
  const isLocal = LOCAL_ENVIRONMENTS.has(environment);
  const masterKey = (env.KMS_MASTER_KEY ?? '').trim();
  const keyId = (env.KMS_KEY_ID ?? '').trim() || (isLocal ? 'kek-local-dev-v1' : 'kek-prod-v1');

  if (!masterKey) {
    if (!isLocal) {
      throw new AppError(
        'KMS_MASTER_KEY is required in production; refusing to fall back to plaintext',
        500,
        'KMS_UNAVAILABLE',
      );
    }
    return new EnvWrapKmsProvider(
      DEV_PLACEHOLDER_KMS_KEY,
      keyId,
      'local-dev-kms',
      true,
    );
  }

  if (!isLocal && masterKey === DEV_PLACEHOLDER_KMS_KEY) {
    throw new AppError(
      'Development KMS_MASTER_KEY is forbidden outside local development',
      500,
      'KMS_UNAVAILABLE',
    );
  }

  return new EnvWrapKmsProvider(masterKey, keyId, 'env-aes256-kw', isLocal);
}
