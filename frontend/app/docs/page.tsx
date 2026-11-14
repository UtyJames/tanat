'use client';

import { useState } from 'react';
import Link from 'next/link';
import '../landing.css';
import LandingNav from '@/components/landing/LandingNav';
import {
  CursorLogo,
  LovableLogo,
  SlackLogo,
  TanatMascotIcon,
  TelegramLogo,
  WebflowLogo,
  WhatsAppLogo,
} from '@/components/brand/PlatformLogos';
import { PUBLIC_BASE_URL } from '@/lib/api';

const DOC_SECTIONS = [
  { id: 'overview', label: '1. Architecture & Concepts' },
  { id: 'widget', label: '2. Website Widget (1-Line)' },
  { id: 'react', label: '3. React, Next.js & NPM' },
  { id: 'verified-users', label: '4. Verified Customer Identity' },
  { id: 'vibecoding', label: '5. Vibecoding (llms.txt & MCP)' },
  { id: 'api', label: '6. REST API & Governance' },
  { id: 'security', label: '7. Security & Privacy' },
  { id: 'channels', label: '8. Telegram, WhatsApp & Slack' },
];

export default function DocsPage() {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function copyCode(id: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1600);
    } catch {
      setCopiedId(null);
    }
  }

  const widgetCode = `<script
  src="${PUBLIC_BASE_URL}/embed/tanat-widget.js"
  data-key="pk_live_your_publishable_key"
  data-agent="inst_your_installation_id"
  data-api="${PUBLIC_BASE_URL}"
  data-theme="light"
  data-accent="#00EC97"
  data-position="bottom-right"
  data-welcome="Hi! How can I help you today?"
  defer
></script>`;

  const reactCode = `import Script from 'next/script';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Script
          src="${PUBLIC_BASE_URL}/embed/tanat-widget.js"
          data-key={process.env.NEXT_PUBLIC_TANAT_PUBLISHABLE_KEY}
          data-agent={process.env.NEXT_PUBLIC_TANAT_INSTALLATION_ID}
          data-api="${PUBLIC_BASE_URL}"
          data-theme="light"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}`;

  const hmacCode = `// Server-side (Node.js / Next.js Route Handler)
const res = await fetch('${PUBLIC_BASE_URL}/api/v1/platform/verify-user-token', {
  method: 'POST',
  headers: {
    Authorization: \`Bearer \${process.env.TANAT_SECRET_KEY}\`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    installation_id: 'inst_your_installation_id',
    user_id: currentUser.id,
  }),
});
const { data } = await res.json();
// Pass data.user_id and data.user_signature to the widget or public session API`;

  const restCode = `// 1. Open a conversation session
const sessionRes = await fetch('${PUBLIC_BASE_URL}/api/v1/sessions', {
  method: 'POST',
  headers: {
    Authorization: 'Bearer tnt_your_secret_key',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    installation_id: 'inst_your_installation_id',
    user_id: 'customer_4821',
  }),
});
const { data: session } = await sessionRes.json();

// 2. Send a message (grounded in workspace knowledge + customer memory)
const msgRes = await fetch(\`${PUBLIC_BASE_URL}/api/v1/sessions/\${session.id}/messages\`, {
  method: 'POST',
  headers: {
    Authorization: 'Bearer tnt_your_secret_key',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    content: 'What is your SLA credit policy for delayed shipments?',
  }),
});
const { data: reply } = await msgRes.json();
console.log(reply.content, reply.sources_used, reply.proposed_action);`;

  return (
    <div className="tn-site">
      <LandingNav />

      <main>
        {/* ── Hero Banner Matching Landing ────────────────────────────── */}
        <section className="tn-hero-shell">
          <div className="tn-wrap" style={{ padding: 0 }}>
            <div
              className="tn-near-grain tn-hero-card"
              style={{ minHeight: 340, padding: '48px 32px' }}
            >
              <div className="tn-hero-wireframe" />
              <span className="tn-pushpin tn-pushpin-left" aria-hidden="true" />
              <span className="tn-pushpin tn-pushpin-right" aria-hidden="true" />
              <div className="tn-pixel-corner" style={{ top: 18, left: 64 }} aria-hidden="true" />
              <div className="tn-pixel-corner" style={{ bottom: 18, right: 64 }} aria-hidden="true" />

              <div
                className="tn-float-badge tn-float-badge-left"
                style={{ top: 54, left: 36 }}
                aria-hidden="true"
              >
                <LovableLogo size={24} />
              </div>
              <div
                className="tn-float-badge tn-float-badge-right"
                style={{ top: 58, right: 36 }}
                aria-hidden="true"
              >
                <CursorLogo size={24} />
              </div>
              <div
                className="tn-float-badge"
                style={{ bottom: 38, right: 90, animation: 'tn-float-a 6s ease-in-out infinite' }}
                aria-hidden="true"
              >
                <WebflowLogo size={22} />
              </div>

              <span className="tn-eyebrow" style={{ color: '#00ec97', position: 'relative', zIndex: 2 }}>
                DEVELOPER & INTEGRATION GUIDE
              </span>
              <h1
                className="tn-h1 tn-hero-title"
                style={{ fontSize: 'clamp(32px, 4.4vw, 48px)', marginTop: 10 }}
              >
                Set Up &amp; Integrate Tanat in Minutes.
              </h1>
              <p className="tn-hero-sub" style={{ maxWidth: 620, marginTop: 12 }}>
                Whether you’re embedding a 1-line website widget, vibecoding with
                Lovable, Cursor, Bolt, or v0, or connecting Telegram, WhatsApp,
                and Slack — everything runs without infrastructure headaches.
              </p>

              <div
                style={{
                  display: 'flex',
                  gap: 10,
                  marginTop: 24,
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                  position: 'relative',
                  zIndex: 2,
                }}
              >
                <Link className="tn-btn tn-btn-white" href="/start">
                  Start 3-minute setup →
                </Link>
                <a
                  className="tn-btn tn-btn-outline-light"
                  href={`${PUBLIC_BASE_URL}/llms.txt`}
                  target="_blank"
                  rel="noreferrer"
                >
                  View /llms.txt ↗
                </a>
                <a
                  className="tn-btn tn-btn-outline-light"
                  href={`${PUBLIC_BASE_URL}/api/mcp`}
                  target="_blank"
                  rel="noreferrer"
                >
                  View /api/mcp ↗
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ── Architectural Frame Content ─────────────────────────────── */}
        <div className="tn-frame" style={{ borderTop: 'none' }}>
          <div className="tn-hatch" />

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(220px, 260px) 1fr',
              alignItems: 'start',
            }}
          >
            {/* Left Sticky Index */}
            <aside
              style={{
                position: 'sticky',
                top: 98,
                padding: '28px 24px',
                borderRight: '1px dashed var(--tn-border-strong)',
                minHeight: 'calc(100vh - 120px)',
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--tn-font-mono)',
                  fontSize: 11,
                  letterSpacing: '0.08em',
                  color: 'var(--tn-muted)',
                  marginBottom: 14,
                }}
              >
                ON THIS PAGE
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {DOC_SECTIONS.map((s) => (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    style={{
                      fontSize: 13.5,
                      color: 'var(--tn-ink)',
                      fontWeight: 500,
                      padding: '6px 10px',
                      borderRadius: 10,
                      border: '1px solid transparent',
                    }}
                  >
                    {s.label}
                  </a>
                ))}
              </div>

              <div
                style={{
                  marginTop: 28,
                  paddingTop: 18,
                  borderTop: '1px dashed var(--tn-border-strong)',
                }}
              >
                <Link
                  href="/start"
                  className="tn-btn tn-btn-white"
                  style={{ width: '100%', height: 38, fontSize: 13 }}
                >
                  Get started →
                </Link>
              </div>
            </aside>

            {/* Documentation Sections with Dotted/Hairline Linings */}
            <div>
              {/* 1. Architecture */}
              <section
                id="overview"
                style={{ padding: '32px 36px', borderBottom: '1px dashed var(--tn-border-strong)' }}
              >
                <span className="tn-eyebrow">01 / ARCHITECTURE &amp; CONCEPTS</span>
                <h2 className="tn-h3" style={{ marginTop: 8 }}>
                  How Tanat is structured
                </h2>
                <p className="tn-sec-desc" style={{ marginTop: 8, marginBottom: 16 }}>
                  Tanat keeps your private business knowledge separate from the
                  channels where your AI talks:
                </p>
                <ul style={{ lineHeight: 1.8, fontSize: 14.5, color: 'var(--tn-ink)', paddingLeft: 18 }}>
                  <li>
                    <strong>Workspace:</strong> Your private environment holding
                    business docs, team members, API keys, and approval rules.
                  </li>
                  <li>
                    <strong>AI Assistants:</strong> Specialized personas
                    (Support, Sales, Booking, HR, Ops) with your instructions and
                    guardrails.
                  </li>
                  <li>
                    <strong>Channels:</strong> Connect the same AI to your
                    Website Widget, Telegram, WhatsApp, Slack, WordPress,
                    Webflow, or Shopify.
                  </li>
                  <li>
                    <strong>Knowledge &amp; Memory:</strong> Grounded in your
                    URLs, PDFs, and FAQs with persistent per-customer recall.
                  </li>
                </ul>
              </section>

              {/* 2. Website Widget */}
              <section
                id="widget"
                style={{ padding: '32px 36px', borderBottom: '1px dashed var(--tn-border-strong)' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                  <span className="tn-eyebrow">02 / WEBSITE WIDGET (1-LINE)</span>
                  <button
                    type="button"
                    className="tn-btn tn-btn-white"
                    style={{ height: 34, padding: '0 14px', fontSize: 12.5 }}
                    onClick={() => void copyCode('widget', widgetCode)}
                  >
                    {copiedId === 'widget' ? 'Copied ✓' : 'Copy snippet'}
                  </button>
                </div>
                <h2 className="tn-h3" style={{ marginTop: 8 }}>
                  Embed on any website with one script tag
                </h2>
                <p className="tn-sec-desc" style={{ marginTop: 8, marginBottom: 16 }}>
                  Renders inside an isolated Shadow DOM so your CSS never breaks.
                  Works on WordPress, Webflow, Shopify, Framer, Wix, or custom HTML.
                </p>
                <pre
                  style={{
                    background: '#141414',
                    color: '#00ec97',
                    padding: 18,
                    borderRadius: 14,
                    overflowX: 'auto',
                    fontSize: 12.5,
                    fontFamily: 'var(--tn-font-mono)',
                    margin: 0,
                  }}
                >
                  {widgetCode}
                </pre>
                <p style={{ marginTop: 12, fontSize: 13.5, color: 'var(--tn-body)' }}>
                  <strong>Programmatic Control:</strong> Call{' '}
                  <code>window.TanatWidget.open()</code>,{' '}
                  <code>window.TanatWidget.close()</code>, or{' '}
                  <code>window.TanatWidget.toggle()</code> from any button.
                </p>
              </section>

              {/* 3. React / Next.js */}
              <section
                id="react"
                style={{ padding: '32px 36px', borderBottom: '1px dashed var(--tn-border-strong)' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                  <span className="tn-eyebrow">03 / REACT, NEXT.JS &amp; MODERN WEB</span>
                  <button
                    type="button"
                    className="tn-btn tn-btn-white"
                    style={{ height: 34, padding: '0 14px', fontSize: 12.5 }}
                    onClick={() => void copyCode('react', reactCode)}
                  >
                    {copiedId === 'react' ? 'Copied ✓' : 'Copy Next.js code'}
                  </button>
                </div>
                <h2 className="tn-h3" style={{ marginTop: 8 }}>
                  Integrate into React, Next.js, Remix, or Vite
                </h2>
                <p className="tn-sec-desc" style={{ marginTop: 8, marginBottom: 16 }}>
                  Drop the script component into your root layout — zero heavy
                  client bundles.
                </p>
                <pre
                  style={{
                    background: '#141414',
                    color: '#00ec97',
                    padding: 18,
                    borderRadius: 14,
                    overflowX: 'auto',
                    fontSize: 12.5,
                    fontFamily: 'var(--tn-font-mono)',
                    margin: 0,
                  }}
                >
                  {reactCode}
                </pre>
              </section>

              {/* 4. Verified Customer Identity */}
              <section
                id="verified-users"
                style={{ padding: '32px 36px', borderBottom: '1px dashed var(--tn-border-strong)' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                  <span className="tn-eyebrow">04 / VERIFIED CUSTOMER IDENTITY &amp; MEMORY</span>
                  <button
                    type="button"
                    className="tn-btn tn-btn-white"
                    style={{ height: 34, padding: '0 14px', fontSize: 12.5 }}
                    onClick={() => void copyCode('hmac', hmacCode)}
                  >
                    {copiedId === 'hmac' ? 'Copied ✓' : 'Copy HMAC example'}
                  </button>
                </div>
                <h2 className="tn-h3" style={{ marginTop: 8 }}>
                  Let your AI know which logged-in customer it is helping
                </h2>
                <p className="tn-sec-desc" style={{ marginTop: 8, marginBottom: 16 }}>
                  Sign the customer’s ID with HMAC-SHA256 from your backend so
                  order lookups and memory recall cannot be spoofed in the browser.
                </p>
                <pre
                  style={{
                    background: '#141414',
                    color: '#00ec97',
                    padding: 18,
                    borderRadius: 14,
                    overflowX: 'auto',
                    fontSize: 12.5,
                    fontFamily: 'var(--tn-font-mono)',
                    margin: 0,
                  }}
                >
                  {hmacCode}
                </pre>
              </section>

              {/* 5. Vibecoding & MCP */}
              <section
                id="vibecoding"
                style={{ padding: '32px 36px', borderBottom: '1px dashed var(--tn-border-strong)' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <LovableLogo size={20} />
                  <CursorLogo size={18} />
                  <span className="tn-eyebrow">05 / VIBECODING (LOVABLE, CURSOR, BOLT, V0) &amp; MCP</span>
                </div>
                <h2 className="tn-h3" style={{ marginTop: 10 }}>
                  AI-Native Integration via /llms.txt and /api/mcp
                </h2>
                <p className="tn-sec-desc" style={{ marginTop: 8, marginBottom: 14 }}>
                  Whether you’re vibecoding a SaaS app or automating internal ops,
                  let your coding tool wire Tanat in one prompt:
                </p>
                <ul style={{ lineHeight: 1.8, fontSize: 14.5, color: 'var(--tn-ink)', paddingLeft: 18 }}>
                  <li>
                    <code>GET /llms.txt</code> — Machine-readable guide with exact
                    widget attributes, public session endpoints, and REST schemas.
                  </li>
                  <li>
                    <code>GET /api/mcp</code> — Model Context Protocol manifest
                    exposing <code>tanat_open_session</code>,{' '}
                    <code>tanat_send_message</code>,{' '}
                    <code>tanat_add_knowledge</code>, and{' '}
                    <code>tanat_create_payment_intent</code>.
                  </li>
                  <li>
                    In your Workspace Dashboard under{' '}
                    <strong>Developers &amp; MCP</strong>, click{' '}
                    <strong>Copy Vibecoder Prompt</strong> to grab a prompt
                    pre-filled with your real keys.
                  </li>
                </ul>
              </section>

              {/* 6. REST API */}
              <section
                id="api"
                style={{ padding: '32px 36px', borderBottom: '1px dashed var(--tn-border-strong)' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                  <span className="tn-eyebrow">06 / HEADLESS REST API</span>
                  <button
                    type="button"
                    className="tn-btn tn-btn-white"
                    style={{ height: 34, padding: '0 14px', fontSize: 12.5 }}
                    onClick={() => void copyCode('rest', restCode)}
                  >
                    {copiedId === 'rest' ? 'Copied ✓' : 'Copy REST example'}
                  </button>
                </div>
                <h2 className="tn-h3" style={{ marginTop: 8 }}>
                  Full programmatic control over knowledge and actions
                </h2>
                <p className="tn-sec-desc" style={{ marginTop: 8, marginBottom: 16 }}>
                  Authenticate server-to-server requests with{' '}
                  <code>Authorization: Bearer tnt_...</code>.
                </p>
                <pre
                  style={{
                    background: '#141414',
                    color: '#00ec97',
                    padding: 18,
                    borderRadius: 14,
                    overflowX: 'auto',
                    fontSize: 12.5,
                    fontFamily: 'var(--tn-font-mono)',
                    margin: 0,
                  }}
                >
                  {restCode}
                </pre>
              </section>

              {/* 7. Security */}
              <section
                id="security"
                style={{ padding: '32px 36px', borderBottom: '1px dashed var(--tn-border-strong)' }}
              >
                <span className="tn-eyebrow">07 / SECURITY &amp; PRIVACY</span>
                <h2 className="tn-h3" style={{ marginTop: 8 }}>
                  Your business data stays private and under your control
                </h2>
                <ul style={{ lineHeight: 1.8, fontSize: 14.5, color: 'var(--tn-ink)', paddingLeft: 18, marginTop: 12 }}>
                  <li>
                    <strong>Private Workspace Isolation:</strong> Your documents,
                    URLs, and customer chats are never used to train public AI
                    models.
                  </li>
                  <li>
                    <strong>Publishable vs. Secret Keys:</strong> Publishable keys
                    (<code>pk_...</code>) are strictly scoped to allowlisted
                    domains and can never approve actions or change settings.
                  </li>
                  <li>
                    <strong>1-Click Human Approvals:</strong> Financial or
                    high-impact actions pause in <code>pending</code> state until
                    you sign off.
                  </li>
                </ul>
              </section>

              {/* 8. Messaging Channels */}
              <section id="channels" style={{ padding: '32px 36px' }}>
                <span className="tn-eyebrow">08 / MESSAGING CHANNELS</span>
                <h2 className="tn-h3" style={{ marginTop: 8 }}>
                  Telegram, WhatsApp &amp; Slack Integration
                </h2>
                <p className="tn-sec-desc" style={{ marginTop: 8 }}>
                  Deploy the exact same AI across messaging channels with zero
                  server setup:
                </p>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: 16,
                    marginTop: 18,
                  }}
                >
                  <div
                    style={{
                      padding: 18,
                      borderRadius: 16,
                      border: '1px solid var(--tn-border)',
                      background: '#ffffff',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <TelegramLogo size={20} />
                      <h3 style={{ fontSize: 16 }}>Telegram Bot</h3>
                    </div>
                    <p style={{ fontSize: 13.5, color: 'var(--tn-body)', lineHeight: 1.6 }}>
                      Paste your <strong>@BotFather</strong> token. Tanat configures
                      the webhook automatically with secret token verification.
                    </p>
                  </div>

                  <div
                    style={{
                      padding: 18,
                      borderRadius: 16,
                      border: '1px solid var(--tn-border)',
                      background: '#ffffff',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <WhatsAppLogo size={20} />
                      <h3 style={{ fontSize: 16 }}>WhatsApp Business</h3>
                    </div>
                    <p style={{ fontSize: 13.5, color: 'var(--tn-body)', lineHeight: 1.6 }}>
                      Connect Meta WhatsApp Cloud API with your Phone Number ID and
                      permanent token in under a minute.
                    </p>
                  </div>

                  <div
                    style={{
                      padding: 18,
                      borderRadius: 16,
                      border: '1px solid var(--tn-border)',
                      background: '#ffffff',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <SlackLogo size={20} />
                      <h3 style={{ fontSize: 16 }}>Slack Workspace</h3>
                    </div>
                    <p style={{ fontSize: 13.5, color: 'var(--tn-body)', lineHeight: 1.6 }}>
                      Answer internal team questions and route owner approval alerts
                      straight into Slack channels.
                    </p>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </main>

      {/* ── Matching Dark Footer ──────────────────────────────────────── */}
      <footer className="tn-footer">
        <div className="tn-footer-grid">
          <div className="tn-footer-col">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <TanatMascotIcon size={36} />
              <span style={{ fontFamily: 'var(--tn-font-display)', fontWeight: 600, fontSize: 19 }}>
                Tanat
              </span>
            </div>
            <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.68)', marginTop: 6 }}>
              Private AI for real businesses — easy to set up, works across
              every channel, and stays under your control.
            </p>
            <div style={{ marginTop: 8 }}>
              <Link href="/start" className="tn-btn tn-btn-white" style={{ height: 38, fontSize: 13 }}>
                Get started →
              </Link>
            </div>
          </div>

          <div className="tn-footer-col">
            <h4>Product</h4>
            <Link href="/#how-it-works">How it works</Link>
            <Link href="/#examples">Telegram, WhatsApp &amp; Slack</Link>
            <Link href="/#integrate">Vibecoding &amp; setup</Link>
            <Link href="/#privacy">Privacy &amp; control</Link>
          </div>

          <div className="tn-footer-col">
            <h4>Integration</h4>
            <Link href="/docs">Documentation</Link>
            <Link href="/docs#widget">1-Line Widget</Link>
            <Link href="/docs#vibecoding">Cursor / Lovable / v0</Link>
            <a href="https://api.tanat.space/llms.txt" target="_blank" rel="noreferrer">
              llms.txt
            </a>
          </div>

          <div className="tn-footer-col">
            <h4>Account</h4>
            <Link href="/login">Sign in</Link>
            <Link href="/app">Workspace dashboard</Link>
            <Link href="/start">3-minute setup</Link>
            <a href="mailto:hello@tanat.space">hello@tanat.space</a>
          </div>
        </div>

        <div
          style={{
            maxWidth: 1180,
            margin: '18px auto 0',
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 12.5,
            color: 'rgba(255,255,255,0.48)',
          }}
        >
          <span>© 2026 Tanat. Built for real businesses.</span>
          <span>All systems operational</span>
        </div>

        <div className="tn-footer-wordmark" aria-hidden="true">
          Tanat
        </div>
      </footer>
    </div>
  );
}
