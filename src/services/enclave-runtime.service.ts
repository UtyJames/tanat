/**
 * Tanat — Conclave / TEE Enclave Runtime Boundary Service.
 *
 * Detects whether Tanat's own application runtime is executing inside an
 * attested Intel TDX / Phala dstack Confidential VM or on standard
 * Cloudflare Workers, and enforces measurement-bound KMS policy when
 * operating in enclave mode.
 */

import type { Env } from '../types';
import { AppError } from '../utils/errors';

export type EnclaveMode = 'cloudflare_worker' | 'tdx_enclave' | 'dstack_cvm';

export interface EnclaveRuntimeStatus {
  enclaveMode: EnclaveMode;
  appRunningInTee: boolean;
  kmsMeasurementBound: boolean;
  allowedMrtdConfigured: boolean;
  socketPath: string | null;
  summary: string;
}

export function resolveEnclaveMode(env: Partial<Env>): EnclaveMode {
  const raw = (env.TEE_RUNTIME_MODE ?? 'cloudflare_worker').trim();
  if (raw === 'tdx_enclave' || raw === 'dstack_cvm') return raw;
  return 'cloudflare_worker';
}

export function getEnclaveRuntimeStatus(env: Partial<Env>): EnclaveRuntimeStatus {
  const enclaveMode = resolveEnclaveMode(env);
  const appRunningInTee = enclaveMode === 'tdx_enclave' || enclaveMode === 'dstack_cvm';
  const allowedMrtdConfigured = Boolean((env.TEE_ALLOWED_MRTD ?? '').trim());
  const socketPath = (env.TEE_SOCKET_PATH ?? '').trim() || null;

  return {
    enclaveMode,
    appRunningInTee,
    kmsMeasurementBound: appRunningInTee && allowedMrtdConfigured,
    allowedMrtdConfigured,
    socketPath,
    summary: appRunningInTee
      ? `Tanat application runtime is executing inside an attested ${enclaveMode} Confidential VM${allowedMrtdConfigured ? ' with KMS MRTD measurement binding.' : '.'}`
      : 'Tanat application runtime is executing on Cloudflare Workers (decrypting tenant context in Worker RAM before sending to NEAR AI Cloud TEE). Deploy the tee/ bundle to a dstack/Intel TDX Confidential VM for full Conclave-parity app-layer TEE isolation.',
  };
}

/**
 * Enforces enclave measurement policy before unwrapping tenant DEKs when
 * running in an attested TEE CVM.
 */
export function assertEnclavePolicy(env: Partial<Env>, currentMrtd?: string): void {
  const mode = resolveEnclaveMode(env);
  if (mode === 'cloudflare_worker') return;

  const allowed = (env.TEE_ALLOWED_MRTD ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  if (allowed.length === 0) return;

  if (!currentMrtd || !allowed.includes(currentMrtd.trim().toLowerCase())) {
    throw new AppError(
      'Enclave MRTD measurement does not match TEE_ALLOWED_MRTD policy; refusing DEK unwrap.',
      403,
      'TEE_MEASUREMENT_MISMATCH',
    );
  }
}

