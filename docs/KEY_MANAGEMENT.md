# Key Management & Rotation

## KMS Abstraction (`src/services/kms.service.ts`)
- **KEK/DEK Separation:** Each tenant owns independent 256-bit DEKs stored wrapped (`wrapped_dek`) in `tenant_keys`. Plaintext DEKs are never stored in D1, source code, logs, or browser storage.
- **`EnvWrapKmsProvider`:** Derives a domain-separated 256-bit KEK from `KMS_MASTER_KEY` + `KMS_KEY_ID` to wrap/unwrap tenant DEKs (`kms1:<iv>:<ct>`).
- **`LocalDevKmsProvider`:** Active only when `ENVIRONMENT` is `local`, `test`, or `development`.
- **Production Configuration Required:** Set `KMS_MASTER_KEY` (and optionally `KMS_KEY_ID`) via `wrangler secret put KMS_MASTER_KEY` before deploying `tanat-api`.

## Rotation & Revocation
- **Rotate (`POST /api/v1/privacy/keys/rotate`):** Marks the current active DEK as `rotated` and creates `version + 1` as `active`. Existing records encrypted under `rotated` keys continue to decrypt seamlessly; new writes use the new active version.
- **Revoke (`POST /api/v1/privacy/keys/:id/revoke`):** Marks a key `revoked`; any attempt to decrypt records under a revoked key immediately fails with `403 Forbidden`.
- All key creation, rotation, and revocation events are recorded in `audit_log`.
