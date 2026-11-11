'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ApiError, requestOtp, verifyOtp } from '@/lib/api';
import { ArrowIcon, Logo } from '@/components/brand/Logo';

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
      await requestOtp({ email: email.trim(), tenant_name: 'Workspace' });
      setStep('code');
      setNotice(`We sent a six-digit code to ${email.trim()}. It expires in 10 minutes.`);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'We could not send the code. Please try again.',
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
      setError(
        err instanceof ApiError ? err.message : 'That code did not work.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login">
      <aside className="login-art">
        <Link href="/">
          <Logo size={30} tone="bone" />
        </Link>
        <div className="login-quote">
          <p className="t-eyebrow t-eyebrow-dark" style={{ marginBottom: 18 }}>
            Your workspace
          </p>
          <h2>
            The agent talks.
            <br />
            You keep the keys.
          </h2>
          <p>
            Sign in to review conversations, approve payments, and change what your
            agent is allowed to do.
          </p>
        </div>
        <div className="login-art-foot">
          <span>✓ Human approval</span>
          <span>✓ Non-custodial</span>
          <span>✓ Full audit trail</span>
        </div>
      </aside>

      <main className="login-main">
        <div className="login-card">
          <p className="t-eyebrow">Welcome back</p>
          <h1 style={{ marginTop: 16 }}>Sign in to Tanat.</h1>
          <p>
            We use a one-time code. No password to forget, no wallet seed phrase
            to paste. Ever.
          </p>

          {step === 'email' ? (
            <form className="login-form" onSubmit={(event) => void sendCode(event)}>
              <label htmlFor="login-email">Work email</label>
              <input
                id="login-email"
                className="start-input"
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoFocus
              />
              <button className="t-btn t-btn-lime" type="submit" disabled={busy}>
                {busy ? 'Sending…' : 'Email me a code'}
                {!busy && <ArrowIcon />}
              </button>
            </form>
          ) : (
            <form className="login-form" onSubmit={(event) => void verify(event)}>
              <label htmlFor="login-code">Six-digit code</label>
              <input
                id="login-code"
                className="start-input"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                placeholder="123456"
                value={code}
                onChange={(event) =>
                  setCode(event.target.value.replace(/\D/g, '').slice(0, 6))
                }
                required
                autoFocus
              />
              <button
                className="t-btn t-btn-lime"
                type="submit"
                disabled={busy || code.length !== 6}
              >
                {busy ? 'Verifying…' : 'Open my workspace'}
                {!busy && <ArrowIcon />}
              </button>
              <button
                className="start-back"
                type="button"
                onClick={() => {
                  setStep('email');
                  setCode('');
                  setNotice(null);
                  setError(null);
                }}
              >
                Use a different email
              </button>
            </form>
          )}

          {notice && <div className="login-msg success">{notice}</div>}
          {error && <div className="login-msg error">{error}</div>}

          <p className="login-alt">
            New here? <Link href="/start">Create a workspace</Link>
          </p>
          <p className="login-alt" style={{ marginTop: 8 }}>
            Never enter a wallet seed phrase or private key on this page.
          </p>
        </div>
      </main>
    </div>
  );
}
