'use client';

import { useState } from 'react';

type Tab = {
  id: string;
  name: string;
  fileName: string;
  blurb: string;
  code: string;
  foot: string;
};

const tabs: Tab[] = [
  {
    id: 'widget',
    name: 'Website widget',
    fileName: 'index.html',
    blurb: 'One line. Any site.',
    code: `<!-- Paste once, anywhere in <body> -->
<script
  src="https://tanat.app/embed/tanat-widget.js"
  data-key="pk_live_7f3a9c2e"
  data-agent="agt_store"
  data-theme="light"
  data-position="bottom-right"
  defer
></script>`,
    foot: 'No build step · Shadow DOM · 11kb gzipped',
  },
  {
    id: 'react',
    name: 'React / Next.js',
    fileName: 'app/layout.tsx',
    blurb: 'For the vibecoders.',
    code: `import { TanatWidget } from '@tanat/react';

export default function Layout({ children }) {
  return (
    <>
      {children}
      <TanatWidget
        publishableKey="pk_live_7f3a9c2e"
        agent="agt_store"
        theme="light"
        onPaymentApproved={(payment) => {
          console.log('paid', payment.id);
        }}
      />
    </>
  );
}`,
    foot: 'npm i @tanat/react · TypeScript · SSR-safe',
  },
  {
    id: 'api',
    name: 'Headless API',
    fileName: 'server.ts',
    blurb: 'Your UI, our agent.',
    code: `import { Tanat } from '@tanat/server';

const tanat = new Tanat(process.env.TANAT_SECRET_KEY);

const session = await tanat.sessions.create({
  installation: 'inst_store',
  customer: { id: user.id, email: user.email },
});

const reply = await tanat.messages.send(session.id, {
  text: 'Refund order #4821 — the mug arrived cracked.',
});

// reply.proposal = { id, amount, currency, status: 'pending_approval' }
// Nothing moves until a human approves.`,
    foot: 'Typed SDK · webhooks · idempotency built in',
  },
];

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function highlight(code: string): string {
  const escaped = escapeHtml(code);
  return escaped.replace(
    /(<!--[\s\S]*?-->|\/\/[^\n]*)|(&quot;[^&]*?&quot;|&#39;[^&]*?&#39;|`[^`]*?`)/g,
    (match, comment, string) => {
      if (comment) return `<span class="c-comment">${comment}</span>`;
      if (string) return `<span class="c-str">${string}</span>`;
      return match;
    },
  );
}

export default function CodeTabs() {
  const [active, setActive] = useState(tabs[0].id);
  const [copied, setCopied] = useState(false);
  const tab = tabs.find((item) => item.id === active) ?? tabs[0];

  async function copy() {
    try {
      await navigator.clipboard.writeText(tab.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="t-doors">
      <div>
        <div className="t-door-list">
          {tabs.map((item) => (
            <button
              key={item.id}
              className={`t-door ${item.id === active ? 'active' : ''}`}
              onClick={() => setActive(item.id)}
            >
              <span className="t-door-top">
                {item.name}
                <span className="t-mono">{item.blurb}</span>
              </span>
              <p>{item.foot}</p>
            </button>
          ))}
        </div>
        <p
          style={{
            marginTop: 22,
            fontSize: 13.5,
            color: 'var(--muted)',
            lineHeight: 1.6,
            maxWidth: 360,
          }}
        >
          Same agent, same approval rules, same audit trail — whichever door you
          walk through. Start with the widget, graduate to the API.
        </p>
      </div>

      <div className="t-code">
        <div className="t-code-top">
          <span className="t-code-file">{tab.fileName}</span>
          <span>{tab.name}</span>
          <button className="t-code-copy" onClick={() => void copy()}>
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        <pre dangerouslySetInnerHTML={{ __html: highlight(tab.code) }} />
        <div className="t-code-foot">
          <span style={{ color: 'var(--lime)' }}>●</span>
          {tab.foot}
        </div>
      </div>
    </div>
  );
}
