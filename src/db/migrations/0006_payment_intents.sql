-- Payment intents for real-world objects and stores.
--
-- A payment intent is a quote plus a deposit address. Tanat never holds the
-- funds: the payer sends the origin asset to the deposit address and NEAR
-- Intents settles the destination asset. Status is refreshed from 1Click.

CREATE TABLE payment_intents (
    id               TEXT PRIMARY KEY,
    tenant_id        TEXT NOT NULL,
    installation_id  TEXT,
    created_by       TEXT,
    idempotency_key  TEXT,
    status           TEXT NOT NULL DEFAULT 'pending_deposit',
    description      TEXT NOT NULL,
    amount           TEXT NOT NULL,
    amount_raw       TEXT NOT NULL,
    currency         TEXT NOT NULL,
    origin_asset     TEXT NOT NULL,
    destination_asset TEXT NOT NULL,
    recipient        TEXT NOT NULL,
    recipient_type   TEXT NOT NULL,
    refund_to        TEXT NOT NULL,
    refund_type      TEXT NOT NULL,
    deposit_address  TEXT,
    quote_id         TEXT,
    quote_json       TEXT NOT NULL DEFAULT '{}',
    metadata         TEXT NOT NULL DEFAULT '{}',
    tx_hash          TEXT,
    paid_at          TEXT,
    expires_at       TEXT,
    created_at       TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at       TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_payment_intents_tenant
    ON payment_intents(tenant_id, created_at DESC);

CREATE UNIQUE INDEX idx_payment_intents_deposit
    ON payment_intents(deposit_address)
    WHERE deposit_address IS NOT NULL;

CREATE UNIQUE INDEX idx_payment_intents_idempotency
    ON payment_intents(tenant_id, idempotency_key)
    WHERE idempotency_key IS NOT NULL;
