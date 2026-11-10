# Tanat — Independent Security Re-Review, Phase 0

**Reviewer:** Independent security reviewer (not an author of the code)
**Date:** 2026-11-09
**Scope:** backend Phase 0 after the fixes for H-01..H-06 — `src/`, `src/db/migrations/`, `scripts/seed.sql`, `.dev.vars`, `wrangler.toml`, `.github/workflows/ci.yml`, `docs/THREAT-MODEL.md`
**Method:** full manual re-review, data-flow tracing of the money and approval paths, schema review, baseline command runs, HTTP probes against the built Worker (`dist/index.js`) with a `node:sqlite` D1 shim, and simulated crash/claim states.

---

## 1. Verdict

**Release verdict: PASS WITH FIXES.**

All six original High findings (H-01 through H-06) are **fixed** and were independently re-verified. I found **no new Critical or High finding that is clearly exploitable in the current build**.

The remaining findings are **Medium** and **Low**: the most important are a residual stale-claim race in the execution state machine (double-reserve, with a latent double-send only under a >5-minute stalled request), the absence of reconciliation/outbox handling for ambiguous sends, tenant-writable installation money caps, an incomplete `actions:propose` scope, and the missing CI security gate. These must be closed before Phase 2 / real NEAR settlement, but under the severity rules in this review they do not block the Phase 0 demo.

### Baseline results

| Command | Result |
|---|---|
| `npm run typecheck` | **Pass** |
| `npm test` | **Pass** — 4 files, 83 tests |
| `npm run lint` | **Pass** |
| `npm audit --audit-level=high` | **Pass** — 7 moderate, all in dev-only ESLint tooling |

### Severity key

- **Critical** — immediate, unauthenticated compromise of funds or cross-tenant data in the current build. **None confirmed.**
- **High** — clearly exploitable defect in a money/authorization/credential path (privilege escalation, cross-tenant access, double-spend, auth bypass). **None unresolved.**
- **Medium** — money-path integrity or defense-in-depth gap that must be fixed before production / Phase 2.
- **Low / Info** — hardening, documentation, and hygiene.

---

## 2. Findings table (residual and new)

| ID | Severity | Title | File:line | Impact | Evidence | Recommended fix |
|---|---|---|---|---|---|---|
| **M-13** | Medium (High if a >5-min stalled request can resume) | Stale-claim retake can double-reserve, and a stalled original attempt can still send | `src/services/action.service.ts:628-647, 658-675, 677-686` | A crash after `reserveSpend` but before the `executing → sending` update leaves an `executing` claim with `reserved=0`; after 5 minutes a retry retakes it and reserves again. The original attempt's `sending` update does not check `meta.changes`, so if it resumes it still calls `transfer`. | Probe: 3 NEAR action already reserved 3 NEAR; retake added another 3 NEAR (`delta 3000000000000000000000000`). `alreadyReserved` is dead code because an `executing` claim never has `reserved=1`. | Add an attempt/epoch id; retake only if `reserved=0`; require `meta.changes === 1` on the `executing → sending` update; reconcile reservations by action id; make the retake invalidate the old attempt. |
| **M-14** | Medium | No reconciliation/outbox for `sending`/`unknown` claims | `src/services/action.service.ts:648-655, 743-759, 779-785`; `src/index.ts:21-44` | `sending` and `unknown` are never retried and there is no reconciliation job or alert. A Worker crash after the send leaves the action stuck and the reservation held forever. | Probe: a `sending` claim returns `409 EXECUTION_UNKNOWN` and the action remains `approved` indefinitely. | Add a scheduled reconciliation pass that queries the chain by idempotency key/tx hash, resolves `sending`/`unknown`, and alerts on unresolved claims. |
| **M-15** | Medium | Tenant-writable installation `config` can raise `maxRefundNear` and disable `nearPayments` | `src/routes/installations.ts:27-30, 130-165`; `src/routes/sessions.ts:324-343`; `src/services/action.service.ts:553-579` | A `write`-scoped tenant key can PATCH its own installation and raise the per-installation refund cap (or toggle `features.nearPayments`). The operator-set tenant spending limit still binds, but the installation cap is not an independent control. | Probe: `PATCH /api/v1/installations/inst_acme_cs_001 {"config":{"maxRefundNear":"1000"}}` → `200`; the next 30 NEAR refund was proposed. | Make `maxRefundNear`/`features` operator-only, or allow only decreases; validate the config schema; audit changes. |
| **M-16** | Medium | CI has no dependency/SAST/secret-scan gate; the release rule is not enforced | `.github/workflows/ci.yml:30-49`; `package.json:21`; `docs/THREAT-MODEL.md:174` | CI runs typecheck/test/lint, a narrow `.dev.vars` tracked check, and a Wrangler dry run. It does not run `npm audit --audit-level=high`, CodeQL/Semgrep, or a full-history secret scan. Actions are pinned to tags, not SHAs. | `.github/workflows/ci.yml` contents; `npm audit` currently passes but is not run in CI. | Add `npm run audit`, SAST, and gitleaks/trufflehog to CI; pin Actions to SHAs; require these checks in branch protection; add a deploy gate. |
| **M-17** | Medium | `actions:propose` is defined but never enforced | `src/routes/keys.ts:35-45`; `src/routes/sessions.ts:29, 183-190` | New keys can be granted `actions:propose`, but the proposal path requires `sessions`. A chat-only `sessions` key can propose payments, and an `actions:propose`-only key cannot propose. This weakens the least-privilege split. | `grep` finds `actions:propose` only in the key scope enum; the message route uses `requireScope('sessions')`. | Require `sessions` **and** `actions:propose` (or `actions`) for money proposals; keep chat-only keys unable to propose. |
| **M-18** | Medium | Dual-control policy gaps; separation of duties is credential-level only | `src/routes/sessions.ts:345-355`; `src/services/action.service.ts:88-90, 372-375`; `src/routes/keys.ts:35-45` | Risk is derived from message text: `near_transfer` is always `medium` (one approval) regardless of amount, and `refund`/`payment` thresholds are content-derived. There is no amount threshold, step-up auth, or human identity; an `admin` key can mint a second approver key and satisfy “two distinct approvers.” | `near_transfer` risk stays `medium`; `requiredApprovalsForRisk` returns 1 for `medium`; a `*`/admin key can mint `actions:approve` keys. | Enforce dual control by amount/risk independent of message wording; require a human/dashboard credential and step-up for high/critical; consider preventing `admin` from minting approver credentials without a second operator. |
| **M-19** | Medium | Cron/session-close can expire an in-flight `approved` action while money moves | `src/services/action.service.ts:451-477, 787-830, 860-872`; `src/routes/sessions.ts:449-454` | `expireAllActions` and session close update `pending`/`approved` rows without excluding claims in `sending`/`sent`. If an action's expiry passes during a send, the cron marks it `expired`; the post-send update `WHERE status='approved'` then affects 0 rows, and the action is recorded `expired` with no `execution_result`. | Probe: a `sending` claim with a past `expires_at` became `expired` after the scheduled handler; retry returned `409 Cannot execute action in "expired" status`; the claim stayed `sending`/`sent`. | Exclude actions with live claims from expiry; make the post-send update check `meta.changes`; write an outbox/reconciliation record before/after the send. |
| **M-20** | Medium | Execution failures are not audited | `src/routes/actions.ts:142-166`; `src/services/action.service.ts:714-759, 772-829` | `action.executed` is logged only after `executeAction` returns. `EXECUTION_FAILED` and `EXECUTION_UNKNOWN` are logged to the console and stored in `action_claims.last_error`, but no `audit_log` row or alert is written. | `actions.ts` audit call is after the service call; the error paths throw before it. | Audit `action.execution_failed` and `action.execution_unknown` with correlation id, claim state, and tx hash; alert on `unknown`. |
| **L-10** | Low | Local `.dev.vars` contains a live-looking master key and salt | `.dev.vars:4, 9`; `.gitignore:11` | The file is gitignored and the values are high-entropy (not the known dev constants), so it is not a committed public credential. If the workspace is shared or the file was ever copied into a deployment, it is a live operator key/salt. | `.dev.vars` present on disk; `.gitignore` excludes it; CI checks only whether it is tracked. | Keep `.dev.vars` out of archives/screenshots; rotate the master key and salt if it was ever shared; use `wrangler secret put` for deployments. |
| **L-11** | Low | `API_KEY_SALT` has no minimum length/entropy check | `src/config.ts:39-47` | A one-character salt is accepted outside local development. Keys are 256-bit random, so the practical risk is limited, but the salt guard is weaker than the threat model implies. | `assertConfig` checks presence and the dev value, not length/entropy. | Require a minimum length (e.g. 32 bytes) and reject low-entropy values in production. |
| **L-12** | Low | Smoke test still proposes and approves with one key | `scripts/smoke-test.mjs:185-202` | The script uses the same `API_KEY` for propose and approve, so it now fails the proposer≠approver rule. This is a functional regression, not a security defect, but it can mask real failures. | Approve call uses the default `API_KEY`. | Add `APPROVER_API_KEY` (and an executor key) to the smoke test; assert the self-approval rejection separately. |
| **L-13** | Low | Threat-model/README drift | `docs/THREAT-MODEL.md:84, 100, 119-120, 128-132, 156-162` | Several claims are stale: “production refuses to start without salt” is now per-request; “audit records IP” is now true; “double-spend CAS Done” is now the claim; “race two executions Partial” is fixed; “most routes do not declare a scope” is fixed; “POST /tenants callable by any tenant” is operator-only; “no global body size limit” is fixed; “no automated secret scanning” is still true. | Compare the threat-model table with the current code. | Update the threat model and README; add a doc-accuracy check to the review checklist. |
| **L-14** | Low | `requestIp` trusts `x-forwarded-for` when `cf-connecting-ip` is absent | `src/utils/audit.ts:23-31` | In production Cloudflare sets `cf-connecting-ip`, which takes precedence. Behind another proxy, an attacker can spoof `x-forwarded-for` and weaken IP rate limits/audit IPs. | `requestIp` falls back to `x-forwarded-for`. | Only trust `cf-connecting-ip` in production; configure trusted proxies explicitly. |
| **L-15** | Low | Money utilities still accept JavaScript numbers | `src/utils/money.ts:17-28` | Route schemas now reject numbers, but `parseNearToYocto`/`toYoctoString` still stringify numbers, so a future caller can reintroduce float precision loss. | The utility signature is `string | number`. | Accept decimal strings only in the utility; keep the number path out of the public API. |
| **L-16** | Low | Approval does not check installation/session status; legacy rows bypass SoD | `src/services/action.service.ts:348-410`; `src/db/migrations/0003_security.sql:45-58` | A removed/paused installation's pending action can still be approved (execution refuses). Rows migrated with `proposed_by = NULL` skip the proposer≠approver check. | `approveAction` checks only action status/expiry/SoD; migration sets `proposed_by` to `NULL`. | Reject approval when the session/installation is inactive; treat `NULL` proposer as “unknown” and require an operator override. |
| **L-17** | Low | Unset `CORS_ORIGINS` in development denies all browser origins | `src/middleware/cors.ts:13-20` | This is fail-closed (not a data-exposure bug), but it breaks local browser frontends unless the variable is set. | `origins` becomes `[]`; Hono's array origin matches nothing. | Document the local setting; keep the production allowlist requirement. |

---

## 3. Original High findings — FIXED / NOT FIXED

### H-01 — Concurrent execution double-pays one approved action — **FIXED**

The executor now inserts a row into `action_claims` (primary key = action id) with `ON CONFLICT (action_id) DO NOTHING` before any money logic (`src/services/action.service.ts:581-656`). Only the request that inserts the row proceeds. The action is not marked `executed` until the transfer has been recorded as `sent`.

Evidence:

- Integration test `executes exactly once under concurrent requests` fires three parallel `POST /execute` calls, accepts only `200`/`409`, asserts one `action_claims` row and exactly one 1 NEAR reservation (`src/app.integration.test.ts:517-554`).
- Probe: sequential execute returns `200`, a repeated execute returns `200` (idempotent), and the reservation is exactly one 5 NEAR action (`PASS one reservation`).
- The original two-concurrent-request reproduction no longer double-counts.

Residual: the crash/retake race described in **M-13** is a different, much narrower defect; it is not the original concurrent-request double-spend.

### H-02 — A post-transfer DB failure is treated as a failed transfer — **FIXED**

The execution state machine now persists `executing` before the reservation, `sending` before the transfer, `sent` with the tx hash after the transfer, and only then marks the action `executed` (`src/services/action.service.ts:658-830`). A definitive pre-send failure releases the reservation and marks the claim `failed`; an ambiguous failure marks the claim `unknown` and **never** releases the reservation or marks the action `failed` (`:714-759`). A persistence failure after a send leaves the claim in `sending` and returns `EXECUTION_UNKNOWN` (`:772-785`).

Evidence:

- Integration test `keeps the reservation and marks the claim unknown`: a fake `transfer` throws a non-definitive error; the claim is `unknown`, the action stays `approved`, and the 2 NEAR reservation is kept (`src/app.integration.test.ts:557-624`).
- The old catch-all `releaseSpend` + `failed` path is gone.

Residual: no reconciliation/outbox for `sending`/`unknown` (**M-14**), and the cron can expire an in-flight action (**M-19**).

### H-03 — Tenant can raise its own spending limit — **FIXED**

The tenant-facing PATCH schema now accepts only `name` and is `.strict()` (`src/routes/tenants.ts:25-29`). `spending_limit_near` and `near_account_id` are operator-only via `PATCH /api/operator/v1/tenants/:id` (`src/routes/operator.ts:65-144`).

Evidence (probe against the built Worker):

```
H-03 raise limit  => 400 {"code":"VALIDATION_ERROR","details":[{"message":"Unrecognized key: \"spending_limit_near\""}]}
H-03 change near acct => 400 {"code":"VALIDATION_ERROR","details":[{"message":"Unrecognized key: \"near_account_id\""}]}
PASS  H-03 limit unchanged
PASS  H-03 near acct unchanged
```

Residual: installation `config` is still tenant-writable (**M-15**).

### H-04 — Known demo admin credentials are committed and seeded — **FIXED**

`scripts/seed.sql` no longer inserts any API keys; it documents creating the first key with `npm run key:create` (`scripts/seed.sql:95-104`). The integration suite generates the master key, salt, and every API key at runtime (`src/app.integration.test.ts:21-22, 127-157`). `.dev.vars` is gitignored (`.gitignore:11`) and now contains high-entropy values rather than the published dev constants. No **live** plaintext `tnt_`/`op_` key is committed in `src/` or the docs; only placeholders such as `tnt_test` and `tnt_your_api_key_here` remain.

Evidence:

- `grep` for `tnt_`/`op_` in `*.test.ts` finds only runtime-generated keys and tenant ids.
- `scripts/seed.sql` has no `api_keys` INSERT.
- CI still checks whether `.dev.vars` is tracked (`.github/workflows/ci.yml:39-44`).

Residual: local `.dev.vars` hygiene (**L-10**).

### H-05 — Production secret guards are bypassed by the shipped config — **FIXED**

`assertConfig` now runs on every request (`src/app.ts:37-45`) and fails closed: `ENVIRONMENT` must be explicit, `DB` must exist, `API_KEY_SALT` is required outside `local`/`test`/`development`, the published dev salt and dev master key are rejected unconditionally, and production requires a `MASTER_API_KEY` and an explicit non-wildcard `CORS_ORIGINS` allowlist (`src/config.ts:24-85`). `operatorAuth` also rejects an unset or dev master key unconditionally (`src/middleware/operator.ts:32-41`). `wrangler.toml` now ships `ENVIRONMENT = "production"`.

Evidence (probe against the built Worker):

```
config production + dev master  => 500 "CONFIG_ERROR"
config production + dev salt    => 500 "CONFIG_ERROR"
config production + no salt     => 500 "CONFIG_ERROR"
config production + wildcard CORS => 500 "CONFIG_ERROR"
config development + no salt    => 500 "CONFIG_ERROR"
config empty ENVIRONMENT        => 500 "CONFIG_ERROR"
```

Residual: no salt length/entropy check (**L-11**) and no CI deploy gate (**M-16**).

### H-06 — One credential can propose, approve, and execute — **FIXED (single-credential SoD)**

The old umbrella `actions` scope is split into `actions:read`, `actions:propose`, `actions:approve`, and `actions:execute`, with `actions` kept as a legacy alias (`src/middleware/scopes.ts:19-30`; `src/routes/actions.ts:21-23, 48-50, 63-65, 106-108, 133-135`). The action stores `proposed_by`, and `approveAction` rejects the proposer (`src/services/action.service.ts:372-375`). `required_approvals` is 2 for `high`/`critical` risk, and the SQL increments `approvals` only once per distinct approver (`:88-90, 385-407`).

Evidence:

```
H-06 self-approve with sessions+approve key => 403 {"code":"FORBIDDEN","message":"The proposer cannot approve their own action"}
same approver twice => {"approvals":1,"status":"pending"} required 2
```

The integration suite also proves a different credential can approve and that a high-risk refund needs two distinct approvers (`src/app.integration.test.ts:381-495`).

Residual: `actions:propose` is not enforced (**M-17**), and dual control is still credential-level rather than human-level, with content-derived risk and no step-up (**M-18**).

---

## 4. Residual findings — detail

### M-13 — Stale-claim retake can double-reserve and, under a stalled original, double-send

The retake branch reads the claim, then updates `claimed_at` if it is older than 5 minutes (`src/services/action.service.ts:628-647`). It sets `alreadyReserved = claim.reserved === 1`. In the current state machine, an `executing` claim always has `reserved = 0`: the row is inserted with `reserved = 0`, and the only transition that sets `reserved = 1` also sets `state = 'sending'` in the same UPDATE (`:677-686`). Therefore `alreadyReserved` is effectively dead code and every retake reserves again.

If a Worker crashes after `reserveSpend` succeeds but before the `sending` update, the spend counter is incremented once by the crashed attempt and once by the retake. The crashed attempt never sends, so this is an over-reservation, not a double payment; the tenant's remaining limit is permanently understated. The probe simulated the resulting state (a stale `executing` claim with `reserved=0` after a prior 3 NEAR reservation):

```
stale exec 200 before 8000000000000000000000000 after 11000000000000000000000000 delta 3000000000000000000000000
```

A 3 NEAR action had already reserved 3 NEAR; the retake added another 3 NEAR, leaving 6 NEAR reserved for one 3 NEAR action.

The more serious variant is a double-send: the `executing → sending` update does not check `result.meta.changes` (`:677-686`). If the original attempt is paused for more than 5 minutes between the reservation and that update, a retry can set the claim to `sending`, send, and complete; when the original resumes, its `sending` update affects 0 rows but it still calls `nearService.transfer` (`:704-713`). This requires an artificial >5-minute pause in a millisecond-wide window, so it is not attacker-triggerable in the current build. If the deployment platform can resume a request after such a pause, this becomes a High double-spend and must be fixed before real settlement.

**Fix:** give each claim an attempt/epoch id; only retake when `reserved = 0`; require `meta.changes === 1` on the `executing → sending` update; reconcile the reservation by action id; and make a retake invalidate the old attempt's ability to send.

### M-14 — No reconciliation/outbox for ambiguous sends

`unknown` and `sending` are terminal for automatic retries (`src/services/action.service.ts:648-655`). The scheduled handler only expires actions and prunes rate limits (`src/index.ts:21-44`); it never scans `action_claims`. A send that succeeds but whose `sent`/`executed` write fails leaves the action `approved` and the claim `sending` forever, with the reservation held. The probe confirmed the retry returns `409 EXECUTION_UNKNOWN` and the action remains `approved`.

**Fix:** add a scheduled reconciliation pass that looks up the chain by the stored idempotency key/tx hash, resolves `sending`/`unknown`, and alerts on claims older than a threshold.

### M-15 — Tenant-writable installation money config

`PATCH /api/v1/installations/:id` accepts an arbitrary `config` object with `write` scope (`src/routes/installations.ts:27-30, 130-165`). The execution and proposal paths read `maxRefundNear` and `features.nearPayments` from that config (`src/routes/sessions.ts:324-343`; `src/services/action.service.ts:553-579`). The probe raised the cap from 5 to 50 to 1000 NEAR and then proposed a 30 NEAR refund.

The operator-set tenant `spending_limit_near` still binds, so this is not a way to exceed the tenant limit; it defeats the per-installation cap as an independent control. An invalid `maxRefundNear` string also throws an uncaught `Error` at proposal time (`sessions.ts:339-343`), producing a 500 for that tenant's money messages.

**Fix:** make `maxRefundNear` and `features` operator-only, or allow only decreases; validate the config schema; audit every change.

### M-16 — CI lacks a security gate

CI runs typecheck, tests, lint, a narrow `.dev.vars` tracked check, and a Wrangler dry run (`.github/workflows/ci.yml:30-49`). It does not run `npm audit --audit-level=high` (despite the `audit` script in `package.json:21`), SAST, or a full-history secret scan, and Actions are pinned to tags rather than SHAs. The threat model says a High finding blocks release (`docs/THREAT-MODEL.md:174`), but nothing enforces that in CI.

**Fix:** add `npm run audit`, CodeQL/Semgrep, and gitleaks/trufflehog; pin Actions to SHAs; require the checks in branch protection; add a deploy gate.

### M-17 — `actions:propose` is decorative

`actions:propose` is in the key scope enum (`src/routes/keys.ts:35-45`) but no route requires it. The money-proposal path is the session message route, which requires only `sessions` (`src/routes/sessions.ts:29, 183-190`). A chat-only `sessions` key can therefore propose payments, and an `actions:propose`-only key cannot.

**Fix:** require both `sessions` and `actions:propose` (or the legacy `actions`) for money proposals; keep a chat-only key unable to propose.

### M-18 — Dual control is credential-level, not human-level

The SoD check compares API key ids (`src/services/action.service.ts:372-375`). It stops a single key from proposing and approving, but a tenant `admin` can mint a second `actions:approve` key and approve; there is no human identity, MFA/WebAuthn, step-up, or amount threshold. Risk is content-derived: a `near_transfer` is always `medium` (one approval) regardless of amount, while `refund`/`payment` use text thresholds (`src/routes/sessions.ts:345-355`). A large transfer can therefore be approved by one credential.

The tenant spending limit and installation cap still bound the amount, so this is a policy/defense-in-depth gap, not an auth bypass.

**Fix:** require dual control by amount/risk independent of message wording; require a human/dashboard credential with step-up for high/critical; consider preventing an `admin` key from minting approver credentials without a second operator.

### M-19 — Cron/session-close can expire an in-flight action

`expireAllActions` updates every `pending`/`approved` action whose `expires_at` has passed (`src/services/action.service.ts:860-872`), and session close does the same for its actions (`src/routes/sessions.ts:449-454`). Neither excludes actions with a live claim in `sending`/`sent`. The post-send update `WHERE status='approved'` then affects 0 rows, and the code does not check `meta.changes` (`src/services/action.service.ts:787-805`).

Probe (scheduled handler against a past-expiry action with a `sending` claim):

```
after cron, in-flight action status => expired
in-flight claim state => sending
retry in-flight => 409 {"code":"CONFLICT","message":"Cannot execute action in \"expired\" status"}
after cron, sent action status => expired
finalize sent => 409 {"code":"CONFLICT","message":"Cannot execute action in \"expired\" status"}
after finalize, action status => expired
after finalize, claim state => sent
```

Money may have moved, but the action is recorded `expired` with no `execution_result`, and the claim is stranded. A future-expiry in-flight action is untouched (`approved`), confirming the window is the expiry boundary.

**Fix:** exclude actions with live claims from expiry; check `meta.changes` on the post-send update; write an outbox/reconciliation record before/after the send.

### M-20 — Execution failures are not audited

The execute route logs `action.executed` only after `executeAction` returns (`src/routes/actions.ts:142-166`). The service logs failures to the console and stores `last_error` on the claim, but no `audit_log` row is written for `EXECUTION_FAILED` or `EXECUTION_UNKNOWN`. For a money path, that is a repudiation/observability gap.

**Fix:** audit both failure modes with the correlation id, claim state, and tx hash; alert on `unknown`.

---

## 5. Threat model vs. code — remaining drift

| Threat-model claim | Current code | Verdict |
|---|---|---|
| “Production refuses to start without salt” (`THREAT-MODEL.md:84`) | `assertConfig` runs per request and fails closed; production also requires a master key and CORS allowlist (`config.ts:24-85`). | **Implemented; wording stale** (L-13). |
| “Audit log records actor, action, resource, IP, time” (`:100`) | Callers now pass `requestIp(c)`; auth failures/denials/rate limits are logged (`auth.ts`, `scopes.ts`, `rate-limit.ts`). | **Implemented** (L-14 is the proxy caveat). |
| “Double-spend the limit — compare-and-swap — Done” (`:131`) | CAS still protects the limit; the claim protects one action. | **Implemented**, with residual M-13. |
| “Race two executions — Partial, add a DB-level claim in Phase 2” (`:132`) | The claim is now in Phase 0 (`action_claims`). | **Stale; fixed** (L-13). |
| “Create a tenant as a normal tenant — Open” (`:129`) | `POST /api/v1/tenants` does not exist; the operator route is separate. | **Fixed; doc stale** (L-13). |
| “Most routes do not declare a scope” (`:128`) | All routers declare scopes (`agents/installations/tenants` read/write, `sessions`, split `actions:*`, `near` read, `keys` admin). | **Fixed; doc stale** (L-13). |
| “No global request body size limit” (`:120`) | Hono `bodyLimit` measures the actual stream (`body-limit.ts:13-26`). | **Fixed; doc stale** (L-13). |
| “No automated secret scanning in CI” (`:162`) | Still true: only a `.dev.vars` tracked check. | **Open** (M-16). |
| “Critical or High finding blocks release” (`:174`) | No CI gate enforces it. | **Not implemented** (M-16). |

---

## 6. What is done well

1. **The execution mutex is real.** `action_claims` is the primary key; the insert is atomic; concurrent tests prove one reservation.
2. **The post-send path is conservative.** `sending`/`sent` are persisted before/after the transfer; ambiguous failures keep the reservation and never mark the action failed.
3. **Tenant isolation remains consistent.** Cross-tenant action/session reads and approvals return 404; the probe confirmed both.
4. **H-03 is cleanly fixed.** The tenant schema is strict and only accepts `name`; money controls are operator-only with before/after audit details.
5. **H-05 is fail-closed.** The config guard runs on every request; the published dev master key and salt are rejected unconditionally; production requires an explicit CORS allowlist.
6. **H-06 blocks the single-credential path.** A key with `sessions` + `actions:approve` cannot approve its own proposal; high/critical risk needs two distinct approvers.
7. **Credentials are no longer committed.** Seed has no keys; tests generate runtime keys; `.dev.vars` is gitignored and uses high-entropy values.
8. **The test suite is materially stronger.** 83 tests cover H-01/H-02/H-03/H-06, expiry, idempotency, installation caps, body limits, pagination, and the operator boundary.

---

## 7. Release gate and conclusion

**Verdict: PASS WITH FIXES.**

- **Original High findings:** H-01, H-02, H-03, H-04, H-05, H-06 — all **FIXED**.
- **New Critical/High findings:** **none** that is clearly exploitable in the current build.
- **Blocking for Phase 0 demo:** none.
- **Required before Phase 2 / real NEAR settlement:** M-13 (claim epoch + `meta.changes` check + reconciliation), M-14 (outbox/reconciliation), M-19 (do not expire in-flight actions), M-15 (operator-only installation caps), M-17 (enforce `actions:propose`), M-18 (amount-based dual control/step-up), M-20 (audit failures). M-16 should be closed before any production deploy.

The Medium findings are concentrated in crash recovery and policy hardening, not in the normal request path. The normal path — authenticated tenant, distinct approver, atomic claim, one reservation, one send — is sound and tested.

---

*This re-review supersedes the verdict in `docs/SECURITY-REVIEW-PHASE0.md` for the six original High findings. The original report remains the historical record of the pre-fix state.*
