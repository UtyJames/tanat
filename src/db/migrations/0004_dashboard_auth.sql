CREATE TABLE dashboard_users (
    id         TEXT PRIMARY KEY,
    email      TEXT NOT NULL UNIQUE,
    tenant_id  TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_dashboard_users_tenant ON dashboard_users(tenant_id);

CREATE TABLE auth_link_tokens (
    token_hash   TEXT PRIMARY KEY,
    email        TEXT NOT NULL,
    tenant_name  TEXT NOT NULL,
    expires_at   TEXT NOT NULL,
    used_at      TEXT,
    created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_auth_link_tokens_expiry ON auth_link_tokens(expires_at);

CREATE TABLE dashboard_sessions (
    id           TEXT PRIMARY KEY,
    user_id      TEXT NOT NULL,
    token_hash   TEXT NOT NULL UNIQUE,
    expires_at   TEXT NOT NULL,
    revoked_at   TEXT,
    last_used_at TEXT,
    created_at   TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES dashboard_users(id) ON DELETE CASCADE
);

CREATE INDEX idx_dashboard_sessions_user ON dashboard_sessions(user_id);
CREATE INDEX idx_dashboard_sessions_expiry ON dashboard_sessions(expires_at);
