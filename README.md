# Tanat

**Confidential, multi-tenant AI agents for real businesses — hardware-attested on NEAR AI Cloud, envelope-encrypted per tenant, and approval-gated on NEAR.**

[![Built on NEAR](https://img.shields.io/badge/Built%20on-NEAR-00ec97?style=flat-square)](https://near.org)
[![NEAR AI Cloud TEE](https://img.shields.io/badge/Confidential%20AI-Intel%20TDX%20%2B%20H100%20TEE-0d7a5f?style=flat-square)](https://cloud-api.near.ai)
[![Cloudflare Workers](https://img.shields.io/badge/Edge%20API-Cloudflare%20Workers-F6821F?style=flat-square)](https://workers.cloudflare.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)

> **Live Production Deployment**
> - **Web App & Privacy Centre:** [https://www.tanat.space](https://www.tanat.space)
> - **API Gateway:** [https://api.tanat.space/health](https://api.tanat.space/health)

---

## Hackathon Alignment (NEAR Hackathon 2026)

Tanat is built for **NEAR Hackathon 2026**, targeting:
1. **Privacy & Private AI** — Verifiable NEAR AI Cloud TEE inference (`GET /v1/attestation/report` with fresh nonce + `GET /v1/signature/{chat_id}` ECDSA `secp256k1` verification), per-tenant `AES-256-GCM` envelope encryption, context minimization, secret redaction, and a Conclave-parity `tee/` Phala `dstack` / Intel TDX enclave bundle.
2. **AI Security & Defense** — Strict backend multi-tenant isolation (composite foreign keys & SQLite triggers), non-wildcard RBAC (`owner`, `admin`, `operator`, `member`, `auditor`), fail-closed KMS/TEE enforcement, prompt-injection boundary markers, and security alert monitoring.
3. **Agent Economy & Unstoppable DeFi** — Human-in-the-loop approval gates (proposer cannot self-approve), per-tenant NEAR spending limits, idempotent execution, and NEAR Intents (`1Click` dry-run checkout/payout quotes).

---

## Architecture

```text
┌──────────────────────────────────────────────────────────────────────┐
│                   Next.js 16 Dashboard & Channels                    │
│        Web App (www.tanat.space) · Website Widget · Telegram · Slack │
└───────────────────────────────┬──────────────────────────────────────┘
                                │ Bearer Token / OTP Session / Webhook HMAC
                                ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      Tanat Control Plane (Hono)                      │
│       Cloudflare Workers (Edge)  OR  tee/ dstack / Intel TDX CVM     │
├──────────────────────────────────────────────────────────────────────┤
│  Security & Isolation Layer                                          │
│  • Tenant-scoped queries + composite FKs + DB cross-tenant triggers  │
│  • Granular RBAC (Owner / Admin / Operator / Member / Auditor)       │
│  • AES-256-GCM Envelope Encryption (AAD-bound DEK per tenant + KMS)  │
│  • Enclave MRTD policy check (`assertEnclavePolicy`)                 │
│  • Secret redaction, prompt-injection defense & context minimization │
├──────────────────────────────────────────────────────────────────────┤
│  Verifiable Confidential AI (NEAR AI Cloud)                          │
│  • Enforce TEE-tier models when `require_tee = 1`                    │
│  • Nonce-bound Intel TDX + NVIDIA GPU attestation (`/attestation/report`) │
│  • Per-chat `SHA-256(req):SHA-256(res)` ECDSA `secp256k1` recovery   │
│  • Persisted proofs in `tee_attestation_receipts`                    │
├──────────────────────────────────────────────────────────────────────┤
│  NEAR Protocol & Intents                                             │
│  • Approval-gated NEAR transfers (proposer ≠ approver, spend limits) │
│  • NEAR Intents dry-run quotes (`GET /tokens`, `POST /quote`)        │
└──────────────────────────────────────────────────────────────────────┘
```

### Trust-Boundary Transparency

Tanat never fabricates hardware guarantees:
- **When running on Cloudflare Workers (`TEE_RUNTIME_MODE=cloudflare_worker`):** Tenant payloads are stored `AES-256-GCM` encrypted at rest, unwrapped in Worker RAM for authenticated requests, minimized/redacted, and verified against NEAR AI Cloud's Intel TDX + NVIDIA GPU TEE (`GET /v1/attestation/report` & `GET /v1/signature/{chat_id}`).
- **When deployed via `tee/` on Phala `dstack` / Intel TDX (`TEE_RUNTIME_MODE=dstack_cvm`):** Tanat's own Hono runtime also executes inside a hardware-isolated Confidential VM with `/var/run/tappd.sock` mounted and `TEE_ALLOWED_MRTD` enforced before DEK unwrapping (`src/services/enclave-runtime.service.ts`).

---

## Quick Start (Local Development)

### Prerequisites

- **Node.js 20+**
- **npm**
- **Wrangler CLI** (installed in `devDependencies`, or `npm install -g wrangler`)

### 1. Install & Test Backend

```bash
git clone https://github.com/UtyJames/tanat.git
cd tanat
npm install

# Run full automated test suite (10 test files, 142 tests)
npm test

# Typecheck & build Cloudflare Worker bundle
npm run typecheck
npm run build:worker
```

### 2. Run Backend API Locally (`http://localhost:8787`)

Option A — Node local D1/SQLite runner (auto-applies migrations `0001`–`0010` and seeds demo data):

```bash
npm run dev:node
# → API listening on http://localhost:8787
```

Option B — Wrangler local Worker runtime:

```bash
npm run db:migrate
npm run db:seed
npm run dev
```

Create a root `.dev.vars` (gitignored) for optional live AI / email / KMS keys:

```dotenv
NEAR_AI_API_KEY=your-near-ai-cloud-key
API_KEY_SALT=local-dev-salt
KMS_MASTER_KEY=local-dev-master-key-32-bytes-minimum
RESEND_API_KEY=your-resend-key
AUTH_EMAIL_FROM=Tanat <hello@yourdomain.com>
```

> Never commit `.dev.vars` or expose `NEAR_AI_API_KEY`, `KMS_MASTER_KEY`, or `MASTER_API_KEY` in `wrangler.toml` or frontend bundles.

### 3. Run Next.js Frontend Locally (`http://localhost:3000`)

```bash
cd frontend
npm install
npm run dev
# → Web UI running at http://localhost:3000
```

To typecheck and build the static production frontend (`frontend/out`):

```bash
cd frontend
npx tsc --noEmit
npm run build
```

---

## Conclave-Parity TEE Enclave Deployment (`tee/`)

To migrate Tanat's own application runtime into an Intel TDX / Phala `dstack` Confidential VM:

```bash
npm run build:worker
docker compose -f tee/docker-compose.tee.yml up -d --build
```

See [tee/README.md](tee/README.md) for `TEE_RUNTIME_MODE=dstack_cvm`, `TEE_STRICT_VERIFICATION=true`, `TEE_ALLOWED_MRTD`, and `/var/run/tappd.sock` configuration.

---

## Key Security & Privacy Controls

| Control | Implementation | Source |
|---------|----------------|--------|
| **Envelope Encryption** | Per-tenant `AES-256-GCM` DEKs, AAD-bound to `tenant_id\|table\|record_id\|field`, KEK-wrapped, key rotation & revocation | [`src/services/encryption.service.ts`](src/services/encryption.service.ts) |
| **KMS & Fail-Closed Prod** | External `KMS_MASTER_KEY` required in production; rejects fallback if missing | [`src/services/kms.service.ts`](src/services/kms.service.ts) |
| **TEE Inference Verification** | Nonce-bound `/v1/attestation/report` + `secp256k1` ECDSA signature recovery over `SHA-256(req):SHA-256(res)` | [`src/services/near-ai-tee.service.ts`](src/services/near-ai-tee.service.ts) |
| **Enclave Runtime Policy** | Honest worker vs `dstack_cvm`/`tdx_enclave` detection & MRTD pinning (`assertEnclavePolicy`) | [`src/services/enclave-runtime.service.ts`](src/services/enclave-runtime.service.ts) |
| **Multi-Tenant Isolation** | Server-side `tenantId` scoping, composite `(tenant_id, id)` FKs & cross-tenant DB triggers | [`src/db/migrations/0009_security_privacy_overhaul.sql`](src/db/migrations/0009_security_privacy_overhaul.sql) |
| **RBAC & Auth** | `owner` / `admin` / `operator` / `member` / `auditor`, zero wildcard dashboard scopes, strict `/login` vs `/start` separation | [`src/middleware/rbac.ts`](src/middleware/rbac.ts), [`src/routes/auth.ts`](src/routes/auth.ts) |
| **AI Data Minimization** | Secret redaction, prompt-injection boundary markers, least-knowledge selection | [`src/services/ai-privacy.service.ts`](src/services/ai-privacy.service.ts) |

---

## Core API Endpoints

### Authentication (Strict Sign Up vs Sign In Separation)
- `POST /api/auth/otp/request` — Sends 6-digit HMAC-hashed OTP (`mode: "login"` returns `404 ACCOUNT_NOT_FOUND` for unregistered emails; `mode: "signup"` returns `409 ACCOUNT_EXISTS` for existing accounts)
- `POST /api/auth/otp/verify` — Verifies OTP (max 5 attempts, 10m TTL) and issues 7-day revocable dashboard session (`tns_...`)

### Privacy, Encryption & TEE Verification (`/api/v1/privacy`)
- `GET /api/v1/privacy/status` — Encryption, KMS, RBAC, enclave runtime, and TEE verification status
- `POST /api/v1/privacy/keys/rotate` — Rotate tenant DEK (keeps older keys for decrypting historical data)
- `DELETE /api/v1/privacy/keys/:id` — Immediately revoke a tenant DEK
- `POST /api/v1/privacy/tee-verify` — Live nonce-bound NEAR AI Cloud Intel TDX / NVIDIA GPU attestation check
- `GET /api/v1/privacy/tee-receipts` — List persisted cryptographic TEE inference receipts (`tee_attestation_receipts`)
- `PATCH /api/v1/privacy/settings` — Configure retention window & fail-closed `require_tee` policy
- `POST /api/v1/privacy/export` & `POST /api/v1/privacy/deletion-request` — Tenant data export & scheduled deletion

### Agents, Sessions, Actions & NEAR Intents (`/api/v1`)
- `POST /api/v1/sessions` & `POST /api/v1/sessions/:id/messages` — Encrypted chat + TEE verification + tool proposals
- `GET /api/v1/actions`, `POST /api/v1/actions/:id/approve`, `POST /api/v1/actions/:id/execute` — Dual-party human approval gate
- `GET /api/v1/near/intents/tokens` & `POST /api/v1/near/intents/quote` — NEAR Intents (`1Click`) asset discovery & dry-run quotes

---

## Project Structure

```text
tanat/
├── src/
│   ├── index.ts                          # Cloudflare Worker entry point
│   ├── app.ts                            # Hono router, CORS, security headers, rate limits
│   ├── middleware/
│   │   ├── auth.ts                       # API key & revocable dashboard session auth
│   │   ├── rbac.ts                       # Granular role-based access control
│   │   ├── scopes.ts                     # Explicit permission enforcement
│   │   └── tenant-isolation.ts           # Tenant context verification
│   ├── routes/
│   │   ├── auth.ts                       # OTP signup/login separation & session management
│   │   ├── privacy.ts                    # Privacy Centre, DEK rotation, live TEE verify & receipts
│   │   ├── sessions.ts                   # Encrypted chat, knowledge minimization & TEE proofs
│   │   ├── actions.ts                    # Human-in-the-loop approval & NEAR execution
│   │   ├── near.ts                       # NEAR balance & NEAR Intents dry-run quotes
│   │   └── ...                           # agents, installations, keys, knowledge, webhooks, public
│   ├── services/
│   │   ├── encryption.service.ts         # Per-tenant AES-256-GCM envelope encryption
│   │   ├── kms.service.ts                # External KEK provider (fail-closed in prod)
│   │   ├── near-ai.service.ts            # NEAR AI Cloud client + TEE enforcement
│   │   ├── near-ai-tee.service.ts        # /attestation/report + /signature/{chat_id} ECDSA verifier
│   │   ├── enclave-runtime.service.ts    # Worker vs dstack/TDX CVM boundary & MRTD policy
│   │   └── ai-privacy.service.ts         # Secret redaction & context minimization
│   └── db/migrations/
│       └── 0001_init.sql ... 0010_tee_attestations.sql
├── tee/                                  # Phala dstack / Intel TDX Confidential VM deployment
│   ├── Dockerfile.tee
│   ├── docker-compose.tee.yml
│   └── README.md
├── frontend/                             # Next.js 16 workspace UI, /login, /start, Privacy Centre
├── scripts/local-api.mjs                 # Local Node D1/SQLite API server
├── wrangler.toml                         # API Worker config (api.tanat.space)
└── wrangler.web.toml                     # Static Web Worker config (www.tanat.space)
```

---

## License

MIT — Built for **NEAR Hackathon 2026**.
