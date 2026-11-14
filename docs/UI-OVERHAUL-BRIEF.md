# Tanat — UI Overhaul & Design Brief

**Purpose:** Give a design AI (or a human product designer) everything it needs to redesign Tanat without re-discovering the product. This document inventories what exists, identifies what is broken or confusing, proposes the new information architecture, specifies every screen, and defines the visual system.

**Scope of this redesign:** the marketing site, sign-in, guided setup, workspace dashboard, hosted payment link, and embeddable widget — including the new **WhatsApp, Telegram, and Slack** channel integration experience.

**Companion file:** `docs/DESIGN-AI-PROMPTS.md` contains copy-paste prompts for each surface.

---

## 0. How to use this document

1. Read Sections 1–5 for product context and the audit. Do not skip these; most bad redesigns of this product come from treating it as a generic chatbot dashboard.
2. Use Section 6 for the new navigation and page hierarchy.
3. Use Sections 7–8 as the screen-by-screen and channel-by-channel specification.
4. Use Section 9 as the visual system. Treat the tokens as law, not suggestions.
5. Paste the prompts from `DESIGN-AI-PROMPTS.md` into the design tool, one surface at a time.
6. Validate the output against Section 12 before accepting it.

---

## 1. Executive summary

### What Tanat is

Tanat is an AI-agent platform for real businesses. A business creates a workspace, describes what it sells, adds its knowledge (policies, FAQs, catalog, SOPs), and gets AI agents that answer customers and staff across channels. When an agent wants to do something consequential — refund money, book a slot, send a payment link — it proposes an action. A human approves it. Only then does anything happen.

In one sentence:

> **Tanat gives a business an AI team that knows the business, works where its customers already are, and never moves money without a human saying yes.**

### Who uses it

| Persona | What they care about | What they should never see |
|---|---|---|
| **Owner / operator** (SMB, clinic, store, agency) | "Is my assistant answering correctly? What needs my approval? Is it live?" | Tenant IDs, yoctoNEAR, API scopes, TEE attestations, MCP |
| **Team lead / support manager** | Conversation quality, handoffs, response time, escalation | Raw JSON, installation IDs |
| **Developer / technical founder** | API keys, widget snippet, webhooks, SDK, logs | Marketing fluff |
| **Tanat operator** (internal) | Tenant health, spend limits, incidents | (separate internal surface, out of scope) |

The public site speaks to the **owner**. The dashboard must speak to the **owner first**, with a developer area for the technical user. Today the dashboard speaks to the engineer.

### Current state in one paragraph

The marketing site already has a distinct, warm editorial identity (bone paper, ink, lime, Bricolage Grotesque). The dashboard inherits the palette but not the craft: it is an 11-section single-page console with developer vocabulary, dense inline styles, inconsistent status models, no channel-connection flows, no real inbox, no charts, and several broken data bindings. Onboarding is an 11-step wizard that ends in a snippet. The product's strongest idea — **"It proposes. You approve. Money moves."** — is present in the data model but not visible enough in the interface.

### Redesign thesis

> **Turn a developer console into a calm operations desk for a business owner — and make the approval moment the signature interaction of the product.**

Three moves:

1. **Humanize the language and hierarchy.** One primary job per screen. "Workspace", "Agent", "Channels", "Approvals", "Activity". No platform jargon above the fold.
2. **Make channels first-class.** A Channels hub where WhatsApp, Telegram, Slack, the website widget, and the API are equal citizens — each with a connect flow, health, routing, test, and activity.
3. **Make trust visible.** A "Needs you" queue, approval cards with rationale and risk, clear test/live modes, honest empty states, and secrets that are never re-displayed.

### Recommended visual direction

**"Quiet confidence" — editorial warmth, operational precision.**

- Bone paper, ink type, sage structure, and **one signal color (lime) reserved for human attention**.
- Big, confident page titles; disciplined 4/8px spacing; hairline borders instead of heavy shadows.
- No purple gradients, no glassmorphism, no emoji as iconography, no neon-on-black "AI" clichés.
- Marketing can be expressive (serif accents, large type, one interactive demo). The dashboard should be calm, dense where it matters, and scannable in under five seconds.

Alternative directions, if exploration is wanted:

| Direction | Feel | When to choose |
|---|---|---|
| **A. Quiet confidence** (recommended) | Editorial, warm, precise, premium | Default. Extends the current brand. |
| **B. Operator's desk** | Utilitarian, linear, high-density, keyboard-first | If power users and large teams are the priority. |
| **C. Human concierge** | Softer, sage/cream, rounded, conversational | If SMB non-technical owners are the only audience. |

---

## 2. Product model and vocabulary

Understanding these objects is required to design coherent screens.

| Backend object | What it really is | User-facing label | Notes |
|---|---|---|---|
| `tenant` | The business account / isolated workspace | **Workspace** | Never say "tenant" in UI |
| `agent` | A configured AI persona with prompt, model, tools, version | **Agent** | Lifecycle: draft → testing → live → paused |
| `installation` | An agent deployed for a workspace | **Deployment** (only in advanced contexts) | Hide behind channels; one agent can have many channels |
| `agent_channel` | A transport binding (website, WhatsApp, Telegram, Slack, API) | **Channel** | `status`: connected / pending / error / disabled |
| `knowledge_source` | Approved business content injected into the prompt | **Knowledge** | Types: policy, FAQ, website, catalog, document, text |
| `customer_memory` | Facts/preferences recalled across sessions | **Customer memory** | Scoped by workspace and external user ID |
| `session` + `messages` | A conversation and its turns | **Conversation** | Can arrive from any channel |
| `action` | A proposed consequential operation awaiting approval | **Approval request** (or "Action") | Risk, amount, expiry, approvers, audit |
| `agent_run` | One execution turn with latency/model/sources | **Activity** | Not "run" in the primary UI |
| `publishable_key` (`pk_`) | Browser-safe key bound to an installation and origins | **Website key** | Never call it "publishable" in the main UI |
| `api_key` (`tnt_`) | Server-side secret key with scopes | **API key** | Admin-only area |
| `workspace_member` | Team member with role | **Teammate** | Roles: owner, admin, operator, viewer |
| `tenant_integration` | Connected business system (Shopify, CRM, etc.) | **Integration** | Separate from messaging channels |

### Copy replacements (use these consistently)

| Instead of | Write |
|---|---|
| Tenant / tenant ID | Workspace |
| Installation / installation ID | Deployment, or omit |
| Publishable key | Website key |
| Secret key | API key |
| Action proposal | Approval request |
| Run / execution log | Activity |
| TEE Active / TEE Attested Inference | Confidential mode (with an info tooltip) |
| Agent lifecycle `published` | Live |
| `pending` approval | Needs your approval |
| MCP / llms.txt / HMAC | Developer tools (inside Developers only) |
| yoctoNEAR, account IDs, tx hashes | Only inside expandable technical details |
| "Configure agent" | "Set up" / "Edit" |
| "Deploy" | "Go live" (marketing) / "Turn on" (channel) |

---

## 3. Current experience inventory

### 3.1 Routes and surfaces

| Route | Surface | Current job | State |
|---|---|---|---|
| `/` | Marketing home | Explain product, convert to setup | Editorial, complete, but missing pricing/FAQ/social proof |
| `/start` | Guided setup | Create workspace, choose agents, knowledge, channels, test, deploy | 11 steps, long, mixed quality |
| `/login` | Sign in | Email OTP | Split-screen editorial, clean |
| `/app` | Dashboard | Manage agents, knowledge, channels, approvals, analytics, team, keys | 11 sections in one 2,399-line client component |
| `/docs` | Documentation | Integration guide | Single long page with sticky index |
| `/pay` | Hosted payment link | Show a payment intent | Read-only; no payment execution |
| `/embed/tanat-widget.js` | Website widget | Shadow-DOM chat launcher | 380×540 dark-first panel |

### 3.2 Dashboard navigation (current)

Sidebar, 248px, grouped as:

**Workspace**
- Overview
- Agents (count badge)
- Knowledge & Memory (count badge)
- Channels & Widget
- Integrations

**Operations**
- Conversations
- Approvals & Runs (pending count badge)
- Analytics

**Platform**
- Team & Members
- Developers & MCP
- Settings

Top bar: logo, workspace name, session-key hint, Guided Setup, Docs, "TEE Active" pill, Sign out.
Footer status bar: workspace name, "NEAR AI Cloud · TEE Attested Inference", API URL.

### 3.3 What each dashboard section does today

| Section | Contents | Interactions | Gaps |
|---|---|---|---|
| **Overview** | 4 stat cards (agents, conversations, knowledge/memory, pending approvals); agent list; numbered quick actions; recent activity | Create agent, install widget, jump to sections | No trends, no "what needs me", no setup progress, no channel health |
| **Agents** | Template-based create form; agent cards | Create from blueprint, open detail | Blueprint is a `<select>`, not a gallery; cards show model/version jargon |
| **Agent detail** | 8 tabs: Overview, Instructions & Behaviour, Knowledge, Tools & Permissions, Channels & Deployments, Memory, Interactive Testing, Activity & Versions | Edit prompt, set lifecycle (4 separate buttons), test chat, copy snippet | Lifecycle as four buttons; no diff/rollback; permissions are prose, not a matrix; test chat is the generic chat component |
| **Knowledge & Memory** | Add source form (type, agent scope, title, URL, content); add memory form; lists with delete | Create/delete | No file upload, no crawl, no status processing feedback, no retrieval test, no privacy controls |
| **Channels & Widget** | Website widget customizer (installation, theme, accent, position, greeting, allowed domains); embed snippets; publishable keys; channel cards | Generate key, preview widget, pause/activate | **No WhatsApp/Telegram/Slack connection UI**; cards show raw installation IDs; status enum is broken; no channel detail or inbox routing |
| **Integrations** | Catalogue cards from backend: website, REST, NEAR AI, payments, MCP, Telegram, WhatsApp, Slack, Shopify, Calendar, CRM, webhooks | "Configure connection" button | One button per card; payload does not match API; no credential forms; visually indistinguishable from channels |
| **Conversations** | Full-height generic chat: session rail, agent selector, message thread, input | New session, switch session, send | Not an inbox: no channel filter, no customer context, no assignment, no handoff, no search |
| **Approvals & Runs** | Tab 1: approvals table with filters; expandable rows; approve/reject/execute. Tab 2: activity list | Approve, reject, execute, refresh | No rationale, no source citation, no requester context, no bulk review, no channel delivery status |
| **Analytics** | 4 number cards; conversations by agent; runs by channel; actions by status as text rows | Read-only | No charts, no time range, no comparison, no funnel, no GMV/approval rate |
| **Team & Members** | Invite form (name, email, role); member list with revoke | Invite, revoke | No pending-invite state, no last active, no role explanations, no seat usage |
| **Developers & MCP** | Vibecoder prompt; HMAC token generator; links to llms.txt and MCP; **entire Settings component embedded again** | Copy, generate | Duplicated Settings; jargon-heavy; no webhook or log surface |
| **Settings** | Workspace name; NEAR wallet; spending controls; agents; API keys with scopes | Rename, create/revoke key | Spend limit is operator-only; no test/live mode; no notification preferences; no security/session surface |

### 3.4 Agent detail tabs (current)

`overview`, `instructions`, `knowledge`, `permissions`, `channels`, `memory`, `testing`, `versions`.

Eight peer tabs is too many. The redesign should consolidate to **five** (see Section 7.7).

### 3.5 Shared components today

- `Chat` — installation selector, session list, message bubbles, inline `ActionCard`, typing indicator, empty state with a `◈` glyph.
- `ActionsList` — filter chips, table, expandable detail, approve/reject/execute.
- `ActionCard` — risk badge, amount, status, expiry countdown, approve/reject/execute.
- `Settings` — five stacked sections with info grids and key management.
- Marketing: `SiteNav`, `HeroDemo` (three scenes: store, clinic, internal team), `UseCaseExplorer` (four industries), `CodeTabs` (widget, vibecoder, React).
- Brand: `Logo` ("the tally" mark) and icon primitives.

### 3.6 Backend capabilities not exposed in the UI

This matters for the redesign: **do not design around a missing backend for channels.** The API already supports:

- `POST /api/v1/onboarding/channels` — create a channel binding with config and status.
- `PATCH /api/v1/onboarding/channels/:id` — update status/config, with validation:
  - Telegram requires `bot_token`.
  - WhatsApp requires `phone_number_id` and `verify_token` (plus `access_token`, `app_secret` for full operation).
  - Slack requires `bot_token` or `signing_secret`.
- `POST /api/v1/onboarding/channels/:id/setup-telegram` — registers the Telegram webhook automatically.
- Webhook receivers for Telegram, WhatsApp, and Slack with signature verification.
- A channel-agnostic dispatcher: inbound message → session → knowledge + memory → NEAR AI inference → reply on the same channel → activity record.
- Integration catalogue with live/coming-soon states.

The frontend currently calls **none** of the channel creation/setup endpoints except a broken status toggle. The channel integration work is therefore mostly **UI and state-model work**, not greenfield backend work.

### 3.7 Current design language audit

**Strengths**
- Distinct brand: bone paper, ink, lime, Bricolage/DM Sans/JetBrains Mono.
- Marketing site is coherent and has a real point of view.
- Approval concept is visible in the hero demo.
- The logo is strong and works at small sizes.

**Weaknesses**
- **Two products in one:** warm editorial marketing vs. dense dev-console dashboard.
- **Inline-style sprawl:** hundreds of one-off style objects in the dashboard; spacing, radii, and type sizes drift (9px–13.5px labels, radii 8/9/10/12/14/16).
- **Jargon above the fold:** "TEE Active", "Agent installation", "Tenant ID", "Runs", "HMAC", "MCP", "NEAR AI Cloud".
- **Weak hierarchy:** every page starts with the same `h1 + paragraph + grid of cards`; nothing is clearly primary.
- **Status model inconsistency:** channel cards, integration cards, and approvals each invent different pills; several enum values do not match the API.
- **Emoji/glyph placeholders:** `◈`, `◆`, `◎`, `✓`, `✗`, `↗`, `⏱` used as iconography.
- **No data visualization:** analytics is a wall of numbers and text rows.
- **No motion system** beyond card hovers; GSAP exists on marketing only.
- **Mobile is an afterthought:** sidebar becomes horizontally scrolling buttons; tables are not reflowed.
- **Accessibility risks:** muted text on bone, color-only risk badges, small 9.5px labels, missing focus styles, icon buttons without labels.

### 3.8 Known functional mismatches (design around them; flag to engineering)

| # | Issue | Where | Impact on design |
|---|---|---|---|
| 1 | `AgentChannel` type expects `channel_type`; API returns `channel` | `frontend/lib/types.ts` vs `GET /onboarding/channels` | Channel cards currently show blank types |
| 2 | UI sends `active`/`paused`; API accepts `connected`/`pending`/`error`/`disabled` | `updateChannelStatus` | Pause/Activate fails with 400 |
| 3 | Integration UI sends `integration_type`/`name`; API expects `provider`/`status`/`config` | `configureIntegration` vs `POST /platform/integrations` | "Configure connection" fails |
| 4 | Integration statuses differ: UI expects `available`/`beta`; API returns `disconnected`/`awaiting_auth` | types vs backend | Pills render unknown states |
| 5 | No UI for `createChannel` / `setupTelegramChannel` despite API client support | Dashboard | The new channel hub is the missing surface |
| 6 | Channels card prints raw installation IDs | Channels section | Replace with human-readable handle + agent |
| 7 | Settings duplicated inside Developers | `page.tsx` | Split settings into its own IA |
| 8 | Hosted `/pay` page has no pay action and no rails enabled | `app/pay/page.tsx` | Show a truthful preview/test state; never fake a card form |
| 9 | Website "import" stores pending sources; no crawler exists | onboarding | Do not promise automatic crawling |
| 10 | Widget can open sessions and send messages, but cannot approve actions | public widget API | Show "Sent to your team for approval", never approval buttons in the widget |
| 11 | Dashboard session stored in localStorage/sessionStorage | `lib/api.ts` | Add clear session/security messaging; do not promise "remember me" semantics |
| 12 | Telegram webhook URL is hardcoded to `api.tanat.space` | onboarding | Display as read-only generated value |

---

## 4. UX findings, prioritised

### P0 — blocks the core job

1. **There is no "what needs me now" home.** An owner must hunt through sections to find pending approvals or a broken channel.
2. **Approvals lack decision context.** No customer, no conversation excerpt, no agent rationale, no policy citation, no risk explanation, no channel delivery status. A human cannot confidently approve money from this screen.
3. **Channels cannot be connected.** WhatsApp, Telegram, and Slack appear as catalogue cards with a generic "Configure" button, yet the product promises them on the landing page. This is the biggest credibility gap.
4. **Conversations is not an inbox.** It is a test chat. There is no unified view of real customer conversations across channels, no customer context, no handoff.
5. **The dashboard speaks engineer.** Owners are asked to understand installations, keys, TEE, runs, and scopes before they can do their job.

### P1 — blocks scale and trust

6. **No channel health or failure visibility.** A disconnected WhatsApp number should be impossible to miss.
7. **No test/live distinction.** "TEE Active" is decorative; there is no environment switch, no test data, no "this is a sandbox" state.
8. **Analytics cannot answer a business question.** No time range, trends, approval rate, containment, or cost.
9. **Knowledge management is a paste box.** No source status, freshness, coverage, or retrieval test; no file upload.
10. **Onboarding is an 11-step interrogation.** High drop-off risk; progress is technical rather than value-led.
11. **Secrets UX is unsafe/undefined.** Channel credentials need masked entry, replacement, and "never shown again" treatment.
12. **No global search, notifications, or command palette.** With 11 sections, navigation alone is the workflow.
13. **Empty, loading, and error states are inconsistent or missing.** New workspaces see empty grids instead of guidance.

### P2 — polish and differentiation

14. No dark mode strategy (and no need to ship one immediately).
15. No keyboard shortcuts or bulk actions.
16. No saved views or filters.
17. No customer-facing handoff experience from the widget.
18. No usage/billing transparency beyond a spend limit.
19. No design tokens or component library; every screen re-invents controls.
20. No onboarding checklist after signup.

---

## 5. Design principles

1. **Calm surface, loud signal.** Lime is not decoration. It marks the one thing that needs a human: a pending approval, a channel error, a setup step. If everything is highlighted, nothing is.
2. **One primary job per screen.** Every page has one dominant action and one dominant question it answers.
3. **Show the work, not the plumbing.** Show the conversation, the customer, the amount, the policy, the decision. Hide IDs, keys, models, and attestations behind "Details".
4. **Trust is a visual material.** Approval gates, risk, expiry, audit trail, and secret handling should look deliberate — not like settings.
5. **Channels are places, not toggles.** WhatsApp is a phone number with a 24-hour window and templates. Telegram is a bot handle. Slack is a workspace with channels. Design each with its native constraints.
6. **Progressive disclosure.** Owner view by default; developer detail on demand. Advanced controls never sit in the primary path.
7. **Honest states.** Test mode says test. A preview says preview. A missing integration says coming soon. Never fabricate metrics or payment success.
8. **Editorial confidence.** Big type, generous whitespace, precise alignment, few colors, no noise.

---

## 6. New information architecture

### 6.1 Sitemap

```
/                         Marketing home
/start                    Guided setup (6 steps)
/login                    Sign in (email OTP)
/docs                     Documentation hub
/pay                      Hosted payment link (preview or live)

/app                      Workspace shell
  /app                    Today (home)
  /app/inbox              Unified inbox
  /app/approvals          Approval queue  [badge]
  /app/agents             Agent roster
  /app/agents/[id]        Agent detail
  /app/knowledge          Knowledge & memory
  /app/channels           Channel hub
  /app/channels/[id]      Channel detail
  /app/integrations       Business integrations
  /app/analytics          Analytics
  /app/team               Team & roles
  /app/developers         Developer tools
  /app/settings           Workspace settings
```

> The current app is a single client component with local section state. The redesign should present a real route hierarchy to the design AI so it can design deep links, breadcrumbs, and browser-back behavior. The implementation can migrate incrementally.

### 6.2 Sidebar (recommended)

```
[Logo]  Workspace name ▾            [Search]  [Bell]  [Avatar]

WORK
  Today
  Inbox                      12
  Approvals                   3   ← lime badge, only when > 0

BUILD
  Agents                      2
  Knowledge

REACH
  Channels                    3
  Integrations

MEASURE
  Analytics

ADMIN
  Team
  Developers
  Settings
```

- Keep the count badges only where they answer "do I need to act?".
- Collapse "Approvals" into the "Today" page as a module **and** keep a dedicated queue; the badge is the persistent signal.
- On mobile: bottom navigation with Today, Inbox, Approvals, Agents, More. The sidebar becomes a full-height drawer.

### 6.3 Global shell

**Top bar (56–64px):**
- Left: logo, workspace switcher (name + chevron), environment pill (`Test` / `Live`).
- Center: global search / command palette trigger (`⌘K`) — "Search agents, conversations, customers…".
- Right: "Test agent" quick action, notifications bell with unread dot, help menu, avatar menu (profile, docs, sign out).

**Page header pattern:**
- Eyebrow (optional, mono, 11px): section name.
- Title (32–40px, Bricolage Grotesque).
- One-sentence description (14–16px, muted, max 68ch).
- Right-aligned primary action + secondary actions.
- Optional filter row / tabs directly below.
- No decorative cards above the fold.

**Content width:** 1180–1280px for dashboards; 720px for reading (docs, forms); full-width split panes for inbox.

**Footer:** replace the current technical status bar with a slim, non-sticky workspace footer: "Tanat · Confidential inference · Status: All systems operational". Move API URL into Developers → Diagnostics.

---

## 7. Screen-by-screen redesign brief

### 7.1 Marketing home `/`

**Job:** Make a non-technical owner believe they can have a working AI assistant today, and that it will not do anything reckless.

**Keep:** the editorial identity, the three-scene demo, the use-case explorer, the code tabs, the final CTA.

**Fix:** the page currently says "website, WhatsApp, or Telegram" but the dashboard cannot connect the latter two. The redesign should introduce all three channels with honest status labels ("Available", "Setup required", "Beta").

**Recommended structure:**

1. **Hero** (split 7/5)
   - Eyebrow: "AI assistants for real businesses"
   - H1: "Put an AI assistant on your business **in 3 minutes.**" (serif italic on the second line)
   - Lede: knows your business, remembers customers, works on website / WhatsApp / Telegram / Slack, asks before it acts.
   - Three proof points with check marks.
   - Primary CTA "Set up your assistant"; secondary "See how it works".
   - Micro-trust: "Free to start · No coding · Live in 3 minutes".
   - Right: interactive approval demo (store / clinic / team scenes) with channel switcher.
2. **Trust strip:** "Works with" — Website, WhatsApp, Telegram, Slack, Shopify (coming soon), REST API. Monochrome marks; no fake customer logos.
3. **Problem → outcome** (three columns): "Answers the same question 40 times" → "Answers instantly, cites your policy"; "Forgets returning customers" → "Remembers them"; "You're afraid it will send money" → "It asks first".
4. **How it works** — 3 steps, each with a real UI fragment: business profile, rules, go live.
5. **Channel section** — four cards (Website, WhatsApp, Telegram, Slack) with a one-line setup promise and an honest badge. This is where the new integrations get marketed.
6. **Approval moment** — a full-bleed editorial section: chat excerpt → approval card → receipt. Copy: "It proposes. You approve. Money moves."
7. **Use-case explorer** — keep and refine (retail, clinic, agency, internal team).
8. **Integrations / code** — keep code tabs; add "Works with your AI builder" row (Cursor, Lovable, Bolt, v0).
9. **Security & governance** — three plain-language promises: human approval, tenant isolation, confidential inference. No TEE jargon above the fold.
10. **Pricing** — if pricing exists; otherwise "Free to start" + contact. Do not invent tiers.
11. **FAQ** — 6 questions, including "Can it refund customers?", "What happens on WhatsApp?", "Do I need a credit card?".
12. **Final CTA + footer.**

**Visual notes:** bone background; ink type; lime only on CTAs and the "you decide" pill; use the serif for one phrase per section; generous 96–140px vertical rhythm; demo card is the only dark object on the page.

**Do not:** use stock robot imagery, purple gradients, "revolutionize", or imply the agent can move money without approval.

---

### 7.2 Sign in `/login`

**Job:** Get a returning owner into their workspace with zero friction.

**Current:** split screen, ink art panel with quote, bone form. Good bones; refine.

**Redesign:**
- Left panel (40%): logo, one confident sentence, three proof points, a small live approval vignette (not a static quote).
- Right panel (60%): "Welcome back", email field, "Email me a code", then a six-digit OTP input with `inputmode=numeric`, auto-advance visual, resend timer, "Use a different email".
- States: sending, code sent with masked email, verifying, invalid/expired code, rate-limited, network error.
- Add "New to Tanat? Set up your business" link.
- Accessibility: label + description for the code field; `autocomplete="one-time-code"`; announce errors with `aria-live`.

---

### 7.3 Guided setup `/start`

**Job:** Turn a curious owner into a live agent with the shortest possible path to "I saw it work".

**Current:** 11 steps — Welcome, Business Info, AI Goals, Recommend Agents, Configure Agent, Knowledge, Channels, Permissions, Test, Deploy Summary, Workspace Ready. All in one card, with a left rail of step labels and a progress bar.

**Problems:** too many steps; every step looks the same; no live preview until the end; channel selection promises connectors that cannot be configured; email verification interrupts value; the left rail becomes a 11-item table of contents.

**Recommended: 6 steps.**

| Step | Title | What the user does | Design notes |
|---|---|---|---|
| 1 | **Welcome** | One value sentence, "Takes ~3 minutes", start | Optional email capture inline: "Save your progress" — never block the first step |
| 2 | **Your business** | Name, industry, one-sentence description, website (optional), country/timezone | Two-column form; industry as a visual grid of 8 icons, not a select; description with examples |
| 3 | **What should it handle?** | Pick 2–4 jobs from grouped capability cards (answer questions, qualify leads, bookings, refunds, internal help) | Multi-select cards with check state; show recommended agent badges; continue is disabled until one is chosen |
| 4 | **Meet your agent** | Name, tone (6 visual chips), top responsibilities, "never do" rules, escalation rule, welcome message | Right-side live phone/chat preview that updates as they type; "Use recommended" defaults |
| 5 | **Teach it your business** | Paste policies/FAQs, add FAQ pairs, add website URL; skip allowed | Show source cards with status "Ready to add"; no fake crawl; primary action "Add knowledge", secondary "Skip for now" |
| 6 | **Go live** | Choose channels (Website, WhatsApp, Telegram, Slack, API), permissions summary, test chat, deploy | Two-pane: config left, live sandbox right; test 3 suggested prompts; then deploy → snippet + "what happens next" |

**Cross-cutting rules:**
- Left rail: 6 steps with completion checks, not 11 labels. On desktop, show a compact vertical stepper; on mobile, show "Step 3 of 6" + progress line.
- Autosave every step; "Saved" indicator; "Finish later" returns to the same step.
- Each step has exactly one primary button; back is a text button.
- Email verification: allow browsing and testing before verification; require it only to persist/deploy. If backend requires auth, make verification a lightweight inline gate at step 1 or step 6, not a wall.
- Channel step: selecting WhatsApp/Telegram/Slack creates a **pending** channel and routes the user to the connect flow after deploy. Do not imply the channel is live.
- Deploy success: confetti is not the vibe. Show a calm receipt: "Your agent is live on your website", snippet with copy, "Connect WhatsApp next", "Open workspace".
- Empty/error states: inline, specific, with a fix action.

---

### 7.4 Workspace shell

**Job:** Orient the user in one glance and make the next action obvious.

**Top bar:** as specified in 6.3. Add a **Test / Live** segmented control. Test mode adds a subtle diagonal-stripe or sage tint to the page background and a persistent "Test mode — no real messages or money" banner. Live mode is the default only after the workspace has a connected channel.

**Sidebar:** as specified in 6.2. Active item uses ink fill with bone text (keep), but add a lime 3px left marker only for the item that needs attention (Approvals when count > 0). Never use lime for the whole active state.

**Notifications:** a right-side drawer, grouped by "Needs you", "Channel issues", "Completed". Each row deep-links to the object. Mark all read. No toast-only notifications for consequential events.

**Command palette (`⌘K`):** search pages, agents, conversations, customers, and actions. Actions: "New agent", "Connect channel", "Test agent", "Invite teammate", "Copy widget snippet".

**Profile menu:** workspace switcher, profile, docs, "What's new", sign out. Session security note: "Signed in on this device".

---

### 7.5 Today (Overview) `/app`

**Job:** Answer "Is everything okay, and what needs me right now?"

**Current:** four stat cards, agent list, numbered quick actions, recent runs.

**Redesign:**

1. **Greeting + status line** — "Good morning, Ada." + "Your team handled 128 conversations yesterday. 3 approvals need you." (Only if data exists; otherwise a setup line.)
2. **Needs you now** (the hero module, 60% width):
   - Pending approvals: count + the top 2 cards inline (customer, amount, risk, expiry), "Review all →".
   - Channel alerts: "WhatsApp needs reconnection" with "Fix now".
   - Knowledge failures: "2 sources failed to process".
   - If empty: a calm "You're all caught up" with a small illustration and the next best action.
3. **Setup checklist** (if incomplete): 5 steps — business profile, knowledge, agent tested, channel connected, first approval. Progress ring; dismissible; disappears at 100%.
4. **KPI row** (4): Conversations (7d) with sparkline; Median first response; Approval rate; Spend this month. Each with delta and "vs previous 7 days"; show "—" with "Not enough data yet" instead of fake numbers.
5. **Your agents** — 2–4 rows: avatar/initial, name, live status, channel chips, conversations 7d, approval rate, "Open".
6. **Channel health strip** — one row per channel: icon, handle, status, last message, 7-day volume, action. Errors sort first.
7. **Recent activity** — compact feed: "Agent proposed a $145 refund · 2m ago · Website" with status pill; "View all →".

**Density:** comfortable. Maximum 2 columns below the hero. No more than 7 modules.

**Empty workspace:** replace all modules with a single guided card: "Let's get your first agent live" + 3 steps + "Start setup". Hide KPI row until there is data.

---

### 7.6 Agents list `/app/agents`

**Job:** See the team of agents, their health, and where they work.

**Redesign:**
- Header: "Agents" + "New agent".
- Filter row: All / Live / Draft / Paused; search.
- **Gallery of cards** (3 across at 1440px): name, one-line purpose, lifecycle pill (Live/Draft/Paused), model hidden, channel chips, 7-day conversations, approval rate, last edited, overflow (Edit, Duplicate, Pause, Archive).
- **Create flow:** modal or full page with a **blueprint gallery** grouped by category (Customer, Internal, Knowledge, Custom). Each card: name, tagline, "Best for", suggested channels, "Use blueprint". A "Start from scratch" card. This replaces the `<select>`.
- Empty state: "No agents yet" + blueprint gallery preview + "Create your first agent".

**Agent card anatomy:** 12px icon tile, name (16/600), purpose (13/muted, 2 lines max), lifecycle pill top-right, channel chips row, a thin divider, 2 metrics + "Open →".

---

### 7.7 Agent detail `/app/agents/[id]`

**Job:** Configure one agent with confidence, test it, and see where it is live.

**Header:**
- Back link, agent name + lifecycle pill, one-line purpose.
- Primary: "Test agent". Secondary: "Go live" / "Pause". Overflow: Duplicate, Archive.
- Meta row: last edited, version, "Used in 3 channels".
- A **lifecycle stepper** (Draft → Testing → Live → Paused) is status, not four action buttons. Changing state opens a small confirmation with impact copy.

**Tabs (5, not 8):**

| Tab | Contains | Notes |
|---|---|---|
| **Overview** | Summary, channels, knowledge coverage, recent conversations, quick actions | Default; answers "what is this agent doing?" |
| **Build** | Role description, tone, system instructions, responsibilities, never-do rules, escalation, welcome message | Merge current Instructions + parts of Permissions; structured fields first, raw prompt in an "Advanced" disclosure; live preview panel |
| **Knowledge** | Sources used by this agent, add/attach, retrieval test | Reuse knowledge components; show "12 sources · 3 used in last 7 days" |
| **Capabilities** | Tools & permissions matrix; spend caps; approval rules | Readable rows: capability / allowed / approval required / restricted; no prose blobs |
| **Deploy & test** | Channel bindings + embed snippet + sandbox chat + version history | Split: left channels, right test chat; versions as a timeline below |

**Build tab layout:** form left (60%), sticky preview right (40%). The preview is a chat panel with the agent's greeting, a sample customer question, and a proposed action. Updating tone/rules updates the preview. "Save & publish" creates a version; a small "View changes" link opens a diff drawer.

**Capabilities matrix:** columns Capability | Allowed | Needs approval | Restricted. Rows: search knowledge, recall customer memory, capture lead, draft reply, issue refund, send payment link, change settings, access another workspace. Use icons + text, not color alone. Spend cap shows "Workspace cap: $500/month · $120 used" with an explanation of who can change it.

**Test panel:** sandbox label, suggested prompts as chips, message thread, "Sources used" collapsible, latency/model in a technical details disclosure, "This is a test — no customer sees it". Include a "Reset conversation" action.

**Versions:** vertical timeline with version number, change summary, author, timestamp, "View diff", "Restore". Do not claim rollback unless backend supports it; label "Restore as new version" if not.

---

### 7.8 Knowledge & memory `/app/knowledge`

**Job:** Make the agent trustworthy by showing what it knows, how fresh it is, and what it remembers about customers.

**Structure:** two primary tabs — **Knowledge** and **Customer memory** — with a summary header.

**Knowledge tab:**
- Header: "Knowledge" + "Add knowledge".
- Summary chips: sources, ready, processing, failed, last updated.
- Filter row: All / Policies / FAQs / Catalog / Documents / Website / Notes; agent filter; search.
- **Table or list** (not cards): title, type icon + label, scope (All agents / one agent), status pill, last updated, used-in count, overflow (Preview, Re-index, Remove).
- Empty state: three ways to add — "Paste text" (primary), "Add FAQ pairs", "Upload a document". Website import is labelled "Beta — stores a reference, does not crawl" unless a crawler ships.
- **Add knowledge drawer** (right side, 520px): tabs Paste / FAQ pairs / File / Website; title, scope, content; a live "What the agent will see" preview; "Add source".
- **Source detail drawer:** content preview, metadata, status timeline, "Used by" agents, "Test retrieval" (ask a question, show matching excerpts), Delete with confirmation.
- **Processing states:** Pending (queued), Processing (spinner + progress), Ready (green check), Failed (reason + Retry). Never show a dead "processing" forever.

**Customer memory tab:**
- Search by customer; list with customer identifier, memory count, last seen, channels.
- Customer detail: memory facts grouped by type (identity, preferences, context, history), confidence, source conversation, "Forget" per item, "Export" / "Delete customer data" (privacy).
- Empty state: "Memories appear here after a customer conversation."
- Explain in one line: "Tanat remembers facts to improve service. You can inspect or delete them at any time."

---

### 7.9 Channels hub `/app/channels`

**This is the centrepiece of the new work.**

**Job:** See every place the agents talk to people, connect a new one, and know instantly if something is wrong.

**Header:** "Channels" + primary "Connect channel".
**Summary strip:** Connected 3 · Needs attention 1 · Messages (7d) 1,284 · Avg response 3.2s. Use small sparklines, not big cards.

**Filter tabs:** All · Website · WhatsApp · Telegram · Slack · API. Counts per tab.

**Channel cards** (2 columns at 1440, 1 at 768):
- Top row: channel mark (16–20px, brand-neutral container), channel name ("WhatsApp Business"), status pill (`Connected`, `Needs attention`, `Not connected`, `Paused`), overflow menu.
- Handle line: "WhatsApp · +1 415 ••• 8842" / "Telegram · @acme_support_bot" / "Slack · Acme workspace" / "Website · acme.com" / "API · 2 keys".
- Agent line: "Agent: Store Assistant" with a small avatar.
- Health line: last message time, 7-day message count, error message if any.
- Primary action: "Manage" when connected; "Connect" when not; "Fix connection" when error.
- Secondary: "Test" (send a test message), "Pause".
- Never show installation IDs, tenant IDs, or raw config.

**Sections:**
1. **Needs attention** (only when errors) — a full-width alert card with the channel, error, "Fix now", and "What happened" disclosure.
2. **Connected channels** — cards as above.
3. **Available channels** — dimmed/outlined cards: Shopify, Email, Teams, Google Calendar, CRM (coming soon), with "Notify me" or "Coming soon".
4. **Website widget** — a dedicated expandable panel (because it has more controls): live preview, theme (light/dark), accent color, position, greeting, allowed domains, embed snippet with copy, managed website keys. Keep this on the hub or move to a "Website" channel detail; do not bury it in a generic card.
5. **Channel activity** — a compact table of recent inbound messages across channels with channel, customer, agent, status, time; link to Inbox.

**Connect channel flow (shared shell):**

A right-side drawer (or full-page wizard on mobile), 4 steps:

1. **Choose channel** — 4 large cards: Website, WhatsApp, Telegram, Slack; each with "Best for", setup time, what you need. Shopify/Email marked coming soon.
2. **Choose agent & name** — select agent (default: primary), connection name (e.g., "Support on WhatsApp"), optional allowed teams/channels.
3. **Connect** — channel-specific credential form (see Section 8). Include a "What you'll need" prep panel, inline help links, and a "I don't have this yet" path that saves a draft.
4. **Route, test & activate** — routing rules, approval notifications, business hours; "Send test message" with success/failure; "Activate channel".

**Persistent elements:** step indicator (4 dots), "Save & finish later", help link, security note ("Credentials are encrypted and never shown again"), and a summary at the end.

**Status model (UI):**

| UI status | Meaning | Backend | Color |
|---|---|---|---|
| Not connected | No binding yet | — | neutral |
| Setup in progress | Draft saved, credentials missing | `pending` | amber outline |
| Verifying | Testing credentials/webhook | `pending` | amber pulse |
| Connected | Healthy, recent traffic | `connected` | green dot |
| Needs attention | Error, auth expired, webhook failing | `error` | red/amber |
| Paused | Intentionally off | `disabled` | gray |
| Coming soon | Not available | — | muted |

**Empty state:** a single panel: "Connect your first channel" with the four channel cards and "Start with your website — it takes 30 seconds." Plus "Not sure? Test an agent first."

---

### 7.10 Channel detail `/app/channels/[id]`

**Header:** channel mark + name, handle, status pill, agent, actions (Test, Pause, Disconnect, overflow).
**Tabs:** Overview · Setup · Routing · Activity.

**Overview:**
- Health card: status, last message, webhook health, credential expiry (if known), "Run health check".
- 7-day volume sparkline by day; messages, conversations, median response, handoffs.
- Recent conversations list (deep-link to Inbox).
- "What this channel can do" — capabilities and limits (e.g., WhatsApp 24-hour window, Slack threads).

**Setup:**
- Credentials: masked values, "Replace", "Last verified".
- Webhook URL with copy (read-only).
- Channel-specific configuration: phone number / bot handle / Slack channels / allowed origins.
- Danger zone: pause, disconnect (with confirmation and impact: "Customers will no longer reach this agent on WhatsApp. Conversations remain in Inbox.").

**Routing:**
- Assigned agent.
- Which conversations to accept (DMs only / all / selected Slack channels / allowed domains).
- Business hours + after-hours behavior (still answer / handoff / collect details).
- Human handoff destination (team email or Slack channel; no fake integrations).
- Approval notifications: where to send approval requests (in-app + this channel + email), escalation after N minutes.

**Activity:**
- Table of messages/runs: time, customer, direction, status, tokens/latency in a technical disclosure; filter by errors.
- Export CSV (if available) or "Copy IDs".

---

### 7.11 Inbox `/app/inbox`

**Job:** Give the team one place to see and steer real conversations from every channel.

**Layout (3 panes at ≥1280px):**

1. **Left rail (72–88px):** channel filters with icons and unread counts: All, Website, WhatsApp, Telegram, Slack. Below: saved views — "Needs a human", "Assigned to me", "Unresolved", "Closed".
2. **Conversation list (320–360px):** search; sort (Newest / Longest waiting); rows: channel icon, customer name/handle, last message preview, time, status dot (AI handling / needs human / resolved), assignment avatar. Selected row has ink-tinted background and a lime left marker only if it needs a human.
3. **Thread (flex):** header with customer, channel, agent, status, actions (Assign, Take over, Resolve, More). Messages: channel-native styling but consistent bubbles; timestamps; agent name; "Sources used" chips under assistant messages; inline approval cards with status ("Waiting for approval", "Approved", "Executed") and a link to the approval.
4. **Context panel (320px, collapsible):** customer profile (external ID, channel handle), memory facts, sessions count, actions in this conversation, sentiment/tags if available. No fabricated order data.

**Composer:** text input, send; "Take over" switches from AI to human (design the state clearly: "You're replying as Ada — the agent is paused for this conversation"); "Return to agent"; canned responses (optional); attachment is out of scope unless backend supports it.

**States:**
- Empty inbox: "No conversations yet. Connect a channel or test your agent."
- No search results: clear query.
- Loading: skeleton rows, not a spinner.
- Error: retry.
- Mobile: list → thread with back; context becomes a bottom sheet.

**Important:** do not present the existing test chat as the inbox. The test chat belongs inside the agent detail ("Test") and in setup. The inbox is for real channel traffic.

---

### 7.12 Approvals `/app/approvals`

**Job:** Let a human confidently approve or reject a consequential action in under 30 seconds.

**Layout:** split view (queue + detail). On mobile, list → detail.

**Left queue (360px):**
- Tabs: Needs me · All pending · Scheduled · History.
- Filters: risk (low/medium/high/critical), channel, amount, agent.
- Rows: risk marker (not color alone: icon + label), title ("Refund $145.00"), customer, agent + channel, age, expiry countdown. Selected state.
- Bulk selection only for same-type, low-risk actions, with a confirmation that names every action. Never one-click bulk approve for money.

**Detail (right):**
1. **Header:** action title, status pill, risk pill, expiry countdown ("Expires in 12m" with a progress ring).
2. **The ask:** amount + currency large; recipient; order/customer reference; action type in plain language.
3. **Why:** the agent's rationale, quoted from the conversation, with a link "View conversation".
4. **Evidence:** policy/source citations used ("Return Policy §3 · 30-day damage cover"), knowledge chips. If no source, say "No policy source cited" in a warning style.
5. **Conversation excerpt:** 3–5 messages, collapsed with "Show full conversation".
6. **Governance:** required approvals (1 of 2), who proposed, who must approve, separation-of-duties note, idempotency and audit note in a disclosure.
7. **Channel delivery:** "Sent to #approvals in Slack · Delivered 2m ago" or "In-app only".
8. **Actions:** primary "Approve" (ink), secondary "Reject" (outline), tertiary "Ask a question" (opens a note). A confirmation sheet for approve: summary, amount, recipient, "This will move money" + "Approve" / "Cancel". Reject requires an optional reason.
9. **After approval:** status changes to "Approved — ready to execute"; if execution is automatic, show "Executing…" then a receipt with tx hash in a disclosure. If execution is manual, show "Execute" with the same care.
10. **Audit trail:** vertical timeline: proposed → notified → approved/rejected → executed/failed, with actor, time, channel.

**History:** table with filters, search, export; row opens the same detail in read-only mode.

**Empty state:** "Nothing needs your approval." + "When an agent wants to refund, book, or pay, it will appear here." + "See how approvals work" link.

---

### 7.13 Analytics `/app/analytics`

**Job:** Answer "Is this working, and what should I change?"

**Header:** title, date-range selector (7d / 30d / 90d / custom), compare toggle, export.

**KPI row (5):** Conversations, Resolved without handoff (containment), Median first response, Approval rate, Spend (with token usage in a disclosure). Each: value, delta vs previous period, sparkline; "Not enough data" when applicable.

**Charts:**
1. **Conversations over time** — stacked area/line by channel (Website, WhatsApp, Telegram, Slack). Legend + accessible table toggle.
2. **Where conversations end** — resolved by AI / handed to human / abandoned / waiting, as a horizontal stacked bar.
3. **Approvals** — proposed vs approved vs rejected vs expired over time; approval rate; median time to approve.
4. **Response time** — p50/p90 line.
5. **Top questions / topics** — ranked list with counts and a "knowledge gap" flag when no source was cited. Only if topic data exists; otherwise show "Topic clustering not enabled".
6. **Agent performance** — table: agent, conversations, containment, approval rate, median latency, last active.
7. **Spend** — tokens and money over time; by agent/channel. No invented pricing.

**Empty state:** "Analytics will appear after your first conversation" + "Test your agent" CTA.

**Design notes:** charts use ink/lime/sage + one channel color each; no rainbow; gridlines hairline; labels 11px mono; tooltips with exact values; every chart has a text summary for screen readers.

---

### 7.14 Team `/app/team`

**Job:** Manage who can do what.

- Header + "Invite teammate".
- Seat summary: "4 of 5 seats used" (only if plan data exists).
- **Members table:** avatar/initials, name, email, role pill, status (Active/Invited/Suspended), last active, overflow (Change role, Remove). Owner row is locked.
- **Role explainer cards** above or in an info popover: Owner (everything, billing), Admin (agents, channels, keys), Operator (inbox + approvals), Viewer (read-only).
- **Invite drawer:** email, name, role cards with permission bullets, personal note, "Send invite". Pending invites show "Resend" and "Cancel".
- Remove confirmation explains what happens to their assignments and approvals.
- Empty state: "You're the only one here" + invite.

---

### 7.15 Developers `/app/developers`

**Job:** Give technical users everything without polluting the owner experience.

**Tabs:** Quickstart · API keys · Webhooks · Widget & SDK · Verified identity · MCP · Diagnostics.

- **Quickstart:** 3-step code path (create session, send message, handle approval) with language tabs (cURL, Node, Python); copy buttons; "Copy a prompt for Cursor / Lovable / Bolt / v0" card.
- **API keys:** table (name, prefix, scopes, created, last used, status), "Create key" drawer with scope checkboxes and plain-language descriptions; one-time reveal modal with copy + "I've saved it".
- **Webhooks:** endpoint URL, signing secret, event subscriptions, recent deliveries with response codes, "Send test event".
- **Widget & SDK:** embed snippet, npm install, React component, theming props, allowed origins; link to docs.
- **Verified identity:** explain HMAC signing, a generator (user ID → signature), and a copyable example. Keep this advanced and clearly labelled.
- **MCP:** manifest URL, available tools, example client config, read-only vs approval-gated tools.
- **Diagnostics:** API base URL, environment, workspace ID, session info, "Copy diagnostics" (useful for support).

Move all developer-ish settings out of the general Settings page.

---

### 7.16 Settings `/app/settings`

**Job:** Configure the workspace without wading through developer content.

**Sub-navigation (left or top tabs):** Workspace · Members · Billing & usage · Notifications · Security · Danger zone.

- **Workspace:** name, slug (read-only with copy), timezone, locale, logo upload (if supported), default agent.
- **Members:** link to Team (avoid duplicate member management).
- **Billing & usage:** plan, spend cap, current usage, payment method (only if a billing rail exists), invoices. **Do not fake controls.** If the spend limit is operator-controlled, show it read-only with "Request a change" and explain why.
- **Notifications:** approval requests (in-app, email, Slack, WhatsApp, Telegram), channel errors, weekly digest, product updates. Channel options only appear if that channel is connected.
- **Security:** active sessions (device, location, last active, revoke), sign-in method, audit log link, "Sign out everywhere".
- **Danger zone:** transfer ownership, delete workspace (type the workspace name to confirm).

---

### 7.17 Hosted payment `/pay`

**Job:** Let a customer pay a business safely, or understand the status of a payment request.

**Truthful states:** The current backend exposes payment intents but live rails are not enabled. The redesign must clearly distinguish:

1. **Preview / test mode** — "Payment link preview. This is a test — no money will move." No card fields. Show amount, merchant, description, status, expiry, and a disabled "Pay" with an explanation.
2. **Live** (when rails ship) — amount, merchant identity, line item, currency, payment method selection, secure hosted fields/redirect (never card inputs inside Tanat), terms, pay button, processing, success receipt, failure/retry, expired link.

**Layout:** centered 460px card on bone; logo; merchant name; amount; description; status; security note; support link. Success: receipt with amount, merchant, reference, timestamp, "Done". Error: plain-language reason + "Contact merchant".

**Do not:** invent card forms, fake a successful payment, or hide test mode.

---

### 7.18 Website widget

**Job:** Give visitors a fast, trustworthy answer without breaking the host site.

**Current:** 380×540 shadow-DOM panel, dark by default, lime accent, launcher bottom-right, sources chips, no approval UI.

**Redesign:**
- Launcher: 56px rounded square with the tally mark; subtle hover lift; badge dot for unread; accessible label.
- Panel: 380×560; header with agent name + business name + online dot + close; greeting bubble; message list; composer; footer "Powered by Tanat" (small, removable on paid plans if applicable).
- **Channel-native feel:** for WhatsApp/Telegram, the widget is not used — but the widget should still feel like a chat, not a form.
- **Approval state:** if the agent proposes an action, show a card: "Refund request sent to the team — you'll get an update here." Do **not** show Approve/Reject in the widget (publishable keys cannot approve). If a signed approval link is opened, show a dedicated confirmation page, not the widget.
- **Theming:** light default; dark option; accent color; position; greeting; border radius; font inherits host or uses Tanat sans. Ensure contrast for any accent.
- **States:** loading skeleton, empty greeting with 3 suggested questions, typing, error with retry, offline, handoff ("A teammate will reply by email"), closed (business hours).
- **Accessibility:** focus trap, ESC to close, `aria-live` for new messages, keyboard send, reduced motion, 44px targets.
- **Privacy:** a one-line "By chatting you agree to our terms" only if legal requires; no cookie banner inside the widget.

---

### 7.19 Docs `/docs`

**Job:** Get a developer or vibecoder from zero to a working integration.

**Current:** single long page with a sticky index and code blocks.

**Redesign:**
- A real docs shell: left nav with sections (Getting started, Channels, Widget & SDK, API, Webhooks, Security, Changelog), content column 720px, right "On this page".
- **New channel guides** are required: WhatsApp setup, Telegram setup, Slack setup — each with prerequisites, screenshots placeholders, credential walkthrough, webhook URL, test, troubleshooting.
- Search, copy buttons, language tabs, callouts (info/warning/success), "Was this helpful?".
- Keep `/llms.txt` and MCP links prominent for AI builders.
- Code blocks: ink background, bone text, lime for strings/comments only, line numbers optional.

---

## 8. Channel integration design specification (WhatsApp · Telegram · Slack)

### 8.1 Shared model

A channel is a **place where an agent works**. It is not a toggle and not an integration card.

Every channel shares these concepts:

| Concept | Design requirement |
|---|---|
| **Agent assignment** | One agent per channel binding (backend model). Show agent name + avatar; allow change with a confirmation. |
| **Status** | Not connected → Setup in progress → Verifying → Connected → Needs attention → Paused. |
| **Credentials** | Entered once, masked thereafter, replaceable; never displayed in full. |
| **Webhook URL** | Generated, read-only, copyable, with a "Test webhook" action. |
| **Routing** | Which conversations to accept, business hours, human handoff, approval notifications. |
| **Test** | Send a real test message through the channel; show delivery success/failure and latency. |
| **Activity** | Last message, 7-day volume, errors, recent conversations. |
| **Permissions** | Only Owner/Admin can connect or replace credentials; Operators can pause/test and approve. |
| **Disconnect** | Confirmation, impact statement, choice to keep or archive conversation history. |

### 8.2 Telegram

**What it is:** a bot handle customers can message directly or in groups.

**Connect flow (step 3):**
1. Prep panel: "You'll need a Telegram bot. It takes about 2 minutes in BotFather."
2. Fields:
   - **Bot token** (secret, paste, reveal toggle) — required.
   - **Webhook secret** (optional, generate a random value; must be sent as `X-Telegram-Bot-Api-Secret-Token`).
3. Helper: step-by-step BotFather instructions with copyable commands (`/newbot`, `/setcommands`).
4. "Register webhook automatically" — calls the setup endpoint; show spinner, then success with the webhook URL and bot username.
5. Manual fallback: webhook URL `https://api.tanat.space/api/webhooks/telegram/{channelId}` with "Copy".
6. Test: "Open @yourbot and send 'hello'" + a "Send test message" action that uses the channel.

**Routing options:**
- Accept DMs only / DMs + groups / selected group IDs.
- Reply in threads? (Telegram topics) — only if supported; otherwise hide.
- Approval notifications: send approval cards with inline buttons to a chosen chat ID; note that approval buttons require a signed link and role check.
- Command menu: `/start`, `/help`, `/agent`, `/human`.

**Channel detail additions:** bot handle, member count (if available), webhook status, last update, commands list, "Open in Telegram" deep link.

**Copy:** "Your agent answers as @acme_bot. Customers can message it directly or add it to a group."

**Edge cases:** invalid token, webhook already set to another URL, bot removed from group, token revoked, duplicate bot, group privacy mode.

### 8.3 WhatsApp

**What it is:** the business's official WhatsApp number via Meta's Cloud API.

**Connect flow (step 3):**
1. Prep panel: "You'll need a Meta Business account, a WhatsApp Business phone number, and a permanent access token." Link to Meta docs. Offer "Help me set this up" with a checklist (not a fake embedded signup unless it exists).
2. Fields:
   - **Phone number ID** — required.
   - **WhatsApp Business Account ID (WABA ID)** — optional but recommended.
   - **Permanent access token** — secret, required for replies.
   - **App secret** — secret, recommended; used to verify `X-Hub-Signature-256`.
   - **Verify token** — generate + copy; required for Meta webhook verification.
   - **Display phone number** — optional, for confirmation.
3. Webhook URL: `https://api.tanat.space/api/webhooks/whatsapp/{channelId}` — copy, plus "Verify webhook" action that explains Meta's challenge.
4. Test: send a template or a session message to a test number. Show Meta error messages in plain language ("The 24-hour window is closed; use an approved template").
5. **Template management:** list approved templates (name, language, category, status), "Submit template" (if supported), and which events use them (payment link, approval request, follow-up). If not supported, show "Templates are managed in Meta Business Manager" with a link — do not fake a template builder.

**Routing options:**
- Accept all messages / only opted-in customers (compliance note).
- Business hours + after-hours behavior.
- Human handoff: "Notify a teammate" (email/Slack) and "Pause the agent for this chat".
- Approval notifications via WhatsApp template to the owner's number.
- **24-hour window** indicator in the conversation thread: "Session open · 18h left" or "Window closed — template required".
- Opt-in/opt-out handling: show status on the customer profile; "Stop" must be honored.

**Channel detail additions:** verified business name, display number, quality rating (if available), messaging limit tier, template health, webhook status.

**Copy:** "Connect your official WhatsApp number. Customers message you as they normally would; your agent replies using approved templates when the 24-hour window is closed."

**Edge cases:** token expired, phone number not verified, webhook verification failure, template rejected, customer opted out, number quality flagged, duplicate number.

### 8.4 Slack

**What it is:** an internal assistant for employees inside Slack.

**Connect flow (step 3):**
1. Prep panel: "You'll need permission to install apps in your Slack workspace."
2. Preferred: **"Add to Slack" OAuth button** (if implemented). If not, manual fields:
   - **Bot token** (`xoxb-…`, secret) — required for replies.
   - **Signing secret** — secret, required to verify requests.
   - **App ID / Client ID** — optional, for display.
3. Webhook URL: `https://api.tanat.space/api/webhooks/slack/{channelId}` — copy; "Verify" action.
4. Scopes checklist (plain language): read messages where mentioned, post messages, respond to slash commands, show approval buttons.
5. Test: "Invite the bot to a channel and mention it" + "Send test message".
6. **Channel selection:** choose which Slack channels the agent can answer in (multi-select with search); default "Only when mentioned". Add a slash command (`/tanat ask …`).

**Routing options:**
- Answer: only when mentioned / all messages in selected channels / DMs.
- Thread behavior: reply in thread (default) vs channel.
- Human handoff: route to a support channel or DM an owner.
- Approval notifications: choose a private approvals channel; approval cards use buttons.
- Data boundary copy: "Slack conversations are internal. Customers never see them."

**Channel detail additions:** workspace name, installed by, scopes, selected channels, last event, event subscriptions, "Open Slack".

**Copy:** "Give your team an internal assistant in Slack. It answers from your handbook and SOPs, and posts approvals where your team already works."

**Edge cases:** app removed, token revoked, missing scopes, bot not in channel, signing secret rotation, event retries/duplicates.

### 8.5 Approval delivery across channels

Approvals are the product's trust moment; they must be omnichannel.

- **Where:** in-app always; optional email, Slack, WhatsApp, Telegram per workspace and per approver.
- **What the message contains:** who is asking, what will happen, amount + currency, recipient, risk, why (short rationale), expiry, and a single-use signed link/button.
- **Security:** the link is single-use and expiring; opening it requires sign-in if the approver is not authenticated; separation of duties is enforced (proposer cannot approve); the channel message never contains a secret key.
- **States in the channel:** "Awaiting approval" → "Approved by Ada" → "Executed" / "Rejected" / "Expired"; update the original message where the platform allows (Slack `chat.update`, Telegram `editMessageText`; WhatsApp template limitation noted).
- **Escalation:** after N minutes, remind; after M minutes, escalate to a second approver; after expiry, mark expired and tell the customer.
- **Design artifact:** one approval card component with compact (channel) and expanded (dashboard) variants.

### 8.6 Channel permissions matrix

| Action | Owner | Admin | Operator | Viewer |
|---|---|---|---|---|
| Connect a channel | ✓ | ✓ | — | — |
| Replace credentials | ✓ | ✓ | — | — |
| Pause / resume | ✓ | ✓ | ✓ | — |
| Send test message | ✓ | ✓ | ✓ | — |
| Change routing | ✓ | ✓ | — | — |
| Disconnect | ✓ | ✓ | — | — |
| View activity | ✓ | ✓ | ✓ | ✓ |
| Approve actions | ✓ | ✓ | ✓ (if assigned) | — |

### 8.7 Channel data contract (for design fidelity)

`agent_channels` returns:

```
id, tenant_id, installation_id, channel, status, config, last_seen_at, created_at, updated_at
```

Plus `agent_name`, `agent_id` from the join. The UI should treat `channel` (not `channel_type`) as the source of truth. Status values are `connected | pending | error | disabled`.

Known config keys:

| Channel | Config keys |
|---|---|
| Telegram | `bot_token`, `webhook_secret` |
| WhatsApp | `phone_number_id`, `access_token`, `app_secret`, `verify_token`, `waba_id` (recommended), `display_phone_number` |
| Slack | `bot_token`, `signing_secret`, `app_id` (optional), `allowed_channels` (recommended) |
| Website | installation config: `theme`, `brand_color`, `position`, `welcome_message`; publishable key with `allowed_origins` |

Webhook URL patterns:

```
https://api.tanat.space/api/webhooks/telegram/{channelId}
https://api.tanat.space/api/webhooks/whatsapp/{channelId}
https://api.tanat.space/api/webhooks/slack/{channelId}
```

---

## 9. Visual system

### 9.1 Art direction

**"Quiet confidence."** Bone paper, ink, sage, and a single lime signal. Editorial type, precise grids, hairline rules. Think a well-made business newspaper crossed with a calm control room. Warm, not cute. Confident, not loud.

**Avoid:** neon AI gradients, glassmorphism, purple/blue SaaS gradients, 3D blobs, robot illustrations, emoji icons, all-caps everywhere, drop shadows on every card, dark-mode-by-default dashboards.

### 9.2 Color tokens

| Token | Value | Use |
|---|---|---|
| `--bg` | `#F6F3EA` | App and marketing background (bone) |
| `--surface` | `#FFFDF7` | Cards, panels (paper) |
| `--surface-2` | `#F1EEE4` | Subtle fills, table headers, hover |
| `--ink` | `#0C0D0B` | Primary text, primary buttons |
| `--ink-70` | `#45493F` | Secondary text |
| `--muted` | `#6B7065` | Tertiary text, labels |
| `--line` | `rgba(12,13,11,0.12)` | Borders, dividers |
| `--line-strong` | `rgba(12,13,11,0.22)` | Emphasized borders |
| `--lime` | `#C9F26B` | Signal: needs a human, primary CTA on dark, active step |
| `--lime-deep` | `#A8D84A` | Lime hover/pressed, text on light |
| `--sage` | `#DDE5D2` | Calm fills, test-mode tint, success surfaces |
| `--success` | `#3F6B2A` | Success text/icons |
| `--warning` | `#A86812` | Warning text/icons |
| `--danger` | `#A3372A` | Destructive text/icons |
| `--critical` | `#8D2F23` | Critical risk |
| `--info` | `#2F5D7C` | Informational links/notes (new) |

Channel accents (use only in 16–24px marks, dots, and chart series; never as full card backgrounds):

| Channel | Accent |
|---|---|
| Website | `#0C0D0B` |
| WhatsApp | `#25D366` |
| Telegram | `#26A5E4` |
| Slack | `#4A154B` (with `#E01E5A`, `#36C5F0`, `#ECB22E`, `#2EB67D` only in the logo mark) |
| API | `#6B7065` |

**Rules:**
- Lime never carries text on bone (contrast fails). Lime is a background or dot; text on lime is ink.
- Status must never be conveyed by color alone: pair with label + icon.
- Use a maximum of two accent colors per screen.

### 9.3 Typography

| Role | Family | Size / line height | Weight |
|---|---|---|---|
| Display / marketing H1 | Bricolage Grotesque | `clamp(44px, 6vw, 76px)` / 0.98 | 600 |
| Page title (dashboard) | Bricolage Grotesque | 32–40px / 1.1 | 600 |
| Section title | Bricolage Grotesque | 22–26px / 1.2 | 600 |
| Card title | DM Sans | 16–18px / 1.3 | 600 |
| Body | DM Sans | 14–16px / 1.55 | 400 |
| UI label | DM Sans | 12–13px / 1.4 | 500 |
| Eyebrow / meta | JetBrains Mono | 10.5–11px / 1.4, `0.08em` tracking, uppercase | 500 |
| Code / IDs | JetBrains Mono | 11.5–12.5px / 1.5 | 400–500 |
| Numeric KPI | Bricolage Grotesque | 28–36px / 1 | 600, tabular |

**Rules:** serif italic (Georgia fallback until a display serif ships) only for one emphasized phrase in marketing headlines. Never use mono for paragraphs. Minimum body size 13px in dense tables, 14px elsewhere. Do not use more than three weights per screen.

### 9.4 Spacing and layout

- Base unit **4px**. Scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 120.
- Card padding: 20–24px. Dense table row: 10–12px vertical.
- Section gap: 24–32px in dashboard; 80–120px on marketing.
- Grid: 12 columns, 24px gutter, max 1280px; content 1180px; reading 720px.
- Sidebar 248px expanded / 72px collapsed.
- Inbox panes: 80 / 340 / flex / 320.
- Breakpoints: 1440, 1280, 1024, 768, 390.

### 9.5 Radii, borders, elevation

- Controls: 8–10px. Cards: 14–16px. Modals/drawers: 20px. Pills: 999px. Channel marks: 10px.
- Default: 1px `--line` border, no shadow.
- Overlays only: `0 18px 48px -24px rgba(12,13,11,.28)`.
- No glow, no inner shadows except inset focus.

### 9.6 Iconography

- 1.5px stroke, 16/20/24px, rounded caps, single family (Lucide/Phosphor-style).
- Channel marks: official simple marks in monochrome or brand color, 16–20px, in a neutral 32px tile.
- Status: dot + label, or icon + label. No emoji.
- Risk: shield/alert icons + text; do not rely on red/green.
- Logo: "the tally" speech-bubble check mark; clear space = 0.5× mark height; minimum 16px.

### 9.7 Core components

Specify these as a library; every screen should reuse them.

| Component | Variants / states |
|---|---|
| **Button** | Primary (ink), Signal (lime on dark), Secondary (outline), Ghost, Danger. Sizes sm/md/lg. Loading, disabled, icon-only. |
| **Input / Textarea / Select** | Default, focus (2px ink ring), error (message below), disabled, with hint, with prefix/suffix, secret with reveal. |
| **Checkbox / Radio / Switch** | Default, checked, indeterminate, disabled, with description. |
| **Tabs / Segmented control** | Underline tabs (page), pill segmented (filters), vertical nav (settings). |
| **Pill / Badge** | Status (dot + label), count, risk, channel. No 9px text. |
| **Card** | Base, interactive, selected, alert, empty. Header/body/footer slots. |
| **Stat card** | Label, value, delta, sparkline, footnote. |
| **Table** | Header, sortable, row hover, selected, empty, loading skeleton, sticky header, mobile card reflow. |
| **Drawer** | Right-side, 480/560px, header/body/footer, close on ESC, focus trap. |
| **Modal** | Confirmation, form, one-time secret reveal. Max 560px. |
| **Toast** | Success/info/error, 4s, dismiss; never for approvals. |
| **Banner** | Info/warning/error/test-mode; inline and page-level. |
| **Approval card** | Compact (channel/feed), expanded (queue detail). |
| **Channel card** | Connected, needs attention, not connected, coming soon. |
| **Empty state** | Icon/illustration, title, one sentence, primary + secondary action. |
| **Skeleton** | Text, card, table row, chart. |
| **Command palette** | Search input, grouped results, keyboard hints. |
| **Stepper** | Horizontal (onboarding) and vertical (agent lifecycle). |
| **Code block** | Ink surface, copy button, language label, line numbers optional. |

### 9.8 Data visualization

- Palette: ink `#0C0D0B`, lime `#C9F26B`, sage `#DDE5D2`, muted `#6B7065`, plus channel accents for series.
- Grid: horizontal hairlines only, `--line`.
- No 3D, no gradients, no pie charts for more than 3 slices.
- Always show a legend and a text summary; provide a "View as table" toggle.
- Empty/insufficient data: show the empty state, not a zeroed chart.
- Tooltips: value + label + date; keyboard accessible.

### 9.9 Motion

- Duration 120–200ms; easing `cubic-bezier(.2,.7,.2,1)`.
- Page transition: 8px fade/slide. Drawer: 240ms slide. Modal: 160ms fade + 4px scale.
- No parallax, no autoplay video, no bouncing. Respect `prefers-reduced-motion`.
- One signature moment: the approval card's transition from "pending" to "approved" (a calm lime check, no confetti).

### 9.10 Accessibility

- WCAG 2.2 AA: body text ≥ 4.5:1; large text ≥ 3:1; UI borders ≥ 3:1 against adjacent colors.
- Focus visible: 2px ink or lime ring with 2px offset; never `outline: none` without replacement.
- Hit targets ≥ 44×44px on touch.
- Every icon-only button has an accessible label and tooltip.
- Forms: visible labels, `aria-describedby` for hints/errors, error summary on submit.
- Status: text + icon, not color alone.
- Keyboard: full tab order, ESC closes overlays, arrow keys for tabs/menus, focus trap in modals.
- Live regions for chat messages and toasts.
- Charts: accessible summary + data table.
- Motion: respect reduced motion.
- Copy: plain language at a 9th-grade reading level.

### 9.11 Dark mode (optional, phase 2)

If shipped: "night desk" — warm charcoal `#121310`, surface `#1A1B17`, bone text `#F1EEE4`, lime unchanged, sage muted. Never pure black or neon. Keep lime for signals only. Do not ship a half-finished dark mode; light is the primary experience.

---

## 10. Content and microcopy

**Voice:** calm, concrete, human. Short sentences. Talk about the owner's day, not the architecture. Never blame the user.

**Patterns:**
- Page lede: "See every place your agents talk to people." (not "Manage omnichannel deployments.")
- Empty state: "No conversations yet. Connect a channel or test your agent." + action.
- Error: what happened + why + what to do. "We couldn't verify your WhatsApp number. Check that the phone number ID matches the number in Meta Business Manager." + "Try again".
- Destructive: "Disconnect WhatsApp? Customers will no longer reach this agent on WhatsApp. Conversations stay in your inbox." + "Disconnect" / "Cancel".
- Secret reveal: "Copy this key now. For security, we won't show it again."
- Test mode: "Test mode — messages and payments here are simulated."
- Approval: "This will refund $145.00 to alice@example.com. You can't undo this." + "Approve refund".

**Avoid:** "unleash", "revolutionize", "supercharge", "seamless", "cutting-edge", "AI-powered" as a filler adjective, "tenant", "installation", "orchestration", "attestation" in primary UI.

---

## 11. Handoff requirements for the design AI

Ask for:

1. **Design tokens** as CSS variables (color, type, spacing, radii, shadows, motion).
2. **Component library** with all states listed in 9.7, including keyboard/focus states.
3. **High-fidelity screens** at 1440px for desktop and 390px for mobile:
   - Marketing home
   - Sign in
   - Onboarding step 1, 4, 6 (representative)
   - Today
   - Agents list + agent detail (Build tab)
   - Knowledge (list + add drawer)
   - Channels hub
   - Connect WhatsApp (step 3), Connect Telegram (step 3), Connect Slack (step 3)
   - Channel detail (Overview + Routing)
   - Inbox
   - Approvals (queue + detail)
   - Analytics
   - Settings (Workspace + Notifications)
   - Developers (Quickstart + API keys)
   - Hosted pay (test preview)
   - Widget (open, with approval-sent state)
4. **Redlines:** spacing, type sizes, component dimensions, responsive behavior.
5. **Interaction notes:** hover, focus, loading, empty, error, success; transitions.
6. **Content:** real copy for every screen, not lorem ipsum.
7. **A one-page rationale** explaining how the design supports trust, channel expansion, and first-run success.

**File/format:** Figma with variables and components, or a clickable prototype plus a token JSON. If the tool outputs code, require semantic HTML and CSS variables, no Tailwind-only assumptions (the codebase uses plain CSS and inline styles).

---

## 12. Acceptance checklist

Use this to review any design output.

**Product truth**
- [ ] WhatsApp, Telegram, and Slack each have a real connect flow with credentials, webhook URL, test, and routing.
- [ ] No screen claims a channel is live before it is connected.
- [ ] Approval is always human-gated; the widget never shows approve buttons.
- [ ] Hosted payment shows test/preview honestly and never collects card data.
- [ ] No fake metrics, fake customers, or fake logos.
- [ ] Secrets are masked after entry and never shown in full again.
- [ ] No crawler promise unless the backend supports it.

**Hierarchy**
- [ ] Each screen has one obvious primary action.
- [ ] "Needs your approval" is visible within 5 seconds of landing on Today.
- [ ] A channel error is visible without opening a menu.
- [ ] Developer detail is behind progressive disclosure.
- [ ] Navigation has ≤ 11 items and clear grouping.

**Craft**
- [ ] One type scale; no 9px labels; no more than three weights per screen.
- [ ] One signal color; lime only for human attention/primary CTA.
- [ ] Consistent 8px spacing rhythm; consistent radii.
- [ ] Hairline borders, restrained shadows.
- [ ] Real icon set; zero emoji as UI icons.
- [ ] Empty, loading, error, and success states for every data surface.
- [ ] Tables reflow to cards on mobile; split panes stack.
- [ ] Focus rings, labels, contrast, and keyboard paths are specified.

**Copy**
- [ ] No "tenant", "installation", "TEE", "MCP", "yoctoNEAR" in owner-facing UI.
- [ ] Errors say what happened and what to do next.
- [ ] Destructive actions explain impact.

---

## Appendix A — File and component map (for engineering handoff)

| Area | File |
|---|---|
| Marketing home | `frontend/app/page.tsx` |
| Marketing styles | `frontend/app/site.css` |
| Global tokens | `frontend/app/globals.css` |
| Sign in | `frontend/app/login/page.tsx` |
| Guided setup | `frontend/app/start/page.tsx` (1,855 lines) |
| Dashboard shell + sections | `frontend/app/app/page.tsx` (2,399 lines) |
| Dashboard styles | `frontend/app/app/dashboard.css` |
| Chat / test | `frontend/components/Chat.tsx` |
| Approvals table | `frontend/components/ActionsList.tsx` |
| Approval card | `frontend/components/ActionCard.tsx` |
| Settings | `frontend/components/Settings.tsx` |
| Hero demo | `frontend/components/site/HeroDemo.tsx` |
| Use cases | `frontend/components/site/UseCaseExplorer.tsx` |
| Code tabs | `frontend/components/site/CodeTabs.tsx` |
| Brand | `frontend/components/brand/Logo.tsx` |
| Docs | `frontend/app/docs/page.tsx` |
| Hosted pay | `frontend/app/pay/page.tsx` |
| Widget | `frontend/public/embed/tanat-widget.js` |
| API client | `frontend/lib/api.ts` |
| Types | `frontend/lib/types.ts` |
| Channel API | `src/routes/onboarding.ts` |
| Webhooks | `src/routes/webhooks.ts` |
| Dispatcher | `src/services/channel-dispatcher.ts` |
| Channel schema | `src/db/migrations/0007_channels_and_publishable_keys.sql` |
| Integration catalogue | `src/routes/platform.ts` |

## Appendix B — Current vs. target, in one table

| Surface | Current | Target |
|---|---|---|
| Home | Stat wall + quick actions | "Needs you now" + setup + health + KPIs |
| Navigation | 11 flat sections | 8 primary + 3 admin, grouped by job |
| Agents | Select + cards, 8 tabs | Blueprint gallery, 5 tabs, live preview |
| Knowledge | Paste box | Source library with status, scopes, retrieval test |
| Channels | Widget customizer + broken cards | Channel hub + real connect flows + health |
| WhatsApp / Telegram / Slack | Catalogue cards only | Full connect, test, route, monitor |
| Conversations | Test chat | Unified inbox with channel filters + context |
| Approvals | Table + expand | Queue + evidence-rich detail + audit |
| Analytics | Numbers + text rows | KPIs, charts, time range, funnel |
| Settings | One long page + duplicate | Sub-navigation, truthful controls |
| Onboarding | 11 steps | 6 steps with live preview |
| Hosted pay | Read-only status | Honest preview → live checkout |
| Design system | Inline styles, drift | Tokens + component library |

---

**End of brief.**