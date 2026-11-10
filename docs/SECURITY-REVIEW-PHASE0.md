# Tanat — Independent Security Review, Phase 0

**Reviewer:** Independent security reviewer (not an author of the code)
**Date:** 2026-11-08
**Scope:** backend Phase 0 code in `src/`, `scripts/seed.sql`, `wrangler.toml`, `.dev.vars`, `docs/THREAT-MODEL.md`, `.github/workflows/ci.yml`
**Method:** full manual source review, data-flow tracing, schema review, threat-model comparison, baseline command runs, and targeted exploit probes against the real app + SQL schema using the in-memory D1 shim.

---

## 1. Executive summary

**Release verdict: BLOCK.**

Phase 0 is a working mock and the core tenant-isolation and authentication design is sound, but the repository does not meet its own release gate (“A Critical or High finding blocks release”, `docs/THREAT-MODEL.md:167-175`). I confirmed **six High** findings in the money-execution, spending-limit, credential, deployment-config, and approval-separation paths. None of them allows an unauthenticated attacker to read another tenant’s data today, and real NEAR settlement is still mocked, so no live funds are at risk in the current demo. However, the High findings are in exactly the code that Phase 2 will turn into real money movement, and several are exploitable against the current mock (double execution, self-raised spending limit, known admin keys).

The 61 tests pass, typecheck and lint are clean, and the happy-path approval gate is tested. The tests do **not** cover concurrent execution, same-day key expiry, tenant self-service limit changes, idempotent action creation, the `Content-Length` body-limit bypass, or dependency vulnerabilities. `npm audit` reports **2 critical, 3 high, and 10 moderate** advisories, and CI does not run a dependency or security gate.

**Bottom line:** safe to run locally as a demo; **not safe to deploy to any environment that handles real tenant data or real money** until H-01 through H-06 are fixed and re-reviewed.

### Baseline results

| Command | Result |
|---|---|
| `npm run typecheck` | Pass |
| `npm test` | Pass — 4 files, 61 tests |
| `npm run lint` | Pass |
| `npm audit --audit-level=high` | **Fail** — 2 critical, 3 high, 10 moderate |

### Severity key

- **Critical** — immediate, unauthenticated compromise of funds or cross-tenant data in the current build. **None confirmed.**
- **High** — exploitable security defect in a money/authorization/credential path; must be fixed before any real deployment and before Phase 2.
- **Medium** — must be fixed before production / Phase 1.
- **Low / Info** — hardening and documentation gaps.

---

## 2. Findings table

| ID | Severity | Title | File:line | Impact | Evidence | Recommended fix |
|---|---|---|---|---|---|---|
| **H-01** | High (Critical once real settlement is enabled) | Concurrent execution of one approved action double-pays and double-counts spend | `src/services/action.service.ts:291-343`; `src/routes/actions.ts:106-139` | Two simultaneous `execute` calls both read `approved`, both reserve, both transfer. One 5 NEAR action produced two transfers and 10 NEAR of `total_spent`. In Phase 2 this is a real double-spend. | Reproduced with two concurrent `executeAction` calls: `transfers=2`, `total_spent=10000000000000000000000000` (10 NEAR) for one 5 NEAR action. | Atomically claim the action (`UPDATE ... SET status='executing' WHERE id=? AND tenant_id=? AND status='approved'`; proceed only if `changes=1`), move execution to a Durable Object/Queue, reserve once per action, and carry an idempotency key to NEAR. |
| **H-02** | High (Critical once real settlement is enabled) | Execution is not transactional: a DB failure after a successful transfer releases the spend and marks the action failed | `src/services/action.service.ts:312-342` | If `nearService.transfer` succeeds but the following `UPDATE actions` or `getAction` throws, the catch block releases the reservation and writes `failed`. Money moved, action says failed, limit is restored, and a retry pays again. | Code path: transfer at 313-317; update at 319-324; catch at 327-342 calls `releaseSpend` and writes `failed`. | Mark `executing` before the transfer; never release a reservation after a send may have happened; persist the result in an outbox/queue; reconcile ambiguous states; use a chain-level idempotency key. |
| **H-03** | High | A tenant can raise its own spending limit (and change its NEAR account) with a `write`-scoped key | `src/routes/tenants.ts:22-26,57-78`; `src/services/tenant.service.ts:108-111` | The operator sets `spending_limit_near` at tenant creation, but the tenant-facing PATCH accepts it with only `write` scope. A compromised/automated agent key with `write` can lift its own cap. | Probe: `PATCH /api/v1/tenants/tnt_acme_000001 {"spending_limit_near":1000000}` returned 200 and the DB limit became `1000000000000000000000000000000` yocto (1,000,000 NEAR). | Remove `spending_limit_near` and `near_account_id` from the tenant-facing schema; make them operator-only (or a separate `billing`/`admin` + operator approval); allow tenants to decrease only; alert on increases. |
| **H-04** | High | Known demo admin credentials are committed in source/tests and seeded without expiry | `src/app.integration.test.ts:17-20`; `.dev.vars:13-14`; `scripts/seed.sql:101-120`; `src/utils/crypto.test.ts:75-85` | The Acme/Stark keys are plaintext in the repo and their hashes are in the seed. Both seeded keys carry `read,write,sessions,actions,admin` and `expires_at` is NULL. Anyone with repo access has full admin on any DB seeded with the dev salt. | Seed rows at `scripts/seed.sql:101-120`; plaintext keys at `src/app.integration.test.ts:17-20` and `.dev.vars:13-14`; hash match asserted at `crypto.test.ts:75-85`. | Remove plaintext keys from source/tests; generate per-environment keys from secrets at seed time; never seed production; remove `admin` from demo keys; set expiry; rotate the exposed keys; add full-history secret scanning. |
| **H-05** | High | Production secret guards are bypassed by the shipped `ENVIRONMENT=development` config | `wrangler.toml:6-8,19-27`; `src/middleware/auth.ts:29-32`; `src/middleware/operator.ts:14,36-42` | The salt guard and the dev-master-key guard only fire when `ENVIRONMENT === 'production'`. The only shipped config is `development`, and the production block is commented out. A normal `wrangler deploy` runs with the dev guards disabled. | `wrangler.toml:7` sets `ENVIRONMENT = "development"`; production block is commented at 19-27; `auth.ts:30` and `operator.ts:36` gate on `production`. | Require an explicit environment allowlist; fail closed on missing salt in every non-local environment; reject the dev master key unconditionally; add a real production config; validate config at startup; gate deploy in CI. |
| **H-06** | High | Approval and execution share one scope/credential; there is no human or dual-control gate | `src/routes/actions.ts:19,54-81,106-139`; `src/routes/sessions.ts:21,195-222`; `src/routes/keys.ts:24-28` | One key with `sessions` + `actions` can propose, approve, and execute. `approved_by` is just the API key id; `risk_level` is stored but never used. A compromised agent/SaaS key can move money with no human. | `actionsRouter.use('*', requireScope('actions'))`; approve sets `approved_by = c.get('apiKeyId')`; execute has the same scope; the seeded key has all scopes. The integration test itself performs propose→approve→execute with one key. | Split `actions:propose`, `actions:approve`, `actions:execute`; require a distinct human/dashboard credential for approval; require `approved_by != proposer`; step-up auth for high/critical risk; dual control above a threshold. |
| **M-01** | Medium | API key expiry can be bypassed until the next UTC midnight (timestamp format mismatch) | `src/middleware/auth.ts:36-42`; `src/routes/keys.ts:28,69` | `expires_at` is stored as ISO `...T...Z`, but compared lexicographically to `datetime('now')` (`YYYY-MM-DD HH:MM:SS`). On the same date, `'T' > ' '`, so a key that expired earlier today still authenticates. | SQLite probe: `'2026-11-08T10:00:00Z' > datetime('now')` returned `1` at 15:41 UTC; API request with a key expiring at `00:00` today returned **200**. | Store timestamps as Unix epoch integers or canonical SQLite text; compare with `julianday()`/`unixepoch()` or `datetime(expires_at)`; add a regression test. |
| **M-02** | Medium | Body size limit can be bypassed by omitting `Content-Length` | `src/middleware/body-limit.ts:12-22`; `src/app.ts:32` | Only the declared `Content-Length` is checked. Chunked/streamed requests have no such header, so `c.req.json()` parses an unbounded body (up to Cloudflare’s platform limit). Memory/CPU DoS and cost. | `bodyLimit` reads only `c.req.header('content-length')`; no stream read or actual-size check. | Enforce the actual byte count while reading the stream (or use Hono’s body-limit middleware); reject bodies without a valid length; keep schema max lengths. |
| **M-03** | Medium | Action creation is not idempotent; `X-Idempotency-Key` is advertised but ignored | `src/routes/sessions.ts:195-222`; `src/middleware/cors.ts:17`; `src/services/action.service.ts:151-187` | A retried money message creates a second pending action with a new random idempotency key. Both can be approved/executed, causing a double payment. | Sessions always calls `generateId('idk')`; `createAction` is never called by a route; CORS allows `X-Idempotency-Key` but no code reads it. | Accept `Idempotency-Key` on proposal/message; enforce a unique `(tenant_id, idempotency_key)`; return the existing action; add a retry test. |
| **M-04** | Medium | Operator route has no rate limiting or lockout | `src/app.ts:51-68`; `src/middleware/operator.ts:33-55` | The rate limiter is mounted only on the tenant `api`; `/api/operator/v1` is separate. Unlimited `MASTER_API_KEY` guesses, no alerting, no IP allowlist. | `app.route('/api/operator/v1', operatorRouter)` is outside the `api` Hono instance that has `rateLimitMiddleware()`. | Apply a pre-auth IP/key rate limit to the operator route, add Cloudflare Access/IP allowlist, alert on failures, rotate the key. |
| **M-05** | Medium | Failed authentication is not rate limited | `src/app.ts:54-56`; `src/middleware/rate-limit.ts:22-23` | Auth runs before the rate limiter, so invalid-key attempts are unlimited. Attacker can force repeated D1 lookups (cost/DoS) and brute-force weak operator keys. | Middleware order: `authMiddleware()` then `requireTenant()` then `rateLimitMiddleware()`. | Add an IP-based pre-auth limiter (Cloudflare WAF/rate limiting rules) and a cheap constant-time path for invalid keys. |
| **M-06** | Medium | Rate limiting is per key, and a tenant can mint unlimited keys | `src/middleware/rate-limit.ts:22-23`; `src/routes/keys.ts:19,48-98` | An `admin` key can create many keys; each gets its own 100 req/min bucket. This multiplies the tenant’s effective quota and resets limits on rotation. | Rate-limit identifier is `c.get('apiKeyId')`; key creation has no count cap. | Add a per-tenant limiter keyed by `tenant_id`; cap active keys; enforce a tenant-level quota. |
| **M-07** | Medium | Audit trail gaps: no IP address, no failed-auth/denial events, fire-and-forget writes | `src/utils/audit.ts:21-44`; `src/app.ts:73-106`; e.g. `src/routes/actions.ts:66-73` | The threat model claims actor/IP/time and repudiation protection, but `ipAddress` is never passed by any caller, and auth failures/denials are not logged. Audit write failures are swallowed. | `AuditEntry.ipAddress` exists but no `logAudit` caller sets it; `catch` at `audit.ts:40-43` only logs. | Pass `cf-connecting-ip`; log auth failures, scope denials, rate limits, and operator failures; make audit writes durable/queued; alert on failure; make append-only in Phase 2. |
| **M-08** | Medium | Known vulnerable dependencies; CI has no dependency/SAST/secret gate and does not enforce “High blocks release” | `package.json:18-31`; `.github/workflows/ci.yml:12-49`; `npm audit` | Production `zod@3.25.76` has a high DoS advisory; dev `vitest`/`tinypool` are critical and `vite` is high. CI passes regardless. The secret check only tests whether `.dev.vars` is tracked. | `npm audit` reports 2 critical, 3 high, 10 moderate. CI runs only typecheck/test/lint, a narrow `.dev.vars` check, and a Wrangler dry run. | Upgrade `zod` (≥4.6.6) and `vitest`/`vite`; add `npm audit --audit-level=high`, CodeQL/Semgrep, gitleaks/trufflehog full history, Dependabot; require these checks via branch protection; pin Actions to SHAs. |
| **M-09** | Medium | Per-installation and tenant configuration limits are not enforced | `scripts/seed.sql:84,91`; `src/types/index.ts:192-199`; `src/routes/sessions.ts:88-122` | `maxRefundNear` (5/25 NEAR), `features.nearPayments`, `maxApiCalls`, and `allowedModels` are stored but never read. A tenant can exceed its configured refund cap and use features it disabled. | `grep` finds no enforcement of `maxRefundNear`, `features`, `maxApiCalls`, or `allowedModels` in `src/`. | Enforce installation config at proposal and execution; enforce feature flags and quotas; add negative tests. |
| **M-10** | Medium | Currency confusion: `$240` is parsed as 240 NEAR | `src/routes/sessions.ts:159-164` | The fallback regex treats `$` as a NEAR marker. “Refund $240” creates a 240 NEAR proposal (orders of magnitude more than intended). Human approval may catch it, but it is a direct overpayment path. | `lower.match(/(?:near|ⓝ|\$)\s*(\d+(?:\.\d+)?)/i)` captures `240` from `$240`; `parseNearToYocto('240')`. | Require an explicit currency; do not treat `$` as NEAR; use structured tool arguments; cap by installation config. |
| **M-11** | Medium | Money inputs accept JavaScript numbers, introducing float precision loss | `src/routes/operator.ts:29`; `src/routes/tenants.ts:25`; `src/utils/money.ts:17-28` | `z.number()` accepts floats; `parseNearToYocto` stringifies them. Large/odd values lose precision (`9007199254740993` → `...992`) and `1e+21` is rejected with a 500. The “no floats” rule is broken at the input boundary. | Schemas use `z.number().nonnegative()`; `String(value)` is the conversion path. | Accept decimal strings only; validate with the existing regex; reject numbers; add boundary tests. |
| **M-12** | Medium | Approved actions never expire; execution ignores `expires_at` | `src/services/action.service.ts:291-303,345-364` | Approve checks expiry, but execute does not. An approved action can be executed arbitrarily later. `getExpiredActions` is never scheduled/called, so pending actions linger. | `executeAction` has no `isExpired` check; `getExpiredActions` has no caller. | Check expiry in execute; bound the approved→executed window; schedule expiry via a Durable Object alarm or cron; test it. |
| **L-01** | Low | Negative `limit` bypasses the 100-row cap (`LIMIT -1` returns all rows) | `src/routes/actions.ts:26-27`; `src/routes/agents.ts:47-48`; `src/routes/sessions.ts:38-39`; `src/routes/near.ts:63` | `Math.min(Number('-1'), 100) = -1`; SQLite treats `LIMIT -1` as unlimited. An authenticated tenant can force large responses/scans (DoS/cost). | SQLite probe: `LIMIT -1` returned all 5 of 5 rows. | Parse with Zod to integers, clamp `limit` to 1..100 and `page` to ≥1; reject invalid values. |
| **L-02** | Low | Pausing/removing an installation or closing a session does not stop pending actions | `src/routes/sessions.ts:131-137`; `src/routes/actions.ts:54-139` | Message send checks only `sessions.status`; actions are not tied to installation/session state. A “kill switch” (remove installation/close session) does not cancel or block pending actions. | Session lookup at 131-137 has no installation join; action handlers only check tenant. | Join installation status on message/action paths; expire pending actions on removal/close; test the kill switch. |
| **L-03** | Low | Plaintext API key response has no `Cache-Control: no-store` | `src/routes/keys.ts:83-97`; `src/middleware/security.ts:10-19` | The one-time plaintext key could be cached by an intermediary or client cache. | No `Cache-Control` header is set anywhere. | Add `Cache-Control: no-store` to all API responses, especially key creation. |
| **L-04** | Low | Internal execution error details are returned to the caller and stored | `src/services/action.service.ts:332-341` | `Action execution failed: ${errorMessage}` can leak RPC/network/internal details in Phase 2; `execution_result` is returned by `GET /actions/:id`. | Catch builds the message from `err.message`. | Return a generic error to the client; store a correlation id; log details server-side. |
| **L-05** | Low | `near_account_id` is unbounded and unvalidated at tenant creation/update | `src/routes/operator.ts:28`; `src/routes/tenants.ts:24`; `src/services/tenant.service.ts:43-77` | Invalid or huge account IDs are stored; later transfers fail. The stored value is used as `from_account` for proposals. | `z.string().optional()` with no max/regex; no `NearService.validateAccount` call. | Validate with `NearService.validateAccount`; enforce a max length; normalize. |
| **L-06** | Low | Action `type` is ignored at execution; every type is executed as a transfer | `src/services/action.service.ts:305-317` | `near_function_call`/`custom` actions are executed through `transfer` (or fail). A future route that creates such actions could mis-execute them. | `executeAction` always calls `nearService.transfer(...)`. | Switch on `action.type`; implement `near_function_call` explicitly; reject unsupported types. |
| **L-07** | Low / Info | CORS default is not a wildcard and `credentials: true` is always sent | `src/middleware/cors.ts:12-21` | `CORS_ORIGINS` unset becomes `['*']`; Hono treats an array as a literal allowlist, so no origin matches (fail-closed). This breaks cross-origin frontends and always emits `Access-Control-Allow-Credentials: true`. Not a data-exposure bug today because auth is Bearer-only. | Hono CORS implementation: array origin uses `optsOrigin.includes(origin)`; probe with `Origin: https://evil.example` returned no `Access-Control-Allow-Origin`. | Default to an explicit allowlist; set `credentials: false` (Bearer auth does not need credentials); fail startup if unset in production. |
| **L-08** | Low | Client-controlled `X-Request-ID` is trusted in logs/errors | `src/middleware/auth.ts:69`; `src/app.ts:74` | Log forging / unreliable audit correlation; an attacker can make unrelated events share a request id. (Tenant lookup is not enumerable: any non-self id returns 403, so there is no 403-vs-404 oracle.) | `requestId` is taken from the header without validation. | Generate/validate request IDs server-side; cap length and strip control characters. |
| **L-09** | Low | 413 responses lack security headers | `src/app.ts:32-34`; `src/middleware/body-limit.ts:17` | `bodyLimit` runs before `securityHeaders`, so a too-large body gets a 413 without HSTS/CSP/nosniff. | Probe: 413 response had `x-content-type-options=null` and `content-security-policy=null`; 401/404 had the headers. | Register `securityHeaders` before `bodyLimit`, or set headers in `onError`. |
| **I-01** | Info | Threat model and README have drifted from the code | `docs/THREAT-MODEL.md:82,94,100,119,128-132,143-148,152-163,167-175`; `README.md:162-174` | Stale gaps (G-01/G-02/G-03/G-07) and claims (“production refuses to start”, “audit records IP”, “double-spend Done”, “sliding window”) mislead reviewers and customers. | See section 6. | Update the documents and add a doc-accuracy check to the review checklist. |
| **I-02** | Info | Unused dependency/config and build artifacts contain the dev constant | `package.json:20`; `src/types/index.ts:21-30`; `dist/index.js:8497` | `@hono/zod-validator` is unused; `API_VERSION`/`NEAR_*` are unused in Phase 0; `dist/` contains the dev master-key constant. | Grep/read. | Remove unused deps; keep `dist/` out of artifacts; never ship dev constants. |
| **I-03** | Info | Frontend auth headers do not match the backend | `frontend/src/api.ts:118-122` | Frontend sends `X-API-Key`/`X-Tenant-ID`; backend accepts only `Authorization: Bearer`. Functional break, not a backend vuln (out of scope). | Frontend code. | Update the client to Bearer; add an integration contract test. |
| **I-04** | Info | “Constant-time” comment overstates length hiding | `src/middleware/operator.ts:5-7,24-31` | SHA-256 hashing normalizes the compared length, but hashing time still varies with input length. Length is not a meaningful secret here. | Code/comment. | Adjust the comment; consider a fixed-length HMAC comparison. |

---

## 3. High findings — exploit scenarios and remediation

### H-01 — Concurrent execution double-pays one approved action

**Where:** `src/services/action.service.ts:291-343`, route `src/routes/actions.ts:106-139`.

**Why it is a real defect:** `executeAction` performs a non-atomic read-check-reserve-transfer-write sequence:

1. `getAction` reads the row (`:297`).
2. `canExecute` checks `status === 'approved'` (`:301-303`).
3. `reserveSpend` adds the amount to `total_spent_near` (`:308-310`).
4. `nearService.transfer` moves the money (`:313-317`).
5. `UPDATE actions SET status='executed'` (`:319-324`).

There is no `executing` claim and no transaction. Two requests can both pass step 2 before either reaches step 5.

**Exploit scenario (current mock, verified):**

1. Obtain or approve one 5 NEAR action (Acme limit is 50 NEAR).
2. Send two `POST /api/v1/actions/{id}/execute` requests concurrently.
3. Both read `approved`; both reserve 5 NEAR (5 + 5 ≤ 50, so the compare-and-swap does not stop the second); both call `transfer`; both write `executed`.
4. Result: **two transfers** and `total_spent_near = 10 NEAR` for a single 5 NEAR action.

I reproduced this with the repository’s own D1 shim and two concurrent `executeAction` calls:

```
PROBE transfers= 2 total_spent= 10000000000000000000000000   // 10 NEAR for one 5 NEAR action
```

**Phase 2 impact:** two real NEAR transfers for one approval. The compare-and-swap only guarantees the tenant does not exceed the limit; it does not guarantee one action executes once. A 5 NEAR action against a 50 NEAR limit can be paid up to 10 times concurrently.

**Remediation (specific):**

- Add an atomic claim before any money logic:
  ```sql
  UPDATE actions
     SET status = 'executing', updated_at = datetime('now')
   WHERE id = ? AND tenant_id = ? AND status = 'approved';
  ```
  Proceed only if `meta.changes === 1`. Add `executing` to the status `CHECK` and state machine.
- Move execution to a Cloudflare Queue or Durable Object (the PLAN already calls for this in Phase 2); the HTTP handler should only enqueue.
- Reserve spend exactly once per action (store a `reservation_id`/`reserved_at` on the action, or make reservation idempotent by action id).
- Pass a stable idempotency key to the NEAR layer (and use the chain/intent idempotency mechanism).
- Add a concurrency test that fires N parallel executes and asserts exactly one transfer and one reservation.

---

### H-02 — A post-transfer DB failure is treated as a failed transfer

**Where:** `src/services/action.service.ts:312-342`.

**Why it is a real defect:** the `try` block contains both the money movement and the persistence:

```ts
try {
  const result = await nearService.transfer(...);          // money may move
  await db.prepare("UPDATE actions SET status='executed' ...").run(); // can throw
  return getAction(...);                                    // can throw
} catch (err) {
  await releaseSpend(...);                                  // restores the limit
  await db.prepare("UPDATE actions SET status='failed' ...").run();
  throw ...
}
```

If `transfer` succeeds and either the `UPDATE` or `getAction` fails (D1 timeout, transient error, Worker eviction), the catch block assumes the transfer failed. It releases the reservation and marks the action `failed`. The money has already moved, but the ledger says it did not, and the limit is available again.

**Exploit scenario (Phase 2):**

1. Approve a 40 NEAR action (limit 50 NEAR).
2. Execute; the NEAR transfer succeeds.
3. D1 returns a transient error on the status update.
4. The catch releases 40 NEAR (limit back to 50) and writes `failed`.
5. The operator/retry executes the action again; another 40 NEAR moves. The tenant has now spent 80 NEAR against a 50 NEAR cap, and the ledger shows 0.

Even without an attacker, a network partition or Worker restart produces an unrecorded payment.

**Remediation (specific):**

- Mark `executing` **before** calling NEAR (see H-01).
- Separate “send” from “record”: after a send, never release the reservation; write an `execution_attempt`/outbox row first, then reconcile.
- Use a Durable Object/Queue with retries and a dead-letter queue; make the worker idempotent.
- On persistence failure after a send, leave the action in `executing`/`unknown` and alert; reconcile against the chain.
- Store the chain transaction hash/idempotency key before/with the send so a retry can detect the existing transfer.
- Add fault-injection tests (throw after transfer, throw in `getAction`) and assert the limit is not released and the action is not marked `failed`.

---

### H-03 — Tenant can raise its own spending limit

**Where:** `src/routes/tenants.ts:22-26` (schema includes `spending_limit_near`), `:57-78` (PATCH with `write` scope), `src/services/tenant.service.ts:108-111`.

**Why it is a real defect:** the operator creates tenants with a `spending_limit_near` (`src/routes/operator.ts:29`, `src/services/tenant.service.ts:58-60`), which implies a platform/operator control. But the tenant-facing PATCH accepts the same field and only requires `write` scope. `requireScopeForMethod('read','write')` (`tenants.ts:20`) means any key that can update an agent or installation can also lift the money cap.

**Exploit scenario (verified):**

1. A tenant key with `write` (the seeded demo key has `write`) calls:
   ```http
   PATCH /api/v1/tenants/tnt_acme_000001
   Authorization: Bearer tnt_...
   Content-Type: application/json

   {"spending_limit_near": 1000000}
   ```
2. The API returns 200 and the DB stores `1000000000000000000000000000000` yocto (1,000,000 NEAR).
3. The tenant proposes/approves/executes a large transfer; the original 50 NEAR cap no longer binds.

I reproduced this against the app + shim: `status=200`, `new_limit_yocto=1000000000000000000000000000000`.

**Remediation (specific):**

- Remove `spending_limit_near` and `near_account_id` from the tenant-facing `updateTenantSchema`.
- Add an operator-only `PATCH /api/operator/v1/tenants/:id` (with audit, reason, and alerting).
- If tenants must be able to lower their own cap, allow only a decrease and require `admin` + a separate confirmation.
- Alert on any limit increase and require dual approval above a threshold.

---

### H-04 — Known demo admin credentials are committed and seeded

**Where:** `src/app.integration.test.ts:17-20` (plaintext Acme/Stark keys), `.dev.vars:13-14` (same plaintext), `scripts/seed.sql:101-120` (hashes, scopes, no expiry), `src/utils/crypto.test.ts:75-85` (proves the hash matches the dev salt).

**Why it is a real defect:** the repository contains the plaintext keys and the seed contains their hashes. The seed rows grant:

```json
["read", "write", "sessions", "actions", "admin"]
```

and omit `expires_at` (NULL = never expires). The dev salt is also in `.dev.vars:9` and in the test (`app.integration.test.ts:23`).

**Exploit scenario:**

1. Anyone with repository access reads `src/app.integration.test.ts:17-20` or `.dev.vars:13-14`.
2. Any environment that runs `scripts/seed.sql` with `API_KEY_SALT=dev-salt-change-in-production` accepts those keys.
3. The attacker has full admin for the Acme and Stark tenants: read/write data, create/revoke keys, propose/approve/execute payments, delete the tenant.

Even if `.dev.vars` is never committed, the test file is committed and contains the same keys. The CI “secret check” does not catch this because it only tests whether `.dev.vars` is tracked (`ci.yml:39-44`).

**Remediation (specific):**

- Remove plaintext keys from `src/app.integration.test.ts` and any fixture; generate a random key at test time and insert its hash (the test already has `hashApiKey`).
- Remove the plaintext keys from `.dev.vars`; generate per-developer keys with a script.
- Never run `seed.sql` against staging/production; add a guard in the seed script and docs.
- Remove `admin` from demo keys; set a short `expires_at`.
- Rotate the exposed keys and salt; treat them as compromised.
- Add full-history secret scanning (gitleaks/trufflehog) and a pre-commit hook.

---

### H-05 — Production secret guards are bypassed by the shipped config

**Where:** `wrangler.toml:6-8` (`ENVIRONMENT = "development"`), `:19-27` (production block commented out); `src/middleware/auth.ts:29-32`; `src/middleware/operator.ts:14,36-42`.

**Why it is a real defect:** the code uses `ENVIRONMENT === 'production'` as the only trigger for two critical guards:

- `auth.ts:30-32` allows an **empty API key salt** unless the environment is exactly `production`.
- `operator.ts:36-42` allows the known `dev-master-key-change-in-production` unless the environment is exactly `production`.

The only shipped `wrangler.toml` sets `ENVIRONMENT = "development"`; the production section is commented out. A normal `wrangler deploy` therefore runs with both guards disabled.

**Exploit scenario:**

1. Deploy the repo as-is (`npm run deploy` → `wrangler deploy`) and configure `MASTER_API_KEY` from `.dev.vars` or leave `API_KEY_SALT` unset.
2. Because `ENVIRONMENT` is `development`, `operatorAuth` accepts the publicly known `dev-master-key-change-in-production`, and `authMiddleware` permits an empty salt.
3. An attacker who knows the repo default master key can call `POST /api/operator/v1/tenants` and create arbitrary tenants. If the deployment also copies the dev salt from `.dev.vars:9`, the committed demo keys (H-04) authenticate directly; with no salt, keys remain high-entropy, but the guard is still disabled and any future key-creation path loses the salt defense-in-depth.

The known master key is in `src/middleware/operator.ts:14` and `.dev.vars:4`; the known salt is in `.dev.vars:9`.

**Remediation (specific):**

- Add an explicit production environment to `wrangler.toml` and make deploy use it (`wrangler deploy --env production`).
- Fail closed if `API_KEY_SALT` is missing in **any** environment except an explicit `local`/`test` allowlist.
- Reject `dev-master-key-change-in-production` unconditionally, not only in `production`.
- Validate required config at startup (a small `assertEnv` before the app handles requests).
- Add a CI deploy guard that refuses to deploy when `ENVIRONMENT !== production` or the dev defaults are present.
- Use `wrangler secret put` for `MASTER_API_KEY` and `API_KEY_SALT`; never `.dev.vars`.

---

### H-06 — One credential can propose, approve, and execute; no human/dual control

**Where:** `src/routes/actions.ts:19` (`requireScope('actions')`), `:54-81` (approve), `:106-139` (execute); `src/routes/sessions.ts:21` (`requireScope('sessions')`), `:195-222` (proposal); `src/routes/keys.ts:24-28` (scope enum).

**Why it is a real defect:** the product promise is “risky actions require explicit human approval” (`README.md:26`, `docs/THREAT-MODEL.md:17-18,142`). The code implements a state machine, but not a separation of duties:

- `actions` is a single scope for approve and execute.
- `approved_by` is `c.get('apiKeyId')` (`actions.ts:57`), i.e. the same credential that can propose.
- `risk_level` is stored (`sessions.ts:174-181`, `action.service.ts:180`) but never used to require a stronger approval.
- There is no human identity, MFA, WebAuthn, or dual control.
- The seeded keys have `sessions`, `actions`, and `admin` simultaneously.

**Exploit scenario:**

1. An agent runtime or SaaS integration holds one key with `sessions` + `actions` (or the seeded all-scope key).
2. It sends `POST /api/v1/sessions/{id}/messages` with “refund 5 NEAR to attacker.near” → a `pending` action.
3. It calls `POST /api/v1/actions/{id}/approve` with the same key → `approved`; `approved_by` is its own key id.
4. It calls `POST /api/v1/actions/{id}/execute` → `executed`.
5. No human was involved; a compromised integration can drain up to the limit. The same pattern works for `critical` risk actions because risk is not enforced.

**Remediation (specific):**

- Split scopes: `actions:propose`, `actions:approve`, `actions:execute` (and keep `actions` only as a legacy alias if needed).
- Require a distinct approver credential: `approved_by` must not equal the proposer key id; store the proposer key id on the action.
- For `high`/`critical` risk or amounts above a threshold, require a dashboard human session with MFA/WebAuthn and, above a higher threshold, two approvers.
- Add a `proposed_by` column and enforce separation in SQL/service logic.
- Add tests: same key cannot approve its own proposal; `critical` requires step-up; an execute-only key cannot approve.

---

## 4. Medium findings — details

### M-01 — Same-day API key expiry bypass

`expires_at` is written from `z.string().datetime()` (`keys.ts:28`, `:69`) as `2026-11-08T10:00:00Z`, but the auth query compares it to `datetime('now')`, which is `2026-11-08 15:41:36` (`auth.ts:41`). SQLite compares these as text; `'T'` (0x54) sorts after `' '` (0x20), so an expired same-day key looks “greater than now”.

Verified:

```
'2026-11-08T10:00:00Z' > datetime('now')  -> 1   (at 15:41 UTC)
API request with expires_at = 2026-11-08T00:00:00Z -> 200
```

**Fix:** store expiry as an integer epoch (`unixepoch()`) or compare with `julianday(expires_at) > julianday('now')` / `datetime(expires_at) > datetime('now')`; add a test for a key that expired earlier the same day.

### M-02 — `Content-Length`-only body limit

`bodyLimit` checks `c.req.header('content-length')` only (`body-limit.ts:14-18`). A chunked request or a request without the header is allowed, and `c.req.json()` parses the body. Cloudflare’s platform limit (100 MB) becomes the effective cap.

**Fix:** read the request stream with a byte counter and abort over 1 MB, or use Hono’s `bodyLimit` middleware (which measures the actual body); reject bodies with no valid length for JSON endpoints.

### M-03 — Non-idempotent action creation

`sessions.ts:195-222` always generates a fresh `idk_...` and inserts a new action. `X-Idempotency-Key` is allowed by CORS (`cors.ts:17`) but never read. `createAction` (`action.service.ts:151-187`) has an idempotency check, but no route calls it. A retried money message creates two pending actions; both can be approved and executed.

**Fix:** read `Idempotency-Key` on message/action creation, store it on the action, enforce `UNIQUE (tenant_id, idempotency_key)` (replace the global unique at `0001_init.sql:138`), and return the existing action on replay. Add a retry test.

### M-04 — Operator route has no rate limit

The rate limiter is mounted on the tenant `api` only (`app.ts:51-56`); the operator router is mounted separately (`app.ts:68`). `operatorAuth` (`operator.ts:33-55`) has no throttle, lockout, or alert.

**Fix:** apply a pre-auth IP/key rate limit to `/api/operator/v1`, add Cloudflare Access or an IP allowlist, alert on failures, and rotate the master key. Consider splitting the operator plane into a separate Worker/account.

### M-05 — Failed auth not rate limited

`authMiddleware` runs before `rateLimitMiddleware` (`app.ts:54-56`), so invalid keys never hit the limiter. This enables repeated D1 lookups (cost/DoS) and unthrottled guessing.

**Fix:** add a pre-auth IP limiter (Cloudflare WAF rate-limiting rules are the natural place on Workers) and a cheap rejection path; keep the per-key limiter for authenticated traffic.

### M-06 — Per-key rate limit can be multiplied by minting keys

The identifier is `apiKeyId` (`rate-limit.ts:22-23`). An `admin` key can create unlimited keys (`keys.ts:48-98`), each with its own bucket. 100 keys × 100 req/min = 10,000 req/min for one tenant.

**Fix:** key the limiter by `tenant_id` (and optionally by key for fairness), cap the number of active keys per tenant, and enforce a tenant-level quota.

### M-07 — Audit trail gaps

`AuditEntry.ipAddress` exists (`audit.ts:14`) and the column exists (`0001_init.sql:172`), but no caller sets it (grep of all 15 `logAudit` calls). Auth failures, scope denials, rate limits, and operator failures are not audited. `logAudit` swallows all errors (`audit.ts:40-43`), so an attacker who can cause DB errors can suppress the trail.

**Fix:** pass `c.req.header('cf-connecting-ip')`; add audit events for `auth.failed`, `authz.denied`, `rate_limit.exceeded`, `operator.auth_failed`; write audit events through a queue/outbox and alert on write failure; make the table append-only in Phase 2.

### M-08 — Vulnerable dependencies and no security gate in CI

`npm audit --audit-level=high` exits 1:

- **Critical:** `vitest` (<3.2.6), `tinypool` (<=2.1.1) — dev/test only.
- **High:** `zod` (<4.6.6, production dependency, memory-exhaustion advisory), `vite` (<=6.4.3, dev), `@hono/zod-validator` (via zod).
- **Moderate:** 10 (`@typescript-eslint/*`, `minimatch`, `esbuild`, `vite-node`, `@vitest/mocker`).

CI (`.github/workflows/ci.yml:12-49`) runs typecheck/test/lint, a narrow `.dev.vars` tracked check, and `wrangler deploy --dry-run`. It does not run `npm audit`, SAST, DAST, or a real secret scan, and there is no release/deploy gate or branch-protection check that enforces “Critical/High blocks release” (`docs/THREAT-MODEL.md:167-175`, `PLAN.md:330-337`).

**Fix:** upgrade `zod` to ≥4.6.6 (or a patched 3.x if available) and `vitest`/`vite` to patched versions; add `npm audit --audit-level=high`, CodeQL/Semgrep, gitleaks/trufflehog, and Dependabot; pin Actions to commit SHAs; require these checks in branch protection; add a separate deploy workflow gated on them.

### M-09 — Configuration limits are decorative

`scripts/seed.sql:84` and `:91` set `maxRefundNear` to 5/25 NEAR, and `src/types/index.ts:192-199` defines `maxApiCalls`, `features`, and `allowedModels`. None are read anywhere in `src/` (grep). A user can request a refund above the installation cap, use payments when `features.nearPayments` is false, and exceed `maxApiCalls`.

**Fix:** parse installation config at proposal time and enforce `maxRefundNear`; enforce tenant feature flags and `maxApiCalls` in middleware; add negative tests. If these are demo-only fields, remove them from the seed to avoid a false sense of control.

### M-10 — `$240` becomes 240 NEAR

The fallback regex at `sessions.ts:159-164` treats `$` as a NEAR marker. “Refund $240” produces a 240 NEAR action. The description says “240 NEAR”, so a careful human may catch it, but the proposal is wrong by orders of magnitude.

**Fix:** require an explicit currency token; parse USD and NEAR separately; do not default to NEAR; use structured tool arguments (`{ amount, currency, recipient }`); enforce the installation’s `maxRefundNear`.

### M-11 — Float inputs at the money boundary

`operator.ts:29` and `tenants.ts:25` use `z.number().nonnegative()` for `spending_limit_near`; `money.ts:17-28` stringifies the number. This violates the “no floats” rule and loses precision for values above `Number.MAX_SAFE_INTEGER` or with many decimals; `1e+21` is rejected with a 500.

**Fix:** accept decimal strings only (`z.string().regex(...)`), convert with `parseNearToYocto`, and reject `number` inputs. Keep the internal yoctoNEAR `BigInt` path.

### M-12 — Approved actions never expire

`approveAction` checks `isExpired` (`action.service.ts:252-258`), but `executeAction` does not (`:291-303`). `getExpiredActions` (`:345-364`) has no caller, so pending actions are never swept. An action approved before expiry can be executed days later.

**Fix:** check `isExpired` in `executeAction`; define an approved→executed window; schedule expiry via a Durable Object alarm or cron; test it.

---

## 5. Low / informational notes

- **L-01** — Negative `limit` yields `LIMIT -1` (unlimited) in `actions.ts:26-27`, `agents.ts:47-48`, `sessions.ts:38-39`, `near.ts:63`. Clamp/validate.
- **L-02** — Installation status is not rechecked on message send (`sessions.ts:131-137`) or action execution; removing/pausing an installation does not stop existing sessions or pending actions.
- **L-03** — No `Cache-Control: no-store`; the plaintext key response (`keys.ts:83-97`) should never be cacheable.
- **L-04** — `EXECUTION_FAILED` returns `${errorMessage}` (`action.service.ts:332-341`); use a generic client message and a correlation id.
- **L-05** — `near_account_id` is unbounded/unvalidated (`operator.ts:28`, `tenants.ts:24`); use `NearService.validateAccount` and a max length.
- **L-06** — `executeAction` ignores `action.type` and always calls `transfer` (`action.service.ts:305-317`); implement `near_function_call` or reject it.
- **L-07** — CORS default `['*']` is not a wildcard in Hono; it denies all origins (fail-closed) and always sets `Access-Control-Allow-Credentials: true`. Fix the config; use `credentials: false` for Bearer auth.
- **L-08** — Client-supplied `X-Request-ID` is trusted in logs/errors (`auth.ts:69`, `app.ts:74`); validate/sanitize it. (Tenant lookup is not enumerable: any non-self id returns 403.)
- **L-09** — 413 responses lack security headers because `bodyLimit` runs before `securityHeaders` (`app.ts:32-34`); verified.
- **I-01** — Threat model/README drift (see section 6).
- **I-02** — Unused `@hono/zod-validator`, unused `API_VERSION`/`NEAR_*`; `dist/index.js` contains the dev master-key constant.
- **I-03** — Frontend sends `X-API-Key`/`X-Tenant-ID`, backend accepts only Bearer (out of scope, but the demo UI will fail auth).
- **I-04** — “Constant-time” comment overstates length hiding; hashing time still varies with input length.

---

## 6. Threat model vs. code — gaps and stale claims

| Threat-model claim | Reality in code | Verdict |
|---|---|---|
| “Production refuses to start without salt” (`THREAT-MODEL.md:84`) | The check is per-request and only when `ENVIRONMENT === 'production'` (`auth.ts:30-32`); the shipped config is `development`. | **Not implemented as claimed** (H-05). |
| “Audit log records actor, action, resource, IP, time” (`:100`) | `ipAddress` is never passed by any caller (`audit.ts:14,37`). | **IP missing** (M-07). |
| “Double-spend the limit — compare-and-swap — Done” (`:131`) | CAS prevents exceeding the limit, but one action can be executed twice concurrently and double-counted (H-01); a post-transfer failure releases the reservation (H-02). | **Partial / misleading** (H-01, H-02). |
| “Race two executions — status check plus idempotent execute — Partial, add DB-level claim in Phase 2” (`:132`) | Accurate: no claim, no queue, no transaction. | **Correctly flagged; still a blocker** (H-01). |
| “Create a tenant as a normal tenant — Open — must become operator-only” (`:129`) | `POST /api/v1/tenants` does not exist; the operator route is separate and tested. | **Fixed; doc stale** (G-01). |
| “Most routes do not declare a required scope” (`:128`, G-02) | All routers now declare scopes (`agents/installations/tenants` read/write, `sessions`, `actions`, `near` read, `keys` admin). | **Fixed; doc stale** (G-02). |
| “No global request body size limit” (`:120`, G-03) | `bodyLimit(1_000_000)` exists but is bypassable via missing `Content-Length`. | **Partial; doc stale** (M-02). |
| “No automated secret scanning in CI” (`:162`, G-07) | CI has a narrow `.dev.vars` tracked check; no full-history scan, and the committed demo keys pass. | **Partial; doc stale** (M-08). |
| “Huge request bodies — Zod max lengths — Partial, add a global body size limit” (`:120`) | The global limit exists but is header-only. | **Partial** (M-02). |
| “Actions are immutable after creation except status fields” (`:91`) | There is no route to update action params; execution uses stored params. | **Holds** (with the caveat that there is no approval snapshot hash; Phase 2). |
| “SQL injection — all queries use bound parameters” (`:93`) | All user values are bound; dynamic SQL only concatenates constant column names/fragments (`agent.service.ts:130-179`, `installations.ts:129-147`, `action.service.ts:211-232`). | **Holds.** |
| “Leak API key hashes — list endpoint never selects key_hash” (`:109`) | `keys.ts:35-42` selects explicit columns, not `key_hash`. | **Holds.** |
| “Leak stack traces — generic message” (`:110`) | `app.ts:94-105` returns a generic 500; `AppError` messages are returned (validation/conflict) by design. | **Holds**, except `EXECUTION_FAILED` details (L-04). |
| “Every row crossing out of D1 must already be filtered by tenant_id” (`:69-71`) | All route queries are tenant-scoped; cross-tenant tests pass. | **Holds.** |
| “Critical or High finding blocks release” (`:174`, `PLAN.md:330-337`) | CI has no security gate; High findings pass. | **Not implemented** (M-08). |

---

## 7. What is done well

1. **Authentication derives identity from the key row, never from a request header.** `auth.ts:36-50` resolves `tenant_id` from `api_keys`, joins `tenants`, checks `is_active`, tenant status, and expiry. There is no `X-Tenant-ID` trust path in the backend.
2. **Bearer-only, legacy header rejected.** `auth.ts:19-22` and the integration/smoke tests explicitly reject `X-API-Key` (`app.integration.test.ts:120-126`).
3. **Key material is strong and stored safely.** 256-bit random keys (`crypto.ts:26-35`), salted SHA-256 (`crypto.ts:41-49`), only hashes stored, plaintext returned once (`keys.ts:82-97`), list never selects `key_hash` (`keys.ts:35-42`), revocation is tenant-scoped (`keys.ts:105-111`).
4. **Tenant isolation is consistent.** Every list/detail/update/delete path binds `tenant_id` from auth: agents (`agent.service.ts:82-120,178-199`), installations (`installations.ts:35-59,121-170`), sessions (`sessions.ts:42-84,131-137`), actions (`action.service.ts:189-235`), keys (`keys.ts:35-42,105-111`), near (`near.ts:26-34,65-73`). Cross-tenant tests pass (`app.integration.test.ts:155-174,249-257`).
5. **Operator plane is separated from the tenant plane.** `app.ts:67-70` mounts `/api/operator/v1` outside the tenant `api`; `operator.ts:33-55` compares SHA-256 digests in constant time; the integration test proves a tenant key is rejected (`app.integration.test.ts:343-349`).
6. **Money representation is correct in the core.** `money.ts:9-61` uses `BigInt`, a strict decimal regex, 24-decimal precision, and yoctoNEAR integer strings. `action.service.ts:55-67` reads yocto amounts with `BigInt`; `reserveSpend`/`releaseSpend` use CAS (`:74-149`). The happy-path accounting test is correct (`app.integration.test.ts:282-290`).
7. **The approval state machine is pure and tested.** `action-state.ts:15-44`; `action-state.test.ts` covers all transitions; execute-before-approve is blocked (`app.integration.test.ts:242-247`), reject-after-approve is blocked (`:267-272`), and sequential re-execute is idempotent (`:292-308`).
8. **Input validation is broad.** Zod schemas on every body (`agents.ts:21-42`, `installations.ts:21-29`, `sessions.ts:24-32`, `keys.ts:22-29`, `operator.ts:21-30`, `tenants.ts:22-26`, `near.ts:79-81`); `validateBody` returns structured 400s (`validation.ts:19-42`); unknown keys are stripped by Zod objects.
9. **Error handling does not leak internals.** `app.ts:73-106` returns structured `AppError` messages and a generic 500 for unknown errors; no stack traces.
10. **Security headers are present on normal and most error responses.** `security.ts:13-19` sets nosniff, DENY, HSTS, CSP, referrer, permissions; verified on 200/401/404 (413 is the exception, L-09).
11. **Rate limiting is shared and atomic.** `rate-limit.ts:28-35` uses a D1 `INSERT ... ON CONFLICT ... RETURNING count`; the counter is global across edge locations, with cleanup (`:59-70`) and standard headers (`:45-47`).
12. **Audit and metering are non-blocking.** `audit.ts:21-44` and `metering.service.ts:31-57` catch failures so they cannot break the request; sensitive operations are logged (`actions.ts:66-73,94-100,119-131`, `keys.ts:73-80,113-119`, etc.).
13. **CI has a sensible baseline and least privilege.** `ci.yml:9-10` uses `contents: read`; it runs typecheck, tests, lint, a secret check, and a Wrangler dry run. The gap is the security gate, not the baseline.
14. **The threat model is unusually honest.** It lists real gaps (G-01..G-08) rather than hiding them, which made this review faster. The remaining problem is drift and the missing enforcement of its own release rule.

---

## 8. Residual risks and Phase 1/2 requirements

These are not necessarily Phase 0 defects, but they must be closed before real money or real customer data.

**Money / Phase 2**

- **Execution architecture:** queue or Durable Object, atomic `executing` claim, outbox, retries, dead-letter queue, chain-level idempotency, daily reconciliation, and alerting on `unknown`/ambiguous states. H-01/H-02 must be fixed first.
- **Custody and signing:** tenant-scoped NEAR keys with hard caps and destination allowlists; keys in Cloudflare Secrets Store or a key service, never D1; rotation and break-glass.
- **Sanctions/risk:** screen every recipient; block sanctioned jurisdictions; implement the PLAN’s “global, with sanctions screening on every payment” decision.
- **Per-payment and per-period caps:** the current `total_spent_near` is a lifetime counter; define daily/monthly limits and reset semantics.
- **Action types:** implement `near_function_call` and `custom` explicitly; do not execute unknown types as transfers.
- **Approval integrity:** approval snapshot hash (threat model 5.2), separation of proposer/approver/executor, dual control, step-up auth.

**AI / Phase 1**

- Prompt injection and tool abuse: tool allowlists, step caps, output validation, no cross-tenant rows in model context.
- Redaction before model calls; TEE attestation verification; model privacy-tier labels and consent.
- Per-tenant AI quotas and cost caps (`maxApiCalls`, `allowedModels`, `features`); the current settings are unused.

**Identity / Phase 3**

- Human dashboard auth (OAuth/email), roles, MFA/WebAuthn, session management.
- Key rotation runbook, dual-salt rotation, break-glass, operator SSO/Cloudflare Access.
- End-user authentication/authorization for sessions (today a tenant key can set any `user_id`).

**Data / compliance**

- Append-only audit log (D1 has no native enforcement; use an append-only store or hash chain).
- IP capture, SIEM export, retention/deletion (messages 90 days, audit 2 years per PLAN), backups and restore drills.
- Data residency/privacy review; DPA; deletion process.

**Engineering / process**

- Dependency scanning, SAST, DAST, full-history secret scanning, Dependabot, pinned Actions.
- Branch protection and a deploy workflow that actually enforces “Critical/High blocks release”.
- Staging and production environments with separate D1 databases, salts, and keys; startup config validation.
- External penetration test before real money; bug bounty after launch.
- Fix the frontend/backend auth-header mismatch (`X-API-Key` vs Bearer).

**Known non-security correctness issues noticed**

- `getUsageSummary` compares ISO period bounds to SQLite `recorded_at` text (`metering.service.ts:74-84`) — same timestamp-format class of bug as M-01; currently no route exposes it.
- Re-adding a removed installation hits the `UNIQUE (tenant_id, agent_id)` constraint (`0001_init.sql:77`) because the row still exists with `status='removed'`; `installations.ts:80-94` checks only non-removed rows.
- `createAction` is dead code relative to the API; sessions inserts actions directly, so its idempotency logic is not exercised.

---

## 9. Verification details

**Commands run (repository unchanged):**

```
npm run typecheck   -> pass
npm test            -> 4 files, 61 tests passed
npm run lint        -> pass
npm audit --audit-level=high -> exit 1; 2 critical, 3 high, 10 moderate
```

**Targeted probes (temporary files under `%TEMP%\opencode`, outside the repo):**

1. **Concurrent execute** — inserted one `approved` 5 NEAR action for the Acme tenant (limit 50 NEAR), called `executeAction` twice with `Promise.all` and a fake NEAR service that yields:
   ```
   transfers = 2
   total_spent_near = 10000000000000000000000000   // 10 NEAR
   ```
2. **Same-day key expiry** — inserted an API key with `expires_at = <today>T00:00:00Z` and called `GET /api/v1/tenants` at ~15:47 UTC:
   ```
   HTTP 200
   ```
3. **Tenant self-raise** — `PATCH /api/v1/tenants/tnt_acme_000001` with `{"spending_limit_near":1000000}` using the seeded Acme key:
   ```
   HTTP 200
   spending_limit_near = 1000000000000000000000000000000   // 1,000,000 NEAR
   ```
4. **`LIMIT -1`** — SQLite probe:
   ```
   SELECT * FROM t LIMIT -1  -> all rows
   ```
5. **Error headers** — 200/401/404 include `X-Content-Type-Options`/CSP/HSTS; **413 does not**.

No source file was modified. The only writes were this report and temporary probe files outside the repository.

---

## 10. Recommended fix order

1. **H-01/H-02** — atomic execution claim + queue/outbox + no release after a send. Do not enable real settlement before this.
2. **H-03** — remove `spending_limit_near`/`near_account_id` from the tenant PATCH; operator-only.
3. **H-04/H-05** — remove committed demo keys, rotate salt/keys, add a production config, fail closed on dev defaults.
4. **H-06** — split propose/approve/execute scopes, enforce a distinct approver, step-up for high/critical.
5. **M-01/M-02/M-03** — expiry format, real body limit, idempotent proposals.
6. **M-04..M-08** — operator/auth rate limits, per-tenant limits, audit IP/denials, dependency/CI gate.
7. **M-09..M-12** — enforce config caps, currency correctness, string money inputs, action expiry.
8. **Low/Info** — pagination, no-store, error details, CORS config, docs.

Re-review H-01 through H-06 with the same probes plus new regression tests before any staging/production deploy. Per the project’s own Double-Check Rule, the verdict remains **BLOCK** until then.
