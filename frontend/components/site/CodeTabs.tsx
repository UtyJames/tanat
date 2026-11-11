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
    blurb: 'One script tag. Any site.',
    code: `<!-- Embed any Tanat agent on your website -->
<script
  src="https://your-tanat-host/embed/tanat-widget.js"
  data-key="pk_live_7f3a9c2e"
  data-agent="inst_support_agent"
  data-theme="light"
  data-position="bottom-right"
  data-welcome="Hi! Ask me anything about our services, policies, or bookings."
  defer
></script>`,
    foot: 'Zero dependencies · Shadow DOM isolated · Origin-locked publishable key',
  },
  {
    id: 'react',
    name: 'React / Next.js',
    fileName: 'app/layout.tsx',
    blurb: 'For modern web apps.',
    code: `import Script from 'next/script';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Script
          src="https://your-tanat-host/embed/tanat-widget.js"
          data-key={process.env.NEXT_PUBLIC_TANAT_PUBLISHABLE_KEY}
          data-agent={process.env.NEXT_PUBLIC_TANAT_INSTALLATION_ID}
          data-user-id="usr_4821"
          data-user-signature="hmac_sha256_verified_token"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}`,
    foot: 'Verified customer identity via HMAC · Works in Next.js App Router, Remix & Vite',
  },
  {
    id: 'api',
    name: 'REST & Headless API',
    fileName: 'agent-workflow.ts',
    blurb: 'Full programmatic control.',
    code: `// Open a tenant-isolated conversation & run an agent with knowledge + memory
const sessionRes = await fetch('https://your-tanat-host/api/v1/sessions', {
  method: 'POST',
  headers: {
    Authorization: \`Bearer \${process.env.TANAT_SECRET_KEY}\`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    installation_id: 'inst_ops_agent',
    user_id: 'employee_94',
  }),
});
const { data: session } = await sessionRes.json();

const replyRes = await fetch(\`https://your-tanat-host/api/v1/sessions/\${session.id}/messages\`, {
  method: 'POST',
  headers: {
    Authorization: \`Bearer \${process.env.TANAT_SECRET_KEY}\`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    content: 'Summarize our Q3 vendor onboarding policy and flag any required approvals.',
  }),
});
const { data: reply } = await replyRes.json();
// reply.sources_used -> cited knowledge docs
// reply.proposed_action -> human-in-the-loop approval record`,
    foot: 'Tenant-scoped API keys · Knowledge citations · Human-in-the-loop approvals',
  },
  {
    id: 'vibecode',
    name: 'Cursor / Lovable / v0',
    fileName: 'llms.txt & MCP',
    blurb: 'AI-native integration.',
    code: `# Drop this prompt into Cursor, Lovable, Bolt, v0, or Claude Code:

Read https://your-tanat-host/llms.txt and https://your-tanat-host/api/mcp
Integrate our Tanat AI agent into this app:
1. Embed /embed/tanat-widget.js with data-key="pk_live_..." and data-agent="inst_..."
2. Or call POST /api/public/v1/sessions and /api/public/v1/sessions/:id/messages
   with header X-Tanat-Publishable-Key.
3. Render knowledge citations and approval cards when proposed_action is returned.`,
    foot: 'Machine-readable /llms.txt · /api/mcp tool discovery · One-click prompt copy in dashboard',
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
            marginTop: 22,
            fontSize: 13.5,
            color: 'var(--muted)',
            lineHeight: 1.6,
            maxWidth: 360,
          }}
        >
          Every agent you configure in Tanat is immediately available as a no-code
          website widget, a verified customer chat session, or a programmable REST
          and MCP endpoint.
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
