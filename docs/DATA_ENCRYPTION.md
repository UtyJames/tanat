# Customer Data Encryption

## Tenant-Specific Envelope Encryption (`src/services/encryption.service.ts`)
- **Algorithm:** Web Crypto `AES-256-GCM` with fresh 96-bit (`12`-byte) CSPRNG IVs per encryption call.
- **Envelope Format:** `ENC:v1:<key_id>:v<version>:<iv_b64>:<ct_b64>`
- **Additional Authenticated Data (AAD):** `${tenantId}:${table}:${recordId}:${field}` — prevents ciphertext from being transplanted across tenants, tables, records, or columns.
- **Encrypted Fields:** `messages.content`, `knowledge_sources.content`, `customer_memories.fact`.
- **Operational Metadata Remaining Plaintext in D1:** `tenant_id`, record `id`, timestamps (`created_at`, `updated_at`), status flags, `knowledge_sources.label`, and numeric token/usage counters.
- **Fail-Closed Guarantee:** Outside `local` / `test` / `development`, if `KMS_MASTER_KEY` is missing, encryption/decryption fails closed (`KMS_UNAVAILABLE`) and never silently falls back to plaintext storage.

