-- ============================================================================
-- Migration 013: Capture request/response payloads for the call inspector
-- ----------------------------------------------------------------------------
-- Stores tool-call arguments and a (truncated) upstream response so the
-- monitoring view can show what was sent and returned for each call.
-- ============================================================================

ALTER TABLE mcp_access_logs
  ADD COLUMN IF NOT EXISTS request_body JSONB,
  ADD COLUMN IF NOT EXISTS response_body TEXT;
