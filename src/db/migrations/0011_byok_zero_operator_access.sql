-- ============================================================================
-- Migration 0011: Zero-Operator BYOK Key Custody
-- ============================================================================
-- Allows any business to take exclusive custody of its DEK wrapping key
-- (BYOK KEK). When enabled, wrapped_dek is re-wrapped under the tenant's
-- external KEK (never stored in Tanat DB or Cloudflare Worker secrets),
-- preventing even platform operators from decrypting workspace payloads.

ALTER TABLE tenant_privacy_settings
  ADD COLUMN key_custody_mode TEXT NOT NULL DEFAULT 'platform_kms'
  CHECK (key_custody_mode IN ('platform_kms', 'byok_zero_operator'));

ALTER TABLE tenant_keys
  ADD COLUMN byok_key_fingerprint TEXT;
