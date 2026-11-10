'use client';

import { useState } from 'react';
import {
  ApiError,
  getTenant,
  requestOtp,
  storeKey,
  verifyOtp,
} from '@/lib/api';

interface Props {
  onReady: () => void;
}

export default function KeyGate({ onReady }: Props) {
  const [email, setEmail] = useState('');
  const [tenantName, setTenantName] = useState('');
  const [code, setCode] = useState('');
  const [codeRequested, setCodeRequested] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  async function requestCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setChecking(true);

    try {
      await requestOtp({ email: email.trim(), tenant_name: tenantName.trim() });
      setCodeRequested(true);
      setNotice('Check your email for a 6-digit code. It expires in 10 minutes.');
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Could not send the verification code.',
      );
    } finally {
      setChecking(false);
    }
  }

  async function verifyCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setChecking(true);
    try {
      await verifyOtp(email.trim(), code.trim());
      await getTenant();
      onReady();
    } catch (err) {
      storeKey('');
      setError(
        err instanceof ApiError
          ? err.message
          : 'Could not verify this code.',
      );
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="key-gate">
      <div className="key-gate-card">
        <h1>
          <span className="logo-icon">◈</span> Tanat
        </h1>
        <p>
          Create a workspace or sign in with a one-time email code. Your
          dashboard login does not require an API key or wallet credentials.
        </p>

        {!codeRequested ? (
        <form className="key-gate-form" onSubmit={(event) => void requestCode(event)}>
          <label htmlFor="workspace-name">Business or workspace name</label>
          <input
            id="workspace-name"
            className="input"
            autoComplete="organization"
            maxLength={100}
            placeholder="Acme Store"
            value={tenantName}
            onChange={(event) => setTenantName(event.target.value)}
            required
          />
          <label htmlFor="account-email">Work email</label>
          <input
            id="account-email"
            className="input"
            type="email"
            autoComplete="email"
            maxLength={254}
            placeholder="you@company.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <button className="btn btn-primary" type="submit" disabled={checking}>
            {checking ? 'Sending…' : 'Email me a verification code'}
          </button>
        </form>
        ) : (
          <form className="key-gate-form" onSubmit={(event) => void verifyCode(event)}>
            <label htmlFor="verification-code">6-digit verification code</label>
            <input
              id="verification-code"
              className="input"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              placeholder="123456"
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
              required
            />
            <button className="btn btn-primary" type="submit" disabled={checking || code.length !== 6}>
              {checking ? 'Verifying…' : 'Verify and continue'}
            </button>
            <button
              className="btn btn-sm"
              type="button"
              disabled={checking}
              onClick={() => {
                setCodeRequested(false);
                setCode('');
                setNotice(null);
              }}
            >
              Use a different email
            </button>
          </form>
        )}

        {notice && <div className="success-banner">{notice}</div>}
        {error && <div className="error-banner">{error}</div>}
        <p className="muted">
          New email addresses create a workspace after verification. Existing
          users sign in to their workspace. Never enter a wallet seed phrase or
          private key here.
        </p>
      </div>
    </div>
  );
}
