'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { TanatMascotIcon } from '@/components/brand/PlatformLogos';

const SECTION_LINKS = [
  { href: '#how-it-works', label: 'How it works' },
  { href: '#examples', label: 'Telegram, WhatsApp & Slack' },
  { href: '#integrate', label: 'Integrations' },
  { href: '#privacy', label: 'Privacy & Control' },
];

export default function LandingNav() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  return (
    <header className="tn-nav">
      <div className="tn-nav-inner">
        <Link href="/" className="tn-brand">
          <TanatMascotIcon size={36} />
          <span>Tanat</span>
        </Link>

        <nav className="tn-nav-links" aria-label="Primary">
          <a href="#top" className="tn-nav-link is-active">
            Home
          </a>
          <a href="#how-it-works" className="tn-nav-link">
            How it works
          </a>
          <a href="#examples" className="tn-nav-link">
            Examples
          </a>
          <a href="#integrate" className="tn-nav-link">
            Integrate
          </a>
          <Link href="/docs" className="tn-nav-link">
            Docs
          </Link>

          <div className="tn-nav-dropdown-wrap" ref={dropRef}>
            <button
              type="button"
              className="tn-nav-dropdown-btn"
              onClick={() => setDropdownOpen((v) => !v)}
              aria-expanded={dropdownOpen}
            >
              Sections
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                style={{
                  transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 150ms ease',
                }}
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
            {dropdownOpen && (
              <div className="tn-nav-dropdown-menu" role="menu">
                {SECTION_LINKS.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={() => setDropdownOpen(false)}
                  >
                    <span>{item.label}</span>
                    <span style={{ opacity: 0.45 }}>↗</span>
                  </a>
                ))}
              </div>
            )}
          </div>
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
        <a href="#how-it-works" className="tn-nav-link" onClick={() => setMobileOpen(false)}>
          How it works
        </a>
        <a href="#examples" className="tn-nav-link" onClick={() => setMobileOpen(false)}>
          Examples
        </a>
        <a href="#integrate" className="tn-nav-link" onClick={() => setMobileOpen(false)}>
          Integrate
        </a>
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

