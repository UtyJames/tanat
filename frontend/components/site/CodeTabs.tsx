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
    name: '1. Copy & Paste (Any Website)',
    fileName: 'index.html',
    blurb: 'Easiest · No code needed',
    code: `<!-- Paste once before </body> on Shopify, WordPress, Wix, Webflow, or HTML -->
<script
  src="https://www.tanat.space/embed/tanat-widget.js"
  data-key="pk_live_your_key"
  data-agent="inst_your_agent"
  data-api="https://api.tanat.space"
  data-theme="light"
  defer
></script>`,
    foot: 'Takes 30 seconds · Works on every website builder · Safe for browsers',
  },
  {
    id: 'vibecode',
    name: '2. AI Builders (Cursor / Lovable / v0)',
    fileName: 'prompt.txt',
    blurb: '1-click AI setup',
    code: `# Paste this prompt into Cursor, Lovable, Bolt, or v0:

Read https://api.tanat.space/llms.txt and add our Tanat AI assistant to this app:
<script
  src="https://www.tanat.space/embed/tanat-widget.js"
  data-key="pk_live_your_key"
  data-agent="inst_your_agent"
  data-api="https://api.tanat.space"
  defer
></script>`,
    foot: 'We give you this exact prompt pre-filled with your keys after setup',
  },
  {
    id: 'api',
    name: '3. React / Next.js & API',
    fileName: 'app/layout.tsx',
    blurb: 'For developers',
    code: `import Script from 'next/script';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Script
          src="https://www.tanat.space/embed/tanat-widget.js"
          data-key={process.env.NEXT_PUBLIC_TANAT_PUBLISHABLE_KEY}
          data-agent={process.env.NEXT_PUBLIC_TANAT_INSTALLATION_ID}
          data-api="https://api.tanat.space"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}`,
    foot: 'Full REST API & verified customer identity also available at api.tanat.space',
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
    /(<!--[\s\S]*?-->|\/\/[^\n]*|#[^\n]*)|(&quot;[^&]*?&quot;|&#39;[^&]*?&#39;|`[^`]*?`)/g,
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
            marginTop: 20,
            fontSize: 14,
            color: 'var(--muted)',
            lineHeight: 1.6,
            maxWidth: 360,
          }}
        >
          When you finish the 3-minute setup, Tanat generates your live snippet
          automatically — just copy, paste, and your assistant is live.
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
