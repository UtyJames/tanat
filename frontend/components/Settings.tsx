'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  ApiError,
  createKey,
  getNearBalance,
  getTenant,
  listAgents,
  listKeys,
  revokeKey,
  updateTenant,
} from '@/lib/api';
import type { Agent, ApiKey, CreatedApiKey, NearBalance, Tenant } from '@/lib/types';

const AVAILABLE_SCOPES = [
  'read',
  'write',
  'sessions',
  'actions:read',
  'actions:propose',
  'actions:approve',
  'actions:execute',
  'admin',
] as const;

export default function Settings() {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [balance, setBalance] = useState<NearBalance | null>(null);
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [keysBlocked, setKeysBlocked] = useState(false);

  const [tenantName, setTenantName] = useState('');
  const [saving, setSaving] = useState(false);

  const [keyName, setKeyName] = useState('');
  const [keyScopes, setKeyScopes] = useState<string[]>([
    'read',
    'sessions',
    'actions:read',
    'actions:propose',
  ]);
  const [createdKey, setCreatedKey] = useState<CreatedApiKey | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [tenantResult, balanceResult, agentsResult, keysResult] =
      await Promise.allSettled([
        getTenant(),
        getNearBalance(),
        listAgents(),
        listKeys(),
      ]);

    if (tenantResult.status === 'fulfilled') {
      setTenant(tenantResult.value);
      setTenantName(tenantResult.value.name);
    } else {
      setError(
        tenantResult.reason instanceof ApiError
          ? tenantResult.reason.message
          : 'Could not load the tenant.',
      );
    }

    if (balanceResult.status === 'fulfilled') setBalance(balanceResult.value);

    if (agentsResult.status === 'fulfilled') setAgents(agentsResult.value.data);

    if (keysResult.status === 'fulfilled') {
      setKeys(keysResult.value);
      setKeysBlocked(false);
    } else if (
      keysResult.reason instanceof ApiError &&
      keysResult.reason.status === 403
    ) {
      setKeysBlocked(true);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveTenant() {
    if (!tenant) return;
    const name = tenantName.trim();
    if (!name) {
      setError('Tenant name cannot be empty.');
      return;
    }

    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const updated = await updateTenant(tenant.id, { name });
      setTenant(updated);
      setTenantName(updated.name);
      setNotice('Tenant name saved.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save settings.');
    } finally {
      setSaving(false);
    }
  }

  async function addKey() {
    const name = keyName.trim();
    if (!name || keyScopes.length === 0) return;

    setError(null);
    setNotice(null);
    try {
      const created = await createKey({ name, scopes: keyScopes });
      setCreatedKey(created);
      setKeyName('');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create the key.');
    }
  }

  async function removeKey(keyId: string) {
    setError(null);
    setNotice(null);
    try {
      await revokeKey(keyId);
      setKeys((previous) => previous.filter((key) => key.id !== keyId));
      setNotice('API key revoked.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not revoke the key.');
    }
  }

  if (loading) {
    return (
      <div className="settings-container loading-state">
        <div className="spinner" />
        Loading settings…
      </div>
    );
  }

  const limit = Number(tenant?.spending_limit_near ?? '0');
  const spent = Number(tenant?.total_spent_near ?? '0');
  const remaining = Math.max(0, limit - spent);

  return (
    <div className="settings-container">
      {error && <div className="error-banner">{error}</div>}
      {notice && <div className="success-banner">{notice}</div>}

      <section className="settings-section">
        <h2>Tenant</h2>
        <div className="field-row" style={{ marginBottom: 16 }}>
          <div className="field">
            <label htmlFor="tenant-name">Display name</label>
            <input
              id="tenant-name"
              className="input"
              value={tenantName}
              onChange={(event) => setTenantName(event.target.value)}
              placeholder="Acme Corporation"
            />
          </div>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => void saveTenant()}
            disabled={saving || tenantName.trim() === (tenant?.name ?? '')}
          >
            {saving ? 'Saving…' : 'Save name'}
          </button>
        </div>
        <div className="info-grid">
          <div className="info-item">
            <label>Slug</label>
            <code>{tenant?.slug ?? '—'}</code>
          </div>
          <div className="info-item">
            <label>Tenant ID</label>
            <code>{tenant?.id ?? '—'}</code>
          </div>
          <div className="info-item">
            <label>Status</label>
            <span>{tenant?.status ?? '—'}</span>
          </div>
        </div>
      </section>

      <section className="settings-section">
        <h2>
          <span className="near-icon">Ⓝ</span> NEAR wallet
        </h2>
        <div className="info-grid">
          <div className="info-item">
            <label>Account ID</label>
            <code className="near-account">{balance?.account_id ?? '—'}</code>
          </div>
          <div className="info-item">
            <label>Available</label>
            <span className="near-amount">{balance?.available ?? '—'} NEAR</span>
          </div>
          <div className="info-item">
            <label>Staked</label>
            <span>{balance?.staked ?? '—'} NEAR</span>
          </div>
          <div className="info-item">
            <label>Total</label>
            <span className="near-amount">{balance?.total ?? '—'} NEAR</span>
          </div>
        </div>
      </section>

      <section className="settings-section">
        <h2>Spending controls</h2>
        <div className="info-grid" style={{ marginBottom: 16 }}>
          <div className="info-item">
            <label>Limit</label>
            <span className="near-amount">{tenant?.spending_limit_near ?? '—'} NEAR</span>
          </div>
          <div className="info-item">
            <label>Spent</label>
            <span>{tenant?.total_spent_near ?? '—'} NEAR</span>
          </div>
          <div className="info-item">
            <label>Remaining</label>
            <span className="near-amount">{remaining} NEAR</span>
          </div>
        </div>

        <p className="muted">
          The spending limit and the NEAR account are operator-controlled. A
          tenant key can never raise its own limit or redirect funds. Contact
          Tanat support to change them.
        </p>
      </section>

      <section className="settings-section">
        <h2>Agents</h2>
        {agents.length === 0 ? (
          <p className="muted">No agents yet.</p>
        ) : (
          <div className="keys-list">
            {agents.map((agent) => (
              <div key={agent.id} className="key-row">
                <div className="key-info">
                  <span className="key-name">{agent.name}</span>
                  <code className="key-prefix">{agent.slug}</code>
                  <span className="key-scope">
                    {agent.model} · max {agent.max_tokens} tokens
                  </span>
                </div>
                <span className="status-pill status-approved">{agent.status}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="settings-section">
        <h2>API keys</h2>

        {keysBlocked ? (
          <p className="muted">
            This key does not have the <code>admin</code> scope, so it cannot
            manage API keys.
          </p>
        ) : (
          <>
            {createdKey && (
              <div className="key-created-banner">
                <p>
                  <strong>Copy this key now.</strong> It will not be shown again.
                </p>
                <code className="key-value">{createdKey.key}</code>
                <button
                  className="btn btn-sm"
                  onClick={() => void navigator.clipboard.writeText(createdKey.key)}
                >
                  Copy
                </button>
                <button className="btn btn-sm" onClick={() => setCreatedKey(null)}>
                  Dismiss
                </button>
              </div>
            )}

            <div className="field-row">
              <div className="field">
                <label htmlFor="key-name">Key name</label>
                <input
                  id="key-name"
                  className="input"
                  value={keyName}
                  onChange={(event) => setKeyName(event.target.value)}
                  placeholder="production"
                />
              </div>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => void addKey()}
                disabled={!keyName.trim() || keyScopes.length === 0}
              >
                Create key
              </button>
            </div>

            <div className="key-scope" style={{ marginBottom: 16 }}>
              {AVAILABLE_SCOPES.map((scope) => (
                <label key={scope} style={{ marginRight: 12, textTransform: 'none' }}>
                  <input
                    type="checkbox"
                    checked={keyScopes.includes(scope)}
                    onChange={(event) => {
                      setKeyScopes((previous) =>
                        event.target.checked
                          ? [...previous, scope]
                          : previous.filter((item) => item !== scope),
                      );
                    }}
                  />{' '}
                  {scope}
                </label>
              ))}
            </div>

            {keys.length === 0 ? (
              <p className="muted">No API keys yet.</p>
            ) : (
              <div className="keys-list">
                {keys.map((key) => (
                  <div key={key.id} className="key-row">
                    <div className="key-info">
                      <span className="key-name">{key.name}</span>
                      <code className="key-prefix">{key.key_prefix}…</code>
                      <span className="key-date">
                        Created {new Date(key.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => void removeKey(key.id)}
                    >
                      Revoke
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
