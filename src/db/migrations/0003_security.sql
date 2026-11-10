-- ============================================================================
-- Tanat — D1 Schema Migration 0003_security
--
-- Fixes from the Phase 0 independent security review:
--   H-01/H-02  atomic execution claim + persistent execution state
--   H-06       separation of duties (proposer, approvers, required approvals)
--   M-03       idempotency is scoped to a tenant, not global
-- ============================================================================

-- ----------------------------------------------------------------------------
-- ACTIONS — rebuild to add separation-of-duties columns and tenant-scoped
-- idempotency. SQLite cannot drop the old global UNIQUE constraint in place.
-- ----------------------------------------------------------------------------
CREATE TABLE actions_new (
    id                 TEXT PRIMARY KEY,
    session_id         TEXT NOT NULL,
    tenant_id          TEXT NOT NULL,
    message_id         TEXT,
    type               TEXT NOT NULL
                           CHECK (type IN ('near_transfer', 'near_function_call', 'refund', 'payment', 'custom')),
    description        TEXT NOT NULL,
    params             TEXT NOT NULL DEFAULT '{}',
    risk_level         TEXT NOT NULL DEFAULT 'medium'
                           CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    status             TEXT NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending', 'approved', 'rejected', 'executed', 'failed', 'expired')),
    proposed_by        TEXT,                    -- API key that proposed the action
    approved_by        TEXT,                    -- first approver
    second_approved_by TEXT,                    -- second approver for high/critical risk
    approvals          INTEGER NOT NULL DEFAULT 0,
    required_approvals INTEGER NOT NULL DEFAULT 1,
    approved_at        TEXT,
    executed_at        TEXT,
    execution_result   TEXT,
    idempotency_key    TEXT NOT NULL,
    expires_at         TEXT NOT NULL,
    created_at         TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at         TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (tenant_id, idempotency_key),
    FOREIGN KEY (session_id) REFERENCES sessions(id)  ON DELETE CASCADE,
    FOREIGN KEY (tenant_id)  REFERENCES tenants(id)   ON DELETE CASCADE,
    FOREIGN KEY (message_id) REFERENCES messages(id)  ON DELETE SET NULL
);

INSERT INTO actions_new (
    id, session_id, tenant_id, message_id, type, description, params,
    risk_level, status, proposed_by, approved_by, second_approved_by,
    approvals, required_approvals, approved_at, executed_at, execution_result,
    idempotency_key, expires_at, created_at, updated_at
)
SELECT
    id, session_id, tenant_id, message_id, type, description, params,
    risk_level, status, NULL, approved_by, NULL,
    CASE WHEN approved_by IS NULL THEN 0 ELSE 1 END,
    CASE WHEN risk_level IN ('high', 'critical') THEN 2 ELSE 1 END,
    approved_at, executed_at, execution_result,
    idempotency_key, expires_at, created_at, updated_at
FROM actions;

DROP TABLE actions;
ALTER TABLE actions_new RENAME TO actions;

CREATE INDEX IF NOT EXISTS idx_actions_session_id        ON actions(session_id);
CREATE INDEX IF NOT EXISTS idx_actions_tenant_id         ON actions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_actions_message_id        ON actions(message_id);
CREATE INDEX IF NOT EXISTS idx_actions_tenant_idem       ON actions(tenant_id, idempotency_key);
CREATE INDEX IF NOT EXISTS idx_actions_status_tenant     ON actions(status, tenant_id);

-- ----------------------------------------------------------------------------
-- ACTION_CLAIMS — one row per action, created atomically before any money
-- moves. The primary key is the mutex: only the request that inserts the row
-- may proceed. State is persisted before and after the transfer so a crash
-- cannot silently release a reservation or mark a sent payment as failed.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS action_claims (
    action_id       TEXT PRIMARY KEY,
    tenant_id       TEXT NOT NULL,
    state           TEXT NOT NULL DEFAULT 'executing'
                        CHECK (state IN ('executing', 'sending', 'sent', 'completed', 'failed', 'unknown')),
    amount_yocto    TEXT NOT NULL DEFAULT '0',
    idempotency_key TEXT NOT NULL UNIQUE,
    reserved        INTEGER NOT NULL DEFAULT 0,
    -- M-13: identifies the request that owns this attempt. A retake rotates the
    -- token, so a stalled older attempt can never transition the claim or send.
    attempt_token   TEXT NOT NULL,
    tx_hash         TEXT,
    last_error      TEXT,
    claimed_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (action_id) REFERENCES actions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_action_claims_state  ON action_claims(state);
CREATE INDEX IF NOT EXISTS idx_action_claims_tenant ON action_claims(tenant_id);
