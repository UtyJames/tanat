'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const PLACEHOLDERS = [
  'How do I add Tanat to my Shopify or Next.js site?',
  'Can Tanat ask for my approval before issuing a refund?',
  'How do I connect my Telegram & WhatsApp support channels?',
  'Train an assistant on my pricing page and return policy...',
];

const HERO_CHIPS = [
  { label: '+ Order Tracking', prompt: 'Track customer orders and answer shipping ETA questions automatically' },
  { label: '+ Booking & Deposits', prompt: 'Qualify leads, book appointments, and send payment links' },
  { label: '+ Refund Approvals', prompt: 'Prepare refunds based on our policy and wait for my 1-click approval' },
  { label: '+ Telegram & WhatsApp', prompt: 'Connect my business assistant to Telegram, WhatsApp, and Website Chat' },
  { label: '+ Knowledge Base', prompt: 'Train my AI assistant from website URLs, PDFs, and custom FAQs' },
  { label: '+ 1-Line Widget', prompt: 'Embed the Tanat chat widget on any website with a single script tag' },
];

export default function BotwiseHero() {
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
    <section className="bw-hero-shell" id="top">
      <div className="bw-wrap" style={{ padding: 0 }}>
        <div className="bw-blue-grain bw-hero-card">
          <div className="bw-hero-wireframe" />
          <span className="bw-pushpin bw-pushpin-left" aria-hidden="true" />
          <span className="bw-pushpin bw-pushpin-right" aria-hidden="true" />
          <div
            className="bw-pixel-corner"
            style={{ top: 18, left: 64 }}
            aria-hidden="true"
          />
          <div
            className="bw-pixel-corner"
            style={{ bottom: 18, right: 64 }}
            aria-hidden="true"
          />

          {/* Floating 3D-style badges */}
          <div className="bw-float-badge bw-float-badge-left" aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
          </div>

          <div className="bw-float-badge bw-float-badge-right" aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
          </div>

          <div className="bw-float-note" aria-hidden="true">
            Trained on your docs in 60s — zero code!
          </div>

          <div className="bw-float-toast" aria-hidden="true">
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #3745f1, #00e5a3)',
                color: '#fff',
                display: 'grid',
                placeItems: 'center',
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              JR
            </div>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: '#262626' }}>
                Jenny Roy · Order #4821
              </div>
              <div style={{ fontSize: 11.5, color: '#0b875b', fontWeight: 500 }}>
                ✓ Resolved in 0.3s via Tanat
              </div>
            </div>
          </div>

          {/* Center Hero Content */}
          <div className="bw-hero-badge">
            <span>AI-First Mode Available</span>
            <span className="bw-mint-pill">New</span>
          </div>

          <h1 className="bw-h1 bw-hero-title">
            AI That Automates
            <br />
            Customer Experience
          </h1>

          <p className="bw-hero-sub">
            Give your business an AI assistant trained on your docs — live on your
            website, WhatsApp, and Telegram with human approval when it matters.
          </p>

          {/* Interactive Glass Prompt Box */}
          <form className="bw-prompt-box" onSubmit={handleSubmit}>
            <textarea
              className="bw-prompt-input"
              rows={2}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={PLACEHOLDERS[phIdx]}
              aria-label="Describe what your Tanat assistant should handle"
            />
            <div className="bw-prompt-footer">
              <button
                type="button"
                className="bw-prompt-plus"
                title="Insert sample prompt"
                onClick={() => setPrompt(PLACEHOLDERS[phIdx])}
              >
                +
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span
                  style={{
                    fontSize: 12,
                    color: 'rgba(255,255,255,0.75)',
                    fontFamily: 'var(--bw-font-mono)',
                  }}
                >
                  Live in 3 min
                </span>
                <button
                  type="submit"
                  className="bw-prompt-submit"
                  aria-label="Launch assistant setup"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                    <path d="M5 12h14M13 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </form>

          {/* Clickable Marquee Chips */}
          <div className="bw-chip-marquee">
            <div className="bw-marquee-track">
              {[...HERO_CHIPS, ...HERO_CHIPS].map((chip, idx) => (
                <button
                  key={`${chip.label}-${idx}`}
                  type="button"
                  className="bw-hero-chip"
                  onClick={() => setPrompt(chip.prompt)}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Modal Overlay */}
      {modalOpen && (
        <div
          className="bw-modal-backdrop"
          onClick={() => setModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="bw-modal-title"
        >
          <div className="bw-modal-card" onClick={(e) => e.stopPropagation()}>
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
                border: '1px solid var(--bw-border)',
                background: 'var(--bw-bg)',
                color: 'var(--bw-ink)',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              ✕
            </button>

            <span className="bw-eyebrow">TANAT WORKSPACE</span>
            <h3 id="bw-modal-title" className="bw-h3" style={{ marginTop: 8 }}>
              Create your free workspace
            </h3>
            <p style={{ marginTop: 8, color: 'var(--bw-body)', fontSize: 14 }}>
              Launch an AI assistant configured for your business in under 3 minutes.
            </p>

            {prompt.trim() && (
              <div
                style={{
                  marginTop: 16,
                  padding: '10px 14px',
                  borderRadius: 12,
                  background: 'var(--bw-bg)',
                  border: '1px solid var(--bw-border)',
                  fontSize: 13,
                  color: 'var(--bw-ink)',
                }}
              >
                <span style={{ fontFamily: 'var(--bw-font-mono)', fontSize: 11, color: 'var(--bw-blue)' }}>
                  YOUR GOAL:{' '}
                </span>
                {prompt}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 20 }}>
              <Link
                href="/start"
                className="bw-btn bw-btn-dark"
                style={{ width: '100%', height: 46 }}
              >
                Start 3-minute setup →
              </Link>
              <Link
                href="/login"
                className="bw-btn bw-btn-beige"
                style={{ width: '100%', height: 46 }}
              >
                Sign in with email
              </Link>
              <Link
                href="/docs"
                style={{
                  textAlign: 'center',
                  fontSize: 13,
                  color: 'var(--bw-muted)',
                  marginTop: 4,
                }}
              >
                Read integration docs first ↗
              </Link>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

