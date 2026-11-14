/**
 * Tanat — NEAR AI Cloud Verifiable TEE Attestation & Signature Service.
 *
 * Implements cryptographic verification against NEAR AI Cloud's confidential
 * inference verification endpoints:
 *   1. GET /v1/attestation/report?model=...&signing_algo=ecdsa&nonce=...
 *   2. GET /v1/signature/{chat_id}?model=...&signing_algo=ecdsa
 *
 * Verifies:
 *   - Nonce-bound Intel TDX + NVIDIA GPU attestation metadata & signing_address
 *   - SHA-256(request_body):SHA-256(response_body) integrity binding
 *   - secp256k1 ECDSA public key recovery -> Ethereum address match
 */

import * as secp256k1 from '@noble/secp256k1';
import { keccak_256 } from '@noble/hashes/sha3.js';
import { AppError } from '../utils/errors';
import { generateId } from '../utils/crypto';
import type { EnclaveMode } from './enclave-runtime.service';

export const NEAR_AI_BASE_URL = 'https://cloud-api.near.ai/v1';

export interface NearAiAttestationReport {
  model: string;
  nonce: string;
  signingAddress: string;
  signingAlgo: string;
  tdxPresent: boolean;
  gpuAttested: boolean;
  gatewayAttested: boolean;
  rawReport: Record<string, unknown>;
  fetchedAt: string;
}

export interface NearAiSignatureVerification {
  chatId: string;
  model: string;
  signingAddress: string;
  recoveredAddress: string | null;
  signingAlgo: string;
  requestHash: string;
  responseHash: string;
  expectedText: string;
  signedText: string;
  signature: string;
  hashMatched: boolean;
  signatureVerified: boolean;
  error?: string;
}

export interface TeeReceiptRecord {
  id: string;
  tenant_id: string;
  session_id: string | null;
  message_id: string | null;
  chat_id: string;
  model: string;
  nonce: string;
  signing_address: string;
  signing_algo: string;
  request_hash: string;
  response_hash: string;
  signature: string;
  tdx_verified: number;
  gpu_verified: number;
  signature_verified: number;
  enclave_mode: string;
  created_at: string;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  if (clean.length % 2 !== 0 || !/^[0-9a-fA-F]+$/.test(clean)) {
    throw new Error('Invalid hex string');
  }
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

export async function sha256Hex(input: string | Uint8Array): Promise<string> {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const digest = await crypto.subtle.digest('SHA-256', copy.buffer);
  return bytesToHex(new Uint8Array(digest));
}

export function generateTeeNonceHex(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

function eip191Digest(message: string): Uint8Array {
  const msgBytes = new TextEncoder().encode(message);
  const prefix = new TextEncoder().encode(`\x19Ethereum Signed Message:\n${msgBytes.length}`);
  const full = new Uint8Array(prefix.length + msgBytes.length);
  full.set(prefix, 0);
  full.set(msgBytes, prefix.length);
  return keccak_256(full);
}

/**
 * Recovers the 0x-prefixed Ethereum address from a 65-byte ECDSA signature
 * (r || s || v) over an EIP-191 personal_sign message.
 */
export async function recoverEthAddressFromSignature(
  text: string,
  signatureHex: string,
): Promise<string | null> {
  try {
    const sigBytes = hexToBytes(signatureHex);
    if (sigBytes.length !== 65) return null;

    const rAndS = sigBytes.slice(0, 64);
    const rawV = sigBytes[64];
    const recovery = rawV >= 27 ? rawV - 27 : rawV;
    if (recovery !== 0 && recovery !== 1) return null;

    // @noble/secp256k1 v3 'recovered' format expects [recovery, r(32), s(32)]
    const recoveredFormat = new Uint8Array(65);
    recoveredFormat[0] = recovery;
    recoveredFormat.set(rAndS, 1);

    const digestsToCheck = [
      eip191Digest(text),
      keccak_256(new TextEncoder().encode(text)),
    ];

    for (const digest of digestsToCheck) {
      try {
        const pub = await secp256k1.recoverPublicKeyAsync(recoveredFormat, digest, {
          prehash: false,
        });
        const uncompressed = secp256k1.Point.fromBytes(pub).toBytes(false).slice(1);
        const addrBytes = keccak_256(uncompressed).slice(-20);
        return `0x${bytesToHex(addrBytes)}`.toLowerCase();
      } catch {
        // Try next digest convention
      }
    }
    return null;
  } catch {
    return null;
  }
}

export async function fetchNearAiAttestationReport(options: {
  apiKey: string;
  model: string;
  nonce?: string;
  fetcher?: typeof fetch;
}): Promise<NearAiAttestationReport> {
  const nonce = options.nonce ?? generateTeeNonceHex();
  const fetcher: typeof fetch = (input, init) =>
    Reflect.apply(options.fetcher ?? fetch, globalThis, [input, init]);

  const url = `${NEAR_AI_BASE_URL}/attestation/report?model=${encodeURIComponent(options.model)}&signing_algo=ecdsa&nonce=${encodeURIComponent(nonce)}`;
  const response = await fetcher(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${options.apiKey}` },
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new AppError(
      `NEAR AI attestation report request failed with status ${response.status}`,
      502,
      'NEAR_AI_ATTESTATION_FAILED',
    );
  }

  const raw = (await response.json()) as Record<string, unknown>;
  const signingAddress =
    typeof raw.signing_address === 'string' ? raw.signing_address.trim() : '';

  if (!signingAddress) {
    throw new AppError(
      'NEAR AI attestation report did not include a signing_address',
      502,
      'NEAR_AI_ATTESTATION_INVALID',
    );
  }

  const modelAttestations = Array.isArray(raw.model_attestations)
    ? (raw.model_attestations as Array<Record<string, unknown>>)
    : [];
  const primary = modelAttestations[0] ?? raw;

  const tdxPresent = Boolean(primary.intel_tdx ?? raw.intel_tdx ?? primary.tdx_quote);
  const gpuAttested = Boolean(
    primary.nvidia_payload ?? raw.nvidia_payload ?? primary.gpu_attestation,
  );
  const gatewayAttested = Boolean(raw.gateway_attestation ?? primary.gateway_attestation);

  return {
    model: options.model,
    nonce,
    signingAddress: signingAddress.toLowerCase(),
    signingAlgo: typeof raw.signing_algo === 'string' ? raw.signing_algo : 'ecdsa',
    tdxPresent,
    gpuAttested,
    gatewayAttested,
    rawReport: raw,
    fetchedAt: new Date().toISOString(),
  };
}

export async function fetchAndVerifyNearAiSignature(options: {
  apiKey: string;
  chatId: string;
  model: string;
  rawRequestBody: string;
  rawResponseBody: string;
  expectedSigningAddress?: string;
  fetcher?: typeof fetch;
}): Promise<NearAiSignatureVerification> {
  const fetcher: typeof fetch = (input, init) =>
    Reflect.apply(options.fetcher ?? fetch, globalThis, [input, init]);

  const [requestHash, responseHash] = await Promise.all([
    sha256Hex(options.rawRequestBody),
    sha256Hex(options.rawResponseBody),
  ]);
  const expectedText = `${requestHash}:${responseHash}`;

  const url = `${NEAR_AI_BASE_URL}/signature/${encodeURIComponent(options.chatId)}?model=${encodeURIComponent(options.model)}&signing_algo=ecdsa`;
  const response = await fetcher(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${options.apiKey}` },
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    return {
      chatId: options.chatId,
      model: options.model,
      signingAddress: options.expectedSigningAddress?.toLowerCase() ?? '',
      recoveredAddress: null,
      signingAlgo: 'ecdsa',
      requestHash,
      responseHash,
      expectedText,
      signedText: '',
      signature: '',
      hashMatched: false,
      signatureVerified: false,
      error: `Signature endpoint returned HTTP ${response.status}`,
    };
  }

  const payload = (await response.json()) as Record<string, unknown>;
  const signedText = typeof payload.text === 'string' ? payload.text : '';
  const signature = typeof payload.signature === 'string' ? payload.signature : '';
  const signingAddress =
    typeof payload.signing_address === 'string'
      ? payload.signing_address.trim().toLowerCase()
      : '';
  const signingAlgo =
    typeof payload.signing_algo === 'string' ? payload.signing_algo : 'ecdsa';

  const hashMatched = signedText === expectedText;
  const recoveredAddress = signature
    ? await recoverEthAddressFromSignature(signedText, signature)
    : null;

  const addressMatchesReported =
    Boolean(recoveredAddress) &&
    Boolean(signingAddress) &&
    recoveredAddress === signingAddress;

  const addressMatchesAttestation =
    !options.expectedSigningAddress ||
    signingAddress === options.expectedSigningAddress.toLowerCase();

  const signatureVerified =
    hashMatched && addressMatchesReported && addressMatchesAttestation;

  return {
    chatId: options.chatId,
    model: options.model,
    signingAddress,
    recoveredAddress,
    signingAlgo,
    requestHash,
    responseHash,
    expectedText,
    signedText,
    signature,
    hashMatched,
    signatureVerified,
    ...(!signatureVerified
      ? {
          error: !hashMatched
            ? 'Signed request/response SHA-256 digest mismatch'
            : !addressMatchesAttestation
              ? 'Signature address does not match TEE attestation signing_address'
              : 'ECDSA secp256k1 signature recovery did not match signing_address',
        }
      : {}),
  };
}

export async function persistTeeReceipt(
  db: D1Database,
  input: {
    tenantId: string;
    sessionId?: string | null;
    messageId?: string | null;
    chatId: string;
    model: string;
    nonce: string;
    signingAddress: string;
    signingAlgo?: string;
    requestHash: string;
    responseHash: string;
    signature: string;
    tdxVerified: boolean;
    gpuVerified: boolean;
    signatureVerified: boolean;
    enclaveMode: EnclaveMode;
    reportJson?: Record<string, unknown>;
  },
): Promise<string> {
  const id = generateId('tee');
  await db
    .prepare(
      `INSERT INTO tee_attestation_receipts
         (id, tenant_id, session_id, message_id, chat_id, model, nonce, signing_address,
          signing_algo, request_hash, response_hash, signature, tdx_verified, gpu_verified,
          signature_verified, enclave_mode, report_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      input.tenantId,
      input.sessionId ?? null,
      input.messageId ?? null,
      input.chatId,
      input.model,
      input.nonce,
      input.signingAddress,
      input.signingAlgo ?? 'ecdsa',
      input.requestHash,
      input.responseHash,
      input.signature,
      input.tdxVerified ? 1 : 0,
      input.gpuVerified ? 1 : 0,
      input.signatureVerified ? 1 : 0,
      input.enclaveMode,
      JSON.stringify(input.reportJson ?? {}),
    )
    .run();
  return id;
}

export async function listTeeReceipts(
  db: D1Database,
  tenantId: string,
  limit = 20,
): Promise<TeeReceiptRecord[]> {
  const { results } = await db
    .prepare(
      `SELECT id, tenant_id, session_id, message_id, chat_id, model, nonce, signing_address,
              signing_algo, request_hash, response_hash, signature, tdx_verified, gpu_verified,
              signature_verified, enclave_mode, created_at
       FROM tee_attestation_receipts
       WHERE tenant_id = ?
       ORDER BY created_at DESC
       LIMIT ?`,
    )
    .bind(tenantId, Math.min(Math.max(1, limit), 100))
    .all<TeeReceiptRecord>();
  return results;
}
