'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  CursorLogo,
  NextJsLogo,
  ShopifyLogo,
  SlackLogo,
  TanatMascotIcon,
  TelegramLogo,
  WhatsAppLogo,
  WidgetLogo,
  WordPressLogo,
} from '@/components/brand/PlatformLogos';

/* ── 1. Blur Reveal & Animated Counter ───────────────────────────────── */

export function BlurReveal({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.14 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={`tn-reveal ${visible ? 'is-visible' : ''} ${className}`}>
      {children}
    </div>
  );
}

export function AnimatedCounter({
  target,
  suffix = '',
  prefix = '',
}: {
  target: number;
  suffix?: string;
  prefix?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [val, setVal] = useState(target);
  const done = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !done.current) {
          done.current = true;
          const start = performance.now();
          const step = (now: number) => {
            const p = Math.min(1, (now - start) / 1000);
            const eased = 1 - Math.pow(1 - p, 3);
            setVal(Math.round(target * eased));
            if (p < 1) requestAnimationFrame(step);
            else setVal(target);
          };
          requestAnimationFrame(step);
          io.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [target]);

  return (
    <span ref={ref}>
      {prefix}
      {val}
      {suffix}
    </span>
  );
}

/* ── 2. How It Works (Same 3 Tanat Steps, Refined with Tabs) ─────────── */

const STEPS = [
  {
    num: '01',
    tab: '01 Add your business info',
    time: '~1 minute',
    title: 'Paste a URL, upload docs, or write custom FAQs',
    desc: 'Tanat reads your website, PDFs, pricing, and policies in seconds. Your data stays isolated in your own private workspace — never used to train public models.',
    previewTitle: 'Private Knowledge Vault',
    items: [
      'https://yourbusiness.com/faq · Synced',
      'Return_Policy_2026.pdf · 14 sections',
      'Custom Pricing & Hours · Active',
    ],
  },
  {
    num: '02',
    tab: '02 Connect channels & rules',
    time: '~1 minute',
    title: 'Enable Telegram, WhatsApp, Slack & owner guardrails',
    desc: 'Pick where customers reach you and decide what runs automatically vs what waits for your 1-click approval (like refunds, discounts, or bookings).',
    previewTitle: 'Channel & Guardrail Rules',
    items: [
      'Telegram Bot + WhatsApp · Connected',
      'Slack #support-approvals · Active',
      'Refund > $50 → Require 1-Click Sign-Off',
    ],
  },
  {
    num: '03',
    tab: '03 Put it on your site',
    time: '~1 minute',
    title: 'Test live, then copy one line onto your website',
    desc: 'Works instantly on WordPress, Shopify, Framer, Wix, or custom React/Next.js apps — no complex engineering required.',
    previewTitle: '1-Line Embed Ready',
    items: [
      '<script src="https://api.tanat.space/widget.js"',
      '  data-tenant="your-business" async>',
      '</script>',
    ],
  },
];

export function HowItWorksInteractive() {
  const [active, setActive] = useState(0);
  const current = STEPS[active];

  return (
    <div>
      <div className="tn-step-tabs" role="tablist">
        {STEPS.map((s, i) => (
          <button
            key={s.num}
            type="button"
            role="tab"
            aria-selected={i === active}
            className={`tn-step-tab ${i === active ? 'is-active' : ''}`}
            onClick={() => setActive(i)}
          >
            {s.tab}
          </button>
        ))}
      </div>

      <div className="tn-channel-split">
        <div className="tn-channel-left" style={{ justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="tn-eyebrow">STEP {current.num}</span>
            <span
              style={{
                padding: '3px 10px',
                borderRadius: 100,
                background: 'var(--tn-beige)',
                fontSize: 11.5,
                fontWeight: 600,
                color: 'var(--tn-ink)',
              }}
            >
              {current.time}
            </span>
          </div>
          <h3 className="tn-h3">{current.title}</h3>
          <p className="tn-sec-desc">{current.desc}</p>
          <div>
            <Link href="/start" className="tn-btn tn-btn-dark">
              Start 3-minute setup →
            </Link>
          </div>
        </div>

        <div className="tn-channel-right" style={{ justifyContent: 'center' }}>
          <div
            style={{
              background: '#ffffff',
              border: '1px solid var(--tn-border)',
              borderRadius: 18,
              padding: 22,
              boxShadow: '0 20px 40px -22px rgba(0,0,0,0.16)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
              <span className="tn-eyebrow">{current.previewTitle}</span>
              <span className="tn-mint-pill">Verified</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {current.items.map((line) => (
                <div
                  key={line}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 10,
                    background: active === 2 ? '#141414' : 'var(--tn-bg)',
                    color: active === 2 ? '#00ec97' : 'var(--tn-ink)',
                    border: '1px solid var(--tn-border)',
                    fontFamily: active === 2 ? 'var(--tn-font-mono)' : 'var(--tn-font-sans)',
                    fontSize: 13,
                  }}
                >
                  {line}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── 3. Telegram, WhatsApp, Slack & Web Chat in Action ───────────────── */

type ChannelKey = 'telegram' | 'whatsapp' | 'slack' | 'web';

const CHANNELS: Record<
  ChannelKey,
  {
    label: string;
    logo: React.ReactNode;
    headerBg: string;
    headerColor: string;
    botTitle: string;
    subtitle: string;
    userMsg: string;
    tanatMsg: string;
    sourceNote: string;
    actionTitle: string;
    actionBtn: string;
    doneText: string;
  }
> = {
  telegram: {
    label: 'Telegram',
    logo: <TelegramLogo size={18} />,
    headerBg: '#1c2733',
    headerColor: '#ffffff',
    botTitle: '@LoomAndClayBot · Tanat AI',
    subtitle: 'Private Telegram Bot · Encrypted session',
    userMsg: 'Hi! My ceramic lamp arrived with a cracked shade. Can I swap it or get a refund?',
    tanatMsg:
      'Sorry about that! Under our 30-day damage policy, you qualify for a free replacement or a full $145 refund. I prepared the refund for owner sign-off.',
    sourceNote: 'Source: Return Policy §2 · Private workspace',
    actionTitle: 'Owner Approval · Refund $145.00 (#4821)',
    actionBtn: 'Approve in 1 Click',
    doneText: '✓ Refund approved — customer notified on Telegram',
  },
  whatsapp: {
    label: 'WhatsApp',
    logo: <WhatsAppLogo size={18} />,
    headerBg: '#075e54',
    headerColor: '#ffffff',
    botTitle: 'Harbor Dental Studio',
    subtitle: 'WhatsApp Business · Verified',
    userMsg: 'Do you have teeth whitening slots this Friday morning, and what is the deposit?',
    tanatMsg:
      'Yes! We have 9:30 AM and 11:00 AM open this Friday. The deposit is $40 (applied to your visit). Want me to hold 9:30 AM?',
    sourceNote: 'Source: Clinic Schedule & Pricing · Zero data retention',
    actionTitle: 'Hold Friday 9:30 AM · $40.00 Deposit Link',
    actionBtn: 'Confirm Booking',
    doneText: '✓ Slot confirmed — WhatsApp reminder & link sent',
  },
  slack: {
    label: 'Slack',
    logo: <SlackLogo size={18} />,
    headerBg: '#3f0e40',
    headerColor: '#ffffff',
    botTitle: '#ops-helpdesk · @Tanat',
    subtitle: 'Internal Team Workspace · Private',
    userMsg: '@Tanat what is our client travel meal allowance, and do I need pre-approval?',
    tanatMsg:
      'Daily meal allowance is up to $75/day on client trips. Expenses under $250 do not need pre-approval — just upload your receipt within 7 days.',
    sourceNote: 'Source: 2026 Employee Handbook §6 · Team-only access',
    actionTitle: 'Log Travel Allowance Check · #ops-helpdesk',
    actionBtn: 'Log Note to Thread',
    doneText: '✓ Posted policy citation & logged to Slack thread',
  },
  web: {
    label: 'Website Chat',
    logo: <WidgetLogo size={18} />,
    headerBg: '#141414',
    headerColor: '#ffffff',
    botTitle: 'Northwind Agency · Live Assistant',
    subtitle: '1-Line Website Widget · 0.3s response',
    userMsg: 'We need a brand refresh and WordPress site in 6 weeks. Can you help?',
    tanatMsg:
      'Yes — our 6-week Launch Package covers brand identity and WordPress build starting at $4,500. Share your email and I’ll send intro call times.',
    sourceNote: 'Source: Services & Pricing · Lead captured privately',
    actionTitle: 'Route Qualified Lead → CRM & Slack',
    actionBtn: 'Send Intro Link',
    doneText: '✓ Lead routed & calendar link sent to visitor',
  },
};

export function ChannelExamplesExplorer() {
  const [channel, setChannel] = useState<ChannelKey>('telegram');
  const [approved, setApproved] = useState(false);

  const data = CHANNELS[channel];

  return (
    <div className="tn-channel-split">
      <div className="tn-channel-left">
        <span className="tn-eyebrow">LIVE CHANNELS IN ACTION</span>
        <h3 className="tn-h3">
          One private brain across Telegram, WhatsApp, Slack & your website.
        </h3>
        <p className="tn-sec-desc">
          Switch channels below to see how Tanat answers customers and teammates
          using your real policies — while keeping sensitive actions behind your
          1-click approval.
        </p>

        <div className="tn-channel-pills" role="tablist" aria-label="Choose live channel">
          {(Object.keys(CHANNELS) as ChannelKey[]).map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={channel === key}
              className={`tn-channel-pill ${channel === key ? 'is-active' : ''}`}
              onClick={() => {
                setChannel(key);
                setApproved(false);
              }}
            >
              {CHANNELS[key].logo}
              <span>{CHANNELS[key].label}</span>
            </button>
          ))}
        </div>

        <div
          style={{
            marginTop: 6,
            padding: 16,
            borderRadius: 14,
            background: '#ffffff',
            border: '1px solid var(--tn-border)',
            fontSize: 13.5,
            color: 'var(--tn-body)',
          }}
        >
          <div style={{ fontWeight: 600, color: 'var(--tn-ink)', marginBottom: 4 }}>
            Why businesses love this workflow
          </div>
          Every channel shares the same private knowledge base and customer
          memory — set it up once, and it works everywhere.
        </div>
      </div>

      <div className="tn-channel-right">
        <div
          style={{
            background: '#ffffff',
            border: '1px solid var(--tn-border)',
            borderRadius: 20,
            overflow: 'hidden',
            boxShadow: '0 24px 50px -24px rgba(0, 0, 0, 0.22)',
          }}
        >
          {/* Channel Header */}
          <div
            style={{
              background: data.headerBg,
              color: data.headerColor,
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {data.logo}
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{data.botTitle}</div>
                <div style={{ fontSize: 11.5, opacity: 0.78 }}>{data.subtitle}</div>
              </div>
            </div>
            <span className="tn-mint-pill">Live</span>
          </div>

          {/* Chat Thread */}
          <div
            style={{
              padding: 20,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              background: '#faf9f7',
            }}
          >
            <div
              style={{
                alignSelf: 'flex-start',
                maxWidth: '84%',
                background: '#ffffff',
                border: '1px solid var(--tn-border)',
                borderRadius: '14px 14px 14px 4px',
                padding: '11px 14px',
                fontSize: 13.5,
                color: 'var(--tn-ink)',
              }}
            >
              {data.userMsg}
            </div>

            <div
              style={{
                alignSelf: 'flex-end',
                maxWidth: '86%',
                background: '#07291f',
                color: '#ffffff',
                borderRadius: '14px 14px 4px 14px',
                padding: '12px 15px',
                fontSize: 13.5,
                lineHeight: 1.5,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                <TanatMascotIcon size={18} />
                <span style={{ fontSize: 11, fontFamily: 'var(--tn-font-mono)', color: '#00ec97' }}>
                  TANAT AI · 0.3s
                </span>
              </div>
              {data.tanatMsg}
              <div
                style={{
                  marginTop: 8,
                  paddingTop: 6,
                  borderTop: '1px solid rgba(255,255,255,0.14)',
                  fontSize: 11,
                  color: 'rgba(255,255,255,0.72)',
                }}
              >
                {data.sourceNote}
              </div>
            </div>

            {/* Interactive 1-Click Approval Gate */}
            <div
              style={{
                marginTop: 4,
                padding: '12px 14px',
                borderRadius: 14,
                background: approved ? '#ecfdf5' : '#ffffff',
                border: approved ? '1px solid #00c980' : '1px solid var(--tn-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                flexWrap: 'wrap',
              }}
            >
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--tn-ink)' }}>
                  {approved ? data.doneText : data.actionTitle}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--tn-muted)' }}>
                  {approved ? 'Click to reset demo' : 'Human-in-the-loop guardrail'}
                </div>
              </div>
              <button
                type="button"
                className={`tn-btn ${approved ? 'tn-btn-beige' : 'tn-btn-near'}`}
                style={{ height: 34, padding: '0 14px', fontSize: 12.5 }}
                onClick={() => setApproved((v) => !v)}
              >
                {approved ? 'Reset' : data.actionBtn}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── 4. Integration Partner Grid + Code Tabs ─────────────────────────── */

const INTEGRATIONS = [
  {
    id: 'widget',
    name: '1-Line Website Widget',
    tag: 'ANY WEBSITE',
    logo: <WidgetLogo size={22} />,
    code: `<script src="https://api.tanat.space/widget.js" data-tenant="your-biz" async></script>`,
    note: 'Paste once before </body> on HTML, Webflow, Wix, or Framer.',
  },
  {
    id: 'wordpress',
    name: 'WordPress',
    tag: 'PLUGIN / SNIPPET',
    logo: <WordPressLogo size={22} />,
    code: `<!-- Add to Appearance → Theme Header or WPCode -->\n<script src="https://api.tanat.space/widget.js" data-tenant="your-wp-site" async></script>`,
    note: 'Works with WooCommerce, Elementor, and any WordPress theme.',
  },
  {
    id: 'slack',
    name: 'Slack',
    tag: 'TEAM & APPROVALS',
    logo: <SlackLogo size={22} />,
    code: `POST /api/channels/slack/webhook\n{ "channel": "#ops-approvals", "require_signoff": true }`,
    note: 'Answer internal team questions and approve customer actions from Slack.',
  },
  {
    id: 'telegram',
    name: 'Telegram Bot',
    tag: 'BOT TOKEN',
    logo: <TelegramLogo size={22} />,
    code: `1. Create a bot in @BotFather\n2. Paste token in Tanat → Channels → Telegram\n3. Live immediately with private memory`,
    note: 'Webhook configures automatically — zero server setup.',
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    tag: 'MESSAGING',
    logo: <WhatsAppLogo size={22} />,
    code: `POST /api/channels/whatsapp/connect\n{ "phone_number_id": "109283...", "verify": true }`,
    note: 'Reply to bookings, shipping questions, and order lookups 24/7.',
  },
  {
    id: 'shopify',
    name: 'Shopify',
    tag: 'ECOMMERCE',
    logo: <ShopifyLogo size={22} />,
    code: `<!-- Paste in theme.liquid before </body> -->\n<script src="https://api.tanat.space/widget.js" data-tenant="your-shop" async></script>`,
    note: 'Trained on your product catalog, shipping rules, and return policy.',
  },
  {
    id: 'nextjs',
    name: 'Next.js / React',
    tag: 'APP ROUTER',
    logo: <NextJsLogo size={22} />,
    code: `import Script from 'next/script';\n\n<Script src="https://api.tanat.space/widget.js" data-tenant="your-app" strategy="afterInteractive" />`,
    note: 'Zero layout shift, static-export friendly, and lightweight.',
  },
  {
    id: 'cursor',
    name: 'Cursor / Lovable / MCP',
    tag: 'AI BUILDERS',
    logo: <CursorLogo size={22} />,
    code: `Read https://api.tanat.space/llms.txt and embed the Tanat widget for tenant "your-biz".`,
    note: 'Paste into Cursor, Lovable, Bolt, or v0 to integrate automatically.',
  },
];

export function IntegrationPartnerSection() {
  const [selectedId, setSelectedId] = useState('widget');
  const [copied, setCopied] = useState(false);

  const selected = INTEGRATIONS.find((i) => i.id === selectedId) ?? INTEGRATIONS[0];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(selected.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div>
      <div className="tn-int-grid">
        {INTEGRATIONS.map((item) => {
          const isSelected = item.id === selectedId;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setSelectedId(item.id);
                setCopied(false);
              }}
              className="tn-int-card"
              style={{
                textAlign: 'left',
                border: 'none',
                borderRight: '1px solid var(--tn-border)',
                borderBottom: '1px solid var(--tn-border)',
                background: isSelected ? '#ffffff' : undefined,
                boxShadow: isSelected ? 'inset 0 -3px 0 #00ec97' : undefined,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <span className="tn-eyebrow bw-eyebrow-muted" style={{ color: 'var(--tn-muted)' }}>
                  {item.tag}
                </span>
                {item.logo}
              </div>
              <div style={{ fontFamily: 'var(--tn-font-display)', fontWeight: 600, fontSize: 17.5, color: 'var(--tn-ink)' }}>
                {item.name}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Integration Snippet Bar */}
      <div style={{ padding: '24px 36px 40px', background: '#ffffff', borderTop: '1px solid var(--tn-border)' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
            marginBottom: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {selected.logo}
            <span style={{ fontWeight: 600, fontSize: 15 }}>{selected.name}</span>
            <span style={{ fontSize: 13, color: 'var(--tn-muted)' }}>— {selected.note}</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={handleCopy}
              className="tn-btn tn-btn-near"
              style={{ height: 34, padding: '0 14px', fontSize: 12.5 }}
            >
              {copied ? '✓ Copied' : 'Copy snippet'}
            </button>
            <Link
              href="/docs"
              className="tn-btn tn-btn-beige"
              style={{ height: 34, padding: '0 14px', fontSize: 12.5 }}
            >
              Full Docs ↗
            </Link>
          </div>
        </div>

        <pre
          style={{
            margin: 0,
            padding: 16,
            borderRadius: 12,
            background: '#141414',
            color: '#00ec97',
            fontFamily: 'var(--tn-font-mono)',
            fontSize: 12.5,
            overflowX: 'auto',
            lineHeight: 1.55,
          }}
        >
          {selected.code}
        </pre>
      </div>
    </div>
  );
}

/* ── 5. Scroll-Scrubbed Privacy & NEAR AI Cloud Quote ────────────────── */

const PRIVACY_WORDS =
  'Your business knowledge belongs to you, not public AI training sets. Tanat keeps every customer chat private, learns your docs in 60 seconds, and lets you approve big actions in one click.'.split(
    ' ',
  );

export function PrivacyScrubQuote() {
  const ref = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0.35);

  useEffect(() => {
    const onScroll = () => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const raw = (vh * 0.85 - rect.top) / (vh * 0.55 + rect.height * 0.5);
      setProgress(Math.max(0.15, Math.min(1, raw)));
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div ref={ref} className="tn-near-grain tn-quote-card">
      <span className="tn-pushpin tn-pushpin-left" aria-hidden="true" />
      <span className="tn-pushpin tn-pushpin-right" aria-hidden="true" />

      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 18,
          color: '#00ec97',
          fontFamily: 'var(--tn-font-mono)',
          fontSize: 12,
          letterSpacing: '0.08em',
          position: 'relative',
          zIndex: 2,
        }}
      >
        <TanatMascotIcon size={18} />
        <span>PRIVATE BY DEFAULT · BUILT FOR EASE</span>
      </div>

      <p className="tn-quote-text">
        “
        {PRIVACY_WORDS.map((word, i) => {
          const threshold = i / PRIVACY_WORDS.length;
          const active = progress >= threshold;
          return (
            <span
              key={i}
              className="tn-quote-word"
              style={{ opacity: active ? 1 : 0.28 }}
            >
              {word}{' '}
            </span>
          );
        })}
        ”
      </p>
    </div>
  );
}

