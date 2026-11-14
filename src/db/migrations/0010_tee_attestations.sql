-- ============================================================================
-- Migration 0010: TEE Attestation Receipts & Conclave Privacy Verification
-- ============================================================================
-- Persists per-inference cryptographic attestation & signature verification
-- receipts returned by NEAR AI Cloud (/v1/attestation/report & /v1/signature)
-- and runtime enclave measurements. Strictly tenant-scoped.

CREATE TABLE IF NOT EXISTS tee_attestation_receipts (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  session_id TEXT,
  message_id TEXT,
  chat_id TEXT NOT NULL,
  model TEXT NOT NULL,
  nonce TEXT NOT NULL,
  signing_address TEXT NOT NULL,
  signing_algo TEXT NOT NULL DEFAULT 'ecdsa',
  request_hash TEXT NOT NULL,
  response_hash TEXT NOT NULL,
  signature TEXT NOT NULL,
  tdx_verified INTEGER NOT NULL DEFAULT 0 CHECK (tdx_verified IN (0, 1)),
  gpu_verified INTEGER NOT NULL DEFAULT 0 CHECK (gpu_verified IN (0, 1)),
  signature_verified INTEGER NOT NULL DEFAULT 0 CHECK (signature_verified IN (0, 1)),
  enclave_mode TEXT NOT NULL DEFAULT 'cloudflare_worker',
  report_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (tenant_id, id)
);

CREATE INDEX IF NOT EXISTS idx_tee_receipts_tenant_created
  ON tee_attestation_receipts (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tee_receipts_session
  ON tee_attestation_receipts (tenant_id, session_id);
