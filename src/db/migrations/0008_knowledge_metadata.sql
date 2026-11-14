-- ============================================================================
-- Tanat — 0008: Add metadata column to knowledge_sources
-- Stores custom source types ("Other") and uploaded document metadata.
-- ============================================================================

ALTER TABLE knowledge_sources ADD COLUMN metadata TEXT NOT NULL DEFAULT '{}';

