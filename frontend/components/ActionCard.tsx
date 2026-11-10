'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  ApiError,
  approveAction,
  executeAction,
  rejectAction,
} from '@/lib/api';
import type { ActionStatus, ProposedAction } from '@/lib/types';

interface Props {
  action: ProposedAction;
  onChanged?: () => void;
}

const RISK_COLORS: Record<string, string> = {
  low: 'var(--success)',
  medium: 'var(--warning)',
  high: '#f97316',
  critical: 'var(--critical)',
};

const STATUS_LABELS: Record<ActionStatus, string> = {
  pending: 'Pending approval',
  approved: 'Approved',
  rejected: 'Rejected',
  executed: 'Executed',
  failed: 'Failed',
  expired: 'Expired',
};

export default function ActionCard({ action, onChanged }: Props) {
  const [status, setStatus] = useState<ActionStatus>(action.status);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [remaining, setRemaining] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status !== 'pending' && status !== 'approved') return;

    function tick() {
      const diff = new Date(action.expires_at).getTime() - Date.now();
      if (diff <= 0) {
        setStatus('expired');
        setRemaining('Expired');
        return;
      }
      const minutes = Math.floor(diff / 60_000);
      const seconds = Math.floor((diff % 60_000) / 1000);
      setRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    }

    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [action.expires_at, status]);

  const run = useCallback(
    async (operation: () => Promise<unknown>, next: ActionStatus) => {
      setBusy(true);
      setError(null);
      try {
        const result = (await operation()) as {
          status?: ActionStatus;
          execution_result?: string | null;
        };
        // A high-risk action stays pending until the second approver signs.
        setStatus(result?.status ?? next);
        if (result?.execution_result) {
          try {
            const parsed = JSON.parse(result.execution_result);
            if (typeof parsed?.tx_hash === 'string') setTxHash(parsed.tx_hash);
          } catch {
            // Execution result is optional display data.
          }
        }
        onChanged?.();
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Action failed');
      } finally {
        setBusy(false);
      }
    },
    [onChanged],
  );

  return (
    <div className={`action-card status-${status}`}>
      <div className="action-card-header">
        <span className="action-type">{action.type.replace(/_/g, ' ')}</span>
        <span
          className="risk-badge"
          style={{ background: RISK_COLORS[action.risk_level] }}
        >
          {action.risk_level}
        </span>
      </div>

      <p className="action-desc">{action.description}</p>

      {action.amount && (
        <div className="action-amount">
          <span className="amount-value">{action.amount}</span>
          <span className="amount-currency">{action.currency ?? 'NEAR'}</span>
        </div>
      )}

      <div className="action-card-footer">
        <span className={`action-status status-${status}`}>
          {STATUS_LABELS[status]}
        </span>
        {(status === 'pending' || status === 'approved') && remaining && (
          <span className="action-expiry">⏱ {remaining}</span>
        )}
      </div>

      <div className="action-buttons">
        {status === 'pending' && (
          <>
            <button
              className="btn btn-success btn-sm"
              disabled={busy}
              onClick={() => void run(() => approveAction(action.id), 'approved')}
            >
              ✓ Approve
            </button>
            <button
              className="btn btn-danger btn-sm"
              disabled={busy}
              onClick={() => void run(() => rejectAction(action.id), 'rejected')}
            >
              ✗ Reject
            </button>
          </>
        )}

        {status === 'approved' && (
          <button
            className="btn btn-primary btn-sm"
            disabled={busy}
            onClick={() => void run(() => executeAction(action.id), 'executed')}
          >
            {busy ? 'Executing…' : '▶ Execute'}
          </button>
        )}

        {status === 'executed' && txHash && (
          <a
            className="tx-link"
            href={`https://testnet.nearblocks.io/txns/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            View transaction: {txHash.slice(0, 16)}…
          </a>
        )}
      </div>

      {error && <div className="action-error">{error}</div>}
    </div>
  );
}
