# Security Testing & Verification

## Automated Test Suites
- **Security Overhaul Suite (`src/security/security-overhaul.test.ts`):**
  1. Cross-tenant isolation across API routes and SQLite/D1 triggers (`CROSS_TENANT_RELATION`).
  2. RBAC role enforcement (`owner`, `auditor`), removal of `['*']` wildcard dashboard scopes, and immediate dashboard session revocation.
  3. Tenant-specific AES-256-GCM envelope encryption, ciphertext verification in D1, tamper detection, cross-tenant decryption rejection, key rotation, key revocation, and fail-closed production behavior without `KMS_MASTER_KEY`.
  4. AI secret redaction, prompt-injection detection, knowledge context minimization, and auditable privileged-access workflow + alerting.
  5. Production rejection of wildcard (`*`) publishable key origins and resumable onboarding state persistence.
- **Full Regression Suite:** `npx vitest run` runs all 9 test files (137 tests) against an in-memory SQLite D1 shim with all 9 migrations (`0001`–`0009`) applied.
- **Frontend Build Verification:** `tsc --noEmit` + `next build`.
