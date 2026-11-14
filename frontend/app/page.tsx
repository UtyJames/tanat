import Link from 'next/link';
import './landing.css';
import LandingNav from '@/components/landing/LandingNav';
import LandingHero from '@/components/landing/LandingHero';
import {
  AnimatedCounter,
  BlurReveal,
  ChannelExamplesExplorer,
  HowItWorksInteractive,
  IntegrationPartnerSection,
  PrivacyScrubQuote,
} from '@/components/landing/LandingSections';
import {
  CursorLogo,
  NearLogo,
  NextJsLogo,
  ShopifyLogo,
  SlackLogo,
  TelegramLogo,
  WhatsAppLogo,
  WordPressLogo,
} from '@/components/brand/PlatformLogos';

const PARTNER_STRIP = [
  { name: 'NEAR AI Cloud', logo: <NearLogo size={18} /> },
  { name: 'WordPress', logo: <WordPressLogo size={18} /> },
  { name: 'Slack', logo: <SlackLogo size={18} /> },
  { name: 'Telegram', logo: <TelegramLogo size={18} /> },
  { name: 'WhatsApp', logo: <WhatsAppLogo size={18} /> },
  { name: 'Shopify', logo: <ShopifyLogo size={18} /> },
  { name: 'Next.js', logo: <NextJsLogo size={18} /> },
  { name: 'Cursor', logo: <CursorLogo size={18} /> },
];

export default function Home() {
  return (
    <div className="tn-site">
      <LandingNav />

      <main>
        <LandingHero />

        <div className="tn-frame" style={{ borderTop: 'none' }}>
          {/* ── Partner Logos Marquee ─────────────────────────────────── */}
          <div className="tn-clients">
            <div className="tn-clients-track">
              {[...PARTNER_STRIP, ...PARTNER_STRIP].map((p, idx) => (
                <span key={`${p.name}-${idx}`} className="tn-client-logo">
                  {p.logo}
                  <span>{p.name}</span>
                </span>
              ))}
            </div>
          </div>

          <div className="tn-h-line" />

          {/* ── 1. How It Works (Same 3 Steps, Interactive) ───────────── */}
          <section id="how-it-works">
            <BlurReveal>
              <div className="tn-sec-head">
                <div>
                  <span className="tn-eyebrow">HOW IT WORKS</span>
                  <h2 className="tn-h2" style={{ marginTop: 10 }}>
                    From zero to live assistant in three simple steps.
                  </h2>
                </div>
                <p className="tn-sec-desc">
                  No prompt engineering degree required. Add your business info,
                  choose your channels & privacy rules, and paste one line on your
                  website.
                </p>
              </div>
            </BlurReveal>

            <div className="tn-hatch" />
            <HowItWorksInteractive />
          </section>

          <div className="tn-h-line" />

          {/* ── 2. Live Channels (Telegram, WhatsApp, Slack, Website) ─── */}
          <section id="examples">
            <BlurReveal>
              <div className="tn-sec-head">
                <div>
                  <span className="tn-eyebrow">BUILT FOR REAL BUSINESSES</span>
                  <h2 className="tn-h2" style={{ marginTop: 10 }}>
                    See Tanat in action on Telegram, WhatsApp & Slack.
                  </h2>
                </div>
                <p className="tn-sec-desc">
                  Pick a channel below to inspect a real customer or team thread —
                  and test the 1-click owner approval guardrail.
                </p>
              </div>
            </BlurReveal>

            <div className="tn-hatch" />
            <ChannelExamplesExplorer />
          </section>

          <div className="tn-h-line" />

          {/* ── 3. Easy Integration (Real Logos + Snippets) ───────────── */}
          <section id="integrate">
            <BlurReveal>
              <div className="tn-sec-head">
                <div>
                  <span className="tn-eyebrow">EASY INTEGRATION</span>
                  <h2 className="tn-h2" style={{ marginTop: 10 }}>
                    Partnered with the tools your business already runs on.
                  </h2>
                </div>
                <p className="tn-sec-desc">
                  Click any platform below for its exact 60-second setup snippet —
                  from WordPress and Shopify to Slack, Telegram, WhatsApp, and
                  Cursor.
                </p>
              </div>
            </BlurReveal>

            <IntegrationPartnerSection />
          </section>

          <div className="tn-h-line" />

          {/* ── 4. Privacy & NEAR AI Cloud ────────────────────────────── */}
          <section id="privacy">
            <BlurReveal>
              <div className="tn-sec-head-center">
                <span className="tn-eyebrow">PRIVACY & EASE OF ACCESS</span>
                <h2 className="tn-h2" style={{ marginTop: 10 }}>
                  Private AI inference. Effortless control.
                </h2>
              </div>
            </BlurReveal>

            <div className="tn-grid-3" style={{ borderTop: '1px solid var(--tn-border)' }}>
              <div className="tn-cell">
                <span className="tn-eyebrow">POWERED BY NEAR AI CLOUD</span>
                <h3 className="tn-h3" style={{ fontSize: 21 }}>
                  Verifiable Private Inference
                </h3>
                <p className="tn-sec-desc" style={{ fontSize: 14 }}>
                  Every prompt runs on NEAR AI Cloud with strict tenant isolation.
                  Your documents and customer chats are never used to train public models.
                </p>
              </div>
              <div className="tn-cell">
                <span className="tn-eyebrow">HUMAN GUARDRAILS</span>
                <h3 className="tn-h3" style={{ fontSize: 21 }}>
                  1-Click Owner Approvals
                </h3>
                <p className="tn-sec-desc" style={{ fontSize: 14 }}>
                  Tanat answers routine questions automatically and pauses refunds,
                  discounts, or bookings for your instant sign-off.
                </p>
              </div>
              <div className="tn-cell">
                <span className="tn-eyebrow">EFFORTLESS ACCESS</span>
                <h3 className="tn-h3" style={{ fontSize: 21 }}>
                  Live in Under 3 Minutes
                </h3>
                <p className="tn-sec-desc" style={{ fontSize: 14 }}>
                  Sign in with one email code, upload a URL or PDF, and deploy
                  across web, Telegram, WhatsApp, and Slack without engineers.
                </p>
              </div>
            </div>

            <div className="tn-h-line" />

            <div className="tn-stats-4">
              <div className="tn-stat-cell" style={{ justifyContent: 'center' }}>
                <span className="tn-eyebrow">TANAT METRICS</span>
                <div style={{ fontSize: 13.5, color: 'var(--tn-body)', marginTop: 4 }}>
                  Built on NEAR AI Cloud for speed & privacy.
                </div>
              </div>
              <div className="tn-stat-cell">
                <div className="tn-stat-num">
                  <AnimatedCounter target={3} suffix=" min" />
                </div>
                <div style={{ fontSize: 13.5, color: 'var(--tn-body)' }}>
                  Average setup time
                </div>
              </div>
              <div className="tn-stat-cell">
                <div className="tn-stat-num">
                  <AnimatedCounter target={100} suffix="%" />
                </div>
                <div style={{ fontSize: 13.5, color: 'var(--tn-body)' }}>
                  Private workspace isolation
                </div>
              </div>
              <div className="tn-stat-cell">
                <div className="tn-stat-num">24/7</div>
                <div style={{ fontSize: 13.5, color: 'var(--tn-body)' }}>
                  Instant multi-channel coverage
                </div>
              </div>
            </div>

            <div className="tn-h-line" />
            <PrivacyScrubQuote />
          </section>

          {/* ── 5. Final CTA ──────────────────────────────────────────── */}
          <div style={{ padding: '16px 24px 56px' }}>
            <div
              className="tn-near-grain"
              style={{ borderRadius: 22, padding: '60px 32px', textAlign: 'center' }}
            >
              <span className="tn-pushpin tn-pushpin-left" aria-hidden="true" />
              <span className="tn-pushpin tn-pushpin-right" aria-hidden="true" />
              <div className="tn-pixel-corner" style={{ top: 18, left: 64 }} aria-hidden="true" />
              <div className="tn-pixel-corner" style={{ bottom: 18, right: 64 }} aria-hidden="true" />

              <span
                className="tn-eyebrow"
                style={{ color: '#00ec97', position: 'relative', zIndex: 2 }}
              >
                READY IN 3 MINUTES
              </span>
              <h2
                className="tn-h1"
                style={{
                  color: '#ffffff',
                  marginTop: 12,
                  maxWidth: 660,
                  marginLeft: 'auto',
                  marginRight: 'auto',
                  position: 'relative',
                  zIndex: 2,
                }}
              >
                Ready to put your private AI assistant to work?
              </h2>
              <p
                style={{
                  marginTop: 14,
                  color: 'rgba(255,255,255,0.85)',
                  maxWidth: 540,
                  marginLeft: 'auto',
                  marginRight: 'auto',
                  position: 'relative',
                  zIndex: 2,
                }}
              >
                Train on your business info, test with your own questions, and
                connect WordPress, Shopify, Telegram, WhatsApp, or Slack.
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
                <Link href="/start" className="tn-btn tn-btn-near">
                  Get started free →
                </Link>
                <Link href="/docs" className="tn-btn tn-btn-outline-light">
                  Integration guide
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ── Dark Footer ───────────────────────────────────────────────── */}
      <footer className="tn-footer">
        <div className="tn-footer-grid">
          <div className="tn-footer-col">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="tn-brand-mascot">
                <img
                  src="/tanat-mascot.jpg"
                  alt="Tanat mascot"
                  width={36}
                  height={36}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </span>
              <span style={{ fontFamily: 'var(--tn-font-display)', fontWeight: 600, fontSize: 19 }}>
                Tanat
              </span>
            </div>
            <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.68)', marginTop: 6 }}>
              Private AI assistants for real businesses — powered by NEAR AI Cloud
              and always under your control.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#00ec97', fontSize: 12.5, fontWeight: 600 }}>
              <NearLogo size={15} />
              <span>Powered by NEAR AI Cloud</span>
            </div>
            <div style={{ marginTop: 8 }}>
              <Link href="/start" className="tn-btn tn-btn-near" style={{ height: 38, fontSize: 13 }}>
                Get started →
              </Link>
            </div>
          </div>

          <div className="tn-footer-col">
            <h4>Product</h4>
            <a href="#how-it-works">How it works</a>
            <a href="#examples">Telegram, WhatsApp & Slack</a>
            <a href="#integrate">Website widget</a>
            <a href="#privacy">Privacy & NEAR AI</a>
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
          <span>© 2026 Tanat. Powered by NEAR AI Cloud.</span>
          <span>All systems operational</span>
        </div>

        <div className="tn-footer-wordmark" aria-hidden="true">
          Tanat
        </div>
      </footer>
    </div>
  );
}
