-- ============================================================================
-- Tanat — D1 Schema Migration 0001_init
-- Multi-tenant AI agent platform schema
-- ============================================================================

-- ============================================================================
-- TENANTS — SaaS customer organizations
-- ============================================================================
CREATE TABLE IF NOT EXISTS tenants (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    slug        TEXT NOT NULL UNIQUE,
    status      TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'suspended', 'deleted')),
    settings    TEXT NOT NULL DEFAULT '{}',   -- JSON: spending limits, feature flags
    near_account_id   TEXT,                   -- NEAR wallet for this tenant
    spending_limit_near TEXT DEFAULT '0',     -- max NEAR spend (string for precision)
    total_spent_near    TEXT DEFAULT '0',
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================================
-- API_KEYS — Authentication keys scoped to tenants
-- ============================================================================
CREATE TABLE IF NOT EXISTS api_keys (
    id          TEXT PRIMARY KEY,
    tenant_id   TEXT NOT NULL,
    key_hash    TEXT NOT NULL UNIQUE,          -- SHA-256 hash; plaintext never stored
    key_prefix  TEXT NOT NULL,                 -- first 8 chars for human identification
    name        TEXT NOT NULL,
    scopes      TEXT NOT NULL DEFAULT '["read"]',  -- JSON array of permissions
    last_used_at TEXT,
    expires_at  TEXT,
    is_active   INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- ============================================================================
-- AGENTS — Versioned agent definitions
-- ============================================================================
CREATE TABLE IF NOT EXISTS agents (
    id          TEXT PRIMARY KEY,
    tenant_id   TEXT NOT NULL,
    name        TEXT NOT NULL,
    slug        TEXT NOT NULL,
    description TEXT,
    version     INTEGER NOT NULL DEFAULT 1,
    system_prompt TEXT NOT NULL,
    tools       TEXT NOT NULL DEFAULT '[]',    -- JSON array of tool definitions
    model       TEXT NOT NULL DEFAULT 'gpt-4o-mini',
    max_tokens  INTEGER NOT NULL DEFAULT 4096,
    temperature REAL NOT NULL DEFAULT 0.7,
    config      TEXT NOT NULL DEFAULT '{}',    -- JSON: tenant-specific settings
    status      TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'deprecated', 'archived')),
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (tenant_id, slug),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- ============================================================================
-- INSTALLATIONS — Agent installed into a tenant context
-- ============================================================================
CREATE TABLE IF NOT EXISTS installations (
    id          TEXT PRIMARY KEY,
    tenant_id   TEXT NOT NULL,
    agent_id    TEXT NOT NULL,
    config      TEXT NOT NULL DEFAULT '{}',    -- JSON: tenant-specific agent config
    status      TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'paused', 'removed')),
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (tenant_id, agent_id),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (agent_id)  REFERENCES agents(id)  ON DELETE CASCADE
);

-- ============================================================================
-- SESSIONS — Chat sessions
-- ============================================================================
CREATE TABLE IF NOT EXISTS sessions (
    id              TEXT PRIMARY KEY,
    installation_id TEXT NOT NULL,
    tenant_id       TEXT NOT NULL,            -- denormalized for tenant-isolation queries
    user_id         TEXT,                     -- external user identifier from the SaaS
    metadata        TEXT DEFAULT '{}',        -- JSON
    status          TEXT NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'closed', 'expired')),
    started_at      TEXT NOT NULL DEFAULT (datetime('now')),
    ended_at        TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (installation_id) REFERENCES installations(id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id)       REFERENCES tenants(id)       ON DELETE CASCADE
);

-- ============================================================================
-- MESSAGES — Chat messages within sessions
-- ============================================================================
CREATE TABLE IF NOT EXISTS messages (
    id           TEXT PRIMARY KEY,
    session_id   TEXT NOT NULL,
    tenant_id    TEXT NOT NULL,               -- denormalized for tenant-isolation queries
    role         TEXT NOT NULL
                    CHECK (role IN ('user', 'assistant', 'system', 'tool')),
    content      TEXT NOT NULL,
    tool_calls   TEXT,                        -- JSON: if assistant requested tool calls
    tool_call_id TEXT,                        -- if this is a tool response
    tokens_used  INTEGER DEFAULT 0,
    created_at   TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id)  REFERENCES tenants(id)  ON DELETE CASCADE
);

-- ============================================================================
-- ACTIONS — Proposed actions requiring approval (e.g. NEAR transfers)
-- ============================================================================
CREATE TABLE IF NOT EXISTS actions (
    id               TEXT PRIMARY KEY,
    session_id       TEXT NOT NULL,
    tenant_id        TEXT NOT NULL,
    message_id       TEXT,                    -- which message proposed this action
    type             TEXT NOT NULL
                        CHECK (type IN ('near_transfer', 'near_function_call', 'refund', 'payment', 'custom')),
    description      TEXT NOT NULL,           -- human-readable description
    params           TEXT NOT NULL DEFAULT '{}',  -- JSON: action-specific params (amount, recipient, etc.)
    risk_level       TEXT NOT NULL DEFAULT 'medium'
                        CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    status           TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'approved', 'rejected', 'executed', 'failed', 'expired')),
    approved_by      TEXT,                    -- who approved
    approved_at      TEXT,
    executed_at      TEXT,
    execution_result TEXT,                    -- JSON: tx hash, etc.
    idempotency_key  TEXT NOT NULL UNIQUE,    -- prevents double execution
    expires_at       TEXT NOT NULL,           -- actions expire if not approved
    created_at       TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at       TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (session_id) REFERENCES sessions(id)  ON DELETE CASCADE,
    FOREIGN KEY (tenant_id)  REFERENCES tenants(id)   ON DELETE CASCADE,
    FOREIGN KEY (message_id) REFERENCES messages(id)  ON DELETE SET NULL
);

-- ============================================================================
-- USAGE_RECORDS — Metering per tenant
-- ============================================================================
CREATE TABLE IF NOT EXISTS usage_records (
    id          TEXT PRIMARY KEY,
    tenant_id   TEXT NOT NULL,
    type        TEXT NOT NULL
                    CHECK (type IN ('api_call', 'tokens', 'near_transaction', 'action')),
    quantity    INTEGER NOT NULL DEFAULT 1,
    metadata    TEXT DEFAULT '{}',             -- JSON
    recorded_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- ============================================================================
-- AUDIT_LOG — Security audit trail (append-only by design)
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_log (
    id            TEXT PRIMARY KEY,
    tenant_id     TEXT NOT NULL,
    actor         TEXT NOT NULL,               -- api_key id, user id, or 'system'
    action        TEXT NOT NULL,               -- e.g. 'action.approved', 'near.transfer', 'tenant.updated'
    resource_type TEXT NOT NULL,
    resource_id   TEXT NOT NULL,
    details       TEXT DEFAULT '{}',           -- JSON
    ip_address    TEXT,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================================
-- INDEXES — Performance & isolation
-- ============================================================================

-- api_keys
CREATE INDEX IF NOT EXISTS idx_api_keys_tenant_id  ON api_keys(tenant_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash   ON api_keys(key_hash);

-- tenants
CREATE INDEX IF NOT EXISTS idx_tenants_slug        ON tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenants_status       ON tenants(status);

-- installations
CREATE INDEX IF NOT EXISTS idx_installations_tenant_id ON installations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_installations_agent_id  ON installations(agent_id);

-- agents
CREATE INDEX IF NOT EXISTS idx_agents_tenant_id    ON agents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_agents_tenant_slug  ON agents(tenant_id, slug);

-- sessions
CREATE INDEX IF NOT EXISTS idx_sessions_installation_id ON sessions(installation_id);
CREATE INDEX IF NOT EXISTS idx_sessions_tenant_id       ON sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status_tenant   ON sessions(status, tenant_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id         ON sessions(user_id);

-- messages
CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);
CREATE INDEX IF NOT EXISTS idx_messages_tenant_id  ON messages(tenant_id);

-- actions
CREATE INDEX IF NOT EXISTS idx_actions_session_id      ON actions(session_id);
CREATE INDEX IF NOT EXISTS idx_actions_tenant_id       ON actions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_actions_message_id      ON actions(message_id);
CREATE INDEX IF NOT EXISTS idx_actions_idempotency_key ON actions(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_actions_status_tenant   ON actions(status, tenant_id);

-- usage_records
CREATE INDEX IF NOT EXISTS idx_usage_records_tenant_id              ON usage_records(tenant_id);
CREATE INDEX IF NOT EXISTS idx_usage_records_tenant_type_recorded   ON usage_records(tenant_id, type, recorded_at);

-- audit_log
CREATE INDEX IF NOT EXISTS idx_audit_log_tenant_id          ON audit_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_tenant_created     ON audit_log(tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_action             ON audit_log(action);
