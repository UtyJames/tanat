import Link from 'next/link';
import SiteNav from '@/components/site/SiteNav';
import HeroDemo from '@/components/site/HeroDemo';
import CodeTabs from '@/components/site/CodeTabs';
import { ArrowIcon, CheckIcon, Logo } from '@/components/brand/Logo';

const channels = [
  { label: 'Website', note: 'widget' },
  { label: 'WhatsApp', note: 'cloud api' },
  { label: 'Telegram', note: 'bot' },
  { label: 'Slack', note: 'coming' },
  { label: 'Custom app', note: 'api' },
];

const security = [
  {
    title: 'A human approves money',
    body: 'Every payment, refund, or transfer is a proposal. It waits for a named approver. The agent can never approve its own action.',
  },
  {
    title: 'Caps that actually hold',
    body: 'Per-payment and monthly limits are enforced before a proposal is even created — and reserved atomically at execution.',
  },
  {
    title: 'No card data, ever',
    body: 'Payments happen on a hosted page or through a scoped token. Card numbers never touch your site, your chat, or Tanat.',
  },
  {
    title: 'A receipt for everything',
    body: 'Every conversation, proposal, approval, execution, and settlement writes an append-only audit record with an idempotency key.',
  },
];

export default function Home() {
  return (
    <div className="site">
      <SiteNav />

      <main>
        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section className="t-hero">
          <div className="t-wrap">
            <div className="t-hero-grid">
              <div className="t-hero-copy">
                <span className="t-eyebrow">Agentic payments for real businesses</span>
                <h1>
                  Your agent can talk.
                  <br />
                  Now it can <span className="t-serif">pay.</span>
                </h1>
                <p className="t-hero-lede">
                  Tanat gives any business a payment-ready AI agent on its website,
                  WhatsApp, or Telegram. It proposes. You approve. Money moves.
                  No card data, no new checkout, no custody.
                </p>

                <div className="t-hero-ctas">
                  <Link className="t-btn t-btn-lime t-btn-lg" href="/start">
                    Start free <ArrowIcon />
                  </Link>
                  <Link className="t-btn t-btn-ghost t-btn-lg" href="#demo">
                    See the flow
                  </Link>
                </div>

                <div className="t-hero-micro">
                  <span>No credit card</span>
                  <span>Live in 10 minutes</span>
                  <span>Test mode included</span>
                </div>
              </div>

              <div id="demo">
                <HeroDemo />
              </div>
            </div>

            <div className="t-rail">
              <div className="t-rail-inner">
                <span className="t-rail-label">Money rails and channels</span>
                <span className="t-rail-item">
                  NEAR Intents <span>settlement</span>
                </span>
                <span className="t-rail-item">
                  Visa <span>cards</span>
                </span>
                <span className="t-rail-item">
                  WhatsApp <span>cloud api</span>
                </span>
                <span className="t-rail-item">
                  Telegram <span>bots</span>
                </span>
                <span className="t-rail-item">
                  Stripe <span>connect</span>
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ── Problem ─────────────────────────────────────────────────── */}
        <section className="t-section" id="product">
          <div className="t-wrap">
            <div className="t-section-head t-reveal">
              <div>
                <span className="t-eyebrow">The missing last mile</span>
                <h2 style={{ marginTop: 18 }}>
                  Every AI agent hits the same wall: getting paid.
                </h2>
              </div>
              <p>
                Your agent can answer, recommend, and close. Then it has to ask a
                customer to copy a wallet address, open a new tab, and hope.
                That is where the sale dies.
              </p>
            </div>

            <div className="t-problem-grid t-reveal">
              <article className="t-problem">
                <span className="t-problem-num">01 / CONTEXT</span>
                <h3>Checkout breaks the conversation</h3>
                <p>
                  Sending someone to a generic checkout loses the context your
                  agent just built. They came for an answer, not a form.
                </p>
              </article>
              <article className="t-problem">
                <span className="t-problem-num">02 / TRUST</span>
                <h3>Nobody shares card details in chat</h3>
                <p>
                  Pasting a card number into WhatsApp is a scam signal. A secure
                  hosted link is the only pattern customers trust.
                </p>
              </article>
              <article className="t-problem">
                <span className="t-problem-num">03 / CONTROL</span>
                <h3>Finance will not hand over a blank cheque</h3>
                <p>
                  A raw API key with unlimited spend is not a product. Teams need
                  caps, named approvers, and an audit trail before money moves.
                </p>
              </article>
            </div>
          </div>
        </section>

        {/* ── Three doors ─────────────────────────────────────────────── */}
        <section className="t-section-tight" id="developers">
          <div className="t-wrap">
            <div className="t-section-head t-reveal">
              <div>
                <span className="t-eyebrow">Three ways to ship</span>
                <h2 style={{ marginTop: 18 }}>
                  Start with one line.
                  <br />
                  Scale to the whole stack.
                </h2>
              </div>
              <p>
                A business owner can paste a script tag. A vibecoder can install
                a React package. A platform team can take the headless API. Same
                agent, same rules underneath.
              </p>
            </div>
            <div className="t-reveal">
              <CodeTabs />
            </div>
          </div>
        </section>

        {/* ── Channels ────────────────────────────────────────────────── */}
        <section className="t-section" id="channels">
          <div className="t-wrap">
            <div className="t-section-head t-reveal">
              <div>
                <span className="t-eyebrow">Where your customers already are</span>
                <h2 style={{ marginTop: 18 }}>
                  One agent.
                  <br />
                  Every inbox.
                </h2>
              </div>
              <p>
                The same conversation, approval, and payment flow follows the
                customer — from your product page to WhatsApp to a Telegram bot.
                No per-channel rebuild.
              </p>
            </div>

            <div className="t-bento t-reveal">
              <article className="t-card t-card-a">
                <span className="t-pill t-pill-lime">Default</span>
                <h3 style={{ marginTop: 16 }}>Website widget</h3>
                <p>
                  A branded chat that lives in the corner of your site. Shadow DOM,
                  light and dark themes, mobile-ready, and a publishable key that
                  only works on your domains.
                </p>
                <div className="t-channel-chips">
                  <span className="t-chip">
                    <i className="t-chip-dot" /> One script tag
                  </span>
                  <span className="t-chip">Origin-locked</span>
                  <span className="t-chip">11kb</span>
                </div>
                <div className="t-card-visual">
                  <div>
                    <span className="t-k">customer:</span> “Can I get this by Friday?”
                  </div>
                  <div>
                    <span className="t-k">agent:</span> “Yes. $189 with Friday
                    delivery. Approve?”
                  </div>
                  <div>
                    <span className="t-k">→</span> payment link · card · settled
                  </div>
                </div>
              </article>

              <article className="t-card t-card-b">
                <h3>WhatsApp</h3>
                <p>
                  Official Cloud API. Payment links, order status, and human
                  handoff inside the thread your customers already read.
                </p>
                <div className="t-card-visual">
                  <div>✓ Order #4821 confirmed</div>
                  <div>→ Secure payment link sent</div>
                  <div>↩ Receipt delivered in chat</div>
                </div>
              </article>

              <article className="t-card t-card-c t-card-dark">
                <h3>Telegram</h3>
                <p>
                  The fastest real channel. Paste a bot token, we register the
                  webhook, approvals arrive as buttons.
                </p>
                <div className="t-card-visual">
                  <div>@arc_bistro_bot</div>
                  <div>[ Approve $40 ]</div>
                  <div>[ Decline ]</div>
                </div>
              </article>

              <article className="t-card t-card-d">
                <h3>Your own product</h3>
                <p>
                  Headless REST, server SDK, SSE streaming, and signed webhooks.
                  Build the interface your customers deserve and keep Tanat behind
                  the curtain.
                </p>
                <div className="t-card-visual">
                  <div>
                    <span className="t-k">POST</span> /v1/messages → 200
                  </div>
                  <div>
                    <span className="t-k">event</span> payment.approved · signature
                    verified
                  </div>
                  <div>
                    <span className="t-k">idempotency-key</span> 8f2c… · replay-safe
                  </div>
                </div>
              </article>

              <article className="t-card t-card-e t-card-lime">
                <h3>MCP & agent surfaces</h3>
                <p>
                  Publish your store to ChatGPT, Claude, and Cursor as an MCP
                  server. Read-only by default; every write tool is approval-gated.
                </p>
                <div className="t-channel-chips">
                  <span className="t-chip" style={{ background: 'rgba(12,13,11,.08)', borderColor: 'transparent' }}>
                    create_payment_link
                  </span>
                  <span className="t-chip" style={{ background: 'rgba(12,13,11,.08)', borderColor: 'transparent' }}>
                    get_order
                  </span>
                  <span className="t-chip" style={{ background: 'rgba(12,13,11,.08)', borderColor: 'transparent' }}>
                    propose_refund
                  </span>
                </div>
              </article>
            </div>
          </div>
        </section>

        {/* ── How it works ────────────────────────────────────────────── */}
        <section className="t-section-tight">
          <div className="t-wrap">
            <div className="t-section-head t-reveal">
              <div>
                <span className="t-eyebrow">Five minutes, not five sprints</span>
                <h2 style={{ marginTop: 18 }}>From “we should add an agent” to live.</h2>
              </div>
              <p>
                No wallet, no card, no KYC to start. Test mode is on from the
                first conversation. Real money unlocks after verification.
              </p>
            </div>

            <div className="t-steps t-reveal">
              <div className="t-step">
                <span className="t-step-num">1</span>
                <h3>Tell us about the business</h3>
                <p>
                  Name, website, what you sell. Tanat reads the site to draft the
                  agent’s knowledge and tone.
                </p>
                <span className="t-step-tag">~60 seconds</span>
              </div>
              <div className="t-step">
                <span className="t-step-num">2</span>
                <h3>Give the agent a job</h3>
                <p>
                  Support, sales, refunds, bookings. Set a per-payment cap and the
                  person who approves money.
                </p>
                <span className="t-step-tag">~2 minutes</span>
              </div>
              <div className="t-step">
                <span className="t-step-num">3</span>
                <h3>Turn it on</h3>
                <p>
                  Copy the widget snippet, connect WhatsApp or Telegram, or take
                  the API. Run a test payment before you go live.
                </p>
                <span className="t-step-tag">~2 minutes</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── Vibecoder band ──────────────────────────────────────────── */}
        <section className="t-section-tight">
          <div className="t-wrap">
            <div className="t-dark t-reveal">
              <div className="t-dark-grid">
                <div>
                  <span className="t-eyebrow t-eyebrow-dark">For people shipping at 2am</span>
                  <h2 style={{ marginTop: 18 }}>
                    You don’t need a payments team.
                  </h2>
                  <p style={{ marginTop: 18 }}>
                    Paste a key. Drop in the widget. Your agent can take a deposit
                    before you’ve finished the landing page. When you outgrow the
                    widget, the same agent is waiting behind a typed SDK.
                  </p>
                  <div className="t-checks">
                    {[
                      'Next.js, React, Vue, Svelte, plain HTML',
                      'Works with Cursor, Lovable, Bolt, v0',
                      'Test keys and simulated payments',
                      'No webhook server required to start',
                      'TypeScript types that autocomplete',
                      'Deploy to your own domain',
                    ].map((item) => (
                      <span className="t-check" key={item}>
                        <i>
                          <CheckIcon size={11} />
                        </i>
                        {item}
                      </span>
                    ))}
                  </div>
                  <div style={{ marginTop: 30 }}>
                    <Link className="t-btn t-btn-lime" href="/docs/widget">
                      Read the widget guide <ArrowIcon />
                    </Link>
                  </div>
                </div>

                <div className="t-terminal" aria-label="Terminal quickstart">
                  <div>
                    <span className="t-prompt">$</span>{' '}
                    <span className="t-cmd">npm i @tanat/react</span>
                  </div>
                  <div className="t-out">added 1 package in 0.8s</div>
                  <div style={{ height: 12 }} />
                  <div>
                    <span className="t-prompt">$</span>{' '}
                    <span className="t-cmd">npx tanat init</span>
                  </div>
                  <div className="t-out">? Where does your agent live?</div>
                  <div className="t-out">› Website widget</div>
                  <div className="t-out">› WhatsApp</div>
                  <div className="t-out">› Telegram</div>
                  <div style={{ height: 12 }} />
                  <div>
                    <span className="t-ok">✓</span>{' '}
                    <span className="t-cmd">publishable key created</span>
                  </div>
                  <div>
                    <span className="t-ok">✓</span>{' '}
                    <span className="t-cmd">agent “Store Assistant” deployed</span>
                  </div>
                  <div>
                    <span className="t-ok">✓</span>{' '}
                    <span className="t-cmd">test payment approved · $189.00</span>
                  </div>
                  <div style={{ height: 12 }} />
                  <div className="t-out">
                    → live in test mode. Add a payout account to go live.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Security ────────────────────────────────────────────────── */}
        <section className="t-section">
          <div className="t-wrap">
            <div className="t-section-head t-reveal">
              <div>
                <span className="t-eyebrow">Built for the person who signs off</span>
                <h2 style={{ marginTop: 18 }}>Money should be boring.</h2>
              </div>
              <p>
                Giving an agent access to money is a trust decision. Tanat is
                designed so the answer to “what could go wrong?” is written down,
                bounded, and logged.
              </p>
            </div>

            <div className="t-security-grid t-reveal">
              {security.map((item) => (
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
              Non-custodial by design · tenant keys are hashed · publishable keys
              are origin-locked · full audit export on every plan
            </p>
          </div>
        </section>

        {/* ── Pricing ─────────────────────────────────────────────────── */}
        <section className="t-section-tight" id="pricing">
          <div className="t-wrap">
            <div className="t-section-head t-reveal">
              <div>
                <span className="t-eyebrow">Pricing</span>
                <h2 style={{ marginTop: 18 }}>Start free. Pay when it earns.</h2>
              </div>
              <p>
                Every plan includes the approval engine, audit trail, and test
                mode. Payment processing is passed through at cost — we don’t take
                a cut of your customer’s money.
              </p>
            </div>

            <div className="t-pricing t-reveal">
              <article className="t-price">
                <span className="t-price-name">Starter</span>
                <div className="t-price-amount">
                  $0 <small>/ month</small>
                </div>
                <p className="t-price-desc">
                  For the first agent and the first hundred conversations.
                </p>
                <ul className="t-price-features">
                  {[
                    '1 agent · 1 channel',
                    '100 conversations / month',
                    'Website widget + test payments',
                    'Approval inbox and audit log',
                    'Community support',
                  ].map((feature) => (
                    <li className="t-price-feature" key={feature}>
                      <CheckIcon size={13} /> {feature}
                    </li>
                  ))}
                </ul>
                <Link className="t-btn t-btn-ghost" href="/start">
                  Start free
                </Link>
              </article>

              <article className="t-price featured">
                <span className="t-price-name">Growth</span>
                <div className="t-price-amount">
                  $99 <small>/ month</small>
                </div>
                <p className="t-price-desc">
                  For a business that wants the agent to close, not just chat.
                </p>
                <ul className="t-price-features">
                  {[
                    '5 agents · every channel',
                    '2,000 conversations / month',
                    'Live payments + hosted checkout',
                    'Telegram and WhatsApp connectors',
                    'Signed approval links and roles',
                    'Usage analytics and exports',
                  ].map((feature) => (
                    <li className="t-price-feature" key={feature}>
                      <CheckIcon size={13} /> {feature}
                    </li>
                  ))}
                </ul>
                <Link className="t-btn t-btn-lime" href="/start">
                  Start 14-day trial
                </Link>
              </article>

              <article className="t-price">
                <span className="t-price-name">Scale</span>
                <div className="t-price-amount">
                  Talk <small>to us</small>
                </div>
                <p className="t-price-desc">
                  For platforms embedding agents for their own customers.
                </p>
                <ul className="t-price-features">
                  {[
                    'Unlimited agents and tenants',
                    'Headless API + webhooks + MCP',
                    'SSO, roles, and data residency',
                    'Custom approval and payout rules',
                    'Security review and DPA',
                    'Named support engineer',
                  ].map((feature) => (
                    <li className="t-price-feature" key={feature}>
                      <CheckIcon size={13} /> {feature}
                    </li>
                  ))}
                </ul>
                <Link className="t-btn t-btn-ghost" href="mailto:hello@tanat.app">
                  Book a call
                </Link>
              </article>
            </div>
          </div>
        </section>

        {/* ── FAQ ─────────────────────────────────────────────────────── */}
        <section className="t-section-tight">
          <div className="t-wrap">
            <div className="t-section-head-center t-reveal">
              <span className="t-eyebrow">Questions, answered</span>
              <h2 style={{ marginTop: 18 }}>The things owners ask first.</h2>
            </div>
            <div className="t-faq t-reveal">
              <details>
                <summary>Does Tanat hold my money?</summary>
                <p>
                  No. Tanat is non-custodial. Funds stay in your account or settle
                  directly to you through the payment rail. Tanat holds a scoped
                  credential with a hard cap — not your balance.
                </p>
              </details>
              <details>
                <summary>Can the agent pay without asking me?</summary>
                <p>
                  Only if you explicitly allow it, under a cap you set. By default
                  every money action waits for a named human approver who cannot be
                  the agent that proposed it. You can require approval above any
                  amount, or for every payment.
                </p>
              </details>
              <details>
                <summary>I already have a website and a checkout. Why this?</summary>
                <p>
                  Keep them. Tanat sits in front: the agent answers, recommends,
                  and creates a payment link using your existing provider. You do
                  not rebuild your store to add an agent.
                </p>
              </details>
              <details>
                <summary>What does a customer see at payment time?</summary>
                <p>
                  A hosted Tanat page with your logo, the amount, and the payment
                  methods you enabled — card, bank, stablecoin, or NEAR. No wallet
                  address typing, no card details in chat.
                </p>
              </details>
              <details>
                <summary>Is this only for crypto businesses?</summary>
                <p>
                  No. Crypto is one rail. Most businesses will start with cards or
                  local bank transfer and add cross-chain settlement later. NEAR
                  Intents handles the reach when you want it.
                </p>
              </details>
              <details>
                <summary>How hard is it to integrate?</summary>
                <p>
                  One script tag for a website. <code>npm i @tanat/react</code> for
                  a React app. REST and webhooks if you want to own the interface.
                  A test payment works before you add a payout account.
                </p>
              </details>
              <details>
                <summary>What happens if the AI is wrong?</summary>
                <p>
                  The agent cannot execute money. It can only propose. A wrong
                  proposal is rejected with one tap and written to the audit log.
                  You can also require approval for every message that mentions a
                  price.
                </p>
              </details>
            </div>
          </div>
        </section>

        {/* ── Final CTA ───────────────────────────────────────────────── */}
        <section className="t-cta">
          <div className="t-wrap">
            <div className="t-cta-box t-reveal">
              <div>
                <h2>
                  Put an agent on the payroll.
                  <br />
                  Not on the loose.
                </h2>
                <p>
                  Start in test mode, run a real conversation, approve a test
                  payment, and copy the snippet. Ten minutes from now it can be
                  live on your site.
                </p>
              </div>
              <div className="t-cta-actions">
                <Link className="t-btn t-btn-ink t-btn-lg" href="/start">
                  Start free <ArrowIcon />
                </Link>
                <Link className="t-btn t-btn-ghost t-btn-lg" href="/docs">
                  Read the docs
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
                Payment-ready AI agents for businesses that would rather ship than
                hire a payments team.
              </p>
            </div>
            <div className="t-footer-col">
              <h4>Product</h4>
              <Link href="/#product">Overview</Link>
              <Link href="/#channels">Channels</Link>
              <Link href="/#pricing">Pricing</Link>
              <Link href="/start">Start free</Link>
            </div>
            <div className="t-footer-col">
              <h4>Developers</h4>
              <Link href="/docs">Docs</Link>
              <Link href="/docs/widget">Widget</Link>
              <Link href="/docs/sdk">SDK</Link>
              <Link href="/docs/api">API reference</Link>
            </div>
            <div className="t-footer-col">
              <h4>Company</h4>
              <Link href="/docs/security">Security</Link>
              <a href="mailto:hello@tanat.app">Contact</a>
              <a href="https://near.org" target="_blank" rel="noreferrer">
                Built on NEAR
              </a>
              <Link href="/login">Sign in</Link>
            </div>
          </div>
          <div className="t-footer-bottom">
            <span>© 2026 Tanat. Non-custodial by design.</span>
            <span className="t-footer-status">All systems normal</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
