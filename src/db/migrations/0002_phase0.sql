-- ============================================================================
-- Tanat — D1 Schema Migration 0002_phase0
-- Phase 0 fixes: shared rate limit counters
-- ============================================================================

-- Shared fixed-window counters. One row per API key and window.
CREATE TABLE IF NOT EXISTS rate_limits (
    key          TEXT NOT NULL,
    window_start INTEGER NOT NULL,
    count        INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (key, window_start)
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON rate_limits(window_start);
