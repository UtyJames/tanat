'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  ApiError,
  approveAction,
  executeAction,
  listActions,
  rejectAction,
} from '@/lib/api';
import type { Action, ActionStatus, ActionView } from '@/lib/types';

interface Props {
  onActionsChanged?: () => void;
}

const FILTERS: Array<ActionStatus | 'all'> = [
  'all',
  'pending',
  'approved',
  'rejected',
  'executed',
  'failed',
  'expired',
];

const RISK_COLORS: Record<string, string> = {
  low: 'var(--success)',
  medium: 'var(--warning)',
  high: '#f97316',
  critical: 'var(--critical)',
};

function toView(action: Action): ActionView {
  let params: Record<string, unknown> = {};
  let execution: Record<string, unknown> | null = null;

  try {
    params = action.params ? JSON.parse(action.params) : {};
  } catch {
    params = {};
  }
  try {
    execution = action.execution_result ? JSON.parse(action.execution_result) : null;
  } catch {
    execution = null;
  }

  return {
    ...action,
    params,
    execution_result: execution,
    amount: typeof params.amount === 'string' ? params.amount : undefined,
    to_account: typeof params.to_account === 'string' ? params.to_account : undefined,
    tx_hash: typeof execution?.tx_hash === 'string' ? execution.tx_hash : undefined,
  };
}

export default function ActionsList({ onActionsChanged }: Props) {
  const [actions, setActions] = useState<ActionView[]>([]);
  const [filter, setFilter] = useState<ActionStatus | 'all'>('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listActions(filter === 'all' ? undefined : filter);
      setActions(result.data.map(toView));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load actions.');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  async function run(actionId: string, operation: () => Promise<unknown>) {
    setBusyId(actionId);
    setError(null);
    try {
      await operation();
      await load();
      onActionsChanged?.();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Action failed.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="actions-list-container">
      <div className="actions-header">
        <h2>Actions</h2>
        <div className="filter-bar">
          {FILTERS.map((status) => (
            <button
              key={status}
              className={`filter-chip ${filter === status ? 'active' : ''}`}
              onClick={() => setFilter(status)}
            >
              {status === 'all' ? 'All' : status}
            </button>
          ))}
          <button className="filter-chip" onClick={() => void load()}>
            ↻ Refresh
          </button>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {loading ? (
        <div className="loading-state">
          <div className="spinner" />
          Loading actions…
        </div>
      ) : actions.length === 0 ? (
        <div className="empty-state">
          <p>No actions found.</p>
        </div>
      ) : (
        <div className="actions-table">
          <div className="actions-table-header">
            <span>Description</span>
            <span>Type</span>
            <span>Risk</span>
            <span>Status</span>
            <span>Created</span>
          </div>

          {actions.map((action) => (
            <div key={action.id} className="actions-table-row-wrap">
              <div
                className={`actions-table-row ${expanded === action.id ? 'expanded' : ''}`}
                onClick={() =>
                  setExpanded(expanded === action.id ? null : action.id)
                }
              >
                <span className="cell-desc">{action.description}</span>
                <span className="cell-type">{action.type.replace(/_/g, ' ')}</span>
                <span>
                  <span
                    className="risk-badge"
                    style={{ background: RISK_COLORS[action.risk_level] }}
                  >
                    {action.risk_level}
                  </span>
                </span>
                <span className={`status-pill status-${action.status}`}>
                  {action.status}
                </span>
                <span className="cell-date">
                  {new Date(action.created_at).toLocaleString()}
                </span>
              </div>

              {expanded === action.id && (
                <div className="actions-detail">
                  <div className="detail-grid">
                    <div>
                      <label>Action ID</label>
                      <code>{action.id}</code>
                    </div>
                    {action.amount && (
                      <div>
                        <label>Amount</label>
                        <span>
                          {action.amount} {String(action.params.currency ?? 'NEAR')}
                        </span>
                      </div>
                    )}
                    {action.to_account && (
                      <div>
                        <label>Recipient</label>
                        <code>{action.to_account}</code>
                      </div>
                    )}
                    <div>
                      <label>Expires</label>
                      <span>{new Date(action.expires_at).toLocaleString()}</span>
                    </div>
                    {action.approved_at && (
                      <div>
                        <label>Approved</label>
                        <span>{new Date(action.approved_at).toLocaleString()}</span>
                      </div>
                    )}
                    {action.executed_at && (
                      <div>
                        <label>Executed</label>
                        <span>{new Date(action.executed_at).toLocaleString()}</span>
                      </div>
                    )}
                    {action.tx_hash && (
                      <div>
                        <label>Transaction</label>
                        <a
                          className="tx-link"
                          href={`https://testnet.nearblocks.io/txns/${action.tx_hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {action.tx_hash.slice(0, 20)}…
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="detail-actions">
                    {action.status === 'pending' && (
                      <>
                        <button
                          className="btn btn-success btn-sm"
                          disabled={busyId === action.id}
                          onClick={(event) => {
                            event.stopPropagation();
                            void run(action.id, () => approveAction(action.id));
                          }}
                        >
                          Approve
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          disabled={busyId === action.id}
                          onClick={(event) => {
                            event.stopPropagation();
                            void run(action.id, () => rejectAction(action.id));
                          }}
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {action.status === 'approved' && (
                      <button
                        className="btn btn-primary btn-sm"
                        disabled={busyId === action.id}
                        onClick={(event) => {
                          event.stopPropagation();
                          void run(action.id, () => executeAction(action.id));
                        }}
                      >
                        {busyId === action.id ? 'Executing…' : 'Execute'}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
