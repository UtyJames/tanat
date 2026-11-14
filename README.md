# Tanat

**Private AI agents any business can deploy to customers and staff in minutes — hardware-attested in TEEs on NEAR AI Cloud, envelope-encrypted per business, and gated by human approvals.**

[![Built on NEAR](https://img.shields.io/badge/Built%20on-NEAR-00ec97?style=flat-square)](https://near.org)
[![NEAR AI Cloud TEE](https://img.shields.io/badge/Confidential%20AI-Intel%20TDX%20%2B%20H100%20TEE-0d7a5f?style=flat-square)](https://cloud-api.near.ai)
[![Cloudflare Workers](https://img.shields.io/badge/Edge%20API-Cloudflare%20Workers-F6821F?style=flat-square)](https://workers.cloudflare.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)

> **Live Production Deployment**
> - **Web App & Privacy Centre:** [https://www.tanat.space](https://www.tanat.space)
> - **API Gateway:** [https://api.tanat.space/health](https://api.tanat.space/health)

---

## Why Businesses Struggle to Adopt AI (and How Tanat Solves It)

Real businesses — clinics, fintechs, logistics teams, HR departments, agencies, and online stores — want AI agents that actually help their **customers** and **internal staff**. They hold back for two reasons:

1. **Privacy & Data Leakage Risk:** Sending customer chats, internal SOPs, HR policies, or financial records to ordinary AI APIs risks exposing proprietary business data to model providers, cloud operators, or other tenants.
2. **Deployment Complexity:** Connecting AI safely across a website widget, WhatsApp, Telegram, and internal Slack — while enforcing staff permissions and preventing rogue financial actions — usually takes months of custom engineering.

**Tanat solves both in one workspace:**
- **Zero-Trust Privacy by Default:** Every business gets its own `AES-256-GCM` Data Encryption Key (DEK), strict database-enforced tenant isolation, context minimization, secret redaction, and **cryptographically verified Intel TDX + NVIDIA H100 TEE inference** via NEAR AI Cloud.
- **Deploy to Customers & Staff in Minutes:** Sign up in 2 fields (`Business Name` + `Work Email`), upload knowledge or policies, and deploy across **Website Chat Widget, WhatsApp Business, Telegram, and Slack** — with granular **RBAC** for staff and **1-click human approvals** for money or sensitive actions.

---

## Verify It Yourself — Do X → See Y (For Judges & AI Reviewers)

Run any of the checks below to verify every claim directly against the codebase and live deployment:

| Check | Do X (Command / Action) | See Y (Expected Result) |
|-------|-------------------------|-------------------------|
| **1. Full Test Suite (142 tests)** | `npm test` | Exits `0` with **10 test files, 142 tests passing** (tenant isolation, RBAC, AES-256-GCM rotation/revocation, TEE `secp256k1` ECDSA verification, WhatsApp/Telegram/Slack webhooks, auth, NEAR Intents). |
| **2. Strict TypeScript Check** | `npm run typecheck` | Exits `0` with **0 TypeScript errors**. |
| **3. Live Production API** | `curl -s https://api.tanat.space/health` | Returns `200 OK` JSON (`{"status":"ok",...}`). |
| **4. Unregistered Login Guard** | `curl -s -X POST https://api.tanat.space/api/auth/otp/request -H "Content-Type: application/json" -d "{\"email\":\"nobody@example.com\",\"mode\":\"login\"}"` | Returns HTTP `404` with `"code":"ACCOUNT_NOT_FOUND"` (never provisions or leaks access to unregistered emails; `/login` UI routes user to `/start`). |
| **5. TEE `secp256k1` Verification** | `npx vitest run src/services/near-ai-tee.service.test.ts` | **3/3 tests pass**: verifies `/v1/attestation/report` + `/v1/signature/{chat_id}` via real `secp256k1` ECDSA recovery, fails closed on tampered hashes (`NEAR_AI_TEE_VERIFICATION_FAILED`), and blocks mismatched enclave `MRTD`. |
| **6. Cross-Tenant Isolation & Revocation** | `npx vitest run src/security/security-overhaul.test.ts` | **7/7 tests pass**: Business B gets `404` on Business A's sessions/knowledge/installations, DB triggers reject cross-tenant inserts, revoked DEKs immediately block decryption, wildcard `*` production CORS origins are rejected. |
| **7. Frontend Build** | `cd frontend && npx tsc --noEmit && npm run build` | Exits `0` and exports static Next.js 16 bundle to `frontend/out`. |

---

## Three-Layer Privacy Architecture

```text
┌──────────────────────────────────────────────────────────────────────┐
│                  Customer & Staff Surfaces                           │
│   Customers: Website Widget · WhatsApp · Telegram · NEAR Intents     │
│   Staff:     Slack (@agent & DMs) · Web Workspace · Privacy Centre   │
└───────────────────────────────┬──────────────────────────────────────┘
                                │ Bearer Token / OTP Session / HMAC
                                ▼
┌──────────────────────────────────────────────────────────────────────┐
│               Layer 1 — Strict Tenant & Staff Boundaries             │
│  • Server-derived `tenantId` on every query (zero client trust)      │
│  • Composite `(tenant_id, id)` FKs & cross-tenant SQLite triggers    │
│  • Granular RBAC: Owner / Admin / Operator / Member / Auditor        │
│  • Zero wildcard (`*`) scopes on dashboard sessions                  │
└───────────────────────────────┬──────────────────────────────────────┘
                                ▼
┌──────────────────────────────────────────────────────────────────────┐
│               Layer 2 — Per-Business Envelope Encryption             │
│  • Independent `AES-256-GCM` DEK per business (random 96-bit nonce)  │
│  • AAD-bound to `tenant_id|table|record_id|field` (anti-tamper/swap) │
│  • Wrapped by external KMS KEK (`KMS_MASTER_KEY`, fail-closed prod)  │
│  • 1-click DEK Rotation & Immediate Revocation in Privacy Centre     │
│  • Raw DB dumps cannot read messages, knowledge docs, or memories    │
└───────────────────────────────┬──────────────────────────────────────┘
                                ▼
┌──────────────────────────────────────────────────────────────────────┐
│          Layer 3 — Verifiable Hardware TEE AI (Conclave Parity)      │
│  • Prompt secret redaction + context minimization + injection guard  │
│  • Enforces TEE-tier models when `require_tee = 1`                   │
│  • Nonce-bound Intel TDX + NVIDIA H100 quote (`/attestation/report`) │
│  • Per-chat `SHA-256(req):SHA-256(res)` `secp256k1` ECDSA recovery   │
│  • Cryptographic receipts persisted in `tee_attestation_receipts`    │
│  • `tee/` Phala `dstack` / Intel TDX CVM bundle for app-layer TEE    │
└──────────────────────────────────────────────────────────────────────┘
```

### Honest Trust-Boundary Guarantee
- **Standard Edge Mode (`TEE_RUNTIME_MODE=cloudflare_worker`):** Payloads are encrypted at rest per business, unwrapped in Worker RAM only for authenticated requests, minimized/redacted, and cryptographically verified against NEAR AI Cloud's Intel TDX + NVIDIA GPU TEE (`GET /v1/attestation/report` + `GET /v1/signature/{chat_id}`).
- **Full Conclave Enclave Mode (`tee/` with `TEE_RUNTIME_MODE=dstack_cvm`):** Deploying `tee/docker-compose.tee.yml` onto a Phala `dstack` / Intel TDX Confidential VM moves Tanat's own Hono runtime inside hardware-isolated enclave memory with `/var/run/tappd.sock` mounted and `TEE_ALLOWED_MRTD` enforced before DEK unwrapping (`assertEnclavePolicy`).

---

## Built for Real Businesses: Customers & Staff in One Place

### Deploy to Customers
- **Website Chat Widget:** Issue origin-locked publishable keys (`pk_...`, wildcard `*` blocked in production) and drop the widget onto any site.
- **WhatsApp Business Cloud API:** Built-in Meta `hub.challenge` verification, `X-Hub-Signature-256` HMAC-SHA256 validation, and live Graph API replies (`POST /api/webhooks/whatsapp/:channelId`).
- **Telegram:** Webhook secret-token validation and instant Bot API replies (`POST /api/webhooks/telegram/:channelId`).
- **NEAR Intents Checkout & Payout Previews:** Asset discovery (`GET /api/v1/near/intents/tokens`) and `1Click` dry-run quotes (`POST /api/v1/near/intents/quote`).

### Deploy to Staff
- **Slack Integration:** `X-Slack-Signature` + replay-window verification for `@agent` mentions and direct messages (`POST /api/webhooks/slack/:channelId`).
- **Team RBAC:** Invite staff with least-privilege roles (`owner`, `admin`, `operator`, `member`, `auditor`), granular permissions, and per-agent access scoping.
- **Human-in-the-Loop Approvals:** Agents can propose NEAR transfers or sensitive actions, but cannot self-approve (`proposer ≠ approver`), and per-tenant spending limits + idempotency keys protect every execution.
- **1-Click Privacy & Security Centre (`/app` → Privacy):** Rotate/revoke encryption keys, verify live NEAR AI TEE attestation, inspect per-message ECDSA receipts, manage active staff sessions, export business data, or schedule deletion.

---

## Hackathon Alignment (NEAR Hackathon 2026)

1. **Privacy & Private AI:** Per-business `AES-256-GCM` envelope encryption, context minimization, secret redaction, live NEAR AI Cloud TEE attestation + `secp256k1` receipt verification, and the `tee/` `dstack`/TDX enclave bundle.
2. **AI Security & Defense:** Composite-FK multi-tenant isolation, DB triggers, non-wildcard RBAC, fail-closed KMS/TEE checks, prompt-injection defense, and security alert logging.
3. **Agent Economy & Unstoppable DeFi:** Dual-party approval gates, configurable NEAR spending caps, and NEAR Intents `1Click` quote previews.

---

## Quick Start (Local Development)

### Prerequisites
- **Node.js 20+** and **npm**

### 1. Clone, Install, & Run Tests

```bash
git clone https://github.com/UtyJames/tanat.git
cd tanat
npm install

npm test          # 10 test files, 142 tests
npm run typecheck # TypeScript strict check
npm run build:worker
```

### 2. Start Backend API (`http://localhost:8787`)

```bash
npm run dev:node
# Auto-initializes local SQLite/D1 with migrations 0001–0010 + seed data
```

Optional `.dev.vars` (gitignored) for live external keys:

```dotenv
NEAR_AI_API_KEY=your-near-ai-cloud-key
API_KEY_SALT=local-dev-salt
KMS_MASTER_KEY=local-dev-master-key-32-bytes-minimum
RESEND_API_KEY=your-resend-key
AUTH_EMAIL_FROM=Tanat <hello@yourdomain.com>
```

### 3. Start Next.js Frontend (`http://localhost:3000`)

```bash
cd frontend
npm install
npm run dev
```

### 4. Optional: Deploy App Runtime into Intel TDX / Phala `dstack` Enclave

```bash
npm run build:worker
docker compose -f tee/docker-compose.tee.yml up -d --build
```

See [tee/README.md](tee/README.md) for `TEE_RUNTIME_MODE=dstack_cvm`, `TEE_STRICT_VERIFICATION=true`, and `TEE_ALLOWED_MRTD`.

---

## Core API Reference

| Area | Endpoint | Purpose |
|------|----------|---------|
| **Auth** | `POST /api/auth/otp/request`, `POST /api/auth/otp/verify` | 6-digit email OTP (`mode: "login"` vs `"signup"` strictly separated; 7-day revocable sessions) |
| **Privacy & TEE** | `GET /api/v1/privacy/status`, `POST /api/v1/privacy/tee-verify`, `GET /api/v1/privacy/tee-receipts` | Enclave status, live nonce-bound TDX/GPU attestation, & persisted `secp256k1` receipts |
| **Encryption** | `POST /api/v1/privacy/keys/rotate`, `DELETE /api/v1/privacy/keys/:id` | Per-business DEK rotation & immediate revocation |
| **Chat** | `POST /api/v1/sessions`, `POST /api/v1/sessions/:id/messages` | Encrypted chat + knowledge minimization + TEE signature verification |
| **Channels** | `POST /api/webhooks/whatsapp/:id`, `/telegram/:id`, `/slack/:id` | HMAC/token-verified live customer & staff channel webhooks |
| **Approvals & NEAR** | `GET /api/v1/actions`, `POST /api/v1/actions/:id/approve`, `POST /api/v1/near/intents/quote` | Dual-party human approvals & NEAR Intents dry-run quotes |

---

## License

MIT — see [LICENSE](LICENSE). Built for **NEAR Hackathon 2026**.
