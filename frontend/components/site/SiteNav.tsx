

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Logo } from '@/components/brand/Logo';

const links = [
  { href: '/#capabilities', label: 'Capabilities' },
  { href: '/#how-it-works', label: 'How it works' },
  { href: '/#channels', label: 'Channels' },
  { href: '/#developers', label: 'Developers' },
  { href: '/docs', label: 'Docs' },
];

export default function SiteNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    const items = Array.from(document.querySelectorAll<HTMLElement>('.t-reveal'));
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              entry.target.classList.add('in');
              observer.unobserve(entry.target);
            }
          }
        },
        { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
      );
      items.forEach((item) => observer.observe(item));
      return () => {
        observer.disconnect();
        window.removeEventListener('scroll', onScroll);
      };
    }

    items.forEach((item) => item.classList.add('in'));
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={`t-nav ${scrolled ? 'scrolled' : ''}`}>
      <div className="t-wrap">
        <div className="t-nav-inner">
          <Link href="/" aria-label="Tanat home">
            <Logo size={30} />
          </Link>

          <nav className="t-nav-links" aria-label="Main">
            {links.map((link) => (
              <Link key={link.href} href={link.href}>
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="t-nav-actions">
            <Link className="t-nav-signin" href="/login">
              Sign in
            </Link>
            <Link className="t-btn t-btn-lime t-btn-sm" href="/start">
              Get started
            </Link>
            <button
              className="t-mobile-toggle"
              aria-label="Open menu"
              aria-expanded={open}
              onClick={() => setOpen((value) => !value)}
            >
              <svg width="16" height="12" viewBox="0 0 16 12" fill="none" aria-hidden="true">
                <path
                  d={open ? 'M2 2l12 8M14 2L2 10' : 'M1 2h14M1 6h14M1 10h14'}
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </div>

        <div className={`t-mobile-menu ${open ? 'open' : ''}`}>
          {links.map((link) => (
            <Link key={link.href} href={link.href} onClick={() => setOpen(false)}>
              {link.label}
            </Link>
          ))}
          <Link href="/login" onClick={() => setOpen(false)}>
            Sign in
          </Link>
          <Link href="/start" onClick={() => setOpen(false)}>
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}
