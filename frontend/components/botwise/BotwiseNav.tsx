'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

const SECTION_LINKS = [
  { href: '#features', label: 'Features' },
  { href: '#system', label: 'Problem & Solution' },
  { href: '#platform', label: 'Platform Stack' },
  { href: '#how-it-works', label: 'How It Works' },
  { href: '#compare', label: 'Comparison' },
  { href: '#benefits', label: 'Benefits' },
  { href: '#integration', label: 'Integrations' },
  { href: '#pricing', label: 'Pricing' },
  { href: '#faq', label: 'FAQ' },
];

export default function BotwiseNav() {
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
    <header className="bw-nav">
      <div className="bw-nav-inner">
        <Link href="/" className="bw-brand">
          <span className="bw-brand-badge" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 3L14.6 9.4L21 12L14.6 14.6L12 21L9.4 14.6L3 12L9.4 9.4L12 3Z"
                fill="currentColor"
              />
            </svg>
          </span>
          <span>Tanat</span>
        </Link>

        <nav className="bw-nav-links" aria-label="Primary">
          <a href="#top" className="bw-nav-link is-active">
            Home
          </a>
          <a href="#features" className="bw-nav-link">
            Features
          </a>
          <a href="#how-it-works" className="bw-nav-link">
            How It Works
          </a>
          <a href="#pricing" className="bw-nav-link">
            Pricing
          </a>
          <Link href="/docs" className="bw-nav-link">
            Docs
          </Link>

          <div className="bw-nav-dropdown-wrap" ref={dropRef}>
            <button
              type="button"
              className="bw-nav-dropdown-btn"
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
              <div className="bw-nav-dropdown-menu" role="menu">
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

        <div className="bw-nav-actions">
          <Link href="/login" className="bw-btn bw-btn-beige">
            Sign in
          </Link>
          <Link href="/start" className="bw-btn bw-btn-dark">
            Get Started
          </Link>
          <button
            type="button"
            className="bw-mobile-toggle"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      <div className={`bw-mobile-drawer ${mobileOpen ? 'is-open' : ''}`}>
        <a href="#features" className="bw-nav-link" onClick={() => setMobileOpen(false)}>
          Features
        </a>
        <a href="#how-it-works" className="bw-nav-link" onClick={() => setMobileOpen(false)}>
          How It Works
        </a>
        <a href="#pricing" className="bw-nav-link" onClick={() => setMobileOpen(false)}>
          Pricing
        </a>
        <Link href="/docs" className="bw-nav-link" onClick={() => setMobileOpen(false)}>
          Docs
        </Link>
        <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
          <Link href="/login" className="bw-btn bw-btn-beige" style={{ flex: 1 }}>
            Sign in
          </Link>
          <Link href="/start" className="bw-btn bw-btn-dark" style={{ flex: 1 }}>
            Get Started
          </Link>
        </div>
      </div>
    </header>
  );
}

