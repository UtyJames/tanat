'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  ApiError,
  exportWorkspaceData,
  getPrivacyStatus,
  listDashboardSessions,
  listPrivacyAuditLogs,
  listSecurityAlerts,
  requestWorkspaceDeletion,
  resolveSecurityAlert,
  revokePrivacySession,
  rotateTenantEncryptionKey,
  updatePrivacySettings,
  type PrivacyStatus,
} from '@/lib/api';

type PrivacyTab = 'protection' | 'access' | 'audit' | 'ai' | 'data' | 'alerts';

export function PrivacyCentre() {
  const [tab, setTab] = useState<PrivacyTab>('protection');
  const [status, setStatus] = useState<PrivacyStatus | null>(null);
  const [logs, setLogs] = useState<Array<Record<string, unknown>>>([]);
  const [alerts, setAlerts] = useState<Array<Record<string, unknown>>>([]);
  const [sessions, setSessions] = useState<Array<Record<string, unknown>>>([]);
  const [retentionDays, setRetentionDays] = useState(90);
  const [requireTee, setRequireTee] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const s = await getPrivacyStatus();
      setStatus(s);
      setRetentionDays(s.data_protection.retention_days);
      setRequireTee(s.ai_privacy.requireTee);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load Privacy Centre status.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function loadTabDetails(next: PrivacyTab) {
    setTab(next);
    setNotice(null);
    setError(null);
    try {
      if (next === 'audit') {
        setLogs(await listPrivacyAuditLogs(50));
      } else if (next === 'alerts') {
        setAlerts(await listSecurityAlerts());
      } else if (next === 'access') {
        setSessions(await listDashboardSessions());
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Permission required to view this section.');
    }
  }

  async function handleRotateKey() {
    setBusy(true);
    setError(null);
    try {
      const res = await rotateTenantEncryptionKey();
      setNotice(`Rotated tenant encryption key to v${res.version} (${res.id}).`);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Key rotation failed.');
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveSettings() {
    setBusy(true);
    setError(null);
    try {
      await updatePrivacySettings({ retention_days: retentionDays, require_tee: requireTee });
      setNotice('Privacy & AI inference settings saved.');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update settings.');
    } finally {
      setBusy(false);
    }
  }

  async function handleExport() {
    setBusy(true);
    setError(null);
    try {
      const payload = await exportWorkspaceData();
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tanat-workspace-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setNotice('Encrypted workspace data decrypted and exported (logged in Audit Log).');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Export failed.');
    } finally {
      setBusy(false);
    }
  }

  async function handleDeletionRequest() {
    setBusy(true);
    setError(null);
    try {
      const res = await requestWorkspaceDeletion();
      setNotice(`Deletion scheduled for ${res.deletion_scheduled_for}.`);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not submit deletion request.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="ws-page">
      <div className="ws-head">
        <div>
          <span className="ws-eyebrow">Privacy & Security Centre</span>
          <h2>Data Protection, Access Control & AI Trust</h2>
          <p className="ws-sub">
            Real-time cryptographic key status, role-based access, audit trail, and verified AI boundaries.
          </p>
        </div>
        <button className="btn-secondary" onClick={() => void load()} disabled={busy}>
          Refresh Status
        </button>
      </div>

      {notice && (
        <div className="ws-card" style={{ borderColor: 'var(--accent)', marginBottom: 14 }}>
          <strong>{notice}</strong>
        </div>
      )}
      {error && (
        <div className="ws-card" style={{ borderColor: '#dc2626', color: '#b91c1c', marginBottom: 14 }}>
          <strong>{error}</strong>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {(
          [
            ['protection', '1. Data Protection'],
            ['access', '2. Access Control'],
            ['audit', '3. Audit Logs'],
            ['ai', '4. AI Privacy'],
            ['data', '5. Data Management'],
            ['alerts', `6. Security Events (${status?.security_events.open_alerts_count ?? 0})`],
          ] as Array<[PrivacyTab, string]>
        ).map(([id, label]) => (
          <button
            key={id}
            className={tab === id ? 'btn-primary' : 'btn-secondary'}
            onClick={() => void loadTabDetails(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {status && tab === 'protection' && (
        <div className="ws-grid-2">
          <div className="ws-card">
            <h3>Envelope Encryption</h3>
            <p className="ws-sub">
              Status: <strong>{status.data_protection.encryption_enabled ? 'Active' : 'Inactive'}</strong> ({status.data_protection.algorithm})
            </p>
            <p className="ws-sub">Format: <code>{status.data_protection.envelope_format}</code></p>
            <p className="ws-sub">
              KMS Provider: <code>{status.data_protection.kms.provider}</code> ({status.data_protection.kms.key_id})
              {status.data_protection.kms.local_dev_mode ? ' · Local Dev Mode' : ''}
            </p>
            <p className="ws-sub" style={{ marginTop: 8 }}>
              <strong>Trust boundary:</strong> {status.data_protection.operator_trust_boundary}
            </p>
          </div>

          <div className="ws-card">
            <h3>Tenant Encryption Key (DEK)</h3>
            {status.data_protection.active_key ? (
              <>
                <p className="ws-sub">
                  Active Key: <code>{status.data_protection.active_key.id}</code> (v{status.data_protection.active_key.version})
                </p>
                <p className="ws-sub">Created: {status.data_protection.active_key.created_at}</p>
              </>
            ) : (
              <p className="ws-sub">Provisioning active key...</p>
            )}
            <div style={{ marginTop: 12 }}>
              <button className="btn-primary" onClick={() => void handleRotateKey()} disabled={busy}>
                Rotate Encryption Key
              </button>
            </div>
            <p className="ws-sub" style={{ marginTop: 10 }}>
              Encrypted fields: {status.data_protection.encrypted_fields.join(', ')}
            </p>
          </div>
        </div>
      )}

      {status && tab === 'access' && (
        <div className="ws-card">
          <h3>Access Control & Active Sessions</h3>
          <p className="ws-sub">
            Your Role: <strong>{status.access_control.current_role}</strong> · Scopes:{' '}
            <code>{status.access_control.current_scopes.join(', ') || 'none'}</code>
          </p>
          <p className="ws-sub">
            Members: {status.access_control.members_count} · Active Dashboard Sessions:{' '}
            {status.access_control.active_sessions_count} · Active API Keys:{' '}
            {status.access_control.active_api_keys_count}
          </p>
          <div style={{ marginTop: 12 }}>
            {sessions.map((s) => (
              <div
                key={String(s.id)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 0',
                  borderBottom: '1px solid var(--border)',
                }}
              >
                <div>
                  <strong>{String(s.email)}</strong> · <code>{String(s.id)}</code>
                  <div className="ws-sub">Expires: {String(s.expires_at)}</div>
                </div>
                {!s.revoked_at ? (
                  <button
                    className="btn-secondary"
                    onClick={async () => {
                      await revokePrivacySession(String(s.id));
                      setSessions(await listDashboardSessions());
                    }}
                  >
                    Revoke
                  </button>
                ) : (
                  <span className="ws-sub">Revoked</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'audit' && (
        <div className="ws-card">
          <h3>Security Audit Log</h3>
          {logs.length === 0 ? (
            <p className="ws-sub">No audit events found.</p>
          ) : (
            logs.map((log) => (
              <div
                key={String(log.id)}
                style={{ padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}
              >
                <strong>{String(log.action)}</strong> · {String(log.resource_type)}:{' '}
                <code>{String(log.resource_id)}</code> · Actor: <code>{String(log.actor)}</code>
                <div className="ws-sub">{String(log.created_at)}</div>
              </div>
            ))
          )}
        </div>
      )}

      {status && tab === 'ai' && (
        <div className="ws-card">
          <h3>AI Privacy & Confidential Inference</h3>
          <p className="ws-sub">Provider: <strong>{status.ai_privacy.provider}</strong></p>
          <p className="ws-sub">Default Model: <code>{status.ai_privacy.defaultModel}</code></p>
          <p className="ws-sub">
            Per-Request Cryptographic Quote Verification:{' '}
            <strong>{status.ai_privacy.perRequestQuoteVerification ? 'Verified' : 'Not yet exposed by provider'}</strong>
          </p>
          <p className="ws-sub" style={{ marginTop: 8 }}>{status.ai_privacy.trustBoundarySummary}</p>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14 }}>
            <input
              type="checkbox"
              checked={requireTee}
              onChange={(e) => setRequireTee(e.target.checked)}
            />
            <span>Require TEE-tier models only (fail closed if non-TEE model selected)</span>
          </label>
          <div style={{ marginTop: 12 }}>
            <button className="btn-primary" onClick={() => void handleSaveSettings()} disabled={busy}>
              Save AI Privacy Policy
            </button>
          </div>
        </div>
      )}

      {status && tab === 'data' && (
        <div className="ws-grid-2">
          <div className="ws-card">
            <h3>Retention Policy</h3>
            <label style={{ display: 'block', marginBottom: 6 }}>RETENTION WINDOW (DAYS)</label>
            <input
              type="number"
              min={7}
              max={3650}
              className="input"
              value={retentionDays}
              onChange={(e) => setRetentionDays(Number(e.target.value) || 90)}
            />
            <div style={{ marginTop: 12 }}>
              <button className="btn-primary" onClick={() => void handleSaveSettings()} disabled={busy}>
                Update Retention
              </button>
            </div>
          </div>

          <div className="ws-card">
            <h3>Data Export & Deletion</h3>
            <p className="ws-sub">
              Export decrypts your tenant-scoped records with an audit trail and security alert.
            </p>
            <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
              <button className="btn-secondary" onClick={() => void handleExport()} disabled={busy}>
                Export Workspace JSON
              </button>
              <button className="btn-secondary" onClick={() => void handleDeletionRequest()} disabled={busy}>
                Request Workspace Deletion
              </button>
            </div>
            {status.data_protection.deletion_scheduled_for && (
              <p className="ws-sub" style={{ marginTop: 10, color: '#b91c1c' }}>
                Deletion scheduled for {status.data_protection.deletion_scheduled_for}
              </p>
            )}
          </div>
        </div>
      )}

      {tab === 'alerts' && (
        <div className="ws-card">
          <h3>Security Alerts</h3>
          {alerts.length === 0 ? (
            <p className="ws-sub">No security alerts recorded.</p>
          ) : (
            alerts.map((a) => (
              <div
                key={String(a.id)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 0',
                  borderBottom: '1px solid var(--border)',
                }}
              >
                <div>
                  <strong>[{String(a.severity).toUpperCase()}]</strong> {String(a.title)}
                  <div className="ws-sub">
                    {String(a.category)} · {String(a.created_at)} · Status: {String(a.status)}
                  </div>
                </div>
                {a.status === 'open' && (
                  <button
                    className="btn-secondary"
                    onClick={async () => {
                      await resolveSecurityAlert(String(a.id));
                      setAlerts(await listSecurityAlerts());
                      await load();
                    }}
                  >
                    Resolve
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
