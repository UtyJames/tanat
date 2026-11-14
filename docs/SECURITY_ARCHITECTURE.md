# Tanat Security Architecture

## Threat Model & Defense-in-Depth
Tanat is a multi-tenant AI agent infrastructure platform running on Cloudflare Workers and Cloudflare D1, integrating NEAR AI Cloud and NEAR Intents.

### Trust Boundaries
1. **Browser / Website Widget (`pk_live_...`):** Public publishable keys restricted to explicit `allowed_origins` (wildcards rejected in production) and rate-limited by key + IP.
2. **Authenticated Workspace & Developer API (`tns_...` / `tnt_...`):** Bearer token authentication hashed with `API_KEY_SALT` via SHA-256. Dashboard sessions (`tns_...`) resolve explicit role-based scopes via `workspace_members` (`owner`, `admin`, `operator`, `member`, `auditor`, `viewer`) rather than wildcard `['*']`.
3. **Application Worker vs. Database (D1):** Sensitive payloads (`messages.content`, `knowledge_sources.content`, `customer_memories.fact`) are encrypted using tenant-specific AES-256-GCM DEKs (`ENC:v1`) before storage in D1.
4. **Operator Boundary (`/api/operator/v1`):** Protected by constant-time `MASTER_API_KEY` verification; tenant keys cannot invoke operator routes.

## Implementation Status
- **Implemented and verified:** Tenant isolation, DB-level cross-tenant triggers, RBAC scope resolution, AES-256-GCM envelope encryption, key rotation/revocation, audit logging, security alerts, privileged access request workflow, Privacy Centre UI.
- **Implemented awaiting production secret:** `KMS_MASTER_KEY` secret must be provisioned via `wrangler secret put KMS_MASTER_KEY` before deploying production workers (production fails closed without it).
- **Unsupported by current infrastructure:** Hardware operator-blind TEE execution for Cloudflare Workers themselves (Workers run on Cloudflare's V8 isolate runtime and decrypt DEKs in memory during request execution).

