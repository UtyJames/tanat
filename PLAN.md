# Tanat — Plan From Start to Finish

This document is the full build and launch plan for Tanat. It is written in plain language. It separates **what is verified**, **what you must decide**, and **what we will build**. Nothing in the build depends on a guess.

---

## How to read this plan

- **Part 1** states what is true today. Every claim comes from the official NEAR documentation or from the code in this repository.
- **Part 2** lists the decisions you must make before we write production code. I will not assume these.
- **Part 3** is the build, in six phases. Each phase has a goal, the work, the definition of done, and two separate security tests.
- **Part 4** defines the security rule that every feature must pass.
- **Part 5** is the checklist for "ready for the real world".
- **Part 6** covers time, team, and money.
- **Part 7** covers risks.
- **Part 8** is the first ten working days.

---

## Plain-English glossary

| Word | What it means here |
|---|---|
| Tenant | One business customer of Tanat. |
| Agent | The AI helper that talks to people and does tasks. |
| Action | Something the agent wants to do that changes the real world, such as sending money. |
| Approval | A human says yes before an action runs. |
| TEE | A locked box inside a computer chip. Data inside cannot be seen by the machine's owner. |
| Intent | An instruction such as "swap this coin for that coin". A network carries it out. |
| Queue | A waiting line for work. It survives crashes. |
| Idempotency | Pressing the button twice has the same effect as pressing it once. |
| D1 | Cloudflare's database. |
| Worker | A small program that runs on Cloudflare's network. |
| Custody | Who physically holds the money. |
| Reconciliation | Checking that every payment we recorded matches a real payment on the chain. |

---

# Part 1 — What is true today

## 1.1 What Tanat is

Tanat is a platform that lets a business add AI agents to its own product. The agent can talk to customers, do tasks, and move money. Every risky action needs human approval. Each business is kept separate from every other business. All activity is logged and metered.

## 1.2 What the code actually does today

The repository is a working prototype, not a production system. These facts come from reading the files:

- **The AI is fake.** `src/routes/sessions.ts` uses a keyword check and canned replies. There is no language model call. The file says so in a comment.
- **The money is fake.** `src/services/near.service.ts` creates a random transaction hash and returns a fixed balance. The file says it is a mock and lists the real work as TODOs.
- **The execute step is broken.** `src/services/action.service.ts` reads columns named `action_type`, `parameters`, and `installation_id`. The database schema in `src/db/migrations/0001_init.sql` uses `type` and `params`, and has no `installation_id`. As a result, `JSON.parse(action.parameters)` fails at runtime.
- **Spending limits do not work.** `scripts/seed.sql` stores limits in yoctoNEAR (a tiny unit). The code compares them as whole NEAR. The check can never trigger.
- **The seed keys do not log in.** The hashes in `scripts/seed.sql` are placeholders. The login code hashes `salt:key`, so no seeded key matches.
- **The login header is inconsistent.** The README documents `X-API-Key`. `src/middleware/auth.ts` reads `Authorization: Bearer`.
- **Rate limiting is not global.** `src/middleware/rate-limit.ts` keeps counters in memory. Cloudflare runs many copies of the program, so each copy has its own counter.
- **There are no tests.** `vitest` is installed, but no test files exist.

These are not opinions. They are the current state, and Phase 0 fixes them.

## 1.3 What NEAR gives us today

All of the following is verified from the official NEAR documentation (November 2026).

### NEAR AI Cloud — the AI brain

- It provides private AI inference through an **OpenAI-compatible API** at `https://cloud-api.near.ai/v1`. Any tool that speaks the OpenAI format works.
- Models run inside **TEEs** (hardware-locked boxes). The cloud provider, the model provider, and NEAR cannot read the prompts or the answers.
- It supports **tool calling, structured outputs, reasoning, streaming, embeddings, reranking, image generation, audio transcription, and web search**.
- It includes a **privacy filter** that can find and redact personal data before a request leaves our system.
- It provides **cryptographic proof** (attestation) that a request ran in a genuine TEE. The JavaScript SDK `@nearai/inference-sdk` can verify this. The SDK needs Node 24.22.1 or later, so on Cloudflare Workers we call the REST API directly.
- Accounts are created at `cloud.near.ai`. You buy credits and generate API keys. Each organization and workspace can have its own keys, spend limits, and usage reports.
- **Staking for Inference** lets a customer stake NEAR and pay for inference with the staking rewards. The principal stays theirs and can be withdrawn.

### NEAR Intents — the money rail

- NEAR Intents moves value across chains through the **1Click Swap API** at `https://1click.chaindefuser.com/v0`.
- It supports many chains and many wallet signing standards, including NEAR, EVM, Solana, Bitcoin, TON, and Stellar.
- It has a **quote → deposit → settle → status** flow. Quotes can be previewed with `dry: true`.
- It supports **confidential swaps** and **signed intent execution** (approve off-chain instead of depositing on-chain).
- Fees are about 20 basis points with an API key, or about 1 basis point on stablecoin and same-asset routes. Requests without a key pay an extra 25 basis points.
- **There is no testnet.** The documentation says to use small amounts for tests.
- The verifier contract has a **simulate** function, so intents can be tested without changing state.
- NEAR Intents publishes **risk and compliance** material and a **SHIELD** security program.

### What was removed

- The old **NEAR AI Agent Framework and Developer Hub** were deprecated and shut down on 31 October 2025. We must not build on them.
- The current secure agent framework from NEAR is **IronClaw**. It is written in Rust. It runs tools in a WebAssembly sandbox, protects secrets, defends against prompt injection, supports Slack/Telegram/web channels, and keeps an audit log. It is open source under MIT or Apache 2.0. We can borrow its security patterns, but Tanat needs its own multi-tenant control plane.

### Distribution option

- NEAR runs an **agent marketplace** at `market.near.ai`. It offers a backend SDK, a React panel, and an embeddable widget. Jobs are paid in USDC through escrow. This is a possible channel for later, not a dependency for launch.

---

# Part 2 — Decisions you must make before we build

I will not assume any of these. Each one changes the architecture, the legal work, or the cost.

**Confirmed so far:**
- **Decision 1 — Custody:** The tenants hold the funds. Tanat is non-custodial and never holds customer money.
- **Decision 1b — Signing key:** The tenant gives Tanat a scoped key with a hard cap. The key can only spend up to a fixed amount and only to allowed destinations.
- **Decision 2 — Payout reach:** All chains that NEAR Intents supports.
- **Decision 3 — AI models:** All models on NEAR AI Cloud, with GLM 5.3 as the default for now.
- **Decision 5 — Countries:** Global, with sanctions screening on every payment.
- **Decision 6 — Pricing:** A monthly subscription.
- **Decision 7 — Build order and runtime:** Backend first, then frontend. The API stays on Cloudflare Workers and deploys directly through Wrangler. Long money jobs move to Cloudflare Queues and Durable Objects in Phase 2.
- **Decision 8 — Frontend:** Next.js (App Router) replaces the current Vite/React app. It is deployed on Cloudflare and talks to the API with `Authorization: Bearer`.
- **Decision 9 — Security reviewer:** Every feature gets an independent security-agent review in addition to the builder's tests. A Critical or High finding blocks release. An external human audit is still required before real money moves.

| # | Decision | Why it matters | Recommended default (only if you agree) |
|---|---|---|---|
| 1 | **Who holds the money?** Tenant's own wallet, Tanat, or a smart-contract escrow? | Custody decides whether Tanat needs a money-transmitter licence. | **Confirmed: the tenants hold the funds. Tanat is non-custodial.** |
| 1b | **Who holds the signing key?** The tenant signs every payment, Tanat holds a scoped key with a hard cap, or a smart contract enforces the rules? | A scoped key keeps the flow smooth while the funds stay with the tenant. A full key would make Tanat custodial in practice. | **Confirmed: a scoped key with a hard cap and an allowlist.** |
| 2 | **Where can money go?** NEAR only, or any chain through Intents? | Cross-chain adds reach but also adds risk and compliance work. | **Confirmed: all chains that NEAR Intents supports.** |
| 3 | **Which AI privacy tier?** TEE models only, or also third-party "incognito" models? | TEE gives proof. Third-party models may be cheaper or stronger but run outside a TEE. | **Confirmed: all NEAR AI Cloud models, with GLM 5.3 as the default. Each model is labelled by privacy tier.** |
| 4 | **Who is the customer?** Small businesses that self-serve, or large businesses sold by a team? | This decides onboarding, support, pricing, and compliance. | Start with small and mid-size businesses that self-serve. |
| 5 | **Which countries?** | Money movement and data rules differ by country. | **Confirmed: global, with sanctions screening on every payment.** |
| 6 | **How do we charge?** Platform fee, inference markup, transaction fee, or a mix? | This decides metering and billing. | **Confirmed: a monthly subscription.** |
| 7 | **Where does the backend run?** Stay on Cloudflare Workers, or move long jobs to containers? | Workers are cheap and fast but have time limits. Money jobs need queues and retries. | **Confirmed: Workers for the API, deployed with Wrangler. Add Cloudflare Queues and Durable Objects for money jobs.** |
| 8 | **Do we use IronClaw as the agent runtime?** | IronClaw is secure and open source, but it is built for one user, not many tenants. | Build our own loop on Workers and copy IronClaw's sandbox and secret-handling ideas. |
| 9 | **How long do we keep data?** Messages, personal data, audit logs. | This decides storage, deletion, and privacy promises. | Messages 90 days, audit logs 2 years, personal data deleted on request. |
| 10 | **Who builds and who audits?** Team size, budget for credits, gas, and audits. | "Real-world ready" needs an independent security reviewer. | **Confirmed for Phase 0: an independent security agent reviews every feature. Before real money: an external human audit.** |

### What the confirmed decisions change

- **All chains:** The product will support every chain that NEAR Intents lists. Each chain is enabled only after it passes the test gate. This keeps the promise without shipping untested routes.
- **All models:** The model catalog stays open, with GLM 5.3 as the default. Each model is labelled by privacy tier. Sensitive workloads default to TEE models. A non-TEE model needs a recorded consent flag.
- **Global:** Sanctions screening is mandatory for every payment. Some countries will be blocked. Legal review is required before any real payment.
- **Monthly subscription:** Metering is for fair-use limits and cost control, not per-token billing. Each plan has an included usage amount and a hard cap.

**Do not start Phase 2 until the scoped-key design passes the Phase 0 security review and a lawyer has reviewed the global sanctions plan.**

---

# Part 3 — The build, phase by phase

## Phase 0 — Make the foundation honest
**Time:** 1–2 weeks

**Goal (plain):** Make the existing demo actually work from start to finish, and stop building on broken parts.

**Status on 8 November 2026:**
- Money rule is implemented in `src/utils/money.ts` and enforced at the database boundary.
- Actions use the real `type` and `params` columns and follow pending → approved → executed.
- Seed data uses real generated keys; only hashes are stored.
- Authentication uses `Authorization: Bearer` only.
- Rate limiting uses a shared D1 table, not process memory.
- Three test layers exist: unit tests, HTTP integration tests against real SQL, and a live smoke script.
- CI runs typecheck, tests, lint, a secret check, and a Wrangler dry run.
- Threat model is written in `docs/THREAT-MODEL.md`.
- Remaining: Cloudflare login and a real D1 database ID, then the first deploy.

**Work:**
1. Fix the column mismatch in `src/services/action.service.ts`. Use the real schema columns (`type`, `params`). Either add `installation_id` to the schema or remove it from the service. Document the choice.
2. Pick one money unit and use it everywhere. Recommended: store the smallest unit (yoctoNEAR) in the database and convert only at the edges. Write the rule in the code.
3. Replace the placeholder seed keys with real generated keys. Store only the hash. Never commit a plaintext key.
4. Make login use one header only. Recommended: `Authorization: Bearer`. Update the README.
5. Replace the in-memory rate limiter with a Durable Object or KV counter, or clearly mark the current one as development-only.
6. Add three test layers: unit tests, integration tests, and one smoke test that runs the whole loop: create session → send message → propose action → approve → execute.
7. Add CI that runs typecheck, lint, tests, a secret scan, and a dependency scan on every change.
8. Create three environments: local, staging, and production. Each gets its own database, keys, and secrets.
9. Write a threat model and a data-flow diagram. List every place data enters, leaves, and is stored.

**What "done" looks like:**
- The full loop runs with the mock AI and mock money.
- All tests pass.
- No secret is in the repository.
- The threat model is reviewed and signed off.

**Security tests (two rounds):**
- **Round 1, by the builder:** negative tests for every endpoint. Bad key, wrong tenant, expired action, double execute, oversized input, missing fields.
- **Round 2, by an independent reviewer:** try to read another tenant's data, replay an old request, reuse a revoked key, and force an error that leaks internal details.

**Gate to move on:** Both rounds pass. No open Critical or High issue.

---

## Phase 1 — The real AI brain
**Time:** 2–3 weeks

**Goal (plain):** Replace the fake AI with a real, private, verifiable model that can use tools.

**Work:**
1. Add one model adapter for NEAR AI Cloud. Call `https://cloud-api.near.ai/v1/chat/completions` from the Worker with `fetch`. Do not use the Node-only SDK on Workers.
2. Store model settings per agent and per installation: model name, temperature, maximum tokens, and the list of allowed tools.
3. Build the tool loop: the model asks for a tool, our code runs it, the result goes back to the model, and the model continues. Cap the number of steps to stop runaway loops.
4. Stream answers to the front end.
5. Store conversation history. Summarise long threads so the model stays within its context limit.
6. Version every prompt. Allow a new version to be tested on a small share of traffic before a full switch.
7. Redact personal data before sending text to a model. Use the NEAR AI privacy filter, or redact on our side. Log only the redacted form.
8. Offer proof to customers who need it. For them, verify the TEE attestation and the response signature with the NEAR AI SDK.
9. Build an evaluation set for each agent pack. It must cover correct answers, safe refusals, correct tool use, and cost per conversation.

**What "done" looks like:**
- The agent answers real questions and uses tools.
- No unredacted personal data leaves our system.
- The evaluation set passes at an agreed score.
- Cost per conversation stays under the agreed budget.

**Security tests (two rounds):**
- **Round 1, by the builder:** prompt injection, jailbreak attempts, tool abuse, data exfiltration through tools, personal-data leakage, and cost runaway.
- **Round 2, by an independent reviewer:** a red-team pass with an adversarial question set, plus a check that the attestation path cannot be faked.

**Gate to move on:** Both rounds pass. The injection suite passes. Personal data is redacted in every path.

---

## Phase 2 — The real money rail
**Time:** 3–4 weeks

**Goal (plain):** Let an approved agent move real money safely, with proof that it happened.

**Work:**
1. Implement the custody model you chose in Part 2.
2. Integrate two paths: a direct NEAR transfer for NEAR-native payments, and NEAR Intents 1Click for cross-chain payouts.
3. Test in this order: `dry: true` quotes, then simulated intents on the verifier contract, then very small real amounts. There is no testnet, so small real amounts are the final test.
4. Keep signing keys in Cloudflare Secrets Store or a key service. Use scoped keys with the smallest permissions possible. Rotate them on a schedule and after any suspicion.
5. Move execution out of the web request and into a queue. Flow: propose → approve → enqueue → worker executes → status update. Add retries, a dead-letter queue, and idempotency keys.
6. Reserve the spend before the send. Commit the reservation if the send succeeds; release it if the send fails. This stops two payments from passing the same limit at the same time.
7. Reconcile every day. Match every recorded payment to a real chain transaction. Report any mismatch immediately.
8. Screen recipients for sanctions and risk, using NEAR Intents compliance tools and our own checks.

**What "done" looks like:**
- Small real payments settle.
- Spending limits hold when two payments happen at the same moment.
- Daily reconciliation is clean.
- Every payment has a chain transaction and an audit record.

**Security tests (two rounds):**
- **Round 1, by the builder:** replay, double-spend, limit bypass, race conditions, forged approval, stolen-key simulation, address poisoning, and payout to the wrong chain.
- **Round 2, by an independent reviewer:** a security audit of the money code, simulation on the verifier contract, and live small-value tests.

**Gate to move on:** Both rounds pass. No Critical or High finding is open. Reconciliation matches. The audit report is filed.

---

## Phase 3 — The platform any business can use
**Time:** 3–4 weeks

**Goal (plain):** A business can sign up and run an agent without us touching the database by hand.

**Work:**
1. Add business signup and automatic tenant setup.
2. Add a separate admin plane for Tanat staff, kept apart from the tenant plane.
3. Add dashboard login with email or OAuth, roles, and permissions. Build it in Next.js (App Router).
4. Add key management: create, rotate, revoke, and scope keys.
5. Build the agent pack catalog. A pack contains a prompt, a tool list, policies, and an evaluation set.
6. Build the connector registry. Start with three connectors that real businesses need, such as a helpdesk, email, and a payment system.
7. Add webhooks, a JavaScript SDK, and an embeddable chat widget.
8. Add metering, quotas, and billing. Connect usage to invoices.

**What "done" looks like:**
- A new business can sign up and run an agent in under one hour.
- The isolation tests pass.
- Billing matches recorded usage.

**Security tests (two rounds):**
- **Round 1, by the builder:** an authorization matrix, cross-tenant isolation, privilege escalation, key rotation, webhook signature checks, and connector abuse such as server-side request forgery.
- **Round 2, by an independent reviewer:** a penetration test of the control plane, plus fraud and abuse tests.

**Gate to move on:** Both rounds pass. Isolation is proven with tests. Billing is accurate.

---

## Phase 4 — Ready for the real world
**Time:** 3–4 weeks

**Goal (plain):** It can run in production without the team watching it every minute.

**Work:**
1. Add logs, traces, metrics, alerts, and a per-tenant dashboard.
2. Add backups and run a restore drill. Define how long data is kept.
3. Make the audit log append-only.
4. Complete the legal and privacy work: privacy policy, data processing agreement, deletion process, sanctions screening, and the money rules for your chosen countries.
5. Run load and performance tests. Define service targets such as uptime and response time.
6. Write an incident response runbook and set up on-call rotation.
7. Write the API documentation, the security guide, and the integration guide.
8. Run a full external penetration test and open a bug bounty.

**What "done" looks like:**
- The readiness checklist in Part 5 is fully green.
- The restore drill succeeds.
- The incident simulation succeeds.
- All Critical and High penetration findings are closed.

**Security tests (two rounds):**
- **Round 1, by the builder:** a full internal security review of every feature.
- **Round 2, by an independent reviewer:** an external penetration test, a disaster-recovery drill, and an incident simulation.

**Gate to move on:** Both rounds pass. The launch checklist is signed.

---

## Phase 5 — Launch and operate
**Time:** ongoing

**Work:**
1. Run a pilot with three to five businesses. Fix what breaks before opening the doors.
2. Roll out in stages: pilot, then invited customers, then public.
3. Provide support and on-call cover.
4. Re-run the evaluation set on every model or prompt change.
5. Scan dependencies and secrets continuously. Run a penetration test every quarter.
6. Watch cost per conversation and cost per payment. Adjust pricing if needed.

**What "done" looks like:**
- Pilot customers renew.
- Uptime meets the target.
- No unresolved Critical or High security issue.
- Costs stay inside the plan.

---

# Part 4 — The security standard: the Double-Check Rule

Every feature must pass **two separate security tests** before it can ship.

**Test 1 — The builder's test.**
The person who builds the feature writes and runs security tests in the same change. The tests must include:
- Unauthorized access.
- Access by the wrong tenant.
- Invalid or malicious input.
- Replay of an old request.
- Resource exhaustion, such as a huge input or a loop.
- Failure handling, such as a timeout or a partial write.

**Test 2 — The independent test.**
A person or team that did not build the feature tries to break it. They use manual red-team work and automated tools. A feature cannot ship on the builder's tests alone.

**Program-level rules:**
- A threat model is written for each phase.
- CI runs static analysis, dynamic analysis, dependency scanning, and secret scanning on every change.
- An external penetration test runs before launch and every quarter after.
- Critical and High findings block release. Medium findings get a fix date.
- Money code needs two reviewers, not one.
- Key rotation and break-glass procedures are tested on a schedule.
- A bug bounty opens after launch.

**Plain rule:** if a feature touches money, personal data, or another tenant's data, it needs two locks, and two different people must check the locks.

---

# Part 5 — Real-world readiness checklist

The product is ready for real customers only when every line below is true.

**Product and data**
- [ ] A new business can sign up and run an agent without manual work.
- [ ] Tenant data is isolated, and a test proves it.
- [ ] Every risky action needs approval, and a test proves it.
- [ ] Every action has an audit record.
- [ ] Personal data is redacted before it reaches a model.
- [ ] Data retention and deletion work as promised.

**Money**
- [ ] Spending limits hold under concurrent payments.
- [ ] Every payment is idempotent.
- [ ] Every payment reconciles to a chain transaction.
- [ ] Recipients are screened for sanctions and risk.
- [ ] Keys are scoped, rotated, and stored outside the database.
- [ ] The custody model matches the legal advice for your countries.

**Security**
- [ ] Two security tests passed for every feature.
- [ ] The external penetration test is clean for Critical and High findings.
- [ ] Secret scanning and dependency scanning run on every change.
- [ ] The incident response runbook exists and was tested.
- [ ] A bug bounty is open.

**Reliability**
- [ ] Backups run, and a restore was tested.
- [ ] Alerts fire for errors, slow responses, and failed payments.
- [ ] The service meets its uptime and response targets under load.
- [ ] On-call rotation is staffed.

**Business**
- [ ] Pricing is set and billing matches usage.
- [ ] Terms of service and privacy policy are published.
- [ ] Support channels are open.
- [ ] The team can answer a security questionnaire from a customer.

---

# Part 6 — Time, team, and money

**Time to launch, from the current prototype:**
- With two to three engineers, one security reviewer, and one product lead: about four to five months.
- With one person: about eight to ten months.

**Team needed:**
- Two backend engineers.
- One frontend engineer for the dashboard and widget.
- One security reviewer, independent from the builders.
- One product lead who owns the customer and the money rules.
- Legal advice for the money and privacy parts.

**Money to plan for (get quotes; these are the big lines, not estimates):**
- NEAR AI Cloud inference credits.
- Chain gas for real payments.
- Cloudflare usage.
- An external security audit and penetration test. This is usually the largest one-time cost.
- Legal review for money movement and privacy.
- Support and on-call cover after launch.

**Cost control:**
- Set a hard monthly cap on inference.
- Set a hard per-tenant spend limit.
- Alert when a tenant reaches 80 percent of its limit.
- Review cost per conversation every week.

---

# Part 7 — Risks and what we do about them

| Risk | Why it matters | What we do |
|---|---|---|
| No NEAR Intents testnet | A bug can lose real money. | Test with dry quotes and simulation first. Then use very small real amounts. Set hard limits. |
| Database limits | D1 has limits on size and concurrent writes. | Measure early. Move heavy tables to Postgres or Durable Objects if needed. |
| Model cost and quality | A bad model or a runaway loop can be expensive or unsafe. | Evaluation sets, step caps, budgets, and per-tenant limits. |
| Prompt injection | A malicious user can try to make the agent do the wrong thing. | Redaction, tool allowlists, approval for risky actions, and adversarial tests. |
| Key theft | A stolen key can move money. | Scoped keys, a key service, rotation, and a break-glass plan. |
| Regulation | Moving money for others may need a licence. | Choose a non-custodial design first, and get legal advice before launch. |
| Cloudflare lock-in | Moving later can be costly. | Keep the model, money, and storage layers behind small interfaces. |
| The old NEAR framework is gone | Building on it would waste time. | Build on NEAR AI Cloud and NEAR Intents. Borrow IronClaw patterns only. |

---

# Part 8 — The first ten working days

**Days 1–2**
- Confirm the ten decisions in Part 2, starting with custody, payout reach, and countries.
- Create the staging and production accounts and keys.
- Write the threat model and the data-flow diagram.

**Days 3–4**
- Fix the schema and service mismatch in `action.service.ts`.
- Fix the money unit rule.
- Fix the seed keys and the login header.

**Days 5–6**
- Add the test framework and the first integration test for the full loop.
- Add CI with typecheck, lint, tests, secret scan, and dependency scan.

**Days 7–8**
- Replace the in-memory rate limiter with a shared counter.
- Add the first model adapter and a single real call to NEAR AI Cloud in staging.
- Add redaction before the model call.

**Days 9–10**
- Run security test round 1 for everything built so far.
- Run security test round 2 with an independent reviewer.
- Write the Phase 0 report and decide whether to open Phase 1.

---

## What I need from you before I start

**Confirmed:**
1. Custody — the tenants hold the funds.
2. Signing — a scoped key with a hard cap.
3. Payout reach — all chains that NEAR Intents supports.
4. AI — all NEAR AI Cloud models, with GLM 5.3 as the default.
5. Pricing — a monthly subscription.
6. Countries — global, with sanctions screening.

**Still needed:**
1. How long do we keep messages, personal data, and audit logs?
2. Who builds, and what is the budget for credits, gas, and audits?
3. Which external security firm will run the pre-money audit?

Once the first item is settled, I will start Phase 0 and report at each gate.
