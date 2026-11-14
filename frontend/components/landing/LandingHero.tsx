'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  NearLogo,
  NextJsLogo,
  ShopifyLogo,
  SlackLogo,
  TelegramLogo,
  WhatsAppLogo,
  WordPressLogo,
} from '@/components/brand/PlatformLogos';

const PLACEHOLDERS = [
  'Connect Tanat to WordPress, Slack, and Telegram in 3 minutes...',
  'Answer customer questions privately on NEAR AI Cloud...',
  'Pause refunds for 1-click owner approval before executing...',
  'Embed one line on Shopify or Next.js with zero data training...',
];

const HERO_PARTNERS = [
  {
    name: 'WordPress',
    logo: <WordPressLogo size={16} />,
    prompt: 'Add Tanat to my WordPress site with a single header snippet',
  },
  {
    name: 'Slack',
    logo: <SlackLogo size={16} />,
    prompt: 'Route team questions and owner approval alerts straight to Slack',
  },
  {
    name: 'Telegram',
    logo: <TelegramLogo size={16} />,
    prompt: 'Connect my Telegram bot so customers get instant private replies 24/7',
  },
  {
    name: 'WhatsApp',
    logo: <WhatsAppLogo size={16} />,
    prompt: 'Handle WhatsApp customer bookings and order updates automatically',
  },
  {
    name: 'Shopify',
    logo: <ShopifyLogo size={16} />,
    prompt: 'Answer Shopify shipping, sizing, and return questions using my store policy',
  },
  {
    name: 'Next.js',
    logo: <NextJsLogo size={16} />,
    prompt: 'Drop the Tanat widget into my Next.js or React app in 60 seconds',
  },
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

          {/* Floating Real Partner Logos */}
          <div className="tn-float-badge tn-float-badge-left" title="Slack Integration" aria-hidden="true">
            <SlackLogo size={26} />
          </div>

          <div className="tn-float-badge tn-float-badge-right" title="WordPress Integration" aria-hidden="true">
            <WordPressLogo size={26} />
          </div>

          <div className="tn-float-note" aria-hidden="true">
            Private by default — your data never trains AI models!
          </div>

          {/* Mascot Toast Card */}
          <div className="tn-float-toast" aria-hidden="true">
            <img
              src="/tanat-mascot.jpg"
              alt="Tanat AI Mascot"
              width={40}
              height={40}
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                objectFit: 'cover',
                border: '1px solid rgba(0, 236, 151, 0.5)',
              }}
            />
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: '#141414' }}>
                Jenny Roy · Order #4821
              </div>
              <div style={{ fontSize: 11.5, color: '#008f5b', fontWeight: 600 }}>
                ✓ Resolved in 0.3s via Tanat
              </div>
            </div>
          </div>

          {/* Powered by NEAR AI Cloud Badge */}
          <div className="tn-near-badge">
            <span style={{ color: '#00ec97', display: 'inline-flex' }}>
              <NearLogo size={16} />
            </span>
            <span>Powered by NEAR AI Cloud</span>
            <span className="tn-mint-pill">Private</span>
          </div>

          <h1 className="tn-h1 tn-hero-title">
            Private AI Assistants
            <br />
            For Every Channel You Use
          </h1>

          <p className="tn-hero-sub">
            Connect your docs once and go live on WordPress, Shopify, Telegram,
            WhatsApp, and Slack in 3 minutes — with private inference and 1-click
            human approvals.
          </p>

          {/* Interactive Glass Prompt Box */}
          <form className="tn-prompt-box" onSubmit={handleSubmit}>
            <textarea
              className="tn-prompt-input"
              rows={2}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={PLACEHOLDERS[phIdx]}
              aria-label="Describe what your Tanat assistant should handle"
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
                  3-min setup · Zero code
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

          {/* Clickable Partner Integration Pills */}
          <div className="tn-hero-partners">
            {HERO_PARTNERS.map((p) => (
              <button
                key={p.name}
                type="button"
                className="tn-partner-pill"
                onClick={() => setPrompt(p.prompt)}
              >
                {p.logo}
                <span>{p.name}</span>
              </button>
            ))}
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
              Launch your Tanat assistant
            </h3>
            <p style={{ marginTop: 8, color: 'var(--tn-body)', fontSize: 14 }}>
              Set up in under 3 minutes. Powered by NEAR AI Cloud with strict
              tenant isolation — your business data stays yours.
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
              <Link href="/start" className="tn-btn tn-btn-near" style={{ width: '100%', height: 46 }}>
                Start 3-minute setup →
              </Link>
              <Link href="/login" className="tn-btn tn-btn-beige" style={{ width: '100%', height: 46 }}>
                Sign in to existing workspace
              </Link>
              <Link
                href="/docs"
                style={{ textAlign: 'center', fontSize: 13, color: 'var(--tn-muted)', marginTop: 4 }}
              >
                Read integration & privacy docs ↗
              </Link>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

