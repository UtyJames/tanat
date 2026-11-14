# Tanat — Copy-Paste Prompts for a Design AI

**How to use this file**

1. Start every session with **Prompt 0 (Master Context)**. It gives the design AI the product, the audience, the constraints, and the visual direction.
2. Then paste **one surface prompt at a time** (Prompts 1–15). Do not ask for the whole product in one generation; quality collapses.
3. Use **Prompt 16 (Critique)** on every output before accepting it.
4. Use **Prompt 17 (Image exploration)** if you want moodboards or hero art direction rather than UI.
5. Replace nothing in the prompts except the bracketed optional notes. They are already written to be pasted as-is.

**Recommended order of work**

| Order | Prompt | Why |
|---|---|---|
| 1 | 0 — Master context | Shared understanding |
| 2 | 1 — Design tokens & components | Prevents drift across screens |
| 3 | 2 — App shell & navigation | The frame everything sits in |
| 4 | 3 — Today | The daily landing experience |
| 5 | 4 — Channels hub | The new strategic surface |
| 6 | 5 — Connect WhatsApp | Highest-friction channel |
| 7 | 6 — Connect Telegram | Lowest-friction channel |
| 8 | 7 — Connect Slack | Internal-team channel |
| 9 | 8 — Inbox | Real conversations |
| 10 | 9 — Approvals | Trust moment |
| 11 | 10 — Agents list + detail | Core configuration |
| 12 | 11 — Knowledge & memory | Trust in answers |
| 13 | 12 — Analytics | Proof of value |
| 14 | 13 — Onboarding | Conversion |
| 15 | 14 — Marketing home | Acquisition |
| 16 | 15 — Settings, team, developers, pay, widget | Completeness |
| 17 | 16 — Critique | Quality gate |
| 18 | 17 — Visual exploration (optional) | Art direction |

---

## Prompt 0 — Master Context (paste first)

```text
You are a senior product designer and design-systems lead with a strong editorial sensibility. You design B2B SaaS that non-technical business owners can use without training. You are redesigning Tanat.

PRODUCT
Tanat gives a business an AI team that knows the business, works where its customers already are, and never moves money without a human saying yes.

A business creates a workspace, describes what it sells, adds knowledge (policies, FAQs, catalog, SOPs), and gets AI agents that answer customers and staff across channels: website widget, WhatsApp, Telegram, Slack, and API. When an agent wants to do something consequential — issue a refund, book a slot, send a payment link — it proposes an approval request. A human approves or rejects. Only then does anything execute. Every action is scoped to one workspace, logged, and auditable.

The product's signature idea: "It proposes. You approve. Money moves."

USERS
1. Owner/operator of an SMB (store, clinic, salon, agency). Non-technical. Cares about: "Is my assistant answering correctly? What needs my approval? Is it live?" Must never be asked to understand tenants, installations, API scopes, TEE attestations, or yoctoNEAR.
2. Team lead / support manager. Cares about conversation quality, handoffs, response time, escalation.
3. Developer / technical founder. Cares about API keys, widget snippet, webhooks, SDKs, logs.
4. Tanat operator (internal). Out of scope for this design.

CURRENT STATE (what exists today)
- A marketing site with a warm editorial identity: bone paper #F6F3EA, ink #0C0D0B, lime #C9F26B, sage #DDE5D2, Bricolage Grotesque display, DM Sans UI, JetBrains Mono labels.
- A 11-step onboarding wizard.
- A dashboard that is an 11-section single-page developer console: Overview, Agents, Knowledge & Memory, Channels & Widget, Integrations, Conversations, Approvals & Runs, Analytics, Team & Members, Developers & MCP, Settings.
- Channels today: only a website-widget customizer and non-functional channel cards. WhatsApp, Telegram, and Slack are listed but cannot actually be connected in the UI, even though the backend supports them.
- Conversations today is a generic test chat, not a real inbox.
- Approvals today is a table with expandable rows; it lacks customer context, agent rationale, policy citations, risk explanation, and channel delivery status.
- Analytics today is numbers and text rows, with no charts or time range.
- Onboarding is too long and ends in a code snippet.

WHAT IS CHANGING IN THIS REDESIGN
- Full visual and UX overhaul of every surface.
- Slack, WhatsApp, and Telegram become first-class channels with real connect flows, credential setup, webhook verification, routing, testing, health monitoring, and activity.
- Approval notifications can be delivered in-app, by email, and into connected Slack/WhatsApp/Telegram.
- A unified inbox replaces the test chat.
- A new "Today" home answers "what needs me now?"
- A calm, consistent design system replaces inline-style drift.

DESIGN DIRECTION
"Quiet confidence." Editorial warmth, operational precision.
- Bone paper background, ink type, sage structure, and ONE signal color: lime. Lime is reserved for what needs a human: pending approvals, channel errors, the primary CTA on dark, the active setup step. Lime is never decoration.
- Big confident page titles (Bricolage Grotesque, 32–40px). Body in DM Sans 14–16px. JetBrains Mono only for eyebrows, meta, IDs, and code.
- Hairline borders, restrained shadows, generous whitespace, 4/8px spacing rhythm.
- No purple or blue AI gradients. No glassmorphism. No 3D blobs. No robot illustrations. No emoji as icons. No dark-mode-by-default. No neon.
- Motion is calm: 120–200ms, one signature moment (an approval moving from pending to approved), respect reduced motion.
- The dashboard should feel like a well-made operations desk, not a hackathon console.

NON-NEGOTIABLE PRODUCT TRUTHS
- Money and consequential actions always require explicit human approval. Never design a flow that removes or hides this.
- The website widget cannot approve actions (its key is publishable/browser-safe). It may show "Sent to your team for approval", never Approve/Reject buttons.
- Hosted payment links must not collect card data inside Tanat. If live rails are not enabled, show a clearly labelled preview/test state, never a fake successful payment.
- Channel credentials are entered once, masked thereafter, replaceable, and never displayed in full again.
- Do not imply a channel is live before it is connected. Use honest statuses: Not connected, Setup in progress, Verifying, Connected, Needs attention, Paused, Coming soon.
- Do not promise automatic website crawling; the product stores a reference and pasted knowledge unless a crawler ships.
- Do not fabricate metrics, customer logos, testimonials, or order data. Use honest empty states.
- Every workspace is isolated. Never show one workspace's data in another.

DELIVERABLES FOR EVERY SCREEN
- Desktop at 1440px and mobile at 390px.
- All states: default, loading (skeleton), empty, error, success, disabled, focus, hover, and where relevant test mode.
- Real copy, not lorem ipsum.
- Component names and variants so the design can become a library.
- Redlines: spacing, type sizes, component dimensions, responsive behavior.
- Interaction notes for anything that opens, expands, filters, or confirms.

PROCESS
1. Restate the screen's single job in one sentence.
2. List the 3–5 most important elements in priority order.
3. Produce the desktop screen.
4. Produce the mobile screen.
5. List all states and interactions.
6. List the components used and any new components.
7. Flag any place where the design depends on data or backend capability that may not exist.

If a requirement is ambiguous, make the smallest reasonable assumption, state it in one line, and continue. Do not ask a long list of questions before producing work.
```

---

## Prompt 1 — Design tokens, type scale, and component library

```text
Using the Tanat master context, create the design system foundation before any screens.

DELIVER:
1. Color tokens as CSS variables, with hex values and intended usage. Include: background, surface, surface-2, ink, ink-70, muted, line, line-strong, lime, lime-deep, sage, success, warning, danger, critical, info. Add channel accents for Website, WhatsApp, Telegram, Slack, API — but specify that they are used only in small marks, dots, and chart series, never as full card backgrounds.
2. A type scale table: role, family, size, line-height, weight, letter-spacing, usage. Roles: marketing display, page title, section title, card title, body, UI label, eyebrow/meta, code, numeric KPI. Include mobile sizes.
3. Spacing scale and layout rules: base unit, scale, card padding, section gaps, grid, max widths, sidebar widths, inbox pane widths, breakpoints.
4. Radii, border, and elevation tokens.
5. Iconography rules: stroke width, sizes, channel marks, status treatment. Explicitly ban emoji as UI icons.
6. A component inventory with variants and states. At minimum: Button, Input, Textarea, Select, Checkbox, Radio, Switch, Tabs, Segmented control, Pill/Badge, Card, Stat card, Table, Drawer, Modal, Toast, Banner, Approval card, Channel card, Empty state, Skeleton, Command palette, Stepper, Code block.
7. Two sample compositions to prove the system: (a) a page header with title, lede, primary/secondary actions and filter tabs; (b) a data card with a status pill, two metrics, and an overflow menu.
8. A one-page "do and don't" sheet with six visual examples of correct vs incorrect usage (lime misuse, status by color only, too many weights, heavy shadows, emoji icons, cramped spacing).

CONSTRAINTS
- Lime #C9F26B on bone fails contrast for text. Lime is a background/dot only; text on lime is ink.
- Status must pair color with a label and icon.
- Maximum two accent colors per screen.
- The system must work for both the editorial marketing site and the calmer dashboard without looking like two products.
- Output tokens as ready-to-paste CSS variables, and components as named Figma components (or an equivalent structured spec).
```

---

## Prompt 2 — App shell and navigation

```text
Using the Tanat master context and the design system, design the workspace shell.

THE JOB
Orient a business owner in one glance and make the next action obvious.

DESIGN:
1. Desktop app shell at 1440px:
   - Top bar (56–64px): logo; workspace switcher with name and chevron; Test/Live segmented control; global search / command palette trigger with ⌘K hint; "Test agent" quick action; notifications bell with unread dot; help; avatar menu.
   - Left sidebar (248px) grouped as:
     WORK: Today, Inbox (badge), Approvals (lime badge only when > 0)
     BUILD: Agents (count), Knowledge
     REACH: Channels (count), Integrations
     MEASURE: Analytics
     ADMIN: Team, Developers, Settings
   - Active item: ink fill with bone text. A lime 3px left marker only on the item that needs attention. Do not fill the whole active state with lime.
   - Main content: page header pattern (optional mono eyebrow, 32–40px title, one-sentence lede max 68ch, right-aligned primary + secondary actions, optional filter row), content max 1180–1280px.
   - Slim footer: "Tanat · Confidential inference · All systems operational". No API URL in the footer.
   - Notification drawer: grouped "Needs you", "Channel issues", "Completed", each deep-linking; mark all read.
2. Test mode state: a clear segmented control, a subtle sage tint or diagonal texture, and a persistent banner "Test mode — messages and payments here are simulated." Show how the same screen changes between Test and Live.
3. Collapsed sidebar (72px, icon rail with tooltips) and mobile at 390px: bottom navigation with Today, Inbox, Approvals, Agents, More; sidebar becomes a full-height drawer.
4. Command palette: search input, grouped results (Pages, Agents, Conversations, Customers, Actions), keyboard hints, recent items, quick actions.
5. Avatar menu: profile, workspace switch, docs, "What's new", sign out.

STATES
Default, scrolled, collapsed, mobile drawer open, command palette open, notification drawer open, test mode on, no-workspace/error state.

AVOID
Eleven flat nav items; "TEE Active" as a decorative pill; raw API URLs; sidebar cards with tenant IDs; hamburger-only navigation on desktop.
```

---

## Prompt 3 — Today (workspace home)

```text
Using the Tanat master context, design the "Today" screen — the daily landing page.

THE JOB
Answer two questions in five seconds: "Is everything okay?" and "What needs me right now?"

LAYOUT (desktop 1440px)
1. Greeting + status line: "Good morning, Ada." and one sentence built from real data: "Your team handled 128 conversations yesterday. 3 approvals need you."
2. "Needs you now" module (the hero, ~60% width):
   - Pending approvals: count, the top two approval cards inline (customer, amount, risk, expiry), "Review all →".
   - Channel alerts, e.g. "WhatsApp needs reconnection" with "Fix now".
   - Knowledge failures, e.g. "2 sources failed to process" with "Review".
   - If empty: a calm "You're all caught up" state with the next best action.
3. Setup checklist (only when incomplete): 5 steps — business profile, add knowledge, test agent, connect a channel, review first approval. Progress ring; dismissible; disappears at 100%.
4. KPI row (4): Conversations (7d) with sparkline; Median first response; Approval rate; Spend this month. Each with delta vs previous period. Show "Not enough data yet" instead of invented numbers.
5. "Your agents" — 2–4 rows: mark, name, Live/Draft/Paused pill, channel chips, conversations 7d, approval rate, "Open".
6. Channel health strip — one row per channel: mark, handle, status, last message, 7-day volume, action. Errors sort first.
7. Recent activity — compact feed: "Agent proposed a $145 refund · 2m ago · Website" with status pill; "View all →".

RULES
- Maximum seven modules, two columns below the hero. Comfortable density.
- Lime only on the approval count, the "Fix now" action, and the active setup step. Everything else ink/sage/neutral.
- No fake charts; show empty states.
- New workspace: replace all modules with one guided card, "Let's get your first agent live", with three steps and a single CTA.

ALSO DESIGN
- Empty workspace state.
- Loading state with skeletons.
- Error state for failed data loads.
- Mobile 390px: single column, approval cards first, KPI row as a horizontal scroll of compact cards.
```

---

## Prompt 4 — Channels hub

```text
Using the Tanat master context, design the Channels hub. This is the most important new screen in the product.

THE JOB
See every place the agents talk to people, connect a new one, and know instantly if something is wrong.

DESKTOP (1440px)
1. Header: eyebrow "Reach", title "Channels", lede "Every place your agents talk to customers and teammates." Primary action "Connect channel".
2. Summary strip: Connected 3 · Needs attention 1 · Messages (7d) 1,284 · Median response 3.2s. Small sparklines, not oversized stat cards.
3. Filter tabs: All · Website · WhatsApp · Telegram · Slack · API, with counts.
4. "Needs attention" section (only when errors): full-width alert card with channel mark, error in plain language, "Fix now", and a "What happened" disclosure.
5. Connected channel cards (2 columns at 1440, 1 at 768):
   - Top: channel mark in a neutral 32px tile, name, status pill (Connected / Needs attention / Paused), overflow menu.
   - Handle: "WhatsApp · +1 415 ••• 8842", "Telegram · @acme_support_bot", "Slack · Acme workspace", "Website · acme.com", "API · 2 keys".
   - Agent: "Agent: Store Assistant" with small avatar.
   - Health: last message, 7-day message count.
   - Actions: "Manage", "Test", "Pause".
   - Never show installation IDs, tenant IDs, or raw config.
6. Website widget panel (expandable, full width): live preview, theme light/dark, accent color, position, greeting, allowed domains, embed snippet with copy, managed website keys. Show the widget preview at realistic size.
7. Available channels: Shopify, Email, Teams, Google Calendar, CRM — dimmed/outlined cards with "Coming soon" or "Notify me". No dead "Configure" buttons.
8. Recent channel activity table: channel, customer, agent, status, time; link to Inbox.
9. Empty state: "Connect your first channel" with four channel cards and "Start with your website — it takes 30 seconds."

COMPONENT
Design a reusable Channel card with four variants: Connected, Needs attention, Not connected, Coming soon. Include hover, focus, overflow menu, and loading skeleton.

RULES
- Channel accents appear only in the 16–24px mark and small dots.
- "Connect" and "Manage" are the only primary actions per card.
- Status text must be readable at a glance without color.
- Do not mix integrations (Shopify, CRM) into the messaging channel grid; they have their own page.

ALSO DESIGN
- Mobile 390px: cards stack, filters scroll horizontally, summary strip becomes two compact rows.
```

---

## Prompt 5 — Connect WhatsApp flow

```text
Using the Tanat master context and the Channels hub design, design the WhatsApp connection flow.

CONTEXT
WhatsApp uses Meta's Cloud API. The business needs a Meta Business account, a WhatsApp Business phone number, a permanent access token, and webhook verification. The backend accepts these config keys: phone_number_id, access_token, app_secret, verify_token, and optionally waba_id and display_phone_number. The webhook URL pattern is https://api.tanat.space/api/webhooks/whatsapp/{channelId}.

FLOW SHELL
A right-side drawer (560px) on desktop, full-page on mobile. Four steps with a dot stepper:
1. Choose channel
2. Choose agent & name
3. Connect
4. Route, test & activate
Persistent footer: "Save & finish later" (text) and primary "Continue". Always show a security note: "Credentials are encrypted and never shown again."

STEP 1 — CHOOSE CHANNEL
Four cards: Website, WhatsApp, Telegram, Slack. WhatsApp selected. Each shows "Best for", setup time ("~10 min"), and what you need. Shopify/Email marked coming soon.

STEP 2 — AGENT & NAME
- Agent selector (default primary agent) with avatar, name, live status.
- Connection name: "Support on WhatsApp".
- Optional: which team owns this channel.

STEP 3 — CONNECT (the core screen)
Two columns on desktop: form left (60%), "What you'll need" prep panel right (40%).
Prep panel:
- A Meta Business account
- A WhatsApp Business phone number
- A permanent access token
- Permission to edit webhooks
- Link: "Open Meta setup guide"
Form fields:
- Phone number ID (required)
- WhatsApp Business Account ID (recommended, optional)
- Permanent access token (required; secret field with reveal toggle and paste)
- App secret (recommended; secret; helper: "Used to verify Meta's webhook signatures")
- Verify token (required; generate button; copy button; helper: "Paste this into Meta's webhook setup")
- Display phone number (optional)
Webhook block:
- Read-only URL https://api.tanat.space/api/webhooks/whatsapp/{channelId} with Copy.
- "Verify webhook" action with three states: not verified, verifying, verified (timestamp).
- A short explainer of Meta's challenge/response in plain language.
Inline validation: show errors next to fields, not in a toast. Specific messages, e.g. "This token doesn't have permission to send messages."

STEP 4 — ROUTE, TEST & ACTIVATE
- Routing: accept all messages / opted-in customers only; business hours; after-hours behavior; human handoff destination; approval notification destination.
- 24-hour window explainer card: "WhatsApp allows free-form replies for 24 hours after a customer's last message. After that, Tanat uses approved templates."
- Template status: list approved templates (name, language, status) or "Templates are managed in Meta Business Manager" with a link. Do not fake a template builder.
- Test: phone number input, "Send test message", success/failure with plain-language reason, latency.
- Summary: agent, number, routing, notification destinations.
- Primary: "Activate WhatsApp". Secondary: "Save as draft".

STATES
Not started, partially complete, validating, credential error, webhook pending, verified, test sending, test success, test failure (token expired, window closed, template missing), activated, paused.

ALSO DESIGN
- The success screen: "WhatsApp is connected" with the number, agent, "Send a test", "Open inbox", "Connect another channel".
- The reconnect state (token expired) as a compact banner + fix flow.
- Mobile layout for step 3 with collapsible help.

TONE
Reassuring and specific. This is the highest-friction setup; the design must make it feel achievable, not bureaucratic.
```

---

## Prompt 6 — Connect Telegram flow

```text
Using the Tanat master context and the Channels hub design, design the Telegram connection flow.

CONTEXT
Telegram uses a bot created in BotFather. The backend needs bot_token and optionally webhook_secret (sent as X-Telegram-Bot-Api-Secret-Token). It can register the webhook automatically via a setup endpoint. The webhook URL pattern is https://api.tanat.space/api/webhooks/telegram/{channelId}.

FLOW SHELL
Same four-step drawer as WhatsApp: Choose channel → Agent & name → Connect → Route, test & activate.

STEP 3 — CONNECT (core screen)
Left form, right "Before you start" panel.
Prep panel:
- "Create a bot in @BotFather (about 2 minutes)."
- Copyable commands: /newbot, /setcommands.
- A 3-step illustrated checklist (text-based is fine; no fake screenshots).
Form:
- Bot token (required; secret field with reveal, paste, and "Where do I find this?" help).
- Webhook secret (optional; Generate; helper: "Adds a second lock to incoming updates").
- Bot username (optional; auto-filled after verification).
Webhook block:
- "Register webhook automatically" primary action. States: idle → registering → success with webhook URL + bot username → failure with plain-language reason.
- Manual fallback: read-only webhook URL with Copy.
- "Verify webhook" secondary action.
- Show the bot's avatar/name once verified.

STEP 4 — ROUTE, TEST & ACTIVATE
- Accept: DMs only / DMs + groups / selected group IDs.
- Reply behavior: direct reply / threaded topic reply (only if supported; otherwise hide).
- Commands: /start, /help, /agent, /human (toggleable list).
- Approval notifications: send approval cards to a chosen chat ID; explain that the approver must be signed in and authorized.
- Test: "Open @yourbot and send hello" with a deep link, plus "Send test message".
- Summary + "Activate Telegram" / "Save as draft".

STATES
Token missing, invalid token, webhook already set to a different URL, webhook registration failed, bot not found, verified, test success, test failure, activated.

ALSO DESIGN
- Success screen with bot handle, "Open in Telegram", "Send a test", "Connect another channel".
- A compact "Bot health" card for the channel detail: webhook status, last update, bot handle, commands.
- Mobile layout.

TONE
Light and fast. Telegram should feel like the easy win after WhatsApp.
```

---

## Prompt 7 — Connect Slack flow

```text
Using the Tanat master context and the Channels hub design, design the Slack connection flow.

CONTEXT
Slack is for internal teams: HR, IT, operations, and knowledge questions. The backend needs bot_token and/or signing_secret. The webhook URL pattern is https://api.tanat.space/api/webhooks/slack/{channelId}. Approval notifications can be posted to a private Slack channel with interactive buttons.

FLOW SHELL
Same four-step drawer: Choose channel → Agent & name → Connect → Route, test & activate.

STEP 3 — CONNECT (core screen)
Preferred primary path: a prominent "Add to Slack" OAuth button with the Slack mark. Explain scopes in plain language before the click:
- Read messages where the bot is mentioned
- Post replies
- Respond to slash commands
- Show approval buttons
Secondary path: "Connect manually" disclosure with:
- Bot token (xoxb-…, secret, required for replies)
- Signing secret (secret, required to verify requests)
- App ID / Client ID (optional)
- Webhook URL read-only with Copy
- "Verify signing secret" action.
Show a "What Tanat can see" data-boundary note: "Only messages in channels where the bot is invited, or DMs to the bot. Customer conversations are separate."

STEP 4 — ROUTE, TEST & ACTIVATE
- Answer behavior: only when mentioned (default) / all messages in selected channels / DMs.
- Channel selection: searchable multi-select of Slack channels, with "Only when mentioned" as the default for each.
- Reply in thread (default) vs channel.
- Human handoff: route to a support channel or DM an owner.
- Approval notifications: choose a private approvals channel; preview the approval card as it will appear in Slack.
- Slash command: /tanat ask … (show an example).
- Test: "Invite the bot to a channel and mention it" + "Send test message".
- Summary + "Activate Slack" / "Save as draft".

STATES
App not installed, missing scopes, token revoked, signing secret invalid, bot not in any channel, verified, test success, test failure, activated.

ALSO DESIGN
- Success screen: "Slack is connected" with workspace name, installed by, selected channels, "Open Slack", "Send a test".
- The Slack approval card preview (compact): who is asking, amount, recipient, risk, expiry, Approve / Reject / View details. Note that the link is single-use and expiring.
- Channel detail additions: workspace, scopes, selected channels, last event, event subscriptions.
- Mobile layout.

TONE
Internal, competent, calm. This is for teammates, not customers.
```

---

## Prompt 8 — Unified inbox

```text
Using the Tanat master context, design the unified Inbox.

THE JOB
Give a team one place to see and steer real conversations from every channel.

DESKTOP (1440px, three panes plus context)
1. Left rail (80px): channel filters with marks and unread counts — All, Website, WhatsApp, Telegram, Slack. Below: saved views — "Needs a human", "Assigned to me", "Unresolved", "Closed".
2. Conversation list (340px):
   - Search; sort (Newest / Longest waiting).
   - Rows: channel mark, customer name/handle, last message preview (1 line), time, status dot with label (AI handling / Needs human / Resolved), assignee avatar.
   - Selected: ink-tinted background and a lime left marker only if it needs a human.
   - Group headers by day.
3. Thread (flex):
   - Header: customer, channel, agent, status, actions (Assign, Take over, Resolve, More).
   - Messages: consistent bubbles, channel mark on the first message, timestamps, agent name.
   - "Sources used" chips under assistant messages.
   - Inline approval card: "Refund $145.00 · Waiting for approval" with status and "Open approval".
   - System events: "Ada took over", "Agent paused", "Approval approved".
4. Context panel (320px, collapsible):
   - Customer: name/handle, channel identity, first seen, sessions count.
   - Memory: facts grouped by type, with "View all".
   - Actions in this conversation: list with status.
   - Tags/sentiment only if real data exists. Do not fabricate orders or revenue.
5. Composer:
   - Text input, send.
   - "Take over" state: "You're replying as Ada — the agent is paused for this conversation." + "Return to agent".
   - Canned responses optional.
   - No attachment button unless the backend supports attachments.

STATES
Empty inbox; no search results; loading skeletons; network error; WhatsApp 24-hour window closed (composer disabled with "Template required — manage in Meta"); Slack thread context; assigned-to-me empty; resolved conversation read-only.

MOBILE 390px
List → thread with back; context becomes a bottom sheet; channel filters become a horizontal segmented row.

RULES
- This is not the agent test chat. The test chat lives inside the agent detail.
- Human takeover must be visually unmistakable.
- Do not show raw external IDs in the header; put them in the context panel's "Details".
```

---

## Prompt 9 — Approvals queue and detail

```text
Using the Tanat master context, design the Approvals experience. This is the trust moment of the product.

THE JOB
Let a human confidently approve or reject a consequential action in under 30 seconds.

DESKTOP (1440px, split view)
LEFT QUEUE (360px)
- Tabs: Needs me · All pending · Scheduled · History.
- Filters: risk (low/medium/high/critical), channel, amount, agent.
- Rows: risk marker with icon + label (never color alone), title ("Refund $145.00"), customer, agent + channel, age, expiry countdown.
- Selected state clear but calm.
- Bulk selection only for same-type, low-risk actions, with a confirmation that names every action. Never one-click bulk approve for money.

RIGHT DETAIL
1. Header: action title, status pill, risk pill, expiry countdown with a progress ring ("Expires in 12m").
2. The ask: amount + currency large; recipient; customer/order reference; action type in plain language.
3. Why: the agent's rationale, quoted from the conversation, with "View conversation".
4. Evidence: policy/source citations ("Return Policy §3 · 30-day damage cover") as chips. If no source: a warning state, "No policy source cited".
5. Conversation excerpt: 3–5 messages, collapsed, "Show full conversation".
6. Governance: required approvals (1 of 2), proposed by, who must approve, separation-of-duties note, idempotency/audit note in a disclosure.
7. Delivery: "Sent to #approvals in Slack · Delivered 2m ago" or "In-app only".
8. Actions: primary "Approve refund" (ink), secondary "Reject" (outline), tertiary "Ask a question" (note).
   - Approve opens a confirmation sheet: summary, amount, recipient, "This will move money. You can't undo this." + "Approve" / "Cancel".
   - Reject asks for an optional reason.
9. After approval: "Approved — ready to execute"; if automatic, "Executing…" then a receipt with tx hash in a disclosure; if manual, "Execute".
10. Audit trail: vertical timeline — proposed → notified → approved/rejected → executed/failed, with actor, time, channel.

COMPONENTS
- Approval card, compact variant for Today, Inbox, Slack, Telegram, and email.
- Approval card, expanded variant for the queue.
- Confirmation sheet.
- Evidence/source chip.
- Risk marker (icon + label + color).
- Expiry countdown ring.

STATES
Empty queue ("Nothing needs your approval" + explanation + "See how approvals work"), loading, error, expired, already approved by someone else (live update), rejected, failed execution with retry, insufficient permission (viewer), test-mode approval (clearly simulated).

MOBILE 390px
List → detail; sticky bottom action bar with Approve/Reject; confirmation as a bottom sheet.

RULES
- Never make approval a single unconfirmed tap for money.
- Never hide risk, recipient, amount, or expiry.
- Never let the proposer approve their own action; show why if attempted.
- No confetti. Calm lime check is the only celebration.
```

---

## Prompt 10 — Agents list and agent detail

```text
Using the Tanat master context, design the Agents area.

PART A — AGENTS LIST
- Header: "Agents", lede "The AI teammates doing the work.", primary "New agent".
- Filters: All / Live / Draft / Paused; search.
- Gallery of cards (3 across at 1440): mark/initial, name, one-line purpose, lifecycle pill (Live/Draft/Paused), channel chips, 7-day conversations, approval rate, last edited, overflow (Edit, Duplicate, Pause, Archive).
- Create flow: a full-screen or large modal "Choose a blueprint" with a gallery grouped by Customer, Internal, Knowledge, Custom. Each card: name, tagline, "Best for", suggested channels, "Use blueprint". A "Start from scratch" card.
- Empty state: blueprint gallery preview + "Create your first agent".

PART B — AGENT DETAIL
Header: back link, agent name + lifecycle pill, one-line purpose. Primary "Test agent"; secondary "Go live"/"Pause"; overflow Duplicate, Archive. Meta: last edited, version, "Used in 3 channels". Replace the current four lifecycle buttons with a stepper: Draft → Testing → Live → Paused (status, not actions). Changing state opens a confirmation with impact copy.

FIVE TABS (not eight):
1. Overview — summary, channels, knowledge coverage, recent conversations, quick actions.
2. Build — role description, tone (6 visual chips), system instructions, responsibilities, never-do rules, escalation, welcome message. Structured fields first; raw prompt in an "Advanced" disclosure. Live chat preview on the right that updates as fields change.
3. Knowledge — sources used by this agent, attach/add, "12 sources · 3 used in last 7 days", retrieval test.
4. Capabilities — a permissions matrix: Capability | Allowed | Needs approval | Restricted. Rows: search knowledge, recall memory, capture lead, draft reply, issue refund, send payment link, change settings, cross-workspace access. Include workspace spend cap with "who can change this" explanation.
5. Deploy & test — left: channel bindings + embed snippet; right: sandbox chat. Versions as a timeline below with change summary, author, time, "View diff", "Restore as new version".

STATES
No agents, loading, save error, unsaved changes bar, publishing, published, paused, test mode, version diff, permission denied.

RULES
- Hide model names, token counts, and version numbers in the primary view; put them in "Details".
- Never present the raw system prompt as the only way to configure the agent.
- The test chat must be labelled "Test — no customer sees this" and include a reset.
```

---

## Prompt 11 — Knowledge and customer memory

```text
Using the Tanat master context, design Knowledge & Memory.

THE JOB
Make the agent trustworthy by showing what it knows, how fresh it is, and what it remembers.

STRUCTURE
Two tabs: Knowledge and Customer memory. Summary header with counts and a primary "Add knowledge".

KNOWLEDGE TAB
- Summary chips: sources, ready, processing, failed, last updated.
- Filters: All / Policies / FAQs / Catalog / Documents / Website / Notes; agent filter; search.
- List (not cards): title, type icon + label, scope (All agents / one agent), status pill, last updated, used-in count, overflow (Preview, Re-index, Remove).
- Add knowledge drawer (520px): tabs Paste text / FAQ pairs / File / Website. Title, scope, content. Live "What the agent will see" preview. Primary "Add source".
- Website tab must be honest: "Website import stores a reference. Automatic crawling is not enabled." unless a crawler exists. Primary path is paste text or FAQ pairs.
- Source detail drawer: content preview, metadata, status timeline, "Used by" agents, "Test retrieval" (ask a question, show matching excerpts), Delete with confirmation.
- Processing states: Pending (queued), Processing (progress), Ready, Failed (reason + Retry). Never a permanent spinner.
- Empty state: three ways to add, with "Paste text" primary.

CUSTOMER MEMORY TAB
- Search by customer; list with identifier, memory count, last seen, channels.
- Customer detail: facts grouped by Identity / Preferences / Context / History, confidence, source conversation, "Forget" per item, "Export" and "Delete customer data".
- One-line explainer: "Tanat remembers facts to improve service. You can inspect or delete them at any time."
- Empty state: "Memories appear here after a customer conversation."

STATES
Empty, loading skeleton, processing, failed, retrieval test with no matches, deletion confirmation, permission denied.

RULES
- Privacy is visible, not buried. Deletion is a first-class action.
- Do not show raw JSON or token counts.
- Do not promise crawling.
```

---

## Prompt 12 — Analytics

```text
Using the Tanat master context, design Analytics.

THE JOB
Answer "Is this working, and what should I change?"

LAYOUT
- Header: "Analytics", lede "How your agents are performing.", date range (7d / 30d / 90d / custom), compare toggle, export.
- KPI row (5): Conversations, Resolved without handoff (containment), Median first response, Approval rate, Spend. Each with value, delta vs previous period, sparkline, and "Not enough data" when applicable.
- Charts:
  1. Conversations over time — stacked area or line by channel (Website, WhatsApp, Telegram, Slack), with legend and "View as table".
  2. Where conversations end — horizontal stacked bar: resolved by AI / handed to human / abandoned / waiting.
  3. Approvals — proposed vs approved vs rejected vs expired over time; approval rate; median time to approve.
  4. Response time — p50/p90 line.
  5. Top questions/topics — ranked list with counts and a "knowledge gap" flag when no source was cited. If topic clustering is unavailable, show "Topic clustering not enabled" rather than fake data.
  6. Agent performance table: agent, conversations, containment, approval rate, median latency, last active.
  7. Spend — tokens and money over time, by agent/channel. No invented pricing.
- Empty state: "Analytics will appear after your first conversation" + "Test your agent".

VISUAL RULES
- Chart palette: ink, lime, sage, muted, plus one channel accent per series. No rainbow.
- Horizontal hairlines only; no vertical grid clutter.
- Every chart has a text summary and an accessible table.
- Tooltips show exact values; keyboard accessible.
- Insufficient data shows an empty state, not a zeroed chart.

ALSO DESIGN
- Mobile: KPIs as a 2-column grid, charts full width, tables become cards.
- Loading skeletons for each chart.
- Error state with retry.
```

---

## Prompt 13 — Guided setup (onboarding)

```text
Using the Tanat master context, design the guided setup.

THE JOB
Turn a curious owner into a live agent with the shortest path to "I saw it work".

CURRENT PROBLEM
The existing flow has 11 steps, every screen looks the same, there is no live preview until the end, and channel selection promises connectors that cannot be configured.

NEW FLOW: 6 STEPS
1. Welcome — one value sentence, "Takes about 3 minutes", start. Optional inline email capture "Save your progress"; never block the first step.
2. Your business — name, industry (visual grid of 8 icons, not a select), one-sentence description, website (optional), country/timezone. Two-column form; examples in placeholders.
3. What should it handle? — grouped capability cards: answer questions, qualify leads, bookings, refunds, internal help. Multi-select with check states. Show recommended agent badges. Continue disabled until at least one.
4. Meet your agent — name, tone (6 visual chips), top responsibilities, "never do" rules, escalation rule, welcome message. Right-side live chat preview that updates as they type. "Use recommended" defaults.
5. Teach it your business — paste policies/FAQs, add FAQ pairs, add website URL; "Skip for now" allowed. Source cards with status "Ready to add". No fake crawl.
6. Go live — choose channels (Website, WhatsApp, Telegram, Slack, API), permissions summary, test chat, deploy. Two-pane: config left, live sandbox right; three suggested prompts; after deploy show snippet + "what happens next".

CROSS-CUTTING
- Left vertical stepper with 6 steps and completion checks. Mobile: "Step 3 of 6" + progress line.
- Autosave every step; "Saved" indicator; "Finish later" returns to the same step.
- One primary button per step; back is a text button.
- Channel selection creates pending channels and routes to connect after deploy. Never imply live.
- Deploy success is a calm receipt: "Your agent is live on your website", snippet with copy, "Connect WhatsApp next", "Open workspace". No confetti.
- Email verification should not block exploring/testing. If required by the backend, make it a lightweight inline gate at step 1 or step 6.

ALSO DESIGN
- Step 4 desktop and mobile in detail (the live preview is the signature).
- Step 6 deploy success.
- Validation errors, saving state, resume state, "you already have a workspace" state.
```

---

## Prompt 14 — Marketing home

```text
Using the Tanat master context, design the marketing home page. This is the expressive surface; the dashboard is the calm one.

GOAL
Make a non-technical owner believe they can have a working AI assistant today — and that it will not do anything reckless.

STRUCTURE
1. Hero (7/5 split): eyebrow "AI assistants for real businesses"; H1 "Put an AI assistant on your business in 3 minutes." with a serif italic on "in 3 minutes."; lede about knowing the business, remembering customers, working on website/WhatsApp/Telegram/Slack, and asking before acting; three check-mark proof points; primary CTA "Set up your assistant"; secondary "See how it works"; micro-trust "Free to start · No coding · Live in 3 minutes". Right: interactive approval demo with store / clinic / team scenes and a channel label.
2. Trust strip: "Works with" Website, WhatsApp, Telegram, Slack, Shopify (coming soon), REST API. Monochrome marks. No fake customer logos.
3. Problem → outcome: three columns, concrete owner language.
4. How it works: three steps with real UI fragments.
5. Channels section: four cards (Website, WhatsApp, Telegram, Slack) with one-line setup promise and honest badge ("Available", "Setup required", "Beta").
6. Approval moment: full-bleed editorial section — chat excerpt → approval card → receipt. Copy: "It proposes. You approve. Money moves."
7. Use cases: retail, clinic, agency, internal team.
8. Integrations/code: code tabs for widget, AI builders (Cursor/Lovable/Bolt/v0), React/API.
9. Security & governance: three plain-language promises (human approval, workspace isolation, confidential inference). No TEE jargon above the fold.
10. Pricing if it exists; otherwise "Free to start" + contact.
11. FAQ (6 questions, including "Can it refund customers?", "What happens on WhatsApp?", "Do I need a credit card?").
12. Final CTA + footer.

VISUAL
- Bone background #F6F3EA, ink #0C0D0B, lime #C9F26B used only for CTAs and the "You decide" pill.
- Bricolage Grotesque display; DM Sans body; JetBrains Mono micro-labels.
- Generous 96–140px section rhythm. The demo card is the only dark object on the page.
- Editorial serif italic for one phrase per section at most.
- Motion: one hero interaction, subtle reveals, respect reduced motion.

AVOID
Stock robots, purple gradients, "revolutionize", fake logos, fake testimonials, implying money moves without approval.

ALSO DESIGN
Mobile 390px with the same hierarchy; sticky nav that condenses on scroll.
```

---

## Prompt 15 — Settings, team, developers, hosted pay, widget

```text
Using the Tanat master context, design the remaining surfaces as one coherent set.

A. SETTINGS
Sub-navigation: Workspace · Members · Billing & usage · Notifications · Security · Danger zone.
- Workspace: name, slug (read-only + copy), timezone, locale, logo, default agent.
- Billing & usage: plan, spend cap, current usage, payment method and invoices only if a billing rail exists. If the spend limit is operator-controlled, show it read-only with "Request a change" and a plain-language explanation. Do not fake controls.
- Notifications: approval requests (in-app, email, Slack, WhatsApp, Telegram), channel errors, weekly digest, product updates. Channel options appear only when that channel is connected.
- Security: active sessions (device, location, last active, revoke), sign-in method, audit log link, "Sign out everywhere".
- Danger zone: transfer ownership, delete workspace (type the workspace name to confirm).

B. TEAM
- Header + "Invite teammate"; seat summary only if real.
- Members table: avatar/initials, name, email, role pill, status, last active, overflow. Owner locked.
- Role explainer cards: Owner (everything, billing), Admin (agents, channels, keys), Operator (inbox + approvals), Viewer (read-only).
- Invite drawer: email, name, role cards with permission bullets, personal note, send. Pending invites show Resend/Cancel.
- Remove confirmation explains impact. Empty state: "You're the only one here."

C. DEVELOPERS
Tabs: Quickstart · API keys · Webhooks · Widget & SDK · Verified identity · MCP · Diagnostics.
- Quickstart: 3-step code path with cURL/Node/Python tabs; "Copy a prompt for Cursor / Lovable / Bolt / v0" card.
- API keys: table (name, prefix, scopes, created, last used, status), create drawer with plain-language scope descriptions, one-time reveal modal with copy and "I've saved it".
- Webhooks: endpoint URL, signing secret, event subscriptions, recent deliveries with response codes, "Send test event".
- Widget & SDK: snippet, npm install, React component, theming props, allowed origins.
- Verified identity: HMAC explainer + generator + copyable example; clearly advanced.
- MCP: manifest URL, tools, example config, read-only vs approval-gated.
- Diagnostics: API base URL, environment, workspace ID, session info, "Copy diagnostics".
- Move all developer settings out of the general Settings page.

D. HOSTED PAYMENT /pay
- Centered 460px card on bone; logo; merchant name; amount; description; status; security note; support link.
- Test/preview state: "Payment link preview. This is a test — no money will move." No card fields. Disabled "Pay" with explanation.
- Live state (only if rails exist): amount, merchant, line item, currency, payment method selection, secure hosted fields/redirect, terms, pay, processing, success receipt, failure/retry, expired link.
- Success: receipt with amount, merchant, reference, timestamp, "Done".
- Error: plain-language reason + contact merchant.
- Never invent card forms or fake a successful payment.

E. WEBSITE WIDGET
- Launcher: 56px rounded square with the tally mark, subtle hover lift, unread dot, accessible label.
- Panel: 380×560; header with agent name + business name + online dot + close; greeting bubble; message list; composer; small footer.
- Theming: light default, dark option, accent color, position, greeting, border radius. Ensure contrast for any accent.
- Approval state: show "Refund request sent to the team — you'll get an update here." Never Approve/Reject in the widget.
- States: loading skeleton, empty greeting with 3 suggested questions, typing, error/retry, offline, handoff, closed.
- Accessibility: focus trap, ESC, aria-live, keyboard send, 44px targets, reduced motion.

For each surface: desktop 1440px + mobile 390px, all states, real copy, component list, and redlines.
```

---

## Prompt 16 — Critique and QA (run on every output)

```text
Act as a ruthless design director reviewing the screens you just produced for Tanat. Do not praise. Find what is wrong and fix it.

CHECK IN THIS ORDER
1. PRODUCT TRUTH
   - Does any screen imply WhatsApp/Telegram/Slack is live before it is connected?
   - Does any surface let the widget approve an action?
   - Does the hosted payment page fake a payment or collect card data?
   - Are channel credentials masked after entry?
   - Is a human approval still required for every consequential action?
   - Are there fabricated metrics, logos, or order data?
2. HIERARCHY
   - Is the single job of the screen obvious in 5 seconds?
   - Is there exactly one primary action?
   - Is "what needs me" visible on Today without scrolling or hunting?
   - Is a channel error visible without opening a menu?
   - Has developer detail been pushed behind disclosure?
3. CRAFT
   - Any type below 12px? More than three weights? Inconsistent radii? Arbitrary spacing?
   - Is lime used as decoration anywhere? Is any status conveyed by color alone?
   - Are shadows heavy? Are there emoji icons? Is any card purely decorative?
   - Are empty, loading, error, and success states present for every data surface?
4. ACCESSIBILITY
   - Contrast: body 4.5:1, large text 3:1, borders 3:1.
   - Focus rings visible; keyboard path complete; overlays trap focus and close on ESC.
   - Labels, hints, and errors are programmatically associated.
   - Touch targets ≥ 44px; tables reflow on mobile.
   - Motion respects reduced motion.
5. COPY
   - Any "tenant", "installation", "TEE", "MCP", "yoctoNEAR" in owner-facing UI?
   - Do errors say what happened and what to do?
   - Do destructive actions explain impact?
6. MOBILE
   - Does the hierarchy survive at 390px? Does the primary action remain reachable?
   - Do split panes become list → detail? Do tables become cards?

OUTPUT
A prioritized list (P0/P1/P2) of defects with: screen, element, why it fails, and the exact fix. Then produce corrected versions of the three weakest screens. Do not add new features; fix the design.
```

---

## Prompt 17 — Visual exploration / art direction (optional)

```text
Create a visual direction board for Tanat, an AI-agent platform for real businesses.

BRAND FEELING
"Quiet confidence." A well-made business newspaper crossed with a calm control room. Warm, precise, premium, human. Not a neon AI startup. Not a generic SaaS blue dashboard.

PALETTE
Bone paper #F6F3EA, paper #FFFDF7, ink #0C0D0B, muted #6B7065, sage #DDE5D2, signal lime #C9F26B (used sparingly, only for human attention), success #3F6B2A, warning #A86812, danger #A3372A.

TYPE
Bricolage Grotesque for display, DM Sans for UI, JetBrains Mono for micro-labels. An editorial serif italic for one emphasized phrase.

SHOW
1. A hero composition: oversized headline on bone, a single dark product card showing a chat → approval → receipt moment, lime accent only on the approval.
2. A dashboard still-life: sidebar, a "Needs you" approval card, a channel health strip, generous whitespace, hairline borders.
3. A channel identity study: Website, WhatsApp, Telegram, Slack marks in neutral tiles, shown small and consistent — not full-color brand cards.
4. A texture/material study: paper grain, hairline rules, subtle sage fills, no glass.
5. A typography specimen with the scale and one serif italic phrase.
6. A "do not" strip: purple gradient, glassmorphism, robot illustration, emoji icons, neon-on-black.

FORMAT
A 6-panel moodboard / art-direction sheet, plus a short rationale for each panel. No UI copy needed beyond the hero phrase. No stock photos of people pointing at screens.
```

---

## Prompt 18 — Follow-up iteration template

Use this after the first generation to refine without losing coherence.

```text
Keep the same design system, layout logic, and product constraints. Revise only the following:

SCREEN: [name]
CHANGES:
1. [specific change]
2. [specific change]
3. [specific change]

DO NOT CHANGE:
- The navigation structure or terminology.
- The color tokens, type scale, or spacing system.
- The approval gate or channel status model.
- Any other screen.

RETURN:
- The revised screen at 1440px and 390px.
- A short list of what changed and why.
- Any new component or state introduced.
```

---

## Quick reference — what to ask for, by tool

| Tool type | Best prompt shape | Notes |
|---|---|---|
| Figma AI / design generator | Prompt 0 + one surface prompt + Prompt 16 | Ask for named components and variables, not just screens |
| v0 / Lovable / Bolt | Prompt 0 + surface prompt + "use semantic HTML and CSS variables; no Tailwind-only assumptions" | The codebase uses plain CSS and inline styles |
| Image generator (moodboard) | Prompt 17 | Ask for art direction, not readable UI text |
| Chat-based design partner | Prompt 0 + surface prompt, then iterate with Prompt 18 | Force screen-by-screen output |
| Design critique | Prompt 16 | Run before accepting anything |

---

**End of prompt pack.**