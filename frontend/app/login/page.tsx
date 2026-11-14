'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import '../landing.css';
import { ApiError, requestOtp, verifyOtp } from '@/lib/api';
import {
  CursorLogo,
  LovableLogo,
  SlackLogo,
  TanatMascotIcon,
  TelegramLogo,
  WebflowLogo,
} from '@/components/brand/PlatformLogos';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function sendCode(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await requestOtp({ email: email.trim() });
      setStep('code');
      setNotice(`We sent a six-digit verification code to ${email.trim()}. It expires in 10 minutes.`);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'We could not send the verification code. Please try again.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function verify(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await verifyOtp(email.trim(), code.trim());
      router.replace('/app');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'That code did not work.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="tn-site"
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(360px, 1.05fr) 1fr',
        minHeight: '100vh',
      }}
    >
      {/* Left Hero-Matched Grainy Emerald Panel with Floating Logos */}
      <aside
        className="tn-near-grain"
        style={{
          padding: '36px 40px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          borderRight: '1px solid var(--tn-border)',
          position: 'relative',
          minHeight: '100vh',
        }}
      >
        <div className="tn-hero-wireframe" />
        <span className="tn-pushpin tn-pushpin-left" aria-hidden="true" />
        <span className="tn-pushpin tn-pushpin-right" aria-hidden="true" />
        <div className="tn-pixel-corner" style={{ top: 18, left: 64 }} aria-hidden="true" />
        <div className="tn-pixel-corner" style={{ bottom: 18, right: 64 }} aria-hidden="true" />

        {/* Floating Animated Platform Logos */}
        <div
          className="tn-float-badge"
          style={{ right: 44, top: 86, animation: 'tn-float-b 5.6s ease-in-out infinite' }}
          aria-hidden="true"
        >
          <LovableLogo size={24} />
        </div>
        <div
          className="tn-float-badge"
          style={{ right: 112, top: 162, animation: 'tn-float-a 6.2s ease-in-out infinite' }}
          aria-hidden="true"
        >
          <SlackLogo size={24} />
        </div>
        <div
          className="tn-float-badge"
          style={{ right: 48, bottom: 130, animation: 'tn-float-a 5.8s ease-in-out infinite' }}
          aria-hidden="true"
        >
          <TelegramLogo size={24} />
        </div>
        <div
          className="tn-float-badge"
          style={{ right: 124, bottom: 72, animation: 'tn-float-b 6.5s ease-in-out infinite' }}
          aria-hidden="true"
        >
          <WebflowLogo size={22} />
        </div>
        <div
          className="tn-float-badge"
          style={{ left: 42, bottom: 120, animation: 'tn-float-b 6.1s ease-in-out infinite' }}
          aria-hidden="true"
        >
          <CursorLogo size={22} />
        </div>

        <Link
          href="/"
          className="tn-brand"
          style={{ color: '#ffffff', position: 'relative', zIndex: 2 }}
        >
          <TanatMascotIcon size={36} />
          <span>Tanat</span>
        </Link>

        <div style={{ maxWidth: 440, position: 'relative', zIndex: 2, margin: '48px 0' }}>
          <span className="tn-eyebrow" style={{ color: '#00ec97' }}>
            TANAT WORKSPACE
          </span>
          <h2
            className="tn-h2"
            style={{ color: '#ffffff', marginTop: 12, fontSize: 'clamp(28px, 3vw, 38px)' }}
          >
            Your private AI, always under your control.
          </h2>
          <p style={{ marginTop: 14, color: 'rgba(255,255,255,0.82)', fontSize: 15 }}>
            Sign in with one email code to update your knowledge base, check
            Telegram, WhatsApp, and Slack threads, and approve customer actions
            in one click.
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 18,
            flexWrap: 'wrap',
            fontFamily: 'var(--tn-font-mono)',
            fontSize: 11.5,
            color: '#00ec97',
            borderTop: '1px dashed rgba(255,255,255,0.2)',
            paddingTop: 18,
            position: 'relative',
            zIndex: 2,
          }}
        >
          <span>✓ 100% private workspace</span>
          <span>✓ Multi-channel live</span>
          <span>✓ 1-click approvals</span>
        </div>
      </aside>

      {/* Right Architectural Form Panel with Dotted Linings */}
      <main
        style={{
          display: 'grid',
          placeItems: 'center',
          padding: '40px 28px',
          background: 'var(--tn-bg)',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 440,
            background: '#ffffff',
            border: '1px solid var(--tn-border)',
            borderRadius: 22,
            padding: 32,
            boxShadow: '0 20px 50px -28px rgba(0,0,0,0.18)',
          }}
        >
          <span className="tn-eyebrow">WELCOME BACK</span>
          <h1 className="tn-h2" style={{ marginTop: 10, fontSize: 32 }}>
            Sign in to Tanat
          </h1>
          <p className="tn-sec-desc" style={{ marginTop: 8, fontSize: 14.5 }}>
            Enter your work email and we’ll send a one-time 6-digit code to open
            your workspace.
          </p>

          <div style={{ borderTop: '1px dashed var(--tn-border-strong)', margin: '20px 0' }} />

          {step === 'email' ? (
            <form
              onSubmit={(event) => void sendCode(event)}
              style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
            >
              <label
                htmlFor="login-email"
                style={{
                  fontFamily: 'var(--tn-font-mono)',
                  fontSize: 11.5,
                  letterSpacing: '0.08em',
                  color: 'var(--tn-muted)',
                }}
              >
                WORK EMAIL
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoFocus
                style={{
                  height: 46,
                  padding: '0 14px',
                  borderRadius: 12,
                  border: '1px solid var(--tn-border-strong)',
                  background: 'var(--tn-bg)',
                  color: 'var(--tn-ink)',
                  fontSize: 15,
                  outline: 'none',
                }}
              />
              <button
                className="tn-btn tn-btn-white"
                type="submit"
                disabled={busy}
                style={{ width: '100%', height: 46, marginTop: 4 }}
              >
                {busy ? 'Sending code…' : 'Email me a sign-in code →'}
              </button>
            </form>
          ) : (
            <form
              onSubmit={(event) => void verify(event)}
              style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
            >
              <label
                htmlFor="login-code"
                style={{
                  fontFamily: 'var(--tn-font-mono)',
                  fontSize: 11.5,
                  letterSpacing: '0.08em',
                  color: 'var(--tn-muted)',
                }}
              >
                SIX-DIGIT VERIFICATION CODE
              </label>
              <input
                id="login-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                required
                autoFocus
                style={{
                  height: 46,
                  padding: '0 14px',
                  borderRadius: 12,
                  border: '1px solid var(--tn-border-strong)',
                  background: 'var(--tn-bg)',
                  color: 'var(--tn-ink)',
                  fontSize: 18,
                  letterSpacing: '0.2em',
                  fontFamily: 'var(--tn-font-mono)',
                  outline: 'none',
                }}
              />
              <button
                className="tn-btn tn-btn-white"
                type="submit"
                disabled={busy}
                style={{ width: '100%', height: 46 }}
              >
                {busy ? 'Verifying…' : 'Open workspace →'}
              </button>
              <button
                type="button"
                className="tn-btn tn-btn-beige"
                onClick={() => {
                  setStep('email');
                  setCode('');
                  setError(null);
                  setNotice(null);
                }}
                style={{ width: '100%', height: 42 }}
              >
                Use a different email
              </button>
            </form>
          )}

          {notice && (
            <div
              style={{
                marginTop: 16,
                padding: '10px 14px',
                borderRadius: 12,
                background: '#ecfdf5',
                border: '1px solid #00c980',
                fontSize: 13,
                color: '#065f46',
              }}
            >
              {notice}
            </div>
          )}

          {error && (
            <div
              style={{
                marginTop: 16,
                padding: '10px 14px',
                borderRadius: 12,
                background: '#fef2f2',
                border: '1px solid #fca5a5',
                fontSize: 13,
                color: '#991b1b',
              }}
            >
              {error}
            </div>
          )}

          <div
            style={{
              borderTop: '1px dashed var(--tn-border-strong)',
              marginTop: 24,
              paddingTop: 18,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: 13,
              color: 'var(--tn-muted)',
            }}
          >
            <span>New to Tanat?</span>
            <Link href="/start" style={{ fontWeight: 600, color: 'var(--tn-emerald)' }}>
              Start 3-minute setup →
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
