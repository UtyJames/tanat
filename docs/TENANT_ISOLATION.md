# Tenant Isolation Architecture

## Multi-Layer Isolation Controls
1. **Authenticated Context Binding:** `tenantId` is derived exclusively from the verified `api_keys` or `dashboard_sessions` record in `src/middleware/auth.ts` and enforced by `requireTenant()`. Client-provided `tenant_id` parameters are never trusted.
2. **Central Repository (`src/db/tenant-repo.ts`):** `TenantRepository` requires an authenticated `tenantId` at construction and scopes every `SELECT`, `UPDATE`, and `DELETE` by `tenant_id = ?`.
3. **Database-Level Composite Uniqueness & Cross-Tenant Triggers (`0009_security_privacy_overhaul.sql`):**
   - Composite unique indexes `UNIQUE (tenant_id, id)` on `agents`, `installations`, `sessions`, `messages`, `actions`, `knowledge_sources`, and `agent_channels`.
   - `BEFORE INSERT` / `BEFORE UPDATE` SQLite/D1 triggers (`trg_*_tenant_*`) abort with `CROSS_TENANT_RELATION` if any child row references a parent ID belonging to a different `tenant_id`.
4. **Non-Disclosing Errors:** Cross-tenant resource lookups return `404 Not Found` rather than leaking whether a resource exists for another business.

