'use client';

import { useState } from 'react';
import Link from 'next/link';
import { TanatMascotIcon } from '@/components/brand/PlatformLogos';

export default function LandingNav() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="tn-nav">
      <div className="tn-nav-inner">
        <Link href="/" className="tn-brand">
          <TanatMascotIcon size={36} />
          <span>Tanat</span>
        </Link>

        <nav className="tn-nav-links" aria-label="Primary">
          <Link href="/#top" className="tn-nav-link is-active">
            Home
          </Link>
          <Link href="/#how-it-works" className="tn-nav-link">
            How it works
          </Link>
          <Link href="/#examples" className="tn-nav-link">
            Examples
          </Link>
          <Link href="/#integrate" className="tn-nav-link">
            Integrate
          </Link>
          <Link href="/docs" className="tn-nav-link">
            Docs
          </Link>
        </nav>

        <div className="tn-nav-actions">
          <Link href="/login" className="tn-btn tn-btn-beige">
            Sign in
          </Link>
          <Link href="/start" className="tn-btn tn-btn-white">
            Get started
          </Link>
          <button
            type="button"
            className="tn-mobile-toggle"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      <div className={`tn-mobile-drawer ${mobileOpen ? 'is-open' : ''}`}>
        <Link href="/#how-it-works" className="tn-nav-link" onClick={() => setMobileOpen(false)}>
          How it works
        </Link>
        <Link href="/#examples" className="tn-nav-link" onClick={() => setMobileOpen(false)}>
          Examples
        </Link>
        <Link href="/#integrate" className="tn-nav-link" onClick={() => setMobileOpen(false)}>
          Integrate
        </Link>
        <Link href="/docs" className="tn-nav-link" onClick={() => setMobileOpen(false)}>
          Docs
        </Link>
        <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
          <Link href="/login" className="tn-btn tn-btn-beige" style={{ flex: 1 }}>
            Sign in
          </Link>
          <Link href="/start" className="tn-btn tn-btn-white" style={{ flex: 1 }}>
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}
