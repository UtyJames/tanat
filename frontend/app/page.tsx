'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  ApiError,
  API_URL,
  getStoredKey,
  getTenant,
  listActions,
  revokeDashboardSession,
  storeKey,
} from '@/lib/api';
import type { Tenant } from '@/lib/types';
import KeyGate from '@/components/KeyGate';
import Chat from '@/components/Chat';
import ActionsList from '@/components/ActionsList';
import Settings from '@/components/Settings';

type View = 'chat' | 'actions' | 'settings';

export default function Home() {
  const [booting, setBooting] = useState(true);
  const [ready, setReady] = useState(false);
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
      setReady(true);
      const key = getStoredKey();
      setKeyHint(key ? `${key.slice(0, 12)}…${key.slice(-4)}` : '');
    } catch (err) {
      storeKey('');
      setReady(false);
      setTenant(null);
      setError(err instanceof ApiError ? err.message : 'Could not connect.');
    }
  }, []);

  useEffect(() => {
    const stored = getStoredKey();
    if (!stored) {
      setBooting(false);
      return;
    }
    void loadTenant().finally(() => setBooting(false));
  }, [loadTenant]);

  const refreshPending = useCallback(async () => {
    if (!ready) return;
    try {
      const result = await listActions('pending');
      setPendingActions(result.meta.total);
    } catch {
      // The badge is cosmetic; the actions page reports real errors.
    }
  }, [ready]);

  useEffect(() => {
    void refreshPending();
  }, [refreshPending, view]);

  async function signOut() {
    await revokeDashboardSession();
    setReady(false);
    setTenant(null);
    setKeyHint('');
    setPendingActions(0);
    setView('chat');
  }

  if (booting) {
    return (
      <div className="key-gate">
        <div className="spinner" />
      </div>
    );
  }

  if (!ready) {
    return <KeyGate onReady={loadTenant} />;
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-left">
          <div className="logo">
            <span className="logo-icon">◈</span>
            <span className="logo-text">Tanat</span>
          </div>
          <span className="topbar-key">{tenant?.name ?? 'Tenant'}</span>
          <span className="topbar-key">{keyHint}</span>
        </div>

        <nav className="nav-tabs">
          <button
            className={`nav-tab ${view === 'chat' ? 'active' : ''}`}
            onClick={() => setView('chat')}
          >
            💬 Chat
          </button>
          <button
            className={`nav-tab ${view === 'actions' ? 'active' : ''}`}
            onClick={() => setView('actions')}
          >
            ⚡ Actions
            {pendingActions > 0 && (
              <span className="badge-count">{pendingActions}</span>
            )}
          </button>
          <button
            className={`nav-tab ${view === 'settings' ? 'active' : ''}`}
            onClick={() => setView('settings')}
          >
            ⚙️ Settings
          </button>
        </nav>

        <div className="topbar-right">
          <button className="btn btn-sm" onClick={() => void signOut()}>
            Sign out
          </button>
        </div>
      </header>

      {error && <div className="error-banner">{error}</div>}

      <main className="main-content">
        {view === 'chat' && (
          <Chat
            tenantName={tenant?.name ?? 'tenant'}
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
          Connected to <strong>{tenant?.name ?? 'tenant'}</strong>
        </span>
        <span className="status-sep">|</span>
        <span className="near-badge">Payments disabled · preview only</span>
        <span className="status-sep">|</span>
        <span>{API_URL}</span>
      </footer>
    </div>
  );
}
