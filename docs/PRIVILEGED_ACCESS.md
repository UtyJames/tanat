# Privileged & Exceptional Access Controls

## Separation of Duties
- Platform operators use `/api/operator/v1/*` protected by `MASTER_API_KEY`. Ordinary tenant credentials cannot access operator endpoints.
- **Auditable Exceptional Access Workflow (`0009` + `src/routes/operator.ts`):**
  - `POST /api/operator/v1/access-requests`: Logs a time-limited (`5–120` min) access request naming `tenant_id`, `requested_by`, `reason`, and `scope`, and raises a `high` severity `privileged_access` security alert visible in the tenant's Privacy Centre.
  - `POST /api/operator/v1/access-requests/:id/approve`: Records explicit approval (`approved_by`, `starts_at`).
  - `POST /api/operator/v1/access-requests/:id/revoke`: Immediately revokes access.

## Trust Boundary Disclosure
- While `tenant_keys` and AES-256-GCM prevent raw D1 database dumps from exposing plaintext customer content without KMS credentials, **application workers running on Cloudflare Workers still unwrap DEKs in memory during request processing**. Cryptographic operator-blindness requires moving the application runtime itself into an attested Confidential VM / TEE.
