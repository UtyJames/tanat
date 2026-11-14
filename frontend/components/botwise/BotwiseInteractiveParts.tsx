'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

/* ── 1. Blur Reveal Wrapper ──────────────────────────────────────────── */

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
    <div ref={ref} className={`bw-reveal ${visible ? 'is-visible' : ''} ${className}`}>
      {children}
    </div>
  );
}

/* ── 2. Scroll-Triggered Animated Counter ────────────────────────────── */

export function AnimatedCounter({
  target,
  suffix = '',
  prefix = '',
  decimals = 0,
}: {
  target: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [val, setVal] = useState(target);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          const start = performance.now();
          const duration = 1100;
          const step = (now: number) => {
            const p = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - p, 3);
            setVal(target * eased);
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
      {decimals > 0 ? val.toFixed(decimals) : Math.round(val)}
      {suffix}
    </span>
  );
}

/* ── 3. Interactive Browser Showcase (Playable Live Demo) ────────────── */

const DEMO_STEPS = [
  {
    role: 'customer',
    name: 'Maya · Website Chat',
    text: 'Hi! My ceramic lamp arrived with a cracked shade. Can I get a refund or swap?',
  },
  {
    role: 'tanat',
    name: 'Tanat AI · 0.3s',
    text: 'I checked your Return Policy: orders within 30 days qualify for a free replacement or full $145 refund. I prepared the refund for owner approval.',
  },
  {
    role: 'approval',
    name: 'Owner Guardrail',
    text: 'Refund $145.00 · Order #4821 — Approved in 1 click ✓',
  },
];

export function ShowcasePlayer() {
  const [playing, setPlaying] = useState(false);
  const [stepCount, setStepCount] = useState(1);

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      setStepCount((c) => (c >= DEMO_STEPS.length ? 1 : c + 1));
    }, 1800);
    return () => window.clearInterval(id);
  }, [playing]);

  return (
    <div className="bw-showcase-wrap">
      <div className="bw-blue-grain bw-showcase-card">
        <span className="bw-pushpin bw-pushpin-left" aria-hidden="true" />
        <span className="bw-pushpin bw-pushpin-right" aria-hidden="true" />

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            maxWidth: 780,
            marginBottom: 16,
            position: 'relative',
            zIndex: 2,
          }}
        >
          <span
            style={{
              fontFamily: 'var(--bw-font-hand)',
              fontSize: 26,
              color: '#fff394',
              transform: 'rotate(-2deg)',
            }}
          >
            Future of CX Automation ↘
          </span>
          <button
            type="button"
            className="bw-btn bw-btn-white"
            style={{ height: 36, padding: '0 16px', fontSize: 13 }}
            onClick={() => {
              if (!playing) setStepCount(2);
              setPlaying((p) => !p);
            }}
          >
            {playing ? '❚❚ Pause Demo' : '▶ Play Live Flow'}
          </button>
        </div>

        <div className="bw-browser-frame">
          <div className="bw-browser-bar">
            <div style={{ display: 'flex', gap: 6 }}>
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#e5e1dc' }} />
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#e5e1dc' }} />
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#e5e1dc' }} />
            </div>
            <span>tanat.space/live-assistant</span>
            <span style={{ color: 'var(--bw-blue)' }}>● Connected</span>
          </div>

          <div
            style={{
              padding: 24,
              minHeight: 240,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              background: '#fcfbf9',
            }}
          >
            {DEMO_STEPS.slice(0, stepCount).map((s, idx) => (
              <div
                key={idx}
                style={{
                  alignSelf: s.role === 'customer' ? 'flex-start' : 'flex-end',
                  maxWidth: '82%',
                  padding: '12px 16px',
                  borderRadius: 14,
                  background:
                    s.role === 'approval'
                      ? '#ecfdf5'
                      : s.role === 'tanat'
                        ? '#3745f1'
                        : '#ffffff',
                  color:
                    s.role === 'approval'
                      ? '#065f46'
                      : s.role === 'tanat'
                        ? '#ffffff'
                        : '#262626',
                  border:
                    s.role === 'tanat'
                      ? 'none'
                      : '1px solid var(--bw-border)',
                  boxShadow: '0 8px 20px -14px rgba(0,0,0,0.2)',
                }}
              >
                <div
                  style={{
                    fontFamily: 'var(--bw-font-mono)',
                    fontSize: 10.5,
                    opacity: 0.75,
                    marginBottom: 4,
                  }}
                >
                  {s.name}
                </div>
                <div style={{ fontSize: 14, lineHeight: 1.5 }}>{s.text}</div>
              </div>
            ))}

            {!playing && stepCount < DEMO_STEPS.length && (
              <button
                type="button"
                onClick={() => setStepCount((c) => Math.min(DEMO_STEPS.length, c + 1))}
                className="bw-btn bw-btn-beige"
                style={{ alignSelf: 'center', marginTop: 8, height: 36, fontSize: 13 }}
              >
                Next step ({stepCount}/{DEMO_STEPS.length}) →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── 4. Features 4-Segment Testimonial Switcher ──────────────────────── */

const FEATURE_TESTIMONIALS = [
  {
    quote:
      'Tanat transformed our store support — order questions and refund prep happen in seconds, and I still approve every payout with one click.',
    author: 'Arun Antony',
    role: 'Founder, Loom & Clay',
    company: 'Loom & Clay',
  },
  {
    quote:
      'We pasted one script tag into our Next.js site and connected Telegram. 78% of patient booking questions are now resolved without staff.',
    author: 'Sophia Turner',
    role: 'Operations Lead, Harbor Dental',
    company: 'Harbor Dental',
  },
  {
    quote:
      'Training the assistant on our PDFs and Notion handbook took two minutes. Our team finally stopped answering the same policy questions.',
    author: 'Daniel Carter',
    role: 'COO, Northwind Ops',
    company: 'Northwind',
  },
  {
    quote:
      'Unlike rigid chatbots, Tanat actually remembers returning customers and cites our real policies accurately across WhatsApp and web.',
    author: 'Emily Watson',
    role: 'Head of CX, Velora Studio',
    company: 'Velora',
  },
];

export function FeatureTestimonialSwitcher() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setIdx((i) => (i + 1) % FEATURE_TESTIMONIALS.length);
    }, 5200);
    return () => window.clearInterval(id);
  }, []);

  const current = FEATURE_TESTIMONIALS[idx];

  return (
    <div className="bw-testi-split">
      <div className="bw-testi-left">
        <div className="bw-testi-bars" role="tablist" aria-label="Customer stories">
          {FEATURE_TESTIMONIALS.map((t, i) => (
            <button
              key={t.author}
              type="button"
              className={`bw-testi-bar ${i === idx ? 'is-active' : ''}`}
              onClick={() => setIdx(i)}
              aria-label={`Show quote from ${t.author}`}
            />
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <p
            style={{
              fontFamily: 'var(--bw-font-display)',
              fontSize: 21,
              lineHeight: 1.38,
              fontWeight: 500,
              color: 'var(--bw-ink)',
            }}
          >
            “{current.quote}”
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                background: 'var(--bw-blue)',
                color: '#fff',
                display: 'grid',
                placeItems: 'center',
                fontWeight: 600,
                fontSize: 13,
              }}
            >
              {current.author
                .split(' ')
                .map((n) => n[0])
                .join('')}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{current.author}</div>
              <div style={{ fontSize: 12.5, color: 'var(--bw-muted)' }}>{current.role}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="bw-paper-grid" aria-hidden="true">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="bw-paper-tile" />
        ))}
        <div className="bw-paper-center">
          <div className="bw-paper-badge">{current.company}</div>
        </div>
      </div>
    </div>
  );
}

/* ── 5. Platform 3-Tab Interactive Accordion + Mockup ────────────────── */

const PLATFORM_TABS = [
  {
    id: 'integration',
    title: '1-Line Website & Channel Setup',
    desc: 'Drop one script tag on Shopify, WordPress, Lovable, or React — or paste your Telegram/WhatsApp token.',
    tag: 'EMBED IN 60S',
  },
  {
    id: 'privacy',
    title: 'Human-in-the-Loop Approvals',
    desc: 'High-stakes actions like refunds, discounts, or bookings pause for your 1-click sign-off before executing.',
    tag: 'OWNER GUARDRAILS',
  },
  {
    id: 'filters',
    title: 'Smart Knowledge & Auto-Tagging',
    desc: 'Upload PDFs, crawl URLs, or paste custom policies. Tanat grounds every reply in your verified sources.',
    tag: 'GROUNDED REPLIES',
  },
];

export function PlatformAccordion() {
  const [active, setActive] = useState(0);
  const [approved, setApproved] = useState(false);

  return (
    <div className="bw-platform-split">
      <div className="bw-platform-left">
        <div>
          <span className="bw-eyebrow">PLATFORM</span>
          <h2 className="bw-h2" style={{ marginTop: 10 }}>
            Unify Your Entire Support Stack
          </h2>
          <p className="bw-sec-desc" style={{ marginTop: 12 }}>
            Everything your assistant needs to read, remember, and act safely —
            without stitching five tools together.
          </p>
          <div style={{ marginTop: 20 }}>
            <Link href="/start" className="bw-btn bw-btn-dark">
              Get Started →
            </Link>
          </div>
        </div>

        <div className="bw-acc-list">
          {PLATFORM_TABS.map((tab, i) => {
            const isOpen = i === active;
            return (
              <button
                key={tab.id}
                type="button"
                className={`bw-acc-item ${isOpen ? 'is-active' : ''}`}
                onClick={() => setActive(i)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--bw-ink)' }}>
                    {tab.title}
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--bw-font-mono)',
                      fontSize: 11,
                      color: isOpen ? 'var(--bw-blue)' : 'var(--bw-muted)',
                    }}
                  >
                    {isOpen ? 'ACTIVE' : '+'}
                  </span>
                </div>
                {isOpen && (
                  <p style={{ marginTop: 8, fontSize: 13.5, color: 'var(--bw-body)', lineHeight: 1.5 }}>
                    {tab.desc}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="bw-platform-right">
        <div
          style={{
            width: '100%',
            maxWidth: 420,
            background: '#ffffff',
            border: '1px solid var(--bw-border)',
            borderRadius: 18,
            padding: 22,
            boxShadow: '0 22px 44px -22px rgba(0,0,0,0.18)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16,
            }}
          >
            <span className="bw-eyebrow">{PLATFORM_TABS[active].tag}</span>
            <span
              style={{
                fontSize: 11.5,
                padding: '3px 10px',
                borderRadius: 100,
                background: 'var(--bw-beige)',
                color: 'var(--bw-ink)',
              }}
            >
              Live Preview
            </span>
          </div>

          {active === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div
                style={{
                  padding: 12,
                  borderRadius: 12,
                  background: '#141414',
                  color: '#e5e7eb',
                  fontFamily: 'var(--bw-font-mono)',
                  fontSize: 12,
                  overflowX: 'auto',
                }}
              >
                {`<script src="https://api.tanat.space/widget.js" data-tenant="your-biz" async></script>`}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {['Website Chat', 'Telegram Bot', 'WhatsApp', 'Shopify'].map((ch) => (
                  <span
                    key={ch}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 100,
                      border: '1px solid var(--bw-border)',
                      fontSize: 12.5,
                      background: 'var(--bw-bg)',
                    }}
                  >
                    ✓ {ch}
                  </span>
                ))}
              </div>
            </div>
          )}

          {active === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div
                style={{
                  padding: 14,
                  borderRadius: 12,
                  border: '1px solid var(--bw-border)',
                  background: 'var(--bw-bg)',
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 14 }}>Refund $145.00 · Order #4821</div>
                <div style={{ fontSize: 12.5, color: 'var(--bw-muted)', marginTop: 4 }}>
                  Matched: 30-day damage policy · Waiting for sign-off
                </div>
              </div>
              <button
                type="button"
                className={`bw-btn ${approved ? 'bw-btn-beige' : 'bw-btn-dark'}`}
                onClick={() => setApproved((a) => !a)}
              >
                {approved ? '✓ Approved & Customer Notified (Reset)' : 'Approve Refund in 1 Click'}
              </button>
            </div>
          )}

          {active === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { name: 'Return_Policy_2026.pdf', status: 'Indexed · 14 chunks' },
                { name: 'https://yourstore.com/pricing', status: 'Synced · Live URL' },
                { name: 'Custom FAQ & Hours', status: 'Active · Grounded' },
              ].map((src) => (
                <div
                  key={src.name}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 12,
                    border: '1px solid var(--bw-border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: 13,
                  }}
                >
                  <span style={{ fontWeight: 500 }}>{src.name}</span>
                  <span style={{ fontSize: 11.5, color: 'var(--bw-blue)' }}>{src.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── 6. Scroll-Scrubbed Founder Quote ────────────────────────────────── */

const QUOTE_WORDS =
  'Great customer support shouldn’t require a 20-person call center or rigid chatbots that frustrate buyers. Tanat learns your real business in minutes and keeps you in full control.'.split(
    ' ',
  );

export function ScrollScrubQuote() {
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
    <div ref={ref} className="bw-blue-grain bw-quote-card">
      <span className="bw-pushpin bw-pushpin-left" aria-hidden="true" />
      <span className="bw-pushpin bw-pushpin-right" aria-hidden="true" />
      <p className="bw-quote-text">
        “
        {QUOTE_WORDS.map((word, i) => {
          const threshold = i / QUOTE_WORDS.length;
          const active = progress >= threshold;
          return (
            <span
              key={i}
              className="bw-quote-word"
              style={{ opacity: active ? 1 : 0.28 }}
            >
              {word}{' '}
            </span>
          );
        })}
        ”
      </p>
      <div
        style={{
          marginTop: 22,
          fontFamily: 'var(--bw-font-mono)',
          fontSize: 12,
          letterSpacing: '0.08em',
          opacity: 0.82,
          position: 'relative',
          zIndex: 2,
        }}
      >
        BUILT FOR REAL BUSINESSES · TANAT
      </div>
    </div>
  );
}

/* ── 7. How It Works 4-Step Interactive Tabs ─────────────────────────── */

const HOW_STEPS = [
  {
    tab: '01 Train',
    eyebrow: 'STEP 01 · KNOWLEDGE',
    title: 'Feed Tanat your website, PDFs, or policies',
    desc: 'Paste your website URL, upload a document, or write custom Q&As. Tanat indexes your business info cleanly in under 60 seconds.',
    code: 'Sources: website.com/faq · ReturnPolicy.pdf · Pricing.txt',
  },
  {
    tab: '02 Connect',
    eyebrow: 'STEP 02 · CHANNELS',
    title: 'Plug into Website Chat, Telegram & WhatsApp',
    desc: 'Every customer conversation flows into one unified workspace with persistent customer memory across sessions.',
    code: 'Channels: Website Widget + Telegram Bot + WhatsApp',
  },
  {
    tab: '03 Guardrails',
    eyebrow: 'STEP 03 · APPROVALS',
    title: 'Test live & set human approval rules',
    desc: 'Chat with your assistant before launching, set suggestive quick questions, and require 1-click owner approval for refunds or payouts.',
    code: 'Guardrail: Refund > $50 → Pause for Owner Sign-Off',
  },
  {
    tab: '04 Go Live',
    eyebrow: 'STEP 04 · 1-LINE DEPLOY',
    title: 'Copy one line to launch on your site',
    desc: 'Works on Shopify, WordPress, Webflow, Framer, Lovable, Cursor, or custom React/Next.js apps.',
    code: '<script src="https://api.tanat.space/widget.js" data-tenant="your-store" async></script>',
  },
];

export function HowItWorksTabs() {
  const [step, setStep] = useState(0);
  const [copied, setCopied] = useState(false);
  const current = HOW_STEPS[step];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(current.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div>
      <div className="bw-step-tabs" role="tablist">
        {HOW_STEPS.map((s, i) => (
          <button
            key={s.tab}
            type="button"
            role="tab"
            aria-selected={i === step}
            className={`bw-step-tab ${i === step ? 'is-active' : ''}`}
            onClick={() => setStep(i)}
          >
            {s.tab}
          </button>
        ))}
      </div>

      <div className="bw-step-body">
        <div className="bw-step-copy">
          <span className="bw-eyebrow">{current.eyebrow}</span>
          <h3 className="bw-h3">{current.title}</h3>
          <p className="bw-sec-desc">{current.desc}</p>
          <Link href="/start" className="bw-btn bw-btn-dark" style={{ marginTop: 6 }}>
            Launch your workspace →
          </Link>
        </div>

        <div className="bw-step-visual">
          <div
            style={{
              width: '100%',
              maxWidth: 440,
              background: '#ffffff',
              border: '1px solid var(--bw-border)',
              borderRadius: 18,
              padding: 22,
              boxShadow: '0 20px 40px -22px rgba(0,0,0,0.16)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <span className="bw-eyebrow">{current.tab}</span>
              <button
                type="button"
                onClick={handleCopy}
                className="bw-btn bw-btn-beige"
                style={{ height: 28, padding: '0 10px', fontSize: 11.5 }}
              >
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>
            <div
              style={{
                padding: 14,
                borderRadius: 12,
                background: '#141414',
                color: '#f3f4f6',
                fontFamily: 'var(--bw-font-mono)',
                fontSize: 12.5,
                lineHeight: 1.5,
                wordBreak: 'break-word',
              }}
            >
              {current.code}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── 8. Benefits Interactive Bento ───────────────────────────────────── */

export function BenefitsBento() {
  const [channels, setChannels] = useState({
    website: true,
    telegram: true,
    whatsapp: true,
    slack: false,
  });

  const toggle = (k: keyof typeof channels) =>
    setChannels((prev) => ({ ...prev, [k]: !prev[k] }));

  return (
    <div className="bw-bento-2x2">
      <div className="bw-bento-cell">
        <span className="bw-eyebrow">INSIGHT</span>
        <h3 className="bw-h3">Conversation Intelligence</h3>
        <p className="bw-sec-desc">
          Track resolved intents, response latency, and customer questions in real time.
        </p>
        <div className="bw-card-mockup" style={{ minHeight: 160 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
            <span style={{ fontWeight: 600 }}>Resolution Rate</span>
            <span style={{ color: 'var(--bw-blue)', fontWeight: 600 }}>+94.2%</span>
          </div>
          <svg viewBox="0 0 280 70" style={{ width: '100%', height: 70 }}>
            <defs>
              <linearGradient id="bwArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3745f1" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#3745f1" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d="M0 58 C45 50, 75 44, 115 36 C155 28, 195 22, 280 8 L280 70 L0 70 Z"
              fill="url(#bwArea)"
            />
            <path
              d="M0 58 C45 50, 75 44, 115 36 C155 28, 195 22, 280 8"
              fill="none"
              stroke="#3745f1"
              strokeWidth="2.5"
            />
          </svg>
        </div>
      </div>

      <div className="bw-bento-cell">
        <span className="bw-eyebrow">SECURITY & GUARDRAILS</span>
        <h3 className="bw-h3">Human-in-the-Loop Safety</h3>
        <p className="bw-sec-desc">
          Prevent unauthorized refunds or policy exceptions with instant owner approval gates.
        </p>
        <div className="bw-card-mockup" style={{ minHeight: 160 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>Refund Approval Gate</span>
            <span className="bw-mint-pill">Protected</span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--bw-body)' }}>
            Orders above $50 automatically pause for 1-click sign-off in your dashboard.
          </p>
        </div>
      </div>

      <div className="bw-bento-cell">
        <span className="bw-eyebrow">GLOBAL</span>
        <h3 className="bw-h3">Understand Every Language</h3>
        <p className="bw-sec-desc">
          Customers ask in English, Spanish, French, Arabic, or Japanese — Tanat replies naturally.
        </p>
        <div className="bw-card-mockup" style={{ minHeight: 150 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {['Hello! 👋', 'Hola! 🇪🇸', 'Bonjour! 🇫🇷', 'こんにちは 🇯🇵', 'مرحبا 🇦🇪'].map((g) => (
              <span
                key={g}
                style={{
                  padding: '6px 12px',
                  borderRadius: 100,
                  background: 'var(--bw-bg)',
                  border: '1px solid var(--bw-border)',
                  fontSize: 13,
                }}
              >
                {g}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="bw-bento-cell">
        <span className="bw-eyebrow">OMNICHANNEL</span>
        <h3 className="bw-h3">Publish Across Channels</h3>
        <p className="bw-sec-desc">
          Toggle where your assistant is live from a single control plane.
        </p>
        <div className="bw-card-mockup" style={{ minHeight: 150 }}>
          {(
            [
              ['website', 'Website Widget'],
              ['telegram', 'Telegram Bot'],
              ['whatsapp', 'WhatsApp'],
              ['slack', 'Slack (Beta)'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => toggle(key)}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '7px 10px',
                borderRadius: 10,
                border: '1px solid var(--bw-border)',
                background: channels[key] ? '#f5f7ff' : 'var(--bw-bg)',
                fontSize: 13,
              }}
            >
              <span>{label}</span>
              <span
                style={{
                  fontWeight: 600,
                  color: channels[key] ? 'var(--bw-blue)' : 'var(--bw-muted)',
                }}
              >
                {channels[key] ? 'ON' : 'OFF'}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── 9. Pricing with Monthly / Yearly -20% Toggle ────────────────────── */

const PLANS = [
  {
    name: 'Starter Plan',
    monthly: 0,
    yearly: 0,
    desc: 'Launch your first AI assistant and test it live on your site.',
    featured: false,
    features: [
      '1 AI Assistant Workspace',
      'Website Chat Widget (1-line embed)',
      'Up to 10 Knowledge Sources',
      'Suggested quick-question chips',
    ],
  },
  {
    name: 'Pro Plan',
    monthly: 39,
    yearly: 31,
    desc: 'For growing businesses automating customer support & bookings 24/7.',
    featured: true,
    features: [
      'Everything in Starter',
      'Telegram & WhatsApp Integration',
      'Owner Human-in-the-Loop Approvals',
      'Unlimited URLs, PDFs & Custom Docs',
      'Customer Session Memory',
    ],
  },
  {
    name: 'Business Plan',
    monthly: 199,
    yearly: 159,
    desc: 'Multi-workspace scale, custom guardrails, and priority SLA.',
    featured: false,
    features: [
      'Up to 10 Brand Workspaces',
      'Custom Approval Workflows & Webhooks',
      'Dedicated Onboarding & Priority Support',
      'Full API & Custom Widget Branding',
    ],
  },
];

export function PricingSection() {
  const [yearly, setYearly] = useState(false);

  return (
    <section id="pricing">
      <div className="bw-sec-head-center">
        <span className="bw-eyebrow">PRICING</span>
        <h2 className="bw-h2" style={{ marginTop: 10 }}>
          Simple, Transparent Pricing
        </h2>
        <p className="bw-sec-desc" style={{ marginTop: 12 }}>
          Start free in 3 minutes. Upgrade only when your assistant is saving hours every week.
        </p>
        <div style={{ marginTop: 22 }}>
          <div className="bw-toggle-pill" role="group" aria-label="Billing interval">
            <button
              type="button"
              className={`bw-toggle-btn ${!yearly ? 'is-active' : ''}`}
              onClick={() => setYearly(false)}
            >
              Monthly
            </button>
            <button
              type="button"
              className={`bw-toggle-btn ${yearly ? 'is-active' : ''}`}
              onClick={() => setYearly(true)}
            >
              Yearly <span className="bw-mint-pill">-20%</span>
            </button>
          </div>
        </div>
      </div>

      <div className="bw-price-grid">
        {PLANS.map((plan) => {
          const price = yearly ? plan.yearly : plan.monthly;
          return (
            <div
              key={plan.name}
              className={`bw-price-col ${plan.featured ? 'is-featured' : ''}`}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: 'var(--bw-font-display)', fontWeight: 600, fontSize: 18 }}>
                  {plan.name}
                </span>
                {plan.featured && (
                  <span
                    style={{
                      padding: '3px 10px',
                      borderRadius: 100,
                      background: 'rgba(55,69,241,0.1)',
                      color: 'var(--bw-blue)',
                      fontSize: 11.5,
                      fontWeight: 600,
                    }}
                  >
                    Most popular
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span
                  style={{
                    fontFamily: 'var(--bw-font-display)',
                    fontSize: 42,
                    fontWeight: 600,
                    letterSpacing: '-0.03em',
                  }}
                >
                  ${price}
                </span>
                <span style={{ color: 'var(--bw-muted)', fontSize: 13.5 }}>/ month</span>
              </div>

              <p style={{ fontSize: 13.5, color: 'var(--bw-body)', minHeight: 42 }}>{plan.desc}</p>

              <Link
                href="/start"
                className={`bw-btn ${plan.featured ? 'bw-btn-dark' : 'bw-btn-beige'}`}
                style={{ width: '100%' }}
              >
                Get started →
              </Link>

              <ul
                style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: '8px 0 0',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                {plan.features.map((f) => (
                  <li
                    key={f}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 9,
                      fontSize: 13.5,
                      color: 'var(--bw-ink)',
                    }}
                  >
                    <span style={{ color: 'var(--bw-blue)', fontWeight: 700 }}>✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ── 10. FAQ Accordion ───────────────────────────────────────────────── */

const FAQS = [
  {
    q: 'How fast can I put Tanat on my website?',
    a: 'Under 3 minutes. Create your workspace, add a URL or document so Tanat knows your business, test it in live chat, and paste one <script> tag onto Shopify, WordPress, Framer, or any custom site.',
  },
  {
    q: 'Can Tanat ask for my approval before taking important actions?',
    a: 'Yes. Human-in-the-loop approvals are built in. Refunds, discounts, or bookings can pause and wait for your 1-click sign-off in your Tanat dashboard before notifying the customer.',
  },
  {
    q: 'Which messaging channels are supported?',
    a: 'You can embed Tanat as a floating widget on any website, connect a Telegram bot with one token, and route WhatsApp or custom REST API conversations into the same workspace.',
  },
  {
    q: 'What knowledge sources can I train my assistant with?',
    a: 'Website URLs, uploaded documents (PDF, TXT, Markdown), product catalogs, custom policies, and manually written Q&As — all persisted and editable anytime.',
  },
  {
    q: 'Does it work with AI website builders like Lovable, Cursor, or v0?',
    a: 'Yes. We provide a single-line script tag, a React component snippet, and an llms.txt specification so AI coding tools can wire Tanat into your app automatically.',
  },
  {
    q: 'Can I customize suggested questions at the bottom of the chat?',
    a: 'Yes! You can configure suggestive starter chips so customers can click common questions (like shipping times, pricing, or booking) with one tap.',
  },
];

export function FaqAccordion() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <section id="faq">
      <div className="bw-sec-head-center">
        <span className="bw-eyebrow">FAQ</span>
        <h2 className="bw-h2" style={{ marginTop: 10 }}>
          Frequently Asked Questions
        </h2>
      </div>

      <div className="bw-faq-list">
        {FAQS.map((item, i) => {
          const isOpen = openIdx === i;
          return (
            <div key={item.q} className={`bw-faq-item ${isOpen ? 'is-open' : ''}`}>
              <button
                type="button"
                className="bw-faq-trigger"
                aria-expanded={isOpen}
                onClick={() => setOpenIdx(isOpen ? null : i)}
              >
                <span>{item.q}</span>
                <span className="bw-faq-icon" aria-hidden="true">
                  {isOpen ? '×' : '⌄'}
                </span>
              </button>
              {isOpen && <div className="bw-faq-body">{item.a}</div>}
            </div>
          );
        })}
      </div>
    </section>
  );
}

