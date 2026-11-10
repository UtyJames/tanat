# Tanat Threat Model

**Version:** 1.0 (Phase 0)
**Last updated:** 2026-11-08
**Owner:** Tanat engineering
**Review cadence:** every phase, and after any change to authentication, money movement, or tenant isolation.

This document describes what Tanat protects, who might attack it, and how each
known weakness is handled. It is written to be read by engineers, a security
reviewer, and a prospective customer's security team.

---

## 1. What Tanat is

Tanat is a multi-tenant API that lets a SaaS product give AI agents to its own
customers. The agents can talk to users, call tools, and propose money
movements on NEAR. Money only moves after a human approves the action.

The Phase 0 deployment is a Cloudflare Worker (Hono) with a D1 database. AI
calls and real NEAR settlement arrive in later phases.

---

## 2. Assets

| Asset | Why it matters | Where it lives |
|---|---|---|
| Tenant data (sessions, messages, agents) | Contains customer conversations and business logic | D1 tables |
| API keys | Grant full access to a tenant | SHA-256 hash in `api_keys`; plaintext only shown once |
| Money and spending limits | Direct financial loss if abused | `tenants.spending_limit_near`, `total_spent_near` (yoctoNEAR) |
| Action approvals | The only gate before money moves | `actions` table |
| NEAR signing keys | Can move tenant funds if leaked | Not stored in Phase 0; Phase 2 uses scoped keys held by the tenant |
| Audit trail | Detection and dispute resolution | `audit_log` |
| AI provider credentials | Cost and data exposure | Worker secrets, never in D1 |

---

## 3. Actors

| Actor | Trust level | Notes |
|---|---|---|
| Tenant administrator | Trusted for their own tenant only | Holds an API key with scopes |
| Tenant end user | Untrusted | Talks to the agent; may try prompt injection |
| Tanat operator | Trusted but audited | Can deploy and rotate secrets |
| Anonymous internet | Untrusted | Can reach public endpoints |
| Malicious tenant | Untrusted | Tries to read or spend another tenant's data |
| Compromised dependency | Untrusted | Supply-chain risk |
| AI model | Untrusted output | Can be manipulated by user text |

---

## 4. Trust boundaries

```
Internet
   │  TLS
   ▼
Cloudflare edge ── security headers, CORS, rate limit
   │
   ▼
Worker (Hono) ── Bearer auth ── tenant context ── route handlers
   │
   ├── D1 database (tenant-scoped queries)
   ├── NEAR AI Cloud (Phase 1, outbound only)
   └── NEAR Intents / RPC (Phase 2, outbound only)
```

Every request crossing into the Worker is untrusted until the Bearer key
resolves to an active tenant. Every row crossing out of D1 must already have
been filtered by `tenant_id`.

---

## 5. Threats and mitigations

### 5.1 Spoofing

| Threat | Mitigation | Status |
|---|---|---|
| Guess or brute-force an API key | 256-bit random keys; SHA-256 hashing; rate limiting | Done |
| Replay a stolen key | Keys can expire; revocation sets `is_active = 0`; `last_used_at` recorded | Partial — key rotation guidance needed |
| Forge a tenant identity | Tenant is derived from the key row, never from a request header | Done |
| Steal the salt | Salt lives in Worker secrets; production refuses to start without it | Done |

### 5.2 Tampering

| Threat | Mitigation | Status |
|---|---|---|
| Change another tenant's data | Every query is scoped by `tenant_id` from auth context | Done |
| Alter an action after approval | Actions are immutable after creation except status fields | Partial — add an approval snapshot hash in Phase 2 |
| Modify money amounts in transit | Amounts stored as yoctoNEAR integer strings and parsed with BigInt | Done |
| SQL injection | All queries use bound parameters | Done |
| Tamper with the audit log | Append-only by convention | Open — D1 has no append-only enforcement |

### 5.3 Repudiation

| Threat | Mitigation | Status |
|---|---|---|
| Deny approving a payment | `audit_log` records actor, action, resource, IP, time | Done |
| Deny changing a limit | `tenant.updated` audit event with details | Done |
| Missing actor identity | `actor` is the API key ID | Partial — human identity arrives with the dashboard |

### 5.4 Information disclosure

| Threat | Mitigation | Status |
|---|---|---|
| Read another tenant's sessions | `WHERE tenant_id = ?` on every read; smoke test checks it | Done |
| Leak API key hashes | List endpoint never selects `key_hash` | Done |
| Leak stack traces | Global error handler returns a generic message | Done |
| Leak secrets in logs | Auth failures log a code, not the key | Partial — review logs in Phase 1 |
| Prompt injection extracts another tenant's data | Tools are tenant-scoped; model never receives cross-tenant rows | Phase 1 |
| Sensitive data sent to a non-TEE model | Model privacy tier label plus recorded consent | Phase 1 |

### 5.5 Denial of service

| Threat | Mitigation | Status |
|---|---|---|
| Flood the API | D1-backed fixed-window rate limit per key | Done |
| Huge request bodies | Zod max lengths on text fields | Partial — add a global body size limit |
| Expensive AI calls | Metering plus per-tenant quotas | Phase 1 |
| Rate-limit table grows forever | Probabilistic cleanup of old windows | Done |

### 5.6 Elevation of privilege

| Threat | Mitigation | Status |
|---|---|---|
| Use a read scope to write | Scope check in `authMiddleware(scope)` | Partial — most routes do not yet declare a scope |
| Create a tenant as a normal tenant | `POST /tenants` currently requires only a valid key | Open — must become operator-only |
| Execute an unapproved action | `canExecute` requires `approved`; smoke test proves it | Done |
| Double-spend the limit | Compare-and-swap on `total_spent_near` | Done |
| Race two executions | Status check plus idempotent execute path | Partial — add a DB-level claim in Phase 2 |
| Cross-tenant agent installation | Agent lookup includes `tenant_id` | Done |

---

## 6. Money-specific rules

1. The database stores yoctoNEAR integer strings. The API accepts and returns
   NEAR decimals. Conversion happens only in `src/utils/money.ts`.
2. Arithmetic uses `BigInt`. No floats.
3. A payment must be `pending` → `approved` → `executed`. There is no shortcut.
4. Execution reserves the amount with a compare-and-swap before calling NEAR.
   A failure releases the reservation.
5. Execution is idempotent: repeating an execute on an `executed` action
   returns the existing record.
6. Tenant funds stay in the tenant's wallet. Tanat is non-custodial. Phase 2
   uses a tenant-issued scoped key with a hard cap and allowlist.

---

## 7. Known gaps (tracked, not hidden)

| ID | Gap | Severity | Target |
|---|---|---|---|
| G-01 | `POST /api/v1/tenants` is callable by any tenant | High | Phase 0 fix |
| G-02 | Most routes do not declare a required scope | Medium | Phase 0 fix |
| G-03 | No global request body size limit | Medium | Phase 0 fix |
| G-04 | Audit log is not append-only at the database layer | Medium | Phase 2 |
| G-05 | No per-tenant AI quota enforcement yet | High | Phase 1 |
| G-06 | Real NEAR signing is still mocked | Informational | Phase 2 |
| G-07 | No automated secret scanning in CI | Medium | Phase 0 fix |
| G-08 | Key rotation runbook is missing | Medium | Phase 1 |

---

## 8. Security review rule ("Double-Check")

Every feature is tested twice:

1. The builder writes unit and integration tests.
2. An independent security agent reviews the change and records findings.

A Critical or High finding blocks release until it is fixed and re-reviewed.
The reviewer's report is stored alongside the feature.

---

## 9. Out of scope for Phase 0

- Real NEAR settlement
- AI model calls
- Billing and subscription enforcement
- Dashboard authentication for humans
- Sanctions screening vendor integration

These are planned, not forgotten. Each has an entry in `PLAN.md`.
