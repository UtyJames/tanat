# Tanat — Product Audit, Integration Strategy & Redesign

**Date:** 11 November 2026
**Scope:** onboarding, distribution (website / npm / CDN / Telegram / WhatsApp), payment UX, docs, brand/UI
**Verdict:** the backend is a credible secure prototype. The *product* around it is missing. Today a business cannot go from "interested" to "my agent can take a payment" without a Tanat engineer. That is the whole gap.

---

## 1. What the current flow actually is

```
Landing page            → does not exist
Sign-up                 → 1 form: business name + email
Email OTP               → creates tenant + "Store Assistant" agent + installation
Dashboard               → Chat | Actions | Settings
Enable payments         → cannot. `features.nearPayments` is operator-only
Connect payout account  → cannot. `near_account_id` is operator-only
Set a spending limit    → cannot. `spending_limit_near` is operator-only
Create website widget   → does not exist
Connect Telegram        → does not exist
Connect WhatsApp        → does not exist
Get embed code          → does not exist
Read integration docs   → README only
Go live                 → manual, by the Tanat team
```

Evidence in the repository:

| Claim | Where |
|---|---|
| Sign-up creates one hard-coded agent and an installation with payments **off** | `src/routes/auth.ts:240-278` |
| A tenant can only rename itself; money fields are operator-only | `src/routes/tenants.ts:25-29`, `src/routes/installations.ts:26-43` |
| Every API call needs a **secret** tenant key (`tnt_…`) | `src/middleware/auth.ts:46-98` |
| No public/publishable key, no widget session token | absent from `src/routes` and `src/db/migrations` |
| Hosted checkout URL is generated but has no page | `src/routes/payments.ts:126` → `/pay/:id` |
| Dashboard token lives in `sessionStorage` | `frontend/lib/api.ts:29-52` |
| Root route is the dashboard, not a website | `frontend/app/page.tsx` |
| No SDK, widget, channel webhook, or API docs | repository tree |

---

## 2. The eleven things that are broken (prioritised)

### P0 — blocks revenue

**1. Onboarding dead-ends at the exact moment value should start.**
The user verifies an email and lands in a chat with a generic "Store Assistant" that cannot pay. There is no wallet connection, no limit, no channel, no test, no embed code. Everything that makes Tanat Tanat is behind an operator. A self-serve business has no path to "live".

**2. There is no safe way to put Tanat on a website.**
The only credential is a tenant secret. Shipping it in a browser hands attackers the ability to read data and move money. A widget is therefore impossible until there is a **publishable key** (`pk_live_…`) bound to an installation and an origin allowlist, plus short-lived session tokens.

**3. The only payment the agent can propose is an on-chain NEAR transfer to a typed `.near` address.**
Real businesses sell in dollars, euros, naira, etc. Customers do not know their `.near` account. The payment step must be a **hosted payment link** that accepts card / bank / stablecoin / NEAR, not a crypto address prompt. Cross-chain payment intents exist in the API (`payments.ts`) but have no customer-facing page.

**4. Approval requires a dashboard login.**
The person who must approve a refund is a business owner on WhatsApp, not someone sitting in a web console. Approvals need to arrive where the owner already is, as a **signed, single-use, expiring link or button** — with separation of duties preserved.

**5. No documentation a customer can follow.**
The README is written for the person deploying the Worker. There is no "add the widget in 2 minutes", no React guide, no Telegram/WhatsApp setup, no webhook reference, no error catalogue, no sandbox mode. Vibecoders will bounce immediately.

### P1 — blocks scale

**6. No channel layer.**
Sessions have a `user_id` but no channel identity, no thread mapping, no inbound webhook signature verification, no idempotency for retried provider events, no outbound sender. Telegram and WhatsApp are the distribution advantage and they are absent.

**7. Dashboard auth is fragile.**
`sessionStorage` means a new tab logs the user out, and any XSS can read the token. Sessions should be `HttpOnly; Secure; SameSite=Lax` cookies with CSRF protection, or at minimum an in-memory token + refresh flow.

**8. The dashboard is a developer console.**
"Tenant", "installation", "scopes", "yoctoNEAR" are exposed to business owners. There is no revenue view, no conversation view, no approval inbox, no channel status, no empty states. Settings makes the owner file a support ticket to change a limit.

**9. Model/agent defaults drift.**
Sign-up writes `model: 'gpt-4o-mini'`; the chat route only uses a NEAR model when the string contains `/`, otherwise it silently swaps to the platform default (`sessions.ts:585-588`). The agent the user "created" is not quite the agent that runs.

**10. No test mode.**
Nothing can be tried without a real email domain (Resend), a real NEAR account, and operator action. A sandbox with simulated money and a one-click demo is the single highest-converting onboarding feature for both SMBs and vibecoders.

**11. No measurement.**
No events for "widget opened", "message sent", "proposal created", "approved", "abandoned". You cannot improve the funnel you cannot see.

### Correctness / hygiene found along the way

- `auth.ts:146-157` runs the same `UPDATE auth_link_tokens` twice.
- `security.ts` sends `X-Frame-Options: DENY` and `frame-ancestors 'none'`; any future iframe widget must be served from a page with its own headers, or use a DOM-injected widget (recommended).
- README still says Vite on port 5173, while the app is Next.js on 3000.
- `frontend/package.json` is fine; `frontend/out` is committed build output.
- There is no `GET /pay/:id` route, and `/approve` does not exist.

---

## 3. Research: how businesses actually integrate agents and payments in 2026

The market has separated into four layers. Confusing them is the most common product mistake.

| Layer | Question it answers | Standards / products | What Tanat should do |
|---|---|---|---|
| **Distribution** | Where does the agent live? | Website widget (Intercom/Crisp), React SDK, Telegram, WhatsApp Cloud API, Slack, MCP server | Ship all five behind one agent core |
| **Commerce / checkout** | What is being bought? | ACP (OpenAI + Stripe), UCP (Google + Shopify), hosted payment links | Use hosted checkout; do not invent a cart protocol |
| **Authorization** | Did a human approve this? | AP2 mandates (Google → FIDO), Stripe spend requests + approvals | Tanat's approval object is already this. Add signed mandate evidence |
| **Settlement** | How does value move? | Cards/PSPs, bank transfers, x402 (stablecoin over HTTP), MPP, NEAR Intents | Cards for mainstream; NEAR Intents for cross-chain; x402 for machine-to-machine |

Key findings from the research:

1. **The widget is still the highest-converting integration.** Every serious agent platform (ChatBotKit, Echo AI, Plet, CommB, Flowk) leads with a one-line script tag and a publishable key. It requires zero engineering and works on Squarespace, WordPress, Shopify, and a vibecoded Next.js site alike.
2. **The npm SDK is for the vibecoder, not the enterprise.** React components and hooks (`<TanatWidget />`, `useTanatChat`) plus a server client. Enterprises want headless REST + webhooks and SSO. Both matter; the SDK is the growth channel.
3. **Never collect card data inside a chat.** Every mature product sends a **hosted payment link** (Stripe Payment Links, Paystack checkout, Gr4vy Embed, or a NEAR Intents deposit page). This keeps PCI scope at zero and works identically in WhatsApp, Telegram, and web chat. CommB does exactly this with Paystack; Akua sends a PCI-compliant enrollment link.
4. **Approval must be omnichannel.** Stripe's spend requests notify the human wherever they are and release a **scoped, one-time credential only after approval**. Courier's 2026 analysis makes the operational point: send to every channel, escalate after 15 minutes, support back-and-forth. Tanat's dashboard-only approval is the weak link.
5. **Scoped credentials beat shared secrets.** Stripe issues one-time cards / Shared Payment Tokens scoped by amount, currency, merchant, and expiry; the agent never sees the raw card. Tanat's equivalent is a scoped session + approval token + per-installation cap. Publishable keys must be origin-bound and capability-limited.
6. **MCP is the new distribution surface.** Aave ships a public MCP server; Stripe hosts `mcp.stripe.com`; Gr4vy's ADK exposes storefront tools + checkout widgets to ChatGPT and Gemini. Tanat should expose an MCP server with `create_payment_link`, `get_payment_status`, `propose_refund`, and `get_order` — read-only by default, write tools approval-gated.
7. **The protocols are complementary, not competitors.**
   - **AP2** = signed proof of user intent (Intent / Cart / Payment mandates). Map Tanat approvals to this later.
   - **ACP / UCP** = agent checkout against a merchant. Use a hosted checkout; adopt ACP when selling into ChatGPT.
   - **x402** = per-request stablecoin settlement for machine-to-machine. Ideal for "agent pays for an API call / dataset / compute", not for a human buying a lamp.
   - **NEAR Intents** = cross-chain settlement and payout reach. Keep it as the settlement rail behind the checkout.
8. **Sandbox + copy-paste beats a sales call.** The winning onboarding in this category is: pick a template → paste your site → test in a preview → copy snippet. Time-to-first-message under 5 minutes.

### The recommended integration model for Tanat

Ship **one agent core, five doors**, in this order:

```
                    ┌──────────────────────────────┐
                    │        Tanat agent core       │
                    │  conversation → proposal →    │
                    │  approval → execution → audit │
                    └──────────────┬───────────────┘
        ┌──────────────┬───────────┼───────────┬──────────────┐
        │              │           │           │              │
   1-line widget   React/npm    Telegram    WhatsApp      MCP / REST
   (pk_ key)       SDK          bot         Cloud API     + webhooks
        │              │           │           │              │
        └──────────────┴───────────┴───────────┴──────────────┘
                                   │
                        Hosted payment link
                    card · bank · stablecoin · NEAR
                                   │
                     NEAR Intents / PSP settlement
```

**Why this order:** the widget converts non-technical businesses; the SDK converts vibecoders; Telegram is the cheapest true channel (a bot token, no Meta review); WhatsApp is where SMB customers actually are but has the highest setup friction; MCP is where agent-native commerce is going.

**Credential model (must ship with the widget):**

| Key | Prefix | Where it lives | Powers |
|---|---|---|---|
| Secret key | `tnt_` | server only | full API, approvals, payouts |
| Publishable key | `pk_` | browser / widget | create session, send message, read own conversation; origin-allowlisted |
| Channel secret | — | server only | verify Telegram/WhatsApp webhooks |
| Approval token | signed JWT/HMAC | link in chat/email | approve/reject one action, one time, expiring |

---

## 4. Onboarding redesign

The current flow asks for a business name and then drops the user into a console. Replace it with a five-step, value-first wizard. No wallet, no card, no KYC to start.

```
1. Business        → name, website, what you sell
2. Your agent      → name, tone, top 3 jobs (support / sales / refunds / bookings)
3. Where it lives  → Website · WhatsApp · Telegram · API  (multi-select)
4. Money rules     → currency, per-payment cap, monthly cap, approval threshold
5. Test & launch   → live preview chat → "Approve" → snippet + keys
```

Design rules:
- **Defer everything that can be deferred.** Email verification at the end, wallet/payout at first real payout, KYC before money leaves.
- **Show the product before asking for work.** Step 5 runs a real sandbox conversation with a simulated payment.
- **Give the snippet immediately.** The "aha" is seeing the widget on your own site. Include a "send me the install link" option.
- **Make limits editable.** An operator-set ceiling is fine; a support ticket to change it is not.
- **Label modes clearly:** `Test mode` vs `Live`. Real money requires verification. That is normal, not a failure.

The implemented wizard lives at `frontend/app/start` and mirrors these five steps.

---

## 5. Brand & UI direction

The current UI is a generic dark dev console: `#0a0a0f`, blue accent, emoji tabs, a `◈` placeholder. It signals "hackathon prototype", which is fatal for a product asking businesses to let an agent move money.

**Direction: "quiet confidence."** Editorial, warm, precise. The reference set (Ctrl, Aave, Sprint) shares three traits: enormous type, ruthless whitespace, and one signature color used sparingly.

- **Palette:** bone paper `#F6F3EA`, ink `#0C0D0B`, signal lime `#C9F26B`, sage `#DDE5D2`, muted `#6B7065`.
- **Type:** system sans for UI, an editorial serif for the hero's second line, monospace for labels and code. No purple gradients, no glassmorphism.
- **Logo:** "the tally" — a speech bubble whose check mark is the payment confirmation. Chat + money in one mark. Works at 16px and as a favicon.
- **Voice:** short sentences, concrete nouns, zero "revolutionise". Talk about the owner's day, not the architecture.
  - Good: "Your agent can talk. Now it can pay."
  - Good: "It proposes. You approve. Money moves."
  - Bad: "Multi-tenant agentic infrastructure with NEAR-native settlement."
- **Motion:** one hero interaction (approve a payment), subtle reveals. Nothing that blocks reading.
- **Dashboard:** keep the density, lose the jargon. "Agent", "Channels", "Payments", "Approvals". A visible mode switch (`Test` / `Live`).

---

## 6. What was built in this pass

| Area | Deliverable |
|---|---|
| Audit & strategy | this document |
| Brand | `components/brand/Logo.tsx` + favicon-ready SVG |
| Marketing site | new `/` landing page with interactive approval demo, channel switcher, code tabs, pricing, FAQ |
| Onboarding | `/start` five-step wizard with live preview and launch snippet |
| Auth | `/login` dedicated sign-in; dashboard moved to `/app` |
| Docs | `/docs` hub + `/docs/widget`, `/sdk`, `/channels`, `/api`, `/security` |
| Widget | `frontend/public/embed/tanat-widget.js` — one-line script, shadow DOM, theming, approval UI |
| SDK | `sdk/tanat` — framework-agnostic client + React bindings + README |
| Backend | publishable keys, public widget API, hosted payment page, channel webhooks (Telegram/WhatsApp), signed approval links, onboarding endpoint |

---

## 7. Rollout plan

**Next 2 weeks (make the funnel real)**
1. Publishable keys + origin allowlist + widget session tokens (backend).
2. Public widget API + hosted `/pay` page (backend + frontend).
3. Onboarding persistence endpoint + test mode.
4. Docs deploy + a 90-second demo video embedded on the landing page.
5. Move dashboard sessions to HttpOnly cookies.

**Next 30 days (make it usable everywhere)**
6. Telegram connector in production (bot token, webhook registration, approval buttons).
7. WhatsApp Cloud API with Embedded Signup; template approval for payment links.
8. Signed approval links + email/SMS fallback.
9. Business analytics: conversations, proposals, approval rate, GMV.
10. Sandbox tenants with seeded products and simulated payments.

**Next 60–90 days (make it defensible)**
11. MCP server (`mcp.tanat.app`) with read tools and approval-gated write tools.
12. AP2-compatible mandate records attached to every action; exportable evidence pack.
13. x402 endpoint for agent-to-service payments.
14. ACP checkout bridge for ChatGPT / Gemini surfaces.
15. Stripe Connect / Paystack / Flutterwave onboarding for card and local rails, with NEAR Intents for cross-chain payout.

**Guardrails that must not slip**
- No secret key in a browser bundle, ever.
- No card data touches Tanat; always hosted checkout.
- Money actions always require a human approval with separation of duties.
- Every proposal, approval, and execution is idempotent and auditable.
- Real money stays behind verification and per-tenant caps.
