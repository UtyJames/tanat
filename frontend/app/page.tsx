import Link from 'next/link';
import SiteNav from '@/components/site/SiteNav';
import GsapEffects from '@/components/site/GsapEffects';
import HeroDemo from '@/components/site/HeroDemo';
import UseCaseExplorer from '@/components/site/UseCaseExplorer';
import CodeTabs from '@/components/site/CodeTabs';
import { ArrowIcon, CheckIcon, Logo } from '@/components/brand/Logo';

export default function Home() {
  return (
    <div className="site">
      <GsapEffects />
      <SiteNav />

      <main>
        {/* ── 1. Hero: Clear in 5 seconds ─────────────────────────────── */}
        <section className="t-hero">
          <div className="t-wrap">
            <div className="t-hero-grid">
              <div className="t-hero-copy">
                <span className="t-eyebrow gsap-hero-item">
                  AI Assistants for Real Businesses
                </span>
                <h1 className="gsap-hero-item">
                  Put an AI assistant on your business{' '}
                  <span className="t-serif">in 3 minutes.</span>
                </h1>
                <p className="t-hero-lede gsap-hero-item">
                  Tanat gives your business a smart AI assistant that knows your
                  services, remembers your customers, and works on your website,
                  WhatsApp, or Telegram — without writing complex code.
                </p>

                <div className="t-hero-points gsap-hero-item">
                  <div className="t-hero-point">
                    <i>
                      <CheckIcon size={11} />
                    </i>
                    <span>
                      <strong>Knows your business:</strong> paste your website,
                      FAQs, or policies so it gives real answers.
                    </span>
                  </div>
                  <div className="t-hero-point">
                    <i>
                      <CheckIcon size={11} />
                    </i>
                    <span>
                      <strong>Remembers customers:</strong> picks up right where
                      returning customers left off.
                    </span>
                  </div>
                  <div className="t-hero-point">
                    <i>
                      <CheckIcon size={11} />
                    </i>
                    <span>
                      <strong>You stay in control:</strong> refunds, bookings,
                      and payments wait for your approval.
                    </span>
                  </div>
                </div>

                <div className="t-hero-ctas gsap-hero-item">
                  <Link className="t-btn t-btn-lime t-btn-lg" href="/start">
                    Set up your assistant <ArrowIcon />
                  </Link>
                  <Link className="t-btn t-btn-ghost t-btn-lg" href="#how-it-works">
                    See how it works
                  </Link>
                </div>

                <div className="t-hero-micro gsap-hero-item">
                  <span>Free to start</span>
                  <span>Live in 3 minutes</span>
                  <span>No coding required</span>
                </div>
              </div>

              <div id="demo">
                <HeroDemo />
              </div>
            </div>
          </div>
        </section>

        {/* ── 2. How It Works: 3 Simple Steps ─────────────────────────── */}
        <section className="t-section" id="how-it-works">
          <div className="t-wrap">
            <div className="t-section-head gsap-reveal">
              <div>
                <span className="t-eyebrow">How it works</span>
                <h2 style={{ marginTop: 14 }}>
                  Three steps from “I need AI” to live on your site.
                </h2>
              </div>
              <p>
                No prompt engineering. No servers to manage. Answer a few plain
                questions about your business and test your assistant right away.
              </p>
            </div>

            <div className="t-steps gsap-stagger">
              <div className="t-step">
                <span className="t-step-num">1</span>
                <h3>Add your business info</h3>
                <p>
                  Enter your business name, what you offer, and your FAQs or
                  policies. Your assistant learns how you talk and what you stand
                  for.
                </p>
                <span className="t-step-tag">~1 minute</span>
              </div>
              <div className="t-step">
                <span className="t-step-num">2</span>
                <h3>Set your rules</h3>
                <p>
                  Choose what it can answer on its own and what needs a human OK —
                  like refunds, custom quotes, or sensitive requests.
                </p>
                <span className="t-step-tag">~1 minute</span>
              </div>
              <div className="t-step">
                <span className="t-step-num">3</span>
                <h3>Put it on your website</h3>
                <p>
                  Test it live, then copy one line onto your website (Shopify,
                  WordPress, Wix, or custom) — or connect WhatsApp & Telegram.
                </p>
                <span className="t-step-tag">~1 minute</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── 3. Business Examples ────────────────────────────────────── */}
        <section className="t-section-tight" id="examples">
          <div className="t-wrap">
            <div className="t-section-head gsap-reveal">
              <div>
                <span className="t-eyebrow">Built for real businesses</span>
                <h2 style={{ marginTop: 14 }}>
                  See how businesses use Tanat every day.
                </h2>
              </div>
              <p>
                Pick your business type to see what your assistant handles
                automatically and how a real customer conversation looks.
              </p>
            </div>

            <div className="gsap-reveal">
              <UseCaseExplorer />
            </div>
          </div>
        </section>

        {/* ── 4. Easiest Ways to Integrate ────────────────────────────── */}
        <section className="t-section" id="integrate">
          <div className="t-wrap">
            <div className="t-section-head gsap-reveal">
              <div>
                <span className="t-eyebrow">Easy integration</span>
                <h2 style={{ marginTop: 14 }}>
                  Add it to your website in 60 seconds.
                </h2>
              </div>
              <p>
                Whether you use Shopify, WordPress, an AI builder like Lovable
                or Cursor, or your own React app — Tanat fits right in.
              </p>
            </div>

            <div className="gsap-reveal">
              <CodeTabs />
            </div>
          </div>
        </section>

        {/* ── 5. Simple Trust + Final CTA ─────────────────────────────── */}
        <section className="t-cta">
          <div className="t-wrap">
            <div className="t-cta-box gsap-reveal">
              <div>
                <h2>Ready to put your AI assistant to work?</h2>
                <p>
                  Set up your workspace in 3 minutes, test your assistant with
                  your own questions, and paste one line to go live on your site.
                </p>
              </div>
              <div className="t-cta-actions">
                <Link className="t-btn t-btn-ink t-btn-lg" href="/start">
                  Get started free <ArrowIcon />
                </Link>
                <Link className="t-btn t-btn-ghost t-btn-lg" href="/docs">
                  Integration guide
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="t-footer">
        <div className="t-wrap">
          <div className="t-footer-grid">
            <div className="t-footer-brand">
              <Logo size={30} tone="bone" />
              <p>
                AI assistants for businesses — trained on your info, connected
                to your channels, and always under your control.
              </p>
            </div>
            <div className="t-footer-col">
              <h4>Product</h4>
              <Link href="/#how-it-works">How it works</Link>
              <Link href="/#examples">Business examples</Link>
              <Link href="/#integrate">Website widget</Link>
              <Link href="/start">Get started</Link>
            </div>
            <div className="t-footer-col">
              <h4>Integration</h4>
              <Link href="/docs">Documentation</Link>
              <Link href="/docs#widget">1-Line Widget</Link>
              <Link href="/docs#vibecoding">Cursor / Lovable / v0</Link>
              <a href="https://api.tanat.space/llms.txt" target="_blank" rel="noreferrer">
                llms.txt
              </a>
            </div>
            <div className="t-footer-col">
              <h4>Account</h4>
              <Link href="/login">Sign in</Link>
              <Link href="/app">Workspace dashboard</Link>
              <a href="mailto:hello@tanat.space">hello@tanat.space</a>
            </div>
          </div>
          <div className="t-footer-bottom">
            <span>© 2026 Tanat. Built for real businesses.</span>
            <span className="t-footer-status">All systems operational</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
