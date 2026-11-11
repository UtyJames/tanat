-- ============================================================================
-- Tanat — 0007: onboarding, channels, publishable keys, knowledge, memory,
-- memberships, versions, integrations, and operational runs
-- ============================================================================

-- Publishable keys are safe to ship in a browser. They are still hashed at
-- rest, are bound to one installation, and only work from allowlisted origins.
CREATE TABLE IF NOT EXISTS publishable_keys (
    id              TEXT PRIMARY KEY,
    tenant_id       TEXT NOT NULL,
    installation_id TEXT,
    key_hash        TEXT NOT NULL UNIQUE,
    key_prefix      TEXT NOT NULL,
    name            TEXT NOT NULL,
    allowed_origins TEXT NOT NULL DEFAULT '[]', -- JSON array of origins
    is_active       INTEGER NOT NULL DEFAULT 1,
    last_used_at    TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (installation_id) REFERENCES installations(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_publishable_keys_tenant
    ON publishable_keys(tenant_id);
CREATE INDEX IF NOT EXISTS idx_publishable_keys_hash
    ON publishable_keys(key_hash);

-- A channel is a delivery surface for an installed agent. The agent brain is
-- shared; channel rows only hold transport-specific state.
CREATE TABLE IF NOT EXISTS agent_channels (
    id              TEXT PRIMARY KEY,
    tenant_id       TEXT NOT NULL,
    installation_id TEXT NOT NULL,
    channel         TEXT NOT NULL
                        CHECK (channel IN ('website', 'whatsapp', 'telegram', 'slack', 'teams', 'email', 'api')),
    status          TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('connected', 'pending', 'error', 'disabled')),
    config          TEXT NOT NULL DEFAULT '{}',
    last_seen_at    TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (installation_id, channel),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (installation_id) REFERENCES installations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_agent_channels_tenant
    ON agent_channels(tenant_id);
CREATE INDEX IF NOT EXISTS idx_agent_channels_installation
    ON agent_channels(installation_id);

-- Knowledge sources.
CREATE TABLE IF NOT EXISTS knowledge_sources (
    id          TEXT PRIMARY KEY,
    tenant_id   TEXT NOT NULL,
    agent_id    TEXT,
    kind        TEXT NOT NULL
                    CHECK (kind IN ('website', 'document', 'pdf', 'faq', 'text', 'catalog', 'policy')),
    label       TEXT NOT NULL,
    uri         TEXT,
    content     TEXT,
    status      TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'ready', 'failed', 'disabled')),
    error       TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_knowledge_sources_tenant
    ON knowledge_sources(tenant_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_sources_agent
    ON knowledge_sources(agent_id);

-- Workspace members & invitations.
CREATE TABLE IF NOT EXISTS workspace_members (
    id         TEXT PRIMARY KEY,
    tenant_id  TEXT NOT NULL,
    user_id    TEXT,
    email      TEXT NOT NULL,
    name       TEXT,
    role       TEXT NOT NULL DEFAULT 'owner'
                   CHECK (role IN ('owner', 'admin', 'operator', 'viewer')),
    status     TEXT NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active', 'invited', 'suspended')),
    invited_by TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (tenant_id, email),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_workspace_members_tenant
    ON workspace_members(tenant_id);

-- Immutable agent version history (Draft -> Testing -> Published -> Paused).
CREATE TABLE IF NOT EXISTS agent_versions (
    id               TEXT PRIMARY KEY,
    agent_id         TEXT NOT NULL,
    tenant_id        TEXT NOT NULL,
    version          INTEGER NOT NULL,
    lifecycle_status TEXT NOT NULL DEFAULT 'draft'
                         CHECK (lifecycle_status IN ('draft', 'testing', 'published', 'paused', 'error')),
    config_snapshot  TEXT NOT NULL DEFAULT '{}',
    notes            TEXT,
    published_by     TEXT,
    created_at       TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (agent_id)  REFERENCES agents(id)  ON DELETE CASCADE,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_agent_versions_agent
    ON agent_versions(agent_id, version DESC);

-- Cross-channel customer & employee memory scoped strictly by tenant.
CREATE TABLE IF NOT EXISTS customer_memories (
    id               TEXT PRIMARY KEY,
    tenant_id        TEXT NOT NULL,
    external_user_id TEXT,
    agent_id         TEXT,
    session_id       TEXT,
    memory_type      TEXT NOT NULL DEFAULT 'fact'
                         CHECK (memory_type IN ('fact', 'preference', 'summary', 'business_context', 'action_history')),
    fact             TEXT NOT NULL,
    created_at       TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_customer_memories_tenant
    ON customer_memories(tenant_id, external_user_id, created_at DESC);

-- Connected business system integrations.
CREATE TABLE IF NOT EXISTS tenant_integrations (
    id           TEXT PRIMARY KEY,
    tenant_id    TEXT NOT NULL,
    provider     TEXT NOT NULL,
    category     TEXT NOT NULL,
    name         TEXT NOT NULL,
    status       TEXT NOT NULL DEFAULT 'disconnected'
                     CHECK (status IN ('connected', 'disconnected', 'awaiting_auth', 'coming_soon', 'error')),
    config       TEXT NOT NULL DEFAULT '{}',
    permissions  TEXT NOT NULL DEFAULT '["read"]',
    connected_at TEXT,
    updated_at   TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (tenant_id, provider),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tenant_integrations_tenant
    ON tenant_integrations(tenant_id);

-- Operational execution runs log.
CREATE TABLE IF NOT EXISTS agent_runs (
    id            TEXT PRIMARY KEY,
    tenant_id     TEXT NOT NULL,
    agent_id      TEXT NOT NULL,
    session_id    TEXT,
    channel_type  TEXT NOT NULL DEFAULT 'dashboard',
    status        TEXT NOT NULL DEFAULT 'completed'
                      CHECK (status IN ('completed', 'awaiting_approval', 'escalated', 'failed')),
    duration_ms   INTEGER NOT NULL DEFAULT 0,
    model         TEXT,
    privacy_tier  TEXT,
    tokens_used   INTEGER NOT NULL DEFAULT 0,
    knowledge_ids TEXT NOT NULL DEFAULT '[]',
    tool_calls    TEXT NOT NULL DEFAULT '[]',
    summary       TEXT,
    error_message TEXT,
    created_at    TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_agent_runs_tenant
    ON agent_runs(tenant_id, created_at DESC);
