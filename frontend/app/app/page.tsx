'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ApiError,
  API_URL,
  getStoredKey,
  getTenant,
  listActions,
  revokeDashboardSession,
} from '@/lib/api';
import type { Tenant } from '@/lib/types';
import { Logo } from '@/components/brand/Logo';
import Chat from '@/components/Chat';
import ActionsList from '@/components/ActionsList';
import Settings from '@/components/Settings';

type View = 'chat' | 'actions' | 'settings';

export default function Dashboard() {
  const router = useRouter();
  const [booting, setBooting] = useState(true);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [view, setView] = useState<View>('chat');
  const [pendingActions, setPendingActions] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [keyHint, setKeyHint] = useState('');

  const loadTenant = useCallback(async () => {
    setError(null);
    try {
      const loaded = await getTenant();
      setTenant(loaded);
      const key = getStoredKey();
      setKeyHint(key ? `${key.slice(0, 9)}…${key.slice(-4)}` : '');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not connect.');
    } finally {
      setBooting(false);
    }
  }, []);

  useEffect(() => {
    if (!getStoredKey()) {
      router.replace('/login');
      return;
    }
    void loadTenant();
  }, [loadTenant, router]);

  const refreshPending = useCallback(async () => {
    if (!tenant) return;
    try {
      const result = await listActions('pending');
      setPendingActions(result.meta.total);
    } catch {
      // The badge is cosmetic; the approvals page reports real errors.
    }
  }, [tenant]);

  useEffect(() => {
    void refreshPending();
  }, [refreshPending, view]);

  async function signOut() {
    await revokeDashboardSession();
    router.replace('/login');
  }

  if (booting) {
    return (
      <div className="dash-boot">
        <div className="spinner" />
        <span>Loading your workspace…</span>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="dash-boot">
        <Logo size={34} />
        <h1>We could not open this workspace.</h1>
        <p>{error ?? 'Your session may have expired.'}</p>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link className="btn btn-primary" href="/login">
            Sign in again
          </Link>
          <Link className="btn" href="/">
            Back to site
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-left">
          <Link href="/" aria-label="Tanat home">
            <Logo size={26} />
          </Link>
          <span className="topbar-divider" />
          <span className="topbar-tenant">{tenant.name}</span>
          <span className="topbar-key" title="Dashboard session">
            {keyHint}
          </span>
        </div>

        <nav className="nav-tabs" aria-label="Dashboard">
          <button
            className={`nav-tab ${view === 'chat' ? 'active' : ''}`}
            onClick={() => setView('chat')}
          >
            Chat
          </button>
          <button
            className={`nav-tab ${view === 'actions' ? 'active' : ''}`}
            onClick={() => setView('actions')}
          >
            Approvals
            {pendingActions > 0 && (
              <span className="badge-count">{pendingActions}</span>
            )}
          </button>
          <button
            className={`nav-tab ${view === 'settings' ? 'active' : ''}`}
            onClick={() => setView('settings')}
          >
            Settings
          </button>
        </nav>

        <div className="topbar-right">
          <span className="mode-pill">
            <span className="mode-dot" />
            Test mode
          </span>
          <button className="btn btn-sm" onClick={() => void signOut()}>
            Sign out
          </button>
        </div>
      </header>

      {error && <div className="error-banner">{error}</div>}

      <main className="main-content">
        {view === 'chat' && (
          <Chat
            tenantName={tenant.name}
            onActionsChanged={() => void refreshPending()}
          />
        )}
        {view === 'actions' && (
          <ActionsList onActionsChanged={() => void refreshPending()} />
        )}
        {view === 'settings' && <Settings />}
      </main>

      <footer className="statusbar">
        <span className="status-dot" />
        <span>
          Connected as <strong>{tenant.name}</strong>
        </span>
        <span className="status-sep">|</span>
        <span className="near-badge">Test mode · no real money moves</span>
        <span className="status-sep">|</span>
        <span className="mono">{API_URL}</span>
      </footer>
    </div>
  );
}
