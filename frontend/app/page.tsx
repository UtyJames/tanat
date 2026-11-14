import Link from 'next/link';
import './botwise.css';
import BotwiseNav from '@/components/botwise/BotwiseNav';
import BotwiseHero from '@/components/botwise/BotwiseHero';
import {
  AnimatedCounter,
  BenefitsBento,
  BlurReveal,
  FaqAccordion,
  FeatureTestimonialSwitcher,
  HowItWorksTabs,
  PlatformAccordion,
  PricingSection,
  ScrollScrubQuote,
  ShowcasePlayer,
} from '@/components/botwise/BotwiseInteractiveParts';

const CLIENTS = [
  'Shopify',
  'WordPress',
  'Telegram',
  'WhatsApp',
  'Framer',
  'Lovable',
  'Cursor',
  'Next.js',
];

const INTEGRATIONS = [
  { name: 'Website Widget', tag: '1-Line Script', href: '/docs#widget', soon: false },
  { name: 'Telegram Bot', tag: 'Bot Token', href: '/start', soon: false },
  { name: 'WhatsApp', tag: 'Business API', href: '/start', soon: false },
  { name: 'Shopify', tag: 'Theme Embed', href: '/docs#widget', soon: false },
  { name: 'WordPress', tag: 'Header Snippet', href: '/docs#widget', soon: false },
  { name: 'Cursor / Lovable', tag: 'llms.txt', href: '/docs#vibecoding', soon: false },
  { name: 'Slack', tag: 'Team Alerts', href: '/docs', soon: true },
  { name: 'REST API', tag: 'Custom Apps', href: '/docs', soon: false },
];

const MATRIX_ROWS = [
  { feature: 'Trained on your URLs, PDFs & FAQs', tanat: true, manual: true, basic: false, legacy: true },
  { feature: '1-Click Owner Approval Guardrails', tanat: true, manual: true, basic: false, legacy: false },
  { feature: 'Website + Telegram + WhatsApp Unified', tanat: true, manual: false, basic: false, legacy: true },
  { feature: 'Persistent Customer Memory', tanat: true, manual: false, basic: false, legacy: false },
  { feature: '1-Line Script Embed (Under 3 Min)', tanat: true, manual: false, basic: true, legacy: false },
  { feature: '0.3s Instant 24/7 Responses', tanat: true, manual: false, basic: true, legacy: false },
];

const TESTIMONIAL_CARDS = [
  {
    quote: 'Setup took 3 minutes. Customers get instant answers on our store and Telegram.',
    name: 'Maya Lin',
    company: 'Studio Kanso',
  },
  {
    quote: 'The 1-click refund approval gate gave our ops team total confidence to automate.',
    name: 'Liam O’Connor',
    company: 'Northwind Goods',
  },
  {
    quote: 'Suggested questions at the bottom of the chat doubled our visitor engagement.',
    name: 'Elena Rostova',
    company: 'Harbor Dental',
  },
  {
    quote: 'One line in our Framer & Next.js footer and it immediately knew our entire docs.',
    name: 'Marcus Vance',
    company: 'Velora Labs',
  },
  {
    quote: 'Finally an AI assistant that remembers returning buyers instead of starting cold.',
    name: 'Priya Nair',
    company: 'Loom & Clay',
  },
];

export default function Home() {
  return (
    <div className="bw-site">
      <BotwiseNav />

      <main>
        <BotwiseHero />

        {/* ── Clients / Platform Marquee ───────────────────────────────── */}
        <div className="bw-frame" style={{ borderTop: 'none' }}>
          <div className="bw-clients">
            <div className="bw-clients-track">
              {[...CLIENTS, ...CLIENTS].map((brand, idx) => (
                <span key={`${brand}-${idx}`} className="bw-client-logo">
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 2,
                      background: idx % 2 === 0 ? '#3745f1' : '#d6d0c8',
                    }}
                  />
                  {brand}
                </span>
              ))}
            </div>
          </div>
          <div className="bw-h-line" />

          {/* ── Features Section ─────────────────────────────────────── */}
          <section id="features">
            <BlurReveal>
              <div className="bw-sec-head">
                <div>
                  <span className="bw-eyebrow">FEATURES</span>
                  <h2 className="bw-h2" style={{ marginTop: 10 }}>
                    AI Agents For Customer Support
                  </h2>
                </div>
                <p className="bw-sec-desc">
                  Give every customer instant, accurate answers trained on your real
                  business — while keeping human approval on every sensitive action.
                </p>
              </div>
            </BlurReveal>

            <div className="bw-hatch" />

            <div className="bw-grid-3">
              <div className="bw-cell">
                <span className="bw-eyebrow bw-eyebrow-muted">OMNICHANNEL</span>
                <h3 className="bw-h3" style={{ fontSize: 21 }}>
                  Unified Message Hub
                </h3>
                <p className="bw-sec-desc" style={{ fontSize: 14 }}>
                  Route Website Chat, Telegram, and WhatsApp into one intelligent inbox.
                </p>
                <div className="bw-card-mockup">
                  {['Website Chat · Active', 'Telegram Bot · Synced', 'WhatsApp · Connected'].map(
                    (row) => (
                      <div
                        key={row}
                        style={{
                          padding: '9px 12px',
                          borderRadius: 10,
                          background: 'var(--bw-bg)',
                          border: '1px solid var(--bw-border)',
                          fontSize: 12.5,
                          display: 'flex',
                          justifyContent: 'space-between',
                        }}
                      >
                        <span>{row}</span>
                        <span style={{ color: 'var(--bw-blue)', fontWeight: 600 }}>●</span>
                      </div>
                    ),
                  )}
                </div>
              </div>

              <div className="bw-cell">
                <span className="bw-eyebrow bw-eyebrow-muted">KNOWLEDGE</span>
                <h3 className="bw-h3" style={{ fontSize: 21 }}>
                  Trained On Your Info
                </h3>
                <p className="bw-sec-desc" style={{ fontSize: 14 }}>
                  Ingest URLs, PDFs, product catalogs, and custom policies with zero hallucination.
                </p>
                <div className="bw-card-mockup">
                  <div
                    style={{
                      padding: 12,
                      borderRadius: 12,
                      background: '#f5f7ff',
                      border: '1px solid rgba(55,69,241,0.2)',
                      fontSize: 12.5,
                    }}
                  >
                    <div style={{ fontWeight: 600, color: 'var(--bw-blue)' }}>
                      Knowledge Synced
                    </div>
                    <div style={{ color: 'var(--bw-body)', marginTop: 4 }}>
                      Return Policy.pdf + Pricing URL + 12 Custom FAQs
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {['URLs', 'PDF', 'Markdown', 'Custom Q&A'].map((t) => (
                      <span
                        key={t}
                        style={{
                          padding: '4px 10px',
                          borderRadius: 100,
                          background: 'var(--bw-beige)',
                          fontSize: 11.5,
                        }}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bw-cell">
                <span className="bw-eyebrow bw-eyebrow-muted">GUARDRAILS</span>
                <h3 className="bw-h3" style={{ fontSize: 21 }}>
                  Quick With Control
                </h3>
                <p className="bw-sec-desc" style={{ fontSize: 14 }}>
                  Replies in 0.3s, pauses for your 1-click sign-off before refunds or bookings.
                </p>
                <div className="bw-card-mockup" style={{ alignItems: 'center', textAlign: 'center' }}>
                  <div
                    style={{
                      fontFamily: 'var(--bw-font-mono)',
                      fontSize: 26,
                      fontWeight: 600,
                      color: 'var(--bw-blue)',
                    }}
                  >
                    00:03
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--bw-body)' }}>
                    Tanat Generating Verified Reply...
                  </div>
                  <span className="bw-mint-pill">Owner Approval Ready</span>
                </div>
              </div>
            </div>

            <div className="bw-h-line" />

            {/* Interactive Showcase */}
            <ShowcasePlayer />

            <div className="bw-h-line" />

            {/* IN NUMBERS */}
            <div className="bw-stats-4">
              <div className="bw-stat-cell" style={{ justifyContent: 'center' }}>
                <span className="bw-eyebrow">TANAT IN NUMBERS</span>
                <div style={{ fontSize: 14, color: 'var(--bw-body)', marginTop: 4 }}>
                  Built for speed, accuracy, and real-world reliability.
                </div>
              </div>
              <div className="bw-stat-cell">
                <div className="bw-stat-num">
                  <AnimatedCounter target={2} suffix="M+" />
                </div>
                <div className="bw-stat-label">Conversations Automated</div>
              </div>
              <div className="bw-stat-cell">
                <div className="bw-stat-num">
                  <AnimatedCounter target={50} suffix="K+" />
                </div>
                <div className="bw-stat-label">Businesses & Teams</div>
              </div>
              <div className="bw-stat-cell">
                <div className="bw-stat-num">
                  <AnimatedCounter target={120} suffix="+" />
                </div>
                <div className="bw-stat-label">Countries Supported</div>
              </div>
            </div>

            <div className="bw-h-line" />

            {/* 4-Segment Testimonial Switcher */}
            <FeatureTestimonialSwitcher />
          </section>

          <div className="bw-h-line" />

          {/* ── System: Problem vs Solution ──────────────────────────── */}
          <section id="system">
            <BlurReveal>
              <div className="bw-sec-head-center">
                <span className="bw-eyebrow">SYSTEM</span>
                <h2 className="bw-h2" style={{ marginTop: 10 }}>
                  Your support systems aren’t unified
                </h2>
              </div>
            </BlurReveal>

            <div className="bw-h-line" />

            <div className="bw-compare-2">
              <div className="bw-center-orb" aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 3L14.6 9.4L21 12L14.6 14.6L12 21L9.4 14.6L3 12L9.4 9.4L12 3Z"
                    fill="#3745f1"
                  />
                </svg>
              </div>

              <div className="bw-compare-col">
                <span
                  style={{
                    padding: '4px 12px',
                    borderRadius: 100,
                    background: 'rgba(239,68,68,0.1)',
                    color: '#dc2626',
                    fontFamily: 'var(--bw-font-mono)',
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  PROBLEM
                </span>
                <h3 className="bw-h3" style={{ marginTop: 14 }}>
                  Too Many Disconnected Tools
                </h3>
                <p className="bw-sec-desc" style={{ marginTop: 8 }}>
                  Unanswered Telegram DMs, repetitive website questions, and zero shared
                  context across channels.
                </p>
                <div className="bw-card-mockup" style={{ marginTop: 20, minHeight: 120 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: '#dc2626', fontWeight: 600 }}>Unread 12+</span>
                    <span style={{ color: 'var(--bw-muted)' }}>Avg Reply: 2h delay</span>
                  </div>
                </div>
              </div>

              <div className="bw-compare-col">
                <span
                  style={{
                    padding: '4px 12px',
                    borderRadius: 100,
                    background: 'rgba(55,69,241,0.1)',
                    color: '#3745f1',
                    fontFamily: 'var(--bw-font-mono)',
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  SOLUTION
                </span>
                <h3 className="bw-h3" style={{ marginTop: 14 }}>
                  One Intelligent Unified Platform
                </h3>
                <p className="bw-sec-desc" style={{ marginTop: 8 }}>
                  Tanat answers instantly from your knowledge base, remembers customers,
                  and routes approvals to you.
                </p>
                <div className="bw-card-mockup" style={{ marginTop: 20, minHeight: 120 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: '#3745f1', fontWeight: 600 }}>Resolved 12+ cleared</span>
                    <span style={{ color: '#059669', fontWeight: 600 }}>Avg Reply: 0.3s</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="bw-h-line" />

          {/* ── Platform Interactive Accordion ───────────────────────── */}
          <section id="platform">
            <PlatformAccordion />
          </section>

          <div className="bw-h-line" />

          {/* ── Scroll-Scrubbed Founder Quote ────────────────────────── */}
          <ScrollScrubQuote />

          <div className="bw-h-line" />

          {/* ── How It Works 4-Step Tabs ─────────────────────────────── */}
          <section id="how-it-works">
            <BlurReveal>
              <div className="bw-sec-head-center">
                <span className="bw-eyebrow">HOW IT WORKS</span>
                <h2 className="bw-h2" style={{ marginTop: 10 }}>
                  How Tanat Automates Support
                </h2>
              </div>
            </BlurReveal>
            <HowItWorksTabs />
          </section>

          <div className="bw-h-line" />

          {/* ── Comparison Matrix ────────────────────────────────────── */}
          <section id="compare">
            <BlurReveal>
              <div className="bw-sec-head-center">
                <span className="bw-eyebrow">COMPARE</span>
                <h2 className="bw-h2" style={{ marginTop: 10 }}>
                  Better Than Traditional Support
                </h2>
              </div>
            </BlurReveal>

            <div className="bw-matrix-wrap">
              <table className="bw-matrix">
                <thead>
                  <tr>
                    <th>AI Support Features</th>
                    <th className="is-tanat" style={{ color: 'var(--bw-blue)' }}>
                      Tanat
                    </th>
                    <th>Manual Support</th>
                    <th>Basic Chatbots</th>
                    <th>Legacy Helpdesk</th>
                  </tr>
                </thead>
                <tbody>
                  {MATRIX_ROWS.map((row) => (
                    <tr key={row.feature}>
                      <td>{row.feature}</td>
                      <td className="is-tanat" style={{ color: 'var(--bw-blue)' }}>
                        {row.tanat ? '✓' : '—'}
                      </td>
                      <td>{row.manual ? '✓' : '—'}</td>
                      <td>{row.basic ? '✓' : '—'}</td>
                      <td>{row.legacy ? '✓' : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className="bw-h-line" />

          {/* ── Benefits 2x2 Bento ───────────────────────────────────── */}
          <section id="benefits">
            <BlurReveal>
              <div className="bw-sec-head-center">
                <span className="bw-eyebrow">BENEFITS</span>
                <h2 className="bw-h2" style={{ marginTop: 10 }}>
                  Advanced AI Driven Support Hub
                </h2>
              </div>
            </BlurReveal>
            <div className="bw-hatch" />
            <BenefitsBento />
          </section>

          <div className="bw-h-line" />

          {/* ── Integrations 4x2 Grid ────────────────────────────────── */}
          <section id="integration">
            <BlurReveal>
              <div className="bw-sec-head-center">
                <span className="bw-eyebrow">INTEGRATION</span>
                <h2 className="bw-h2" style={{ marginTop: 10 }}>
                  Connect With Your Existing Stack
                </h2>
              </div>
            </BlurReveal>

            <div className="bw-int-grid">
              {INTEGRATIONS.map((item) => (
                <Link key={item.name} href={item.href} className="bw-int-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="bw-eyebrow bw-eyebrow-muted">{item.tag}</span>
                    {item.soon ? (
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: 100,
                          background: 'var(--bw-beige)',
                          fontSize: 11,
                        }}
                      >
                        Soon
                      </span>
                    ) : (
                      <span
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          border: '1px solid var(--bw-border)',
                          display: 'grid',
                          placeItems: 'center',
                          fontSize: 13,
                        }}
                      >
                        ↗
                      </span>
                    )}
                  </div>
                  <div style={{ fontFamily: 'var(--bw-font-display)', fontWeight: 600, fontSize: 18 }}>
                    {item.name}
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <div className="bw-h-line" />

          {/* ── Pricing Section ──────────────────────────────────────── */}
          <PricingSection />

          <div className="bw-h-line" />

          {/* ── Testimonials Marquee ─────────────────────────────────── */}
          <section id="testimonial">
            <BlurReveal>
              <div className="bw-sec-head-center">
                <span className="bw-eyebrow">TESTIMONIALS</span>
                <h2 className="bw-h2" style={{ marginTop: 10 }}>
                  Loved By Real Businesses
                </h2>
              </div>
            </BlurReveal>
            <div className="bw-testi-marquee-wrap">
              <div className="bw-testi-marquee-track">
                {[...TESTIMONIAL_CARDS, ...TESTIMONIAL_CARDS].map((t, i) => (
                  <div key={`${t.name}-${i}`} className="bw-testi-card">
                    <p style={{ fontSize: 14.5, lineHeight: 1.55, color: 'var(--bw-ink)' }}>
                      “{t.quote}”
                    </p>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13.5 }}>{t.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--bw-muted)' }}>{t.company}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <div className="bw-h-line" />

          {/* ── FAQ Accordion ────────────────────────────────────────── */}
          <FaqAccordion />

          {/* ── Final Royal Blue CTA Card ────────────────────────────── */}
          <div style={{ padding: '0 24px 56px' }}>
            <div
              className="bw-blue-grain"
              style={{
                borderRadius: 22,
                padding: '64px 32px',
                textAlign: 'center',
              }}
            >
              <span className="bw-pushpin bw-pushpin-left" aria-hidden="true" />
              <span className="bw-pushpin bw-pushpin-right" aria-hidden="true" />
              <div className="bw-pixel-corner" style={{ top: 18, left: 64 }} aria-hidden="true" />
              <div className="bw-pixel-corner" style={{ bottom: 18, right: 64 }} aria-hidden="true" />

              <span
                className="bw-eyebrow"
                style={{ color: 'rgba(255,255,255,0.85)', position: 'relative', zIndex: 2 }}
              >
                START TODAY
              </span>
              <h2
                className="bw-h1"
                style={{
                  color: '#ffffff',
                  marginTop: 12,
                  maxWidth: 640,
                  marginLeft: 'auto',
                  marginRight: 'auto',
                  position: 'relative',
                  zIndex: 2,
                }}
              >
                Upgrade Customer Support Today
              </h2>
              <p
                style={{
                  marginTop: 14,
                  color: 'rgba(255,255,255,0.84)',
                  maxWidth: 520,
                  marginLeft: 'auto',
                  marginRight: 'auto',
                  position: 'relative',
                  zIndex: 2,
                }}
              >
                Set up your workspace in 3 minutes, test your assistant live, and paste
                one line to go live everywhere.
              </p>
              <div
                style={{
                  marginTop: 28,
                  display: 'flex',
                  justifyContent: 'center',
                  gap: 12,
                  flexWrap: 'wrap',
                  position: 'relative',
                  zIndex: 2,
                }}
              >
                <Link href="/docs" className="bw-btn bw-btn-outline-light">
                  Explore Docs
                </Link>
                <Link href="/start" className="bw-btn bw-btn-white">
                  Get Started →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ── Dark Footer with Giant Grainy Wordmark ───────────────────── */}
      <footer className="bw-footer">
        <div className="bw-footer-grid">
          <div className="bw-footer-col">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="bw-brand-badge" aria-hidden="true">
                ✦
              </span>
              <span style={{ fontFamily: 'var(--bw-font-display)', fontWeight: 600, fontSize: 19 }}>
                Tanat
              </span>
            </div>
            <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.65)', marginTop: 6 }}>
              AI assistants for real businesses — trained on your info and always under your control.
            </p>
            <div style={{ marginTop: 10 }}>
              <Link href="/start" className="bw-btn bw-btn-white" style={{ height: 38, fontSize: 13 }}>
                Get Started →
              </Link>
            </div>
          </div>

          <div className="bw-footer-col">
            <h4>Home</h4>
            <a href="#features">Features</a>
            <a href="#system">System</a>
            <a href="#how-it-works">How It Works</a>
            <a href="#pricing">Pricing</a>
            <a href="#faq">FAQ</a>
          </div>

          <div className="bw-footer-col">
            <h4>Platform</h4>
            <Link href="/start">3-Min Setup</Link>
            <Link href="/app">Workspace Dashboard</Link>
            <Link href="/login">Sign in</Link>
            <Link href="/docs">Documentation</Link>
          </div>

          <div className="bw-footer-col">
            <h4>Resources</h4>
            <Link href="/docs#widget">1-Line Widget</Link>
            <Link href="/docs#vibecoding">Cursor / Lovable / v0</Link>
            <a href="https://api.tanat.space/llms.txt" target="_blank" rel="noreferrer">
              llms.txt
            </a>
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

        <div className="bw-footer-wordmark" aria-hidden="true">
          Tanat
        </div>
      </footer>
    </div>
  );
}
