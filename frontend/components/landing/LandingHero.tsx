'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  CursorLogo,
  LovableLogo,
  SlackLogo,
  TanatMascotIcon,
  TelegramLogo,
  WebflowLogo,
} from '@/components/brand/PlatformLogos';

const PLACEHOLDERS = [
  'Whether you’re vibecoding in Lovable or Cursor, plug in your own AI in 1 line...',
  'Deploy your own AI across your website, Telegram, WhatsApp & Slack in 3 min...',
  'Skip vector DBs & webhook servers — train on your docs in 60 seconds...',
  'Keep sensitive refunds and bookings behind 1-click owner approval...',
];

export default function LandingHero() {
  const [prompt, setPrompt] = useState('');
  const [phIdx, setPhIdx] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const id = window.setInterval(() => {
      setPhIdx((i) => (i + 1) % PLACEHOLDERS.length);
    }, 3200);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setModalOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modalOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setModalOpen(true);
  };

  return (
    <section className="tn-hero-shell" id="top">
      <div className="tn-wrap" style={{ padding: 0 }}>
        <div className="tn-near-grain tn-hero-card">
          <div className="tn-hero-wireframe" />
          <span className="tn-pushpin tn-pushpin-left" aria-hidden="true" />
          <span className="tn-pushpin tn-pushpin-right" aria-hidden="true" />
          <div className="tn-pixel-corner" style={{ top: 18, left: 64 }} aria-hidden="true" />
          <div className="tn-pixel-corner" style={{ bottom: 18, right: 64 }} aria-hidden="true" />

          {/* Floating Animated Platform Logos (Left & Right) */}
          <div className="tn-float-badge tn-float-badge-left" title="Slack" aria-hidden="true">
            <SlackLogo size={26} />
          </div>

          <div className="tn-float-badge tn-float-badge-right" title="Lovable" aria-hidden="true">
            <LovableLogo size={26} />
          </div>

          <div className="tn-float-badge tn-float-badge-left-2" title="Telegram" aria-hidden="true">
            <TelegramLogo size={26} />
          </div>

          <div className="tn-float-badge tn-float-badge-right-2" title="Webflow" aria-hidden="true">
            <WebflowLogo size={26} />
          </div>

          <div className="tn-float-badge tn-float-badge-left-3" title="Cursor" aria-hidden="true">
            <CursorLogo size={24} />
          </div>

          <div className="tn-float-note" aria-hidden="true">
            Vibecoding or live site — zero infra headaches!
          </div>

          {/* Mascot Toast Card */}
          <div className="tn-float-toast" aria-hidden="true">
            <TanatMascotIcon size={40} />
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: '#141414' }}>
                Jenny Roy · Order #4821
              </div>
              <div style={{ fontSize: 11.5, color: '#008f5b', fontWeight: 600 }}>
                ✓ Resolved in 0.3s via Tanat
              </div>
            </div>
          </div>

          <h1 className="tn-h1 tn-hero-title" style={{ marginTop: 8 }}>
            Set Up Your Own AI,
            <br />
            Live Everywhere in Minutes
          </h1>

          <p className="tn-hero-sub">
            Whether you’re vibecoding a new app or running a business, plug your
            own private AI into websites, Telegram, WhatsApp, and Slack — with
            zero infrastructure complexity.
          </p>

          {/* Interactive Glass Prompt Box */}
          <form className="tn-prompt-box" onSubmit={handleSubmit}>
            <textarea
              className="tn-prompt-input"
              rows={2}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={PLACEHOLDERS[phIdx]}
              aria-label="Describe what your Tanat AI should do"
            />
            <div className="tn-prompt-footer">
              <button
                type="button"
                className="tn-prompt-plus"
                title="Insert sample prompt"
                onClick={() => setPrompt(PLACEHOLDERS[phIdx])}
              >
                +
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span
                  style={{
                    fontSize: 12,
                    color: 'rgba(255,255,255,0.78)',
                    fontFamily: 'var(--tn-font-mono)',
                  }}
                >
                  3-min setup · Zero infra
                </span>
                <button
                  type="submit"
                  className="tn-prompt-submit"
                  aria-label="Start workspace setup"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M5 12h14M13 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </form>

          <div style={{ marginTop: 22, display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', position: 'relative', zIndex: 2 }}>
            <Link href="/start" className="tn-btn tn-btn-white">
              Start 3-minute setup →
            </Link>
            <Link href="/docs#vibecoding" className="tn-btn tn-btn-outline-light">
              Vibecoding guide ↗
            </Link>
          </div>
        </div>
      </div>

      {/* Modal Overlay */}
      {modalOpen && (
        <div
          className="tn-modal-backdrop"
          onClick={() => setModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="tn-modal-title"
        >
          <div className="tn-modal-card" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              aria-label="Close modal"
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                width: 32,
                height: 32,
                borderRadius: '50%',
                border: '1px solid var(--tn-border)',
                background: 'var(--tn-bg)',
                color: 'var(--tn-ink)',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              ✕
            </button>

            <span className="tn-eyebrow">PRIVATE WORKSPACE</span>
            <h3 id="tn-modal-title" className="tn-h3" style={{ marginTop: 8 }}>
              Launch your own AI in 3 minutes
            </h3>
            <p style={{ marginTop: 8, color: 'var(--tn-body)', fontSize: 14 }}>
              No vector database setup, no webhook plumbing — your business docs
              and customer chats stay 100% private.
            </p>

            {prompt.trim() && (
              <div
                style={{
                  marginTop: 14,
                  padding: '10px 14px',
                  borderRadius: 12,
                  background: 'var(--tn-bg)',
                  border: '1px solid var(--tn-border)',
                  fontSize: 13,
                  color: 'var(--tn-ink)',
                }}
              >
                <span style={{ fontFamily: 'var(--tn-font-mono)', fontSize: 11, color: 'var(--tn-emerald)' }}>
                  YOUR GOAL:{' '}
                </span>
                {prompt}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 20 }}>
              <Link href="/start" className="tn-btn tn-btn-white" style={{ width: '100%', height: 46 }}>
                Start 3-minute setup →
              </Link>
              <Link href="/login" className="tn-btn tn-btn-beige" style={{ width: '100%', height: 46 }}>
                Sign in to existing workspace
              </Link>
              <Link
                href="/docs#vibecoding"
                style={{ textAlign: 'center', fontSize: 13, color: 'var(--tn-muted)', marginTop: 4 }}
              >
                Vibecoding with Cursor / Lovable / v0 ↗
              </Link>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
