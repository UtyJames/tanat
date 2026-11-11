# Tanat

**Ship production AI agents inside your SaaS. Multi-tenant, approval-gated, and money-native on NEAR.**

[![Built on NEAR](https://img.shields.io/badge/Built%20on-NEAR-00ec97?style=flat-square)](https://near.org)
[![Cloudflare Workers](https://img.shields.io/badge/Deployed-Cloudflare%20Workers-F6821F?style=flat-square)](https://workers.cloudflare.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)

## 🎯 What is Tanat?

Tanat is an **embedded multi-tenant AI agent platform** for SaaS products. It lets any SaaS ship production-ready AI agents to every customer — without building the agent backend, isolation, approvals, or payment layer themselves.

### The Problem

Every SaaS wants to add AI agents. But building them properly requires:
- Multi-tenant data isolation
- Approval workflows for risky actions
- Spending limits and metering
- A way for agents to safely handle money

### The Solution

Tanat provides **one API / control plane** that handles:
- **Tenants, Users, Installations** — full multi-tenant architecture
- **Versioned Agents** — define and deploy AI agents per customer
- **Approval System** — risky actions require explicit human approval before execution
- **NEAR Money Movement** — every agent can safely hold and spend money via NEAR (Intents + scoped wallets)
- **Perfect Isolation** — Tenant A cannot see or spend Tenant B's data or money
- **Usage Metering** — track API calls, tokens, and transactions per tenant

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                    SaaS Product                      │
│              (Your app, your users)                  │
└────────────────────┬────────────────────────────────┘
                     │ API Key + Tenant Context
                     ▼
┌─────────────────────────────────────────────────────┐
│                  Tanat API (Hono)                     │
│           Cloudflare Workers (Edge)                  │
├─────────────────────────────────────────────────────┤
│  Security Layer                                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ │
│  │ API Auth │ │ Tenant   │ │ Rate     │ │ Audit  │ │
│  │ (SHA-256)│ │ Isolation│ │ Limiting │ │ Logger │ │
│  └──────────┘ └──────────┘ └──────────┘ └────────┘ │
├─────────────────────────────────────────────────────┤
│  Core Services                                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ │
│  │ Agents   │ │ Sessions │ │ Actions  │ │ NEAR   │ │
│  │ Service  │ │ & Chat   │ │ Approval │ │ Intents│ │
│  └──────────┘ └──────────┘ └──────────┘ └────────┘ │
├─────────────────────────────────────────────────────┤
│  D1 Database (SQLite at Edge)                        │
│  Full schema with FK constraints + indexes           │
└─────────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│              NEAR Protocol (Testnet)                 │
│     Intents · Scoped Wallets · Function-Call Keys    │
└─────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Wrangler CLI (`npm install -g wrangler`)
- Cloudflare account (free tier works)

### Setup

```bash
# Clone
git clone https://github.com/your-org/tanat.git
cd tanat

# Install dependencies
npm install

# Create D1 database
wrangler d1 create tanat-db
# Copy the database_id into wrangler.toml

# Run migrations
npm run db:migrate

# Seed demo data
npm run db:seed

# Add NEAR_AI_API_KEY to the ignored .dev.vars file to enable AI chat locally.
# Never put provider keys in wrangler.toml or frontend environment variables.

# Start dev server
npm run dev
# → API running at http://localhost:8787
```

For local AI chat, add the following to the root `.dev.vars` file using a
rotated NEAR AI Cloud key:

```dotenv
NEAR_AI_API_KEY=your-near-ai-cloud-key
```

`.dev.vars` is gitignored. For production, store the key as a Cloudflare Worker
secret, not a `[vars]` entry:

```bash
npx wrangler secret put NEAR_AI_API_KEY
npm run deploy
```

The backend sends chat requests only to the official NEAR AI Cloud endpoint.
Never expose this key in the dashboard, browser bundles, logs, or source
control. If a key has been pasted into chat or otherwise disclosed, revoke it
and create a replacement before configuring it.

### Frontend

```bash
cd frontend
npm install
npm run dev
# → UI running at http://localhost:5173
```

## 📡 API Reference

### Authentication

The dashboard uses a six-digit email verification code. After email verification, a new business gets a workspace, a starter Store Assistant agent and an installation, then a short-lived dashboard session. In the dashboard's **Settings → API keys** section, tenant admins can create integration API keys; plaintext keys are shown once and must be saved securely. That integration key is not the dashboard login and is not a NEAR wallet key.

The public email signup endpoints are `POST /api/auth/otp/request` and `POST /api/auth/otp/verify`. Codes expire after 10 minutes, are stored as keyed HMAC digests, and permit at most five attempts. Email delivery requires a verified Resend sender domain, `RESEND_API_KEY` as a Wrangler secret, and `AUTH_EMAIL_FROM` set to the verified sender address. Until those are configured, signup returns `EMAIL_AUTH_NOT_CONFIGURED`. Dashboard sessions expire after seven days and can be revoked by signing out.

All integration API requests require a tenant API key:

```bash
curl -H "Authorization: Bearer tnt_your_api_key_here" \
     https://tanat-api.your-worker.workers.dev/api/v1/tenants
```

### First production setup

1. Verify a sending domain with Resend.
2. Set `RESEND_API_KEY` with `wrangler secret put RESEND_API_KEY`.
3. Configure `AUTH_EMAIL_FROM` to an address on that verified domain and deploy.
4. Sign up at the dashboard using a business email; enter the six-digit code sent to your inbox.
5. Create tenant integration keys in **Settings → API keys**.

Do not use the platform `MASTER_API_KEY` as a tenant key. Do not enter wallet seed phrases or private keys in the dashboard.

### Core Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/sessions` | Create a chat session |
| `POST` | `/api/v1/sessions/:id/messages` | Send a message (chat) |
| `GET` | `/api/v1/actions` | List pending actions |
| `POST` | `/api/v1/actions/:id/approve` | Approve an action |
| `POST` | `/api/v1/actions/:id/execute` | Execute approved action on NEAR |
| `POST` | `/api/v1/keys` | Generate new API key |
| `GET` | `/api/v1/near/intents/tokens` | List NEAR Intents-supported assets |
| `POST` | `/api/v1/near/intents/quote` | Preview a checkout or payout quote (dry-run only) |

### NEAR Intents payment previews

The Intents endpoints currently support asset discovery and dry-run quote previews for both store checkouts and agent-to-merchant payouts. A quote preview is **not a payment**: Tanat always sends `dry: true` to 1Click, does not create a deposit, and does not submit or sign a transaction. The existing NEAR action executor is also disabled outside the test environment until a real, audited signing integration is available.

```json
{
  "purpose": "checkout",
  "origin_asset": "nep141:wrap.near",
  "destination_asset": "nep141:usdt.tether-token.near",
  "amount": "1000000000000000000000000",
  "recipient": "merchant.near",
  "recipient_type": "INTENTS",
  "refund_to": "shopper.near",
  "refund_type": "ORIGIN_CHAIN",
  "slippage_tolerance": 100
}
```

Send this to `POST /api/v1/near/intents/quote` with an API key that has `actions:propose` or `write` scope. `purpose` may be `checkout` or `payout`. Amounts are integer strings in the origin asset's smallest unit; use the asset's `decimals` from the tokens endpoint. The optional `INTENTS_API_KEY` Worker secret authenticates requests to 1Click. Do not treat a preview as an order or fulfill goods based on it.

NEAR Intents has no testnet. Live deposits, payouts, and fulfillment tracking are not enabled. The external security audit and legal/sanctions review described in `PLAN.md` must be complete before enabling real payments.

### Example: Full Agent Flow

```bash
# 1. Create a session
SESSION=$(curl -s -X POST \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"installation_id": "inst_abc"}' \
  /api/v1/sessions | jq -r '.data.id')

# 2. Chat — agent proposes a refund
curl -X POST \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"content": "Process a refund of 5 NEAR for customer alice.near"}' \
  /api/v1/sessions/$SESSION/messages

# Response includes an action proposal:
# { "action": { "id": "act_xyz", "type": "near_transfer", "status": "pending" } }

# 3. Approve the action
curl -X POST -H "Authorization: Bearer $API_KEY" \
  /api/v1/actions/act_xyz/approve

# 4. Execute — money moves on NEAR
curl -X POST -H "Authorization: Bearer $API_KEY" \
  /api/v1/actions/act_xyz/execute

# Response: { "data": { "status": "executed", "tx_hash": "..." } }
```

## 🔒 Security Model

| Layer | Mechanism |
|-------|-----------|
| **Authentication** | SHA-256 hashed API keys, never stored in plaintext |
| **Tenant Isolation** | Every query scoped by tenant_id, enforced at middleware level |
| **Approval Gate** | All money movement requires explicit human approval |
| **Spending Limits** | Per-tenant configurable limits, checked before execution |
| **Idempotency** | Unique keys prevent double-execution of actions |
| **Rate Limiting** | Per-key sliding window rate limits |
| **Audit Trail** | Every sensitive operation logged with actor, IP, timestamp |
| **Input Validation** | Zod schemas on every endpoint |
| **Security Headers** | CSP, HSTS, X-Frame-Options, X-Content-Type-Options |

## 🧪 Demo Scenario

1. **Tenant A** (Acme Corp) asks their support agent to refund a customer
2. Agent proposes: "Refund 5 NEAR to alice.near" → Action created as `pending`
3. Human operator clicks **Approve** → Action status: `approved`
4. System executes → NEAR transfer settles → Action status: `executed`
5. Switch to **Tenant B** (Stark Industries) → completely isolated, sees nothing from Tenant A

## 🏛️ Built With

- **Runtime:** Cloudflare Workers (edge compute, 0ms cold start)
- **Framework:** [Hono](https://hono.dev) (ultrafast web framework for Workers)
- **Database:** Cloudflare D1 (SQLite at the edge)
- **Blockchain:** NEAR Protocol (Intents, scoped wallets)
- **Frontend:** React + Vite
- **Validation:** Zod
- **Language:** TypeScript (strict mode)

## 📁 Project Structure

```
tanat/
├── src/
│   ├── index.ts              # Worker entry point
│   ├── app.ts                # Hono app setup
│   ├── middleware/
│   │   ├── auth.ts           # API key authentication
│   │   ├── cors.ts           # CORS configuration
│   │   ├── rate-limit.ts     # Rate limiting
│   │   ├── security.ts       # Security headers
│   │   ├── tenant-isolation.ts # Multi-tenant isolation
│   │   └── validation.ts     # Input validation schemas
│   ├── routes/
│   │   ├── tenants.ts        # Tenant management
│   │   ├── agents.ts         # Agent definitions
│   │   ├── installations.ts  # Agent installations
│   │   ├── sessions.ts       # Chat sessions
│   │   ├── actions.ts        # Approval workflow
│   │   ├── near.ts           # NEAR integration
│   │   └── keys.ts           # API key management
│   ├── services/
│   │   ├── tenant.service.ts
│   │   ├── agent.service.ts
│   │   ├── action.service.ts
│   │   ├── near.service.ts
│   │   └── metering.service.ts
│   ├── db/
│   │   └── migrations/
│   │       └── 0001_init.sql # Full schema
│   ├── types/
│   │   └── index.ts          # TypeScript types
│   └── utils/
│       ├── crypto.ts         # Crypto utilities
│       ├── errors.ts         # Error handling
│       └── audit.ts          # Audit logging
├── frontend/                 # React demo UI
├── scripts/
│   └── seed.sql              # Demo data
├── wrangler.toml             # Cloudflare config
└── package.json
```

## 🛣️ Track

**Agent Economy** — Tanat enables an ecosystem where AI agents can safely transact on behalf of SaaS customers, with built-in economic controls and NEAR-native money movement.

## 📄 License

MIT

---

**Built for the NEAR Hackathon 2026** 🚀
