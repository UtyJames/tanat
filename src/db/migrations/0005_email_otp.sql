ALTER TABLE auth_link_tokens ADD COLUMN attempts INTEGER NOT NULL DEFAULT 0;

CREATE INDEX idx_auth_link_tokens_email_created
    ON auth_link_tokens(email, created_at);
