'use client';

import { useState } from 'react';
import Link from 'next/link';
import SiteNav from '@/components/site/SiteNav';
import { ArrowIcon, Logo } from '@/components/brand/Logo';
import { PUBLIC_BASE_URL } from '@/lib/api';

const DOC_SECTIONS = [
  { id: 'overview', label: '1. Architecture & Concepts' },
  { id: 'widget', label: '2. Website Widget (1-Line)' },
  { id: 'react', label: '3. React, Next.js & NPM' },
  { id: 'verified-users', label: '4. Verified Customer Identity' },
  { id: 'vibecoding', label: '5. Vibecoding (llms.txt & MCP)' },
  { id: 'api', label: '6. REST API & Governance' },
  { id: 'security', label: '7. Security & TEE Isolation' },
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
  data-accent="#0C0D0B"
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
    <div className="site">
      <SiteNav />

      <main className="t-section" style={{ paddingTop: 48 }}>
        <div className="t-wrap">
          <div style={{ maxWidth: 760, marginBottom: 40 }}>
            <span className="t-eyebrow">Developer & Integration Guide</span>
            <h1 style={{ fontSize: 'clamp(34px, 4.5vw, 54px)', marginTop: 14, lineHeight: 1.06 }}>
              Build on Tanat AI Infrastructure.
            </h1>
            <p className="t-hero-lede" style={{ marginTop: 14 }}>
              Whether you are embedding a no-code website widget, integrating via
              Cursor / Lovable / Bolt / v0, or building custom multi-agent
              workflows over REST and Model Context Protocol (MCP), everything
              runs on the same tenant-isolated infrastructure.
            </p>
            <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
              <Link className="t-btn t-btn-lime" href="/start">
                Create Workspace & Keys <ArrowIcon />
              </Link>
              <a
                className="t-btn t-btn-ghost"
                href="/llms.txt"
                target="_blank"
                rel="noreferrer"
              >
                View /llms.txt
              </a>
              <a
                className="t-btn t-btn-ghost"
                href={`${PUBLIC_BASE_URL}/api/mcp`}
                target="_blank"
                rel="noreferrer"
              >
                View /api/mcp Manifest
              </a>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '240px 1fr',
              gap: 36,
              alignItems: 'start',
            }}
          >
            {/* Left Sticky Index */}
            <aside
              style={{
                position: 'sticky',
                top: 90,
                padding: 16,
                borderRadius: 14,
                border: '1px solid var(--line)',
                background: '#fff',
              }}
            >
              <div
                className="t-mono"
                style={{ fontSize: 10.5, color: 'var(--muted)', marginBottom: 10 }}
              >
                ON THIS PAGE
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {DOC_SECTIONS.map((s) => (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    style={{
                      fontSize: 13,
                      color: 'var(--ink)',
                      textDecoration: 'none',
                      fontWeight: 500,
                    }}
                  >
                    {s.label}
                  </a>
                ))}
              </div>
            </aside>

            {/* Documentation Content */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
              {/* 1. Architecture */}
              <section id="overview" className="t-problem" style={{ padding: 28 }}>
                <span className="t-problem-num">01 / ARCHITECTURE & CONCEPTS</span>
                <h2>How Tanat is structured</h2>
                <p style={{ marginBottom: 14 }}>
                  Tanat cleanly separates your business organization from the AI
                  agents and channels you deploy:
                </p>
                <ul style={{ lineHeight: 1.75, fontSize: 14, color: 'var(--ink)' }}>
                  <li>
                    <strong>Tenant (Workspace):</strong> Your isolated business
                    environment holding shared knowledge, team members, API keys,
                    and governance policies.
                  </li>
                  <li>
                    <strong>Agents:</strong> Specialized AI personas (Support,
                    Sales, Booking, HR, Operations, Finance, Custom) with versioned
                    instructions and tool permissions.
                  </li>
                  <li>
                    <strong>Installations & Channels:</strong> A deployment binding
                    an Agent to a surface (Website Widget, WhatsApp, Telegram,
                    Slack, Shopify, or Custom API).
                  </li>
                  <li>
                    <strong>Knowledge & Memory:</strong> Approved business sources
                    (FAQs, policies, URLs, documents) plus persistent per-customer
                    memories recalled across sessions.
                  </li>
                </ul>
              </section>

              {/* 2. Website Widget */}
              <section id="widget" className="t-problem" style={{ padding: 28 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="t-problem-num">02 / WEBSITE WIDGET (NO-CODE / 1-LINE)</span>
                  <button
                    className="t-mini-btn"
                    style={{ width: 'auto', padding: '0 12px', height: 28 }}
                    onClick={() => void copyCode('widget', widgetCode)}
                  >
                    {copiedId === 'widget' ? 'Copied ✓' : 'Copy snippet'}
                  </button>
                </div>
                <h2>Embed on any website with one script tag</h2>
                <p style={{ marginBottom: 14 }}>
                  The Tanat widget renders inside an isolated Shadow DOM container
                  so your website’s CSS never collides with the chat interface. It
                  authenticates using an origin-locked publishable key (
                  <code>pk_...</code>) that can only open sessions and send
                  messages from your allowed domains.
                </p>
                <pre
                  style={{
                    background: '#0C0D0B',
                    color: '#F6F3EA',
                    padding: 16,
                    borderRadius: 12,
                    overflowX: 'auto',
                    fontSize: 12.5,
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {widgetCode}
                </pre>
                <p style={{ marginTop: 12, fontSize: 13 }}>
                  <strong>Programmatic Control:</strong> Once loaded, you can call{' '}
                  <code>window.TanatWidget.open()</code>,{' '}
                  <code>window.TanatWidget.close()</code>, or{' '}
                  <code>window.TanatWidget.toggle()</code> from any button on your
                  page.
                </p>
              </section>

              {/* 3. React / Next.js */}
              <section id="react" className="t-problem" style={{ padding: 28 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="t-problem-num">03 / REACT, NEXT.JS & MODERN WEB</span>
                  <button
                    className="t-mini-btn"
                    style={{ width: 'auto', padding: '0 12px', height: 28 }}
                    onClick={() => void copyCode('react', reactCode)}
                  >
                    {copiedId === 'react' ? 'Copied ✓' : 'Copy Next.js code'}
                  </button>
                </div>
                <h2>Integrate into React, Next.js, Remix, or Vite</h2>
                <p style={{ marginBottom: 14 }}>
                  Drop the script component into your root layout or page. No build
                  plugins or heavy client bundles required.
                </p>
                <pre
                  style={{
                    background: '#0C0D0B',
                    color: '#F6F3EA',
                    padding: 16,
                    borderRadius: 12,
                    overflowX: 'auto',
                    fontSize: 12.5,
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {reactCode}
                </pre>
              </section>

              {/* 4. Verified Customer Identity */}
              <section id="verified-users" className="t-problem" style={{ padding: 28 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="t-problem-num">04 / VERIFIED CUSTOMER IDENTITY & MEMORY</span>
                  <button
                    className="t-mini-btn"
                    style={{ width: 'auto', padding: '0 12px', height: 28 }}
                    onClick={() => void copyCode('hmac', hmacCode)}
                  >
                    {copiedId === 'hmac' ? 'Copied ✓' : 'Copy HMAC example'}
                  </button>
                </div>
                <h2>Let the agent know which logged-in customer it is helping</h2>
                <p style={{ marginBottom: 14 }}>
                  For account-specific workflows (like order lookups, persistent
                  memory recall, or refund requests), your backend can sign the
                  customer’s ID with HMAC-SHA256 so it cannot be spoofed in the
                  browser.
                </p>
                <pre
                  style={{
                    background: '#0C0D0B',
                    color: '#F6F3EA',
                    padding: 16,
                    borderRadius: 12,
                    overflowX: 'auto',
                    fontSize: 12.5,
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {hmacCode}
                </pre>
              </section>

              {/* 5. Vibecoding & MCP */}
              <section id="vibecoding" className="t-problem" style={{ padding: 28 }}>
                <span className="t-problem-num">05 / VIBECODING (CURSOR, LOVABLE, BOLT, V0) & MCP</span>
                <h2>AI-Native Integration via /llms.txt and /api/mcp</h2>
                <p style={{ marginBottom: 14 }}>
                  Tanat is built for teams shipping with AI coding assistants:
                </p>
                <ul style={{ lineHeight: 1.75, fontSize: 14 }}>
                  <li>
                    <code>GET /llms.txt</code> — Machine-readable guide containing
                    exact widget attributes, public session endpoints, and
                    authenticated REST schemas.
                  </li>
                  <li>
                    <code>GET /api/mcp</code> — Model Context Protocol discovery
                    manifest exposing <code>tanat_open_session</code>,{' '}
                    <code>tanat_send_message</code>,{' '}
                    <code>tanat_add_knowledge</code>, and{' '}
                    <code>tanat_create_payment_intent</code>.
                  </li>
                  <li>
                    In your Workspace Dashboard under{' '}
                    <strong>Developers & MCP</strong>, click{' '}
                    <strong>Copy Vibecoder Prompt</strong> to get a ready-to-paste
                    prompt pre-filled with your real <code>pk_...</code> and{' '}
                    <code>inst_...</code> IDs.
                  </li>
                </ul>
              </section>

              {/* 6. REST API */}
              <section id="api" className="t-problem" style={{ padding: 28 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="t-problem-num">06 / HEADLESS REST API</span>
                  <button
                    className="t-mini-btn"
                    style={{ width: 'auto', padding: '0 12px', height: 28 }}
                    onClick={() => void copyCode('rest', restCode)}
                  >
                    {copiedId === 'rest' ? 'Copied ✓' : 'Copy REST example'}
                  </button>
                </div>
                <h2>Full programmatic control over agents, knowledge, and actions</h2>
                <p style={{ marginBottom: 14 }}>
                  Authenticate server-to-server requests with{' '}
                  <code>Authorization: Bearer tnt_...</code>.
                </p>
                <pre
                  style={{
                    background: '#0C0D0B',
                    color: '#F6F3EA',
                    padding: 16,
                    borderRadius: 12,
                    overflowX: 'auto',
                    fontSize: 12.5,
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {restCode}
                </pre>
              </section>

              {/* 7. Security */}
              <section id="security" className="t-problem" style={{ padding: 28 }}>
                <span className="t-problem-num">07 / SECURITY, TEE & GOVERNANCE</span>
                <h2>Security & Isolation Guarantees</h2>
                <ul style={{ lineHeight: 1.75, fontSize: 14 }}>
                  <li>
                    <strong>Hardware-Attested TEE Inference:</strong> AI inference
                    runs on NEAR AI Cloud inside Trusted Execution Environments.
                  </li>
                  <li>
                    <strong>Publishable vs. Secret Keys:</strong> Publishable keys
                    (<code>pk_...</code>) are strictly scoped to opening sessions
                    and sending messages from allowlisted origins. They can never
                    approve actions, read other sessions, or modify workspace
                    settings.
                  </li>
                  <li>
                    <strong>Human-in-the-Loop Approvals:</strong> High-impact and
                    financial actions remain in <code>pending</code> state until an
                    authorized operator approves them.
                  </li>
                </ul>
              </section>
            </div>
          </div>
        </div>
      </main>

      <footer className="t-footer">
        <div className="t-wrap">
          <div className="t-footer-bottom">
            <Logo size={26} tone="bone" />
            <span>© 2026 Tanat AI Infrastructure.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

