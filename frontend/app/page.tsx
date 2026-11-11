import Link from 'next/link';
import SiteNav from '@/components/site/SiteNav';
import HeroDemo from '@/components/site/HeroDemo';
import CodeTabs from '@/components/site/CodeTabs';
import { ArrowIcon, CheckIcon, Logo } from '@/components/brand/Logo';

const businessFunctions = [
  {
    tag: '01 / SUPPORT',
    title: 'Customer support',
    body: 'Answer customer questions accurately using your policies, FAQs, and service guides, resolve routine requests, and escalate complex cases with full context.',
  },
  {
    tag: '02 / REVENUE',
    title: 'Sales & lead generation',
    body: 'Qualify inbound leads, explain pricing and packages, recommend the right offering, capture contact details, and route high-intent buyers to your team.',
  },
  {
    tag: '03 / PEOPLE OPS',
    title: 'HR & employee support',
    body: 'Help employees find handbook policies, leave rules, onboarding checklists, and benefits information without waiting on repetitive internal tickets.',
  },
  {
    tag: '04 / SCHEDULING',
    title: 'Booking & appointments',
    body: 'Collect intake requirements, check service eligibility, coordinate scheduling requests, and prepare confirmations for clinics, agencies, and service teams.',
  },
  {
    tag: '05 / OPERATIONS',
    title: 'Operations & administration',
    body: 'Standardize SOP checklists, vendor coordination, incident triage, and recurring operational workflows with clear human approval checkpoints.',
  },
  {
    tag: '06 / FINANCE',
    title: 'Finance & procurement',
    body: 'Review invoice inquiries, purchase requests, refund proposals, and payment links under strict spend limits and dual-control human sign-off.',
  },
  {
    tag: '07 / INTELLIGENCE',
    title: 'Knowledge & research',
    body: 'Turn scattered documentation, contracts, SOPs, and product catalogs into an instant, source-cited intelligence assistant for your team.',
  },
  {
    tag: '08 / BESPOKE',
    title: 'Custom business workflows',
    body: 'Design purpose-built agents with custom instructions, memory rules, tool permissions, and API webhooks tailored to how your organization runs.',
  },
];

const workspaceAgents = [
  {
    name: 'Customer Support Agent',
    role: 'External · Website & WhatsApp',
    knowledge: 'FAQs, Return Policy, SLA Guide',
    governance: 'Read-only by default · Credits require approval',
    status: 'Published',
  },
  {
    name: 'Sales & Qualification Agent',
    role: 'External · Website & Telegram',
    knowledge: 'Service Catalog, Case Studies, Pricing Tiers',
    governance: 'Captures leads · Routes enterprise deals',
    status: 'Published',
  },
  {
    name: 'HR & People Assistant',
    role: 'Internal · Workspace & Slack',
    knowledge: 'Employee Handbook, Onboarding SOPs, Benefits',
    governance: 'Internal access only · Escalates sensitive HR issues',
    status: 'Published',
  },
  {
    name: 'Operations & Procurement Agent',
    role: 'Internal · Operations Console & API',
    knowledge: 'Vendor Matrix, Inventory SOPs, Spend Policy',
    governance: 'Spend cap enforced · Dual approval over threshold',
    status: 'Testing',
  },
];

const infrastructurePillars = [
  {
    title: 'Hardware-attested AI inference',
    body: 'Powered by NEAR AI Cloud running inside Trusted Execution Environments (TEE), keeping business prompts and customer conversations confidential.',
  },
  {
    title: 'Structured knowledge & persistent memory',
    body: 'Ground every agent in your website, FAQs, policies, and documents while maintaining per-customer and per-workspace memory across sessions.',
  },
  {
    title: 'Granular permissions & human approvals',
    body: 'Define exactly what each agent can read, propose, or execute. Sensitive operations and financial actions wait for named human approval.',
  },
  {
    title: 'Strict multi-tenant isolation & audit logs',
    body: 'Every workspace, agent version, publishable key, conversation, and action is isolated by tenant and recorded in an append-only audit trail.',
  },
];

export default function Home() {
  return (
    <div className="site">
      <SiteNav />

      <main>
        {/* ── Section 1: Hero ─────────────────────────────────────────── */}
        <section className="t-hero">
          <div className="t-wrap">
            <div className="t-hero-grid">
              <div className="t-hero-copy">
                <span className="t-eyebrow">
                  AI Infrastructure for Modern Businesses
                </span>
                <h1>
                  Your business needs AI.
                  <br />
                  Tanat provides the <span className="t-serif">infrastructure.</span>
                </h1>
                <p className="t-hero-lede">
                  Tanat helps businesses create, configure, and deploy AI agents
                  across customer support, sales, internal operations, and
                  everyday workflows — without building AI infrastructure from
                  scratch.
                </p>

                <div className="t-hero-ctas">
                  <Link className="t-btn t-btn-lime t-btn-lg" href="/start">
                    Get started <ArrowIcon />
                  </Link>
                  <Link className="t-btn t-btn-ghost t-btn-lg" href="#how-it-works">
                    Explore how it works
                  </Link>
                  <Link
                    href="/docs"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 13.5,
                      fontWeight: 500,
                      color: 'var(--ink)',
                      padding: '0 8px',
                    }}
                  >
                    Build with Tanat →
                  </Link>
                </div>

                <div className="t-hero-micro">
                  <span>Multi-agent workspaces</span>
                  <span>Business knowledge & memory</span>
                  <span>No-code widget + full REST & MCP API</span>
                </div>
              </div>

              <div id="demo">
                <HeroDemo />
              </div>
            </div>

            <div className="t-rail">
              <div className="t-rail-inner">
                <span className="t-rail-label">Built for every industry</span>
                <span className="t-rail-item">
                  SaaS & Technology <span>support & onboarding</span>
                </span>
                <span className="t-rail-item">
                  Healthcare & Clinics <span>intake & FAQs</span>
                </span>
                <span className="t-rail-item">
                  Commerce & Retail <span>advisory & orders</span>
                </span>
                <span className="t-rail-item">
                  Professional Services <span>lead qualification</span>
                </span>
                <span className="t-rail-item">
                  Logistics & Operations <span>SOPs & dispatch</span>
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ── Section 2: The Problem ──────────────────────────────────── */}
        <section className="t-section" id="problem">
          <div className="t-wrap">
            <div className="t-section-head t-reveal">
              <div>
                <span className="t-eyebrow">Why Tanat exists</span>
                <h2 style={{ marginTop: 18 }}>
                  Businesses need AI.
                  <br />
                  Building it shouldn’t be your job.
                </h2>
              </div>
              <p>
                Most companies want AI agents that understand their policies,
                remember their customers, and work safely across channels — not a
                six-month engineering project stitching models, vector stores, and
                permissions together.
              </p>
            </div>

            <div
              className="t-problem-grid t-reveal"
              style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}
            >
              <article className="t-problem" style={{ background: 'rgba(12,13,11,0.02)' }}>
                <span className="t-problem-num">WITHOUT TANAT · FRAGMENTED STACK</span>
                <h3>Months of plumbing before the first useful answer</h3>
                <p style={{ marginBottom: 16 }}>
                  Teams end up managing separate model keys, custom prompt
                  wrappers, brittle knowledge scrapers, per-channel webhook
                  servers, and ad-hoc permission checks with no unified audit log.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, color: 'var(--muted)' }}>
                  <div>✕ Raw LLM APIs with no business context or memory</div>
                  <div>✕ Separate bots rebuilt for Website, WhatsApp, and Slack</div>
                  <div>✕ No human approval gates or spend/action governance</div>
                  <div>✕ Non-technical teams locked out of updating knowledge</div>
                </div>
              </article>

              <article
                className="t-problem"
                style={{
                  background: '#0C0D0B',
                  color: '#F6F3EA',
                  borderColor: '#0C0D0B',
                }}
              >
                <span className="t-problem-num" style={{ color: '#C9F26B' }}>
                  WITH TANAT · UNIFIED AI INFRASTRUCTURE
                </span>
                <h3 style={{ color: '#F6F3EA' }}>
                  One infrastructure layer behind every business agent
                </h3>
                <p style={{ color: 'rgba(246,243,234,0.76)', marginBottom: 16 }}>
                  Configure specialized agents in minutes, ground them in your
                  verified business knowledge, enforce role and approval boundaries,
                  and deploy across customer and internal channels from one workspace.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, color: '#C9F26B' }}>
                  <div>✓ Guided setup for any business or industry in minutes</div>
                  <div>✓ Shared knowledge sources + persistent customer memory</div>
                  <div>✓ Built-in permissions, human approvals, and audit trails</div>
                  <div>✓ Embed via 1-line widget, React, REST API, or MCP</div>
                </div>
              </article>
            </div>
          </div>
        </section>

        {/* ── Section 3: What You Can Do With Tanat ───────────────────── */}
        <section className="t-section-tight" id="capabilities">
          <div className="t-wrap">
            <div className="t-section-head t-reveal">
              <div>
                <span className="t-eyebrow">What you can do with Tanat</span>
                <h2 style={{ marginTop: 18 }}>
                  One infrastructure.
                  <br />
                  AI for every business function.
                </h2>
              </div>
              <p>
                Whether you run a clinic, a software company, a logistics
                network, an agency, or a retail brand, Tanat adapts to the roles
                your business actually needs.
              </p>
            </div>

            <div
              className="t-problem-grid t-reveal"
              style={{
                gridTemplateColumns: 'repeat(auto-fill, minmax(265px, 1fr))',
              }}
            >
              {businessFunctions.map((item) => (
                <article className="t-problem" key={item.title}>
                  <span className="t-problem-num">{item.tag}</span>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── Section 4: How Tanat Works ──────────────────────────────── */}
        <section className="t-section" id="how-it-works">
          <div className="t-wrap">
            <div className="t-section-head t-reveal">
              <div>
                <span className="t-eyebrow">How Tanat works</span>
                <h2 style={{ marginTop: 18 }}>
                  From business knowledge to working AI agents in a few steps.
                </h2>
              </div>
              <p>
                No prompt engineering degree or infrastructure setup required.
                Start with a guided business profile and refine as your needs grow.
              </p>
            </div>

            <div
              className="t-steps t-reveal"
              style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}
            >
              <div className="t-step">
                <span className="t-step-num">1</span>
                <h3>Tell Tanat about your business</h3>
                <p>
                  Share your industry, what your business does, and what you want
                  AI to handle across customer experience or internal operations.
                </p>
                <span className="t-step-tag">Step 01 · Business profile</span>
              </div>
              <div className="t-step">
                <span className="t-step-num">2</span>
                <h3>Choose or configure your agents</h3>
                <p>
                  Pick from 14+ tailored agent blueprints — Support, Sales, HR,
                  Booking, Operations, Finance — or configure a custom agent.
                </p>
                <span className="t-step-tag">Step 02 · Agent design</span>
              </div>
              <div className="t-step">
                <span className="t-step-num">3</span>
                <h3>Connect your knowledge & rules</h3>
                <p>
                  Add your website, FAQs, policies, and documents, and set clear
                  permissions for what the agent can answer, propose, or escalate.
                </p>
                <span className="t-step-tag">Step 03 · Grounding & governance</span>
              </div>
              <div className="t-step">
                <span className="t-step-num">4</span>
                <h3>Deploy where your business works</h3>
                <p>
                  Test live in the sandbox, then launch on your website with one
                  script tag, connect messaging channels, or integrate via API.
                </p>
                <span className="t-step-tag">Step 04 · Live deployment</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── Section 5: Deploy Everywhere ────────────────────────────── */}
        <section className="t-section-tight" id="channels">
          <div className="t-wrap">
            <div className="t-section-head t-reveal">
              <div>
                <span className="t-eyebrow">Deploy everywhere</span>
                <h2 style={{ marginTop: 18 }}>
                  Your agents work where your business already operates.
                </h2>
              </div>
              <p>
                Configure an agent once and expose it across customer-facing
                touchpoints, internal team workspaces, and custom software.
              </p>
            </div>

            <div className="t-bento t-reveal">
              <article className="t-card t-card-a">
                <span className="t-pill t-pill-lime">Available now</span>
                <h3 style={{ marginTop: 16 }}>Website Widget</h3>
                <p>
                  Embed a customizable, style-isolated Shadow DOM chat widget on
                  any website, store, or web app. Protected by origin-locked
                  publishable keys (<code>pk_...</code>) and optional HMAC
                  verified customer identity.
                </p>
                <div className="t-channel-chips">
                  <span className="t-chip">
                    <i className="t-chip-dot" /> 1-line script tag
                  </span>
                  <span className="t-chip">Domain allowlist</span>
                  <span className="t-chip">Verified user memory</span>
                </div>
                <div className="t-card-visual">
                  <div>
                    <span className="t-k">visitor:</span> “What is your onboarding
                    timeline for 50 seats?”
                  </div>
                  <div>
                    <span className="t-k">agent:</span> “Standard onboarding takes
                    5 business days. Want me to schedule a kickoff call?”
                  </div>
                  <div>
                    <span className="t-k">→</span> cites Service SLA Guide · logs
                    run in 640ms
                  </div>
                </div>
              </article>

              <article className="t-card t-card-b">
                <span className="t-pill">Channel connector</span>
                <h3 style={{ marginTop: 12 }}>WhatsApp & Telegram</h3>
                <p>
                  Meet customers in the messaging threads they check every day for
                  support, appointment intake, lead qualification, and order updates.
                </p>
                <div className="t-card-visual">
                  <div>✓ Customer identity matched</div>
                  <div>→ Policy-grounded reply sent</div>
                  <div>↩ Escalation routed when needed</div>
                </div>
              </article>

              <article className="t-card t-card-c t-card-dark">
                <span className="t-pill t-pill-lime">Internal & Ops</span>
                <h3 style={{ marginTop: 12 }}>Slack & Team Workspaces</h3>
                <p>
                  Give employees an internal HR, IT, or Operations assistant right
                  where they collaborate, backed by internal handbooks and SOPs.
                </p>
                <div className="t-card-visual">
                  <div>#people-ops · @TanatHR</div>
                  <div>“Cited: 2026 Employee Handbook §4”</div>
                  <div>[ Escalate to People Partner ]</div>
                </div>
              </article>

              <article className="t-card t-card-d">
                <span className="t-pill t-pill-lime">Available now</span>
                <h3 style={{ marginTop: 12 }}>Custom Apps, REST API & Commerce</h3>
                <p>
                  Connect Shopify, CRMs, helpdesks, or your own product backend
                  using tenant-scoped API keys, sessions, knowledge APIs, and
                  governed action webhooks.
                </p>
                <div className="t-card-visual">
                  <div>
                    <span className="t-k">POST</span> /api/v1/sessions/:id/messages → 200
                  </div>
                  <div>
                    <span className="t-k">sources_used</span> [&quot;Policy v4&quot;, &quot;FAQ #12&quot;]
                  </div>
                  <div>
                    <span className="t-k">memories_used</span> 3 customer facts recalled
                  </div>
                </div>
              </article>

              <article className="t-card t-card-e t-card-lime">
                <h3>MCP & Vibecoding Native</h3>
                <p>
                  Built-in <code>/llms.txt</code> and <code>/api/mcp</code> Model
                  Context Protocol discovery so Cursor, Lovable, Bolt, v0, and
                  Claude Code can wire Tanat into your app in one prompt.
                </p>
                <div className="t-channel-chips">
                  <span
                    className="t-chip"
                    style={{ background: 'rgba(12,13,11,.08)', borderColor: 'transparent' }}
                  >
                    GET /llms.txt
                  </span>
                  <span
                    className="t-chip"
                    style={{ background: 'rgba(12,13,11,.08)', borderColor: 'transparent' }}
                  >
                    GET /api/mcp
                  </span>
                  <span
                    className="t-chip"
                    style={{ background: 'rgba(12,13,11,.08)', borderColor: 'transparent' }}
                  >
                    One-click prompt copy
                  </span>
                </div>
              </article>
            </div>
          </div>
        </section>

        {/* ── Section 6: Business Knowledge & Memory ──────────────────── */}
        <section className="t-section" id="knowledge">
          <div className="t-wrap">
            <div className="t-section-head t-reveal">
              <div>
                <span className="t-eyebrow">Business knowledge & memory</span>
                <h2 style={{ marginTop: 18 }}>
                  Your agents should understand your business, not just answer
                  questions.
                </h2>
              </div>
              <p>
                Generic chatbots hallucinate because they lack context. Tanat
                combines a structured business knowledge layer with persistent
                conversation memory so every response reflects your real policies
                and customer history.
              </p>
            </div>

            <div
              className="t-reveal"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: 18,
                padding: 24,
                borderRadius: 18,
                background: '#11130F',
                color: '#F6F3EA',
                border: '1px solid var(--line)',
              }}
            >
              <div
                style={{
                  padding: 20,
                  borderRadius: 12,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <div
                  className="t-mono"
                  style={{ fontSize: 11, color: '#C9F26B', marginBottom: 8 }}
                >
                  01 / INPUT SOURCES
                </div>
                <h3 style={{ fontSize: 18, color: '#F6F3EA', marginBottom: 10 }}>
                  Your Business Knowledge
                </h3>
                <p style={{ fontSize: 13.5, color: 'rgba(246,243,234,0.72)', lineHeight: 1.6 }}>
                  Ingest websites, FAQs, return & SLA policies, employee handbooks,
                  service catalogs, and operational notes. Assign sources globally
                  across your workspace or scope them to specific agents.
                </p>
              </div>

              <div
                style={{
                  padding: 20,
                  borderRadius: 12,
                  background: 'rgba(201,242,107,0.09)',
                  border: '1px solid rgba(201,242,107,0.35)',
                }}
              >
                <div
                  className="t-mono"
                  style={{ fontSize: 11, color: '#C9F26B', marginBottom: 8 }}
                >
                  02 / PERSISTENT MEMORY
                </div>
                <h3 style={{ fontSize: 18, color: '#F6F3EA', marginBottom: 10 }}>
                  Customer & Workspace Recall
                </h3>
                <p style={{ fontSize: 13.5, color: 'rgba(246,243,234,0.78)', lineHeight: 1.6 }}>
                  Tanat remembers customer preferences, account details, and prior
                  context across sessions (scoped per tenant and verified user), so
                  returning customers never have to repeat themselves.
                </p>
              </div>

              <div
                style={{
                  padding: 20,
                  borderRadius: 12,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <div
                  className="t-mono"
                  style={{ fontSize: 11, color: '#C9F26B', marginBottom: 8 }}
                >
                  03 / CITED EXECUTION
                </div>
                <h3 style={{ fontSize: 18, color: '#F6F3EA', marginBottom: 10 }}>
                  Source-Grounded Responses
                </h3>
                <p style={{ fontSize: 13.5, color: 'rgba(246,243,234,0.72)', lineHeight: 1.6 }}>
                  Every agent turn logs which knowledge sources and memories were
                  used, how long inference took, and whether a tool or human
                  approval rule was triggered.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Section 7: Multiple Agents, One Workspace ───────────────── */}
        <section className="t-section-tight" id="workspace">
          <div className="t-wrap">
            <div className="t-section-head t-reveal">
              <div>
                <span className="t-eyebrow">Multiple agents, one workspace</span>
                <h2 style={{ marginTop: 18 }}>
                  Give every part of your business the right AI agent.
                </h2>
              </div>
              <p>
                Instead of cramming every department into one fragile prompt,
                run dedicated agents for Support, Sales, HR, and Operations — each
                with its own instructions, channels, knowledge scope, and
                permissions.
              </p>
            </div>

            <div
              className="t-reveal"
              style={{
                border: '1px solid var(--line)',
                borderRadius: 16,
                background: '#FFFFFF',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '14px 20px',
                  background: '#0C0D0B',
                  color: '#F6F3EA',
                  fontSize: 12,
                  fontFamily: 'var(--font-mono)',
                }}
              >
                <span>WORKSPACE · ACME GLOBAL OPERATIONS</span>
                <span style={{ color: '#C9F26B' }}>4 ACTIVE AGENTS · SHARED KNOWLEDGE</span>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                  gap: 1,
                  background: 'var(--line)',
                }}
              >
                {workspaceAgents.map((agent) => (
                  <div
                    key={agent.name}
                    style={{
                      background: '#FFFFFF',
                      padding: 20,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: 12,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: 8,
                        }}
                      >
                        <span
                          className="t-pill t-pill-lime"
                          style={{ fontSize: 10 }}
                        >
                          {agent.status}
                        </span>
                        <span
                          className="t-mono"
                          style={{ fontSize: 10.5, color: 'var(--muted)' }}
                        >
                          {agent.role}
                        </span>
                      </div>
                      <h3 style={{ fontSize: 17, marginBottom: 8 }}>{agent.name}</h3>
                      <p style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 6 }}>
                        <strong>Knowledge:</strong> {agent.knowledge}
                      </p>
                      <p style={{ fontSize: 12.5, color: 'var(--muted)' }}>
                        <strong>Governance:</strong> {agent.governance}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Section 8: For Developers & Technical Teams ─────────────── */}
        <section className="t-section" id="developers">
          <div className="t-wrap">
            <div className="t-section-head t-reveal">
              <div>
                <span className="t-eyebrow">For developers & technical teams</span>
                <h2 style={{ marginTop: 18 }}>
                  Build on Tanat.
                  <br />
                  Don’t rebuild AI infrastructure.
                </h2>
              </div>
              <p>
                Business owners can launch from the dashboard with zero code.
                Developers and vibecoders get clean REST endpoints, publishable
                widget keys, HMAC user verification, <code>/llms.txt</code>, and
                MCP tool definitions.
              </p>
            </div>
            <div className="t-reveal">
              <CodeTabs />
            </div>
          </div>
        </section>

        {/* ── Section 9: Infrastructure, Security & Trust ─────────────── */}
        <section className="t-section-tight" id="security">
          <div className="t-wrap">
            <div className="t-section-head t-reveal">
              <div>
                <span className="t-eyebrow">Infrastructure, security & trust</span>
                <h2 style={{ marginTop: 18 }}>
                  The infrastructure behind every agent.
                </h2>
              </div>
              <p>
                Deploying AI across a business requires clear boundaries. Tanat
                combines confidential compute on NEAR AI Cloud with strict
                tenant isolation, origin-locked keys, and human-in-the-loop
                governance.
              </p>
            </div>

            <div className="t-security-grid t-reveal">
              {infrastructurePillars.map((item) => (
                <article className="t-security" key={item.title}>
                  <span className="t-security-icon">
                    <CheckIcon size={15} />
                  </span>
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.body}</p>
                  </div>
                </article>
              ))}
            </div>

            <p
              className="t-reveal"
              style={{
                marginTop: 26,
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: 'var(--muted-2)',
              }}
            >
              NEAR AI Cloud TEE inference · SHA-256 hashed API credentials ·
              Origin-locked publishable keys · Append-only audit log
            </p>
          </div>
        </section>

        {/* ── Section 10: Final CTA ───────────────────────────────────── */}
        <section className="t-cta">
          <div className="t-wrap">
            <div className="t-cta-box t-reveal">
              <div>
                <h2>Your next AI agent starts here.</h2>
                <p>
                  Set up your business workspace, configure your first agent with
                  your real knowledge and permissions, test it live, and deploy it
                  across your website or operations in minutes.
                </p>
              </div>
              <div className="t-cta-actions">
                <Link className="t-btn t-btn-ink t-btn-lg" href="/start">
                  Get started <ArrowIcon />
                </Link>
                <Link className="t-btn t-btn-ghost t-btn-lg" href="/docs">
                  Developer docs
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <footer className="t-footer">
        <div className="t-wrap">
          <div className="t-footer-grid">
            <div className="t-footer-brand">
              <Logo size={30} tone="bone" />
              <p>
                AI infrastructure behind business operations — helping companies
                create, govern, and deploy specialized AI agents across every
                channel.
              </p>
            </div>
            <div className="t-footer-col">
              <h4>Platform</h4>
              <Link href="/#capabilities">Capabilities</Link>
              <Link href="/#how-it-works">How it works</Link>
              <Link href="/#channels">Channels</Link>
              <Link href="/#workspace">Multi-agent workspace</Link>
              <Link href="/start">Get started</Link>
            </div>
            <div className="t-footer-col">
              <h4>Developers</h4>
              <Link href="/docs">Documentation</Link>
              <Link href="/docs#widget">Website Widget</Link>
              <Link href="/docs#api">REST API</Link>
              <Link href="/docs#vibecoding">Vibecoding & MCP</Link>
              <a href="/llms.txt" target="_blank" rel="noreferrer">
                llms.txt
              </a>
            </div>
            <div className="t-footer-col">
              <h4>Workspace</h4>
              <Link href="/login">Sign in</Link>
              <Link href="/app">Dashboard</Link>
              <Link href="/#security">Security & TEE</Link>
              <a href="https://near.ai" target="_blank" rel="noreferrer">
                Powered by NEAR AI
              </a>
            </div>
          </div>
          <div className="t-footer-bottom">
            <span>© 2026 Tanat. AI infrastructure for modern businesses.</span>
            <span className="t-footer-status">All systems operational</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
