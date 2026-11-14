-- ============================================================================
-- Tanat — 0009: Multi-tenant DB constraints, RBAC, envelope encryption keys,
-- privileged access workflow, security alerts, and tenant privacy settings
-- ============================================================================

-- 1. Composite (tenant_id, id) unique indexes for tenant-aware integrity
CREATE UNIQUE INDEX IF NOT EXISTS idx_agents_tenant_id_id
    ON agents(tenant_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_installations_tenant_id_id
    ON installations(tenant_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_sessions_tenant_id_id
    ON sessions(tenant_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_tenant_id_id
    ON messages(tenant_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_actions_tenant_id_id
    ON actions(tenant_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_knowledge_sources_tenant_id_id
    ON knowledge_sources(tenant_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_channels_tenant_id_id
    ON agent_channels(tenant_id, id);

-- 2. Database-level cross-tenant foreign-key integrity triggers (SQLite/D1 safe)
CREATE TRIGGER IF NOT EXISTS trg_installations_tenant_insert
BEFORE INSERT ON installations
BEGIN
    SELECT RAISE(ABORT, 'CROSS_TENANT_RELATION: agent does not belong to tenant')
    WHERE NOT EXISTS (
        SELECT 1 FROM agents WHERE id = NEW.agent_id AND tenant_id = NEW.tenant_id
    );
END;

CREATE TRIGGER IF NOT EXISTS trg_installations_tenant_update
BEFORE UPDATE OF tenant_id, agent_id ON installations
BEGIN
    SELECT RAISE(ABORT, 'CROSS_TENANT_RELATION: agent does not belong to tenant')
    WHERE NOT EXISTS (
        SELECT 1 FROM agents WHERE id = NEW.agent_id AND tenant_id = NEW.tenant_id
    );
END;

CREATE TRIGGER IF NOT EXISTS trg_sessions_tenant_insert
BEFORE INSERT ON sessions
BEGIN
    SELECT RAISE(ABORT, 'CROSS_TENANT_RELATION: installation does not belong to tenant')
    WHERE NOT EXISTS (
        SELECT 1 FROM installations WHERE id = NEW.installation_id AND tenant_id = NEW.tenant_id
    );
END;

CREATE TRIGGER IF NOT EXISTS trg_sessions_tenant_update
BEFORE UPDATE OF tenant_id, installation_id ON sessions
BEGIN
    SELECT RAISE(ABORT, 'CROSS_TENANT_RELATION: installation does not belong to tenant')
    WHERE NOT EXISTS (
        SELECT 1 FROM installations WHERE id = NEW.installation_id AND tenant_id = NEW.tenant_id
    );
END;

CREATE TRIGGER IF NOT EXISTS trg_messages_tenant_insert
BEFORE INSERT ON messages
BEGIN
    SELECT RAISE(ABORT, 'CROSS_TENANT_RELATION: session does not belong to tenant')
    WHERE NOT EXISTS (
        SELECT 1 FROM sessions WHERE id = NEW.session_id AND tenant_id = NEW.tenant_id
    );
END;

CREATE TRIGGER IF NOT EXISTS trg_messages_tenant_update
BEFORE UPDATE OF tenant_id, session_id ON messages
BEGIN
    SELECT RAISE(ABORT, 'CROSS_TENANT_RELATION: session does not belong to tenant')
    WHERE NOT EXISTS (
        SELECT 1 FROM sessions WHERE id = NEW.session_id AND tenant_id = NEW.tenant_id
    );
END;

CREATE TRIGGER IF NOT EXISTS trg_actions_tenant_insert
BEFORE INSERT ON actions
BEGIN
    SELECT RAISE(ABORT, 'CROSS_TENANT_RELATION: session does not belong to tenant')
    WHERE NOT EXISTS (
        SELECT 1 FROM sessions WHERE id = NEW.session_id AND tenant_id = NEW.tenant_id
    );
    SELECT RAISE(ABORT, 'CROSS_TENANT_RELATION: message does not belong to tenant')
    WHERE NEW.message_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM messages WHERE id = NEW.message_id AND tenant_id = NEW.tenant_id
    );
END;

CREATE TRIGGER IF NOT EXISTS trg_actions_tenant_update
BEFORE UPDATE OF tenant_id, session_id, message_id ON actions
BEGIN
    SELECT RAISE(ABORT, 'CROSS_TENANT_RELATION: session does not belong to tenant')
    WHERE NOT EXISTS (
        SELECT 1 FROM sessions WHERE id = NEW.session_id AND tenant_id = NEW.tenant_id
    );
    SELECT RAISE(ABORT, 'CROSS_TENANT_RELATION: message does not belong to tenant')
    WHERE NEW.message_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM messages WHERE id = NEW.message_id AND tenant_id = NEW.tenant_id
    );
END;

CREATE TRIGGER IF NOT EXISTS trg_knowledge_agent_tenant_insert
BEFORE INSERT ON knowledge_sources
BEGIN
    SELECT RAISE(ABORT, 'CROSS_TENANT_RELATION: agent does not belong to tenant')
    WHERE NEW.agent_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM agents WHERE id = NEW.agent_id AND tenant_id = NEW.tenant_id
    );
END;

CREATE TRIGGER IF NOT EXISTS trg_knowledge_agent_tenant_update
BEFORE UPDATE OF tenant_id, agent_id ON knowledge_sources
BEGIN
    SELECT RAISE(ABORT, 'CROSS_TENANT_RELATION: agent does not belong to tenant')
    WHERE NEW.agent_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM agents WHERE id = NEW.agent_id AND tenant_id = NEW.tenant_id
    );
END;

CREATE TRIGGER IF NOT EXISTS trg_agent_channels_tenant_insert
BEFORE INSERT ON agent_channels
BEGIN
    SELECT RAISE(ABORT, 'CROSS_TENANT_RELATION: installation does not belong to tenant')
    WHERE NOT EXISTS (
        SELECT 1 FROM installations WHERE id = NEW.installation_id AND tenant_id = NEW.tenant_id
    );
END;

CREATE TRIGGER IF NOT EXISTS trg_agent_channels_tenant_update
BEFORE UPDATE OF tenant_id, installation_id ON agent_channels
BEGIN
    SELECT RAISE(ABORT, 'CROSS_TENANT_RELATION: installation does not belong to tenant')
    WHERE NOT EXISTS (
        SELECT 1 FROM installations WHERE id = NEW.installation_id AND tenant_id = NEW.tenant_id
    );
END;

-- 3. Granular RBAC permissions & extended role column on workspace_members
ALTER TABLE workspace_members ADD COLUMN workspace_role TEXT NOT NULL DEFAULT 'owner'
    CHECK (workspace_role IN ('owner', 'admin', 'operator', 'member', 'auditor', 'viewer'));
ALTER TABLE workspace_members ADD COLUMN permissions TEXT NOT NULL DEFAULT '[]';
ALTER TABLE workspace_members ADD COLUMN assigned_agent_ids TEXT NOT NULL DEFAULT '[]';
ALTER TABLE workspace_members ADD COLUMN updated_at TEXT;

UPDATE workspace_members
SET workspace_role = CASE
    WHEN role IN ('owner', 'admin', 'operator', 'viewer') THEN role
    ELSE 'member'
END;

-- 4. Tenant-specific envelope encryption keys (wrapped DEKs; plaintext DEKs never stored)
CREATE TABLE IF NOT EXISTS tenant_keys (
    id          TEXT PRIMARY KEY,
    tenant_id   TEXT NOT NULL,
    version     INTEGER NOT NULL,
    kek_id      TEXT NOT NULL,
    algorithm   TEXT NOT NULL DEFAULT 'AES-256-GCM',
    wrapped_dek TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'rotated', 'revoked')),
    created_by  TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    rotated_at  TEXT,
    revoked_at  TEXT,
    UNIQUE (tenant_id, version),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tenant_keys_tenant_status
    ON tenant_keys(tenant_id, status, version DESC);

-- 5. Security alerts for anomalous / cross-tenant / privileged events
CREATE TABLE IF NOT EXISTS security_alerts (
    id          TEXT PRIMARY KEY,
    tenant_id   TEXT NOT NULL,
    severity    TEXT NOT NULL DEFAULT 'medium'
                    CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    category    TEXT NOT NULL,
    title       TEXT NOT NULL,
    details     TEXT NOT NULL DEFAULT '{}',
    actor_id    TEXT,
    status      TEXT NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open', 'acknowledged', 'resolved')),
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    resolved_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_security_alerts_tenant_status
    ON security_alerts(tenant_id, status, created_at DESC);

-- 6. Auditable time-limited exceptional / privileged access workflow
CREATE TABLE IF NOT EXISTS privileged_access_requests (
    id           TEXT PRIMARY KEY,
    tenant_id    TEXT NOT NULL,
    requested_by TEXT NOT NULL,
    approved_by  TEXT,
    reason       TEXT NOT NULL,
    scope        TEXT NOT NULL,
    status       TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'approved', 'rejected', 'revoked', 'expired')),
    starts_at    TEXT,
    expires_at   TEXT NOT NULL,
    revoked_at   TEXT,
    created_at   TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_privileged_access_tenant
    ON privileged_access_requests(tenant_id, status, created_at DESC);

-- 7. Tenant privacy, retention & deletion preferences
CREATE TABLE IF NOT EXISTS tenant_privacy_settings (
    tenant_id              TEXT PRIMARY KEY,
    retention_days         INTEGER NOT NULL DEFAULT 90,
    require_tee            INTEGER NOT NULL DEFAULT 0,
    kms_key_id             TEXT,
    deletion_requested_at  TEXT,
    deletion_scheduled_for TEXT,
    updated_at             TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);
