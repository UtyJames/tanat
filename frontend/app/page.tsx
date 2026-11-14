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
  FramerLogo,
  LovableLogo,
  NearLogo,
  NextJsLogo,
  ShopifyLogo,
  SlackLogo,
  TanatMascotIcon,
  TelegramLogo,
  WebflowLogo,
  WhatsAppLogo,
  WordPressLogo,
} from '@/components/brand/PlatformLogos';

const PARTNER_STRIP = [
  { name: 'Lovable', logo: <LovableLogo size={18} /> },
  { name: 'Cursor', logo: <CursorLogo size={18} /> },
  { name: 'Webflow', logo: <WebflowLogo size={18} /> },
  { name: 'WordPress', logo: <WordPressLogo size={18} /> },
  { name: 'Slack', logo: <SlackLogo size={18} /> },
  { name: 'Telegram', logo: <TelegramLogo size={18} /> },
  { name: 'WhatsApp', logo: <WhatsAppLogo size={18} /> },
  { name: 'Shopify', logo: <ShopifyLogo size={18} /> },
  { name: 'Next.js', logo: <NextJsLogo size={18} /> },
  { name: 'Framer', logo: <FramerLogo size={18} /> },
];

export default function Home() {
  return (
    <div className="tn-site">
      <LandingNav />

      <main>
        <LandingHero />

        <div className="tn-frame" style={{ borderTop: 'none' }}>
          {/* ── Powered by NEAR AI Cloud Strip (Under Hero, Before Marquee) ── */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '16px 24px 6px',
              fontFamily: 'var(--tn-font-mono)',
              fontSize: 12,
              letterSpacing: '0.06em',
              color: 'var(--tn-ink)',
            }}
          >
            <NearLogo size={15} />
            <span>POWERED BY NEAR AI CLOUD</span>
          </div>

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

          {/* ── 3. Easy Integration & Vibecoding ─────────────────────── */}
          <section id="integrate">
            <BlurReveal>
              <div className="tn-sec-head">
                <div>
                  <span className="tn-eyebrow">VIBECODING & INSTANT SETUP</span>
                  <h2 className="tn-h2" style={{ marginTop: 10 }}>
                    Whether you’re vibecoding or scaling a live site.
                  </h2>
                </div>
                <p className="tn-sec-desc">
                  Set up and integrate your own AI across Lovable, Cursor,
                  Webflow, WordPress, Shopify, Slack, Telegram, and WhatsApp —
                  without worrying about vector DBs, servers, or webhook plumbing.
                </p>
              </div>
            </BlurReveal>

            <IntegrationPartnerSection />
          </section>

          <div className="tn-h-line" />

          {/* ── 4. Privacy & Ease of Access ───────────────────────────── */}
          <section id="privacy">
            <BlurReveal>
              <div className="tn-sec-head-center">
                <span className="tn-eyebrow">PRIVACY & EASE OF ACCESS</span>
                <h2 className="tn-h2" style={{ marginTop: 10 }}>
                  Private by default. Simple from day one.
                </h2>
              </div>
            </BlurReveal>

            <div className="tn-grid-3" style={{ borderTop: '1px solid var(--tn-border)' }}>
              <div className="tn-cell">
                <span className="tn-eyebrow">YOUR DATA STAYS YOURS</span>
                <h3 className="tn-h3" style={{ fontSize: 21 }}>
                  100% Private Workspace
                </h3>
                <p className="tn-sec-desc" style={{ fontSize: 14 }}>
                  Your documents, pricing, and customer chats stay isolated to your
                  business and are never used to train public AI models.
                </p>
              </div>
              <div className="tn-cell">
                <span className="tn-eyebrow">HUMAN GUARDRAILS</span>
                <h3 className="tn-h3" style={{ fontSize: 21 }}>
                  1-Click Owner Approvals
                </h3>
                <p className="tn-sec-desc" style={{ fontSize: 14 }}>
                  Tanat answers everyday questions automatically and pauses refunds,
                  discounts, or bookings for your instant sign-off.
                </p>
              </div>
              <div className="tn-cell">
                <span className="tn-eyebrow">EFFORTLESS ACCESS</span>
                <h3 className="tn-h3" style={{ fontSize: 21 }}>
                  Live in Under 3 Minutes
                </h3>
                <p className="tn-sec-desc" style={{ fontSize: 14 }}>
                  Sign in with one email code, drop in a link or PDF, and launch
                  on your website, Telegram, WhatsApp, and Slack.
                </p>
              </div>
            </div>

            <div className="tn-h-line" />

            <div className="tn-stats-4">
              <div className="tn-stat-cell" style={{ justifyContent: 'center' }}>
                <span className="tn-eyebrow">TANAT AT A GLANCE</span>
                <div style={{ fontSize: 13.5, color: 'var(--tn-body)', marginTop: 4 }}>
                  Fast to set up, safe to run 24/7.
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
                <Link href="/start" className="tn-btn tn-btn-white">
                  Get started →
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
            <a href="#how-it-works">How it works</a>
            <a href="#examples">Telegram, WhatsApp & Slack</a>
            <a href="#integrate">Website widget</a>
            <a href="#privacy">Privacy & control</a>
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
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
            fontSize: 12.5,
            color: 'rgba(255,255,255,0.58)',
          }}
        >
          <span>© 2026 Tanat. Built for real businesses.</span>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              color: '#00ec97',
              fontFamily: 'var(--tn-font-mono)',
              fontSize: 11.5,
            }}
          >
            <NearLogo size={14} />
            <span>Powered by NEAR AI</span>
          </span>
        </div>

        <div className="tn-footer-bottom-brand" aria-hidden="true">
          <TanatMascotIcon size={64} />
          <div className="tn-footer-wordmark">Tanat</div>
        </div>
      </footer>
    </div>
  );
}
